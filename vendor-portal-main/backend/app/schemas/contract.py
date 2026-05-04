from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import ContractStatusEnum


class ContractCreate(BaseModel):
    buyer_org_id: int
    manufacturer_org_id: int
    contract_number: str
    name: Optional[str] = None
    type: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    renewal_type: str = "manual"
    terms: Optional[str] = None
    document_url: Optional[str] = None


class ContractUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[ContractStatusEnum] = None
    end_date: Optional[date] = None
    renewal_type: Optional[str] = None
    terms: Optional[str] = None
    document_url: Optional[str] = None
    signed_by_vendor: Optional[bool] = None
    signed_by_buyer: Optional[bool] = None


class ContractResponse(BaseModel):
    id: int
    buyer_org_id: int
    manufacturer_org_id: int
    contract_number: str
    name: Optional[str] = None
    type: Optional[str] = None
    status: ContractStatusEnum
    start_date: date
    end_date: Optional[date] = None
    renewal_type: str
    signed_by_vendor: bool
    signed_by_buyer: bool
    created_by: int
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContractProductPricingCreate(BaseModel):
    contract_id: int
    product_id: int
    agreed_unit_price: float
    currency: str = "USD"
    discount_percent: float = 0.0
    max_order_quantity: Optional[int] = None
    effective_from: date
    effective_to: Optional[date] = None


class ContractProductPricingResponse(BaseModel):
    id: int
    contract_id: int
    product_id: int
    agreed_unit_price: float
    currency: str
    discount_percent: float
    max_order_quantity: Optional[int] = None
    is_active: bool
    effective_from: date
    effective_to: Optional[date] = None

    model_config = {"from_attributes": True}
