# Vendor & Manufacturer Portal System

A full-stack B2B procurement platform that connects **Vendors** (product suppliers) with **Manufacturers** (buyers) through a structured RFQ → Quotation → Purchase Order workflow, managed by an **Admin** portal.

---

## Overview

The system solves the fragmented procurement process in B2B manufacturing:
- Manufacturers need a structured way to source products, compare vendor quotes, and track deliveries
- Vendors need a central place to list products, respond to quote requests, and fulfill orders
- Admins need visibility and control over who is onboarded to the platform

The platform enforces a strict business flow:
```
Product Listing → RFQ → Quotation Submission → Quote Selection → Purchase Order → Fulfillment
```

> **Domain naming note:** In the database, `org_type = 'manufacturer'` = Vendor in the UI; `org_type = 'customer'` = Manufacturer in the UI. This is a legacy inversion — all code comments reflect the UI naming.

---

## Features

### 🔹 Admin Portal
- View all pending **Vendor** and **Manufacturer** registration applications
- **Approve**, **Reject** (with mandatory reason), or **Request Resubmission** (with change list)
- Send automated email notifications on status change
- Paginated application lists (15 per page)

### 🔹 Vendor Portal
- **Product Catalog**: Add, edit, and delete products with image upload (JPG/PNG/WEBP/GIF, max 2 MB)
- **Orders & RFQs** (tabbed view):
  - View incoming Purchase Orders from manufacturers
  - Respond to RFQ requests by submitting quotations (price, lead time, compliance notes, optional PDF)
  - Edit previously submitted quotations while status is `submitted`
- **Analytics Dashboard**: Revenue charts, KPI cards, active order pipeline
- **Shipping**: Manage shipment records for fulfilled orders
- **Profile**: Inline double-click-to-edit fields, floating save bar with unsaved-change indicators
- Paginated lists: 10 items/page for orders and RFQs

### 🔹 Manufacturer Portal
- **Browse Products**: Search and filter vendor product catalog; request quotations via RFQ
- **Quotations**: Accordion RFQ list showing all submitted vendor quotes per RFQ; select a quote to place an order
- **Purchase Orders**: Full order history with product thumbnails, status tracking, vendor rating
- **Order Tracking**: Smart tracking view with timeline, search, and active/completed filter
- **Profile**: Same inline edit pattern as Vendor
- Paginated lists: 10–15 items/page throughout

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Create React App, Lucide React icons |
| **Styling** | Vanilla CSS with a custom design system (`index.css`) |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy ORM, Pydantic v2 |
| **Database** | PostgreSQL (local) or Supabase (production) |
| **Auth** | JWT Bearer tokens, `python-jose`, `passlib[bcrypt]` |
| **File Storage** | Local `uploads/` directory (dev) or Supabase Storage (prod) |
| **Email** | SMTP via `smtplib` (configurable) |

---

## Project Structure

```
vendor-portal-main/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/          # Route handlers (products, orders, rfq, auth, uploads, etc.)
│   │   │   └── router.py           # Central API router
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic-settings, reads .env)
│   │   │   └── database.py         # SQLAlchemy engine + session
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic layer
│   │   ├── repositories/           # Database query layer
│   │   └── main.py                 # FastAPI app, CORS, static file mount
│   ├── uploads/                    # Locally stored product/PO images (auto-created)
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── api/
        │   └── client.js           # Axios instance (injects JWT from localStorage)
        ├── components/
        │   ├── common/             # Shared: Modal, DetailDrawer, Toast, Pagination, StatusBadge
        │   └── layout/             # Sidebar, TopBar, AppLayout
        ├── context/
        │   └── AuthContext.js      # Global auth state (user, token, login/logout)
        ├── pages/
        │   ├── admin/              # VendorApplications, ManufacturerApplications
        │   ├── vendor/             # VendorDashboard, VendorOrders, VendorProducts, VendorProfile
        │   └── manufacturer/       # BrowseProducts, Quotations, PurchaseOrders, OrderTracking
        ├── services/               # Typed API service layer (authService, orderService, etc.)
        └── utils/
            ├── imageUtils.js       # getFullImageUrl() — resolves relative/localhost URLs
            ├── orderUtils.js       # getProductSummary() — extracts product name from order
            └── url.js              # toAbsUrl() — for PO document links
```

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL database (local or Supabase project)

---

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
copy .env.example .env       # or create manually

# Start the server
uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`  
API docs available at: `http://localhost:8000/docs`

---

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo REACT_APP_API_URL=http://localhost:8000/api/v1 > .env

# Start development server
npm start
```

Frontend runs at: `http://localhost:3000`

---

## Environment Variables

Create `backend/.env` with the following:

```env
# ── Database ──────────────────────────────────────────
# Option A: Full connection string (overrides individual fields)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Option B: Individual fields (used if DATABASE_URL is not set)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=vendor-portal

# ── Security ──────────────────────────────────────────
SECRET_KEY=your-long-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440        # 24 hours

# ── File Storage ──────────────────────────────────────
# Leave blank to use local disk (dev mode)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_BUCKET=po-documents

UPLOAD_DIR=uploads                      # Relative to backend/ directory
BASE_URL=http://localhost:8000          # Must match where backend is accessible

# ── Email (optional) ──────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your-app-password
SMTP_TLS=True
SMTP_FROM_EMAIL=no-reply@vendorhub.com

# ── App ───────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

---

## Image Handling

Product images follow a two-step process:

**Upload (write path):**
1. Vendor selects an image in the product form
2. Frontend calls `POST /api/v1/uploads/image` with `multipart/form-data`
3. Backend saves the file to `backend/uploads/{uuid}_{filename}`
4. Backend returns `{ file_url: "http://localhost:8000/uploads/{filename}" }`
5. Frontend saves this URL into `specifications.image_url` via the product create/update API

**Storage in database:**
- Products do not have a dedicated `image_url` DB column
- The URL is stored inside the `specifications` JSONB field as `{ "image_url": "http://..." }`
- On read, `ProductResponse.model_validate()` extracts it: `instance.image_url = instance.specifications.get('image_url')`

**Serving (read path):**
- FastAPI mounts `backend/uploads/` as a static directory at `/uploads`
- URL format: `http://{BASE_URL}/uploads/{filename}`
- Frontend passes all image URLs through `getFullImageUrl()` which resolves localhost URLs and handles relative paths

> **Note:** In production with Supabase Storage configured, files are uploaded to the Supabase bucket instead, and a CDN URL is returned directly. The static file mount is bypassed.

---

## Database Entities

| Entity | Table | Key Fields |
|---|---|---|
| **User** | `users` | `id`, `email`, `password_hash`, `org_id`, `role` |
| **Organization** | `organizations` | `id`, `name`, `org_type` (`manufacturer`=Vendor, `customer`=Manufacturer), `verification_status` |
| **Product** | `products` | `id`, `manufacturer_org_id`, `name`, `sku`, `specifications` (JSONB — stores `image_url`) |
| **RFQ** | `rfqs` | `id`, `customer_org_id`, `product_id`, `title`, `status`, `deadline` |
| **Quotation** | `quotations` | `id`, `rfq_id`, `manufacturer_org_id`, `price`, `lead_time_days`, `status`, `document_url` |
| **Order** | `orders` | `id`, `order_number`, `quotation_id`, `status`, `po_document_url`, `total_amount` |
| **Shipment** | `shipments` | `id`, `order_id`, `tracking_number`, `status`, `shipped_at` |
| **Dispute** | `disputes` | `id`, `order_id`, `raised_by_org_id`, `status`, `description` |

### Key Relationships
- One Organization → Many Users
- One Organization (Vendor) → Many Products
- One Product → Many RFQs
- One RFQ → Many Quotations
- One Quotation (selected) → One Order
- One Order → One Shipment

---

## API Overview

All endpoints return a standard envelope:
```json
{ "status": "success", "message": "...", "data": { ... }, "errors": null }
```

| Router prefix | Description |
|---|---|
| `POST /api/v1/auth/register` | Register vendor or manufacturer org |
| `POST /api/v1/auth/login` | Login, returns JWT |
| `GET /api/v1/products` | List products (vendors see own; manufacturers see all) |
| `POST /api/v1/vendor/rfq` | Create RFQ |
| `GET /api/v1/vendor/rfq/{rfq_id}/quotes` | List quotes for an RFQ |
| `POST /api/v1/vendor/rfq/{rfq_id}/quote` | Submit a quotation |
| `PATCH /api/v1/vendor/quotes/{quote_id}` | Update an existing quotation |
| `POST /api/v1/vendor/rfq/{rfq_id}/select-quote/{quote_id}` | Select quote, lock RFQ, reject others |
| `POST /api/v1/orders` | Create purchase order |
| `GET /api/v1/orders` | List orders for current org |
| `POST /api/v1/uploads/image` | Upload product image (JPEG/PNG/WEBP/GIF, max 2 MB) |
| `POST /api/v1/uploads/po-document` | Upload PO document (PDF, max 10 MB) |
| `GET /api/v1/organizations/pending-applications` | Admin: list pending orgs |
| `PATCH /api/v1/organizations/{id}/verification` | Admin: approve/reject/resubmit |

---

## UI Patterns

| Pattern | Implementation |
|---|---|
| **Row-click to drawer** | All tables open a `DetailDrawer` slide-in panel on row click |
| **Pagination** | Client-side slicing, shared `Pagination.js` component, 10–15 items/page |
| **Inline profile editing** | Double-click any field to edit; floating save bar appears when dirty |
| **Status badges** | `StatusBadge.js` maps status strings to color-coded pill badges |
| **Product thumbnails** | 48×48px `object-cover` images in all table rows with `Package` icon fallback |
| **Toast notifications** | `Toast.js` dismisses after 4 seconds, auto-positioned top-right |

---

## Demo Credentials

> Update these to match seeded users in your database.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@vendorhub.com` | `admin123` |
| Vendor | `vendor@example.com` | `vendor123` |
| Manufacturer | `manufacturer@example.com` | `mfg123` |

---

## Known Issues & Notes

- **Old products without images:** Products created before the image upload feature was added will not have `image_url` in their `specifications` JSONB. They will show the `Package` icon placeholder in all views. Edit and re-save the product to add an image.
- **`UPLOAD_DIR` is a relative path:** The `uploads/` directory is relative to the directory from which `uvicorn` is started. Always run uvicorn from `backend/` or set `UPLOAD_DIR` to an absolute path in `.env`.
- **Blob URLs in DB:** If the image upload API call fails silently during product creation, a temporary `blob:` URL may be stored in the database. These are ephemeral (browser session only) and will not display after page reload. Fix by editing the product and re-uploading the image.
- **Supabase Storage bucket:** The default `SUPABASE_BUCKET` value is `po-documents`. If you use Supabase for image storage, ensure the bucket name matches and is set to **public**.

---

## Future Improvements

- [ ] Migrate `image_url` from `specifications` JSONB to a dedicated DB column
- [ ] Add server-side pagination to avoid loading all records at once
- [ ] Implement real-time notifications (WebSocket or Supabase Realtime) for new RFQs and quote submissions
- [ ] Add multi-image support per product
- [ ] Role-based sub-permissions within each org type
- [ ] PDF quote preview in-browser (instead of download-only)
- [ ] Export orders to CSV/Excel

---

## License

Private project — all rights reserved.