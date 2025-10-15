import { http } from "../../lib/http";
import type { AuthResponse } from "./types";

export async function login(identifier: string, password: string) {
  return http<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}
