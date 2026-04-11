from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.enums import TicketCategoryEnum, PriorityEnum, TicketStatusEnum


class SupportTicketCreate(BaseModel):
    related_order_id: Optional[int] = None
    related_shipment_id: Optional[int] = None
    related_invoice_id: Optional[int] = None
    category: TicketCategoryEnum
    priority: PriorityEnum = PriorityEnum.medium
    subject: str
    description: str


class SupportTicketUpdate(BaseModel):
    status: Optional[TicketStatusEnum] = None
    assigned_to_user_id: Optional[int] = None
    resolution_notes: Optional[str] = None
    priority: Optional[PriorityEnum] = None


class TicketMessageCreate(BaseModel):
    message: str
    reply_to_message_id: Optional[int] = None
    is_internal_note: bool = False


class TicketMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sent_by_user_id: int
    reply_to_message_id: Optional[int] = None
    message: str
    is_internal_note: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SupportTicketResponse(BaseModel):
    id: int
    ticket_number: str
    raised_by_user_id: int
    raised_by_org_id: int
    assigned_to_user_id: Optional[int] = None
    related_order_id: Optional[int] = None
    related_shipment_id: Optional[int] = None
    related_invoice_id: Optional[int] = None
    category: TicketCategoryEnum
    priority: PriorityEnum
    subject: str
    description: str
    status: TicketStatusEnum
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
