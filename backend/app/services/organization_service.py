"""
Organization service — CRUD and verification management.
"""
from sqlalchemy.orm import Session
from app.models.organization import Organization
from app.models.enums import OrgTypeEnum, VerifyStatusEnum
from app.repositories.organization_repo import OrganizationRepository
from app.schemas.organization import OrganizationUpdate
from app.utils.mappers import map_verify_status_to_db
from app.exceptions import NotFoundException, ConflictException


class OrganizationService:
    def __init__(self, db: Session):
        self.repo = OrganizationRepository(db)

    def get_by_id(self, org_id: int) -> Organization:
        org = self.repo.get(org_id)
        if not org:
            raise NotFoundException("Organization")
        return org

    def list_all(self, org_type: OrgTypeEnum = None, skip: int = 0, limit: int = 100):
        if org_type:
            return self.repo.get_by_type(org_type, skip, limit)
        return self.repo.get_all(skip, limit)

    def update(self, org_id: int, data: OrganizationUpdate) -> Organization:
        org = self.get_by_id(org_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(org, field, value)
        return self.repo.update(org)

    def update_verification_status(
        self, org_id: int, frontend_status: str
    ) -> Organization:
        """Admin endpoint: approve/reject an org application."""
        org = self.get_by_id(org_id)
        db_status = map_verify_status_to_db(frontend_status)
        if db_status is None:
            from app.exceptions import ValidationException
            raise ValidationException(f"Unknown status: {frontend_status}")
        org.verification_status = db_status
        if db_status == VerifyStatusEnum.verified:
            org.is_active = True
        elif db_status == VerifyStatusEnum.rejected:
            org.is_active = False
        return self.repo.update(org)

    def get_pending_applications(self):
        return self.repo.get_pending_verification()

    def soft_delete(self, org_id: int) -> None:
        org = self.get_by_id(org_id)
        self.repo.soft_delete(org)
