from typing import List, Optional
from sqlalchemy import or_, exists
from sqlalchemy.orm import Session, joinedload
from app.models.vendor_portal import RFQ, RFQBroadcast, Quote
from app.repositories.base import BaseRepository


class RFQRepository(BaseRepository[RFQ]):
    def __init__(self, db: Session):
        super().__init__(RFQ, db)

    def get_by_org(self, org_id: int) -> List[RFQ]:
        return (
            self.db.query(RFQ)
            .options(joinedload(RFQ.org))
            .filter(RFQ.org_id == org_id, RFQ.deleted_at.is_(None))
            .order_by(RFQ.created_at.desc())
            .all()
        )

    def get_visible_to_vendor(self, manufacturer_org_id: int) -> List[RFQ]:
        """Returns RFQs that a vendor (manufacturer org) should see:
        1. RFQs specifically broadcast to this org, OR
        2. Open RFQs with no broadcast targeting (broadcast_to_org_ids was [])
        """
        has_any_broadcast = exists().where(RFQBroadcast.rfq_id == RFQ.id)
        targeted_to_me = exists().where(
            RFQBroadcast.rfq_id == RFQ.id,
            RFQBroadcast.manufacturer_org_id == manufacturer_org_id
        )
        return (
            self.db.query(RFQ)
            .options(joinedload(RFQ.org))
            .filter(
                RFQ.deleted_at.is_(None),
                or_(targeted_to_me, ~has_any_broadcast)  # broadcast to me, or open to all
            )
            .order_by(RFQ.created_at.desc())
            .all()
        )

    def get_broadcasts_for_manufacturer(self, manufacturer_org_id: int) -> List[RFQBroadcast]:
        return (
            self.db.query(RFQBroadcast)
            .filter(RFQBroadcast.manufacturer_org_id == manufacturer_org_id)
            .all()
        )


class QuoteRepository(BaseRepository[Quote]):
    def __init__(self, db: Session):
        super().__init__(Quote, db)

    def get_by_rfq(self, rfq_id: int) -> List[Quote]:
        return (
            self.db.query(Quote)
            .options(joinedload(Quote.manufacturer_org))
            .filter(Quote.rfq_id == rfq_id, Quote.deleted_at.is_(None))
            .all()
        )

    def get_by_manufacturer(self, manufacturer_org_id: int) -> List[Quote]:
        return (
            self.db.query(Quote)
            .filter(
                Quote.manufacturer_org_id == manufacturer_org_id,
                Quote.deleted_at.is_(None),
            )
            .all()
        )
