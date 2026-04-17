from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.financial import Invoice, Payment, PaymentProfile
from app.models.enums import InvoiceStatusEnum
from app.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    def __init__(self, db: Session):
        super().__init__(Invoice, db)

    def get_by_order(self, order_id: int) -> List[Invoice]:
        return self.db.query(Invoice).filter(Invoice.order_id == order_id).all()

    def get_by_org(self, org_id: int, as_billed_to: bool = True) -> List[Invoice]:
        if as_billed_to:
            return self.db.query(Invoice).filter(Invoice.billed_to_org_id == org_id).all()
        return self.db.query(Invoice).filter(Invoice.issued_by_org_id == org_id).all()

    def get_by_number(self, invoice_number: str) -> Optional[Invoice]:
        return self.db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: Session):
        super().__init__(Payment, db)

    def get_by_invoice(self, invoice_id: int) -> List[Payment]:
        return self.db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
