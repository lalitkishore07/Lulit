import Constants from "expo-constants";
import { Platform } from "react-native";

function detectExpoHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.linkingUri
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = candidate
      .replace(/^[a-z]+:\/\//i, "")
      .split("/")[0]
      .split(":")[0];

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function getDefaultBaseUrl() {
  if (!__DEV__) {
    return "https://lulit-backend-production.up.railway.app/api/v1";
  }

  if (Platform.OS === "web") {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `http://${hostname}:8080/api/v1`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080/api/v1";
  }

  const expoHost = detectExpoHost();
  if (expoHost) {
    return `http://${expoHost}:8080/api/v1`;
  }

  return "http://localhost:8080/api/v1";
}

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || getDefaultBaseUrl();
const REQUEST_TIMEOUT_MS = 8000;

// Refresh handler set by AuthContext — performs refresh and returns new access token.
let refreshHandler = null;
let refreshPromise = null;

const api = {
  defaults: {
    headers: {
      common: {}
    }
  },
  async get(path, options) {
    return requestWithRetry("GET", path, undefined, options);
  },
  async post(path, body, options) {
    return requestWithRetry("POST", path, body, options);
  },
  async put(path, body, options) {
    return requestWithRetry("PUT", path, body, options);
  }
};

async function request(method, path, body, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  const headers = {
    ...api.defaults.headers.common,
    ...(options.headers || {})
  };

  const requestOptions = {
    method,
    headers,
    signal: controller.signal
  };

  if (body !== undefined) {
    const isFormData =
      typeof FormData !== "undefined" &&
      body instanceof FormData;

    if (isFormData) {
      // Let React Native set multipart boundary automatically.
      delete headers["Content-Type"];
      requestOptions.body = body;
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      requestOptions.body = JSON.stringify(body);
    }
  }

  let response;
  let text = "";
  let data = null;

  try {
    response = await fetch(`${baseURL}${path}`, requestOptions);
    text = await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Request timed out");
      timeoutError.response = { status: 0, data: { message: "Request timed out" } };
      throw timeoutError;
    }

    const networkError = new Error(`Unable to reach API at ${baseURL}`);
    networkError.response = {
      status: 0,
      data: {
        message: `Unable to reach API at ${baseURL}`
      }
    };
    networkError.cause = error;
    throw networkError;
  } finally {
    clearTimeout(timeoutId);
  }

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error((data && data.message) || `Request failed (${response.status})`);
    error.response = { status: response.status, data };
    throw error;
  }

  return { data, _response: response };
}

/**
 * Wraps `request()` with automatic 401 retry via token refresh.
 * Skips retry for auth endpoints to avoid infinite loops.
 */
async function requestWithRetry(method, path, body, options) {
  try {
    return await request(method, path, body, options);
  } catch (error) {
    const isAuthEndpoint =
      path.includes("/auth/login") ||
      path.includes("/auth/refresh") ||
      path.includes("/auth/signup");

    const status = error?.response?.status;
    const needsRefresh = status === 401 || status === 403;

    if (!needsRefresh || isAuthEndpoint || !refreshHandler) {
      throw error;
    }

    // Deduplicate concurrent refresh calls.
    if (!refreshPromise) {
      refreshPromise = refreshHandler().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const newToken = await refreshPromise;
      // Retry the original request with the new token.
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      return await request(method, path, body, options);
    } catch (refreshError) {
      // Refresh failed — propagate the original error.
      throw error;
    }
  }
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

/**
 * Called by AuthContext to register a refresh handler.
 * The handler should perform a refresh and return the new access token.
 */
export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

export default api;
