"""
File upload endpoint.
Supports local-disk storage (dev) and Supabase Storage (production).
Returns a permanent URL that goes directly into po_document_url / other URL fields.
"""
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status

from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])


def _upload_to_supabase(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload to Supabase Storage and return the public URL."""
    try:
        from supabase import create_client
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        path = f"po/{uuid.uuid4().hex}/{filename}"
        sb.storage.from_(settings.SUPABASE_BUCKET).upload(
            path, file_bytes, {"content-type": content_type}
        )
        return sb.storage.from_(settings.SUPABASE_BUCKET).get_public_url(path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase storage error: {str(exc)}"
        )


def _upload_to_local(file_bytes: bytes, filename: str) -> str:
    """Save to local uploads/ directory; URL served by StaticFiles mount."""
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    filepath = os.path.join(upload_dir, unique_name)
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/files/{unique_name}"


@router.post("/po-document", response_model=APIResponse)
async def upload_po_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a Purchase Order (PO) document.
    Accepts PDF only, max 10 MB.
    Returns: { file_url: "https://..." }
    """
    # Validate file type
    if file.content_type not in ("application/pdf",):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only PDF files are accepted for PO documents."
        )

    # Read and validate size (10 MB cap)
    file_bytes = await file.read()
    max_bytes = 10 * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 10 MB limit."
        )

    safe_name = os.path.basename(file.filename or "document.pdf")

    # Use Supabase if configured, otherwise local disk
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        file_url = _upload_to_supabase(file_bytes, safe_name, file.content_type)
    else:
        file_url = _upload_to_local(file_bytes, safe_name)

    return APIResponse(
        status="success",
        message="File uploaded successfully.",
        data={"file_url": file_url, "file_name": safe_name}
    )
