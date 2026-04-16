"""
SQLAlchemy models for schema.sql section 7 — shipments, shipment_events,
delivery_confirmations.
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, ForeignKey,
    Integer, Numeric, String, Text, TIMESTAMP,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import ShipmentStatusEnum, EventSourceEnum


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_number = Column(String(100), nullable=False, unique=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    manufacturer_org_id = Column(Integer, ForeignKey("organizations.id"), index=True)
    customer_org_id = Column(Integer, ForeignKey("organizations.id"), index=True)
    is_partial = Column(Boolean, nullable=False, default=False)
    origin_logistics_id = Column(Integer, ForeignKey("supply_chain_logistics.id"))
    carrier = Column(String(255))
    tracking_number = Column(String(255))
    tracking_url = Column(String(500))
    service_type = Column(String(100))
    incoterm = Column(String(50))
    status = Column(
        SAEnum(ShipmentStatusEnum, name="shipment_status_enum"),
        nullable=False,
        default=ShipmentStatusEnum.pending,
    )
    dispatched_by = Column(Integer, ForeignKey("users.id"))
    shipped_at = Column(TIMESTAMP(timezone=True))
    estimated_delivery_date = Column(Date)
    actual_delivery_date = Column(Date)
    vehicle_number = Column(String(50))
    eway_bill_number = Column(String(100))
    number_of_packages = Column(Integer)
    received_by = Column(Integer, ForeignKey("users.id"))
    weight_kg = Column(Numeric(8, 2))
    dimensions_cm = Column(String(100))
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="shipments")
    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_org_id])
    customer_org = relationship("Organization", foreign_keys=[customer_org_id])
    dispatcher = relationship("User", foreign_keys=[dispatched_by])
    receiver = relationship("User", foreign_keys=[received_by])
    events = relationship("ShipmentEvent", back_populates="shipment", cascade="all, delete-orphan")
    delivery_confirmation = relationship(
        "DeliveryConfirmation", back_populates="shipment", uselist=False
    )


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id = Column(BigInteger, primary_key=True, index=True)
    shipment_id = Column(
        Integer, ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type = Column(String(100), nullable=False)
    location = Column(String(255))
    description = Column(Text)
    event_timestamp = Column(TIMESTAMP(timezone=True), nullable=False)
    source = Column(
        SAEnum(EventSourceEnum, name="event_source_enum"),
        nullable=False,
        default=EventSourceEnum.system,
    )
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    shipment = relationship("Shipment", back_populates="events")


class DeliveryConfirmation(Base):
    __tablename__ = "delivery_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=False, unique=True)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    signature_url = Column(String(500))
    proof_of_delivery_url = Column(String(500))
    notes = Column(Text)
    confirmed_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    shipment = relationship("Shipment", back_populates="delivery_confirmation")
    confirmer = relationship("User", foreign_keys=[confirmed_by])
