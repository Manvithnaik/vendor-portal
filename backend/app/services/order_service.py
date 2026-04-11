"""
Order service — creation with contract validation, status transition logic,
and order number generation.
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.enums import OrderStatusEnum
from app.repositories.order_repo import OrderRepository, OrderStatusHistoryRepository
from app.repositories.contract_repo import ContractRepository
from app.repositories.product_repo import ContractProductPricingRepository
from app.schemas.order import OrderCreate, OrderStatusUpdate
from app.utils.mappers import map_order_status_to_db
from app.exceptions import (
    NotFoundException, BusinessRuleException, ValidationException,
    DatabaseException,
)

# Valid status transition graph
VALID_TRANSITIONS: dict[OrderStatusEnum, list[OrderStatusEnum]] = {
    OrderStatusEnum.draft:          [OrderStatusEnum.submitted, OrderStatusEnum.cancelled],
    OrderStatusEnum.submitted:      [OrderStatusEnum.confirmed, OrderStatusEnum.cancelled],
    OrderStatusEnum.confirmed:      [OrderStatusEnum.processing, OrderStatusEnum.cancelled],
    OrderStatusEnum.processing:     [OrderStatusEnum.ready_to_ship, OrderStatusEnum.cancelled],
    OrderStatusEnum.ready_to_ship:  [OrderStatusEnum.shipped],
    OrderStatusEnum.shipped:        [OrderStatusEnum.delivered, OrderStatusEnum.disputed],
    OrderStatusEnum.delivered:      [OrderStatusEnum.disputed],
    OrderStatusEnum.cancelled:      [],
    OrderStatusEnum.disputed:       [OrderStatusEnum.resolved] if hasattr(OrderStatusEnum, 'resolved') else [],
}


class OrderService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrderRepository(db)
        self.history_repo = OrderStatusHistoryRepository(db)
        self.contract_repo = ContractRepository(db)
        self.pricing_repo = ContractProductPricingRepository(db)

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------
    def create(self, data: OrderCreate, current_user_id: int, customer_org_id: int) -> Order:
        # Business rule: active contract must exist
        contract = self.contract_repo.get(data.contract_id)
        if not contract:
            raise NotFoundException("Contract")
        from app.models.enums import ContractStatusEnum
        if contract.status != ContractStatusEnum.active:
            raise BusinessRuleException(
                "Orders can only be placed against an active contract."
            )
        if contract.customer_org_id != customer_org_id:
            raise BusinessRuleException("This contract does not belong to your organization.")

        # Build order number
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"

        try:
            order = Order(
                order_number=order_number,
                customer_org_id=customer_org_id,
                manufacturer_org_id=data.manufacturer_org_id,
                contract_id=data.contract_id,
                created_by=current_user_id,
                status=OrderStatusEnum.draft,
                priority=data.priority,
                currency=data.currency,
                delivery_address=data.delivery_address,
                required_by_date=data.required_by_date,
                special_instructions=data.special_instructions,
                notes=data.notes,
            )
            self.db.add(order)
            self.db.flush()

            total = 0.0
            for item_data in data.items:
                pricing = self.pricing_repo.get_active_pricing(
                    data.contract_id, item_data.product_id
                )
                if not pricing:
                    raise BusinessRuleException(
                        f"No active contract pricing found for product {item_data.product_id}."
                    )
                unit_price = float(pricing.agreed_unit_price)
                total += unit_price * item_data.quantity

                item = OrderItem(
                    order_id=order.id,
                    product_id=item_data.product_id,
                    contract_pricing_id=pricing.id,
                    quantity=item_data.quantity,
                    unit=item_data.unit,
                    unit_price=unit_price,
                    notes=item_data.notes,
                )
                self.db.add(item)

            order.total_amount = round(total, 2)

            # Record initial history
            self.db.add(OrderStatusHistory(
                order_id=order.id,
                changed_by=current_user_id,
                previous_status=None,
                new_status=OrderStatusEnum.draft.value,
                note="Order created",
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
