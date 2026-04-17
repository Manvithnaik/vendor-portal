"""Support ticket service."""
import uuid
from sqlalchemy.orm import Session
from app.models.support import SupportTicket, TicketMessage, TicketStatusHistory
from app.repositories.support_repo import SupportTicketRepository, TicketMessageRepository
from app.schemas.support import SupportTicketCreate, SupportTicketUpdate, TicketMessageCreate
from app.exceptions import NotFoundException


class SupportService:
    def __init__(self, db: Session):
        self.db = db
        self.ticket_repo = SupportTicketRepository(db)
        self.msg_repo = TicketMessageRepository(db)

    def get_ticket(self, ticket_id: int) -> SupportTicket:
        t = self.ticket_repo.get(ticket_id)
        if not t:
            raise NotFoundException("Support ticket")
        return t

    def list_by_org(self, org_id: int):
        return self.ticket_repo.get_by_org(org_id)

    def create_ticket(
        self, data: SupportTicketCreate, raised_by_user_id: int, raised_by_org_id: int
    ) -> SupportTicket:
        ticket_number = f"TKT-{uuid.uuid4().hex[:8].upper()}"
        ticket = SupportTicket(
            ticket_number=ticket_number,
            raised_by_user_id=raised_by_user_id,
            raised_by_org_id=raised_by_org_id,
            **data.model_dump(),
        )
        return self.ticket_repo.create(ticket)

    def update_ticket(self, ticket_id: int, data: SupportTicketUpdate, changed_by: int) -> SupportTicket:
        ticket = self.get_ticket(ticket_id)
        old_status = ticket.status
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(ticket, k, v)
        result = self.ticket_repo.update(ticket)

        if data.status and data.status != old_status:
            self.db.add(TicketStatusHistory(
                ticket_id=ticket_id,
                changed_by=changed_by,
                previous_status=old_status.value if old_status else None,
                new_status=data.status.value,
            ))
            self.db.commit()

        return result

    def add_message(
        self, ticket_id: int, data: TicketMessageCreate, sent_by: int
    ) -> TicketMessage:
        self.get_ticket(ticket_id)
        msg = TicketMessage(
            ticket_id=ticket_id,
            sent_by_user_id=sent_by,
            **data.model_dump(),
        )
        return self.msg_repo.create(msg)

    def get_messages(self, ticket_id: int, include_internal: bool = False):
        return self.msg_repo.get_by_ticket(ticket_id, include_internal)
