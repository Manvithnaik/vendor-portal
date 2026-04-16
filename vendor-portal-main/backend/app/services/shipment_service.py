"""Shipment service."""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.shipment import Shipment, ShipmentEvent, DeliveryConfirmation
from app.models.enums import ShipmentStatusEnum
from app.repositories.shipment_repo import ShipmentRepository, ShipmentEventRepository
from app.repositories.order_repo import OrderRepository
from app.schemas.shipment import ShipmentCreate, ShipmentUpdate, ShipmentEventCreate, DeliveryConfirmationCreate
from app.exceptions import NotFoundException, ConflictException, BusinessRuleException


class ShipmentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ShipmentRepository(db)
        self.event_repo = ShipmentEventRepository(db)
        self.order_repo = OrderRepository(db)

    def get_by_id(self, shipment_id: int) -> Shipment:
        s = self.repo.get(shipment_id)
        if not s:
            raise NotFoundException("Shipment")
        return s

    def list_by_order(self, order_id: int):
        return self.repo.get_by_order(order_id)

    def list_by_org(self, org_id: int, as_manufacturer: bool = True):
        return self.repo.get_by_org(org_id, as_manufacturer)

    def create(self, data: ShipmentCreate, dispatched_by: int) -> Shipment:
        order = self.order_repo.get(data.order_id)
        if not order:
            raise NotFoundException("Order")

        shipment_number = f"SHP-{uuid.uuid4().hex[:8].upper()}"
        shipment = Shipment(
            shipment_number=shipment_number,
            order_id=data.order_id,
            manufacturer_org_id=order.manufacturer_org_id,
            customer_org_id=order.customer_org_id,
            is_partial=data.is_partial,
            origin_logistics_id=data.origin_logistics_id,
            carrier=data.carrier,
            tracking_number=data.tracking_number,
            tracking_url=data.tracking_url,
            service_type=data.service_type,
            incoterm=data.incoterm,
            estimated_delivery_date=data.estimated_delivery_date,
            vehicle_number=data.vehicle_number,
            eway_bill_number=data.eway_bill_number,
            number_of_packages=data.number_of_packages,
            weight_kg=data.weight_kg,
            dimensions_cm=data.dimensions_cm,
            notes=data.notes,
            dispatched_by=dispatched_by,
            status=ShipmentStatusEnum.pending,
        )
        return self.repo.create(shipment)

    def update(self, shipment_id: int, data: ShipmentUpdate) -> Shipment:
        shipment = self.get_by_id(shipment_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(shipment, k, v)
        if data.status == ShipmentStatusEnum.dispatched:
            shipment.shipped_at = datetime.utcnow()
        return self.repo.update(shipment)

    def add_event(self, shipment_id: int, data: ShipmentEventCreate) -> ShipmentEvent:
        self.get_by_id(shipment_id)  # ensure exists
        event = ShipmentEvent(
            shipment_id=shipment_id,
            event_type=data.event_type,
            location=data.location,
            description=data.description,
            event_timestamp=data.event_timestamp,
            source=data.source,
        )
        return self.event_repo.create(event)

    def get_events(self, shipment_id: int):
        return self.event_repo.get_by_shipment(shipment_id)

    def confirm_delivery(self, data: DeliveryConfirmationCreate, confirmed_by: int) -> DeliveryConfirmation:
        shipment = self.get_by_id(data.shipment_id)
        existing = self.db.query(DeliveryConfirmation).filter(
            DeliveryConfirmation.shipment_id == data.shipment_id
        ).first()
        if existing:
            raise ConflictException("Delivery already confirmed for this shipment.")
        confirmation = DeliveryConfirmation(
            shipment_id=data.shipment_id,
            confirmed_by=confirmed_by,
            signature_url=data.signature_url,
            proof_of_delivery_url=data.proof_of_delivery_url,
            notes=data.notes,
        )
        shipment.status = ShipmentStatusEnum.delivered
        shipment.actual_delivery_date = datetime.utcnow().date()
        self.db.add(confirmation)
        self.db.commit()
        self.db.refresh(confirmation)
        return confirmation
