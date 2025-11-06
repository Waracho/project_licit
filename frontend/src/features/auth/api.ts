import { http } from "../../lib/http";
import type { AuthResponse } from "./types";

export async function login(identifier: string, password: string) {
  return http<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export async function refresh() {
  return http<AuthResponse>("/auth/refresh", { method: "POST" });
}

export async function logoutApi() {
  return http<{ ok: boolean }>("/auth/logout", { method: "POST" });
}