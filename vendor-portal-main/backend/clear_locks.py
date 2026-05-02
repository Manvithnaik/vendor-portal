from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:191Mjnaik%40%26%26@db.cffrveovqifqkwtupikl.supabase.co:5432/postgres')
con = engine.connect()
con.execute(text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND state in ('idle in transaction', 'active');"))
con.commit()
con.close()
print("Locks cleared")
