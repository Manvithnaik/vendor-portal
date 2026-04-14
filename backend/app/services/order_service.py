"""
Order service — creation enforces Quote → PO → Order sequence.

New workflow:
  1. Manufacturer selects an accepted Quote (quotation_id required)
  2. Manufacturer uploads PO document (po_document_url required)
  3. Order is created with status = vendor_review
  4. Vendor calls vendor_respond() to accept or reject
  5. If accepted → status moves to processing
  6. If rejected → status moves to rejected with a reason
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.vendor_portal import Quote
from app.models.enums import OrderStatusEnum, QuoteStatusEnum
from app.repositories.order_repo import OrderRepository, OrderStatusHistoryRepository
from app.repositories.rfq_repo import QuoteRepository
from app.schemas.order import OrderCreate, OrderStatusUpdate, VendorOrderResponse
from app.utils.mappers import map_order_status_to_db
from app.exceptions import (
    NotFoundException, BusinessRuleException, ValidationException,
    DatabaseException,
)

# ---------------------------------------------------------------------------
# Valid status transition graph (enforces the new workflow)
# ---------------------------------------------------------------------------
VALID_TRANSITIONS: dict[OrderStatusEnum, list[OrderStatusEnum]] = {
    OrderStatusEnum.draft:          [OrderStatusEnum.submitted, OrderStatusEnum.cancelled],
    OrderStatusEnum.submitted:      [OrderStatusEnum.vendor_review, OrderStatusEnum.cancelled],
    OrderStatusEnum.vendor_review:  [OrderStatusEnum.accepted, OrderStatusEnum.rejected],
    OrderStatusEnum.accepted:       [OrderStatusEnum.processing],
    OrderStatusEnum.rejected:       [],   # terminal
    OrderStatusEnum.confirmed:      [OrderStatusEnum.processing, OrderStatusEnum.cancelled],  # legacy compat
    OrderStatusEnum.processing:     [OrderStatusEnum.ready_to_ship, OrderStatusEnum.cancelled],
    OrderStatusEnum.ready_to_ship:  [OrderStatusEnum.shipped],
    OrderStatusEnum.shipped:        [OrderStatusEnum.delivered, OrderStatusEnum.disputed],
    OrderStatusEnum.delivered:      [OrderStatusEnum.disputed],
    OrderStatusEnum.cancelled:      [],
    OrderStatusEnum.disputed:       [],
}


class OrderService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrderRepository(db)
        self.history_repo = OrderStatusHistoryRepository(db)
        self.quote_repo = QuoteRepository(db)

    # ------------------------------------------------------------------
    # Creation — ENFORCES: quotation_id + po_document_url required
    # ------------------------------------------------------------------
    def create(self, data: OrderCreate, current_user_id: int, customer_org_id: int) -> Order:
        # Rule 1: quotation must exist and belong to a real RFQ
        quote = self.db.query(Quote).filter(Quote.id == data.quotation_id).first()
        if not quote:
            raise NotFoundException("Quotation")

        # Rule 2: quote must be in 'submitted' or 'accepted' status (not rejected)
        if quote.status == QuoteStatusEnum.rejected:
            raise BusinessRuleException(
                "Cannot create an order from a rejected quotation. "
                "Please select a valid quotation first."
            )

        # Rule 3: po_document_url must be provided
        if not data.po_document_url or not data.po_document_url.strip():
            raise BusinessRuleException(
                "A Purchase Order (PO) document URL is required to create an order."
            )

        # Rule 4: delivery_address must be provided
        if not data.delivery_address or not data.delivery_address.strip():
            raise BusinessRuleException("Delivery address is required.")

        # Auto-mark quote as accepted
        quote.status = QuoteStatusEnum.accepted
        quote.is_locked = True
        self.db.add(quote)

        # Build order number
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"

        try:
            order = Order(
                order_number=order_number,
                customer_org_id=customer_org_id,
                manufacturer_org_id=data.manufacturer_org_id,
                contract_id=data.contract_id,          # Optional
                quotation_id=data.quotation_id,        # NEW
                po_document_url=data.po_document_url,  # NEW
                created_by=current_user_id,
                status=OrderStatusEnum.vendor_review,  # goes straight to vendor review
                priority=data.priority,
                currency=data.currency,
                delivery_address=data.delivery_address,
                required_by_date=data.required_by_date,
                special_instructions=data.special_instructions,
                notes=data.notes,
            )
            self.db.add(order)
            self.db.flush()

            # Seed total from accepted quote price; item unit prices updated later
            total = float(quote.price) if quote.price else 0.0
            for item_data in data.items:
                item = OrderItem(
                    order_id=order.id,
                    product_id=item_data.product_id,
                    contract_pricing_id=item_data.contract_pricing_id,
                    quantity=item_data.quantity,
                    unit=item_data.unit,
                    unit_price=0.00,
                    notes=item_data.notes,
                )
                self.db.add(item)

            order.total_amount = round(total, 2)

            # Record initial history
            self.db.add(OrderStatusHistory(
                order_id=order.id,
                changed_by=current_user_id,
                previous_status=None,
                new_status=OrderStatusEnum.vendor_review.value,
                note="Order created from quotation. Awaiting vendor review.",
            ))

            self.db.commit()
            self.db.refresh(order)
        except BusinessRuleException:
            self.db.rollback()
            raise
        except Exception as exc:
            self.db.rollback()
            raise DatabaseException(details={"error": str(exc)})

        return order

    # ------------------------------------------------------------------
    # Vendor responds to PO (accept / reject)  — NEW
    # ------------------------------------------------------------------
    def vendor_respond(
        self, order_id: int, data: VendorOrderResponse, vendor_user_id: int
    ) -> Order:
        order = self.repo.get(order_id)
        if not order:
            raise NotFoundException("Order")

        if order.status != OrderStatusEnum.vendor_review:
            raise BusinessRuleException(
                f"Order is in '{order.status.value}' status and cannot be responded to. "
                "Only orders in 'vendor_review' status can be accepted or rejected."
            )

        if data.action == "reject" and not (data.reason and data.reason.strip()):
            raise BusinessRuleException("A rejection reason is required when rejecting a PO.")

        previous = order.status
        if data.action == "accept":
            order.status = OrderStatusEnum.accepted
            note = "Vendor accepted the PO."
        else:
            order.status = OrderStatusEnum.rejected
            order.vendor_response_reason = data.reason
            note = f"Vendor rejected the PO. Reason: {data.reason}"

        order.updated_at = datetime.utcnow()

        self.db.add(OrderStatusHistory(
            order_id=order.id,
            changed_by=vendor_user_id,
            previous_status=previous.value,
            new_status=order.status.value,
            note=note,
        ))

        self.db.commit()
        self.db.refresh(order)
        return order

    # ------------------------------------------------------------------
    # Status update (with transition validation)
    # ------------------------------------------------------------------
    def update_status(
        self, order_id: int, data: OrderStatusUpdate, current_user_id: int
    ) -> Order:
        order = self.repo.get(order_id)
        if not order:
            raise NotFoundException("Order")

        new_db_status = map_order_status_to_db(data.status)
        if new_db_status is None:
            raise ValidationException(f"Unknown order status: '{data.status}'")

        allowed = VALID_TRANSITIONS.get(order.status, [])
        if new_db_status not in allowed:
            raise BusinessRuleException(
                f"Cannot transition order from '{order.status.value}' to '{new_db_status.value}'."
            )

        previous = order.status
        order.status = new_db_status
        order.updated_at = datetime.utcnow()

        self.db.add(OrderStatusHistory(
            order_id=order.id,
            changed_by=current_user_id,
            previous_status=previous.value,
            new_status=new_db_status.value,
            note=data.note,
        ))

        self.db.commit()
        self.db.refresh(order)
        return order

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------
    def get_by_id(self, order_id: int) -> Order:
        order = self.repo.get(order_id)
        if not order:
            raise NotFoundException("Order")
        return order

    def list_by_org(
        self,
        org_id: int,
        as_customer: bool = True,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ):
        db_status = None
        if status:
            db_status = map_order_status_to_db(status)
        return self.repo.get_by_org(org_id, as_customer, db_status, skip, limit)

    def get_status_history(self, order_id: int):
        return self.history_repo.get_by_order(order_id)
