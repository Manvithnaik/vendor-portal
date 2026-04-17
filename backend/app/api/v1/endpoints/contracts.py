"""Contract endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.contract import ContractCreate, ContractUpdate, ContractResponse
from app.schemas.common import APIResponse, success_response
from app.services.contract_service import ContractService

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post("", response_model=APIResponse)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ContractService(db)
    contract = svc.create(data, current_user.id)
    return success_response("Contract created.", ContractResponse.model_validate(contract))


@router.get("", response_model=APIResponse)
def list_contracts(org_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ContractService(db)
    # Default to current user's org if not specified
    target_org = org_id if org_id else current_user.org_id
    contracts = svc.list_by_org(target_org)
    return success_response("Contracts retrieved.", [ContractResponse.model_validate(c) for c in contracts])


@router.get("/{contract_id}", response_model=APIResponse)
def get_contract(contract_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ContractService(db)
    contract = svc.get_by_id(contract_id)
    return success_response("Contract retrieved.", ContractResponse.model_validate(contract))


@router.put("/{contract_id}", response_model=APIResponse)
def update_contract(contract_id: int, data: ContractUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ContractService(db)
    contract = svc.update(contract_id, data)
    return success_response("Contract updated.", ContractResponse.model_validate(contract))


@router.patch("/{contract_id}/activate", response_model=APIResponse)
def activate_contract(contract_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ContractService(db)
    contract = svc.activate(contract_id, current_user.id)
    return success_response("Contract activated.", ContractResponse.model_validate(contract))
