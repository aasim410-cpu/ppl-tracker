import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  signup: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Store token in memory (survives within session, not across page reloads in sandboxed iframes)
let storedToken: string | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(storedToken);
  const [isLoading, setIsLoading] = useState(!!storedToken);

  const saveToken = useCallback((t: string | null) => {
    storedToken = t;
    setToken(t);
  }, []);

  // Check if existing token is valid on mount
  useEffect(() => {
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error("Invalid");
      })
      .then((u) => {
        setUser(u);
        setIsLoading(false);
      })
      .catch(() => {
        saveToken(null);
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Login failed";
      saveToken(data.token);
      setUser(data.user);
      queryClient.clear();
      return null;
    } catch {
      return "Network error";
    }
  };

  const signup = async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Signup failed";
      saveToken(data.token);
      setUser(data.user);
      queryClient.clear();
      return null;
    } catch {
      return "Network error";
    }
  };

  const logout = () => {
    if (storedToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${storedToken}` },
      }).catch(() => {});
    }
    saveToken(null);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function getAuthToken(): string | null {
  return storedToken;
}
