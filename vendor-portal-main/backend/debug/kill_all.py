
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    print("Terminating ALL other sessions...")
    result = conn.execute(text("""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid();
    """))
    for row in result:
        print(f"Terminated PID")
    conn.commit()
