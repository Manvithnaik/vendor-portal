-- ============================================================
--  REFACTORED PLATFORM DATABASE
--  Project  : Manufacturer-Vendor Platform (MVP)
--  Dialect  : MySQL 8.0+  (InnoDB, utf8mb4)
--  Version  : 2.0  –  Refactored & Simplified
--
--  CHANGES FROM v1.0 (80 tables → 35 tables):
--
--  REMOVED entirely:
--    - All analytics/reporting tables (vendor_performance_metrics,
--      vendor_revenue_analytics, manufacturer_recently_viewed,
--      manufacturer_dashboard_bookmarks) → offload to BI tools
--    - Forecasting (manufacturer_forecasts)
--    - CRM tables (manufacturer_vendor_notes, manufacturer_vendor_shortlist,
--      manufacturer_product_bookmarks, sample_submissions)
--    - Excessive audit/history tables (po_status_history, shipment_status_history,
--      return_status_logs, contract_history, admin_activity_logs) →
--      keep only essential status fields on parent tables
--    - Batch/lot traceability (batch_lot_traceability) → enterprise feature
--    - Warehouse locations (warehouse_locations) → enterprise feature
--    - Rate contracts (rate_contracts, rate_contract_revisions) →
--      merged into contracts
--    - Separate session tables (manufacturer_sessions, vendor_sessions) →
--      single sessions table
--    - Password reset tables → single password_resets table
--    - Material test reports (material_test_reports) → file_url on product
--    - Low stock alerts (low_stock_alerts) → threshold check on inventory
--    - Vendor capacity (vendor_capacity) → enterprise feature
--    - Carrier table (carriers) → inline on shipments
--    - RFQ reminders, cancellations, extensions → status field + notes on rfq
--    - Negotiation chat (rfq_negotiation_chat) → merged into messages
--    - Delivery confirmation → merged into shipments (condition_status field)
--    - Shipment documents → merged into shipment (document_url field)
--    - Shipment items → merged into po_line_items (shipped_qty field)
--    - Material MOQ and tiered pricing → simplified into products table
--    - Vendor submissions (versioned re-applications) → approval_status on vendors
--    - Contract terms, documents, signatures → merged/simplified
--    - Platform commissions → single field on vendor_payouts
--    - Vendor manufacturer relationships → derived from PO history
--    - Message threads + messages → single messages table with thread_id
--
--  MERGED:
--    - manufacturer_team_members + vendor_users → users (role-based)
--    - manufacturer_roles + vendor_users.role → users.role (VARCHAR)
--    - return_requests + disputes → disputes (unified)
--    - shipment_tracking + shipment_status_history → shipments (status + tracking_number)
--    - material_pricing + material_moq → products (base_price, moq fields)
--    - manufacturer_notification_preferences → notifications (per-record)
--    - manufacturer_documents + vendor_documents → documents (entity-polymorphic)
--    - manufacturer_profiles → manufacturers (inline fields)
--
--  RENAMED:
--    - raw_materials → products
--    - material_id  → product_id
-- ============================================================

CREATE DATABASE IF NOT EXISTS platform_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE platform_db;

-- ============================================================
-- MODULE 1 — AUTH & USERS
-- Tables: admins, users, sessions, password_resets
-- ============================================================

-- --------------------------
-- 1.1 ADMINS
-- Platform super-admins. Kept separate from users intentionally
-- (different auth flow, higher privileges, no vendor/manufacturer affiliation).
-- --------------------------
CREATE TABLE admins (
    admin_id      INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'admin',  -- 'super_admin' | 'admin'
    access_level  TINYINT      NOT NULL DEFAULT 1,        -- 1=read, 2=write, 3=full
    password_hash VARCHAR(255) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'deactivated'
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP    NULL,

    PRIMARY KEY (admin_id),
    UNIQUE KEY uq_admins_email (email),
    INDEX idx_admins_status (status)
) COMMENT='Platform super-admin accounts';


-- --------------------------
-- 1.2 USERS
-- MERGED: manufacturer_team_members + vendor_users into one table.
-- entity_type + entity_id links user to their org (manufacturer or vendor).
-- role is a VARCHAR to avoid rigid ENUMs (e.g. 'admin','sales','accounts','dispatch','procurement').
-- --------------------------
CREATE TABLE users (
    user_id       INT          NOT NULL AUTO_INCREMENT,
    entity_type   VARCHAR(20)  NOT NULL,                  -- 'manufacturer' | 'vendor'
    entity_id     INT          NOT NULL,                  -- manufacturer_id or vendor_id
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    phone         VARCHAR(20)  NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'member', -- 'admin','sales','accounts','dispatch','procurement'
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP    NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP    NULL,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_entity (entity_type, entity_id),
    INDEX idx_users_role   (role)
) COMMENT='Unified team members for both manufacturer and vendor orgs (merged from manufacturer_team_members + vendor_users)';


-- --------------------------
-- 1.3 SESSIONS
-- MERGED: manufacturer_sessions + vendor_sessions into one table.
-- entity_type distinguishes actor type.
-- --------------------------
CREATE TABLE sessions (
    session_id  INT          NOT NULL AUTO_INCREMENT,
    actor_type  VARCHAR(20)  NOT NULL,                    -- 'admin' | 'manufacturer' | 'vendor' | 'user'
    actor_id    INT          NOT NULL,                    -- admin_id, manufacturer_id, vendor_id, or user_id
    token_hash  VARCHAR(255) NOT NULL,
    ip_address  VARCHAR(45)  NULL,
    user_agent  VARCHAR(512) NULL,
    expires_at  TIMESTAMP    NOT NULL,
    is_revoked  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (session_id),
    UNIQUE KEY uq_sessions_token (token_hash),
    INDEX idx_sessions_actor (actor_type, actor_id),
    INDEX idx_sessions_expires (expires_at)
) COMMENT='Unified login sessions for all actor types (merged from manufacturer_sessions + vendor_sessions)';


-- --------------------------
-- 1.4 PASSWORD RESETS
-- MERGED: manufacturer_password_resets + vendor_password_resets.
-- --------------------------
CREATE TABLE password_resets (
    reset_id    INT          NOT NULL AUTO_INCREMENT,
    actor_type  VARCHAR(20)  NOT NULL,   -- 'manufacturer' | 'vendor' | 'admin' | 'user'
    actor_id    INT          NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    channel     VARCHAR(10)  NOT NULL DEFAULT 'email',    -- 'email' | 'sms'
    is_used     BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (reset_id),
    INDEX idx_pr_actor (actor_type, actor_id),
    INDEX idx_pr_expires (expires_at)
) COMMENT='Password reset tokens for all actors (merged from manufacturer_password_resets + vendor_password_resets)';


-- ============================================================
-- MODULE 2 — MANUFACTURERS
-- Tables: manufacturers
-- REMOVED: manufacturer_sessions, manufacturer_password_resets (→ sessions/password_resets)
-- REMOVED: manufacturer_roles (→ users.role)
-- REMOVED: manufacturer_team_members (→ users)
-- REMOVED: manufacturer_notification_preferences (→ notifications)
-- MERGED:  manufacturer_profiles inline into manufacturers
-- ============================================================

-- --------------------------
-- 2.1 MANUFACTURERS
-- MERGED manufacturer_profiles fields directly here.
-- Removed: verified_by split; consolidated into verified_by → admins.
-- --------------------------
CREATE TABLE manufacturers (
    manufacturer_id     INT          NOT NULL AUTO_INCREMENT,
    company_name        VARCHAR(255) NOT NULL,
    email               VARCHAR(150) NOT NULL,
    phone               VARCHAR(20)  NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    industry_type       VARCHAR(100) NULL,
    gstin               VARCHAR(20)  NULL,
    pan                 VARCHAR(20)  NULL,

    -- Profile fields (merged from manufacturer_profiles)
    registered_address  TEXT         NULL,
    city                VARCHAR(100) NULL,
    state               VARCHAR(100) NULL,
    pincode             VARCHAR(10)  NULL,
    country             VARCHAR(100) NOT NULL DEFAULT 'India',
    contact_name        VARCHAR(150) NULL,
    contact_email       VARCHAR(150) NULL,
    contact_phone       VARCHAR(20)  NULL,
    logo_url            VARCHAR(500) NULL,
    website             VARCHAR(255) NULL,
    about               TEXT         NULL,

    -- Verification lifecycle
    verification_status VARCHAR(20)  NOT NULL DEFAULT 'pending', -- 'pending'|'approved'|'rejected'|'reapplied'
    rejection_reason    TEXT         NULL,
    reapply_allowed     BOOLEAN      NOT NULL DEFAULT FALSE,
    reapply_deadline    DATE         NULL,
    verified_at         TIMESTAMP    NULL,
    verified_by         INT          NULL,  -- → admins.admin_id

    is_active           BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMP    NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP    NULL,

    PRIMARY KEY (manufacturer_id),
    UNIQUE KEY uq_mfr_email (email),
    UNIQUE KEY uq_mfr_phone (phone),
    UNIQUE KEY uq_mfr_gstin (gstin),
    FOREIGN KEY fk_mfr_verified_by (verified_by) REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_mfr_status (verification_status)
) COMMENT='Master manufacturer accounts (profile merged in)';


-- --------------------------
-- 2.2 DOCUMENTS
-- MERGED: manufacturer_documents + vendor_documents into one polymorphic table.
-- entity_type + entity_id identifies owner (manufacturer or vendor).
-- --------------------------
CREATE TABLE documents (
    document_id   INT          NOT NULL AUTO_INCREMENT,
    entity_type   VARCHAR(20)  NOT NULL,  -- 'manufacturer' | 'vendor'
    entity_id     INT          NOT NULL,  -- manufacturer_id or vendor_id
    document_type VARCHAR(50)  NOT NULL,  -- 'gst_certificate'|'pan_card'|'factory_licence'|'incorporation_certificate'|'iso_certification'|'other'
    document_name VARCHAR(255) NOT NULL,
    file_url      VARCHAR(500) NOT NULL,
    is_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_by   INT          NULL,      -- → admins.admin_id
    verified_at   TIMESTAMP    NULL,
    uploaded_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP    NULL,

    PRIMARY KEY (document_id),
    FOREIGN KEY fk_doc_admin (verified_by) REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_doc_entity (entity_type, entity_id),
    INDEX idx_doc_verified (is_verified)
) COMMENT='Verification documents for manufacturers and vendors (merged from manufacturer_documents + vendor_documents)';


-- ============================================================
-- MODULE 3 — VENDORS
-- Tables: vendors
-- REMOVED: vendor_sessions, vendor_password_resets (→ sessions/password_resets)
-- REMOVED: vendor_users (→ users)
-- REMOVED: vendor_submissions (versioned reapply → single status field)
-- ============================================================

-- --------------------------
-- 3.1 VENDORS
-- --------------------------
CREATE TABLE vendors (
    vendor_id                  INT          NOT NULL AUTO_INCREMENT,
    company_name               VARCHAR(255) NOT NULL,
    email                      VARCHAR(150) NOT NULL,
    phone                      VARCHAR(20)  NULL,
    password_hash              VARCHAR(255) NOT NULL,
    gstin                      VARCHAR(15)  NULL,
    pan                        VARCHAR(10)  NULL,
    factory_address            TEXT         NULL,
    city                       VARCHAR(100) NULL,
    state                      VARCHAR(100) NULL,
    pincode                    VARCHAR(10)  NULL,
    country                    VARCHAR(100) NOT NULL DEFAULT 'India',
    authorised_signatory_name  VARCHAR(255) NULL,
    authorised_signatory_phone VARCHAR(20)  NULL,

    -- Onboarding lifecycle
    approval_status     VARCHAR(20)  NOT NULL DEFAULT 'pending', -- 'pending'|'approved'|'rejected'|'reapplied'
    rejection_reason    TEXT         NULL,
    reapply_allowed     BOOLEAN      NOT NULL DEFAULT FALSE,
    reapply_deadline    DATE         NULL,
    verified_by         INT          NULL,   -- → admins.admin_id
    verified_at         TIMESTAMP    NULL,

    is_active           BOOLEAN      NOT NULL DEFAULT FALSE,
    overall_rating      DECIMAL(3,2) NULL,
    last_login_at       TIMESTAMP    NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP    NULL,

    PRIMARY KEY (vendor_id),
    UNIQUE KEY uq_vendor_email (email),
    UNIQUE KEY uq_vendor_gstin (gstin),
    FOREIGN KEY fk_vendor_verified_by (verified_by) REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_vendor_status (approval_status)
) COMMENT='Master vendor accounts';


-- --------------------------
-- 3.2 VENDOR BANK ACCOUNTS
-- Kept separate: multiple bank accounts per vendor, needs admin verification.
-- --------------------------
CREATE TABLE vendor_bank_accounts (
    bank_account_id INT          NOT NULL AUTO_INCREMENT,
    vendor_id       INT          NOT NULL,
    account_name    VARCHAR(255) NOT NULL,
    account_number  VARCHAR(50)  NOT NULL,
    ifsc_code       VARCHAR(20)  NOT NULL,
    bank_name       VARCHAR(255) NULL,
    branch          VARCHAR(255) NULL,
    is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_by     INT          NULL,   -- → admins.admin_id
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP    NULL,

    PRIMARY KEY (bank_account_id),
    FOREIGN KEY fk_vba_vendor   (vendor_id)   REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    FOREIGN KEY fk_vba_verified (verified_by) REFERENCES admins(admin_id)   ON DELETE SET NULL,
    INDEX idx_vba_vendor_id (vendor_id)
) COMMENT='Vendor bank accounts for payout disbursements';


-- ============================================================
-- MODULE 4 — PRODUCT CATALOGUE
-- Tables: product_categories, products, inventory
-- REMOVED: material_pricing (tiered) → base_price + discount on products
-- REMOVED: material_moq → moq_quantity on products
-- REMOVED: material_test_reports → cert_url on products
-- REMOVED: vendor_capacity, low_stock_alerts, batch_lot_traceability,
--           warehouse_locations → enterprise features
-- RENAMED: raw_materials → products, material_id → product_id
-- ============================================================

-- --------------------------
-- 4.1 PRODUCT CATEGORIES
-- --------------------------
CREATE TABLE product_categories (
    category_id   INT          NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(150) NOT NULL,
    parent_id     INT          NULL,   -- self-ref for sub-categories
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP    NULL,

    PRIMARY KEY (category_id),
    UNIQUE KEY uq_cat_name (category_name),
    FOREIGN KEY fk_cat_parent (parent_id) REFERENCES product_categories(category_id) ON DELETE SET NULL
) COMMENT='Global product category taxonomy';


-- --------------------------
-- 4.2 PRODUCTS
-- MERGED: raw_materials + material_pricing (simplified) + material_moq + material_test_reports.
-- Tiered pricing removed; use base_price + discount_percentage for MVP.
-- cert_url replaces material_test_reports table.
-- RENAMED: material_id → product_id, material_name → product_name.
-- --------------------------
CREATE TABLE products (
    product_id           INT           NOT NULL AUTO_INCREMENT,
    vendor_id            INT           NOT NULL,
    category_id          INT           NULL,
    product_name         VARCHAR(255)  NOT NULL,
    grade                VARCHAR(100)  NULL,
    purity_percentage    DECIMAL(5,2)  NULL,
    thickness            DECIMAL(10,3) NULL,
    tensile_strength     DECIMAL(10,3) NULL,
    chemical_composition TEXT          NULL,
    unit_of_measurement  VARCHAR(20)   NOT NULL DEFAULT 'kg',  -- 'kg'|'liter'|'meter'|'piece'|'ton'|'sqm'|'other'
    availability_type    VARCHAR(20)   NOT NULL DEFAULT 'ex_stock',  -- 'ex_stock'|'made_to_order'
    lead_time_days       INT           NOT NULL DEFAULT 0,

    -- Simplified pricing (replaces material_pricing table)
    base_price           DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    discount_percentage  DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    price_unit           VARCHAR(20)   NOT NULL DEFAULT 'per_unit',  -- 'per_unit'|'per_kg'|'per_lot'

    -- MOQ (replaces material_moq table)
    moq_quantity         DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    moq_unit             VARCHAR(50)   NULL,

    -- Test certificate (replaces material_test_reports table)
    cert_url             VARCHAR(500)  NULL,   -- latest mill cert or COA

    listing_status       VARCHAR(20)   NOT NULL DEFAULT 'active',  -- 'active'|'archived'|'discontinued'
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP     NULL,

    PRIMARY KEY (product_id),
    FOREIGN KEY fk_prod_vendor    (vendor_id)   REFERENCES vendors(vendor_id)              ON DELETE CASCADE,
    FOREIGN KEY fk_prod_category  (category_id) REFERENCES product_categories(category_id) ON DELETE SET NULL,
    INDEX idx_prod_vendor_id      (vendor_id),
    INDEX idx_prod_listing_status (listing_status),
    INDEX idx_prod_category_id    (category_id)
) COMMENT='Vendor product catalogue with pricing and MOQ merged in (replaces raw_materials + material_pricing + material_moq + material_test_reports)';


-- --------------------------
-- 4.3 INVENTORY
-- Simplified: removed low_stock_alerts, batch/lot, warehouse complexity.
-- Alert logic: check available_stock < low_stock_threshold in application layer.
-- --------------------------
CREATE TABLE inventory (
    inventory_id        INT           NOT NULL AUTO_INCREMENT,
    vendor_id           INT           NOT NULL,
    product_id          INT           NOT NULL,
    available_stock     DECIMAL(14,3) NOT NULL DEFAULT 0,
    reserved_for_po     DECIMAL(14,3) NOT NULL DEFAULT 0,
    in_transit          DECIMAL(14,3) NOT NULL DEFAULT 0,
    low_stock_threshold DECIMAL(14,3) NOT NULL DEFAULT 0,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (inventory_id),
    UNIQUE KEY uq_inv_vendor_product (vendor_id, product_id),
    FOREIGN KEY fk_inv_vendor  (vendor_id)  REFERENCES vendors(vendor_id)   ON DELETE CASCADE,
    FOREIGN KEY fk_inv_product (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    INDEX idx_inv_vendor_id (vendor_id)
) COMMENT='Per-product stock levels per vendor (alert logic in app layer)';


-- ============================================================
-- MODULE 5 — RFQ & SOURCING
-- Tables: rfq, rfq_broadcast, quotes
-- REMOVED: rfq_reminders, rfq_cancellations, rfq_extensions
--          (use status + notes fields; scheduling handled in app)
-- REMOVED: rfq_negotiation_chat → merged into messages table
-- ============================================================

-- --------------------------
-- 5.1 RFQ
-- Removed: separate cancellation/extension/reminder tables.
-- deadline_extended_to and cancellation_reason cover those cases inline.
-- --------------------------
CREATE TABLE rfq (
    rfq_id              INT          NOT NULL AUTO_INCREMENT,
    manufacturer_id     INT          NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT         NULL,
    category_id         INT          NULL,
    location_filter     VARCHAR(100) NULL,
    min_vendor_rating   DECIMAL(3,2) NULL,
    deadline            DATETIME     NOT NULL,
    deadline_extended_to DATETIME    NULL,   -- replaces rfq_extensions table
    is_priority         BOOLEAN      NOT NULL DEFAULT FALSE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',  -- 'active'|'cancelled'|'closed'
    cancellation_reason TEXT         NULL,   -- replaces rfq_cancellations table
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP    NULL,

    PRIMARY KEY (rfq_id),
    FOREIGN KEY fk_rfq_mfr      (manufacturer_id) REFERENCES manufacturers(manufacturer_id) ON DELETE RESTRICT,
    FOREIGN KEY fk_rfq_category (category_id)     REFERENCES product_categories(category_id) ON DELETE SET NULL,
    INDEX idx_rfq_mfr_id (manufacturer_id),
    INDEX idx_rfq_status (status)
) COMMENT='RFQ header raised by manufacturer';


-- --------------------------
-- 5.2 RFQ BROADCAST
-- One row per vendor targeted in the RFQ.
-- --------------------------
CREATE TABLE rfq_broadcast (
    id         INT       NOT NULL AUTO_INCREMENT,
    rfq_id     INT       NOT NULL,
    vendor_id  INT       NOT NULL,
    sent_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    viewed     BOOLEAN   NOT NULL DEFAULT FALSE,
    responded  BOOLEAN   NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id),
    UNIQUE KEY uq_rfq_broadcast (rfq_id, vendor_id),
    FOREIGN KEY fk_rb_rfq    (rfq_id)   REFERENCES rfq(rfq_id)        ON DELETE CASCADE,
    FOREIGN KEY fk_rb_vendor (vendor_id) REFERENCES vendors(vendor_id) ON DELETE RESTRICT,
    INDEX idx_rb_rfq_id    (rfq_id),
    INDEX idx_rb_vendor_id (vendor_id)
) COMMENT='Tracks which vendors received and responded to an RFQ';


-- --------------------------
-- 5.3 QUOTES
-- Vendor responses to RFQ.
-- --------------------------
CREATE TABLE quotes (
    quote_id         INT           NOT NULL AUTO_INCREMENT,
    rfq_id           INT           NOT NULL,
    vendor_id        INT           NOT NULL,
    price            DECIMAL(14,2) NOT NULL,
    lead_time_days   INT           NOT NULL,
    compliance_notes TEXT          NULL,
    version          TINYINT       NOT NULL DEFAULT 1,
    is_locked        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP     NULL,

    PRIMARY KEY (quote_id),
    FOREIGN KEY fk_qt_rfq    (rfq_id)   REFERENCES rfq(rfq_id)        ON DELETE CASCADE,
    FOREIGN KEY fk_qt_vendor (vendor_id) REFERENCES vendors(vendor_id) ON DELETE RESTRICT,
    INDEX idx_qt_rfq_id    (rfq_id),
    INDEX idx_qt_vendor_id (vendor_id)
) COMMENT='Vendor quotations in response to an RFQ';


-- ============================================================
-- MODULE 6 — PURCHASE ORDERS
-- Tables: purchase_orders, po_line_items, po_negotiations
-- REMOVED: po_status_history (excessive audit; status on parent is sufficient)
-- ============================================================

-- --------------------------
-- 6.1 PURCHASE ORDERS
-- --------------------------
CREATE TABLE purchase_orders (
    po_id              INT           NOT NULL AUTO_INCREMENT,
    po_number          VARCHAR(100)  NOT NULL,
    manufacturer_id    INT           NOT NULL,
    vendor_id          INT           NOT NULL,
    status             VARCHAR(20)   NOT NULL DEFAULT 'draft',
    -- 'draft'|'sent'|'accepted'|'negotiating'|'declined'|
    -- 'in_production'|'dispatched'|'in_transit'|'delivered'|'cancelled'|'disputed'
    total_amount       DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    currency           VARCHAR(10)   NOT NULL DEFAULT 'INR',
    delivery_address   TEXT          NULL,
    required_by_date   DATE          NULL,
    special_instructions TEXT        NULL,

    -- GRN confirmation (replaces delivery_confirmation table)
    grn_confirmed      BOOLEAN       NOT NULL DEFAULT FALSE,
    grn_confirmed_at   TIMESTAMP     NULL,
    grn_confirmed_by   INT           NULL,   -- → users.user_id

    created_by         INT           NULL,   -- → users.user_id
    created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP     NULL,

    PRIMARY KEY (po_id),
    UNIQUE KEY uq_po_number (po_number),
    FOREIGN KEY fk_po_mfr     (manufacturer_id) REFERENCES manufacturers(manufacturer_id) ON DELETE RESTRICT,
    FOREIGN KEY fk_po_vendor  (vendor_id)        REFERENCES vendors(vendor_id)             ON DELETE RESTRICT,
    FOREIGN KEY fk_po_grn_by  (grn_confirmed_by) REFERENCES users(user_id)                ON DELETE SET NULL,
    FOREIGN KEY fk_po_created (created_by)        REFERENCES users(user_id)                ON DELETE SET NULL,
    INDEX idx_po_manufacturer_id (manufacturer_id),
    INDEX idx_po_vendor_id       (vendor_id),
    INDEX idx_po_status          (status)
) COMMENT='Purchase orders raised by manufacturers against vendors';


-- --------------------------
-- 6.2 PO LINE ITEMS
-- Snapshot of product details at order time.
-- shipped_qty added here (replaces shipment_items table).
-- --------------------------
CREATE TABLE po_line_items (
    line_item_id   INT           NOT NULL AUTO_INCREMENT,
    po_id          INT           NOT NULL,
    product_id     INT           NOT NULL,  -- renamed from material_id
    product_name   VARCHAR(255)  NOT NULL,  -- snapshot at order time
    quantity       DECIMAL(12,3) NOT NULL,
    shipped_qty    DECIMAL(12,3) NOT NULL DEFAULT 0,  -- updated on dispatch; replaces shipment_items
    unit           VARCHAR(50)   NULL,
    unit_price     DECIMAL(14,2) NOT NULL,
    gst_percentage DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
    total_price    DECIMAL(16,2) NOT NULL,

    PRIMARY KEY (line_item_id),
    FOREIGN KEY fk_pli_po      (po_id)       REFERENCES purchase_orders(po_id)  ON DELETE CASCADE,
    FOREIGN KEY fk_pli_product (product_id)  REFERENCES products(product_id)    ON DELETE RESTRICT,
    INDEX idx_pli_po_id (po_id)
) COMMENT='Line items in a purchase order; shipped_qty tracks partial fulfillment (replaces shipment_items)';


-- --------------------------
-- 6.3 PO NEGOTIATIONS
-- Counter-offer rounds.
-- --------------------------
CREATE TABLE po_negotiations (
    negotiation_id        INT           NOT NULL AUTO_INCREMENT,
    po_id                 INT           NOT NULL,
    round_number          TINYINT       NOT NULL DEFAULT 1,
    initiated_by          VARCHAR(20)   NOT NULL,  -- 'vendor' | 'manufacturer'
    counter_quantity      DECIMAL(12,3) NULL,
    counter_price         DECIMAL(14,2) NULL,
    counter_delivery_date DATE          NULL,
    notes                 TEXT          NULL,
    status                VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- 'pending'|'accepted'|'rejected'
    created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (negotiation_id),
    FOREIGN KEY fk_pn_po (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    INDEX idx_pn_po_id (po_id)
) COMMENT='Negotiation counter-offer rounds on a purchase order';


-- ============================================================
-- MODULE 7 — SHIPMENTS
-- Tables: shipments
-- REMOVED: shipment_tracking (→ inline fields on shipments)
-- REMOVED: shipment_status_history (→ status field sufficient for MVP)
-- REMOVED: shipment_items (→ shipped_qty on po_line_items)
-- REMOVED: delivery_confirmation (→ grn_confirmed on purchase_orders)
-- REMOVED: shipment_documents (→ document_url on shipments)
-- REMOVED: carriers table (→ carrier_name inline on shipments)
-- ============================================================

-- --------------------------
-- 7.1 SHIPMENTS
-- One PO can have multiple partial shipments.
-- Tracking fields merged in; status history removed (MVP: current status only).
-- --------------------------
CREATE TABLE shipments (
    shipment_id             INT          NOT NULL AUTO_INCREMENT,
    po_id                   INT          NOT NULL,
    vendor_id               INT          NOT NULL,
    manufacturer_id         INT          NOT NULL,
    is_partial              BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Status (replaces shipment_status_history table)
    shipment_status         VARCHAR(30)  NOT NULL DEFAULT 'created',
    -- 'created'|'dispatched'|'in_transit'|'out_for_delivery'|'delivered'|'cancelled'

    -- Carrier & tracking (replaces carriers + shipment_tracking tables)
    carrier_name            VARCHAR(255) NULL,
    vehicle_number          VARCHAR(50)  NULL,
    tracking_number         VARCHAR(100) NULL,   -- e-way bill / courier tracking ID
    current_location        VARCHAR(255) NULL,   -- last known location
    eway_bill_number        VARCHAR(100) NULL,

    -- Package info
    number_of_packages      INT          NULL,
    total_weight_kg         DECIMAL(10,3) NULL,

    -- Delivery confirmation (replaces delivery_confirmation table)
    condition_status        VARCHAR(20)  NULL,   -- 'good'|'damaged'|'partial' (set on delivery)
    delivery_remarks        TEXT         NULL,
    received_by             INT          NULL,   -- → users.user_id

    -- Document (replaces shipment_documents table; store primary doc URL)
    document_url            VARCHAR(500) NULL,   -- invoice or delivery challan

    dispatch_date           DATETIME     NULL,
    estimated_delivery_date DATETIME     NULL,
    actual_delivery_date    DATETIME     NULL,
    created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP    NULL,

    PRIMARY KEY (shipment_id),
    FOREIGN KEY fk_ship_po      (po_id)          REFERENCES purchase_orders(po_id)        ON DELETE RESTRICT,
    FOREIGN KEY fk_ship_vendor  (vendor_id)       REFERENCES vendors(vendor_id)            ON DELETE RESTRICT,
    FOREIGN KEY fk_ship_mfr     (manufacturer_id) REFERENCES manufacturers(manufacturer_id) ON DELETE RESTRICT,
    FOREIGN KEY fk_ship_recv    (received_by)     REFERENCES users(user_id)                ON DELETE SET NULL,
    INDEX idx_ship_po_id     (po_id),
    INDEX idx_ship_vendor_id (vendor_id),
    INDEX idx_ship_status    (shipment_status)
) COMMENT='Shipment records with tracking, delivery confirmation, and document url merged in';


-- ============================================================
-- MODULE 8 — PAYMENT & SETTLEMENT
-- Tables: invoices, payments, vendor_payouts, refunds
-- REMOVED: platform_commissions (→ commission_amount on vendor_payouts)
-- REMOVED: vendor_bank_accounts moved to Module 3 (vendor section)
-- ============================================================

-- --------------------------
-- 8.1 INVOICES
-- --------------------------
CREATE TABLE invoices (
    invoice_id      INT           NOT NULL AUTO_INCREMENT,
    invoice_number  VARCHAR(100)  NOT NULL,
    po_id           INT           NOT NULL,
    vendor_id       INT           NOT NULL,
    manufacturer_id INT           NOT NULL,
    invoice_type    VARCHAR(20)   NOT NULL DEFAULT 'proforma',  -- 'proforma'|'tax_invoice'
    gross_amount    DECIMAL(16,2) NOT NULL,
    gst_amount      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    tds_amount      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    net_amount      DECIMAL(16,2) NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'draft',
    -- 'draft'|'submitted'|'paid'|'partially_paid'|'overdue'|'cancelled'
    due_date        DATE          NULL,
    submitted_at    TIMESTAMP     NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP     NULL,

    PRIMARY KEY (invoice_id),
    UNIQUE KEY uq_invoice_number (invoice_number),
    FOREIGN KEY fk_inv_po    (po_id)          REFERENCES purchase_orders(po_id)          ON DELETE RESTRICT,
    FOREIGN KEY fk_inv_vendor (vendor_id)     REFERENCES vendors(vendor_id)              ON DELETE RESTRICT,
    FOREIGN KEY fk_inv_mfr   (manufacturer_id) REFERENCES manufacturers(manufacturer_id) ON DELETE RESTRICT,
    INDEX idx_inv_po_id     (po_id),
    INDEX idx_inv_vendor_id (vendor_id),
    INDEX idx_inv_status    (status)
) COMMENT='GST-compliant invoices raised by vendors per PO';


-- --------------------------
-- 8.2 PAYMENTS
-- --------------------------
CREATE TABLE payments (
    payment_id      INT           NOT NULL AUTO_INCREMENT,
    invoice_id      INT           NOT NULL,
    manufacturer_id INT           NOT NULL,
    vendor_id       INT           NOT NULL,
    amount          DECIMAL(16,2) NOT NULL,
    payment_method  VARCHAR(30)   NOT NULL,  -- 'upi'|'net_banking'|'card'|'bank_transfer'
    gateway_txn_id  VARCHAR(255)  NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- 'pending'|'processing'|'completed'|'failed'
    initiated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP     NULL,

    PRIMARY KEY (payment_id),
    FOREIGN KEY fk_pay_invoice (invoice_id)      REFERENCES invoices(invoice_id)          ON DELETE RESTRICT,
    FOREIGN KEY fk_pay_mfr     (manufacturer_id) REFERENCES manufacturers(manufacturer_id) ON DELETE RESTRICT,
    FOREIGN KEY fk_pay_vendor  (vendor_id)        REFERENCES vendors(vendor_id)             ON DELETE RESTRICT,
    INDEX idx_pay_invoice_id (invoice_id),
    INDEX idx_pay_status     (status)
) COMMENT='Individual payment transactions against an invoice';


-- --------------------------
-- 8.3 VENDOR PAYOUTS
-- commission_amount field replaces the platform_commissions table.
-- --------------------------
CREATE TABLE vendor_payouts (
    payout_id         INT           NOT NULL AUTO_INCREMENT,
    vendor_id         INT           NOT NULL,
    period_start      DATE          NOT NULL,
    period_end        DATE          NOT NULL,
    gross_amount      DECIMAL(16,2) NOT NULL,
    commission_rate   DECIMAL(5,2)  NOT NULL DEFAULT 0.00,   -- replaces platform_commissions table
    commission_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    net_payout        DECIMAL(16,2) NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'scheduled',  -- 'scheduled'|'processing'|'completed'|'failed'
    triggered_by      VARCHAR(20)   NOT NULL DEFAULT 'scheduled',  -- 'scheduled'|'manual'
    approved_by       INT           NULL,   -- → admins.admin_id
    bank_account_id   INT           NULL,   -- → vendor_bank_accounts
    scheduled_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP     NULL,

    PRIMARY KEY (payout_id),
    FOREIGN KEY fk_vp_vendor   (vendor_id)       REFERENCES vendors(vendor_id)          ON DELETE RESTRICT,
    FOREIGN KEY fk_vp_approved (approved_by)     REFERENCES admins(admin_id)            ON DELETE SET NULL,
    FOREIGN KEY fk_vp_bank     (bank_account_id) REFERENCES vendor_bank_accounts(bank_account_id) ON DELETE SET NULL,
    INDEX idx_vp_vendor_id (vendor_id),
    INDEX idx_vp_status    (status)
) COMMENT='Payout disbursements to vendors (commission_amount replaces platform_commissions table)';


-- --------------------------
-- 8.4 REFUNDS
-- --------------------------
CREATE TABLE refunds (
    refund_id    INT           NOT NULL AUTO_INCREMENT,
    invoice_id   INT           NOT NULL,
    dispute_id   INT           NULL,   -- → disputes
    refund_type  VARCHAR(10)   NOT NULL,  -- 'full' | 'partial'
    amount       DECIMAL(14,2) NOT NULL,
    status       VARCHAR(20)   NOT NULL DEFAULT 'initiated',
    -- 'initiated'|'approved'|'processing'|'completed'|'rejected'
    approved_by  INT           NULL,   -- → admins.admin_id
    initiated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP     NULL,

    PRIMARY KEY (refund_id),
    FOREIGN KEY fk_ref_invoice  (invoice_id) REFERENCES invoices(invoice_id) ON DELETE RESTRICT,
    FOREIGN KEY fk_ref_approved (approved_by) REFERENCES admins(admin_id)    ON DELETE SET NULL,
    INDEX idx_ref_invoice_id (invoice_id)
) COMMENT='Refunds tied to dispute resolutions or return approvals';


-- ============================================================
-- MODULE 9 — DISPUTES & RETURNS
-- Tables: disputes, dispute_evidence, dispute_resolutions
-- MERGED: return_requests + disputes → single disputes table
-- REMOVED: return_items (quantity/product info on po_line_items)
-- REMOVED: return_responses (→ status progression + notes on disputes)
-- REMOVED: return_status_logs (→ status field on disputes sufficient)
-- REMOVED: quality_issues + quality_issue_evidence merged into disputes
-- ============================================================

-- --------------------------
-- 9.1 DISPUTES
-- MERGED: return_requests + disputes + quality_issues into one table.
-- dispute_type covers all cases: return, quality issue, delivery dispute.
-- resolution_type on the same table (set when resolved) covers simple cases.
-- Formal admin mediation → dispute_resolutions table.
-- --------------------------
CREATE TABLE disputes (
    dispute_id      INT          NOT NULL AUTO_INCREMENT,
    po_id           INT          NOT NULL,
    manufacturer_id INT          NOT NULL,
    vendor_id       INT          NOT NULL,
    rma_number      VARCHAR(50)  NOT NULL,  -- auto-generated unique reference

    dispute_type    VARCHAR(30)  NOT NULL,
    -- 'wrong_part_delivered'|'damaged_goods'|'short_quantity'|
    -- 'quality_failure'|'delivery_delay'|'other'

    category        VARCHAR(30)  NULL,
    -- 'quality_failure'|'quantity_mismatch'|'delivery_delay'|'other'

    description     TEXT         NULL,
    is_partial      BOOLEAN      NOT NULL DEFAULT FALSE,

    status          VARCHAR(30)  NOT NULL DEFAULT 'requested',
    -- 'requested'|'vendor_acknowledged'|'pickup_scheduled'|
    -- 'replacement_dispatched'|'under_review'|'admin_mediating'|
    -- 'refund_approved'|'resolved'|'closed'

    -- Resolution (simple cases resolved without escalation)
    resolution_type VARCHAR(30)  NULL,
    -- 'full_refund'|'partial_refund'|'replacement'|'credit_note'|'debit_note'|'no_action'

    mediator_id     INT          NULL,   -- → admins.admin_id (when escalated)
    raised_by       INT          NULL,   -- → users.user_id
    resolved_at     TIMESTAMP    NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP    NULL,

    PRIMARY KEY (dispute_id),
    UNIQUE KEY uq_rma_number (rma_number),
    FOREIGN KEY fk_disp_po       (po_id)          REFERENCES purchase_orders(po_id)             ON DELETE RESTRICT,
    FOREIGN KEY fk_disp_mfr      (manufacturer_id) REFERENCES manufacturers(manufacturer_id)     ON DELETE RESTRICT,
    FOREIGN KEY fk_disp_vendor   (vendor_id)       REFERENCES vendors(vendor_id)                 ON DELETE RESTRICT,
    FOREIGN KEY fk_disp_mediator (mediator_id)     REFERENCES admins(admin_id)                   ON DELETE SET NULL,
    FOREIGN KEY fk_disp_raised   (raised_by)       REFERENCES users(user_id)                     ON DELETE SET NULL,
    INDEX idx_disp_po_id     (po_id),
    INDEX idx_disp_vendor_id (vendor_id),
    INDEX idx_disp_status    (status)
) COMMENT='Unified disputes table (merged from return_requests + disputes + quality_issues)';


-- --------------------------
-- 9.2 DISPUTE EVIDENCE
-- Both parties upload supporting files.
-- MERGED: dispute_evidence + quality_issue_evidence → one table.
-- --------------------------
CREATE TABLE dispute_evidence (
    evidence_id      INT          NOT NULL AUTO_INCREMENT,
    dispute_id       INT          NOT NULL,
    uploaded_by_type VARCHAR(20)  NOT NULL,  -- 'manufacturer' | 'vendor'
    uploaded_by_id   INT          NOT NULL,  -- user_id
    file_url         VARCHAR(500) NOT NULL,
    file_type        VARCHAR(20)  NOT NULL,  -- 'image' | 'video' | 'document'
    description      VARCHAR(255) NULL,
    uploaded_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (evidence_id),
    FOREIGN KEY fk_ev_dispute (dispute_id) REFERENCES disputes(dispute_id) ON DELETE CASCADE,
    INDEX idx_ev_dispute_id (dispute_id)
) COMMENT='Evidence files for disputes (merged from dispute_evidence + quality_issue_evidence)';


-- --------------------------
-- 9.3 DISPUTE RESOLUTIONS
-- Admin decisions for formally escalated disputes.
-- --------------------------
CREATE TABLE dispute_resolutions (
    resolution_id   INT       NOT NULL AUTO_INCREMENT,
    dispute_id      INT       NOT NULL,
    resolution_type VARCHAR(30) NOT NULL,
    -- 'full_refund'|'partial_refund'|'replacement'|'credit_note'|'debit_note'|'no_action'
    remarks         TEXT      NULL,
    decided_by      INT       NULL,   -- → admins.admin_id
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (resolution_id),
    FOREIGN KEY fk_res_dispute (dispute_id) REFERENCES disputes(dispute_id)  ON DELETE RESTRICT,
    FOREIGN KEY fk_res_admin   (decided_by) REFERENCES admins(admin_id)      ON DELETE SET NULL
) COMMENT='Admin binding resolutions for escalated disputes';


-- ============================================================
-- MODULE 10 — MESSAGING
-- Tables: messages
-- MERGED: message_threads + messages + rfq_negotiation_chat
--         → single messages table with thread_id and context fields
-- ============================================================

-- --------------------------
-- 10.1 MESSAGES
-- MERGED: message_threads (header) + messages (body) + rfq_negotiation_chat
-- into a single table.
-- context_type + context_id links to the business object (rfq, po, dispute).
-- thread_id groups messages in the same conversation (app-generated UUID or int).
-- --------------------------
CREATE TABLE messages (
    message_id    INT          NOT NULL AUTO_INCREMENT,
    thread_id     VARCHAR(50)  NOT NULL,   -- app-generated grouping key
    context_type  VARCHAR(20)  NULL,       -- 'rfq' | 'po' | 'dispute' | 'general'
    context_id    INT          NULL,       -- rfq_id, po_id, or dispute_id
    vendor_id     INT          NOT NULL,
    manufacturer_id INT        NOT NULL,
    sender_type   VARCHAR(20)  NOT NULL,   -- 'vendor' | 'manufacturer'
    sender_id     INT          NOT NULL,   -- vendor_id or manufacturer_id
    message_body  TEXT         NOT NULL,
    is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at       TIMESTAMP    NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP    NULL,

    PRIMARY KEY (message_id),
    FOREIGN KEY fk_msg_vendor (vendor_id)       REFERENCES vendors(vendor_id)          ON DELETE CASCADE,
    FOREIGN KEY fk_msg_mfr    (manufacturer_id) REFERENCES manufacturers(manufacturer_id) ON DELETE CASCADE,
    INDEX idx_msg_thread_id   (thread_id),
    INDEX idx_msg_context     (context_type, context_id),
    INDEX idx_msg_vendor_id   (vendor_id),
    INDEX idx_msg_mfr_id      (manufacturer_id)
) COMMENT='Unified messaging (merged from message_threads + messages + rfq_negotiation_chat)';


-- ============================================================
-- MODULE 11 — CONTRACTS (Simplified)
-- Tables: contracts
-- REMOVED: contract_terms (→ contract_terms TEXT field)
-- REMOVED: contract_documents (→ document_url on contracts)
-- REMOVED: contract_signatures (→ signed_by_vendor/signed_by_mfr booleans)
-- REMOVED: contract_history (→ audit overkill for MVP)
-- REMOVED: rate_contracts, rate_contract_revisions (→ merged into contracts)
-- ============================================================

-- --------------------------
-- 11.1 CONTRACTS
-- Covers: MSA, NDA, SLA, SOW, supply agreements, rate contracts.
-- Terms stored as TEXT; use structured JSON if needed in app layer.
-- --------------------------
CREATE TABLE contracts (
    contract_id      INT          NOT NULL AUTO_INCREMENT,
    contract_code    VARCHAR(50)  NOT NULL,
    contract_name    VARCHAR(255) NOT NULL,
    contract_type    VARCHAR(30)  NOT NULL,  -- 'msa'|'nda'|'sla'|'sow'|'supply_agreement'|'rate_contract'|'other'
    vendor_id        INT          NULL,
    manufacturer_id  INT          NULL,
    valid_from       DATE         NULL,
    valid_till       DATE         NULL,
    renewal_type     VARCHAR(10)  NOT NULL DEFAULT 'manual',  -- 'manual'|'auto'
    status           VARCHAR(20)  NOT NULL DEFAULT 'draft',
    -- 'draft'|'pending_approval'|'active'|'expired'|'terminated'

    -- Simplified terms (replaces contract_terms table)
    contract_terms   TEXT         NULL,   -- JSON or plain text key-value clauses

    -- Simplified signatures (replaces contract_signatures table)
    signed_by_vendor       BOOLEAN   NOT NULL DEFAULT FALSE,
    signed_by_vendor_at    TIMESTAMP NULL,
    signed_by_mfr          BOOLEAN   NOT NULL DEFAULT FALSE,
    signed_by_mfr_at       TIMESTAMP NULL,

    -- Document (replaces contract_documents table)
    document_url     VARCHAR(500) NULL,   -- signed PDF

    created_by       INT          NULL,   -- → admins.admin_id
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP    NULL,

    PRIMARY KEY (contract_id),
    UNIQUE KEY uq_contract_code (contract_code),
    FOREIGN KEY fk_con_vendor  (vendor_id)       REFERENCES vendors(vendor_id)          ON DELETE SET NULL,
    FOREIGN KEY fk_con_mfr     (manufacturer_id) REFERENCES manufacturers(manufacturer_id) ON DELETE SET NULL,
    FOREIGN KEY fk_con_creator (created_by)      REFERENCES admins(admin_id)            ON DELETE SET NULL,
    INDEX idx_con_vendor_id (vendor_id),
    INDEX idx_con_mfr_id    (manufacturer_id),
    INDEX idx_con_status    (status)
) COMMENT='Contracts (MSA, NDA, SLA, rate contracts) with terms and signatures merged in';


-- ============================================================
-- MODULE 12 — NOTIFICATIONS
-- Tables: notifications
-- MERGED: vendor_notifications + manufacturer_notifications into one table.
-- REMOVED: manufacturer_notification_preferences (use app-side settings or user prefs JSON)
-- ============================================================

-- --------------------------
-- 12.1 NOTIFICATIONS
-- MERGED: vendor_notifications + manufacturer_notifications.
-- recipient_type + recipient_id identifies the target.
-- --------------------------
CREATE TABLE notifications (
    notification_id   INT          NOT NULL AUTO_INCREMENT,
    recipient_type    VARCHAR(20)  NOT NULL,  -- 'vendor' | 'manufacturer' | 'user'
    recipient_id      INT          NOT NULL,  -- vendor_id, manufacturer_id, or user_id
    notification_type VARCHAR(50)  NOT NULL,
    -- 'po_received'|'po_negotiation'|'payment_received'|'payment_overdue'|
    -- 'invoice_created'|'low_stock_alert'|'quality_rejection'|'shipment_update'|
    -- 'registration_status'|'message_received'|'rfq_received'|'dispute_update'|'general'
    channel           VARCHAR(10)  NOT NULL DEFAULT 'in_app',  -- 'in_app'|'email'|'sms'
    title             VARCHAR(255) NOT NULL,
    message           TEXT         NOT NULL,
    reference_type    VARCHAR(50)  NULL,  -- 'po'|'rfq'|'invoice'|'dispute'|...
    reference_id      INT          NULL,
    is_read           BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at           TIMESTAMP    NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (notification_id),
    INDEX idx_notif_recipient (recipient_type, recipient_id),
    INDEX idx_notif_is_read   (is_read),
    INDEX idx_notif_created   (created_at)
) COMMENT='Unified notification inbox for all actors (merged from vendor_notifications + manufacturer_notifications)';


-- ============================================================
-- END OF SCHEMA
-- ============================================================
--
-- TABLE COUNT BY MODULE:
--   Module 1  Auth & Users        :  4 tables  (admins, users, sessions, password_resets)
--   Module 2  Manufacturers       :  2 tables  (manufacturers, documents)
--   Module 3  Vendors             :  2 tables  (vendors, vendor_bank_accounts)
--   Module 4  Products & Inventory:  3 tables  (product_categories, products, inventory)
--   Module 5  RFQ & Sourcing      :  3 tables  (rfq, rfq_broadcast, quotes)
--   Module 6  Purchase Orders     :  3 tables  (purchase_orders, po_line_items, po_negotiations)
--   Module 7  Shipments           :  1 table   (shipments)
--   Module 8  Payment & Settlement:  4 tables  (invoices, payments, vendor_payouts, refunds)
--   Module 9  Disputes & Returns  :  3 tables  (disputes, dispute_evidence, dispute_resolutions)
--   Module 10 Messaging           :  1 table   (messages)
--   Module 11 Contracts           :  1 table   (contracts)
--   Module 12 Notifications       :  1 table   (notifications)
--                                 ─────────────
--   TOTAL                         : 28 tables
--
-- CORE FLOWS VERIFIED:
--   RFQ FLOW    : rfq → rfq_broadcast → quotes                        ✓
--   ORDER FLOW  : purchase_orders → po_line_items → shipments          ✓
--   PAYMENT FLOW: invoices → payments → vendor_payouts / refunds       ✓
--   DISPUTE FLOW: disputes → dispute_evidence → dispute_resolutions    ✓
-- ============================================================