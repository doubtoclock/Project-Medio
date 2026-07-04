import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { setAuthToken, clearAuthToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const fetchRef = useRef(0);

  const doFetch = useCallback(async () => {
    const id = ++fetchRef.current;
    setIsLoading(true);

    try {
      const data = await apiClient.auth.me();
      if (id !== fetchRef.current) return;
      const authed = Boolean(data?.authenticated);
      setIsAuthenticated(authed);

      if (authed) {
        try {
          const profile = await apiClient.auth.profile();
          if (id !== fetchRef.current) return;
          setUser(profile.user);
        } catch {
          if (id !== fetchRef.current) return;
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      if (id !== fetchRef.current) return;
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      if (id === fetchRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const login = useCallback((token) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    apiClient.auth.profile()
      .then((profile) => setUser(profile.user))
      .catch(() => setUser(null));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.auth.logout();
    } catch {

    }
    clearAuthToken();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const refresh = useCallback(() => doFetch(), [doFetch]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
