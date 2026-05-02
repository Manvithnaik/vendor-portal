from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import ShipmentStatusEnum, EventSourceEnum


class ShipmentCreate(BaseModel):
    order_id: int
    is_partial: bool = False
    origin_logistics_id: Optional[int] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    service_type: Optional[str] = None
    incoterm: Optional[str] = None
    estimated_delivery_date: Optional[date] = None
    vehicle_number: Optional[str] = None
    eway_bill_number: Optional[str] = None
    number_of_packages: Optional[int] = None
    weight_kg: Optional[float] = None
    dimensions_cm: Optional[str] = None
    notes: Optional[str] = None


class ShipmentUpdate(BaseModel):
    status: Optional[ShipmentStatusEnum] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    estimated_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None


class ShipmentResponse(BaseModel):
    id: int
    shipment_number: str
    order_id: int
    manufacturer_org_id: Optional[int] = None
    buyer_org_id: Optional[int] = None
    is_partial: bool
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    status: ShipmentStatusEnum
    shipped_at: Optional[datetime] = None
    estimated_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    vehicle_number: Optional[str] = None
    eway_bill_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShipmentEventCreate(BaseModel):
    event_type: str
    location: Optional[str] = None
    description: Optional[str] = None
    event_timestamp: datetime
    source: EventSourceEnum = EventSourceEnum.manual


class ShipmentEventResponse(BaseModel):
    id: int
    shipment_id: int
    event_type: str
    location: Optional[str] = None
    description: Optional[str] = None
    event_timestamp: datetime
    source: EventSourceEnum
    created_at: datetime

    model_config = {"from_attributes": True}


class DeliveryConfirmationCreate(BaseModel):
    shipment_id: int
    signature_url: Optional[str] = None
    proof_of_delivery_url: Optional[str] = None
    notes: Optional[str] = None
