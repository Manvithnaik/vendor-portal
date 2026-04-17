"""
Seed script — creates a default admin account.
Run once: venv\Scripts\python.exe seed_admin.py
"""
import sys
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.vendor_portal import Admin

ADMIN_EMAIL    = "admin@vendorhub.com"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME     = "Platform Admin"

db = SessionLocal()
try:
    existing = db.query(Admin).filter(Admin.email == ADMIN_EMAIL).first()
    if existing:
        # Update password hash in case it was hashed with old passlib
        existing.password_hash = hash_password(ADMIN_PASSWORD)
        existing.status = "active"
        existing.is_active = True
        db.commit()
        print(f"[UPDATED] Admin '{ADMIN_EMAIL}' password re-hashed with bcrypt directly.")
    else:
        admin = Admin(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
            access_level=1,
            status="active",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"[CREATED] Admin seeded: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
finally:
    db.close()
