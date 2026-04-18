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
        self.db = db
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
        self, org_id: int, frontend_status: str, admin_id: int
    ) -> Organization:
        """Admin endpoint: approve/reject an org application. Logs to audit_logs."""
        org = self.get_by_id(org_id)
        old_status = org.verification_status.value
        db_status = map_verify_status_to_db(frontend_status)
        if db_status is None:
            from app.exceptions import ValidationException
            raise ValidationException(f"Unknown status: {frontend_status}")
        
        org.verification_status = db_status
        if db_status == VerifyStatusEnum.verified:
            org.is_active = True
        elif db_status == VerifyStatusEnum.rejected:
            org.is_active = False
            
        updated_org = self.repo.update(org)

        # Log to audit_logs
        from app.models.vendor_portal import AuditLog
        self.db.add(AuditLog(
            entity_type="organization",
            entity_id=org_id,
            action=frontend_status,  # "verified" or "rejected"
            old_values={"verification_status": old_status},
            new_values={"verification_status": frontend_status},
            changed_by=admin_id
        ))
        self.db.commit()
        return updated_org

    def get_pending_applications(self):
        return self.repo.get_pending_verification()

    def get_reviewed_organizations(self):
        """Returns orgs that are not pending, with reviewer name from audit_logs."""
        from sqlalchemy import desc
        from app.models.vendor_portal import AuditLog, Admin
        
        # Query organizations joined with latest verification audit log
        orgs = self.db.query(Organization).filter(
            Organization.verification_status != VerifyStatusEnum.pending
        ).order_by(Organization.updated_at.desc()).all()

        results = []
        for org in orgs:
            # Find latest verification log for this org
            log = self.db.query(AuditLog, Admin.name)\
                .join(Admin, AuditLog.changed_by == Admin.id)\
                .filter(
                    AuditLog.entity_type == "organization",
                    AuditLog.entity_id == org.id,
                    AuditLog.action.in_(["verified", "rejected"])
                ).order_by(desc(AuditLog.changed_at)).first()
            
            org_data = {
                "id": org.id,
                "name": org.name,
                "email": org.email,
                "org_type": org.org_type.value,
                "verification_status": org.verification_status.value,
                "reviewed_by_admin_name": log[1] if log else "Unknown",
                "reviewed_at": log[0].changed_at.isoformat() if log else org.updated_at.isoformat()
            }
            results.append(org_data)
        
        return results

    def soft_delete(self, org_id: int) -> None:
        org = self.get_by_id(org_id)
        self.repo.soft_delete(org)
