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
  fileName?: string;
  contentType?: string;
  size?: number;
  uploadedBy?: string;
  createdAt: string;
};