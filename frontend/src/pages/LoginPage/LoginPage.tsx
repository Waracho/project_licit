// src/pages/LoginPage/LoginPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // 👈 agrega Link
import LoginCard from "../../components/auth/login_card/LoginCard";
import { useAuth } from "../../features/auth/useAuth";
import docImgUrl from "../../assets/tipos-de-documentos.jpg";
import "./LoginPage.css";

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

  return (
    <div className="login-screen">
      <div className="login-illustration" aria-hidden="true">
        <img src={docImgUrl} alt="" />
      </div>

      <div className="login-panel">
        <div className="login-panel__inner">
          <h1 className="login-title">Iniciar sesión</h1>
          <p className="login-subtitle">Accede a tu cuenta</p>

          <LoginCard onSubmit={handleSubmit} loading={loading} error={err} />

          {/* 👇 enlace a registro */}
          <p className="login-helper">
            ¿No tienes cuenta?
            {" "}
            <Link to="/signup" className="text-link">Crear una cuenta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
