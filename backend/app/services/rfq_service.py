"""RFQ and Quotation service."""
import uuid
from sqlalchemy.orm import Session
from app.models.vendor_portal import RFQ, RFQBroadcast, Quote
from app.models.organization import Organization
from app.models.enums import RfqStatusEnum, QuoteStatusEnum, OrgTypeEnum
from app.repositories.rfq_repo import RFQRepository, QuoteRepository
from app.schemas.vendor_portal import RFQCreate, RFQUpdate, QuoteCreate
from app.exceptions import NotFoundException, BusinessRuleException, ForbiddenException


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
        # Guard: only customer orgs (frontend 'manufacturer' portal) issue RFQs.
        # Manufacturer orgs in DB (frontend 'vendor' portal) respond with quotes.
        org = self.db.query(Organization).filter(Organization.id == org_id).first()
        if org and org.org_type != OrgTypeEnum.customer:
            raise ForbiddenException(
                "Only buyer organisations (manufacturer portal) can create RFQs. "
                "Vendors respond to RFQs by submitting quotes."
            )

        rfq = RFQ(
            org_id=org_id,
            title=data.title,
            description=data.description,
            category_id=data.category_id,
            location_filter=data.location_filter,
            min_vendor_rating=data.min_vendor_rating,
            deadline=data.deadline,
            is_priority=data.is_priority,
            status=RfqStatusEnum.active,  # RFQs go straight to active when created
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

        if rfq.status not in (RfqStatusEnum.active, RfqStatusEnum.extended):
            raise BusinessRuleException(
                f"Cannot submit a quote for an RFQ with status '{rfq.status.value}'. "
                "Only active or extended RFQs accept quotes."
            )

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
            status=QuoteStatusEnum.submitted,
        )
        return self.quote_repo.create(quote)

    def select_quote(self, rfq_id: int, quote_id: int, selecting_org_id: int) -> Quote:
        """
        Manufacturer selects one quote from an RFQ.
        - Marks chosen quote as 'accepted'
        - Marks all other quotes on the same RFQ as 'rejected'
        - Closes the RFQ
        """
        rfq = self.get_rfq(rfq_id)

        # Ensure the manufacturer owns this RFQ
        if rfq.org_id != selecting_org_id:
            raise BusinessRuleException("You do not have permission to select a quote for this RFQ.")

        # Get the selected quote
        selected = self.db.query(Quote).filter(
            Quote.id == quote_id,
            Quote.rfq_id == rfq_id,
        ).first()
        if not selected:
            raise NotFoundException("Quote")

        if selected.status == QuoteStatusEnum.rejected:
            raise BusinessRuleException("This quote has already been rejected and cannot be selected.")

        # Reject all other quotes for this RFQ
        other_quotes = self.db.query(Quote).filter(
            Quote.rfq_id == rfq_id,
            Quote.id != quote_id,
        ).all()
        for q in other_quotes:
            q.status = QuoteStatusEnum.rejected
            self.db.add(q)

        # Accept the selected quote
        selected.status = QuoteStatusEnum.accepted
        selected.is_locked = True
        self.db.add(selected)

        # Close the RFQ
        rfq.status = RfqStatusEnum.closed
        self.db.add(rfq)

        self.db.commit()
        self.db.refresh(selected)
        return selected

    def list_quotes_for_rfq(self, rfq_id: int):
        return self.quote_repo.get_by_rfq(rfq_id)
