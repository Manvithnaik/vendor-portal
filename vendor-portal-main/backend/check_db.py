import sqlalchemy
from sqlalchemy import create_engine
import os

url = "postgresql://postgres.cffrveovqifqkwtupikl:191Mjnaik%40%26%26@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
engine = create_engine(url, connect_args={'connect_timeout': 5})
try:
    with engine.connect() as conn:
        print("Connection successful!")
        result = conn.execute(sqlalchemy.text("SELECT 1"))
        print("Query successful:", result.scalar())
except Exception as e:
    print("Connection failed:", e)
