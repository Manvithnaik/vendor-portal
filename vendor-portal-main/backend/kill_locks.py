
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    print("Terminating blocking sessions...")
    # Terminate sessions that are idle in transaction for more than 1 minute
    result = conn.execute(text("""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
        AND pid <> pg_backend_pid();
    """))
    for row in result:
        print(f"Terminated PID")
    conn.commit()
