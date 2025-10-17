# app/routers/uploads.py
import os, uuid
from fastapi import APIRouter, HTTPException, Query
import boto3
from botocore.exceptions import ClientError  # <-- añade esto

router = APIRouter(prefix="/uploads", tags=["uploads"])

_REGION = os.getenv("AWS_REGION")
_BUCKET = os.getenv("S3_BUCKET")
_s3 = boto3.client("s3", region_name=_REGION)

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
            "put_object", Params=params, ExpiresIn=60
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
            ExpiresIn=60,  # segundos
        )
        return {"url": url}
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "ClientError")
        raise HTTPException(500, f"presign get failed: {code}")