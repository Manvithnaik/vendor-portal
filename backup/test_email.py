import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL")

print(f"Testing SMTP with {SMTP_USER} via {SMTP_HOST}:{SMTP_PORT}")

msg = MIMEMultipart()
msg['From'] = SMTP_FROM_EMAIL
msg['To'] = SMTP_USER # Send to self for test
msg['Subject'] = "SMTP Test"
msg.attach(MIMEText("Test body", 'plain'))

try:
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        print("Connecting...")
        server.set_debuglevel(1)
        server.starttls()
        print("Logging in...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print("Sending...")
        server.send_message(msg)
        print("Success!")
except Exception as e:
    print(f"Failed: {e}")
