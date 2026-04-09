
CREATE TYPE org_type_enum AS ENUM (
    'manufacturer',  -- Sells products (vendor perspective)
    'customer'       -- Buys products (manufacturer perspective)
);

CREATE TYPE verification_status_enum AS ENUM (
    'pending',
    'verified',
    'rejected',
    'expired'
);

CREATE TYPE order_status_enum AS ENUM (
    'draft',
    'submitted',
    'confirmed',
    'processing',
    'ready_to_ship',
    'shipped',
    'delivered',
    'cancelled',
    'disputed',
    'sent',
    'negotiating',
    'declined'
);

CREATE TYPE shipment_status_enum AS ENUM (
    'created',
    'preparing',
    'picked_up',
    'dispatched',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'returned',
    'cancelled'
);

CREATE TYPE invoice_status_enum AS ENUM (
    'draft',
    'submitted',
    'approved',
    'paid',
    'partial_paid',
    'overdue',
    'cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);

CREATE TYPE payout_status_enum AS ENUM (
    'scheduled',
    'approved',
    'processing',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE dispute_status_enum AS ENUM (
    'requested',
    'acknowledged',
    'investigating',
    'resolved',
    'escalated',
    'closed'
);

CREATE TYPE refund_status_enum AS ENUM (
    'initiated',
    'approved',
    'processing',
    'completed',
    'rejected'
);

CREATE TYPE rfq_status_enum AS ENUM (
    'draft',
    'active',
    'extended',
    'closed',
    'cancelled'
);

CREATE TYPE contract_status_enum AS ENUM (
    'draft',
    'active',
    'suspended',
    'expired',
    'terminated'
);

-- ============================================================
-- MODULE 0 — AUDIT LOG (SHARED)
-- ============================================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    action VARCHAR(30) NOT NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    changed_by INT NULL,
    changed_by_org INT NULL,
    ip_address INET NULL,
    user_agent VARCHAR(512) NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);

COMMENT ON TABLE audit_logs IS 'Global audit trail for all system changes across both portals';

-- ============================================================
-- MODULE 1 — AUTH & IDENTITY (SHARED)
-- ============================================================

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    access_level SMALLINT NOT NULL DEFAULT 1,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_admins_email UNIQUE (email),
    CONSTRAINT chk_admin_status CHECK (status IN ('active', 'suspended'))
);

CREATE INDEX idx_admins_status ON admins(status);
CREATE INDEX idx_admins_is_active ON admins(is_active);

COMMENT ON TABLE admins IS 'Platform super-admin accounts; separate from org users';

-- ============================================================
-- ORGANIZATIONS (CORE SHARED TABLE)
-- Both portals use this unified table. org_type disambiguates roles.
-- ============================================================

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    org_type org_type_enum NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NULL,
    password_hash VARCHAR(255) NULL,

    -- Address
    address_line1 VARCHAR(255) NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',

    -- Tax / identity
    gstin VARCHAR(20) NULL,
    pan VARCHAR(20) NULL,

    -- Profile
    contact_name VARCHAR(150) NULL,
    contact_email VARCHAR(150) NULL,
    contact_phone VARCHAR(20) NULL,
    logo_url VARCHAR(500) NULL,
    website VARCHAR(255) NULL,
    about TEXT NULL,
    industry_type VARCHAR(100) NULL,

    -- Vendor-specific fields (NULL for non-vendor orgs)
    factory_address TEXT NULL,
    authorised_signatory_name VARCHAR(255) NULL,
    authorised_signatory_phone VARCHAR(20) NULL,
    overall_rating NUMERIC(3,2) NULL,

    -- Verification lifecycle
    verification_status verification_status_enum NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    reapply_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    reapply_deadline DATE NULL,
    verified_at TIMESTAMPTZ NULL,
    verified_by INT NULL,

    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_orgs_email UNIQUE (email),
    CONSTRAINT uq_orgs_gstin UNIQUE (gstin),
    CONSTRAINT fk_orgs_verified_by FOREIGN KEY (verified_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_orgs_org_type ON organizations(org_type);
CREATE INDEX idx_orgs_verification_status ON organizations(verification_status);
CREATE INDEX idx_orgs_is_active ON organizations(is_active);
CREATE INDEX idx_orgs_deleted_at ON organizations(deleted_at);

COMMENT ON TABLE organizations IS 'Unified organizations: org_type disambiguates (manufacturer/customer/admin)';
COMMENT ON COLUMN organizations.org_type IS 'manufacturer=seller (vendor portal), customer=buyer (customer portal)';

-- ============================================================
-- ROLES (CORE SHARED TABLE)
-- Scoped to org_type. Same pool for both portals.
-- ============================================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    org_type org_type_enum NOT NULL,
    description TEXT NULL,
    permissions JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_roles_name_org_type UNIQUE (name, org_type)
);

COMMENT ON TABLE roles IS 'Role definitions scoped to org_type; shared RBAC pool';

-- Sample role data (insert after table creation)
INSERT INTO roles (name, org_type, description) VALUES
    ('admin', 'manufacturer', 'Full access to manufacturing operations'),
    ('procurement', 'manufacturer', 'Raise RFQs, approve POs, manage orders'),
    ('accounts', 'manufacturer', 'Invoice and payment access'),
    ('dispatch', 'manufacturer', 'Shipment and GRN management'),
    ('viewer', 'manufacturer', 'Read-only access'),
    ('admin', 'customer', 'Full access to purchasing operations'),
    ('sales', 'customer', 'Manage quotes and supplier orders'),
    ('accounts', 'customer', 'Invoice and settlement access'),
    ('dispatch', 'customer', 'Inbound shipment management'),
    ('inventory', 'customer', 'Warehouse and stock management'),
    ('viewer', 'customer', 'Read-only access'),
    ('super_admin', 'admin', 'Full platform access'),
    ('admin', 'admin', 'Standard platform admin');

-- ============================================================
-- USERS (CORE SHARED TABLE)
-- One users table for both portals. org_id + role_id = context.
-- ============================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    role_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_purchasing_authority BOOLEAN NOT NULL DEFAULT FALSE,
    last_login TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

COMMENT ON TABLE users IS 'Unified users for both portals; org_id + role_id defines context';

-- ============================================================
-- USER SESSIONS (SHARED)
-- Renamed from sessions; tracks all login activity.
-- ============================================================

CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'user',
    actor_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET NULL,
    user_agent VARCHAR(512) NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_sessions_token UNIQUE (token_hash),
    CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_actor ON user_sessions(actor_type, actor_id);

COMMENT ON TABLE user_sessions IS 'Session management for both portals; replaces old sessions table';

-- ============================================================
-- PASSWORD RESET TOKENS (SHARED)
-- Renamed from password_resets; unified reset flow.
-- ============================================================

CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    reset_method VARCHAR(20) NOT NULL DEFAULT 'email_link',
    channel VARCHAR(10) NOT NULL DEFAULT 'email',
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_prt_token UNIQUE (token_hash),
    CONSTRAINT fk_prt_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_expires_at ON password_reset_tokens(expires_at);

COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens; unified for both portals';

-- ============================================================
-- MODULE 2 — DOCUMENTS (SHARED)
-- Verification docs for organizations; typed by document_type.
-- ============================================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    verify_status verification_status_enum NOT NULL DEFAULT 'pending',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by INT NULL,
    verified_at TIMESTAMPTZ NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_documents_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_verified_by FOREIGN KEY (verified_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_is_verified ON documents(is_verified);

COMMENT ON TABLE documents IS 'Verification documents for organizations; shared across portals';

-- ============================================================
-- MODULE 3 — VENDOR BANKING
-- ============================================================

CREATE TABLE vendor_bank_accounts (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(255) NULL,
    branch VARCHAR(255) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_vba_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_vba_verified_by FOREIGN KEY (verified_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_vba_org_id ON vendor_bank_accounts(org_id);
CREATE INDEX idx_vba_is_primary ON vendor_bank_accounts(is_primary);

COMMENT ON TABLE vendor_bank_accounts IS 'Bank accounts for organizations (payout destinations)';

-- ============================================================
-- MODULE 4 — PRODUCT CATALOGUE (SHARED)
-- ============================================================

CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    parent_id INT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_cat_name_parent UNIQUE (name, parent_id),
    CONSTRAINT fk_cat_parent_id FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_categories_is_active ON product_categories(is_active);

COMMENT ON TABLE product_categories IS 'Global product category taxonomy; shared across portals';

-- ============================================================
-- PRODUCTS (CORE SHARED TABLE)
-- organization_id = seller (manufacturer org in vendor portal view)
-- ============================================================

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    category_id INT NULL,
    sku VARCHAR(100) NULL,
    name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NULL,
    purity_percentage NUMERIC(5,2) NULL,
    thickness NUMERIC(10,3) NULL,
    tensile_strength NUMERIC(10,3) NULL,
    chemical_composition TEXT NULL,
    specifications JSONB NULL,
    unit_of_measurement VARCHAR(20) NOT NULL DEFAULT 'kg',
    availability_type VARCHAR(20) NOT NULL DEFAULT 'ex_stock',
    lead_time_days INT NOT NULL DEFAULT 0,
    base_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    price_unit VARCHAR(20) NOT NULL DEFAULT 'per_unit',
    moq_quantity NUMERIC(12,3) NOT NULL DEFAULT 1.000,
    moq_unit VARCHAR(50) NULL,
    cert_url VARCHAR(500) NULL,
    listing_status VARCHAR(20) NOT NULL DEFAULT 'active',
    deactivated_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_products_org_sku UNIQUE (org_id, sku),
    CONSTRAINT fk_products_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_org_id ON products(org_id);
CREATE INDEX idx_products_listing_status ON products(listing_status);
CREATE INDEX idx_products_category_id ON products(category_id);

COMMENT ON TABLE products IS 'Product catalog; org_id = seller (manufacturer in vendor portal)';
COMMENT ON COLUMN products.org_id IS 'Selling organization (manufacturer in vendor portal, supplier in customer portal)';

-- ============================================================
-- PRODUCT TAGS & MAPPING (SHARED)
-- ============================================================

CREATE TABLE product_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_product_tags_name UNIQUE (name)
);

COMMENT ON TABLE product_tags IS 'Product discovery tags; shared taxonomy';

CREATE TABLE product_tag_map (
    product_id INT NOT NULL,
    tag_id INT NOT NULL,

    PRIMARY KEY (product_id, tag_id),
    CONSTRAINT fk_ptm_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ptm_tag_id FOREIGN KEY (tag_id) REFERENCES product_tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_ptm_tag_id ON product_tag_map(tag_id);

COMMENT ON TABLE product_tag_map IS 'Product-tag mapping; many-to-many relationship';

-- ============================================================
-- MODULE 5 — CONTRACTS & PRODUCT PRICING (REORDERED: I2 FIX)
-- ============================================================

CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL,
    manufacturer_org_id INT NULL,
    customer_org_id INT NULL,
    valid_from DATE NULL,
    valid_till DATE NULL,
    renewal_type VARCHAR(10) NOT NULL DEFAULT 'manual',
    status contract_status_enum NOT NULL DEFAULT 'draft',
    terms TEXT NULL,
    signed_by_vendor BOOLEAN NOT NULL DEFAULT FALSE,
    signed_by_vendor_at TIMESTAMPTZ NULL,
    signed_by_buyer BOOLEAN NOT NULL DEFAULT FALSE,
    signed_by_buyer_at TIMESTAMPTZ NULL,
    approved_by INT NULL,
    approved_at TIMESTAMPTZ NULL,
    document_url VARCHAR(500) NULL,
    created_by INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_contracts_code UNIQUE (code),
    CONSTRAINT fk_contracts_vendor_org FOREIGN KEY (manufacturer_org_id) REFERENCES organizations(id) ON DELETE SET NULL,
    CONSTRAINT fk_contracts_buyer_org FOREIGN KEY (customer_org_id) REFERENCES organizations(id) ON DELETE SET NULL,
    CONSTRAINT fk_contracts_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_contracts_created_by FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_contracts_vendor_org_id ON contracts(manufacturer_org_id);
CREATE INDEX idx_contracts_buyer_org_id ON contracts(customer_org_id);
CREATE INDEX idx_contracts_status ON contracts(status);

COMMENT ON TABLE contracts IS 'Master contracts between orgs; pairs with contract_product_pricing';
COMMENT ON COLUMN contracts.manufacturer_org_id IS 'Selling organization (manufacturer in vendor portal)';
COMMENT ON COLUMN contracts.customer_org_id IS 'Buying organization (customer in customer portal)';

-- ============================================================
-- CONTRACT PRODUCT PRICING (I2, I4 FIX)
-- Key interoperability table: vendor writes, buyer reads.
-- ============================================================

CREATE TABLE contract_product_pricing (
    id SERIAL PRIMARY KEY,
    contract_id INT NOT NULL,
    product_id INT NOT NULL,
    agreed_unit_price NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(10) NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    max_order_quantity INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cpp_contract_product UNIQUE (contract_id, product_id),
    CONSTRAINT fk_cpp_contract_id FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cpp_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_cpp_contract_id ON contract_product_pricing(contract_id);
CREATE INDEX idx_cpp_product_id ON contract_product_pricing(product_id);
CREATE INDEX idx_cpp_is_active ON contract_product_pricing(is_active);

COMMENT ON TABLE contract_product_pricing IS 'Per-contract product pricing and visibility; I4 fix: currency not defaulted';

-- One active contract per vendor-buyer pair (D1 FIX: PostgreSQL trigger)
CREATE OR REPLACE FUNCTION fn_enforce_one_active_contract()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND EXISTS (
        SELECT 1 FROM contracts
        WHERE manufacturer_org_id = NEW.manufacturer_org_id
          AND customer_org_id = NEW.customer_org_id
          AND status = 'active'
          AND deleted_at IS NULL
          AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Only one active contract per vendor-buyer pair allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contracts_one_active
BEFORE INSERT OR UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_one_active_contract();

-- ============================================================
-- INVENTORY (SHARED)
-- Per-product stock levels per selling organization.
-- ============================================================

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    product_id INT NOT NULL,
    available_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
    reserved_for_po NUMERIC(14,3) NOT NULL DEFAULT 0,
    in_transit NUMERIC(14,3) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(14,3) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_inv_org_product UNIQUE (org_id, product_id),
    CONSTRAINT fk_inv_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX idx_inventory_org_id ON inventory(org_id);

COMMENT ON TABLE inventory IS 'Per-product stock levels for selling organizations';

-- ============================================================
-- MODULE 6 — RFQ & SOURCING (SHARED)
-- ============================================================

CREATE TABLE rfq (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category_id INT NULL,
    location_filter VARCHAR(100) NULL,
    min_vendor_rating NUMERIC(3,2) NULL,
    deadline TIMESTAMP NOT NULL,
    deadline_extended_to TIMESTAMP NULL,
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    status rfq_status_enum NOT NULL DEFAULT 'draft',
    cancellation_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_rfq_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rfq_category_id FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_rfq_org_id ON rfq(org_id);
CREATE INDEX idx_rfq_status ON rfq(status);

COMMENT ON TABLE rfq IS 'RFQ raised by buyer orgs; status is ENUM';

-- ============================================================
-- RFQ BROADCAST (SHARED)
-- V7 FIX: Enforce org_type = 'manufacturer' for vendor_org_id
-- ============================================================

CREATE OR REPLACE FUNCTION fn_validate_rfq_broadcast_vendor()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organizations
        WHERE id = NEW.vendor_org_id
          AND org_type = 'manufacturer'
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'RFQ can only broadcast to manufacturing (selling) orgs';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE rfq_broadcast (
    id SERIAL PRIMARY KEY,
    rfq_id INT NOT NULL,
    vendor_org_id INT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewed BOOLEAN NOT NULL DEFAULT FALSE,
    responded BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_rfq_broadcast UNIQUE (rfq_id, vendor_org_id),
    CONSTRAINT fk_rfqb_rfq_id FOREIGN KEY (rfq_id) REFERENCES rfq(id) ON DELETE CASCADE,
    CONSTRAINT fk_rfqb_vendor_org FOREIGN KEY (vendor_org_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_rfq_broadcast_vendor_check
BEFORE INSERT ON rfq_broadcast
FOR EACH ROW
EXECUTE FUNCTION fn_validate_rfq_broadcast_vendor();

CREATE INDEX idx_rfq_broadcast_rfq_id ON rfq_broadcast(rfq_id);
CREATE INDEX idx_rfq_broadcast_vendor_org ON rfq_broadcast(vendor_org_id);

COMMENT ON TABLE rfq_broadcast IS 'RFQ broadcast targets; V7 fix: org_type check enforced';

-- ============================================================
-- QUOTES (SHARED)
-- ============================================================

CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    rfq_id INT NOT NULL,
    vendor_org_id INT NOT NULL,
    price NUMERIC(14,2) NOT NULL,
    lead_time_days INT NOT NULL,
    compliance_notes TEXT NULL,
    version SMALLINT NOT NULL DEFAULT 1,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_quotes_rfq_id FOREIGN KEY (rfq_id) REFERENCES rfq(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotes_vendor_org FOREIGN KEY (vendor_org_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX idx_quotes_rfq_id ON quotes(rfq_id);
CREATE INDEX idx_quotes_vendor_org ON quotes(vendor_org_id);

COMMENT ON TABLE quotes IS 'Vendor quotations for RFQ requests';

-- ============================================================
-- MODULE 7 — ORDERS (CORE SHARED TABLE)
-- ============================================================

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) NOT NULL,
    customer_org_id INT NOT NULL,
    manufacturer_org_id INT NOT NULL,
    contract_id INT NULL,
    status order_status_enum NOT NULL DEFAULT 'draft',
    priority VARCHAR(10) NOT NULL DEFAULT 'normal',
    total_amount NUMERIC(16,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    delivery_address TEXT NULL,
    required_by_date DATE NULL,
    special_instructions TEXT NULL,
    grn_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    grn_confirmed_at TIMESTAMPTZ NULL,
    grn_confirmed_by INT NULL,
    created_by INT NULL,
    approved_by INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_orders_order_number UNIQUE (order_number),
    CONSTRAINT fk_orders_buyer_org FOREIGN KEY (customer_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_vendor_org FOREIGN KEY (manufacturer_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_grn_by FOREIGN KEY (grn_confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_buyer_org_id ON orders(customer_org_id);
CREATE INDEX idx_orders_vendor_org_id ON orders(manufacturer_org_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

COMMENT ON TABLE orders IS 'Orders: buyer_org creates, vendor_org fulfills; contract_id enables CPP lookup (V2); created_by FK to users (V1); status is ENUM (V4)';

-- ============================================================
-- ORDER ITEMS (SHARED)
-- ============================================================

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    contract_pricing_id INT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    shipped_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NULL,
    unit_price NUMERIC(14,4) NOT NULL,
    gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    total_price NUMERIC(16,2) NOT NULL,
    notes TEXT NULL,

    CONSTRAINT fk_oi_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_oi_cpp_id FOREIGN KEY (contract_pricing_id) REFERENCES contract_product_pricing(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

COMMENT ON TABLE order_items IS 'Line items in orders; contract_pricing_id locks price at order time';

-- ============================================================
-- ORDER STATUS HISTORY (SHARED)
-- ============================================================

CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    changed_by INT NOT NULL,
    previous_status order_status_enum NULL,
    new_status order_status_enum NOT NULL,
    note TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_osh_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_osh_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_osh_order_id ON order_status_history(order_id);
CREATE INDEX idx_osh_changed_at ON order_status_history(changed_at DESC);

COMMENT ON TABLE order_status_history IS 'Order status audit trail';

-- ============================================================
-- PO NEGOTIATIONS (SHARED)
-- V5 FIX: initiated_by_user_id FK added alongside initiated_by string
-- ============================================================

CREATE TABLE po_negotiations (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    round_number SMALLINT NOT NULL DEFAULT 1,
    initiated_by VARCHAR(20) NOT NULL,
    initiated_by_user_id INT NULL,
    counter_quantity NUMERIC(12,3) NULL,
    counter_price NUMERIC(14,2) NULL,
    counter_delivery_date DATE NULL,
    notes TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pon_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_pon_initiated_by_user FOREIGN KEY (initiated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_po_negotiations_order_id ON po_negotiations(order_id);

COMMENT ON TABLE po_negotiations IS 'Negotiation rounds; V5 fix: initiated_by_user_id FK added';

-- ============================================================
-- MODULE 8 — SHIPMENTS (SHARED)
-- ============================================================

CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    shipment_number VARCHAR(100) NOT NULL,
    order_id INT NOT NULL,
    manufacturer_org_id INT NOT NULL,
    customer_org_id INT NOT NULL,
    is_partial BOOLEAN NOT NULL DEFAULT FALSE,
    shipment_status shipment_status_enum NOT NULL DEFAULT 'created',
    carrier_name VARCHAR(255) NULL,
    vehicle_number VARCHAR(50) NULL,
    tracking_number VARCHAR(100) NULL,
    tracking_url VARCHAR(500) NULL,
    current_location VARCHAR(255) NULL,
    eway_bill_number VARCHAR(100) NULL,
    number_of_packages INT NULL,
    total_weight_kg NUMERIC(10,3) NULL,
    condition_status VARCHAR(20) NULL,
    delivery_remarks TEXT NULL,
    received_by INT NULL,
    dispatched_by INT NULL,
    document_url VARCHAR(500) NULL,
    dispatch_date TIMESTAMP NULL,
    estimated_delivery_date TIMESTAMP NULL,
    actual_delivery_date TIMESTAMP NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_shipments_shipment_number UNIQUE (shipment_number),
    CONSTRAINT fk_shipments_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shipments_vendor_org FOREIGN KEY (manufacturer_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shipments_buyer_org FOREIGN KEY (customer_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shipments_received_by FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_shipments_dispatched_by FOREIGN KEY (dispatched_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_vendor_org ON shipments(manufacturer_org_id);
CREATE INDEX idx_shipments_shipment_status ON shipments(shipment_status);

COMMENT ON TABLE shipments IS 'Shipments; shipment_number NOT NULL (V6); shipment_status is ENUM; dispatched_by added';

-- ============================================================
-- SHIPMENT EVENTS (NEW - SHARED)
-- ============================================================

CREATE TABLE shipment_events (
    id BIGSERIAL PRIMARY KEY,
    shipment_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    location VARCHAR(255) NULL,
    description TEXT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_se_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX idx_se_shipment_id ON shipment_events(shipment_id);
CREATE INDEX idx_se_event_timestamp ON shipment_events(event_timestamp DESC);

COMMENT ON TABLE shipment_events IS 'Granular tracking events (carrier API, manual, system)';

-- ============================================================
-- DELIVERY CONFIRMATIONS (NEW - SHARED)
-- ============================================================

CREATE TABLE delivery_confirmations (
    id SERIAL PRIMARY KEY,
    shipment_id INT NOT NULL,
    confirmed_by INT NOT NULL,
    signature_url VARCHAR(500) NULL,
    proof_of_delivery_url VARCHAR(500) NULL,
    notes TEXT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_dc_shipment UNIQUE (shipment_id),
    CONSTRAINT fk_dc_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_dc_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_dc_shipment_id ON delivery_confirmations(shipment_id);

COMMENT ON TABLE delivery_confirmations IS 'Formal delivery confirmations with POD';

-- ============================================================
-- MODULE 9 — INVOICES (SHARED)
-- ============================================================

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL,
    order_id INT NOT NULL,
    vendor_org_id INT NOT NULL,
    buyer_org_id INT NOT NULL,
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'proforma',
    gross_amount NUMERIC(16,4) NOT NULL,
    gst_amount NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    tds_amount NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    net_amount NUMERIC(16,4) NOT NULL,
    status invoice_status_enum NOT NULL DEFAULT 'draft',
    issue_date DATE NULL,
    due_date DATE NULL,
    submitted_at TIMESTAMPTZ NULL,
    document_url VARCHAR(500) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_invoices_invoice_number UNIQUE (invoice_number),
    CONSTRAINT fk_invoices_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_vendor_org FOREIGN KEY (vendor_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_buyer_org FOREIGN KEY (buyer_org_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_vendor_org ON invoices(vendor_org_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

COMMENT ON TABLE invoices IS 'GST-compliant invoices; status is ENUM';

-- ============================================================
-- PAYMENTS (SHARED)
-- ============================================================

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL,
    buyer_org_id INT NOT NULL,
    vendor_org_id INT NOT NULL,
    amount NUMERIC(16,4) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    gateway_txn_id VARCHAR(255) NULL,
    status payment_status_enum NOT NULL DEFAULT 'pending',
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_payments_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_buyer_org FOREIGN KEY (buyer_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_vendor_org FOREIGN KEY (vendor_org_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);

COMMENT ON TABLE payments IS 'Payment transactions; status is ENUM';

-- ============================================================
-- VENDOR PAYOUTS (SHARED)
-- ============================================================

CREATE TABLE vendor_payouts (
    id SERIAL PRIMARY KEY,
    vendor_org_id INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_amount NUMERIC(16,4) NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(14,4) NOT NULL DEFAULT 0.00,
    net_payout NUMERIC(16,4) NOT NULL,
    status payout_status_enum NOT NULL DEFAULT 'scheduled',
    triggered_by VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    approved_by INT NULL,
    bank_account_id INT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_vp_vendor_org FOREIGN KEY (vendor_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vp_approved_by FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL,
    CONSTRAINT fk_vp_bank_account FOREIGN KEY (bank_account_id) REFERENCES vendor_bank_accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_vp_vendor_org ON vendor_payouts(vendor_org_id);
CREATE INDEX idx_vp_status ON vendor_payouts(status);

COMMENT ON TABLE vendor_payouts IS 'Vendor payouts/settlements; status is ENUM';

-- ============================================================
-- MODULE 10 — DISPUTES (SHARED)
-- ============================================================

CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    buyer_org_id INT NOT NULL,
    vendor_org_id INT NOT NULL,
    rma_number VARCHAR(50) NOT NULL,
    dispute_type VARCHAR(30) NOT NULL,
    category VARCHAR(30) NULL,
    description TEXT NULL,
    is_partial BOOLEAN NOT NULL DEFAULT FALSE,
    status dispute_status_enum NOT NULL DEFAULT 'requested',
    resolution_type VARCHAR(30) NULL,
    mediator_id INT NULL,
    raised_by INT NULL,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT uq_disputes_rma_number UNIQUE (rma_number),
    CONSTRAINT fk_disputes_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_disputes_buyer_org FOREIGN KEY (buyer_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_disputes_vendor_org FOREIGN KEY (vendor_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_disputes_mediator FOREIGN KEY (mediator_id) REFERENCES admins(id) ON DELETE SET NULL,
    CONSTRAINT fk_disputes_raised_by FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_vendor_org ON disputes(vendor_org_id);
CREATE INDEX idx_disputes_status ON disputes(status);

COMMENT ON TABLE disputes IS 'Disputes/RMA requests; status is ENUM; maps to support_tickets in customer portal';

-- ============================================================
-- REFUNDS (SHARED)
-- V3 FIX: FK constraint on dispute_id added
-- disputes table is now defined above — no forward reference
-- ============================================================

CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL,
    dispute_id INT NULL,
    refund_type VARCHAR(10) NOT NULL,
    amount NUMERIC(14,4) NOT NULL,
    status refund_status_enum NOT NULL DEFAULT 'initiated',
    approved_by INT NULL,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_refunds_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_refunds_dispute_id FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE SET NULL,
    CONSTRAINT fk_refunds_approved_by FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_refunds_invoice_id ON refunds(invoice_id);
CREATE INDEX idx_refunds_status ON refunds(status);

COMMENT ON TABLE refunds IS 'Refunds/credits; V3 fix: dispute_id FK enforced; status is ENUM';

-- ============================================================
-- DISPUTE EVIDENCE (SHARED)
-- ============================================================

CREATE TABLE dispute_evidence (
    id SERIAL PRIMARY KEY,
    dispute_id INT NOT NULL,
    uploaded_by_type VARCHAR(20) NOT NULL,
    uploaded_by_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    description VARCHAR(255) NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_de_dispute_id FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
);

CREATE INDEX idx_de_dispute_id ON dispute_evidence(dispute_id);

COMMENT ON TABLE dispute_evidence IS 'Evidence files for disputes';

-- ============================================================
-- DISPUTE RESOLUTIONS (SHARED)
-- ============================================================

CREATE TABLE dispute_resolutions (
    id SERIAL PRIMARY KEY,
    dispute_id INT NOT NULL,
    resolution_type VARCHAR(30) NOT NULL,
    remarks TEXT NULL,
    decided_by INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_dr_dispute_id FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_dr_decided_by FOREIGN KEY (decided_by) REFERENCES admins(id) ON DELETE SET NULL
);

COMMENT ON TABLE dispute_resolutions IS 'Dispute resolutions decided by admins';

-- ============================================================
-- MODULE 11 — MESSAGING (SHARED)
-- ============================================================

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    thread_id VARCHAR(50) NOT NULL,
    context_type VARCHAR(20) NULL,
    context_id INT NULL,
    vendor_org_id INT NOT NULL,
    buyer_org_id INT NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_id INT NOT NULL,
    message_body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_messages_vendor_org FOREIGN KEY (vendor_org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_buyer_org FOREIGN KEY (buyer_org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_context ON messages(context_type, context_id);
CREATE INDEX idx_messages_vendor_org ON messages(vendor_org_id);
CREATE INDEX idx_messages_buyer_org ON messages(buyer_org_id);

COMMENT ON TABLE messages IS 'Unified messaging between orgs; context_type: rfq, order, dispute, general';

-- ============================================================
-- MODULE 12 — NOTIFICATIONS (SHARED)
-- ============================================================

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(20) NOT NULL,
    recipient_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(10) NOT NULL DEFAULT 'in_app',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id INT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'Notifications for both portals; reference_type: order, rfq, invoice, dispute';

-- ============================================================
-- MODULE 13 — MISSING TABLES (P3 Priority)
-- ============================================================

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    capacity NUMERIC(14,3) NOT NULL,
    current_utilization NUMERIC(14,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_warehouses_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_warehouses_org_id ON warehouses(org_id);

COMMENT ON TABLE warehouses IS 'Warehouse/logistics locations for organizations';

-- ============================================================
-- DASHBOARD SNAPSHOTS (P3 Priority - Analytics)
-- ============================================================

CREATE TABLE dashboard_snapshots (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    snapshot_date DATE NOT NULL,
    total_orders INT NOT NULL DEFAULT 0,
    total_revenue NUMERIC(16,2) NOT NULL DEFAULT 0,
    total_shipments INT NOT NULL DEFAULT 0,
    active_contracts INT NOT NULL DEFAULT 0,
    snapshot_data JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ds_org_date UNIQUE (org_id, snapshot_date),
    CONSTRAINT fk_ds_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_ds_org_date ON dashboard_snapshots(org_id, snapshot_date DESC);

COMMENT ON TABLE dashboard_snapshots IS 'Daily snapshots for analytics and reporting';

-- ============================================================
-- UNIFIED TRIGGER FUNCTION FOR ALL updated_at COLUMNS
-- (GAP 4 FIX: Single shared function, PostgreSQL idiom)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_rfq_updated_at BEFORE UPDATE ON rfq FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_cpp_updated_at BEFORE UPDATE ON contract_product_pricing FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
