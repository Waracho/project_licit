// src/layouts/AuthedLayout.tsx
import { Outlet } from "react-router-dom";
import NavigationBar from "../components/navigation/navigation_bar/NavigationBar";
import { useAuth } from "../features/auth/useAuth";
import { LogOut } from "lucide-react";
import { getRoleKey } from "../features/auth/role";
import { navForRole, roleHomePath } from "../features/auth/navForRol";

export default function AuthedLayout() {
  const { logout, user } = useAuth();
  const role = getRoleKey(user);

  const userMenuItems = [
    { label: "Cerrar sesión", onClick: () => logout(), icon: <LogOut size={16} aria-hidden /> },
  ];

  const navItems = role ? navForRole(role) : [];
  const brandTo = role ? roleHomePath(role) : "/logged";

  return (
    <div className="app-shell">
      <NavigationBar userMenuItems={userMenuItems} navItems={navItems} brandTo={brandTo} />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}