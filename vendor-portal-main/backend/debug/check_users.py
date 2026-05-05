import sys
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.organization import Organization
from app.models.user import User

def check():
    db = SessionLocal()
    users = db.query(User).order_by(User.id.desc()).limit(5).all()
    print("Recent Users & Orgs:")
    for u in users:
        org = db.query(Organization).filter(Organization.id == u.org_id).first()
        print(f"User: {u.email}, Org ID: {u.org_id}, Org Type: {org.org_type.value if org else 'None'}")
    db.close()

if __name__ == "__main__":
    check()
