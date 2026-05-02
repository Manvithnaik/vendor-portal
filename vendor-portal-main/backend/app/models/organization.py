"""
SQLAlchemy models for schema.sql sections 2 (organizations, roles,
business_verification_certificates, manufacturer_financial_details).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, Integer, Numeric,
    SmallInteger, String, Text, TIMESTAMP, Enum as SAEnum, ForeignKey
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import OrgTypeEnum, RoleOrgTypeEnum, VerifyStatusEnum


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    org_code = Column(String(50), unique=True, index=True)
    name = Column(String(255), nullable=False)
    org_type = Column(SAEnum(OrgTypeEnum, name="org_type_enum"), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50))
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    website = Column(String(255))
    logo_url = Column(String(500))
    business_doc = Column(String(500))
    business_doc_data = Column(Text)

    # Vendor-specific fields (NULL for buyer/manufacturer orgs)
    contact_name = Column(String(150))
    contact_email = Column(String(150))
    contact_phone = Column(String(20))
    about = Column(Text)
    industry_type = Column(String(100))
    factory_address = Column(Text)
    authorised_signatory_name = Column(String(255))
    authorised_signatory_phone = Column(String(20))
    overall_rating = Column(Numeric(3, 2))
    verification_status = Column(
        SAEnum(VerifyStatusEnum, name="verify_status_enum"),
        nullable=False,
        default=VerifyStatusEnum.pending,
    )

    # Shared audit
    is_active = Column(Boolean, nullable=False, default=True)
    deleted_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="organization", foreign_keys="User.org_id")
    contracts_as_buyer = relationship(
        "Contract", back_populates="buyer_org", foreign_keys="Contract.buyer_org_id"
    )
    contracts_as_manufacturer = relationship(
        "Contract", back_populates="manufacturer_org", foreign_keys="Contract.manufacturer_org_id"
    )
    products = relationship("Product", back_populates="manufacturer_org")
    verification_certificates = relationship("BusinessVerificationCertificate", back_populates="org")
    financial_details = relationship("ManufacturerFinancialDetails", back_populates="org", uselist=False)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    org_type = Column(SAEnum(RoleOrgTypeEnum, name="role_org_type_enum"), nullable=False)
    description = Column(Text)
    permissions = Column(Text)  # stored as JSON string; use .json() in service layer

    # Relationships
    users = relationship("User", back_populates="role")


class BusinessVerificationCertificate(Base):
    __tablename__ = "business_verification_certificates"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    certificate_number = Column(String(255), nullable=False)
    issued_by = Column(String(255), nullable=False)
    issued_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    document_url = Column(String(500))
    verification_status = Column(
        SAEnum(VerifyStatusEnum, name="verify_status_enum"),
        nullable=False,
        default=VerifyStatusEnum.pending,
    )
    verified_by = Column(Integer)
    verified_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    org = relationship("Organization", back_populates="verification_certificates", foreign_keys=[org_id])


class ManufacturerFinancialDetails(Base):
    __tablename__ = "manufacturer_financial_details"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    bank_name = Column(String(255))
    account_number_encrypted = Column(String(500))
    routing_number_encrypted = Column(String(500))
    tax_id_encrypted = Column(String(500))
    currency = Column(String(10), nullable=False, default="USD")
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    org = relationship("Organization", back_populates="financial_details", foreign_keys=[org_id])
