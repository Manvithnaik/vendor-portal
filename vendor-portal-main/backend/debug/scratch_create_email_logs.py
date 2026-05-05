import asyncio
from app.core.database import engine, Base
from app.models import email_log

def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    main()
