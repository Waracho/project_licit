import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getRoleKey, type RoleKey } from "./role";

type Props = {
  allow: RoleKey[];
  children: React.ReactNode;
};

export default function RequireRole({ allow, children }: Props) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="p-4">Cargando sesión…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;

  const key = getRoleKey(user);
  if (!key || !allow.includes(key)) return <Navigate to="/logged" replace />;

  return <>{children}</>;
}
