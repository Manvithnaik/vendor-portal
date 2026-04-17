from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.shipment import Shipment, ShipmentEvent, DeliveryConfirmation
from app.repositories.base import BaseRepository


class ShipmentRepository(BaseRepository[Shipment]):
    def __init__(self, db: Session):
        super().__init__(Shipment, db)

    def get_by_order(self, order_id: int) -> List[Shipment]:
        return self.db.query(Shipment).filter(Shipment.order_id == order_id).all()

    def get_by_number(self, shipment_number: str) -> Optional[Shipment]:
        return (
            self.db.query(Shipment)
            .filter(Shipment.shipment_number == shipment_number)
            .first()
        )

    def get_by_org(self, org_id: int, as_manufacturer: bool = True) -> List[Shipment]:
        if as_manufacturer:
            return (
                self.db.query(Shipment)
                .filter(Shipment.manufacturer_org_id == org_id)
                .all()
            )
        return self.db.query(Shipment).filter(Shipment.customer_org_id == org_id).all()


class ShipmentEventRepository(BaseRepository[ShipmentEvent]):
    def __init__(self, db: Session):
        super().__init__(ShipmentEvent, db)

    def get_by_shipment(self, shipment_id: int) -> List[ShipmentEvent]:
        return (
            self.db.query(ShipmentEvent)
            .filter(ShipmentEvent.shipment_id == shipment_id)
            .order_by(ShipmentEvent.event_timestamp.desc())
            .all()
        )
