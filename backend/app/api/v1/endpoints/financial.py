"""Financial endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.financial import InvoiceCreate, InvoiceUpdate, InvoiceResponse, PaymentCreate, PaymentResponse
from app.schemas.common import APIResponse, success_response
from app.services.financial_service import FinancialService

router = APIRouter(prefix="/finance", tags=["Finance"])


@router.post("/invoices", response_model=APIResponse)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = FinancialService(db)
    invoice = svc.create_invoice(data)
    return success_response("Invoice created.", InvoiceResponse.model_validate(invoice))


@router.get("/invoices", response_model=APIResponse)
def list_invoices(org_id: int = None, as_billed_to: bool = True, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = FinancialService(db)
    target_org = org_id if org_id else current_user.org_id
    invoices = svc.list_invoices_by_org(target_org, as_billed_to)
    return success_response("Invoices retrieved.", [InvoiceResponse.model_validate(i) for i in invoices])


@router.get("/invoices/{invoice_id}", response_model=APIResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = FinancialService(db)
    invoice = svc.get_invoice(invoice_id)
    return success_response("Invoice retrieved.", InvoiceResponse.model_validate(invoice))


@router.put("/invoices/{invoice_id}", response_model=APIResponse)
def update_invoice(invoice_id: int, data: InvoiceUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = FinancialService(db)
    invoice = svc.update_invoice(invoice_id, data)
    return success_response("Invoice updated.", InvoiceResponse.model_validate(invoice))


@router.post("/payments", response_model=APIResponse)
def create_payment(data: PaymentCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = FinancialService(db)
    payment = svc.create_payment(data)
    return success_response("Payment created.", PaymentResponse.model_validate(payment))


@router.get("/invoices/{invoice_id}/payments", response_model=APIResponse)
def list_payments(invoice_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = FinancialService(db)
    payments = svc.list_payments_by_invoice(invoice_id)
    return success_response("Payments retrieved.", [PaymentResponse.model_validate(p) for p in payments])
