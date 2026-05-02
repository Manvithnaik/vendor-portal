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
        update_data = data.model_dump(exclude_none=True)
        
        # Handle special field mappings
        if "annual_turnover" in update_data:
            org.about = update_data.pop("annual_turnover")
            
        if "gst_number" in update_data:
            gst = update_data.pop("gst_number")
            if org.financial_details:
                org.financial_details.tax_id_encrypted = gst
            else:
                from app.models.organization import ManufacturerFinancialDetails
                org.financial_details = ManufacturerFinancialDetails(
                    org_id=org.id, tax_id_encrypted=gst, currency="USD"
                )
                self.db.add(org.financial_details)
                
        if "business_license" in update_data:
            license_no = update_data.pop("business_license")
            if org.verification_certificates:
                org.verification_certificates[0].certificate_number = license_no
            else:
                from app.models.organization import BusinessVerificationCertificate
                from datetime import date
                cert = BusinessVerificationCertificate(
                    org_id=org.id, certificate_number=license_no,
                    issued_by="Self-Submitted", issued_date=date.today(),
                    verification_status=VerifyStatusEnum.pending
                )
                org.verification_certificates.append(cert)
                self.db.add(cert)

        for field, value in update_data.items():
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

        from app.schemas.organization import OrganizationResponse
        from app.core.config import settings

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
            
            # Format URLs consistently with pending applications
            if hasattr(org, "verification_certificates") and org.verification_certificates:
                for cert in org.verification_certificates:
                    if cert.document_url and not str(cert.document_url).startswith("http"):
                        cert.document_url = f"{settings.BASE_URL}/uploads/{cert.document_url}"
            
            try:
                org_data = OrganizationResponse.model_validate(org).model_dump(mode="json")
            except Exception:
                # Fallback to standard model_dump if mode="json" is not supported (e.g. older Pydantic)
                org_data = OrganizationResponse.model_validate(org).dict()
                
            org_data["reviewed_by_admin_name"] = log[1] if log else "Unknown"
            org_data["reviewed_at"] = log[0].changed_at.isoformat() if log else org.updated_at.isoformat()
            
            results.append(org_data)
        
        return results

    def soft_delete(self, org_id: int) -> None:
        org = self.get_by_id(org_id)
        self.repo.soft_delete(org)
