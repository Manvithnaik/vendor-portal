"""
SQLAlchemy model for schema.sql section 3 — contracts.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, ForeignKey,
    Integer, String, Text, TIMESTAMP,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import ContractStatusEnum


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    buyer_org_id = Column("customer_org_id", Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    manufacturer_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    contract_number = Column(String(100), nullable=False, unique=True)
    name = Column(String(255))
    type = Column(String(30))
    status = Column(
        SAEnum(ContractStatusEnum, name="contract_status_enum"),
        nullable=False,
        default=ContractStatusEnum.draft,
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    renewal_type = Column(String(10), nullable=False, default="manual")
    signed_by_vendor = Column(Boolean, nullable=False, default=False)
    signed_by_vendor_at = Column(TIMESTAMP(timezone=True))
    signed_by_buyer = Column(Boolean, nullable=False, default=False)
    signed_by_buyer_at = Column(TIMESTAMP(timezone=True))
    document_url = Column(String(500))
    terms = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    buyer_org = relationship(
        "Organization", back_populates="contracts_as_buyer", foreign_keys=[buyer_org_id]
    )
    manufacturer_org = relationship(
        "Organization", back_populates="contracts_as_manufacturer", foreign_keys=[manufacturer_org_id]
    )
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    product_pricing = relationship("ContractProductPricing", back_populates="contract")
    orders = relationship("Order", back_populates="contract")
