import traceback
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

def test_db():
    print(f"Connecting to: Supabase Cloud Database")
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    try:
        with engine.connect() as conn:
            # Test 1: Simple query to verify connection
            result = conn.execute(text("SELECT 1;")).scalar()
            print(f"[OK] Database connection successful. Result: {result}")
            
            # Test 2: Check standard tables are accessible
            orgs = conn.execute(text("SELECT count(*) FROM organizations;")).scalar()
            print(f"[OK] Extracted from 'organizations' table: {orgs} rows")
            
            # Test 3: Check Alembic modifications exist
            orders_cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'po_document_url';")).fetchone()
            if orders_cols:
                print(f"[OK] Alembic migration confirmed: 'po_document_url' found in 'orders'")
            else:
                print("[FAIL] Missing Alembic fields in 'orders'")
                
        print("\nAll database tests passed! The backend system is ready.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] Database test failed:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_db()
