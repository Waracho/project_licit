import { http } from "../../lib/http";
import type { TenderRequestOut, Department, ReviewAction, RequestFileOut, TenderEventOut} from "../tenders/types";

// ...lo que ya tienes arriba

export async function listDepartments() {
  return http<Department[]>("/departments");
}


export async function listTenders(params: { departmentId: string; status?: string; category?: string }) {
  const qs = new URLSearchParams({
    departmentId: params.departmentId,
    ...(params.status ? { status: params.status } : {}),
    ...(params.category ? { category: params.category } : {}),
  });
  return http<TenderRequestOut[]>(`/tender-requests?${qs.toString()}`);
}

/* 👇 NUEVO: listar archivos por tender */
export async function listTenderFiles(tenderId: string) {
  return http<RequestFileOut[]>(`/tender-requests/${tenderId}/files`);
}

/* 👇 NUEVO: presign GET para descargar por s3Key */
export async function presignGet(params: { key: string }) {
  const qs = new URLSearchParams({ key: params.key });
  return http<{ downloadUrl: string }>(`/uploads/s3-presign-get?${qs.toString()}`);
}

/* 👇 NUEVO: revisar (aprobar / rechazar) */
export async function reviewTender(tenderId: string, body: ReviewAction) {
  return http<TenderRequestOut>(`/tender-requests/${tenderId}/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* (opcional para un historial) */
export async function listTenderEvents(tenderId: string) {
  return http<TenderEventOut[]>(`/tender-requests/${tenderId}/events`);
}