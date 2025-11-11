import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

function getRoleKey(user: any): "ADMIN" | "BIDDER" | "WORKER" | null {
  const k = user?.role?.key ?? user?.roleKey ?? null;
  if (k === "ADMIN" || k === "BIDDER" || k === "WORKER") return k;
  return null;
}
function roleHomePath(k: "ADMIN" | "BIDDER" | "WORKER") {
  return k === "ADMIN" ? "/admin" : k === "BIDDER" ? "/bidder" : "/worker";
}

export default function RoleLanding() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const key = getRoleKey(user);
  if (!key) return <Navigate to="/login" replace />; // fallback si no viene el rol
  return <Navigate to={roleHomePath(key)} replace />;
}
