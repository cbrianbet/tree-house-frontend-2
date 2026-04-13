"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getToken, setToken, clearToken } from "@/lib/api/client";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  getRoles,
} from "@/lib/api/auth";
import type {
  User,
  Role,
  LoginRequest,
  RegisterRequest,
} from "@/types/api";

interface AuthState {
  user: User | null;
  roles: Role[];
  loading: boolean;
  login: (data: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  roleName: (id: number) => string;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getRoles().then(setRoles).catch(() => {});
    fetchUser();
  }, [fetchUser]);

  const login = async (data: LoginRequest): Promise<User> => {
    const { key } = await apiLogin(data);
    setToken(key);
    const u = await getCurrentUser();
    setUser(u);
    return u;
  };

  const register = async (data: RegisterRequest): Promise<User> => {
    const { key } = await apiRegister(data);
    setToken(key);
    const u = await getCurrentUser();
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // token may already be invalid
    }
    clearToken();
    setUser(null);
  };

  const roleName = (id: number) =>
    roles.find((r) => r.id === id)?.name ?? "Unknown";

  return (
    <AuthContext.Provider
      value={{ user, roles, loading, login, register, logout, refreshUser: fetchUser, roleName }}
    >
      {children}
    </AuthContext.Provider>
  );
}
