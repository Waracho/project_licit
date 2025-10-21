// src/pages/SignupPage/SignupPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listRoles, createUser } from "../../features/users/api";
import { useAuth } from "../../features/auth/useAuth";
import "./SignupPage.css";

export default function SignupPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [userName, setUserName] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");

  // rolId se resuelve en segundo plano buscando el rol BIDDER
  const [rolId, setRolId] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);
  const [roleErr, setRoleErr] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Resolver rol BIDDER (sin mostrar selector)
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const fetchBidderId = async () => {
      try {
        setLoadingRole(true);
        setRoleErr(null);
        const roles = await listRoles();
        if (cancelled) return;

        const bidder = roles.find(r => (r.key ?? "").toUpperCase() === "BIDDER");
        if (!bidder) throw new Error("No existe rol BIDDER en el sistema");
        setRolId(bidder.id);
      } catch (e: any) {
        if (!cancelled && attempts < 5) {
          attempts++;
          setTimeout(fetchBidderId, 700 * attempts); // backoff
          return;
        }
        setRoleErr(e?.message || "No se pudo resolver el rol BIDDER.");
      } finally {
        if (!cancelled) setLoadingRole(false);
      }
    };

    fetchBidderId();
    return () => { cancelled = true; };
  }, []);

  const canSubmit = useMemo(
    () => userName.trim().length >= 2 && /\S+@\S+\.\S+/.test(mail) && password.length >= 6 && !!rolId,
    [userName, mail, password, rolId]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErr(null);
    try {
      await createUser({ rolId, userName: userName.trim(), mail: mail.trim(), password });
      await login(mail, password);
      nav("/logged");
    } catch (e: any) {
      setErr(e?.message || "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup-screen">
      <div className="signup-card">
        <h1 className="signup-title">Crear cuenta</h1>
        <p className="signup-subtitle">Regístrate para empezar</p>

        <form onSubmit={onSubmit} className="signup-form">
          <label className="field">
            <span>Nombre de usuario</span>
            <input value={userName} onChange={e => setUserName(e.target.value)} required minLength={2} />
          </label>

          <label className="field">
            <span>Correo</span>
            <input type="email" value={mail} onChange={e => setMail(e.target.value)} required />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </label>

          {/* Estado del rol BIDDER (sin selector) */}
          {loadingRole && <div className="muted">Resolviendo rol…</div>}
          {!loadingRole && roleErr && <div className="error">{roleErr}</div>}

          {err ? <div className="error">{err}</div> : null}

          <button className="btn primary" type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Creando..." : "Crear cuenta"}
          </button>

          <p className="helper">
            ¿Ya tienes cuenta? <Link to="/login" className="text-link">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
