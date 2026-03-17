import base64
import hashlib
import io
import json
import logging
import os
from typing import Any

logger = logging.getLogger("lulit-ai")

import numpy as np
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image

app = FastAPI(title="Lulit AI Service", version="0.1.0")

OLLAMA_ENABLED = os.getenv("OLLAMA_ENABLED", "true").lower() == "true"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.2:3b")
TIMEOUT_SEC = float(os.getenv("AI_TIMEOUT_SECONDS", "8"))
FALLBACK_DIM = int(os.getenv("AI_FALLBACK_DIM", "128"))


class EmbeddingRequest(BaseModel):
    type: str | None = None
    model: str | None = None
    text: str | None = None
    mimeType: str | None = None
    contentBase64: str | None = None


class ModerationRequest(BaseModel):
    caption: str | None = None
    mediaMimeType: str | None = None
    baseline: dict[str, Any] | None = None


class SummaryRequest(BaseModel):
    prompt: str | None = None
    captionHint: str | None = None
    mediaUrl: str | None = None
    postId: int | None = None
    caption: str | None = None
    moderationSummary: str | None = None
    duplicateReason: str | None = None
    scores: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/embedding")
def embedding(payload: EmbeddingRequest) -> dict[str, list[float]]:
    if payload.type == "text":
        text = (payload.text or "").strip()
        vector = ollama_embedding(text)
        if vector is not None:
            return {"embedding": vector}
        return {"embedding": text_fallback_embedding(text)}

    if payload.contentBase64:
        vector = media_embedding(payload.contentBase64, payload.mimeType)
        return {"embedding": vector}

    seed = payload.text or payload.contentBase64 or ""
    return {"embedding": text_fallback_embedding(seed)}


@app.post("/moderation")
def moderation(payload: ModerationRequest) -> dict[str, Any]:
    caption = (payload.caption or "").strip()
    baseline = payload.baseline or {}

    model_result = ollama_moderation(caption, baseline)
    if model_result is not None:
        return model_result

    toxic_terms = ["hate", "kill", "abuse", "racist", "terrorist", "idiot", "stupid"]
    spam_terms = ["buy now", "free money", "click here", "loan approved", "guaranteed profit"]
    fake_terms = ["shocking truth", "government hiding", "100% proven", "secret cure"]

    lower = caption.lower()
    toxicity = min(1.0, sum(1 for term in toxic_terms if term in lower) / 3.0)
    spam = min(1.0, sum(1 for term in spam_terms if term in lower) / 3.0)
    fake_news = min(1.0, sum(1 for term in fake_terms if term in lower) / 3.0)
    ai_generated = baseline.get("aiGenerated", 0.2)
    plagiarism = baseline.get("plagiarism", 0.0)
    bot_risk = baseline.get("botRisk", 0.0)
    authenticity = max(0.0, min(1.0, 1.0 - ((toxicity + spam + fake_news) / 3.0 * 0.6)))
    flagged = toxicity > 0.55 or spam > 0.65 or fake_news > 0.7 or authenticity < 0.35

    return {
        "toxicity": toxicity,
        "spam": spam,
        "fakeNews": fake_news,
        "aiGenerated": ai_generated,
        "plagiarism": plagiarism,
        "botRisk": bot_risk,
        "authenticity": authenticity,
        "flagged": flagged,
        "summary": "Model fallback moderation computed."
    }


@app.post("/summary")
def summary(payload: SummaryRequest) -> dict[str, str]:
    text = (payload.prompt or "").strip()
    extras = [
        f"caption: {payload.caption or ''}",
        f"moderation: {payload.moderationSummary or ''}",
        f"duplicate: {payload.duplicateReason or ''}",
        f"scores: {payload.scores or ''}",
        f"hint: {payload.captionHint or ''}",
    ]
    prompt = (text + "\n" + "\n".join(extras)).strip()
    generated = ollama_summary(prompt)
    if generated:
        return {"summary": generated}

    if payload.captionHint:
        compact = payload.captionHint.strip()
        return {"summary": compact[:140]}
    fallback = f"Post moderation summary: {(payload.moderationSummary or 'Pending review').strip()}"
    return {"summary": fallback}


def ollama_embedding(text: str) -> list[float] | None:
    if not OLLAMA_ENABLED or not text:
        return None
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": OLLAMA_EMBED_MODEL, "prompt": text},
            timeout=TIMEOUT_SEC,
        )
        response.raise_for_status()
        data = response.json()
        vector = data.get("embedding")
        if isinstance(vector, list) and vector:
            return [float(x) for x in vector]
    except requests.exceptions.Timeout:
        logger.warning("Ollama embedding timed out after %.1fs", TIMEOUT_SEC)
        return None
    except Exception as exc:
        logger.warning("Ollama embedding failed: %s", exc)
        return None
    return None


def ollama_summary(prompt: str) -> str | None:
    if not OLLAMA_ENABLED or not prompt:
        return None
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_CHAT_MODEL,
                "prompt": prompt + "\nReturn only plain text summary under 2 sentences.",
                "stream": False,
            },
            timeout=TIMEOUT_SEC,
        )
        response.raise_for_status()
        data = response.json()
        text = (data.get("response") or "").strip()
        return text or None
    except requests.exceptions.Timeout:
        logger.warning("Ollama summary timed out after %.1fs", TIMEOUT_SEC)
        return None
    except Exception as exc:
        logger.warning("Ollama summary failed: %s", exc)
        return None


def ollama_moderation(caption: str, baseline: dict[str, Any]) -> dict[str, Any] | None:
    if not OLLAMA_ENABLED:
        return None
    prompt = (
        "Evaluate social media content safety and return strict JSON with keys: "
        "toxicity, spam, fakeNews, aiGenerated, plagiarism, botRisk, authenticity, flagged, summary. "
        "All score fields must be 0..1.\n"
        f"Caption: {caption}\nBaseline: {json.dumps(baseline)}"
    )
    output = ollama_summary(prompt)
    if not output:
        return None

    parsed = extract_json(output)
    if not parsed:
        return None
    try:
        return {
            "toxicity": clamp(float(parsed.get("toxicity", baseline.get("toxicity", 0.0)))),
            "spam": clamp(float(parsed.get("spam", baseline.get("spam", 0.0)))),
            "fakeNews": clamp(float(parsed.get("fakeNews", baseline.get("fakeNews", 0.0)))),
            "aiGenerated": clamp(float(parsed.get("aiGenerated", baseline.get("aiGenerated", 0.0)))),
            "plagiarism": clamp(float(parsed.get("plagiarism", baseline.get("plagiarism", 0.0)))),
            "botRisk": clamp(float(parsed.get("botRisk", baseline.get("botRisk", 0.0)))),
            "authenticity": clamp(float(parsed.get("authenticity", baseline.get("authenticity", 1.0)))),
            "flagged": bool(parsed.get("flagged", False)),
            "summary": str(parsed.get("summary", "Model moderation response")),
        }
    except (ValueError, TypeError, KeyError) as exc:
        logger.warning("Failed to parse Ollama moderation response: %s", exc)
        return None


def media_embedding(content_b64: str, mime_type: str | None) -> list[float]:
    data = base64.b64decode(content_b64)
    if mime_type and mime_type.startswith("image/"):
        try:
            image = Image.open(io.BytesIO(data)).convert("RGB").resize((128, 128))
            arr = np.asarray(image, dtype=np.float32)
            # RGB histogram + gradient energy for better perceptual signal.
            hist_r, _ = np.histogram(arr[:, :, 0], bins=32, range=(0, 255), density=True)
            hist_g, _ = np.histogram(arr[:, :, 1], bins=32, range=(0, 255), density=True)
            hist_b, _ = np.histogram(arr[:, :, 2], bins=32, range=(0, 255), density=True)
            gray = arr.mean(axis=2)
            gx = np.abs(np.diff(gray, axis=1)).mean()
            gy = np.abs(np.diff(gray, axis=0)).mean()
            vec = np.concatenate([hist_r, hist_g, hist_b, np.array([gx / 255.0, gy / 255.0], dtype=np.float32)])
            return l2_normalize(vec.tolist())
        except Exception as exc:
            logger.warning("Image embedding extraction failed for mime=%s: %s", mime_type, exc)
    return text_fallback_embedding(hashlib.sha256(data).hexdigest())


def text_fallback_embedding(text: str) -> list[float]:
    seed = hashlib.sha256(text.encode("utf-8")).digest()
    dim = max(16, min(1024, FALLBACK_DIM))
    values: list[float] = []
    for i in range(dim):
        a = seed[i % len(seed)]
        b = seed[(i * 7 + 11) % len(seed)]
        values.append(((a << 8) | b) / 65535.0)
    return l2_normalize(values)


def l2_normalize(values: list[float]) -> list[float]:
    arr = np.asarray(values, dtype=np.float32)
    norm = float(np.linalg.norm(arr))
    if norm <= 0:
        return values
    return (arr / norm).astype(float).tolist()


def extract_json(text: str) -> dict[str, Any] | None:
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except Exception:
        return None


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))
