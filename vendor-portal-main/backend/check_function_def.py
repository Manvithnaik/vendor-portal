
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    print("Function Definition for generate_org_code:")
    result = conn.execute(text("""
        SELECT routine_definition
        FROM information_schema.routines
        WHERE routine_name = 'generate_org_code';
    """))
    for row in result:
        print(row[0])
