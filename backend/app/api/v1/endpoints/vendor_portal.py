"""Vendor portal specific endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.vendor_portal import (
    RFQCreate, RFQUpdate, RFQResponse,
    QuoteCreate, QuoteResponse, QuoteSelectResponse,
    DisputeCreate, DisputeUpdate, DisputeResponse,
    RefundCreate, RefundResponse
)
from app.schemas.common import APIResponse, success_response
from app.services.rfq_service import RFQService
from app.services.dispute_service import DisputeService


router = APIRouter(prefix="/vendor", tags=["Vendor Portal"])

# --- RFQ Routes ---
@router.post("/rfq", response_model=APIResponse)
def create_rfq(data: RFQCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = RFQService(db)
    rfq = svc.create_rfq(data, current_user.org_id)
    return success_response("RFQ created.", RFQResponse.model_validate(rfq))

@router.get("/rfq", response_model=APIResponse)
def list_rfq(org_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = RFQService(db)
    target_org = org_id if org_id else current_user.org_id
    rfqs = svc.list_by_org(target_org)
    return success_response("RFQs retrieved.", [RFQResponse.model_validate(r) for r in rfqs])

@router.put("/rfq/{rfq_id}", response_model=APIResponse)
def update_rfq(rfq_id: int, data: RFQUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = RFQService(db)
    rfq = svc.update_rfq(rfq_id, data)
    return success_response("RFQ updated.", RFQResponse.model_validate(rfq))

@router.post("/rfq/quote", response_model=APIResponse)
def submit_quote(data: QuoteCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Vendor (manufacturer org) submits a quote PDF/price in response to an RFQ."""
    svc = RFQService(db)
    quote = svc.submit_quote(data, current_user.org_id)
    return success_response("Quote submitted.", QuoteResponse.model_validate(quote))

@router.get("/rfq/{rfq_id}/quotes", response_model=APIResponse)
def list_quotes(rfq_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List all quotes for an RFQ."""
    svc = RFQService(db)
    quotes = svc.list_quotes_for_rfq(rfq_id)
    return success_response("Quotes retrieved.", [QuoteResponse.model_validate(q) for q in quotes])

@router.post("/rfq/{rfq_id}/select-quote/{quote_id}", response_model=APIResponse)
def select_quote(
    rfq_id: int,
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Manufacturer selects one quote from an RFQ.
    This locks the chosen quote (status=accepted), rejects all others,
    and closes the RFQ. After this, the manufacturer can create an order
    referencing this quotation_id.
    """
    svc = RFQService(db)
    quote = svc.select_quote(rfq_id, quote_id, current_user.org_id)
    return success_response(
        "Quote selected. You can now create an order with this quotation.",
        QuoteSelectResponse(quote_id=quote.id, rfq_id=rfq_id)
    )

# --- Dispute Routes ---
@router.post("/disputes", response_model=APIResponse)
def create_dispute(data: DisputeCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = DisputeService(db)
    dispute = svc.create_dispute(data, current_user.org_id, current_user.id)
    return success_response("Dispute created.", DisputeResponse.model_validate(dispute))

@router.get("/disputes", response_model=APIResponse)
def list_disputes(org_id: int = None, as_customer: bool = True, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = DisputeService(db)
    target_org = org_id if org_id else current_user.org_id
    disputes = svc.list_by_org(target_org, as_customer)
    return success_response("Disputes retrieved.", [DisputeResponse.model_validate(d) for d in disputes])

@router.put("/disputes/{dispute_id}", response_model=APIResponse)
def update_dispute(dispute_id: int, data: DisputeUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = DisputeService(db)
    dispute = svc.update_dispute(dispute_id, data)
    return success_response("Dispute updated.", DisputeResponse.model_validate(dispute))

@router.post("/refunds", response_model=APIResponse)
def create_refund(data: RefundCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = DisputeService(db)
    refund = svc.create_refund(data)
    return success_response("Refund created.", RefundResponse.model_validate(refund))
