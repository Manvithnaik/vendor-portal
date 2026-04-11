"""Contract service."""
import uuid
from sqlalchemy.orm import Session
from app.models.contract import Contract
from app.models.enums import ContractStatusEnum
from app.repositories.contract_repo import ContractRepository
from app.schemas.contract import ContractCreate, ContractUpdate
from app.exceptions import NotFoundException, ConflictException, BusinessRuleException


class ContractService:
    def __init__(self, db: Session):
        self.repo = ContractRepository(db)

    def get_by_id(self, contract_id: int) -> Contract:
        c = self.repo.get(contract_id)
        if not c:
            raise NotFoundException("Contract")
        return c

    def list_by_org(self, org_id: int):
        return self.repo.get_by_org(org_id)

    def create(self, data: ContractCreate, created_by: int) -> Contract:
        if self.repo.get_by_number(data.contract_number):
            raise ConflictException(f"Contract number '{data.contract_number}' already exists.")
        contract = Contract(**data.model_dump(), created_by=created_by)
        return self.repo.create(contract)

    def update(self, contract_id: int, data: ContractUpdate) -> Contract:
        contract = self.get_by_id(contract_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(contract, k, v)
        return self.repo.update(contract)

    def activate(self, contract_id: int, approved_by: int) -> Contract:
        from datetime import datetime
        contract = self.get_by_id(contract_id)
        if contract.status != ContractStatusEnum.draft:
            raise BusinessRuleException("Only draft contracts can be activated.")
        contract.status = ContractStatusEnum.active
        contract.approved_by = approved_by
        contract.approved_at = datetime.utcnow()
        return self.repo.update(contract)
