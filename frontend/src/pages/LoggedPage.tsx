import { Navigate } from "react-router-dom";
import LoggedScreen from "../components/auth/LoggedScreen";
import { useAuth } from "../features/auth/useAuth";

export default function LoggedPage() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return <LoggedScreen user={user} onLogout={logout} />;
}
