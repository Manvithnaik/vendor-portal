"""
SQLAlchemy models for schema.sql section 5 — orders, order_items,
order_status_history.
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, ForeignKey,
    Integer, Numeric, String, Text, TIMESTAMP,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import OrderStatusEnum, OrderPriorityEnum


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(100), nullable=False, unique=True)
    customer_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    manufacturer_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True, index=True)  # Now optional: set via quote
    quotation_id = Column(Integer, ForeignKey("quotes.id"), nullable=True, index=True)    # NEW: links back to accepted quote
    po_document_url = Column(String(500), nullable=True)                                  # NEW: uploaded PO document
    vendor_response_reason = Column(Text, nullable=True)                                  # NEW: reason if vendor rejects PO
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"))
    status = Column(
        SAEnum(OrderStatusEnum, name="order_status_enum"),
        nullable=False,
        default=OrderStatusEnum.draft,
    )
    priority = Column(
        SAEnum(OrderPriorityEnum, name="order_priority_enum"),
        nullable=False,
        default=OrderPriorityEnum.normal,
    )
    total_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    currency = Column(String(10), nullable=False, default="USD")
    delivery_address = Column(Text)
    required_by_date = Column(Date)
    expected_delivery_date = Column(Date)
    special_instructions = Column(Text)
    grn_confirmed = Column(Boolean, nullable=False, default=False)
    grn_confirmed_at = Column(TIMESTAMP(timezone=True))
    grn_confirmed_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    customer_org = relationship("Organization", foreign_keys=[customer_org_id])
    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_org_id])
    contract = relationship("Contract", back_populates="orders")
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    grn_confirmer = relationship("User", foreign_keys=[grn_confirmed_by])
    quotation = relationship("Quote", foreign_keys=[quotation_id])
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship(
        "OrderStatusHistory", back_populates="order", cascade="all, delete-orphan"
    )
    shipments = relationship("Shipment", back_populates="order")
    invoices = relationship("Invoice", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    contract_pricing_id = Column(
        Integer, ForeignKey("contract_product_pricing.id"), nullable=True  # Optional: not all orders via contract
    )
    quantity = Column(Integer, nullable=False)
    shipped_qty = Column(Numeric(12, 3), nullable=False, default=0)
    unit = Column(String(50))
    unit_price = Column(Numeric(12, 4), nullable=False)
    gst_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    notes = Column(Text)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    contract_pricing = relationship("ContractProductPricing", back_populates="order_items")

    @property
    def product_name(self):
        return self.product.name if self.product else None


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(BigInteger, primary_key=True, index=True)
    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    previous_status = Column(String(50))
    new_status = Column(String(50), nullable=False)
    note = Column(Text)
    changed_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="status_history")
    user = relationship("User", foreign_keys=[changed_by])
