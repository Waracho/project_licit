// features/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "./types";
import { login as loginApi, refresh as refreshApi, logoutApi } from "./api";
import { setAccessToken } from "./authStore";

type AuthCtx = {
  user: User | null;
  token: string | null;         // access (solo en memoria)
  loading: boolean;             // ⟵ clave para no redirigir antes de rehidratar
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehidrata sesión al montar usando la cookie HttpOnly (refresh)
  useEffect(() => {
    (async () => {
      try {
        const { access, user } = await refreshApi(); // /auth/refresh
        setToken(access);
        setUser(user);
        setAccessToken(access); // para http.ts
      } catch {
        // no hay refresh válido → sesión vacía
        setToken(null);
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (identifier: string, password: string) => {
    const { access, user } = await loginApi(identifier, password);
    setToken(access);
    setUser(user);
    setAccessToken(access);
    // ya NO guardamos token en localStorage (más seguro contra XSS)
    // si quieres persistir el user para UI, puedes guardar solo el user:
    // localStorage.setItem("user", JSON.stringify(user));
  };

  const logout = async () => {
    try { await logoutApi(); } catch {}
    setToken(null);
    setUser(null);
    setAccessToken(null);
    // localStorage.removeItem("user");
  };

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuthCtx must be used within AuthProvider");
  return ctx;
}
