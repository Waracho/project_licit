import { useEffect, useMemo, useState } from "react";
import { listDepartments, listTenders, listTenderFiles, presignGet, reviewTender } from "../../../features/admin/api";
import type { Department, TenderRequestOut, RequestFileOut } from "../../../features/tenders/types";
import { useAuth } from "../../../features/auth/useAuth";
import "./AdminDepartments.css";

function fmtDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function AdminDepartments() {
  const { user } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [depLoading, setDepLoading] = useState(true);
  const [depError, setDepError] = useState<string | null>(null);
  const [depId, setDepId] = useState("");

  const [tenders, setTenders] = useState<TenderRequestOut[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  // Filtros
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Cache de archivos por tender
  const [filesMap, setFilesMap] = useState<Record<string, RequestFileOut[] | undefined>>({});

  // Acciones (loading por fila)
  const [actingId, setActingId] = useState<string | null>(null);

  // 1) Departamentos
  useEffect(() => {
    (async () => {
      try {
        setDepLoading(true);
        const deps = await listDepartments();
        setDepartments(deps);
        if (deps.length && !depId) setDepId(deps[0].id);
      } catch (e: any) {
        setDepError(e?.message ?? "No se pudieron cargar los departamentos");
      } finally {
        setDepLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Tenders por depto
  useEffect(() => {
    if (!depId) return;
    (async () => {
      try {
        setTLoading(true);
        setTError(null);
        const rows = await listTenders({ departmentId: depId });
        setTenders(rows);
        setFilesMap({}); // limpiar cache al cambiar de depto
      } catch (e: any) {
        setTError(e?.message ?? "No se pudieron cargar las licitaciones");
      } finally {
        setTLoading(false);
      }
    })();
  }, [depId]);

  // 3) Filtrado en cliente
  const filtered = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    const fromDate = from ? new Date(from + "T00:00:00") : null;
    const toDate = to ? new Date(to + "T23:59:59.999") : null;

    return [...tenders]
      .filter(t => {
        if (qNorm && !t.code.toLowerCase().includes(qNorm)) return false;
        const cAt = new Date(t.createdAt);
        if (fromDate && cAt < fromDate) return false;
        if (toDate && cAt > toDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tenders, q, from, to]);

  // Descargar PDF (carga perezosa de archivos + presign GET)
  const handleDownload = async (t: TenderRequestOut) => {
    try {
      let files = filesMap[t.id];
      if (!files) {
        files = await listTenderFiles(t.id);
        setFilesMap(prev => ({ ...prev, [t.id]: files }));
      }
      if (!files.length) {
        alert("Esta licitación no tiene archivos adjuntos.");
        return;
      }
      const f = files[0]; // si subes 1 PDF principal, tomamos el primero
      const { downloadUrl } = await presignGet({ key: f.s3Key });
      // abrir en nueva pestaña (o forzar descarga)
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message || "No se pudo descargar el archivo.");
    }
  };

  // Aprobar +1 nivel
  const handleApprove = async (t: TenderRequestOut) => {
    if (!user?.id) return alert("Sin usuario autenticado.");
    const comment = window.prompt("Comentario (opcional) para la aprobación:", "") || undefined;
    try {
      setActingId(t.id);
      const updated = await reviewTender(t.id, { decision: "APPROVE", actorUserId: user.id, comment });
      // refrescar en memoria
      setTenders(prev => prev.map(x => (x.id === t.id ? updated : x)));
    } catch (e: any) {
      alert(e?.message || "No se pudo aprobar.");
    } finally {
      setActingId(null);
    }
  };

  // Rechazar (cierra)
  const handleReject = async (t: TenderRequestOut) => {
    if (!user?.id) return alert("Sin usuario autenticado.");
    const comment = window.prompt("Comentario (opcional) para el rechazo:", "") || undefined;
    if (!window.confirm("¿Seguro que deseas rechazar esta licitación?")) return;
    try {
      setActingId(t.id);
      const updated = await reviewTender(t.id, { decision: "REJECT", actorUserId: user.id, comment });
      setTenders(prev => prev.map(x => (x.id === t.id ? updated : x)));
    } catch (e: any) {
      alert(e?.message || "No se pudo rechazar.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="admdep">
      <div className="admdep__header">
        <h1>Licitaciones por departamento</h1>
        <p className="muted">Selecciona un departamento, filtra y gestiona revisiones.</p>
      </div>

      <div className="admdep__filters tcard">
        <div className="row">
          <div className="field">
            <label>Departamento</label>
            {depLoading ? (
              <div className="muted">Cargando…</div>
            ) : depError ? (
              <div className="error">{depError}</div>
            ) : (
              <select value={depId} onChange={e => setDepId(e.target.value)}>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label>Buscar por código</label>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="TR-..." />
          </div>

          <div className="field">
            <label>Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>

          <div className="field">
            <label>Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="tcard">
        {tLoading ? (
          <div className="muted">Cargando licitaciones…</div>
        ) : tError ? (
          <div className="error">{tError}</div>
        ) : filtered.length === 0 ? (
          <div className="muted">No hay licitaciones para los filtros seleccionados.</div>
        ) : (
          <div className="table-wrap">
            <table className="admdep__table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Creada</th>
                  <th>Estado</th>
                  <th>Categoría</th>
                  <th>Nivel</th>
                  <th>Archivo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td className="mono">{row.code}</td>
                    <td>{fmtDate(row.createdAt)}</td>
                    <td><span className={`chip chip--${row.status.toLowerCase()}`}>{row.status}</span></td>
                    <td>{row.category}</td>
                    <td className="mono">{row.currentLevel}/{row.requiredLevels}</td>
                    <td>
                      <button className="btn small" onClick={() => handleDownload(row)}>Descargar</button>
                    </td>
                    <td>
                      <div className="btns">
                        <button
                          className="btn small primary"
                          disabled={actingId === row.id}
                          onClick={() => handleApprove(row)}
                          title="Aprobar nivel (+1)"
                        >
                          {actingId === row.id ? "Procesando…" : "Aprobar"}
                        </button>
                        <button
                          className="btn small danger"
                          disabled={actingId === row.id}
                          onClick={() => handleReject(row)}
                          title="Rechazar licitación"
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
