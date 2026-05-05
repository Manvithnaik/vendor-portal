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
    from app.services.id_generator import IdGeneratorService

    existing = db.query(Admin).filter(Admin.email == ADMIN_EMAIL).first()
    if existing:
        # Update password hash in case it was hashed with old passlib
        existing.password_hash = hash_password(ADMIN_PASSWORD)
        existing.status = "active"
        existing.is_active = True
        
        # Backfill admin_code if missing
        if not existing.admin_code:
            existing.admin_code = IdGeneratorService.generate_sequence_code(db, "admin")

        db.commit()
        print(f"[UPDATED] Admin '{ADMIN_EMAIL}' updated.")
    else:
        admin_code = IdGeneratorService.generate_sequence_code(db, "admin")

        admin = Admin(
            admin_code=admin_code,
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
