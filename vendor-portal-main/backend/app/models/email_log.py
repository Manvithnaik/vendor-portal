from datetime import datetime

from sqlalchemy import Column, Integer, String, TIMESTAMP, Text

from app.core.database import Base


class EmailNotificationLog(Base):
    __tablename__ = "email_notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False)
    recipient_type = Column(String(50), nullable=False) # vendor or manufacturer
    notification_type = Column(String(50), nullable=False) # approved, rejected, resubmit
    sent_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    status = Column(String(50), nullable=False) # sent, failed
    error_message = Column(Text, nullable=True)
