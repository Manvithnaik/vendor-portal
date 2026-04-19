from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.analytics_service import AnalyticsService
from typing import Optional

from app.schemas.common import success_response

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/manufacturer/{org_id}/overview")
def get_manufacturer_overview(
    org_id: int, 
    range: str = Query("30d"), 
    from_date: Optional[str] = None, 
    to_date: Optional[str] = None,
    limit: int = 10, offset: int = 0,
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    if user.org_id != org_id and user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access these analytics.")
    
    svc = AnalyticsService(db)
    payload = svc.get_manufacturer_overview(org_id, range, from_date, to_date)
    return success_response("Analytics retrieved.", payload)

@router.get("/vendor/{org_id}/overview")
def get_vendor_overview(
    org_id: int, 
    range: str = Query("30d"), 
    from_date: Optional[str] = None, 
    to_date: Optional[str] = None,
    limit: int = 10, offset: int = 0,
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    if user.org_id != org_id and user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access these analytics.")
        
    svc = AnalyticsService(db)
    payload = svc.get_vendor_overview(org_id, range, from_date, to_date)
    return success_response("Analytics retrieved.", payload)
