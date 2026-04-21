"""
Order schemas.

New workflow:
  Manufacturer selects a Quote → uploads PO document → creates Order (status: vendor_review)
  Vendor accepts/rejects the PO → Order continues to processing if accepted.

The frontend sends simplified status strings ('pending', 'accepted', etc.).
The service layer translates these via mappers.py before writing to the DB.
"""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator, field_serializer, model_validator
from app.models.enums import OrderStatusEnum, OrderPriorityEnum


# ---------------------------------------------------------------------------
# Frontend-facing status strings (what the React app sends/expects)
# ---------------------------------------------------------------------------
FRONTEND_ORDER_STATUSES = [
    "pending", "vendor_review", "accepted", "rejected",
    "shipped", "delivered", "processing", "draft", "confirmed",
    "cancelled", "disputed",
]


class OrderItemCreate(BaseModel):
    product_id: int
    contract_pricing_id: Optional[int] = None  # Optional: not all orders via contract
    quantity: int
    unit: Optional[str] = None
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    contract_pricing_id: Optional[int] = None
    quantity: int
    shipped_qty: float
    unit: Optional[str] = None
    unit_price: float
    gst_percentage: float
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    """
    What the frontend POSTs when creating an order from a selected quotation.
    quotation_id and po_document_url are now REQUIRED to enforce the new flow.
    """
    quotation_id: int                          # REQUIRED: must come from an accepted quote
    po_document_url: str                       # REQUIRED: uploaded PO PDF URL
    manufacturer_org_id: int
    contract_id: Optional[int] = None         # Optional: filled in automatically if quote links to contract
    priority: OrderPriorityEnum = OrderPriorityEnum.normal
    currency: str = "INR"
    delivery_address: str                      # REQUIRED: delivery details
    required_by_date: Optional[date] = None
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemCreate] = []


class VendorOrderResponse(BaseModel):
    """Vendor accepts or rejects a PO."""
    action: str   # "accept" | "reject"
    reason: Optional[str] = None  # Required when action == "reject"

    @field_validator("action")
    @classmethod
    def validate_action(cls, v):
        if v not in ("accept", "reject"):
            raise ValueError("action must be 'accept' or 'reject'")
        return v


class OrderStatusUpdate(BaseModel):
    """
    Frontend sends a simple status string. The service maps it to the DB enum.
    """
    status: str  # accepts frontend strings like 'accepted', 'rejected', 'vendor_review'
    note: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_org_id: int
    manufacturer_org_id: int
    contract_id: Optional[int] = None
    quotation_id: Optional[int] = None
    po_document_url: Optional[str] = None
    vendor_response_reason: Optional[str] = None
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
    
    vendor_name: Optional[str] = None
    customer_name: Optional[str] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def populate_org_names(self) -> "OrderResponse":
        # Properties in the model now handle vendor_name and customer_name
        return self

    @field_serializer("status")
    def serialize_status(self, status: OrderStatusEnum) -> str:
        """Always return the frontend-friendly status string, not the raw DB enum."""
        from app.utils.mappers import map_order_status_to_frontend
        return map_order_status_to_frontend(status)
