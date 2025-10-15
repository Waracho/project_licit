import { useState } from "react";

type Props = {
  onSubmit: (identifier: string, password: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
};

export default function LoginCard({ onSubmit, loading, error }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="max-w-sm w-full mx-auto mt-24 p-6 border rounded-2xl shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Iniciar sesión</h1>

      <label className="block text-sm mb-1">Usuario o email</label>
      <input
        className="w-full border rounded-lg px-3 py-2 mb-3"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="usuario o correo"
        disabled={loading}
      />

      <label className="block text-sm mb-1">Contraseña</label>
      <input
        type="password"
        className="w-full border rounded-lg px-3 py-2 mb-3"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        disabled={loading}
      />

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <button
        className="w-full rounded-xl px-4 py-2 border bg-black text-white disabled:opacity-60"
        onClick={() => onSubmit(identifier.trim(), password)}
        disabled={loading || !identifier || !password}
      >
        {loading ? "Conectando..." : "Entrar"}
      </button>
    </div>
  );
}
