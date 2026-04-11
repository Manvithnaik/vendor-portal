from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ProductCategoryCreate(BaseModel):
    parent_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    sort_order: int = 0


class ProductCategoryResponse(BaseModel):
    id: int
    parent_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    manufacturer_org_id: int
    category_id: int
    sku: str
    name: str
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    unit_of_measure: Optional[str] = None
    min_order_quantity: int = 1
    lead_time_days: Optional[int] = None
    tags: Optional[List[str]] = None  # tag names, resolved by service


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    unit_of_measure: Optional[str] = None
    min_order_quantity: Optional[int] = None
    lead_time_days: Optional[int] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None


class ProductResponse(BaseModel):
    id: int
    manufacturer_org_id: int
    category_id: int
    sku: str
    name: str
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    unit_of_measure: Optional[str] = None
    min_order_quantity: int
    lead_time_days: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryUpdate(BaseModel):
    available_stock: Optional[float] = None
    reserved_for_po: Optional[float] = None
    in_transit: Optional[float] = None
    low_stock_threshold: Optional[float] = None


class InventoryResponse(BaseModel):
    id: int
    org_id: int
    product_id: int
    available_stock: float
    reserved_for_po: float
    in_transit: float
    low_stock_threshold: float
    updated_at: datetime

    model_config = {"from_attributes": True}
