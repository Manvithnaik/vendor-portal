import os
from sqlalchemy import text
from app.core.database import SessionLocal

def add_col():
    with SessionLocal() as db:
        try:
            db.execute(text("ALTER TABLE quotes ADD COLUMN document_url VARCHAR(500);"))
            db.commit()
            print("Successfully added document_url to quotes")
        except Exception as e:
            print("Error or already exists:", e)

if __name__ == "__main__":
    add_col()
