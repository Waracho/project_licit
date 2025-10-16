export type Role = {
  id: string;                      // 👈 agrega esta línea
  key: "ADMIN" | "BIDDER" | "WORKER" | string;
  name: string;
};

export type User = {
  id: string;
  userName: string;
  mail: string;
  rolId?: string;
  role?: Role;
};

export type AuthResponse = {
  token: string;
  user: User;
};
