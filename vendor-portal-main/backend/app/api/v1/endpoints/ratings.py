from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.order import Order
from app.models.rating import Rating
from app.models.organization import Organization
from app.schemas.rating import RatingCreate, RatingResponse, RatingWithOrder
from app.models.enums import OrderStatusEnum

router = APIRouter(prefix="/ratings", tags=["ratings"])

@router.post("/", response_model=RatingResponse)
def create_rating(
    *,
    db: Session = Depends(get_db),
    rating_in: RatingCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create a new rating for an order.
    Only the customer (manufacturer dashboard user) who placed the order can rate it.
    Order must be in 'shipped' or 'delivered' status.
    One rating per order.
    """
    order = db.query(Order).filter(Order.id == rating_in.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Access control: Must be the customer
    if order.customer_org_id != current_user.org_id:
        raise HTTPException(
            status_code=403, 
            detail="You can only rate orders placed by your organization"
        )

    # Status check
    if order.status not in [OrderStatusEnum.shipped, OrderStatusEnum.delivered]:
         raise HTTPException(
            status_code=400, 
            detail="You can only rate orders that have been shipped or delivered"
        )

    # Duplicate check
    existing = db.query(Rating).filter(Rating.order_id == rating_in.order_id).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="This order has already been rated"
        )

    db_rating = Rating(
        order_id=rating_in.order_id,
        rating=rating_in.rating,
        comment=rating_in.comment
    )
    db.add(db_rating)
    db.commit()
    db.refresh(db_rating)
    return db_rating

@router.get("/vendor", response_model=List[RatingWithOrder])
def get_vendor_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all ratings for the logged-in vendor.
    """
    # Join Rating -> Order -> Org
    ratings = (
        db.query(Rating, Order, Organization)
        .join(Order, Rating.order_id == Order.id)
        .join(Organization, Order.customer_org_id == Organization.id)
        .filter(Order.manufacturer_org_id == current_user.org_id)
        .all()
    )
    
    result = []
    for r, o, m in ratings:
        result.append({
            "id": r.id,
            "order_id": r.order_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "order_number": o.order_number,
            "customer_name": m.name
        })
    return result

@router.get("/manufacturer", response_model=List[RatingWithOrder])
def get_manufacturer_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all ratings submitted by the logged-in manufacturer.
    """
    ratings = (
        db.query(Rating, Order, Organization)
        .join(Order, Rating.order_id == Order.id)
        .join(Organization, Order.manufacturer_org_id == Organization.id)
        .filter(Order.customer_org_id == current_user.org_id)
        .all()
    )
    
    result = []
    for r, o, m in ratings:
        result.append({
            "id": r.id,
            "order_id": r.order_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "order_number": o.order_number,
            "manufacturer_name": m.name
        })
    return result
