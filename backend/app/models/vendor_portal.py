"""
SQLAlchemy models for schema.sql sections 11–20 — all Vendor Portal tables:
admins, audit_logs, documents, vendor_bank_accounts, inventory, rfq,
rfq_broadcast, quotes, po_negotiations, vendor_payouts, disputes, refunds.
CRM tables (section 10) are also included at the bottom.
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, ForeignKey, Integer,
    Numeric, SmallInteger, String, Text, TIMESTAMP,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import (
    VerifyStatusEnum, RfqStatusEnum, PayoutStatusEnum,
    TicketStatusEnum, RefundStatusEnum,
    CrmInteractionEnum, CrmTaskTypeEnum, CrmTaskStatusEnum, PriorityEnum,
)


# ---------------------------------------------------------------------------
# Section 11 — Platform Admins
# ---------------------------------------------------------------------------
class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    role = Column(String(50), nullable=False, default="admin")
    access_level = Column(SmallInteger, nullable=False, default=1)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="active")
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    deleted_at = Column(TIMESTAMP(timezone=True))


# ---------------------------------------------------------------------------
# Section 12 — Audit Logs
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(String(30), nullable=False)
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    changed_by = Column(Integer)
    changed_by_org = Column(Integer)
    ip_address = Column(INET)
    user_agent = Column(String(512))
    changed_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Section 13 — Documents (KYC / Verification)
# ---------------------------------------------------------------------------
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type = Column(String(50), nullable=False)
    document_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    verify_status = Column(
        SAEnum(VerifyStatusEnum, name="verify_status_enum"),
        nullable=False,
        default=VerifyStatusEnum.pending,
    )
    is_verified = Column(Boolean, nullable=False, default=False)
    verified_by = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"))
    verified_at = Column(TIMESTAMP(timezone=True))
    uploaded_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    deleted_at = Column(TIMESTAMP(timezone=True))

    org = relationship("Organization", foreign_keys=[org_id])
    verifier = relationship("Admin", foreign_keys=[verified_by])


# ---------------------------------------------------------------------------
# Section 14 — Vendor Banking
# ---------------------------------------------------------------------------
class VendorBankAccount(Base):
    __tablename__ = "vendor_bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    account_name = Column(String(255), nullable=False)
    account_number = Column(String(50), nullable=False)
    ifsc_code = Column(String(20), nullable=False)
    bank_name = Column(String(255))
    branch = Column(String(255))
    is_primary = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)
    verified_by = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    deleted_at = Column(TIMESTAMP(timezone=True))

    org = relationship("Organization", foreign_keys=[org_id])
    verifier = relationship("Admin", foreign_keys=[verified_by])


# ---------------------------------------------------------------------------
# Section 15 — Inventory
# ---------------------------------------------------------------------------
class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    available_stock = Column(Numeric(14, 3), nullable=False, default=0)
    reserved_for_po = Column(Numeric(14, 3), nullable=False, default=0)
    in_transit = Column(Numeric(14, 3), nullable=False, default=0)
    low_stock_threshold = Column(Numeric(14, 3), nullable=False, default=0)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    org = relationship("Organization", foreign_keys=[org_id])
    product = relationship("Product", foreign_keys=[product_id])


# ---------------------------------------------------------------------------
# Section 16 — RFQ & Sourcing
# ---------------------------------------------------------------------------
class RFQ(Base):
    __tablename__ = "rfq"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("product_categories.id", ondelete="SET NULL"))
    location_filter = Column(String(100))
    min_vendor_rating = Column(Numeric(3, 2))
    deadline = Column(TIMESTAMP(timezone=True), nullable=False)
    deadline_extended_to = Column(TIMESTAMP(timezone=True))
    is_priority = Column(Boolean, nullable=False, default=False)
    status = Column(
        SAEnum(RfqStatusEnum, name="rfq_status_enum"),
        nullable=False,
        default=RfqStatusEnum.draft,
    )
    cancellation_reason = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    deleted_at = Column(TIMESTAMP(timezone=True))

    org = relationship("Organization", foreign_keys=[org_id])
    category = relationship("ProductCategory", foreign_keys=[category_id])
    broadcasts = relationship("RFQBroadcast", back_populates="rfq", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="rfq", cascade="all, delete-orphan")


class RFQBroadcast(Base):
    __tablename__ = "rfq_broadcast"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(
        Integer, ForeignKey("rfq.id", ondelete="CASCADE"), nullable=False, index=True
    )
    manufacturer_org_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    sent_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    viewed = Column(Boolean, nullable=False, default=False)
    responded = Column(Boolean, nullable=False, default=False)

    rfq = relationship("RFQ", back_populates="broadcasts")
    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_org_id])


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(
        Integer, ForeignKey("rfq.id", ondelete="CASCADE"), nullable=False, index=True
    )
    manufacturer_org_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    price = Column(Numeric(14, 2), nullable=False)
    lead_time_days = Column(Integer, nullable=False)
    compliance_notes = Column(Text)
    version = Column(SmallInteger, nullable=False, default=1)
    is_locked = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    deleted_at = Column(TIMESTAMP(timezone=True))

    rfq = relationship("RFQ", back_populates="quotes")
    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_org_id])


# ---------------------------------------------------------------------------
# Section 17 — PO Negotiations
# ---------------------------------------------------------------------------
class PONegotiation(Base):
    __tablename__ = "po_negotiations"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    round_number = Column(SmallInteger, nullable=False, default=1)
    initiated_by = Column(String(20), nullable=False)
    initiated_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    counter_quantity = Column(Numeric(12, 3))
    counter_price = Column(Numeric(14, 2))
    counter_delivery_date = Column(Date)
    status = Column(String(20), nullable=False, default="pending")
    note = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    order = relationship("Order", foreign_keys=[order_id])
    initiator = relationship("User", foreign_keys=[initiated_by_user_id])


# ---------------------------------------------------------------------------
# Section 18 — Vendor Payouts
# ---------------------------------------------------------------------------
class VendorPayout(Base):
    __tablename__ = "vendor_payouts"

    id = Column(Integer, primary_key=True, index=True)
    manufacturer_org_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False)
    gross_amount = Column(Numeric(16, 4), nullable=False)
    platform_fee = Column(Numeric(16, 4), nullable=False, default=0)
    tax_deducted = Column(Numeric(16, 4), nullable=False, default=0)
    net_payout = Column(Numeric(16, 4), nullable=False)
    status = Column(
        SAEnum(PayoutStatusEnum, name="payout_status_enum"),
        nullable=False,
        default=PayoutStatusEnum.scheduled,
    )
    scheduled_date = Column(Date)
    processed_at = Column(TIMESTAMP(timezone=True))
    bank_account_id = Column(Integer, ForeignKey("vendor_bank_accounts.id", ondelete="SET NULL"))
    reference_number = Column(String(100))
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_org_id])
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    bank_account = relationship("VendorBankAccount", foreign_keys=[bank_account_id])


# ---------------------------------------------------------------------------
# Section 19 — Disputes
# ---------------------------------------------------------------------------
class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_org_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False)
    manufacturer_org_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    rma_number = Column(String(50), nullable=False, unique=True)
    dispute_type = Column(String(30), nullable=False)
    category = Column(String(30))
    description = Column(Text)
    is_partial = Column(Boolean, nullable=False, default=False)
    status = Column(
        SAEnum(TicketStatusEnum, name="ticket_status_enum"),
        nullable=False,
        default=TicketStatusEnum.requested,
    )
    resolution_type = Column(String(30))
    mediator_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"))
    raised_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    resolved_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    deleted_at = Column(TIMESTAMP(timezone=True))

    order = relationship("Order", foreign_keys=[order_id])
    customer_org = relationship("Organization", foreign_keys=[customer_org_id])
    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_org_id])
    mediator = relationship("Admin", foreign_keys=[mediator_id])
    raiser = relationship("User", foreign_keys=[raised_by])
    refunds = relationship("Refund", back_populates="dispute")


# ---------------------------------------------------------------------------
# Section 20 — Refunds
# ---------------------------------------------------------------------------
class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False)
    dispute_id = Column(Integer, ForeignKey("disputes.id", ondelete="SET NULL"))
    refund_type = Column(String(10), nullable=False)
    amount = Column(Numeric(14, 4), nullable=False)
    status = Column(
        SAEnum(RefundStatusEnum, name="refund_status_enum"),
        nullable=False,
        default=RefundStatusEnum.initiated,
    )
    approved_by = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"))
    initiated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    completed_at = Column(TIMESTAMP(timezone=True))

    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    dispute = relationship("Dispute", back_populates="refunds")
    approver = relationship("Admin", foreign_keys=[approved_by])


# ---------------------------------------------------------------------------
# Section 10 — CRM (retained; out-of-scope for v1 routes)
# ---------------------------------------------------------------------------
class CRMInteraction(Base):
    __tablename__ = "crm_interactions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    performed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    interaction_type = Column(SAEnum(CrmInteractionEnum, name="crm_interaction_enum"), nullable=False)
    subject = Column(String(500))
    summary = Column(Text)
    outcome = Column(Text)
    related_contract_id = Column(Integer, ForeignKey("contracts.id"))
    related_order_id = Column(Integer, ForeignKey("orders.id"))
    interaction_date = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)


class CRMTask(Base):
    __tablename__ = "crm_tasks"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    task_type = Column(
        SAEnum(CrmTaskTypeEnum, name="crm_task_type_enum"),
        nullable=False,
        default=CrmTaskTypeEnum.other,
    )
    priority = Column(
        SAEnum(PriorityEnum, name="priority_enum"),
        nullable=False,
        default=PriorityEnum.medium,
    )
    status = Column(
        SAEnum(CrmTaskStatusEnum, name="crm_task_status_enum"),
        nullable=False,
        default=CrmTaskStatusEnum.pending,
    )
    due_date = Column(Date)
    completed_at = Column(TIMESTAMP(timezone=True))
    related_contract_id = Column(Integer, ForeignKey("contracts.id"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)


class CRMNote(Base):
    __tablename__ = "crm_notes"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=False)
    is_pinned = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
