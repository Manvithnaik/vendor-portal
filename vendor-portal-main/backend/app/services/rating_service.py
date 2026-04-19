from sqlalchemy.orm import Session
from app.models.rating import Rating
from app.models.order import Order
from app.models.enums import OrderStatusEnum
from app.schemas.rating import RatingCreate
from app.exceptions import ValidationException, ConflictException, NotFoundException
from app.repositories.rating_repo import RatingRepository

class RatingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RatingRepository(db)

    def submit_rating(self, manufacturer_id: int, data: RatingCreate):
        # 1. Check if order exists and belongs to this manufacturer
        order = self.db.query(Order).filter(
            Order.id == data.order_id,
            Order.customer_org_id == manufacturer_id
        ).first()

        if not order:
            raise NotFoundException("Order not found or does not belong to you.")

        # 2. Check if order is shipped
        if order.status != OrderStatusEnum.shipped:
            raise ValidationException("Ratings can only be submitted for shipped orders.")

        # 3. Check if rating already exists for this order
        existing = self.repo.get_by_order(data.order_id)
        if existing:
            raise ConflictException("You have already submitted a rating for this order.")

        # 4. Create rating
        rating = Rating(
            order_id=data.order_id,
            manufacturer_id=manufacturer_id,
            vendor_id=order.manufacturer_org_id, # In the models, vendor is manufacturer_org_id and manufacturer is customer_org_id
            rating=data.rating,
            review=data.review
        )
        return self.repo.create(rating)

    def get_vendor_ratings(self, vendor_id: int):
        return self.repo.get_by_vendor(vendor_id)
