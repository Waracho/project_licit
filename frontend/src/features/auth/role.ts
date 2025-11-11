import type { User } from "./types";

export type RoleKey = "ADMIN" | "BIDDER" | "WORKER";

export function getRoleKey(user: User | null | undefined): RoleKey | null {
  const key = user?.role?.key || (user as any)?.roleKey; // si tu backend lo adjunta distinto
  if (key === "ADMIN" || key === "BIDDER" || key === "WORKER") return key;
  return null;
}

export function roleHomePath(role: RoleKey): string {
  switch (role) {
    case "ADMIN": return "/admin";
    case "BIDDER": return "/bidder";
    case "WORKER": return "/worker";
  }
}
