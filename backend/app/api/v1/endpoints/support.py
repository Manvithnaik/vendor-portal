"""Support endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.support import SupportTicketCreate, SupportTicketUpdate, SupportTicketResponse, TicketMessageCreate, TicketMessageResponse
from app.schemas.common import APIResponse, success_response
from app.services.support_service import SupportService

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/tickets", response_model=APIResponse)
def create_ticket(data: SupportTicketCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = SupportService(db)
    ticket = svc.create_ticket(data, current_user.id, current_user.org_id)
    return success_response("Ticket created.", SupportTicketResponse.model_validate(ticket))


@router.get("/tickets", response_model=APIResponse)
def list_tickets(org_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = SupportService(db)
    target_org = org_id if org_id else current_user.org_id
    tickets = svc.list_by_org(target_org)
    return success_response("Tickets retrieved.", [SupportTicketResponse.model_validate(t) for t in tickets])


@router.get("/tickets/{ticket_id}", response_model=APIResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = SupportService(db)
    ticket = svc.get_ticket(ticket_id)
    return success_response("Ticket retrieved.", SupportTicketResponse.model_validate(ticket))


@router.put("/tickets/{ticket_id}", response_model=APIResponse)
def update_ticket(ticket_id: int, data: SupportTicketUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = SupportService(db)
    ticket = svc.update_ticket(ticket_id, data, current_user.id)
    return success_response("Ticket updated.", SupportTicketResponse.model_validate(ticket))


@router.post("/tickets/{ticket_id}/messages", response_model=APIResponse)
def add_message(ticket_id: int, data: TicketMessageCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = SupportService(db)
    msg = svc.add_message(ticket_id, data, current_user.id)
    return success_response("Message added.", TicketMessageResponse.model_validate(msg))


@router.get("/tickets/{ticket_id}/messages", response_model=APIResponse)
def get_messages(ticket_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    # Assuming standard users do not see internal notes
    svc = SupportService(db)
    msgs = svc.get_messages(ticket_id, include_internal=False)
    return success_response("Messages retrieved.", [TicketMessageResponse.model_validate(m) for m in msgs])
