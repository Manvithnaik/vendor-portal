"""Dispute and Refund service."""
import uuid
from sqlalchemy.orm import Session
from app.models.vendor_portal import Dispute, Refund
from app.repositories.dispute_repo import DisputeRepository, RefundRepository
from app.repositories.order_repo import OrderRepository
from app.schemas.vendor_portal import DisputeCreate, DisputeUpdate, RefundCreate
from app.exceptions import NotFoundException, ConflictException


class DisputeService:
    def __init__(self, db: Session):
        self.db = db
        self.dispute_repo = DisputeRepository(db)
        self.refund_repo = RefundRepository(db)
        self.order_repo = OrderRepository(db)

    def get_dispute(self, dispute_id: int) -> Dispute:
        d = self.dispute_repo.get(dispute_id)
        if not d:
            raise NotFoundException("Dispute")
        return d

    def list_by_org(self, org_id: int, as_customer: bool = True):
        return self.dispute_repo.get_by_org(org_id, as_customer)

    def create_dispute(
        self, data: DisputeCreate, customer_org_id: int, raised_by: int
    ) -> Dispute:
        order = self.order_repo.get(data.order_id)
        if not order:
            raise NotFoundException("Order")

        rma_number = f"RMA-{uuid.uuid4().hex[:6].upper()}"
        dispute = Dispute(
            order_id=data.order_id,
            customer_org_id=customer_org_id,
            manufacturer_org_id=order.manufacturer_org_id,
            rma_number=rma_number,
            dispute_type=data.dispute_type,
            category=data.category,
            description=data.description,
            is_partial=data.is_partial,
            raised_by=raised_by,
        )
        return self.dispute_repo.create(dispute)

    def update_dispute(self, dispute_id: int, data: DisputeUpdate) -> Dispute:
        dispute = self.get_dispute(dispute_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(dispute, k, v)
        return self.dispute_repo.update(dispute)

    def create_refund(self, data: RefundCreate) -> Refund:
        refund = Refund(**data.model_dump())
        return self.refund_repo.create(refund)

    def list_refunds_by_invoice(self, invoice_id: int):
        return self.refund_repo.get_by_invoice(invoice_id)
