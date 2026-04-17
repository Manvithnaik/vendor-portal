import re

with open('c:/Users/manvi/vendor-portal/database/schema.sql', 'r') as f:
    sql = f.read()

# 1. Revert Suffixes
tables = ['roles', 'contracts', 'orders', 'order_items', 'shipments', 'invoices', 'payments', 'dashboard_snapshots']
for t in tables:
    sql = sql.replace(f'vendor_{t}', t)

# 2. ENUM ALIGNMENT
# order_status_enum
order_enum_replacement = """CREATE TYPE order_status_enum AS ENUM (
    'draft',
    'submitted',
    'confirmed',
    'processing',
    'ready_to_ship',
    'shipped',
    'delivered',
    'cancelled',
    'disputed'
);"""
sql = re.sub(r"CREATE TYPE order_status_enum AS ENUM \([^;]+\);", order_enum_replacement, sql)

# shipment_status_enum
shipment_enum_replacement = """CREATE TYPE shipment_status_enum AS ENUM (
    'pending',
    'preparing',
    'picked_up',
    'dispatched',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'returned',
    'cancelled'
);"""
sql = re.sub(r"CREATE TYPE shipment_status_enum AS ENUM \([^;]+\);", shipment_enum_replacement, sql)

# invoice_status_enum
invoice_enum_replacement = """CREATE TYPE invoice_status_enum AS ENUM (
    'draft',
    'issued',
    'partially_paid',
    'paid',
    'overdue',
    'cancelled',
    'disputed'
);"""
sql = re.sub(r"CREATE TYPE invoice_status_enum AS ENUM \([^;]+\);", invoice_enum_replacement, sql)

# Add payment_method_enum
payment_method_enum = """
CREATE TYPE payment_method_enum AS ENUM (
    'bank_transfer',
    'upi',
    'credit_card',
    'cheque'
);
"""
# Insert after payment_status_enum
if 'CREATE TYPE payment_method_enum' not in sql:
    sql = sql.replace("CREATE TYPE payment_status_enum AS ENUM (", payment_method_enum + "\nCREATE TYPE payment_status_enum AS ENUM (")

# 3. SCHEMA ALIGNMENT: user_sessions
# Make user_id NOT NULL
sql = sql.replace("user_id INT NULL,", "user_id INT NOT NULL,")
# Drop actor_type, actor_id, is_revoked
sql = re.sub(r"\s+actor_type VARCHAR\(20\) NOT NULL DEFAULT 'user',\n", "\n", sql)
sql = re.sub(r"\s+actor_id INT NOT NULL,\n", "\n", sql)
sql = re.sub(r"\s+is_revoked BOOLEAN NOT NULL DEFAULT FALSE,\n", "\n", sql)
# update index
sql = re.sub(r"CREATE INDEX idx_user_sessions_actor ON user_sessions\(actor_type, actor_id\);", "", sql)

# products
def modify_products(match):
    s = match.group(0)
    # org_id -> manufacturer_org_id
    s = s.replace("org_id INT NOT NULL,", "manufacturer_org_id INT NOT NULL,")
    # drop pricing
    s = re.sub(r"\s+base_price NUMERIC\(14,2\)[^\n]+,\n", "\n", s)
    s = re.sub(r"\s+discount_percentage NUMERIC\(5,2\)[^\n]+,\n", "\n", s)
    s = re.sub(r"\s+price_unit VARCHAR\(20\)[^\n]+,\n", "\n", s)
    # constraints
    s = s.replace("uq_products_org_sku UNIQUE (org_id, sku)", "uq_products_org_sku UNIQUE (manufacturer_org_id, sku)")
    s = s.replace("fk_products_org_id FOREIGN KEY (org_id)", "fk_products_org_id FOREIGN KEY (manufacturer_org_id)")
    return s
sql = re.sub(r'CREATE TABLE products \([^;]+\);', modify_products, sql)
sql = sql.replace("CREATE INDEX idx_products_org_id ON products(org_id);", "CREATE INDEX idx_products_org_id ON products(manufacturer_org_id);")

# 4. Organizations modifications
# dropping gstin, pan, verification_status, verified_by, etc.
def modify_organizations(match):
    s = match.group(0)
    s = re.sub(r"\s+gstin VARCHAR\(20\) NULL,\n", "\n", s)
    s = re.sub(r"\s+pan VARCHAR\(20\) NULL,\n", "\n", s)
    s = re.sub(r"\s+verify_status_enum NOT NULL DEFAULT 'pending'[^\n]*\n", "\n", s)
    s = re.sub(r"\s+verification_status verify_status_enum[^\n]*\n", "\n", s)
    s = re.sub(r"\s+verified_by INT NULL,\n", "\n", s)
    s = re.sub(r"\s+verified_at TIMESTAMPTZ NULL,\n", "\n", s)
    s = re.sub(r"\s+rejection_reason TEXT NULL,\n", "\n", s)
    s = re.sub(r"\s+reapply_allowed[^\n]*\n", "\n", s)
    s = re.sub(r"\s+reapply_deadline[^\n]*\n", "\n", s)
    s = re.sub(r"\s+CONSTRAINT uq_orgs_gstin[^\n]*\n", "\n", s)
    s = re.sub(r"\s+CONSTRAINT fk_orgs_verified_by[^\n]*\n?", "\n", s)
    # remove trailing comma gracefully if it happened
    s = s.replace(",\n\n)", "\n)")
    return s
sql = re.sub(r'CREATE TABLE organizations \([^;]+\);', modify_organizations, sql)
sql = sql.replace("CREATE INDEX idx_orgs_verification_status ON organizations(verification_status);", "")

# 5. Contract Trigger -> Partial Index
trigger_block = r"""CREATE OR REPLACE FUNCTION fn_enforce_one_active_contract\(\).*?EXECUTE FUNCTION fn_enforce_one_active_contract\(\);"""
replacement_index = "CREATE UNIQUE INDEX uq_active_contracts ON contracts(manufacturer_org_id, customer_org_id) WHERE status = 'active';"
sql = re.sub(trigger_block, replacement_index, sql, flags=re.DOTALL)

# 6. Disputes -> support_tickets
sql = sql.replace("CREATE TABLE disputes", "CREATE TABLE support_tickets")
sql = sql.replace("COMMENT ON TABLE disputes", "COMMENT ON TABLE support_tickets")
sql = sql.replace("dispute_status_enum", "ticket_status_enum")
sql = sql.replace("CREATE INDEX idx_disputes", "CREATE INDEX idx_tickets")
sql = sql.replace("REFERENCES disputes", "REFERENCES support_tickets")
sql = sql.replace("UPDATE ON disputes", "UPDATE ON support_tickets")
sql = sql.replace("CREATE TYPE dispute_status_enum", "CREATE TYPE ticket_status_enum")

# Payment method ENUM link
# In payments table
sql = sql.replace("payment_method VARCHAR(30) NOT NULL,", "payment_method payment_method_enum NOT NULL,")
sql = sql.replace("payment_method VARCHAR(30)", "payment_method payment_method_enum")

# 7. Add business_verification_certificates
bvc = """
CREATE TABLE business_verification_certificates (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    gstin VARCHAR(20) NULL,
    pan VARCHAR(20) NULL,
    verify_status verify_status_enum NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    verified_by INT NULL,
    verified_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_bvc_org UNIQUE (org_id),
    CONSTRAINT fk_bvc_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_bvc_verified_by FOREIGN KEY (verified_by) REFERENCES admins(id) ON DELETE SET NULL
);
"""
if 'CREATE TABLE business_verification_certificates' not in sql:
    sql = sql.replace("-- MODULE 2 — DOCUMENTS (SHARED)", "-- MODULE 2 — DOCUMENTS (SHARED)\n" + bvc)


with open('c:/Users/manvi/vendor-portal/database/schema.sql', 'w') as f:
    f.write(sql)
print("Transformations completed successfully")
