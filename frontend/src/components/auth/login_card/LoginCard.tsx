import { useState } from "react";
import "./LoginCard.css";

type Props = {
  onSubmit: (identifier: string, password: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
};

export default function LoginCard({ onSubmit, loading, error }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password || loading) return;
    onSubmit(identifier.trim(), password);
  };

  return (
    <form className="login-card" onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label htmlFor="identifier">Usuario o email</label>
        <input
          id="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="usuario o correo"
          disabled={!!loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={!!loading}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button
        className="btn-primary"
        type="submit"
        disabled={!!loading || !identifier || !password}
        aria-busy={loading ? "true" : "false"}
      >
        {loading ? "Conectando..." : "Entrar"}
      </button>
    </form>
  );
}
