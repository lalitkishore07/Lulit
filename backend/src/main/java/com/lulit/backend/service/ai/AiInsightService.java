package com.lulit.backend.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.lulit.backend.entity.Post;
import com.lulit.backend.service.ContentModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AiInsightService {

    private final AiModelGateway aiModelGateway;

    @Value("${app.ai.fallback-embedding-dim:128}")
    private int fallbackEmbeddingDim;

    public List<Double> textEmbedding(String text) {
        String normalized = text == null ? "" : text.trim();
        Optional<JsonNode> remote = aiModelGateway.requestEmbedding(Map.of(
                "type", "text",
                "text", normalized
        ));
        if (remote.isPresent()) {
            JsonNode vector = remote.get().get("embedding");
            if (vector != null && vector.isArray() && !vector.isEmpty()) {
                List<Double> values = new ArrayList<>(vector.size());
                for (JsonNode node : vector) {
                    values.add(node.asDouble());
                }
                return values;
            }
        }
        return deterministicEmbedding(normalized);
    }

    public ContentModerationService.ModerationEvaluation enhanceModeration(
            String caption,
            String mediaMimeType,
            ContentModerationService.ModerationEvaluation baseline
    ) {
        Optional<JsonNode> remote = aiModelGateway.requestModeration(Map.of(
                "caption", caption == null ? "" : caption,
                "mediaMimeType", mediaMimeType == null ? "" : mediaMimeType,
                "baseline", Map.of(
                        "toxicity", baseline.toxicity(),
                        "spam", baseline.spamProbability(),
                        "fakeNews", baseline.fakeNewsProbability(),
                        "aiGenerated", baseline.aiGeneratedProbability(),
                        "plagiarism", baseline.plagiarismScore(),
                        "botRisk", baseline.botRiskScore(),
                        "authenticity", baseline.authenticityScore()
                )
        ));
        if (remote.isEmpty()) {
            return baseline;
        }

        JsonNode body = remote.get();
        double toxicity = readOrDefault(body, "toxicity", baseline.toxicity());
        double spam = readOrDefault(body, "spam", baseline.spamProbability());
        double fakeNews = readOrDefault(body, "fakeNews", baseline.fakeNewsProbability());
        double aiGenerated = readOrDefault(body, "aiGenerated", baseline.aiGeneratedProbability());
        double plagiarism = readOrDefault(body, "plagiarism", baseline.plagiarismScore());
        double botRisk = readOrDefault(body, "botRisk", baseline.botRiskScore());
        double authenticity = readOrDefault(body, "authenticity", baseline.authenticityScore());
        boolean flagged = body.has("flagged") ? body.get("flagged").asBoolean(baseline.flagged()) : baseline.flagged();
        String summary = body.has("summary") ? body.get("summary").asText(baseline.summary()) : baseline.summary();

        return new ContentModerationService.ModerationEvaluation(
                clamp01(toxicity),
                clamp01(spam),
                clamp01(fakeNews),
                clamp01(aiGenerated),
                clamp01(plagiarism),
                clamp01(botRisk),
                clamp01(authenticity),
                flagged,
                summary
        );
    }

    public String summarizeModerationCase(Post post, ContentModerationService.ModerationEvaluation moderation, String duplicateReason) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("prompt", "Summarize moderation case for DAO vote in 2 concise sentences.");
        payload.put("postId", post.getId());
        payload.put("caption", post.getCaption() == null ? "" : post.getCaption());
        payload.put("mediaMimeType", post.getMediaMimeType() == null ? "" : post.getMediaMimeType());
        payload.put("moderationSummary", moderation.summary());
        payload.put("duplicateReason", duplicateReason == null ? "" : duplicateReason);
        payload.put("scores", moderation.toCompactJson());

        Optional<JsonNode> remote = aiModelGateway.requestSummary(payload);
        if (remote.isPresent() && remote.get().has("summary")) {
            String summary = remote.get().get("summary").asText("");
            if (!summary.isBlank()) {
                return summary.trim();
            }
        }
        return fallbackSummary(post, moderation, duplicateReason);
    }

    public String generateAltText(String mediaUrl, String captionHint) {
        Optional<JsonNode> remote = aiModelGateway.requestSummary(Map.of(
                "prompt", "Generate accessibility alt text for this media in under 140 chars.",
                "mediaUrl", mediaUrl == null ? "" : mediaUrl,
                "captionHint", captionHint == null ? "" : captionHint
        ));
        if (remote.isPresent() && remote.get().has("summary")) {
            String alt = remote.get().get("summary").asText("");
            if (!alt.isBlank()) {
                return alt.trim();
            }
        }
        String hint = captionHint == null || captionHint.isBlank() ? "User uploaded media content." : captionHint.trim();
        return hint.length() > 140 ? hint.substring(0, 140) : hint;
    }

    private List<Double> deterministicEmbedding(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            int dim = Math.max(16, Math.min(1024, fallbackEmbeddingDim));
            List<Double> vector = new ArrayList<>(dim);
            for (int i = 0; i < dim; i++) {
                int a = Byte.toUnsignedInt(hash[i % hash.length]);
                int b = Byte.toUnsignedInt(hash[(i * 5 + 3) % hash.length]);
                vector.add(((a << 8) | b) / 65535.0d);
            }
            return vector;
        } catch (Exception ex) {
            return List.of(0.0d);
        }
    }

    private String fallbackSummary(Post post, ContentModerationService.ModerationEvaluation moderation, String duplicateReason) {
        String duplicate = duplicateReason == null || duplicateReason.isBlank() ? "No near-duplicate warning." : duplicateReason;
        String caption = post.getCaption() == null || post.getCaption().isBlank()
                ? "No caption provided."
                : post.getCaption().trim();
        return String.format(
                Locale.ROOT,
                "Post #%d moderation summary: %s Caption: %s Duplicate check: %s",
                post.getId(),
                moderation.summary(),
                caption,
                duplicate
        );
    }

    private double readOrDefault(JsonNode node, String field, double fallback) {
        if (!node.has(field)) {
            return fallback;
        }
        return node.get(field).asDouble(fallback);
    }

    private double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }
}
