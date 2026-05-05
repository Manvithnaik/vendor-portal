import os
import psycopg2
from dotenv import load_dotenv

# Load from backend root .env if running from there
load_dotenv(".env")

conn = psycopg2.connect(
    host="localhost",
    database="vendor_portal",
    user="postgres",
    password="Manvith@2005",
    port=5432
)
conn.autocommit = True

with conn.cursor() as cur:
    with open("../database/schema.sql", "r", encoding="utf-8") as f:
        sql = f.read()
    print("Executing schema.sql...")
    cur.execute(sql)
    print("Schema executed successfully!")

conn.close()
