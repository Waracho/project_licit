import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../features/auth/useAuth";
import { listTenders, listTenderFiles, presignDownload } from "../../../features/tenders/api";
import type { TenderRequestOut, RequestFileOut } from "../../../features/tenders/types";
import "./BidderTendersList.css";

type RowState = {
  tender: TenderRequestOut;
  open: boolean;
  files?: RequestFileOut[];
  loadingFiles?: boolean;
  filesError?: string | null;
};

export default function BidderTendersList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // carga inicial
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const all = await listTenders();
        const mine = user?.id ? all.filter(t => t.createdBy === user.id) : [];
        // ordenar por fecha desc
        mine.sort((a, b) => (b.createdAt.localeCompare(a.createdAt)));
        setRows(mine.map(t => ({ tender: t, open: false })));
      } catch (e: any) {
        setError(e?.message || "No se pudieron cargar las postulaciones");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const toggleOpen = async (id: string) => {
    setRows(prev => prev.map(r => r.tender.id === id ? { ...r, open: !r.open } : r));
    const row = rows.find(r => r.tender.id === id);
    if (!row) return;
    // si abrimos y no hemos cargado archivos, traerlos
    if (!row.open && !row.files && !row.loadingFiles) {
      setRows(prev => prev.map(r => r.tender.id === id ? { ...r, loadingFiles: true, filesError: null } : r));
      try {
        const files = await listTenderFiles(id);
        setRows(prev => prev.map(r => r.tender.id === id ? { ...r, files, loadingFiles: false } : r));
      } catch (e: any) {
        setRows(prev => prev.map(r => r.tender.id === id ? { ...r, filesError: (e?.message || "No se pudieron cargar los archivos"), loadingFiles: false } : r));
      }
    }
  };

  const statusBadgeClass = (status: string) => {
    const s = status.toUpperCase();
    if (s === "OPEN") return "badge open";
    if (s === "IN_REVIEW") return "badge review";
    if (s === "DRAFT") return "badge draft";
    if (s === "REJECTED" || s === "CANCELLED") return "badge danger";
    return "badge";
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch { return iso; }
  };

  const handleDownload = async (f: RequestFileOut) => {
    // Intenta presign GET (si existe el endpoint)
    try {
      const { url } = await presignDownload(f.s3Key);
      window.open(url, "_blank");
    } catch {
      // Fallback: muestra la key (por si quieres copiarla)
      alert(`No se pudo generar link de descarga.\nKey: ${f.s3Key}`);
    }
  };

  const content = useMemo(() => {
    if (loading) return <p className="muted">Cargando…</p>;
    if (error) return <p className="error">{error}</p>;
    if (!rows.length) return <p className="muted">No tienes postulaciones todavía.</p>;
    return (
      <div className="tlist">
        {rows.map(r => (
          <div key={r.tender.id} className={"trow" + (r.open ? " is-open" : "")}>
            <button className="trow__main" onClick={() => toggleOpen(r.tender.id)}>
              <span className="trow__code">{r.tender.code}</span>
              <span className="trow__date">{formatDate(r.tender.createdAt)}</span>
              <span className={statusBadgeClass(r.tender.status)}>{r.tender.status}</span>
            </button>

            {r.open && (
              <div className="trow__details">
                <div className="trow__grid">
                  <div>
                    <div className="label">Categoría</div>
                    <div className="value">{r.tender.category}</div>
                  </div>
                  <div>
                    <div className="label">Departamento</div>
                    <div className="value">{r.tender.departmentId}</div>
                  </div>
                  <div>
                    <div className="label">Revisión</div>
                    <div className="value">{r.tender.currentLevel} / {r.tender.requiredLevels}</div>
                  </div>
                </div>

                <div className="files">
                  <div className="files__title">Archivos</div>
                  {r.loadingFiles ? (
                    <div className="muted">Cargando archivos…</div>
                  ) : r.filesError ? (
                    <div className="error">{r.filesError}</div>
                  ) : (r.files && r.files.length) ? (
                    <ul className="filelist">
                      {r.files.map(f => (
                        <li key={f.id} className="fileitem">
                          <div className="file-meta">
                            <div className="file-name">{f.fileName || f.s3Key.split("/").pop()}</div>
                            <div className="file-sub">
                              <code className="file-key">{f.s3Key}</code>
                              <span> · </span>
                              <span>{formatDate(f.createdAt)}</span>
                            </div>
                          </div>
                          <div className="file-actions">
                            <button className="btn small" onClick={() => handleDownload(f)}>Descargar</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="muted">No hay archivos adjuntos.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [rows, loading, error]);

  return (
    <div className="btlist-wrap">
      <h1>Mis postulaciones</h1>
      <p className="muted">Haz clic en una fila para ver detalles y archivos.</p>
      {content}
    </div>
  );
}
