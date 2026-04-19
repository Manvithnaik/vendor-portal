import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_admin_invite_email(to_email: str, name: str, token: str):
    """Sends an invitation email to a new administrator with a setup link."""
    setup_link = f"{settings.FRONTEND_URL}/admin/setup-password?token={token}"
    subject = "Verify Your Admin Account for VendorHub Portal"
    body = f"""
    Hello {name},

    An administrator account has been created for you on the VendorHub Portal.

    To complete your setup and choose your password, please click the link below:
    {setup_link}

    This link will expire in 24 hours.

    Regards,
    The VendorHub Team
    """

    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        logger.warning(f"SMTP not configured. Invitation email NOT sent to {to_email}. Token: {token}")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Invitation email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send invitation email to {to_email}: {e}")
        return False
