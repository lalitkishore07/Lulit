function normalizeApiBaseUrl(value) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (typeof window !== "undefined" && trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }

  return trimmed;
}

export function getApiBaseUrl() {
  const configured = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return `${window.location.origin}/api/v1`;
    }
  }

  return "https://lulit-backend-production.up.railway.app/api/v1";
}

export function getBackendOrigin() {
  return getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
}

export function getMessagingApiBaseUrl() {
  const configured = normalizeApiBaseUrl(import.meta.env.VITE_MESSAGING_API_BASE_URL);
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8090/api/v1";
    }
  }

  return "https://lulit-production.up.railway.app/api/v1";
}
