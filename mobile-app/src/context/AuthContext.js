import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken, setRefreshHandler } from "../services/api";

const AuthContext = createContext(null);

const REFRESH_TOKEN_KEY = "lulit_refresh_token";
const USER_KEY = "lulit_user";

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // On mount, attempt a silent refresh using the stored refresh token.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedRefreshToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(REFRESH_TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY)
        ]);
        if (!mounted) return;

        if (savedRefreshToken && savedUser) {
          try {
            const { data } = await api.post("/auth/refresh", { refreshToken: savedRefreshToken });
            if (!mounted) return;
            setAccessToken(data.accessToken);
            setAuthToken(data.accessToken);
            const nextUser = { userId: data.userId, username: data.username };
            setUser(nextUser);
            // Store the rotated refresh token
            if (data.refreshToken) {
              await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            }
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
          } catch {
            // Refresh token expired — clear everything
            setAccessToken("");
            setUser(null);
            await AsyncStorage.multiRemove([REFRESH_TOKEN_KEY, USER_KEY]);
          }
        }
      } finally {
        if (mounted) setBooting(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  // Wire up the 401 interceptor so it can refresh using the stored token.
  useEffect(() => {
    setRefreshHandler(async () => {
      const savedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!savedRefreshToken) {
        throw new Error("No refresh token available");
      }
      const { data } = await api.post("/auth/refresh", { refreshToken: savedRefreshToken });
      setAccessToken(data.accessToken);
      setAuthToken(data.accessToken);
      const nextUser = { userId: data.userId, username: data.username };
      setUser(nextUser);
      if (data.refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return data.accessToken;
    });
  }, []);

  const login = useCallback(async ({ username, password }) => {
    const { data } = await api.post("/auth/login", { username, password });
    const nextUser = { userId: data.userId, username: data.username };
    setAccessToken(data.accessToken);
    setUser(nextUser);
    // Store the refresh token for mobile (since we don't have HttpOnly cookies)
    if (data.refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, []);

  const refresh = useCallback(async () => {
    const savedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    const { data } = await api.post("/auth/refresh", { refreshToken: savedRefreshToken });
    const nextUser = { userId: data.userId, username: data.username };
    setAccessToken(data.accessToken);
    setUser(nextUser);
    if (data.refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken("");
      setUser(null);
      await AsyncStorage.multiRemove([REFRESH_TOKEN_KEY, USER_KEY]);
    }
  }, []);

  const value = useMemo(
    () => ({ accessToken, user, booting, login, refresh, logout }),
    [accessToken, user, booting, login, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
