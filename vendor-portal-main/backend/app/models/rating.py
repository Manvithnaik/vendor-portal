from datetime import datetime
from sqlalchemy import Column, Integer, Text, ForeignKey, TIMESTAMP, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base

class Rating(Base):
    __tablename__ = "order_ratings"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    order = relationship("Order", backref="rating")
