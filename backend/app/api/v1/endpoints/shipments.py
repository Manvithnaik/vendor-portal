"""Shipment endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.shipment import ShipmentCreate, ShipmentUpdate, ShipmentResponse, ShipmentEventCreate, ShipmentEventResponse, DeliveryConfirmationCreate
from app.schemas.common import APIResponse, success_response
from app.services.shipment_service import ShipmentService
from typing import Optional

router = APIRouter(prefix="/shipments", tags=["Shipments"])


@router.post("", response_model=APIResponse)
def create_shipment(data: ShipmentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ShipmentService(db)
    shipment = svc.create(data, current_user.id)
    return success_response("Shipment created.", ShipmentResponse.model_validate(shipment))


@router.get("", response_model=APIResponse)
def list_shipments(org_id: int = None, as_manufacturer: bool = True, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ShipmentService(db)
    target_org = org_id if org_id else current_user.org_id
    shipments = svc.list_by_org(target_org, as_manufacturer)
    return success_response("Shipments retrieved.", [ShipmentResponse.model_validate(s) for s in shipments])


@router.get("/{shipment_id}", response_model=APIResponse)
def get_shipment(shipment_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ShipmentService(db)
    shipment = svc.get_by_id(shipment_id)
    return success_response("Shipment retrieved.", ShipmentResponse.model_validate(shipment))


@router.put("/{shipment_id}", response_model=APIResponse)
def update_shipment(shipment_id: int, data: ShipmentUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ShipmentService(db)
    shipment = svc.update(shipment_id, data)
    return success_response("Shipment updated.", ShipmentResponse.model_validate(shipment))


@router.post("/{shipment_id}/events", response_model=APIResponse)
def add_shipment_event(shipment_id: int, data: ShipmentEventCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ShipmentService(db)
    event = svc.add_event(shipment_id, data)
    return success_response("Shipment event added.", ShipmentEventResponse.model_validate(event))


@router.get("/{shipment_id}/events", response_model=APIResponse)
def get_shipment_events(shipment_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ShipmentService(db)
    events = svc.get_events(shipment_id)
    return success_response("Shipment events retrieved.", [ShipmentEventResponse.model_validate(e) for e in events])


@router.post("/delivery-confirmation", response_model=APIResponse)
def confirm_delivery(data: DeliveryConfirmationCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ShipmentService(db)
    confirmation = svc.confirm_delivery(data, current_user.id)
    # response simplfied
    return success_response("Delivery confirmed.", {"id": confirmation.id, "shipment_id": confirmation.shipment_id})
