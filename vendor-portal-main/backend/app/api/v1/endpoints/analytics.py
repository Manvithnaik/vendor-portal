from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.analytics_service import AnalyticsService
from typing import Optional

from app.schemas.common import success_response

router = APIRouter()

@router.get("/manufacturer/{org_id}/overview")
def get_manufacturer_overview(
    org_id: int, 
    date_range: str = Query("30d"), 
    from_date: Optional[str] = None, 
    to_date: Optional[str] = None,
    limit: int = 10, offset: int = 0,
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    if user.org_id != org_id and not (user.role and user.role.name.lower() == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to access these analytics.")
    
    svc = AnalyticsService(db)
    payload = svc.get_manufacturer_overview(org_id, date_range, from_date, to_date)
    return success_response("Analytics retrieved.", payload)

@router.get("/vendor/{org_id}/overview")
def get_vendor_overview(
    org_id: int, 
    date_range: str = Query("30d"), 
    from_date: Optional[str] = None, 
    to_date: Optional[str] = None,
    limit: int = 10, offset: int = 0,
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    if user.org_id != org_id and not (user.role and user.role.name.lower() == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to access these analytics.")
        
    svc = AnalyticsService(db)
    payload = svc.get_vendor_overview(org_id, date_range, from_date, to_date)
    return success_response("Analytics retrieved.", payload)
