from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from app.models.enums import OrgTypeEnum, VerifyStatusEnum


class BusinessVerificationCertificateResponse(BaseModel):
    id: int
    certificate_number: str
    issued_by: str
    issued_date: date
    expiry_date: Optional[date] = None
    document_url: Optional[str] = None
    verification_status: VerifyStatusEnum

    model_config = {"from_attributes": True}


class FinancialDetailsResponse(BaseModel):
    bank_name: Optional[str] = None
    account_number_encrypted: Optional[str] = None
    routing_number_encrypted: Optional[str] = None
    tax_id_encrypted: Optional[str] = None
    currency: Optional[str] = None

    model_config = {"from_attributes": True}


class OrganizationCreate(BaseModel):
    name: str
    org_type: OrgTypeEnum
    email: EmailStr
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    about: Optional[str] = None
    industry_type: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    about: Optional[str] = None
    industry_type: Optional[str] = None
    factory_address: Optional[str] = None
    authorised_signatory_name: Optional[str] = None
    authorised_signatory_phone: Optional[str] = None
    
    # Manufacturer extras
    annual_turnover: Optional[str] = None
    gst_number: Optional[str] = None
    business_license: Optional[str] = None



class OrganizationResponse(BaseModel):
    org_id: int = 0  # canonical B2B identifier — mapped from ORM `id` field
    id: int          # kept for backward-compat; use org_id in new code
    name: str
    org_type: OrgTypeEnum
    email: str
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    business_doc: Optional[str] = None
    business_doc_data: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    about: Optional[str] = None
    industry_type: Optional[str] = None
    factory_address: Optional[str] = None
    authorised_signatory_name: Optional[str] = None
    authorised_signatory_phone: Optional[str] = None
    overall_rating: Optional[float] = None
    verification_status: VerifyStatusEnum
    
    # Simplified access for frontend
    gst_number: Optional[str] = None
    business_license: Optional[str] = None
    annual_turnover: Optional[str] = None

    
    verification_certificates: list[BusinessVerificationCertificateResponse] = []
    financial_details: Optional[FinancialDetailsResponse] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def populate_flat_fields(self) -> "OrganizationResponse":
        # Expose org_id as the canonical B2B organization identifier (mapped from ORM id)
        if self.org_id == 0 and self.id:
            self.org_id = self.id

        # Map from financial_details if top-level is empty
        if not self.gst_number and self.financial_details:
            self.gst_number = self.financial_details.tax_id_encrypted
        
        # Map from first certificate if top-level is empty
        if not self.business_license and self.verification_certificates:
            self.business_license = self.verification_certificates[0].certificate_number
            
        # Map from 'about' for annual_turnover
        if not self.annual_turnover:
            self.annual_turnover = self.about
            
        return self

