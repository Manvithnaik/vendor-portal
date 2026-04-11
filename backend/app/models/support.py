"""
SQLAlchemy models for schema.sql section 8 — support_tickets, ticket_messages,
ticket_status_history.
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, Column, ForeignKey, Integer,
    String, Text, TIMESTAMP,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import TicketCategoryEnum, PriorityEnum, TicketStatusEnum


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(100), nullable=False, unique=True)
    raised_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    raised_by_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), index=True)
    related_order_id = Column(Integer, ForeignKey("orders.id"))
    related_shipment_id = Column(Integer, ForeignKey("shipments.id"))
    related_invoice_id = Column(Integer, ForeignKey("invoices.id"))
    category = Column(SAEnum(TicketCategoryEnum, name="ticket_cat_enum"), nullable=False)
    priority = Column(
        SAEnum(PriorityEnum, name="priority_enum"),
        nullable=False,
        default=PriorityEnum.medium,
    )
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(
        SAEnum(TicketStatusEnum, name="ticket_status_enum"),
        nullable=False,
        default=TicketStatusEnum.open,
    )
    dispute_id = Column(Integer)  # FK added after disputes table exists (alter in DB)
    resolved_at = Column(TIMESTAMP(timezone=True))
    resolution_notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    raised_by_user = relationship("User", foreign_keys=[raised_by_user_id])
    raised_by_org = relationship("Organization", foreign_keys=[raised_by_org_id])
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_user_id])
    messages = relationship(
        "TicketMessage", back_populates="ticket", cascade="all, delete-orphan"
    )
    status_history = relationship(
        "TicketStatusHistory", back_populates="ticket", cascade="all, delete-orphan"
    )


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(BigInteger, primary_key=True, index=True)
    ticket_id = Column(
        Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sent_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reply_to_message_id = Column(BigInteger, ForeignKey("ticket_messages.id"))
    message = Column(Text, nullable=False)
    attachments = Column(JSONB)
    is_internal_note = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")
    sent_by = relationship("User", foreign_keys=[sent_by_user_id])
    reply_to = relationship("TicketMessage", remote_side=[id])


class TicketStatusHistory(Base):
    __tablename__ = "ticket_status_history"

    id = Column(BigInteger, primary_key=True, index=True)
    ticket_id = Column(
        Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    previous_status = Column(String(50))
    new_status = Column(String(50), nullable=False)
    note = Column(Text)
    changed_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    ticket = relationship("SupportTicket", back_populates="status_history")
    changer = relationship("User", foreign_keys=[changed_by])
