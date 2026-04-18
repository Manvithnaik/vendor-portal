from datetime import datetime
from typing import Optional
from pydantic import BaseModel, conint

class RatingBase(BaseModel):
    order_id: int
    rating: conint(ge=1, le=5)
    comment: Optional[str] = None

class RatingCreate(RatingBase):
    pass

class RatingResponse(RatingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RatingWithOrder(RatingResponse):
    order_number: str
    product_name: Optional[str] = None
    manufacturer_name: Optional[str] = None # The seller
    customer_name: Optional[str] = None     # The buyer
