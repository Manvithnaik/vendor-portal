from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.support import SupportTicket, TicketMessage
from app.repositories.base import BaseRepository


class SupportTicketRepository(BaseRepository[SupportTicket]):
    def __init__(self, db: Session):
        super().__init__(SupportTicket, db)

    def get_by_org(self, org_id: int) -> List[SupportTicket]:
        return (
            self.db.query(SupportTicket)
            .filter(SupportTicket.raised_by_org_id == org_id)
            .order_by(SupportTicket.created_at.desc())
            .all()
        )

    def get_by_number(self, ticket_number: str) -> Optional[SupportTicket]:
        return (
            self.db.query(SupportTicket)
            .filter(SupportTicket.ticket_number == ticket_number)
            .first()
        )


class TicketMessageRepository(BaseRepository[TicketMessage]):
    def __init__(self, db: Session):
        super().__init__(TicketMessage, db)

    def get_by_ticket(self, ticket_id: int, include_internal: bool = False) -> List[TicketMessage]:
        q = self.db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id)
        if not include_internal:
            q = q.filter(TicketMessage.is_internal_note == False)  # noqa: E712
        return q.order_by(TicketMessage.created_at.asc()).all()
