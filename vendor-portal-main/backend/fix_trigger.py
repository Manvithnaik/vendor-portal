
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    print("Dropping trigger and function...")
    conn.execute(text("DROP TRIGGER IF EXISTS trg_generate_org_code ON organizations;"))
    conn.execute(text("DROP FUNCTION IF EXISTS generate_org_code();"))
    conn.commit()
    print("Done.")
