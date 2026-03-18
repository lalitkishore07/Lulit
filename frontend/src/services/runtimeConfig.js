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
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL) || `${window.location.origin}/api/v1`;
}

export function getBackendOrigin() {
  return getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
}
