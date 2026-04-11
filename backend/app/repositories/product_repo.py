from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.product import Product, ContractProductPricing
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    def __init__(self, db: Session):
        super().__init__(Product, db)

    def get_by_org(self, manufacturer_org_id: int, active_only: bool = True) -> List[Product]:
        q = self.db.query(Product).filter(Product.manufacturer_org_id == manufacturer_org_id)
        if active_only:
            q = q.filter(Product.is_active == True)  # noqa: E712
        return q.all()

    def get_by_sku(self, manufacturer_org_id: int, sku: str) -> Optional[Product]:
        return (
            self.db.query(Product)
            .filter(
                Product.manufacturer_org_id == manufacturer_org_id,
                Product.sku == sku,
            )
            .first()
        )

    def get_by_category(self, category_id: int) -> List[Product]:
        return (
            self.db.query(Product)
            .filter(Product.category_id == category_id, Product.is_active == True)  # noqa: E712
            .all()
        )


class ContractProductPricingRepository(BaseRepository[ContractProductPricing]):
    def __init__(self, db: Session):
        super().__init__(ContractProductPricing, db)

    def get_by_contract(self, contract_id: int) -> List[ContractProductPricing]:
        return (
            self.db.query(ContractProductPricing)
            .filter(
                ContractProductPricing.contract_id == contract_id,
                ContractProductPricing.is_active == True,  # noqa: E712
            )
            .all()
        )

    def get_active_pricing(
        self, contract_id: int, product_id: int
    ) -> Optional[ContractProductPricing]:
        return (
            self.db.query(ContractProductPricing)
            .filter(
                ContractProductPricing.contract_id == contract_id,
                ContractProductPricing.product_id == product_id,
                ContractProductPricing.is_active == True,  # noqa: E712
            )
            .first()
        )
