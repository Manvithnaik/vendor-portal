
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    print("Checking active queries:")
    result = conn.execute(text("""
        SELECT pid, state, query, wait_event_type, wait_event
        FROM pg_stat_activity
        WHERE datname = 'postgres' AND pid <> pg_backend_pid();
    """))
    for row in result:
        print(f"PID: {row[0]}, State: {row[1]}, Wait: {row[3]}/{row[4]}")
        print(f"Query: {row[2][:100]}...")
