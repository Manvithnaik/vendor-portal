"""Product endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.contract import ContractProductPricingCreate, ContractProductPricingResponse
from app.schemas.common import APIResponse, success_response
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("", response_model=APIResponse)
def create_product(data: ProductCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ProductService(db)
    product = svc.create(data, current_user.org_id)
    return success_response("Product created.", ProductResponse.model_validate(product))


@router.get("", response_model=APIResponse)
def list_products(
    org_id: int = None,
    active_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    svc = ProductService(db)
    if org_id:
        products = svc.list_by_org(org_id, active_only)
    else:
        products = svc.list_all(skip, limit)
    return success_response("Products retrieved.", [ProductResponse.model_validate(p) for p in products])


@router.get("/{product_id}", response_model=APIResponse)
def get_product(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ProductService(db)
    product = svc.get_by_id(product_id)
    return success_response("Product retrieved.", ProductResponse.model_validate(product))


@router.put("/{product_id}", response_model=APIResponse)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ProductService(db)
    product = svc.update(product_id, data)
    return success_response("Product updated.", ProductResponse.model_validate(product))


@router.delete("/{product_id}", response_model=APIResponse)
def deactivate_product(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ProductService(db)
    svc.deactivate(product_id)
    return success_response("Product deactivated.")

@router.post("/pricing", response_model=APIResponse)
def add_product_pricing(data: ContractProductPricingCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ProductService(db)
    pricing = svc.add_contract_pricing(data)
    return success_response("Pricing added.", ContractProductPricingResponse.model_validate(pricing))

@router.get("/pricing/{contract_id}", response_model=APIResponse)
def get_contract_pricing(contract_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = ProductService(db)
    pricing = svc.get_contract_pricing(contract_id)
    return success_response("Pricing retrieved.", [ContractProductPricingResponse.model_validate(p) for p in pricing])
