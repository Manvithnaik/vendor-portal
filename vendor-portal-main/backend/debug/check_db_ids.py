
from app.core.database import SessionLocal
from app.models.organization import Organization
from app.models.sequence import SequenceTracker
from sqlalchemy import func

db = SessionLocal()
try:
    print("Checking Organizations org_codes:")
    orgs = db.query(Organization.org_code).all()
    for org in orgs:
        print(f" - {org.org_code}")

    print("\nChecking SequenceTracker:")
    trackers = db.query(SequenceTracker).all()
    for t in trackers:
        print(f" - Prefix: {t.role_prefix}, Year: {t.year}, Last Value: {t.last_value}")

finally:
    db.close()
