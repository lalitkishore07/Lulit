import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import api, { setAuthToken, setRefreshCallback } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Access token is stored in memory only — never persisted to localStorage (XSS protection).
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("lulit_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  // Wire up the 401 interceptor so it can update our in-memory token.
  useEffect(() => {
    setRefreshCallback((newToken) => {
      setAccessToken(newToken);
      if (!newToken) {
        setUser(null);
        localStorage.removeItem("lulit_user");
      }
    });
  }, []);

  // On mount, attempt a silent refresh using the HttpOnly refresh-token cookie.
  useEffect(() => {
    const silentRefresh = async () => {
      const storedUser = localStorage.getItem("lulit_user");
      if (!storedUser) {
        setBooting(false);
        return;
      }
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.accessToken);
        setUser({ userId: data.userId, username: data.username });
        localStorage.setItem("lulit_user", JSON.stringify({ userId: data.userId, username: data.username }));
      } catch {
        // Refresh token expired or invalid — clear user state
        setAccessToken("");
        setUser(null);
        localStorage.removeItem("lulit_user");
      } finally {
        setBooting(false);
      }
    };
    silentRefresh();
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    setAccessToken(data.accessToken);
    setUser({ userId: data.userId, username: data.username });
    localStorage.setItem("lulit_user", JSON.stringify({ userId: data.userId, username: data.username }));
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.post("/auth/refresh");
    setAccessToken(data.accessToken);
    setUser({ userId: data.userId, username: data.username });
    localStorage.setItem("lulit_user", JSON.stringify({ userId: data.userId, username: data.username }));
  }, []);

  const loginWithToken = useCallback(({ accessToken: nextAccessToken, userId, username }) => {
    setAccessToken(nextAccessToken);
    const nextUser = { userId: Number(userId), username };
    setUser(nextUser);
    localStorage.setItem("lulit_user", JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken("");
      setUser(null);
      localStorage.removeItem("lulit_user");
    }
  }, []);

  const value = useMemo(
    () => ({ accessToken, user, booting, login, logout, refresh, loginWithToken, setAccessToken }),
    [accessToken, user, booting, login, logout, refresh, loginWithToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
