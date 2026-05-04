from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_superadmin
from app.schemas.auth import AdminCreateRequest
from app.schemas.user import AdminResponse
from app.schemas.common import APIResponse, success_response
from app.models.vendor_portal import Admin, AuditLog
from app.core.security import hash_password
from app.exceptions import ConflictException, NotFoundException

router = APIRouter(prefix="/admin", tags=["Admin Management"])

import string
import secrets
from app.utils.email import send_admin_invite_email

@router.post("/admins", response_model=APIResponse)
def create_admin(
    data: AdminCreateRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_superadmin)
):
    """Superadmin only: create a new admin account with auto-generated password."""
    # Check if email exists
    existing = db.query(Admin).filter(Admin.email == data.email, Admin.deleted_at.is_(None)).first()
    if existing:
        raise ConflictException(f"Admin with email {data.email} already exists.")

    new_admin = Admin(
        name=data.name,
        email=data.email,
        role="admin",
        access_level=1,
        password_hash=hash_password(secrets.token_urlsafe(32)), # Locked until setup
        status="suspended",
        is_active=False
    )
    db.add(new_admin)
    db.flush()

    # Log action
    db.add(AuditLog(
        entity_type="admin",
        entity_id=new_admin.id,
        action="admin_invited",
        new_values={"email": data.email, "role": "admin"},
        changed_by=current_admin.id
    ))
    db.commit()
    db.refresh(new_admin)

    # Generate setup token
    from app.core.security import create_invitation_token
    token = create_invitation_token(new_admin.id)

    # Send invitation email
    email_sent = send_admin_invite_email(data.email, data.name, token)
    
    msg = "Invitation sent successfully."
    if not email_sent:
        msg = "Admin account created, but invitation email failed to send. Please check SMTP settings."

    resp_data = AdminResponse.model_validate(new_admin)
    return success_response(msg, resp_data)


@router.get("/admins", response_model=APIResponse)
def list_admins(
    db: Session = Depends(get_db),
    _=Depends(get_current_superadmin)
):
    """Superadmin only: list all regular admins (excludes superadmins)."""
    admins = db.query(Admin).filter(
        Admin.access_level == 1,
        Admin.deleted_at.is_(None)
    ).order_by(Admin.created_at.desc()).all()
    
    return success_response("Admins retrieved.", [AdminResponse.model_validate(a) for a in admins])


@router.delete("/admins/{admin_id}", response_model=APIResponse)
def delete_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_superadmin)
):
    """Superadmin only: soft-delete/deactivate an admin account."""
    if admin_id == current_admin.id:
        raise ConflictException("Cannot delete your own account.")

    admin = db.query(Admin).filter(Admin.id == admin_id, Admin.deleted_at.is_(None)).first()
    if not admin:
        raise NotFoundException("Admin")

    admin.deleted_at = datetime.utcnow()
    admin.is_active = False
    admin.status = "suspended"
    
    # Log action
    db.add(AuditLog(
        entity_type="admin",
        entity_id=admin.id,
        action="admin_deactivated",
        changed_by=current_admin.id
    ))
    db.commit()

    return success_response("Admin account deactivated and suspended.")
