import AppRoutes from "../routes";
import { AuthProvider } from "../features/auth/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}