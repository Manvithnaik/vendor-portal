from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    manufacturer_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    rating = Column(Numeric(3, 2), nullable=False)  # 1.00 to 5.00
    review = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", foreign_keys=[order_id])
    manufacturer = relationship("Organization", foreign_keys=[manufacturer_id])
    vendor = relationship("Organization", foreign_keys=[vendor_id])
