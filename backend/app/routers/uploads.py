# app/routers/uploads.py
import os, uuid
from fastapi import APIRouter, HTTPException, Query
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config

router = APIRouter(prefix="/uploads", tags=["uploads"])

_REGION = os.getenv("AWS_REGION") or "us-east-2"
_BUCKET = os.getenv("S3_BUCKET")

_s3 = boto3.client(
    "s3",
    region_name=_REGION,
    endpoint_url=f"https://s3.{_REGION}.amazonaws.com",   # fuerza endpoint regional
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),  # bucket.s3.us-east-2.amazonaws.com
)

@router.get("/s3-presign")
def presign_put(
    filename: str = Query(...),
    contentType: str | None = None,
    tenderId: str | None = None,
):
    if not _BUCKET:
        raise HTTPException(500, "S3_BUCKET no configurado")

    key = f"tenders/{tenderId or 'misc'}/{uuid.uuid4()}-{filename}"
    params = {"Bucket": _BUCKET, "Key": key}
    if contentType:
        params["ContentType"] = contentType

    try:
        upload_url = _s3.generate_presigned_url(
            "put_object", Params=params, ExpiresIn=900  # 15 minutos
        )
    except Exception as e:
        raise HTTPException(500, f"Error generando URL: {e}")

    object_url = f"https://{_BUCKET}.s3.{_REGION}.amazonaws.com/{key}"
    return {"uploadUrl": upload_url, "objectUrl": object_url, "key": key}

@router.get("/s3-presign-get")
def presign_get(key: str = Query(..., min_length=3)):
    if not _BUCKET:
        raise HTTPException(500, "S3_BUCKET no configurado")

    try:
        url = _s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": _BUCKET, "Key": key},
            ExpiresIn=900,  # antes 60
        )
        return {"url": url}
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "ClientError")
        raise HTTPException(500, f"presign get failed: {code}")