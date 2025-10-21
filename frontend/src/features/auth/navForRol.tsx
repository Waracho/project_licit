import type { ReactNode } from "react";
import { type RoleKey } from "./role";
import { Home, Briefcase, Building2, Users, Cloud } from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon?: ReactNode;
  exact?: boolean;
};

export function roleHomePath(role: RoleKey): string {
  switch (role) {
    case "ADMIN": return "/admin";
    case "BIDDER": return "/bidder";
    case "WORKER": return "/worker";
  }
}

export function navForRole(role: RoleKey): NavItem[] {
  switch (role) {
    case "BIDDER":
      return [
        { label: "Inicio", to: "/bidder", icon: <Home size={16} />, exact: true },
        { label: "Mis licitaciones", to: "/bidder/tenders", icon: <Briefcase size={16} /> },
      ];
    case "WORKER":
      return [
        { label: "Inicio", to: "/worker", icon: <Home size={16} />, exact: true },
        { label: "Mis departamentos", to: "/worker/departments", icon: <Building2 size={16} /> },
        { label: "Mis chats", to: "/worker/chats", icon: <Cloud/>}
      ];
    case "ADMIN":
      return [
        { label: "Inicio", to: "/admin", icon: <Home size={16} />, exact: true },
        { label: "Mis departamentos", to: "/admin/departments", icon: <Building2 size={16} /> },
        { label: "Usuarios registrados", to: "/admin/users", icon: <Users size={16} /> },
      ];
  }
}
