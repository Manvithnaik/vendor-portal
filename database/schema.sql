
-- TABLE INDEX
--  1. Shared Infrastructure  (types, trigger function)
--  2. Account & Profile Management
--     organizations, roles, users, user_sessions,
--     password_reset_tokens,
--     business_verification_certificates, manufacturer_financial_details
--  3. Contracts (B2B many-to-many bridge)
--     contracts
--  4. Marketplace & Discovery
--     product_categories, products, product_tags, product_tag_map,
--     contract_product_pricing, supply_chain_logistics
--  5. Order Management
--     orders, order_items, order_status_history
--  6. Transaction & Financial Tools
--     payment_profiles, invoices, payments
--  7. Shipment & Delivery Tracking
--     shipments, shipment_events, delivery_confirmations
--  8. Support & Complaint Resolution
--     support_tickets, ticket_messages, ticket_status_history
--  9. Analysis Dashboard
--     dashboard_snapshots
-- 10. CRM (out-of-scope for requirements – retained for completeness)
--     crm_interactions, crm_tasks, crm_notes
-- =============================================================


-- =============================================================
-- 1. SHARED INFRASTRUCTURE
-- =============================================================

-- [FIX-01] Centralised ENUM types (PostgreSQL requires named types)

CREATE TYPE org_type_enum         AS ENUM ('customer', 'manufacturer');
CREATE TYPE role_org_type_enum    AS ENUM ('customer', 'manufacturer', 'both');
CREATE TYPE verify_status_enum    AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE contract_status_enum  AS ENUM ('draft', 'active', 'suspended', 'expired', 'terminated');
CREATE TYPE order_status_enum     AS ENUM (
    'draft', 'submitted', 'confirmed',
    'processing',           -- [FIX-08] replaces MySQL 'in_production' to match requirements
    'ready_to_ship',
    'shipped', 'delivered', 'cancelled', 'disputed'
);
CREATE TYPE order_priority_enum   AS ENUM ('normal', 'urgent');
CREATE TYPE shipment_status_enum  AS ENUM (
    'pending', 'preparing', 'picked_up',
    'dispatched',                        -- added: vendor portal dispatch step
    'in_transit', 'out_for_delivery',
    'delivered', 'failed', 'returned',
    'cancelled'                          -- added: vendor portal cancellation
);
CREATE TYPE event_source_enum     AS ENUM ('carrier_api', 'manual', 'system');
CREATE TYPE ticket_cat_enum       AS ENUM (
    'order_issue', 'payment_dispute', 'shipment_issue',
    'product_quality', 'account', 'other'
);
CREATE TYPE priority_enum         AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status_enum    AS ENUM (
    -- Customer portal states
    'open', 'in_progress', 'awaiting_customer', 'awaiting_manufacturer',
    -- Vendor portal dispute states
    'requested', 'acknowledged', 'investigating', 'escalated',
    -- Shared terminal states
    'resolved', 'closed'
);
CREATE TYPE payment_method_enum   AS ENUM ('bank_transfer', 'credit_card', 'letter_of_credit', 'net_terms');
CREATE TYPE payment_status_enum   AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE invoice_status_enum   AS ENUM (
    'draft', 'issued', 'partially_paid', 'paid',
    'overdue', 'cancelled', 'disputed'
);
CREATE TYPE crm_interaction_enum  AS ENUM ('call', 'email', 'meeting', 'demo', 'follow_up', 'note');
CREATE TYPE crm_task_type_enum    AS ENUM ('follow_up', 'contract_renewal', 'onboarding', 'issue_resolution', 'other');
CREATE TYPE crm_task_status_enum  AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE reset_method_enum     AS ENUM ('otp', 'email_link');  -- [FIX-02]
-- Vendor portal ENUMs
CREATE TYPE payout_status_enum    AS ENUM ('scheduled', 'approved', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE rfq_status_enum       AS ENUM ('draft', 'active', 'extended', 'closed', 'cancelled');
CREATE TYPE refund_status_enum    AS ENUM ('initiated', 'approved', 'processing', 'completed', 'rejected');


-- [FIX-01] Reusable trigger function for updated_at (replaces MySQL ON UPDATE)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- =============================================================
-- 2. ACCOUNT & PROFILE MANAGEMENT
-- =============================================================

CREATE TABLE organizations (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    org_type        org_type_enum   NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    phone           VARCHAR(50),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100),
    postal_code     VARCHAR(20),
    website         VARCHAR(255),
    logo_url        VARCHAR(500),
    -- Vendor portal fields (NULL for customer orgs)
    contact_name                VARCHAR(150),
    contact_email               VARCHAR(150),
    contact_phone               VARCHAR(20),
    about                       TEXT,
    industry_type               VARCHAR(100),
    factory_address             TEXT,
    authorised_signatory_name   VARCHAR(255),
    authorised_signatory_phone  VARCHAR(20),
    overall_rating              NUMERIC(3,2),
    verification_status         verify_status_enum  NOT NULL DEFAULT 'pending',
    -- Shared
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMPTZ,            -- [FIX-04] soft delete
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_email UNIQUE (email)
);

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Partial unique index: email must be unique among non-deleted orgs
CREATE UNIQUE INDEX uq_org_email_active
    ON organizations (email)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_org_type     ON organizations (org_type);
CREATE INDEX idx_org_active   ON organizations (is_active) WHERE deleted_at IS NULL;


-- Roles are scoped per org_type to prevent cross-assignment
CREATE TABLE roles (
    id          SERIAL              PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    org_type    role_org_type_enum  NOT NULL,
    description TEXT,
    permissions JSONB,              -- vendor portal: fine-grained permission map
    CONSTRAINT uq_role_name_orgtype UNIQUE (name, org_type)
);


CREATE TABLE users (
    id                      SERIAL          PRIMARY KEY,
    org_id                  INT             NOT NULL,
    role_id                 INT             NOT NULL,
    first_name              VARCHAR(100)    NOT NULL,
    last_name               VARCHAR(100)    NOT NULL,
    email                   VARCHAR(255)    NOT NULL,
    phone                   VARCHAR(20),
    password_hash           VARCHAR(255)    NOT NULL,
    is_purchasing_authority BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login              TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ,            -- [FIX-04] soft delete
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_users_org  FOREIGN KEY (org_id)  REFERENCES organizations (id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- [FIX-04] Email unique only among non-deleted users
CREATE UNIQUE INDEX uq_users_email_active
    ON users (email)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_users_org_id   ON users (org_id);
CREATE INDEX idx_users_role_id  ON users (role_id);
CREATE INDEX idx_users_active   ON users (is_active) WHERE deleted_at IS NULL;


CREATE TABLE user_sessions (
    id                BIGSERIAL       PRIMARY KEY,    -- [FIX-01] BIGINT UNSIGNED → BIGSERIAL
    user_id           INT             NOT NULL,
    token_hash        VARCHAR(255)    NOT NULL,
    ip_address        INET,                           -- [FIX-01] proper INET type
    user_agent        TEXT,
    last_activity_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(), -- [FIX-03] inactivity logout
    expires_at        TIMESTAMPTZ     NOT NULL,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_session_token UNIQUE (token_hash)
);

CREATE INDEX idx_sessions_user_id    ON user_sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON user_sessions (expires_at);


-- [FIX-02] Password reset via OTP or email link (Module 1 – Authentication)
CREATE TABLE password_reset_tokens (
    id            BIGSERIAL           PRIMARY KEY,
    user_id       INT                 NOT NULL,
    token_hash    VARCHAR(255)        NOT NULL,   -- hashed OTP or signed URL token
    reset_method  reset_method_enum   NOT NULL,   -- 'otp' | 'email_link'
    expires_at    TIMESTAMPTZ         NOT NULL,
    used_at       TIMESTAMPTZ,                    -- NULL = not yet used
    created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_prt_token UNIQUE (token_hash)
);

CREATE INDEX idx_prt_user_id   ON password_reset_tokens (user_id);
CREATE INDEX idx_prt_expires   ON password_reset_tokens (expires_at) WHERE used_at IS NULL;


-- Manufacturer-only: business verification
CREATE TABLE business_verification_certificates (
    id                  SERIAL              PRIMARY KEY,
    org_id              INT                 NOT NULL,
    certificate_number  VARCHAR(255)        NOT NULL,
    issued_by           VARCHAR(255)        NOT NULL,
    issued_date         DATE                NOT NULL,
    expiry_date         DATE,
    document_url        VARCHAR(500),
    verification_status verify_status_enum  NOT NULL DEFAULT 'pending',
    verified_by         INT,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_bvc_org         FOREIGN KEY (org_id)      REFERENCES organizations (id),
    CONSTRAINT fk_bvc_verified_by FOREIGN KEY (verified_by) REFERENCES users (id),
    CONSTRAINT chk_bvc_expiry     CHECK (expiry_date IS NULL OR expiry_date > issued_date)
);

CREATE INDEX idx_bvc_org_id ON business_verification_certificates (org_id);
CREATE INDEX idx_bvc_status ON business_verification_certificates (verification_status);


-- Manufacturer-only: financial details (store encrypted at application layer)
CREATE TABLE manufacturer_financial_details (
    id                          SERIAL          PRIMARY KEY,
    org_id                      INT             NOT NULL,
    bank_name                   VARCHAR(255),
    account_number_encrypted    VARCHAR(500),
    routing_number_encrypted    VARCHAR(500),
    tax_id_encrypted            VARCHAR(500),
    currency                    VARCHAR(10)     NOT NULL DEFAULT 'USD',
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_mfd_org        FOREIGN KEY (org_id) REFERENCES organizations (id),
    CONSTRAINT uq_mfd_org        UNIQUE (org_id)       -- one record per org
);

CREATE TRIGGER trg_mfd_updated_at
    BEFORE UPDATE ON manufacturer_financial_details
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================
-- 3. CONTRACTS (B2B many-to-many bridge)
-- =============================================================

CREATE TABLE contracts (
    id                      SERIAL                  PRIMARY KEY,
    customer_org_id         INT                     NOT NULL,
    manufacturer_org_id     INT                     NOT NULL,
    contract_number         VARCHAR(100)            NOT NULL,
    name                    VARCHAR(255),
    type                    VARCHAR(30),
    status                  contract_status_enum    NOT NULL DEFAULT 'draft',
    start_date              DATE                    NOT NULL,
    end_date                DATE,
    renewal_type            VARCHAR(10)             NOT NULL DEFAULT 'manual',
    signed_by_vendor        BOOLEAN                 NOT NULL DEFAULT FALSE,
    signed_by_vendor_at     TIMESTAMPTZ,
    signed_by_buyer         BOOLEAN                 NOT NULL DEFAULT FALSE,
    signed_by_buyer_at      TIMESTAMPTZ,
    document_url            VARCHAR(500),
    terms                   TEXT,
    created_by              INT                     NOT NULL,
    approved_by             INT,
    approved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_contracts_customer     FOREIGN KEY (customer_org_id)     REFERENCES organizations (id),
    CONSTRAINT fk_contracts_manufacturer FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id),
    CONSTRAINT fk_contracts_created_by  FOREIGN KEY (created_by)           REFERENCES users (id),
    CONSTRAINT fk_contracts_approved_by FOREIGN KEY (approved_by)          REFERENCES users (id),
    CONSTRAINT uq_contract_number       UNIQUE (contract_number),
    CONSTRAINT chk_contracts_dates      CHECK (end_date IS NULL OR end_date > start_date),
    CONSTRAINT chk_contracts_diff_orgs  CHECK (customer_org_id <> manufacturer_org_id)
);

CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- [FIX-13] Only one active contract per customer–manufacturer pair
CREATE UNIQUE INDEX uq_contracts_active_pair
    ON contracts (customer_org_id, manufacturer_org_id)
    WHERE status = 'active';

CREATE INDEX idx_contracts_customer     ON contracts (customer_org_id);
CREATE INDEX idx_contracts_manufacturer ON contracts (manufacturer_org_id);
CREATE INDEX idx_contracts_status       ON contracts (status);


-- =============================================================
-- 4. MARKETPLACE & DISCOVERY
-- =============================================================

-- Supports nested categories (self-referencing parent)
CREATE TABLE product_categories (
    id          SERIAL          PRIMARY KEY,
    parent_id   INT,
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    sort_order  SMALLINT        NOT NULL DEFAULT 0,  -- [FIX-12] UI ordering
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES product_categories (id),
    CONSTRAINT uq_category_name_parent UNIQUE (name, parent_id)
);

CREATE INDEX idx_categories_parent   ON product_categories (parent_id);
CREATE INDEX idx_categories_active   ON product_categories (is_active) WHERE is_active = TRUE;


-- No base pricing here — pricing lives in contract_product_pricing
CREATE TABLE products (
    id                      SERIAL          PRIMARY KEY,
    manufacturer_org_id     INT             NOT NULL,
    category_id             INT             NOT NULL,
    sku                     VARCHAR(100)    NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    specifications          JSONB,                      -- [FIX-10] JSONB for indexing
    unit_of_measure         VARCHAR(50),
    min_order_quantity      INT             NOT NULL DEFAULT 1 CHECK (min_order_quantity >= 1),
    lead_time_days          INT             CHECK (lead_time_days >= 0),
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    deactivated_at          TIMESTAMPTZ,               -- [FIX-06] deactivation audit timestamp
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_products_org      FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)         REFERENCES product_categories (id),
    CONSTRAINT uq_manufacturer_sku  UNIQUE (manufacturer_org_id, sku)
);

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_products_manufacturer ON products (manufacturer_org_id);
CREATE INDEX idx_products_category     ON products (category_id);
CREATE INDEX idx_products_active       ON products (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_specs        ON products USING GIN (specifications); -- [FIX-10] GIN on JSONB


CREATE TABLE product_tags (
    id      SERIAL          PRIMARY KEY,
    name    VARCHAR(100)    NOT NULL,
    CONSTRAINT uq_tag_name UNIQUE (name)
);


CREATE TABLE product_tag_map (
    product_id  INT NOT NULL,
    tag_id      INT NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    CONSTRAINT fk_ptm_product FOREIGN KEY (product_id) REFERENCES products (id)    ON DELETE CASCADE,
    CONSTRAINT fk_ptm_tag     FOREIGN KEY (tag_id)     REFERENCES product_tags (id) ON DELETE CASCADE
);

CREATE INDEX idx_ptm_tag_id ON product_tag_map (tag_id);


-- Controls BOTH visibility AND contract-specific pricing per product
-- A product is only visible to a customer if a row exists here under their contract
CREATE TABLE contract_product_pricing (
    id                  SERIAL              PRIMARY KEY,
    contract_id         INT                 NOT NULL,
    product_id          INT                 NOT NULL,
    agreed_unit_price   NUMERIC(12, 4)      NOT NULL CHECK (agreed_unit_price >= 0),
    currency            VARCHAR(10)         NOT NULL DEFAULT 'USD',
    discount_percent    NUMERIC(5, 2)       NOT NULL DEFAULT 0.00
                            CHECK (discount_percent BETWEEN 0 AND 100),
    max_order_quantity  INT                 CHECK (max_order_quantity > 0),
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,
    effective_from      DATE                NOT NULL,
    effective_to        DATE,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cpp_contract  FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_cpp_product   FOREIGN KEY (product_id)  REFERENCES products (id),
    CONSTRAINT uq_contract_product UNIQUE (contract_id, product_id),
    CONSTRAINT chk_cpp_dates    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TRIGGER trg_cpp_updated_at
    BEFORE UPDATE ON contract_product_pricing
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_cpp_contract_id ON contract_product_pricing (contract_id);
CREATE INDEX idx_cpp_product_id  ON contract_product_pricing (product_id);
CREATE INDEX idx_cpp_active      ON contract_product_pricing (is_active) WHERE is_active = TRUE;


-- Manufacturer warehouse / fulfilment locations
CREATE TABLE supply_chain_logistics (
    id                      SERIAL          PRIMARY KEY,
    manufacturer_org_id     INT             NOT NULL,
    warehouse_name          VARCHAR(255),
    address                 VARCHAR(500),
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    country                 VARCHAR(100),
    postal_code             VARCHAR(20),
    shipping_methods        JSONB,          -- [FIX-10] e.g. ["FedEx","DHL","UPS"]
    incoterms               VARCHAR(50),
    is_primary              BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_scl_org FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id)
);

CREATE INDEX idx_scl_manufacturer ON supply_chain_logistics (manufacturer_org_id);

-- Only one primary warehouse per manufacturer
CREATE UNIQUE INDEX uq_scl_primary
    ON supply_chain_logistics (manufacturer_org_id)
    WHERE is_primary = TRUE;


-- =============================================================
-- 5. ORDER MANAGEMENT
-- =============================================================

CREATE TABLE orders (
    id                      SERIAL                  PRIMARY KEY,
    order_number            VARCHAR(100)            NOT NULL,
    customer_org_id         INT                     NOT NULL,
    manufacturer_org_id     INT                     NOT NULL,
    contract_id             INT                     NOT NULL,
    created_by              INT                     NOT NULL,
    approved_by             INT,
    status                  order_status_enum       NOT NULL DEFAULT 'draft',
    priority                order_priority_enum     NOT NULL DEFAULT 'normal',
    total_amount            NUMERIC(16,2)           NOT NULL DEFAULT 0.00,
    currency                VARCHAR(10)             NOT NULL DEFAULT 'USD',
    delivery_address        TEXT,
    required_by_date        DATE,
    expected_delivery_date  DATE,
    special_instructions    TEXT,
    grn_confirmed           BOOLEAN                 NOT NULL DEFAULT FALSE,
    grn_confirmed_at        TIMESTAMPTZ,
    grn_confirmed_by        INT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_customer     FOREIGN KEY (customer_org_id)     REFERENCES organizations (id),
    CONSTRAINT fk_orders_manufacturer FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id),
    CONSTRAINT fk_orders_contract     FOREIGN KEY (contract_id)          REFERENCES contracts (id),
    CONSTRAINT fk_orders_created_by   FOREIGN KEY (created_by)           REFERENCES users (id),
    CONSTRAINT fk_orders_approved_by  FOREIGN KEY (approved_by)          REFERENCES users (id),
    CONSTRAINT fk_orders_grn_by       FOREIGN KEY (grn_confirmed_by)     REFERENCES users (id),
    CONSTRAINT uq_order_number        UNIQUE (order_number)
);

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_orders_customer     ON orders (customer_org_id);
CREATE INDEX idx_orders_manufacturer ON orders (manufacturer_org_id);
CREATE INDEX idx_orders_contract     ON orders (contract_id);
CREATE INDEX idx_orders_status       ON orders (status);
CREATE INDEX idx_orders_created_at   ON orders (created_at DESC);


CREATE TABLE order_items (
    id                  SERIAL              PRIMARY KEY,
    order_id            INT                 NOT NULL,
    product_id          INT                 NOT NULL,
    contract_pricing_id INT                 NOT NULL,  -- locks price at order time
    quantity            INT                 NOT NULL CHECK (quantity > 0),
    shipped_qty         NUMERIC(12,3)       NOT NULL DEFAULT 0,  -- vendor: partial shipment tracking
    unit                VARCHAR(50),
    unit_price          NUMERIC(12, 4)      NOT NULL CHECK (unit_price >= 0), -- snapshot price
    gst_percentage      NUMERIC(5,2)        NOT NULL DEFAULT 0.00,
    notes               TEXT,
    CONSTRAINT fk_oi_order           FOREIGN KEY (order_id)            REFERENCES orders (id)                   ON DELETE CASCADE,
    CONSTRAINT fk_oi_product         FOREIGN KEY (product_id)          REFERENCES products (id),
    CONSTRAINT fk_oi_contract_pricing FOREIGN KEY (contract_pricing_id) REFERENCES contract_product_pricing (id)
);

-- [FIX-01] PostgreSQL does not support GENERATED ALWAYS AS with cross-table refs;
--           total_price is computed in application layer or via a view.
CREATE VIEW v_order_items_with_total AS
    SELECT
        oi.*,
        (oi.quantity * oi.unit_price)::NUMERIC(14,4) AS total_price
    FROM order_items oi;

CREATE INDEX idx_oi_order_id   ON order_items (order_id);
CREATE INDEX idx_oi_product_id ON order_items (product_id);


CREATE TABLE order_status_history (
    id              BIGSERIAL       PRIMARY KEY,
    order_id        INT             NOT NULL,
    changed_by      INT             NOT NULL,
    previous_status VARCHAR(50),
    new_status      VARCHAR(50)     NOT NULL,
    note            TEXT,
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_osh_order      FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_osh_changed_by FOREIGN KEY (changed_by) REFERENCES users (id)
);

CREATE INDEX idx_osh_order_id   ON order_status_history (order_id);
CREATE INDEX idx_osh_changed_at ON order_status_history (changed_at DESC);


-- =============================================================
-- 6. TRANSACTION & FINANCIAL TOOLS
-- =============================================================

CREATE TABLE payment_profiles (
    id                  SERIAL                  PRIMARY KEY,
    customer_org_id     INT                     NOT NULL,
    profile_name        VARCHAR(255)            NOT NULL,
    payment_method      payment_method_enum     NOT NULL,
    is_default          BOOLEAN                 NOT NULL DEFAULT FALSE,
    details_encrypted   JSONB,                  -- [FIX-10]
    billing_address     TEXT,
    is_active           BOOLEAN                 NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pp_org FOREIGN KEY (customer_org_id) REFERENCES organizations (id)
);

CREATE INDEX idx_pp_customer ON payment_profiles (customer_org_id);

-- Only one default payment profile per customer
CREATE UNIQUE INDEX uq_pp_default
    ON payment_profiles (customer_org_id)
    WHERE is_default = TRUE AND is_active = TRUE;


CREATE TABLE invoices (
    id                  SERIAL                  PRIMARY KEY,
    invoice_number      VARCHAR(100)            NOT NULL,
    order_id            INT                     NOT NULL,
    issued_by_org_id    INT                     NOT NULL,
    billed_to_org_id    INT                     NOT NULL,
    subtotal            NUMERIC(14, 4)          NOT NULL CHECK (subtotal >= 0),
    tax_amount          NUMERIC(14, 4)          NOT NULL DEFAULT 0.0000 CHECK (tax_amount >= 0),
    discount_amount     NUMERIC(14, 4)          NOT NULL DEFAULT 0.0000 CHECK (discount_amount >= 0),
    total_amount        NUMERIC(14, 4)          NOT NULL CHECK (total_amount >= 0),
    currency            VARCHAR(10)             NOT NULL DEFAULT 'USD',
    status              invoice_status_enum     NOT NULL DEFAULT 'draft',
    issue_date          DATE                    NOT NULL,
    due_date            DATE                    NOT NULL,
    document_url        VARCHAR(500),
    notes               TEXT,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_inv_order          FOREIGN KEY (order_id)          REFERENCES orders (id),
    CONSTRAINT fk_inv_issued_by      FOREIGN KEY (issued_by_org_id)  REFERENCES organizations (id),
    CONSTRAINT fk_inv_billed_to      FOREIGN KEY (billed_to_org_id)  REFERENCES organizations (id),
    CONSTRAINT uq_invoice_number     UNIQUE (invoice_number),
    CONSTRAINT chk_inv_due_date      CHECK (due_date >= issue_date),
    CONSTRAINT chk_inv_total         CHECK (total_amount = subtotal + tax_amount - discount_amount)
);

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_inv_order_id      ON invoices (order_id);
CREATE INDEX idx_inv_billed_to     ON invoices (billed_to_org_id);
CREATE INDEX idx_inv_status        ON invoices (status);
CREATE INDEX idx_inv_due_date      ON invoices (due_date) WHERE status NOT IN ('paid','cancelled');


CREATE TABLE payments (
    id                    SERIAL                  PRIMARY KEY,
    invoice_id            INT                     NOT NULL,
    payment_profile_id    INT,
    transaction_reference VARCHAR(255),
    amount                NUMERIC(14, 4)          NOT NULL CHECK (amount > 0),
    currency              VARCHAR(10)             NOT NULL DEFAULT 'USD',
    payment_method        payment_method_enum     NOT NULL,
    status                payment_status_enum     NOT NULL DEFAULT 'pending',
    payment_date          TIMESTAMPTZ,
    notes                 TEXT,
    created_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pay_invoice  FOREIGN KEY (invoice_id)         REFERENCES invoices (id),
    CONSTRAINT fk_pay_profile  FOREIGN KEY (payment_profile_id) REFERENCES payment_profiles (id),
    CONSTRAINT uq_pay_tx_ref   UNIQUE (transaction_reference)
);

CREATE INDEX idx_pay_invoice_id ON payments (invoice_id);
CREATE INDEX idx_pay_status     ON payments (status);


-- =============================================================
-- 7. SHIPMENT & DELIVERY TRACKING
-- =============================================================

CREATE TABLE shipments (
    id                      SERIAL                  PRIMARY KEY,
    shipment_number         VARCHAR(100)            NOT NULL,
    order_id                INT                     NOT NULL,
    manufacturer_org_id     INT,                    -- vendor portal: direct FK for performance
    customer_org_id         INT,                    -- vendor portal: direct FK for performance
    is_partial              BOOLEAN                 NOT NULL DEFAULT FALSE,
    origin_logistics_id     INT,
    carrier                 VARCHAR(255),
    tracking_number         VARCHAR(255),
    tracking_url            VARCHAR(500),
    service_type            VARCHAR(100),
    incoterm                VARCHAR(50),
    status                  shipment_status_enum    NOT NULL DEFAULT 'pending',
    dispatched_by           INT,                    -- [FIX-05] user who marked as shipped
    shipped_at              TIMESTAMPTZ,            -- actual dispatch date/time
    estimated_delivery_date DATE,
    actual_delivery_date    DATE,
    vehicle_number          VARCHAR(50),
    eway_bill_number        VARCHAR(100),           -- Indian e-way bill compliance
    number_of_packages      INT,
    received_by             INT,                    -- user who confirmed receipt
    weight_kg               NUMERIC(8, 2)           CHECK (weight_kg > 0),
    dimensions_cm           VARCHAR(100),
    notes                   TEXT,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ship_order          FOREIGN KEY (order_id)            REFERENCES orders (id),
    CONSTRAINT fk_ship_logistics      FOREIGN KEY (origin_logistics_id) REFERENCES supply_chain_logistics (id),
    CONSTRAINT fk_ship_dispatched_by  FOREIGN KEY (dispatched_by)       REFERENCES users (id),
    CONSTRAINT fk_ship_received_by    FOREIGN KEY (received_by)         REFERENCES users (id),
    CONSTRAINT fk_ship_manufacturer   FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id),
    CONSTRAINT fk_ship_customer       FOREIGN KEY (customer_org_id)     REFERENCES organizations (id),
    CONSTRAINT uq_shipment_number     UNIQUE (shipment_number)
);

CREATE TRIGGER trg_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_ship_order_id  ON shipments (order_id);
CREATE INDEX idx_ship_status    ON shipments (status);
CREATE INDEX idx_ship_carrier   ON shipments (carrier);


CREATE TABLE shipment_events (
    id              BIGSERIAL           PRIMARY KEY,
    shipment_id     INT                 NOT NULL,
    event_type      VARCHAR(100)        NOT NULL,
    location        VARCHAR(255),
    description     TEXT,
    event_timestamp TIMESTAMPTZ         NOT NULL,
    source          event_source_enum   NOT NULL DEFAULT 'system',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_se_shipment FOREIGN KEY (shipment_id) REFERENCES shipments (id) ON DELETE CASCADE
);

CREATE INDEX idx_se_shipment_id     ON shipment_events (shipment_id);
CREATE INDEX idx_se_event_timestamp ON shipment_events (event_timestamp DESC);


CREATE TABLE delivery_confirmations (
    id                      SERIAL          PRIMARY KEY,
    shipment_id             INT             NOT NULL,
    confirmed_by            INT             NOT NULL,  -- seller or receiver user_id
    signature_url           VARCHAR(500),
    proof_of_delivery_url   VARCHAR(500),
    notes                   TEXT,
    confirmed_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_dc_shipment     FOREIGN KEY (shipment_id)  REFERENCES shipments (id),
    CONSTRAINT fk_dc_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users (id),
    CONSTRAINT uq_dc_shipment     UNIQUE (shipment_id)       -- one confirmation per shipment
);

CREATE INDEX idx_dc_shipment_id ON delivery_confirmations (shipment_id);


-- =============================================================
-- 8. SUPPORT & COMPLAINT RESOLUTION
-- =============================================================

CREATE TABLE support_tickets (
    id                      SERIAL                  PRIMARY KEY,
    ticket_number           VARCHAR(100)            NOT NULL,
    raised_by_user_id       INT                     NOT NULL,
    raised_by_org_id        INT                     NOT NULL,
    assigned_to_user_id     INT,
    related_order_id        INT,
    related_shipment_id     INT,
    related_invoice_id      INT,
    category                ticket_cat_enum         NOT NULL,
    priority                priority_enum           NOT NULL DEFAULT 'medium',
    subject                 VARCHAR(500)            NOT NULL,
    description             TEXT                    NOT NULL,
    status                  ticket_status_enum      NOT NULL DEFAULT 'open',
    dispute_id              INT,                    -- set when ticket escalates to formal dispute (vendor portal)
    resolved_at             TIMESTAMPTZ,
    resolution_notes        TEXT,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_st_raised_by_user  FOREIGN KEY (raised_by_user_id)    REFERENCES users (id),
    CONSTRAINT fk_st_raised_by_org   FOREIGN KEY (raised_by_org_id)     REFERENCES organizations (id),
    CONSTRAINT fk_st_assigned_to     FOREIGN KEY (assigned_to_user_id)  REFERENCES users (id),
    CONSTRAINT fk_st_order           FOREIGN KEY (related_order_id)     REFERENCES orders (id),
    CONSTRAINT fk_st_shipment        FOREIGN KEY (related_shipment_id)  REFERENCES shipments (id),
    CONSTRAINT fk_st_invoice         FOREIGN KEY (related_invoice_id)   REFERENCES invoices (id),
    CONSTRAINT uq_ticket_number      UNIQUE (ticket_number)
);

CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_st_raised_by_user ON support_tickets (raised_by_user_id);
CREATE INDEX idx_st_raised_by_org  ON support_tickets (raised_by_org_id);
CREATE INDEX idx_st_assigned_to    ON support_tickets (assigned_to_user_id);
CREATE INDEX idx_st_status         ON support_tickets (status);
CREATE INDEX idx_st_category       ON support_tickets (category);
CREATE INDEX idx_st_priority       ON support_tickets (priority);


CREATE TABLE ticket_messages (
    id                  BIGSERIAL       PRIMARY KEY,
    ticket_id           INT             NOT NULL,
    sent_by_user_id     INT             NOT NULL,
    reply_to_message_id BIGINT,                     -- [FIX-09] buyer reply threading
    message             TEXT            NOT NULL,
    attachments         JSONB,                      -- [FIX-10] array of file URLs
    is_internal_note    BOOLEAN         NOT NULL DEFAULT FALSE, -- hidden from buyers
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tm_ticket          FOREIGN KEY (ticket_id)           REFERENCES support_tickets (id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_sent_by         FOREIGN KEY (sent_by_user_id)     REFERENCES users (id),
    CONSTRAINT fk_tm_reply_to        FOREIGN KEY (reply_to_message_id) REFERENCES ticket_messages (id)
);

CREATE INDEX idx_tm_ticket_id    ON ticket_messages (ticket_id);
CREATE INDEX idx_tm_sent_by      ON ticket_messages (sent_by_user_id);
CREATE INDEX idx_tm_internal     ON ticket_messages (ticket_id) WHERE is_internal_note = FALSE;


CREATE TABLE ticket_status_history (
    id              BIGSERIAL       PRIMARY KEY,
    ticket_id       INT             NOT NULL,
    changed_by      INT             NOT NULL,
    previous_status VARCHAR(50),
    new_status      VARCHAR(50)     NOT NULL,
    note            TEXT,
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tsh_ticket     FOREIGN KEY (ticket_id)   REFERENCES support_tickets (id) ON DELETE CASCADE,
    CONSTRAINT fk_tsh_changed_by FOREIGN KEY (changed_by)  REFERENCES users (id)
);

CREATE INDEX idx_tsh_ticket_id  ON ticket_status_history (ticket_id);
CREATE INDEX idx_tsh_changed_at ON ticket_status_history (changed_at DESC);


-- =============================================================
-- 9. ANALYSIS DASHBOARD  (Module 4)
-- =============================================================
-- [FIX-07] The original schema had no Analysis Dashboard backing store.
--          Live KPIs are derived via the views below.
--          dashboard_snapshots caches daily aggregates for fast loading.

-- Daily pre-aggregated snapshot (populated by a scheduled job / pg_cron)
CREATE TABLE dashboard_snapshots (
    id                          BIGSERIAL       PRIMARY KEY,
    manufacturer_org_id         INT             NOT NULL,
    snapshot_date               DATE            NOT NULL,
    -- Sales & Orders
    total_orders                INT             NOT NULL DEFAULT 0,
    orders_confirmed            INT             NOT NULL DEFAULT 0,
    orders_processing           INT             NOT NULL DEFAULT 0,
    orders_shipped              INT             NOT NULL DEFAULT 0,
    orders_delivered            INT             NOT NULL DEFAULT 0,
    orders_cancelled            INT             NOT NULL DEFAULT 0,
    gross_sales_amount          NUMERIC(16, 4)  NOT NULL DEFAULT 0,
    -- Operational
    avg_dispatch_hours          NUMERIC(8, 2),  -- avg time from confirmed to shipped
    fulfilment_rate_pct         NUMERIC(5, 2),  -- delivered / (delivered + cancelled + failed)
    open_support_tickets        INT             NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ds_org            FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id),
    CONSTRAINT uq_ds_org_date       UNIQUE (manufacturer_org_id, snapshot_date)
);

CREATE INDEX idx_ds_org_date ON dashboard_snapshots (manufacturer_org_id, snapshot_date DESC);


-- Live view: monthly sales trend per manufacturer (feeds trend chart)
CREATE VIEW v_monthly_sales_trend AS
SELECT
    o.manufacturer_org_id,
    DATE_TRUNC('month', o.created_at)::DATE     AS month,
    COUNT(o.id)                                 AS order_count,
    SUM(oi.quantity * oi.unit_price)            AS gross_sales
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status NOT IN ('cancelled', 'disputed')
GROUP BY o.manufacturer_org_id, DATE_TRUNC('month', o.created_at);


-- Live view: top 10 products by revenue per manufacturer
CREATE VIEW v_top_products AS
SELECT
    p.manufacturer_org_id,
    p.id                                        AS product_id,
    p.name                                      AS product_name,
    p.sku,
    SUM(oi.quantity)                            AS units_sold,
    SUM(oi.quantity * oi.unit_price)            AS total_revenue
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders   o ON o.id = oi.order_id
WHERE o.status NOT IN ('cancelled', 'disputed')
GROUP BY p.manufacturer_org_id, p.id, p.name, p.sku;


-- Live view: dispatch timeline (confirmed → shipped lag)
CREATE VIEW v_dispatch_timeline AS
SELECT
    o.manufacturer_org_id,
    o.id                                                    AS order_id,
    o.order_number,
    MIN(CASE WHEN osh.new_status = 'confirmed' THEN osh.changed_at END) AS confirmed_at,
    MIN(CASE WHEN osh.new_status = 'shipped'   THEN osh.changed_at END) AS shipped_at,
    EXTRACT(EPOCH FROM (
        MIN(CASE WHEN osh.new_status = 'shipped'   THEN osh.changed_at END)
      - MIN(CASE WHEN osh.new_status = 'confirmed' THEN osh.changed_at END)
    )) / 3600                                               AS dispatch_hours
FROM orders o
JOIN order_status_history osh ON osh.order_id = o.id
GROUP BY o.manufacturer_org_id, o.id, o.order_number;


-- =============================================================
-- 10. CRM (out-of-scope for requirements — retained for reference)
-- NOTE: These tables are NOT referenced in Requirements_Document.docx.
--       Module 4 in requirements is "Analysis Dashboard", not CRM.
--       Retain only if a separate CRM feature is planned.
-- =============================================================

CREATE TABLE crm_interactions (
    id                      SERIAL                  PRIMARY KEY,
    org_id                  INT                     NOT NULL,
    performed_by_user_id    INT                     NOT NULL,
    interaction_type        crm_interaction_enum    NOT NULL,
    subject                 VARCHAR(500),
    summary                 TEXT,
    outcome                 TEXT,
    related_contract_id     INT,
    related_order_id        INT,
    interaction_date        TIMESTAMPTZ             NOT NULL,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ci_org          FOREIGN KEY (org_id)               REFERENCES organizations (id),
    CONSTRAINT fk_ci_performed_by FOREIGN KEY (performed_by_user_id) REFERENCES users (id),
    CONSTRAINT fk_ci_contract     FOREIGN KEY (related_contract_id)  REFERENCES contracts (id),
    CONSTRAINT fk_ci_order        FOREIGN KEY (related_order_id)     REFERENCES orders (id)
);

CREATE INDEX idx_ci_org_id           ON crm_interactions (org_id);
CREATE INDEX idx_ci_interaction_date ON crm_interactions (interaction_date DESC);


CREATE TABLE crm_tasks (
    id                      SERIAL                  PRIMARY KEY,
    org_id                  INT                     NOT NULL,
    assigned_to_user_id     INT                     NOT NULL,
    created_by_user_id      INT                     NOT NULL,
    title                   VARCHAR(500)            NOT NULL,
    description             TEXT,
    task_type               crm_task_type_enum      NOT NULL DEFAULT 'other',
    priority                priority_enum           NOT NULL DEFAULT 'medium',
    status                  crm_task_status_enum    NOT NULL DEFAULT 'pending',
    due_date                DATE,
    completed_at            TIMESTAMPTZ,
    related_contract_id     INT,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ct_org          FOREIGN KEY (org_id)               REFERENCES organizations (id),
    CONSTRAINT fk_ct_assigned_to  FOREIGN KEY (assigned_to_user_id)  REFERENCES users (id),
    CONSTRAINT fk_ct_created_by   FOREIGN KEY (created_by_user_id)   REFERENCES users (id),
    CONSTRAINT fk_ct_contract     FOREIGN KEY (related_contract_id)  REFERENCES contracts (id)
);

CREATE TRIGGER trg_crm_tasks_updated_at
    BEFORE UPDATE ON crm_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_ct_org_id       ON crm_tasks (org_id);
CREATE INDEX idx_ct_assigned_to  ON crm_tasks (assigned_to_user_id);
CREATE INDEX idx_ct_status       ON crm_tasks (status);


CREATE TABLE crm_notes (
    id                  SERIAL          PRIMARY KEY,
    org_id              INT             NOT NULL,
    created_by_user_id  INT             NOT NULL,
    note                TEXT            NOT NULL,
    is_pinned           BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cn_org        FOREIGN KEY (org_id)              REFERENCES organizations (id),
    CONSTRAINT fk_cn_created_by FOREIGN KEY (created_by_user_id)  REFERENCES users (id)
);

CREATE TRIGGER trg_crm_notes_updated_at
    BEFORE UPDATE ON crm_notes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_cn_org_id   ON crm_notes (org_id);
CREATE INDEX idx_cn_is_pinned ON crm_notes (org_id) WHERE is_pinned = TRUE;


-- =============================================================
-- 11. VENDOR PORTAL — PLATFORM ADMINISTRATION
-- Tables below are owned by the Vendor Portal team.
-- Customer Portal reads shared tables only; does not write here.
-- =============================================================

CREATE TABLE admins (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    email           VARCHAR(150)    NOT NULL,
    role            VARCHAR(50)     NOT NULL DEFAULT 'admin',
    access_level    SMALLINT        NOT NULL DEFAULT 1,
    password_hash   VARCHAR(255)    NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'active',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_admins_email  UNIQUE (email),
    CONSTRAINT chk_admin_status CHECK (status IN ('active', 'suspended'))
);

CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_admins_status    ON admins (status);
CREATE INDEX idx_admins_is_active ON admins (is_active);


-- =============================================================
-- 12. VENDOR PORTAL — AUDIT LOG
-- =============================================================

CREATE TABLE audit_logs (
    id              BIGSERIAL       PRIMARY KEY,
    entity_type     VARCHAR(50)     NOT NULL,
    entity_id       INT             NOT NULL,
    action          VARCHAR(30)     NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    changed_by      INT,
    changed_by_org  INT,
    ip_address      INET,
    user_agent      VARCHAR(512),
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity     ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_changed_at ON audit_logs (changed_at DESC);
CREATE INDEX idx_audit_changed_by ON audit_logs (changed_by);


-- =============================================================
-- 13. VENDOR PORTAL — DOCUMENTS (KYC / VERIFICATION)
-- =============================================================

CREATE TABLE documents (
    id              SERIAL                  PRIMARY KEY,
    org_id          INT                     NOT NULL,
    document_type   VARCHAR(50)             NOT NULL,
    document_name   VARCHAR(255)            NOT NULL,
    file_url        VARCHAR(500)            NOT NULL,
    verify_status   verify_status_enum      NOT NULL DEFAULT 'pending',
    is_verified     BOOLEAN                 NOT NULL DEFAULT FALSE,
    verified_by     INT,
    verified_at     TIMESTAMPTZ,
    uploaded_at     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT fk_docs_org         FOREIGN KEY (org_id)      REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_docs_verified_by FOREIGN KEY (verified_by) REFERENCES admins (id)        ON DELETE SET NULL
);

CREATE INDEX idx_docs_org_id   ON documents (org_id);
CREATE INDEX idx_docs_type     ON documents (document_type);
CREATE INDEX idx_docs_verified ON documents (is_verified);


-- =============================================================
-- 14. VENDOR PORTAL — VENDOR BANKING
-- =============================================================

CREATE TABLE vendor_bank_accounts (
    id              SERIAL          PRIMARY KEY,
    org_id          INT             NOT NULL,
    account_name    VARCHAR(255)    NOT NULL,
    account_number  VARCHAR(50)     NOT NULL,
    ifsc_code       VARCHAR(20)     NOT NULL,
    bank_name       VARCHAR(255),
    branch          VARCHAR(255),
    is_primary      BOOLEAN         NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    verified_by     INT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT fk_vba_org         FOREIGN KEY (org_id)      REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_vba_verified_by FOREIGN KEY (verified_by) REFERENCES admins (id)        ON DELETE SET NULL
);

CREATE INDEX idx_vba_org_id    ON vendor_bank_accounts (org_id);
CREATE INDEX idx_vba_is_primary ON vendor_bank_accounts (is_primary);


-- =============================================================
-- 15. VENDOR PORTAL — INVENTORY
-- =============================================================

CREATE TABLE inventory (
    id                  SERIAL              PRIMARY KEY,
    org_id              INT                 NOT NULL,
    product_id          INT                 NOT NULL,
    available_stock     NUMERIC(14,3)       NOT NULL DEFAULT 0,
    reserved_for_po     NUMERIC(14,3)       NOT NULL DEFAULT 0,
    in_transit          NUMERIC(14,3)       NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(14,3)       NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inv_org_product UNIQUE (org_id, product_id),
    CONSTRAINT fk_inv_org         FOREIGN KEY (org_id)      REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_product     FOREIGN KEY (product_id)  REFERENCES products (id)     ON DELETE RESTRICT
);

CREATE TRIGGER trg_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_inv_org_id ON inventory (org_id);


-- =============================================================
-- 16. VENDOR PORTAL — RFQ & SOURCING
-- =============================================================

CREATE TABLE rfq (
    id                      SERIAL              PRIMARY KEY,
    org_id                  INT                 NOT NULL,
    title                   VARCHAR(255)        NOT NULL,
    description             TEXT,
    category_id             INT,
    location_filter         VARCHAR(100),
    min_vendor_rating       NUMERIC(3,2),
    deadline                TIMESTAMPTZ         NOT NULL,
    deadline_extended_to    TIMESTAMPTZ,
    is_priority             BOOLEAN             NOT NULL DEFAULT FALSE,
    status                  rfq_status_enum     NOT NULL DEFAULT 'draft',
    cancellation_reason     TEXT,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    CONSTRAINT fk_rfq_org      FOREIGN KEY (org_id)      REFERENCES organizations (id)    ON DELETE RESTRICT,
    CONSTRAINT fk_rfq_category FOREIGN KEY (category_id) REFERENCES product_categories (id) ON DELETE SET NULL
);

CREATE TRIGGER trg_rfq_updated_at
    BEFORE UPDATE ON rfq
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_rfq_org_id ON rfq (org_id);
CREATE INDEX idx_rfq_status ON rfq (status);


CREATE OR REPLACE FUNCTION fn_validate_rfq_broadcast_vendor()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organizations
        WHERE id = NEW.manufacturer_org_id
          AND org_type = 'manufacturer'
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'RFQ broadcast target must be a manufacturer org';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TABLE rfq_broadcast (
    id                  SERIAL      PRIMARY KEY,
    rfq_id              INT         NOT NULL,
    manufacturer_org_id INT         NOT NULL,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewed              BOOLEAN     NOT NULL DEFAULT FALSE,
    responded           BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_rfq_broadcast     UNIQUE (rfq_id, manufacturer_org_id),
    CONSTRAINT fk_rfqb_rfq          FOREIGN KEY (rfq_id)              REFERENCES rfq (id)           ON DELETE CASCADE,
    CONSTRAINT fk_rfqb_manufacturer FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_rfq_broadcast_vendor_check
    BEFORE INSERT ON rfq_broadcast
    FOR EACH ROW EXECUTE FUNCTION fn_validate_rfq_broadcast_vendor();

CREATE INDEX idx_rfqb_rfq_id          ON rfq_broadcast (rfq_id);
CREATE INDEX idx_rfqb_manufacturer_org ON rfq_broadcast (manufacturer_org_id);


CREATE TABLE quotes (
    id                  SERIAL          PRIMARY KEY,
    rfq_id              INT             NOT NULL,
    manufacturer_org_id INT             NOT NULL,
    price               NUMERIC(14,2)   NOT NULL,
    lead_time_days      INT             NOT NULL,
    compliance_notes    TEXT,
    version             SMALLINT        NOT NULL DEFAULT 1,
    is_locked           BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT fk_quotes_rfq          FOREIGN KEY (rfq_id)              REFERENCES rfq (id)           ON DELETE CASCADE,
    CONSTRAINT fk_quotes_manufacturer FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id) ON DELETE RESTRICT
);

CREATE INDEX idx_quotes_rfq_id          ON quotes (rfq_id);
CREATE INDEX idx_quotes_manufacturer_org ON quotes (manufacturer_org_id);


-- =============================================================
-- 17. VENDOR PORTAL — PO NEGOTIATIONS
-- =============================================================

CREATE TABLE po_negotiations (
    id                      SERIAL          PRIMARY KEY,
    order_id                INT             NOT NULL,
    round_number            SMALLINT        NOT NULL DEFAULT 1,
    initiated_by            VARCHAR(20)     NOT NULL CHECK (initiated_by IN ('buyer', 'vendor')),
    initiated_by_user_id    INT             NOT NULL,
    counter_quantity        NUMERIC(12,3),
    counter_price           NUMERIC(14,2),
    counter_delivery_date   DATE,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'rejected')),
    note                    TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pon_order    FOREIGN KEY (order_id)             REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_pon_user     FOREIGN KEY (initiated_by_user_id) REFERENCES users (id)  ON DELETE RESTRICT
);

CREATE INDEX idx_pon_order_id ON po_negotiations (order_id);


-- =============================================================
-- 18. VENDOR PORTAL — PAYOUTS
-- =============================================================

CREATE TABLE vendor_payouts (
    id                  SERIAL                  PRIMARY KEY,
    manufacturer_org_id INT                     NOT NULL,
    invoice_id          INT                     NOT NULL,
    gross_amount        NUMERIC(16,4)           NOT NULL,
    platform_fee        NUMERIC(16,4)           NOT NULL DEFAULT 0,
    tax_deducted        NUMERIC(16,4)           NOT NULL DEFAULT 0,
    net_payout          NUMERIC(16,4)           NOT NULL,
    status              payout_status_enum      NOT NULL DEFAULT 'scheduled',
    scheduled_date      DATE,
    processed_at        TIMESTAMPTZ,
    bank_account_id     INT,
    reference_number    VARCHAR(100),
    notes               TEXT,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_vp_manufacturer FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id)    ON DELETE RESTRICT,
    CONSTRAINT fk_vp_invoice      FOREIGN KEY (invoice_id)          REFERENCES invoices (id)          ON DELETE RESTRICT,
    CONSTRAINT fk_vp_bank_account FOREIGN KEY (bank_account_id)     REFERENCES vendor_bank_accounts (id) ON DELETE SET NULL
);

CREATE TRIGGER trg_vendor_payouts_updated_at
    BEFORE UPDATE ON vendor_payouts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_vp_manufacturer_org ON vendor_payouts (manufacturer_org_id);
CREATE INDEX idx_vp_status           ON vendor_payouts (status);


-- =============================================================
-- 19. VENDOR PORTAL — DISPUTES (RMA / FORMAL DISPUTE)
-- Separate from support_tickets (customer portal general support).
-- Link: support_tickets.dispute_id → disputes.id (escalation path).
-- =============================================================

CREATE TABLE disputes (
    id                  SERIAL                  PRIMARY KEY,
    order_id            INT                     NOT NULL,
    customer_org_id     INT                     NOT NULL,
    manufacturer_org_id INT                     NOT NULL,
    rma_number          VARCHAR(50)             NOT NULL,
    dispute_type        VARCHAR(30)             NOT NULL,
    category            VARCHAR(30),
    description         TEXT,
    is_partial          BOOLEAN                 NOT NULL DEFAULT FALSE,
    status              ticket_status_enum      NOT NULL DEFAULT 'requested',
    resolution_type     VARCHAR(30),
    mediator_id         INT,
    raised_by           INT,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT uq_disputes_rma          UNIQUE (rma_number),
    CONSTRAINT fk_disputes_order        FOREIGN KEY (order_id)            REFERENCES orders (id)        ON DELETE RESTRICT,
    CONSTRAINT fk_disputes_customer     FOREIGN KEY (customer_org_id)     REFERENCES organizations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_disputes_manufacturer FOREIGN KEY (manufacturer_org_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_disputes_mediator     FOREIGN KEY (mediator_id)         REFERENCES admins (id)        ON DELETE SET NULL,
    CONSTRAINT fk_disputes_raised_by    FOREIGN KEY (raised_by)           REFERENCES users (id)         ON DELETE SET NULL
);

CREATE TRIGGER trg_disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE INDEX idx_disputes_order_id          ON disputes (order_id);
CREATE INDEX idx_disputes_manufacturer_org  ON disputes (manufacturer_org_id);
CREATE INDEX idx_disputes_status            ON disputes (status);

-- Now that disputes table exists, add the FK from support_tickets
ALTER TABLE support_tickets
    ADD CONSTRAINT fk_st_dispute FOREIGN KEY (dispute_id) REFERENCES disputes (id) ON DELETE SET NULL;


-- =============================================================
-- 20. VENDOR PORTAL — REFUNDS
-- =============================================================

CREATE TABLE refunds (
    id           SERIAL                  PRIMARY KEY,
    invoice_id   INT                     NOT NULL,
    dispute_id   INT,
    refund_type  VARCHAR(10)             NOT NULL,
    amount       NUMERIC(14,4)           NOT NULL,
    status       refund_status_enum      NOT NULL DEFAULT 'initiated',
    approved_by  INT,
    initiated_at TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT fk_refunds_invoice    FOREIGN KEY (invoice_id)  REFERENCES invoices (id)  ON DELETE RESTRICT,
    CONSTRAINT fk_refunds_dispute    FOREIGN KEY (dispute_id)  REFERENCES disputes (id)  ON DELETE SET NULL,
    CONSTRAINT fk_refunds_approved   FOREIGN KEY (approved_by) REFERENCES admins (id)    ON DELETE SET NULL
);

CREATE INDEX idx_refunds_invoice_id ON refunds (invoice_id);
CREATE INDEX idx_refunds_status     ON refunds (status);