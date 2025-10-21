// src/features/users/api.ts
export type RoleOut = { id: string; key: string; name: string };
export type UserIn = { rolId: string; userName: string; mail: string; password: string };
export type UserOut = { id: string; rolId: string; userName: string; mail: string };

const API = import.meta.env.VITE_API || "http://localhost:8000";

export async function listRoles(): Promise<RoleOut[]> {
  const res = await fetch(`${API}/roles`);
  if (!res.ok) throw new Error((await res.text()) || "No se pudieron cargar los roles");
  return res.json();
}

export async function createUser(payload: UserIn): Promise<UserOut> {
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "No se pudo crear el usuario");
  return res.json();
}
