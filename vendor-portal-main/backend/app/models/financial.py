"""
SQLAlchemy models for schema.sql section 6 — payment_profiles, invoices,
payments.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, ForeignKey, Integer,
    Numeric, String, Text, TIMESTAMP,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import (
    PaymentMethodEnum, PaymentStatusEnum, InvoiceStatusEnum
)


class PaymentProfile(Base):
    __tablename__ = "payment_profiles"

    id = Column(Integer, primary_key=True, index=True)
    buyer_org_id = Column("customer_org_id", Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    profile_name = Column(String(255), nullable=False)
    payment_method = Column(
        SAEnum(PaymentMethodEnum, name="payment_method_enum"), nullable=False
    )
    is_default = Column(Boolean, nullable=False, default=False)
    details_encrypted = Column(JSONB)
    billing_address = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    buyer_org = relationship("Organization", foreign_keys=[buyer_org_id])
    payments = relationship("Payment", back_populates="payment_profile")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), nullable=False, unique=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    issued_by_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    billed_to_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    subtotal = Column(Numeric(14, 4), nullable=False)
    tax_amount = Column(Numeric(14, 4), nullable=False, default=0.0)
    discount_amount = Column(Numeric(14, 4), nullable=False, default=0.0)
    total_amount = Column(Numeric(14, 4), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    status = Column(
        SAEnum(InvoiceStatusEnum, name="invoice_status_enum"),
        nullable=False,
        default=InvoiceStatusEnum.draft,
    )
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    document_url = Column(String(500))
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="invoices")
    issued_by_org = relationship("Organization", foreign_keys=[issued_by_org_id])
    billed_to_org = relationship("Organization", foreign_keys=[billed_to_org_id])
    payments = relationship("Payment", back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    payment_profile_id = Column(Integer, ForeignKey("payment_profiles.id"))
    transaction_reference = Column(String(255), unique=True)
    amount = Column(Numeric(14, 4), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    payment_method = Column(
        SAEnum(PaymentMethodEnum, name="payment_method_enum"), nullable=False
    )
    status = Column(
        SAEnum(PaymentStatusEnum, name="payment_status_enum"),
        nullable=False,
        default=PaymentStatusEnum.pending,
    )
    payment_date = Column(TIMESTAMP(timezone=True))
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")
    payment_profile = relationship("PaymentProfile", back_populates="payments")
