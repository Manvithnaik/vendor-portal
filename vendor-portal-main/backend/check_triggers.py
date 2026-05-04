
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    print("Checking for triggers:")
    result = conn.execute(text("""
        SELECT event_object_table, trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'organizations';
    """))
    for row in result:
        print(f"Table: {row[0]}, Name: {row[1]}, Event: {row[2]}, Action: {row[3]}")

    print("\nChecking for functions:")
    result = conn.execute(text("""
        SELECT routine_name, routine_definition
        FROM information_schema.routines
        WHERE routine_type = 'FUNCTION' AND routine_schema = 'public';
    """))
    for row in result:
        print(f"Name: {row[0]}")
        # print(f"Definition: {row[1]}") # might be too long
