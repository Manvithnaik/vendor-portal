"""Shipping endpoints for dynamic button."""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.common import APIResponse, success_response
from app.models.order import Order, OrderStatusHistory
from app.models.enums import OrderStatusEnum
from app.exceptions import NotFoundException, BusinessRuleException

router = APIRouter(prefix="/shipping", tags=["Shipping"])

@router.get("/orders", response_model=APIResponse)
def get_shipping_orders(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from app.models.enums import OrderStatusEnum
    from app.utils.mappers import map_order_status_to_frontend
    
    orders = db.query(Order).filter(
        Order.manufacturer_org_id == current_user.org_id,
        Order.status.in_([OrderStatusEnum.accepted, OrderStatusEnum.shipped, OrderStatusEnum.delivered])
    ).all()
    
    results = []
    for o in orders:
        product_name = o.items[0].product.name if o.items and o.items[0].product else "Unknown Product"
        quantity = sum(item.quantity for item in o.items) if o.items else 0
        customer_name = o.customer_org.name if o.customer_org else "Unknown Customer"
        
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "product_name": product_name,
            "customer_name": customer_name,
            "quantity": quantity,
            "status": map_order_status_to_frontend(o.status)
        })
        
    return success_response("Shipping orders retrieved.", results)

@router.put("/update-status/{order_id}", response_model=APIResponse)
def update_shipping_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise NotFoundException("Order")

    previous_status = order.status
    if order.status == OrderStatusEnum.accepted:
        new_status = OrderStatusEnum.shipped
    elif order.status == OrderStatusEnum.shipped:
        new_status = OrderStatusEnum.delivered
    elif order.status == OrderStatusEnum.delivered:
        raise BusinessRuleException("Order is already delivered.")
    else:
        raise BusinessRuleException(f"Cannot update shipping status from '{order.status.value}'.")

    order.status = new_status
    order.updated_at = datetime.utcnow()

    # Log history
    db.add(OrderStatusHistory(
        order_id=order.id,
        changed_by=current_user.id,
        previous_status=previous_status.value,
        new_status=new_status.value,
        note=f"Smart button updated status to {new_status.value}."
    ))

    db.commit()
    db.refresh(order)

    # Convert status to frontend friendly format to return
    from app.utils.mappers import map_order_status_to_frontend
    frontend_status = map_order_status_to_frontend(order.status)
    
    return success_response(f"Status updated to {frontend_status}.", {"id": order.id, "status": frontend_status})
