import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const TOKEN_KEY = "xmarketer_token";

interface AuthUser {
  id: number;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function storeToken(token: string) {
  if (Platform.OS === "web") {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  } else {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
}

async function removeStoredToken() {
  if (Platform.OS === "web") {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export let currentToken: string | null = null;

function getBaseUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (host) {
    return `https://${host}`;
  }

  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraApiUrl) {
    return extraApiUrl.endsWith("/") ? extraApiUrl.slice(0, -1) : extraApiUrl;
  }

  host = process.env.REPLIT_DEV_DOMAIN
    ? `${process.env.REPLIT_DEV_DOMAIN}:5000`
    : undefined;
  if (host) {
    return `https://${host}`;
  }

  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    return `https://${domains.split(",")[0].trim()}`;
  }

  throw new Error("Unable to determine API URL");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const updateToken = useCallback((newToken: string | null) => {
    currentToken = newToken;
    setToken(newToken);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredToken();
        if (stored) {
          currentToken = stored;
          const res = await fetch(
            `${getBaseUrl()}/api/auth/me`,
            { headers: { Authorization: `Bearer ${stored}` } }
          );
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            updateToken(stored);
          } else {
            await removeStoredToken();
            currentToken = null;
          }
        }
      } catch {
        await removeStoredToken();
        currentToken = null;
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    await storeToken(data.token);
    updateToken(data.token);
    setUser(data.user);
  }, [updateToken]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    await storeToken(data.token);
    updateToken(data.token);
    setUser(data.user);
  }, [updateToken]);

  const logout = useCallback(async () => {
    await removeStoredToken();
    updateToken(null);
    setUser(null);
  }, [updateToken]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
