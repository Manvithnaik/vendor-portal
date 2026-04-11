"""
Product service — CRUD with inventory side-effects.
"""
import uuid
from sqlalchemy.orm import Session
from app.models.product import Product, ProductCategory, ProductTag, ProductTagMap, ContractProductPricing
from app.repositories.product_repo import ProductRepository, ContractProductPricingRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.contract import ContractProductPricingCreate
from app.exceptions import NotFoundException, ConflictException


class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductRepository(db)
        self.pricing_repo = ContractProductPricingRepository(db)

    def get_by_id(self, product_id: int) -> Product:
        product = self.repo.get(product_id)
        if not product:
            raise NotFoundException("Product")
        return product

    def list_by_org(self, manufacturer_org_id: int, active_only: bool = True):
        return self.repo.get_by_org(manufacturer_org_id, active_only)

    def list_all(self, skip: int = 0, limit: int = 100):
        return self.repo.get_all(skip, limit)

    def create(self, data: ProductCreate, current_user_org_id: int) -> Product:
        # Check for duplicate SKU within org
        existing = self.repo.get_by_sku(data.manufacturer_org_id, data.sku)
        if existing:
            raise ConflictException(
                f"SKU '{data.sku}' already exists for this organization."
            )

        tags = data.tags or []
        product_data = data.model_dump(exclude={"tags"})
        product = Product(**product_data)
        self.db.add(product)
        self.db.flush()

        # Resolve tags
        for tag_name in tags:
            tag = self.db.query(ProductTag).filter(ProductTag.name == tag_name).first()
            if not tag:
                tag = ProductTag(name=tag_name)
                self.db.add(tag)
                self.db.flush()
            self.db.add(ProductTagMap(product_id=product.id, tag_id=tag.id))

        self.db.commit()
        self.db.refresh(product)
        return product

    def update(self, product_id: int, data: ProductUpdate) -> Product:
        product = self.get_by_id(product_id)
        update_data = data.model_dump(exclude_none=True, exclude={"tags"})
        for field, value in update_data.items():
            setattr(product, field, value)
        return self.repo.update(product)

    def deactivate(self, product_id: int) -> Product:
        from datetime import datetime
        product = self.get_by_id(product_id)
        product.is_active = False
        product.deactivated_at = datetime.utcnow()
        return self.repo.update(product)

    # --- Contract Product Pricing ---
    def add_contract_pricing(self, data: ContractProductPricingCreate) -> ContractProductPricing:
        existing = self.pricing_repo.get_active_pricing(data.contract_id, data.product_id)
        if existing:
            raise ConflictException("Pricing for this contract/product already exists.")
        pricing = ContractProductPricing(**data.model_dump())
        return self.pricing_repo.create(pricing)

    def get_contract_pricing(self, contract_id: int):
        return self.pricing_repo.get_by_contract(contract_id)
