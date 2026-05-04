from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings


# ---------------------------------------------------------------------------
# Engine — persistent pool so connections are reused across requests
# ---------------------------------------------------------------------------
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_size=5,
    max_overflow=5,
    pool_timeout=10,
    pool_recycle=300,       # recycle before Supabase 5-min idle kill
    pool_pre_ping=False,    # skip extra round-trip; pooler keeps conns alive
    echo=False,
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ---------------------------------------------------------------------------
# Declarative base (shared by all models)
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
def get_db():
    """Yield a database session; ensure it is closed on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
