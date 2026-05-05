
from app.core.database import SessionLocal
from app.models.organization import Organization
from app.models.sequence import SequenceTracker
from sqlalchemy import func

db = SessionLocal()
try:
    print("All Organizations:")
    orgs = db.query(Organization).order_by(Organization.id).all()
    for org in orgs:
        print(f"ID: {org.id}, Code: {org.org_code}, Name: {org.name}, Email: {org.email}")

    print("\nAll SequenceTrackers:")
    trackers = db.query(SequenceTracker).all()
    for t in trackers:
        print(f"Prefix: {t.role_prefix}, Year: {t.year}, Last Value: {t.last_value}")

finally:
    db.close()
