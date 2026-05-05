import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.email_log import EmailNotificationLog
from typing import Optional, List
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_approval_notification(
    type: str,          # "approved" | "rejected" | "resubmit"
    user_email: str,    # recipient email
    user_name: str,     # company name or full name
    user_type: str,     # "Vendor" or "Manufacturer"
    account_id: int,    # their unique ID
    action_date: datetime, # timestamp of admin action
    reason: Optional[str] = None,        # for rejected — admin entered reason
    changes: Optional[List[str]] = None, # for resubmit — array of required changes
    deadline: Optional[str] = None       # for resubmit — optional deadline date
):
    """
    Sends an email asynchronously for application status shifts.
    Currently mocked out as a real SMTP server isn't set up yet,
    but it logs success directly into the `email_notification_logs` table.
    """
    
    body = ""
    subject = ""

    if type == "approved":
        subject = f"🎉 Congratulations! Your {user_type} Account has been Approved — Platform Name"
        body = f"""Dear {user_name},

We are pleased to inform you that your {user_type} account on Platform Name has been successfully reviewed and APPROVED by our admin team.

You can now log in and access your dashboard using your registered credentials.

✅ Account Type   : {user_type}
✅ Approved On    : {action_date.strftime('%Y-%m-%d %H:%M:%S')}
✅ Account ID     : {account_id}

What you can do next:
→ Complete your profile
→ Add your products / catalog
→ Start connecting with buyers / vendors

If you have any questions, contact us at support@platform.com.

Regards,
Platform Name Team
"""
    elif type == "rejected":
        subject = f"❌ Your {user_type} Account Application has been Rejected — Platform Name"
        body = f"""Dear {user_name},

Thank you for applying to join Platform Name as a {user_type}.

After careful review, we regret to inform you that your application has been REJECTED by our admin team.

❌ Account Type   : {user_type}
❌ Rejected On    : {action_date.strftime('%Y-%m-%d %H:%M:%S')}
❌ Reason         : {reason or 'Not provided'}

If you believe this decision was made in error or would like further clarification, please contact our support team.

📧 Support: support@platform.com

You may re-apply after addressing the concerns mentioned above.

Regards,
Platform Name Team
"""
    elif type == "resubmit":
        subject = f"🔄 Action Required: Please Resubmit Your {user_type} Application — Platform Name"
        
        changes_bullets = "\n".join([f"- {c}" for c in (changes or [])])
        
        body = f"""Dear {user_name},

Thank you for applying to Platform Name as a {user_type}.

Our admin team has reviewed your application and requires you to make the following changes before your account can be approved:

📋 Changes Required:
----------------------------------------
{changes_bullets}
----------------------------------------

🔄 Account Type      : {user_type}
🔄 Reviewed On       : {action_date.strftime('%Y-%m-%d %H:%M:%S')}
🔄 Resubmit Deadline : {deadline or 'No deadline'}

Please log in to your account, make the necessary updates, and resubmit your application for review.

If you need help making these changes, reach out to us at support@platform.com.

Regards,
Platform Name Team
"""
    
    # Simulating email logic here...
    logger.info(f"Sending email to {user_email} (Type: {type})")
    logger.debug(f"Subject: {subject}\nBody: {body}")
    
    # Try sending via real SMTP if configured
    if settings.SMTP_HOST:
        _send_smtp_email(user_email, subject, body)
    
    # Using SessionLocal manually to insert log without blocking the main event loop
    db: Session = SessionLocal()
    try:
        log_entry = EmailNotificationLog(
            recipient_email=user_email,
            recipient_type=user_type,
            notification_type=type,
            sent_at=datetime.utcnow(),
            status="sent",
            error_message=None
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log email: {e}")
        db.rollback()
    finally:
        db.close()


def send_password_reset_email(user_email: str, token: str):
    """
    Sends a password reset email asynchronously.
    """
    frontend_url = "http://localhost:3000"
    reset_link = f"{frontend_url}/reset-password?token={token}"

    subject = "Reset your password"
    body = f"""You requested a password reset. Click the link below to reset your password. This link expires in 1 hour.
    
Reset password link: {reset_link}

If you did not request this, ignore this email — your password will not change.
"""

    logger.info(f"Sending password reset email to {user_email}")
    logger.debug(f"Subject: {subject}\nBody: {body}")

    # Try sending via real SMTP if configured
    if settings.SMTP_HOST:
        _send_smtp_email(user_email, subject, body)

    # Write to a visible outbox file so the user can easily find the link during local development
    try:
        with open("outbox.txt", "a") as f:
            f.write(f"--- EMAIL TO: {user_email} at {datetime.utcnow()} ---\n")
            f.write(f"SUBJECT: {subject}\n\n")
            f.write(f"{body}\n")
            f.write("-" * 50 + "\n\n")
    except Exception as e:
        logger.error(f"Failed to write to outbox.txt: {e}")

    # Using SessionLocal manually to insert log
    db: Session = SessionLocal()
    try:
        log_entry = EmailNotificationLog(
            recipient_email=user_email,
            recipient_type="User",
            notification_type="password_reset",
            sent_at=datetime.utcnow(),
            status="sent",
            error_message=None
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log password reset email: {e}")
        db.rollback()
    finally:
        db.close()

def _send_smtp_email(to_email: str, subject: str, body_text: str) -> bool:
    """Helper method to send an actual email via SMTP."""
    if not settings.SMTP_HOST:
        return False
        
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body_text, 'plain'))
        
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            # We assume STARTTLS is supported by the server, which is typical for 587
            if settings.SMTP_PORT != 465:
                # Catch servers that don't need or support starttls gracefully
                try: 
                    server.starttls(context=context)
                except Exception as e:
                    logger.warning(f"STARTTLS not initiated: {e}")
            
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
            server.send_message(msg)
            
        logger.info(f"Real SMTP email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send real SMTP email: {e}")
        return False
