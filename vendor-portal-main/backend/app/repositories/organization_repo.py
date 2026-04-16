from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.organization import Organization
from app.models.enums import OrgTypeEnum, VerifyStatusEnum
from app.repositories.base import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    def __init__(self, db: Session):
        super().__init__(Organization, db)

    def get_by_email(self, email: str) -> Optional[Organization]:
        return (
            self.db.query(Organization)
            .filter(Organization.email == email, Organization.deleted_at.is_(None))
            .first()
        )

    def get_by_type(self, org_type: OrgTypeEnum, skip: int = 0, limit: int = 100) -> List[Organization]:
        return (
            self.db.query(Organization)
            .filter(Organization.org_type == org_type, Organization.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_pending_verification(self) -> List[Organization]:
        return (
            self.db.query(Organization)
            .filter(
                Organization.verification_status == VerifyStatusEnum.pending,
                Organization.deleted_at.is_(None),
            )
            .all()
        )

    def soft_delete(self, org: Organization) -> Organization:
        from datetime import datetime
        org.deleted_at = datetime.utcnow()
        org.is_active = False
        return self.update(org)
