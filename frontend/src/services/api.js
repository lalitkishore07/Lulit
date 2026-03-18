import axios from "axios";
import { getApiBaseUrl } from "./runtimeConfig";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// --- 401 Interceptor: auto-refresh access token on expiry ---

let refreshPromise = null;
let onTokenRefreshed = null;

/**
 * Call this once from AuthProvider to wire up the token refresh callback.
 * The callback receives the new access token.
 */
export function setRefreshCallback(callback) {
  onTokenRefreshed = callback;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, not on auth endpoints, and not if already retried.
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/signup")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Deduplicate concurrent refresh requests.
    if (!refreshPromise) {
      refreshPromise = api
        .post("/auth/refresh")
        .then((res) => {
          const newToken = res.data.accessToken;
          setAuthToken(newToken);
          if (onTokenRefreshed) {
            onTokenRefreshed(newToken);
          }
          return newToken;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear auth state, redirect to login.
      setAuthToken(null);
      if (onTokenRefreshed) {
        onTokenRefreshed("");
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
