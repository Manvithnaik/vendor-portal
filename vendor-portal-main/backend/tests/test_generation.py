from app.core.database import SessionLocal
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest
import sys

def main():
    db = SessionLocal()
    try:
        svc = AuthService(db)
        data = RegisterRequest(
            role="vendor",
            org_name="Test Vendor Org",
            email="test_vendor4@example.com",
            password="testPassword123",
            confirm_password="testPassword123",
            first_name="Test",
            last_name="Vendor"
        )
        res = svc.register(data)
        print("Successfully generated vendor:", res)
        
        from app.models.organization import Organization
        org = db.query(Organization).filter_by(id=res['org_id']).first()
        print(f"Generated Org Code: {org.org_code}")
    except Exception as e:
        print("Error:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
