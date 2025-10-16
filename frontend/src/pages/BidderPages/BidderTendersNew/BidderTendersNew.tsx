// src/pages/BidderPages/BidderTendersNew.tsx
import { useState } from "react";
import { http } from "../../../lib/http"; // tu helper
import { useAuth } from "../../../features/auth/useAuth";

type PresignResp = { uploadUrl: string; objectUrl: string; key: string };

export default function BidderTendersNew() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const tenderId = "demo"; // luego usarás el ID real de la licitación

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Preparando subida…");

    // 1) Pide URL prefirmada al backend
    const q = new URLSearchParams({
      filename: file.name,
      contentType: file.type || "application/pdf",
      tenderId,
    });
    const { uploadUrl, objectUrl }: PresignResp = await http(`/uploads/s3-presign?${q}`);

    // 2) Sube directo a S3 con PUT
    setStatus("Subiendo a S3…");
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/pdf" },
      body: file,
    });
    if (!putRes.ok) throw new Error(`Fallo PUT S3: ${putRes.status}`);

    // 3) (Opcional) Registrar el archivo en tu backend
    // POST /tender-requests/{id}/files con los metadatos que definiste
    await http(`/tender-requests/${tenderId}/files`, {
      method: "POST",
      body: JSON.stringify({
        url: objectUrl,
        fileName: file.name,
        contentType: file.type || "application/pdf",
        size: file.size,
        uploadedBy: user?.id,
      }),
    });

    setStatus("¡Listo! Archivo subido y registrado.");
  };

  return (
    <div style={{ maxWidth: 560, margin: "40px auto" }}>
      <h1>Postular a una nueva licitación</h1>
      <p>Sube un PDF a S3 usando URL prefirmada.</p>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file}
        onClick={() => handleUpload().catch((e) => setStatus(String(e)))}
        style={{ marginLeft: 8 }}
      >
        Subir
      </button>

      <p>{status}</p>
    </div>
  );
}
