// src/pages/BidderPages/BidderTendersNew.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../features/auth/useAuth";
import {
  listDepartments,
  createTender,
  presignUpload,
  attachTenderFile,
  validatePdfStructure,
} from "../../../features/tenders/api";
import type { Department, TenderRequestIn } from "../../../features/tenders/types";
import "./BidderTendersNew.css";

type StepKey = 1 | 2 | 3;

// Mapeo nombre->categoría (ajústalo si cambia el nombre en BD)
const CATEGORY_BY_DEPT_NAME: Record<string, "ELECTRICAL" | "WATER" | "INTERNET"> = {
  "Eléctrico": "ELECTRICAL",
  "Agua": "WATER",
  "Internet": "INTERNET",
};

function inferCategory(dep?: Department): "ELECTRICAL" | "WATER" | "INTERNET" {
  const name = dep?.name ?? "";
  return CATEGORY_BY_DEPT_NAME[name] ?? "INTERNET";
}

function genTenderCode(dep?: Department) {
  const depTag = (dep?.name || "GEN")
    .slice(0, 2)
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const d = new Date();
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${depTag}-${yyyymmdd}-${rnd}`;
}

// —— tipos livianos para la respuesta del validador ——
type PdfChecks = {
  portada?: boolean;
  objetivo_y_alcance?: boolean;
  requisitos_tecnicos_y_administrativos?: boolean;
  criterios_de_evaluacion?: boolean;
};
type PdfValidationResult = {
  ok: boolean;
  checks: PdfChecks;
  pagesAnalyzed?: number;
  source?: { bucket?: string | null; key?: string };
};

const CHECK_LABEL: Record<keyof NonNullable<PdfChecks>, string> = {
  portada: "Portada (nombre, depto., fechas)",
  objetivo_y_alcance: "Objetivo y alcance",
  requisitos_tecnicos_y_administrativos: "Requisitos técnicos y administrativos",
  criterios_de_evaluacion: "Criterios de evaluación",
};

export default function BidderTendersNew() {
  const { user } = useAuth();

  // Paso actual
  const [step, setStep] = useState<StepKey>(1);

  // Catálogo
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Form paso 1 (solo depto)
  const [departmentId, setDepartmentId] = useState("");

  // Paso 2 (archivo)
  const [file, setFile] = useState<File | null>(null);

  // Estado general
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [missingChecks, setMissingChecks] = useState<string[]>([]);

  // Creada
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Carga departamentos
  useEffect(() => {
    (async () => {
      try {
        setLoadingDeps(true);
        const deps = await listDepartments();
        setDepartments(deps);
        if (!departmentId && deps.length) setDepartmentId(deps[0].id);
      } catch (e: any) {
        setLoadErr(e?.message || "No se pudieron cargar los departamentos");
      } finally {
        setLoadingDeps(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validaciones
  const step1Valid = useMemo(() => !!departmentId, [departmentId]);
  const step2Valid = !!file;

  // Navegación
  const goNext = () => setStep(prev => (prev < 3 ? ((prev + 1) as StepKey) : prev));
  const goPrev  = () => setStep(prev => (prev > 1 ? ((prev - 1) as StepKey) : prev));
  const goto    = (s: StepKey) => setStep(s);

  // Submit final del paso 2 (ahora valida PDF ANTES de crear tender)
  const handleSubmit = async () => {
    if (!user?.id) {
      setError("No hay usuario autenticado.");
      return;
    }
    if (!step1Valid || !file) {
      setError("Completa los pasos requeridos.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMissingChecks([]);
    setStatus("Preparando subida del PDF…");

    try {
      // 1) Subimos a S3 para poder validar desde backend
      const presign = await presignUpload({
        filename: file.name,
        contentType: file.type || "application/pdf",
        // tenderId aún NO existe; se validará primero
      });

      setStatus("Subiendo a S3…");
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Fallo PUT S3: ${putRes.status}`);

      // 2) Validar estructura del PDF
      setStatus("Validando estructura del PDF…");
      const val = await validatePdfStructure({
        s3Key: presign.key,
        bucket: null,           // usa el bucket por defecto del backend
        maxPages: 8,
        debug: false,
      }) as PdfValidationResult;

      if (!val.ok) {
        const faltantes = Object.entries(val.checks || {})
          .filter(([, ok]) => !ok)
          .map(([k]) => CHECK_LABEL[k as keyof PdfChecks] || k);

        setMissingChecks(faltantes);
        setStatus("");
        setError("El PDF no cumple con la estructura requerida.");
        // Opcional: podrías borrar el objeto de S3 aquí con un endpoint DELETE si quieres.
        return; // ⟵ detenemos el flujo, NO se crea la licitación
      }

      // 3) Si pasó validación, ahora sí creamos la tender y adjuntamos el archivo
      setStatus("Creando licitación…");
      const dep = departments.find(d => d.id === departmentId);
      const payload: TenderRequestIn = {
        departmentId,
        createdBy: user.id,
        code: genTenderCode(dep),
        category: inferCategory(dep),
        status: "IN_REVIEW",
        requiredLevels: 2,
        currentLevel: 0,
      };
      const tender = await createTender(payload);
      setCreatedId(tender.id);

      setStatus("Registrando archivo…");
      await attachTenderFile(tender.id, {
        s3Key: presign.key,                        // guardamos la key
        fileName: file.name,
        contentType: file.type || "application/pdf",
        size: file.size,
        uploadedBy: user.id,
      });

      setStatus("¡Listo! Licitación creada y PDF adjuntado.");
      goto(3);
    } catch (e: any) {
      setError(e?.message || "No se pudo completar la postulación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tnew">
      <div className="tnew__header">
        <h1>Nueva postulación</h1>
        <p className="muted">Completa los pasos para crear tu licitación y adjuntar el PDF principal.</p>
      </div>

      {/* Indicador de pasos */}
      <ol className="tsteps">
        <li className={step >= 1 ? "is-done" : ""} onClick={() => step > 1 && goto(1)}>
          <span className="num">1</span> Detalles
        </li>
        <li className={step >= 2 ? "is-done" : ""} onClick={() => step > 2 && goto(2)}>
          <span className="num">2</span> PDF
        </li>
        <li className={step === 3 ? "is-done" : ""}>
          <span className="num">3</span> Confirmación
        </li>
      </ol>

      {/* Paso 1: solo departamento */}
      {step === 1 && (
        <form
          className="tcard"
          onSubmit={(e) => { e.preventDefault(); if (step1Valid) goNext(); }}
        >
          <div className="grid">
            <div className="field">
              <label>Departamento</label>
              {loadingDeps ? (
                <div className="muted">Cargando departamentos…</div>
              ) : loadErr ? (
                <div className="error">
                  {typeof loadErr === "string" ? loadErr : "Error cargando departamentos"}
                </div>
              ) : (
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} required>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={!step1Valid}>Siguiente</button>
          </div>
        </form>
      )}

      {/* Paso 2: PDF */}
      {step === 2 && (
        <div className="tcard">
          <div className="field">
            <label>Archivo PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <small className="muted">Formatos permitidos: PDF. Tamaño recomendado &lt; 25MB.</small>
          </div>

          {/* Feedback del validador */}
          {missingChecks.length > 0 && (
            <div className="callout error" role="alert" style={{ marginTop: 12 }}>
              <strong>Faltan estas características:</strong>
              <ul style={{ marginTop: 6 }}>
                {missingChecks.map(x => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}

          <div className="actions">
            <button className="btn ghost" onClick={goPrev}>Atrás</button>
            <button
              className="btn primary"
              disabled={!step2Valid || submitting}
              onClick={() => handleSubmit()}
            >
              {submitting ? "Procesando…" : "Crear y adjuntar"}
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: OK */}
      {step === 3 && (
        <div className="tcard success">
          <h3>¡Postulación enviada!</h3>
          <p>
            Tu licitación fue creada correctamente
            {createdId ? <> (ID: <code>{createdId}</code>)</> : null}
            {" "}y el PDF quedó adjunto.
          </p>
          <div className="actions">
            <a className="btn" href="/bidder/tenders/list">Ver mis postulaciones</a>
            <a className="btn ghost" href="/bidder/tenders/new">Crear otra</a>
          </div>
        </div>
      )}

      {!!status && <p className="status">{status}</p>}
      {!!error && <p className="error">{error}</p>}
    </div>
  );
}
 