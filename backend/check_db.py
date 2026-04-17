from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # 1. Alembic version
    rev = db.execute(text("SELECT version_num FROM alembic_version")).fetchall()
    print("Alembic versions:", [r[0] for r in rev])

    # 2. quotes.deleted_at
    q = db.execute(text(
        "SELECT column_name, is_nullable FROM information_schema.columns "
        "WHERE table_name='quotes' AND column_name='deleted_at'"
    )).fetchone()
    print("quotes.deleted_at exists:", q is not None, "| nullable:", q[1] if q else "N/A")

    # 3. order_items.contract_pricing_id
    r = db.execute(text(
        "SELECT column_name, is_nullable FROM information_schema.columns "
        "WHERE table_name='order_items' AND column_name='contract_pricing_id'"
    )).fetchone()
    print("order_items.contract_pricing_id:", r[1] if r else "MISSING")

    print("\n=== DB State Verified ===")
finally:
    db.close()
