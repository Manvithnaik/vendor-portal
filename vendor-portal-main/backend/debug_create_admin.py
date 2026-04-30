import sys
import os
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.api.v1.endpoints.admin_mgmt import create_admin
from app.schemas.auth import AdminCreateRequest
from app.models.vendor_portal import Admin

# Mock current_admin
class MockAdmin:
    id = 1

db = SessionLocal()
data = AdminCreateRequest(name="Test Debug", email="debug-test@example.com")

# Cleanup previous test
db.query(Admin).filter(Admin.email == data.email).delete()
db.commit()

try:
    print("Simulating create_admin call with password_change_required...")
    new_admin = Admin(
        name=data.name,
        email=data.email,
        status="suspended",
        is_active=False,
        password_hash="dummy"
    )
    db.add(new_admin)
    db.flush()
    print("Success!")
except Exception as e:
    import traceback
    print("\n--- ERROR DETECTED ---")
    traceback.print_exc()
finally:
    db.close()
