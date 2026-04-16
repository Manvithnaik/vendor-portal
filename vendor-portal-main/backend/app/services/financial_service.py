"""Financial service — invoices and payments."""
import uuid
from sqlalchemy.orm import Session
from app.models.financial import Invoice, Payment
from app.models.enums import PaymentStatusEnum
from app.repositories.financial_repo import InvoiceRepository, PaymentRepository
from app.schemas.financial import InvoiceCreate, InvoiceUpdate, PaymentCreate
from app.exceptions import NotFoundException, BusinessRuleException
from datetime import datetime


class FinancialService:
    def __init__(self, db: Session):
        self.invoice_repo = InvoiceRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.db = db

    def get_invoice(self, invoice_id: int) -> Invoice:
        i = self.invoice_repo.get(invoice_id)
        if not i:
            raise NotFoundException("Invoice")
        return i

    def list_invoices_by_org(self, org_id: int, as_billed_to: bool = True):
        return self.invoice_repo.get_by_org(org_id, as_billed_to)

    def create_invoice(self, data: InvoiceCreate) -> Invoice:
        inv_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
        invoice = Invoice(invoice_number=inv_number, **data.model_dump())
        return self.invoice_repo.create(invoice)

    def update_invoice(self, invoice_id: int, data: InvoiceUpdate) -> Invoice:
        invoice = self.get_invoice(invoice_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(invoice, k, v)
        return self.invoice_repo.update(invoice)

    def create_payment(self, data: PaymentCreate) -> Payment:
        invoice = self.get_invoice(data.invoice_id)
        payment = Payment(
            status=PaymentStatusEnum.pending,
            **data.model_dump(),
        )
        result = self.payment_repo.create(payment)
        return result

    def list_payments_by_invoice(self, invoice_id: int):
        return self.payment_repo.get_by_invoice(invoice_id)
