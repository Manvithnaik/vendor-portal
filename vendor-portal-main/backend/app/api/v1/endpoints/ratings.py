from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.common import APIResponse, success_response
from app.schemas.rating import RatingCreate, RatingResponse
from app.services.rating_service import RatingService

router = APIRouter(prefix="/ratings", tags=["Ratings"])

@router.post("", response_model=APIResponse)
def submit_rating(
    data: RatingCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    svc = RatingService(db)
    # The current user's org_id is the manufacturer_id for the rating
    result = svc.submit_rating(current_user.org_id, data)
    return success_response("Rating submitted successfully.", RatingResponse.model_validate(result))

@router.get("/vendor", response_model=APIResponse)
def get_vendor_ratings(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    svc = RatingService(db)
    result = svc.get_vendor_ratings(current_user.org_id)
    return success_response("Vendor ratings retrieved.", [RatingResponse.model_validate(r) for r in result])
