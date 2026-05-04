from sqlalchemy import Column, Integer, String
from app.core.database import Base

class SequenceTracker(Base):
    __tablename__ = "sequence_trackers"

    role_prefix = Column(String(1), primary_key=True)
    year = Column(Integer, primary_key=True)
    last_value = Column(Integer, nullable=False, default=0)
