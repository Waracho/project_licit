// src/layouts/AuthedLayout.tsx
import { Outlet } from "react-router-dom";
import NavigationBar from "../components/navigation/navigation_bar/NavigationBar";
import { useAuth } from "../features/auth/useAuth";
import { LogOut } from "lucide-react";

export default function AuthedLayout() {
  const { logout } = useAuth(); // ← quitamos user

  const userMenuItems = [
    { label: "Cerrar sesión", onClick: () => logout(), icon: <LogOut size={16} aria-hidden /> },
  ];

  return (
    <div className="app-shell">
      <NavigationBar userMenuItems={userMenuItems} />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
