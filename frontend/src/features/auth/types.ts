export type Role = {
  key: "ADMIN" | "BIDDER" | "WORKER" | string;
  name: string;
};

export type User = {
  id: string;
  userName: string;
  mail: string;
  rolId?: string;
  role?: Role; // si tu backend la incluye en la respuesta
};

export type AuthResponse = {
  token: string;
  user: User;
};
