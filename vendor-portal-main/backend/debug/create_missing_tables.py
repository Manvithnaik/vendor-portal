import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import JSON
from sqlalchemy.dialects import postgresql
postgresql.JSONB = JSON # Monkeypatch for SQLite compatibility

from app.core.database import engine, Base
from app.models import * # Import all models to ensure they are registered with Base

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully (if they didn't exist).")
