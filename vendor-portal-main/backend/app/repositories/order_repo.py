from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.enums import OrderStatusEnum
from app.repositories.base import BaseRepository


class OrderRepository(BaseRepository[Order]):
    def __init__(self, db: Session):
        super().__init__(Order, db)

    def get_by_org(
        self,
        org_id: int,
        as_customer: bool = True,
        status: Optional[OrderStatusEnum] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Order]:
        if as_customer:
            q = self.db.query(Order).filter(Order.customer_org_id == org_id)
        else:
            q = self.db.query(Order).filter(Order.manufacturer_org_id == org_id)
        if status:
            q = q.filter(Order.status == status)
        
        q = q.options(joinedload(Order.items).joinedload(OrderItem.product))
        
        return q.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    def get_by_number(self, order_number: str) -> Optional[Order]:
        return self.db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.product)).filter(Order.order_number == order_number).first()

    def get_by_contract(self, contract_id: int) -> List[Order]:
        return self.db.query(Order).filter(Order.contract_id == contract_id).all()


class OrderStatusHistoryRepository(BaseRepository[OrderStatusHistory]):
    def __init__(self, db: Session):
        super().__init__(OrderStatusHistory, db)

    def get_by_order(self, order_id: int) -> List[OrderStatusHistory]:
        return (
            self.db.query(OrderStatusHistory)
            .filter(OrderStatusHistory.order_id == order_id)
            .order_by(OrderStatusHistory.changed_at.desc())
            .all()
        )
