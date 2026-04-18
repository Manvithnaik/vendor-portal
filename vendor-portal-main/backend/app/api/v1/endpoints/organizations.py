"""Organization endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.schemas.organization import OrganizationUpdate, OrganizationResponse
from app.schemas.common import APIResponse, success_response
from app.services.organization_service import OrganizationService
from app.models.enums import OrgTypeEnum
from typing import Optional, List
from pydantic import BaseModel
from fastapi import BackgroundTasks
from app.services.email_service import send_approval_notification
from datetime import datetime
from app.core.config import settings
BASE_URL = settings.BASE_URL
class VerificationActionBody(BaseModel):
    action: Optional[str] = None
    reason: Optional[str] = None
    changes: Optional[List[str]] = None
    deadline: Optional[str] = None

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=APIResponse)
def list_organizations(
    org_type: Optional[OrgTypeEnum] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    svc = OrganizationService(db)
    orgs = svc.list_all(org_type, skip, limit)
    return success_response("Organizations retrieved.", [OrganizationResponse.model_validate(o) for o in orgs])


@router.get("/pending-applications", response_model=APIResponse)
def pending_applications(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    svc = OrganizationService(db)
    orgs = svc.get_pending_applications()

   

    for org in orgs:
        if hasattr(org, "verification_certificates") and org.verification_certificates:
            for cert in org.verification_certificates:
                if cert.document_url:
                    cert.document_url = f"{BASE_URL}/uploads/{cert.document_url}"

    return success_response(
        "Pending applications retrieved.",
        [OrganizationResponse.model_validate(o) for o in orgs]
    )

@router.get("/{org_id}", response_model=APIResponse)
def get_organization(org_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = OrganizationService(db)
    org = svc.get_by_id(org_id)
    return success_response("Organization retrieved.", OrganizationResponse.model_validate(org))


@router.put("/{org_id}", response_model=APIResponse)
def update_organization(
    org_id: int,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    svc = OrganizationService(db)
    org = svc.update(org_id, data)
    return success_response("Organization updated.", OrganizationResponse.model_validate(org))


@router.patch("/{org_id}/verification", response_model=APIResponse)
def update_verification(
    org_id: int,
    status: str,
    background_tasks: BackgroundTasks,
    body: Optional[VerificationActionBody] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Admin-only: approve or reject an organization's application."""
    svc = OrganizationService(db)
    org = svc.update_verification_status(org_id, status)
    
    if body and body.action in ["approved", "rejected", "resubmit"]:
        user_type = "Vendor" if org.org_type.value == "manufacturer" else "Manufacturer"
        user_name = org.name
        user_email = org.email
        background_tasks.add_task(
            send_approval_notification,
            type=body.action,
            user_email=user_email,
            user_name=user_name,
            user_type=user_type,
            account_id=org.id,
            action_date=datetime.utcnow(),
            reason=body.reason,
            changes=body.changes,
            deadline=body.deadline
        )

    return success_response(f"Verification status updated to '{status}'.", OrganizationResponse.model_validate(org))
