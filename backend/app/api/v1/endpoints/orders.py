"""Order endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.order import OrderCreate, OrderStatusUpdate, OrderResponse, VendorOrderResponse
from app.schemas.common import APIResponse, success_response
from app.services.order_service import OrderService
from typing import Optional

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=APIResponse)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Create a new order.

    REQUIRES (new workflow):
    - quotation_id: ID of the accepted Quote
    - po_document_url: URL of the uploaded Purchase Order PDF
    - delivery_address: delivery destination
    - manufacturer_org_id: the vendor/manufacturer org

    Order is created with status = vendor_review.
    Vendor must then call POST /orders/{id}/vendor-response to accept or reject.
    """
    svc = OrderService(db)
    order = svc.create(data, current_user.id, current_user.org_id)
    return success_response("Order created. Awaiting vendor review.", OrderResponse.model_validate(order))


@router.get("", response_model=APIResponse)
def list_orders(
    org_id: int = None,
    as_customer: bool = True,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    svc = OrderService(db)
    target_org = org_id if org_id else current_user.org_id
    orders = svc.list_by_org(target_org, as_customer, status, skip, limit)
    return success_response("Orders retrieved.", [OrderResponse.model_validate(o) for o in orders])


@router.get("/{order_id}", response_model=APIResponse)
def get_order(order_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = OrderService(db)
    order = svc.get_by_id(order_id)
    return success_response("Order retrieved.", OrderResponse.model_validate(order))


@router.post("/{order_id}/vendor-response", response_model=APIResponse)
def vendor_respond_to_order(
    order_id: int,
    data: VendorOrderResponse,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Vendor accepts or rejects a Purchase Order.

    Body:
      { "action": "accept" }
      { "action": "reject", "reason": "Out of stock until next month." }

    - accept → order.status becomes 'accepted' → moves to processing
    - reject → order.status becomes 'rejected' with reason stored
    """
    svc = OrderService(db)
    order = svc.vendor_respond(order_id, data, current_user.id)
    action_label = "accepted" if data.action == "accept" else "rejected"
    return success_response(f"Order {action_label}.", OrderResponse.model_validate(order))


@router.patch("/{order_id}/status", response_model=APIResponse)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    svc = OrderService(db)
    order = svc.update_status(order_id, data, current_user.id)
    from app.utils.mappers import map_order_status_to_frontend
    frontend_status = map_order_status_to_frontend(order.status)
    return success_response(f"Order status updated to {frontend_status}.", OrderResponse.model_validate(order))


@router.get("/{order_id}/history", response_model=APIResponse)
def get_order_history(order_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = OrderService(db)
    history = svc.get_status_history(order_id)
    data = [
        {
            "id": h.id,
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "note": h.note,
            "changed_at": h.changed_at,
            "changed_by": h.changed_by
        } for h in history
    ]
    return success_response("Order history retrieved.", data)
