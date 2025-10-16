import { useEffect, useState } from "react";
import type { User } from "../../../features/auth/types";
import { http } from "../../../lib/http";
import "./AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await http<User[]>("/users");
        setUsers(data);
      } catch (e: any) {
        setError(e?.message ?? "Error cargando usuarios");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="admin-users-simple">
      <h1>Usuarios registrados</h1>

      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>RolId</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.userName}</td>
                <td>{u.mail}</td>
                <td>{u.rolId ?? "—"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
