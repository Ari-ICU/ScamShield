"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

interface User {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load token on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("scamshield_user");
      const storedAccess = localStorage.getItem("scamshield_access");
      const storedRefresh = localStorage.getItem("scamshield_refresh");

      if (storedUser && storedAccess && storedRefresh) {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedAccess);
        setRefreshToken(storedRefresh);
      }
    } catch (err) {
      console.warn("Failed to load user session from storage:", err);
      localStorage.removeItem("scamshield_user");
      localStorage.removeItem("scamshield_access");
      localStorage.removeItem("scamshield_refresh");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);

    localStorage.setItem("scamshield_user", JSON.stringify(data.user));
    localStorage.setItem("scamshield_access", data.accessToken);
    localStorage.setItem("scamshield_refresh", data.refreshToken);

    router.push("/");
  };

  const register = async (email: string, password: string, role = "USER") => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);

    localStorage.setItem("scamshield_user", JSON.stringify(data.user));
    localStorage.setItem("scamshield_access", data.accessToken);
    localStorage.setItem("scamshield_refresh", data.refreshToken);

    router.push("/");
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    localStorage.removeItem("scamshield_user");
    localStorage.removeItem("scamshield_access");
    localStorage.removeItem("scamshield_refresh");

    router.push("/");
  };

  const handleRefreshToken = async (): Promise<string> => {
    if (!refreshToken) throw new Error("No refresh token available");

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("scamshield_access", data.accessToken);
    localStorage.setItem("scamshield_refresh", data.refreshToken);

    return data.accessToken;
  };

  const apiFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
    let currentToken = accessToken;

    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }
    options.headers = headers;

    let res = await fetch(`${API_BASE}${path}`, options);

    // If forbidden or unauthorized, attempt refresh
    if ((res.status === 401 || res.status === 403) && refreshToken) {
      try {
        currentToken = await handleRefreshToken();
        headers.set("Authorization", `Bearer ${currentToken}`);
        options.headers = headers;
        res = await fetch(`${API_BASE}${path}`, options);
      } catch (err) {
        throw new Error("Authentication failed");
      }
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "API Request failed");
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        register,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
