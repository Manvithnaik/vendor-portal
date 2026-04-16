from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import (
    RfqStatusEnum, TicketStatusEnum, RefundStatusEnum, PayoutStatusEnum, QuoteStatusEnum
)


# --- RFQ ---
class RFQCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    location_filter: Optional[str] = None
    min_vendor_rating: Optional[float] = None
    deadline: datetime
    is_priority: bool = False
    broadcast_to_org_ids: list[int] = []  # manufacturer orgs to broadcast to


class RFQUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    deadline_extended_to: Optional[datetime] = None
    status: Optional[RfqStatusEnum] = None
    cancellation_reason: Optional[str] = None


class RFQResponse(BaseModel):
    id: int
    org_id: int
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    deadline: datetime
    is_priority: bool
    status: RfqStatusEnum
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Quotes ---
class QuoteCreate(BaseModel):
    rfq_id: int
    price: float
    lead_time_days: int
    compliance_notes: Optional[str] = None


class QuoteResponse(BaseModel):
    id: int
    rfq_id: int
    manufacturer_org_id: int
    price: float
    lead_time_days: int
    compliance_notes: Optional[str] = None
    version: int
    is_locked: bool
    status: QuoteStatusEnum  # NEW: submitted | accepted | rejected
    created_at: datetime

    model_config = {"from_attributes": True}


class QuoteSelectResponse(BaseModel):
    """Response returned after a manufacturer selects a quote."""
    quote_id: int
    rfq_id: int
    message: str = "Quote selected. You may now create an order."


# --- Disputes ---
class DisputeCreate(BaseModel):
    order_id: int
    dispute_type: str
    category: Optional[str] = None
    description: Optional[str] = None
    is_partial: bool = False


class DisputeUpdate(BaseModel):
    status: Optional[TicketStatusEnum] = None
    resolution_type: Optional[str] = None
    mediator_id: Optional[int] = None


class DisputeResponse(BaseModel):
    id: int
    order_id: int
    customer_org_id: int
    manufacturer_org_id: int
    rma_number: str
    dispute_type: str
    category: Optional[str] = None
    description: Optional[str] = None
    is_partial: bool
    status: TicketStatusEnum
    resolution_type: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Refunds ---
class RefundCreate(BaseModel):
    invoice_id: int
    dispute_id: Optional[int] = None
    refund_type: str
    amount: float


class RefundResponse(BaseModel):
    id: int
    invoice_id: int
    dispute_id: Optional[int] = None
    refund_type: str
    amount: float
    status: RefundStatusEnum
    approved_by: Optional[int] = None
    initiated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
