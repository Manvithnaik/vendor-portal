from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
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


class OrganizationResponse(BaseModel):
    id: int
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
    verification_certificates: list[BusinessVerificationCertificateResponse] = []
    financial_details: Optional[FinancialDetailsResponse] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
