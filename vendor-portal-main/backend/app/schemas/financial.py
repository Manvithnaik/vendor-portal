from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import PaymentMethodEnum, PaymentStatusEnum, InvoiceStatusEnum


class InvoiceCreate(BaseModel):
    order_id: int
    issued_by_org_id: int
    billed_to_org_id: int
    subtotal: float
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    total_amount: float
    currency: str = "USD"
    issue_date: date
    due_date: date
    document_url: Optional[str] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatusEnum] = None
    document_url: Optional[str] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    order_id: int
    issued_by_org_id: int
    billed_to_org_id: int
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    currency: str
    status: InvoiceStatusEnum
    issue_date: date
    due_date: date
    document_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    invoice_id: int
    payment_profile_id: Optional[int] = None
    amount: float
    currency: str = "USD"
    payment_method: PaymentMethodEnum
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    payment_profile_id: Optional[int] = None
    transaction_reference: Optional[str] = None
    amount: float
    currency: str
    payment_method: PaymentMethodEnum
    status: PaymentStatusEnum
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
