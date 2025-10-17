import { http } from "../../lib/http";
import type {
  Department,
  TenderRequestIn,
  TenderRequestOut,
  PresignResp,
  RequestFileOut,
} from "./types";

export async function listDepartments() {
  return http<Department[]>("/departments");
}

export async function createTender(payload: TenderRequestIn) {
  return http<TenderRequestOut>("/tender-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function presignUpload(params: { filename: string; contentType: string; tenderId?: string }) {
  const q = new URLSearchParams({
    filename: params.filename,
    contentType: params.contentType,
    ...(params.tenderId ? { tenderId: params.tenderId } : {}),
  });
  return http<PresignResp>(`/uploads/s3-presign?${q.toString()}`);
}

export async function attachTenderFile(
  tenderId: string,
  data: { s3Key: string; fileName?: string; contentType?: string; size?: number; uploadedBy?: string }
) {
  return http(`/tender-requests/${tenderId}/files`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// (Opcional) validar estructura del PDF
export async function validatePdfStructure(data: { s3Key: string; bucket?: string | null; maxPages?: number; debug?: boolean }) {
  return http(`/validator/check-pdf-structure`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listTenders() {
  return http<TenderRequestOut[]>("/tender-requests");
}

// ⬇️ NUEVO: archivos de una tender
export async function listTenderFiles(tenderId: string) {
  return http<RequestFileOut[]>(`/tender-requests/${tenderId}/files`);
}

// features/tenders/api.ts
export async function presignDownload(s3Key: string) {
  const q = new URLSearchParams({ key: s3Key });
  return http<{ url: string }>(`/uploads/s3-presign-get?${q.toString()}`);
}
