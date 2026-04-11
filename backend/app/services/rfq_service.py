"""RFQ and Quotation service."""
import uuid
from sqlalchemy.orm import Session
from app.models.vendor_portal import RFQ, RFQBroadcast, Quote
from app.repositories.rfq_repo import RFQRepository, QuoteRepository
from app.schemas.vendor_portal import RFQCreate, RFQUpdate, QuoteCreate
from app.exceptions import NotFoundException, ConflictException


class RFQService:
    def __init__(self, db: Session):
        self.db = db
        self.rfq_repo = RFQRepository(db)
        self.quote_repo = QuoteRepository(db)

    def get_rfq(self, rfq_id: int) -> RFQ:
        rfq = self.rfq_repo.get(rfq_id)
        if not rfq:
            raise NotFoundException("RFQ")
        return rfq

    def list_by_org(self, org_id: int):
        return self.rfq_repo.get_by_org(org_id)

    def list_broadcasts_for_manufacturer(self, manufacturer_org_id: int):
        return self.rfq_repo.get_broadcasts_for_manufacturer(manufacturer_org_id)

    def create_rfq(self, data: RFQCreate, org_id: int) -> RFQ:
        rfq = RFQ(
            org_id=org_id,
            title=data.title,
            description=data.description,
            category_id=data.category_id,
            location_filter=data.location_filter,
            min_vendor_rating=data.min_vendor_rating,
            deadline=data.deadline,
            is_priority=data.is_priority,
        )
        self.db.add(rfq)
        self.db.flush()

        # Broadcast to target manufacturer orgs
        for mfg_org_id in data.broadcast_to_org_ids:
            self.db.add(RFQBroadcast(rfq_id=rfq.id, manufacturer_org_id=mfg_org_id))

        self.db.commit()
        self.db.refresh(rfq)
        return rfq

    def update_rfq(self, rfq_id: int, data: RFQUpdate) -> RFQ:
        rfq = self.get_rfq(rfq_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(rfq, k, v)
        return self.rfq_repo.update(rfq)

    def submit_quote(self, data: QuoteCreate, manufacturer_org_id: int) -> Quote:
        rfq = self.get_rfq(data.rfq_id)

        # Mark broadcast as responded
        broadcast = self.db.query(RFQBroadcast).filter(
            RFQBroadcast.rfq_id == data.rfq_id,
            RFQBroadcast.manufacturer_org_id == manufacturer_org_id,
        ).first()
        if broadcast:
            broadcast.responded = True
            broadcast.viewed = True

        quote = Quote(
            rfq_id=data.rfq_id,
            manufacturer_org_id=manufacturer_org_id,
            price=data.price,
            lead_time_days=data.lead_time_days,
            compliance_notes=data.compliance_notes,
        )
        return self.quote_repo.create(quote)

    def list_quotes_for_rfq(self, rfq_id: int):
        return self.quote_repo.get_by_rfq(rfq_id)
