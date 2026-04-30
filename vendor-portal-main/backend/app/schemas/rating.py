from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class RatingCreate(BaseModel):
    order_id: int
    rating: float = Field(..., ge=1, le=5)
    review: Optional[str] = None

class RatingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    manufacturer_id: int
    vendor_id: int
    rating: float
    review: Optional[str]
    created_at: datetime
