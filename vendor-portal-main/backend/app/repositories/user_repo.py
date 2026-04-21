from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.vendor_portal import Admin
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get(self, record_id: int) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.id == record_id)
            .first()
        )

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.email == email, User.deleted_at.is_(None))
            .first()
        )

    def get_by_org(self, org_id: int):
        return (
            self.db.query(User)
            .filter(User.org_id == org_id, User.deleted_at.is_(None))
            .all()
        )

    def soft_delete(self, user: User) -> User:
        from datetime import datetime
        user.deleted_at = datetime.utcnow()
        user.is_active = False
        return self.update(user)


class AdminRepository(BaseRepository[Admin]):
    def __init__(self, db: Session):
        super().__init__(Admin, db)

    def get_by_email(self, email: str) -> Optional[Admin]:
        return (
            self.db.query(Admin)
            .filter(Admin.email == email, Admin.deleted_at.is_(None))
            .first()
        )
