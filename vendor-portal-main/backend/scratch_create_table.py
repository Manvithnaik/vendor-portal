from app.core.database import engine, Base
import app.models.email_log
import app.models.user

# Create any missing tables (like email_notification_logs)
Base.metadata.create_all(bind=engine)
print("Missing tables created successfully.")
