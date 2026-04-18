from app.repositories.base import BaseRepository
from app.models.rating import Rating

class RatingRepository(BaseRepository[Rating]):
    def __init__(self, db):
        super().__init__(Rating, db)

    def get_by_order(self, order_id: int):
        return self.db.query(Rating).filter(Rating.order_id == order_id).first()

    def get_by_vendor(self, vendor_id: int):
        return self.db.query(Rating).filter(Rating.vendor_id == vendor_id).all()
