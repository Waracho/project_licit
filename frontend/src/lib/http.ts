// lib/http.ts
import { getAccessToken, setAccessToken } from "../features/auth/authStore";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function isJson(init?: RequestInit) {
  if (!init?.body) return true;
  if (init.body instanceof FormData) return false;
  return true;
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {};
  if (isJson(init)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const doFetch = () =>
    fetch(API_BASE + path, {
      credentials: "include", // ⬅️ importante para que viaje la cookie HttpOnly
      ...init,
      headers: { ...headers, ...(init.headers || {}) },
    });

  let res = await doFetch();

  // Si el access expiró, refresca y reintenta 1 vez
  if (res.status === 401) {
    const rr = await fetch(API_BASE + "/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (rr.ok) {
      const data = await rr.json() as { access?: string };
      if (data?.access) setAccessToken(data.access);
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}