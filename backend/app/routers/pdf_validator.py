from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone
import os, io, re, unicodedata

import boto3

router = APIRouter(prefix="/validator", tags=["validator"])

# ---------- Config S3 ----------
_S3 = boto3.client("s3", region_name=os.getenv("AWS_REGION"))
_DEFAULT_BUCKET = os.getenv("S3_BUCKET")


# ---------- Helpers ----------
def _normalize(s: str) -> str:
    """minúsculas, sin tildes, espacios compactos"""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s

def _has_date_like(s: str) -> bool:
    # dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd o variantes
    return bool(re.search(
        r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:19|20)\d{2}[/-]\d{1,2}[/-]\d{1,2})\b",
        s
    ))

def _has_tokens_on_same_page(pages_norm: List[str], tokens: List[str]) -> Tuple[bool, Optional[int]]:
    """Devuelve True y página (0-based) si TODOS los tokens aparecen en una misma página normalizada"""
    for i, txt in enumerate(pages_norm):
        if all(t in txt for t in tokens):
            return True, i
    return False, None

def _extract_text_pages_from_bytes(data: bytes, max_pages: Optional[int] = None) -> List[str]:
    """
    Extrae texto por página. Intenta pdfminer; si una página queda vacía,
    prueba extraer esa página con pypdf como fallback.
    """
    from pypdf import PdfReader
    from pdfminer.high_level import extract_text

    reader = PdfReader(io.BytesIO(data))
    total = len(reader.pages)
    limit = min(total, max_pages or total)

    pages_text: List[str] = []

    for i in range(limit):
        txt = ""
        # 1) primero pdfminer (suele segmentar mejor el layout)
        try:
            txt = extract_text(io.BytesIO(data), page_numbers=[i]) or ""
        except Exception:
            txt = ""

        # 2) si vino vacío, intenta pypdf
        if not txt:
            try:
                txt = reader.pages[i].extract_text() or ""
            except Exception:
                txt = ""

        pages_text.append(txt)

    # limpia trailing páginas completamente vacías (caso raro)
    while pages_text and not pages_text[-1]:
        pages_text.pop()

    return pages_text


# ---------- Modelos ----------
class PdfCheckIn(BaseModel):
    s3Key: str
    bucket: Optional[str] = None
    maxPages: Optional[int] = 10
    debug: Optional[bool] = False


# ---------- Endpoint ----------
@router.post("/check-pdf-structure")
def check_pdf_structure(body: PdfCheckIn) -> Dict[str, Any]:
    bucket = body.bucket or _DEFAULT_BUCKET
    if not bucket:
        raise HTTPException(500, "S3_BUCKET no configurado y no se envió 'bucket' en la petición")

    # 1) Descargar PDF de S3
    try:
        obj = _S3.get_object(Bucket=bucket, Key=body.s3Key)
        data = obj["Body"].read()
    except Exception as e:
        raise HTTPException(404, f"No se pudo leer el PDF de S3: {e}")

    # 2) Extraer texto por página
    pages_raw = _extract_text_pages_from_bytes(data, max_pages=body.maxPages or 10)
    pages_norm = [_normalize(p) for p in pages_raw]

    # 3) Reglas de validación

    # --- Portada (página 1) ---
    portada_ok = False
    portada_missing: List[str] = []
    portada_page_idx: Optional[int] = None
    if pages_norm:
        p1 = pages_norm[0]

        # señales de "título"
        has_nombre = any(k in p1 for k in [
            "nombre", "titulo", "título", "proyecto", "licitacion", "licitación", "solicitud"
        ])
        # señales de "departamento" (opcional, se informará como missing si no aparece)
        has_depto = any(k in p1 for k in [
            "departamento", "depto", "area", "área", "unidad"
        ])
        # fecha
        has_fecha = _has_date_like(p1)

        # Portada relajada: consideramos OK si hay TÍTULO + FECHA
        if has_nombre and has_fecha:
            portada_ok = True
            portada_page_idx = 0

        # Informamos faltantes (solo a modo de guía)
        if not has_nombre: portada_missing.append("nombre/título")
        if not has_depto:  portada_missing.append("departamento (opcional)")
        if not has_fecha:  portada_missing.append("fecha")

    # --- Objetivo y alcance ---
    obj_ok, obj_page = _has_tokens_on_same_page(pages_norm, ["objetiv", "alcance"])

    # --- Requisitos técnicos y administrativos ---
    req_ok, req_page = _has_tokens_on_same_page(
        pages_norm, ["requisit", "tecnic", "administrativ"]
    )

    # --- Criterios de evaluación ---
    crit_ok, crit_page = _has_tokens_on_same_page(
        pages_norm, ["criterio", "evaluacion"]
    )

    # 4) Armar resultado
    checks = {
        "portada": {
            "ok": portada_ok,
            "page": (portada_page_idx + 1) if portada_ok else None,
            "missing": portada_missing,
        },
        "objetivo_y_alcance": {
            "ok": obj_ok,
            "page": (obj_page + 1) if obj_ok else None,
        },
        "requisitos_tecnicos_y_administrativos": {
            "ok": req_ok,
            "page": (req_page + 1) if req_ok else None,
        },
        "criterios_de_evaluacion": {
            "ok": crit_ok,
            "page": (crit_page + 1) if crit_ok else None,
        },
    }

    result: Dict[str, Any] = {
        "ok": bool(portada_ok and obj_ok and req_ok and crit_ok),
        "checks": checks,
        "pagesAnalyzed": len(pages_norm),
        "source": {"bucket": bucket, "key": body.s3Key},
    }

    # 5) Debug opcional: preview de texto
    if body.debug:
        result["pagesPreviewRaw"] = [(pages_raw[i] or "")[:400] for i in range(len(pages_raw))]
        result["pagesPreviewNorm"] = [(pages_norm[i] or "")[:400] for i in range(len(pages_norm))]

    return result
