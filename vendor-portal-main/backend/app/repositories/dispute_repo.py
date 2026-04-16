from typing import List
from sqlalchemy.orm import Session
from app.models.vendor_portal import Dispute, Refund
from app.repositories.base import BaseRepository


class DisputeRepository(BaseRepository[Dispute]):
    def __init__(self, db: Session):
        super().__init__(Dispute, db)

    def get_by_order(self, order_id: int) -> List[Dispute]:
        return (
            self.db.query(Dispute)
            .filter(Dispute.order_id == order_id, Dispute.deleted_at.is_(None))
            .all()
        )

    def get_by_org(self, org_id: int, as_customer: bool = True) -> List[Dispute]:
        if as_customer:
            return (
                self.db.query(Dispute)
                .filter(
                    Dispute.customer_org_id == org_id,
                    Dispute.deleted_at.is_(None),
                )
                .all()
            )
        return (
            self.db.query(Dispute)
            .filter(
                Dispute.manufacturer_org_id == org_id,
                Dispute.deleted_at.is_(None),
            )
            .all()
        )

    def get_by_rma(self, rma_number: str):
        return (
            self.db.query(Dispute)
            .filter(Dispute.rma_number == rma_number)
            .first()
        )


class RefundRepository(BaseRepository[Refund]):
    def __init__(self, db: Session):
        super().__init__(Refund, db)

    def get_by_invoice(self, invoice_id: int) -> List[Refund]:
        return (
            self.db.query(Refund).filter(Refund.invoice_id == invoice_id).all()
        )
