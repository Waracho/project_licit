// src/app/App.tsx
import AppRoutes from "../routes";
import { AuthProvider } from "../features/auth/AuthContext";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
