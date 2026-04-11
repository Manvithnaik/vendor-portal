"""
SQLAlchemy model for schema.sql section 9 — dashboard_snapshots.
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger, Column, Date, ForeignKey,
    Integer, Numeric, TIMESTAMP,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class DashboardSnapshot(Base):
    __tablename__ = "dashboard_snapshots"

    id = Column(BigInteger, primary_key=True, index=True)
    manufacturer_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)

    # Sales & Orders
    total_orders = Column(Integer, nullable=False, default=0)
    orders_confirmed = Column(Integer, nullable=False, default=0)
    orders_processing = Column(Integer, nullable=False, default=0)
    orders_shipped = Column(Integer, nullable=False, default=0)
    orders_delivered = Column(Integer, nullable=False, default=0)
    orders_cancelled = Column(Integer, nullable=False, default=0)
    gross_sales_amount = Column(Numeric(16, 4), nullable=False, default=0)

    # Operational KPIs
    avg_dispatch_hours = Column(Numeric(8, 2))
    fulfilment_rate_pct = Column(Numeric(5, 2))
    open_support_tickets = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("manufacturer_org_id", "snapshot_date", name="uq_ds_org_date"),
    )

    # Relationships
    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_org_id])
