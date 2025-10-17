export type Department = {
  id: string;
  name: string;
};

export type TenderRequestIn = {
  departmentId: string;
  createdBy: string;
  code: string;
  category: string;      // ELECTRICAL | WATER | INTERNET
  status: string;        // DRAFT | IN_REVIEW | OPEN | ...
  requiredLevels: number;
  currentLevel: number;
};

export type TenderRequestOut = TenderRequestIn & {
  id: string;
  createdAt: string;
  modifiedAt: string;
  departmentName?: string;   // ← nuevo
};

export type PresignResp = {
  uploadUrl: string;
  objectUrl: string;
  key: string;
};

export type RequestFileCreate = {
  s3Key: string;                 // ← usamos la key de S3
  bucket?: string | null;        // opcional, si quieres forzar bucket
  fileName?: string;
  contentType?: string;
  size?: number;
  uploadedBy?: string;
};

export type RequestFileOut = {
  id: string;
  tenderRequestId: string;
  s3Key: string;
  fileName?: string | null;
  contentType?: string | null;
  size?: number | null;
  uploadedBy?: string | null;
  createdAt: string;
};

export type ReviewAction = {
  decision: "APPROVE" | "REJECT";
  actorUserId: string;
  comment?: string;
};

export type TenderEventOut = {
  id: string;
  tenderRequestId: string;
  type:
    | "CREATED"
    | "FILE_ATTACHED"
    | "FILE_REMOVED"
    | "REVIEW_APPROVED"
    | "REVIEW_REJECTED"
    | "STATUS_CHANGED";
  actorUserId: string;
  at: string;
  level?: number | null;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
};