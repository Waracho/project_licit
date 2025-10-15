import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginCard from "../components/auth/LoginCard";
import { useAuth } from "../features/auth/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const handleSubmit = async (identifier: string, password: string) => {
    setLoading(true);
    setErr(null);
    try {
      await login(identifier, password);
      nav("/logged");
    } catch (e: any) {
      setErr(e?.message || "Error de login");
    } finally {
      setLoading(false);
    }
  };

  return <LoginCard onSubmit={handleSubmit} loading={loading} error={err} />;
}
