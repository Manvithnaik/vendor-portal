import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal

async def check_enum():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT enum_range(NULL::order_status_enum);")).fetchone()
        print("Enum values:", result[0])
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(check_enum())
