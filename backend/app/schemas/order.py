"""
Order schemas.

The frontend sends simplified status strings ('pending', 'accepted', etc.).
The service layer translates these via mappers.py before writing to the DB.
The response layer translates DB enums back to frontend-friendly strings.
"""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.enums import OrderStatusEnum, OrderPriorityEnum


# ---------------------------------------------------------------------------
# Frontend-facing status strings (what the React app sends/expects)
# ---------------------------------------------------------------------------
FRONTEND_ORDER_STATUSES = [
    "pending", "accepted", "rejected", "shipped", "delivered",
    "processing", "draft", "confirmed", "cancelled", "disputed",
]


class OrderItemCreate(BaseModel):
    product_id: int
    contract_pricing_id: int
    quantity: int
    unit: Optional[str] = None
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    contract_pricing_id: int
    quantity: int
    shipped_qty: float
    unit: Optional[str] = None
    unit_price: float
    gst_percentage: float
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    """
    What the frontend POSTs. status is not set at creation time (defaults to 'draft').
    """
    contract_id: int
    manufacturer_org_id: int
    priority: OrderPriorityEnum = OrderPriorityEnum.normal
    currency: str = "USD"
    delivery_address: Optional[str] = None
    required_by_date: Optional[date] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    """
    Frontend sends a simple status string. The service maps it to the DB enum.
    """
    status: str  # accepts frontend strings like 'accepted', 'rejected'
    note: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_org_id: int
    manufacturer_org_id: int
    contract_id: int
    created_by: int
    status: OrderStatusEnum
    priority: OrderPriorityEnum
    total_amount: float
    currency: str
    delivery_address: Optional[str] = None
    required_by_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    special_instructions: Optional[str] = None
    grn_confirmed: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

    model_config = {"from_attributes": True}
