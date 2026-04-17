from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.contract import Contract
from app.models.enums import ContractStatusEnum
from app.repositories.base import BaseRepository


class ContractRepository(BaseRepository[Contract]):
    def __init__(self, db: Session):
        super().__init__(Contract, db)

    def get_active_contract(
        self, customer_org_id: int, manufacturer_org_id: int
    ) -> Optional[Contract]:
        """Return the single active contract between two orgs (enforced at DB level too)."""
        return (
            self.db.query(Contract)
            .filter(
                Contract.customer_org_id == customer_org_id,
                Contract.manufacturer_org_id == manufacturer_org_id,
                Contract.status == ContractStatusEnum.active,
            )
            .first()
        )

    def get_by_org(self, org_id: int) -> List[Contract]:
        """Return all contracts where the org is either the customer or manufacturer."""
        return (
            self.db.query(Contract)
            .filter(
                (Contract.customer_org_id == org_id)
                | (Contract.manufacturer_org_id == org_id)
            )
            .all()
        )

    def get_by_number(self, contract_number: str) -> Optional[Contract]:
        return (
            self.db.query(Contract)
            .filter(Contract.contract_number == contract_number)
            .first()
        )
