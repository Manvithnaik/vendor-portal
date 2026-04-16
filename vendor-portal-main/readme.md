# VendorHub — B2B Vendor & Manufacturer Portal

A full-stack B2B procurement platform connecting **Vendors** (suppliers) and **Manufacturers** (buyers) through a structured RFQ → Quote → Purchase Order → Order workflow, managed by a central **Admin** portal.

> 🏷️ **Current Release:** `v1.0` · Branch: `main`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Core Procurement Workflow](#core-procurement-workflow)
- [Portals & Features](#portals--features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Key Design Decisions](#key-design-decisions)

---

## Overview

VendorHub is a production-grade B2B platform with three distinct portals:

| Portal | Role | Key Actions |
|--------|------|-------------|
| **Admin** | Platform operator | Approve vendor/manufacturer registrations, manage admins |
| **Vendor** | Supplier / Seller | List products, respond to RFQs with quotes, fulfill orders |
| **Manufacturer** | Buyer / Procurer | Browse products, raise RFQs, select quotes, raise Purchase Orders |

All accounts require **admin approval** before login is permitted.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | **FastAPI** (Python 3.11+) |
| ORM | **SQLAlchemy** with Alembic migrations |
| Database | **PostgreSQL** (hosted on Supabase) |
| Auth | **JWT** (separate token types for users vs admins) |
| File Uploads | Local filesystem via `UPLOAD_DIR` (PDF PO documents, product images) |
| Password Hashing | **bcrypt** (direct, no passlib) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | **React 18** (Create React App) |
| Routing | React Router v6 |
| HTTP Client | Axios with global interceptors (`src/api/client.js`) |
| Icons | Lucide React |
| Styling | Vanilla CSS with custom design tokens |

---

## Architecture

```
vendor-portal/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/v1/           # Route handlers (endpoints/)
│   │   ├── core/             # JWT, hashing, DB session
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── repositories/     # Data access layer
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── services/         # Business logic layer
│   │   └── utils/mappers.py  # Frontend ↔ DB enum translation
│   └── alembic/              # Database migrations
│
├── frontend/                 # React application
│   └── src/
│       ├── api/client.js     # Axios instance + interceptors
│       ├── context/          # AuthContext (JWT session management)
│       ├── components/       # Shared UI (PrivateRoute, Modal, Toast …)
│       ├── pages/
│       │   ├── admin/        # Admin portal pages
│       │   ├── vendor/       # Vendor portal pages
│       │   └── manufacturer/ # Manufacturer portal pages
│       └── services/         # API service layer (one file per domain)
│
└── database/                 # schema.sql (~28 tables)
```

---

## Core Procurement Workflow

```
Manufacturer creates RFQ
        │
        ▼
Vendors see & submit Quotes (price + lead time)
        │
        ▼
Manufacturer selects winning Quote
        │
        ▼
Manufacturer uploads PO document → creates Order
        │
        ▼
Vendor reviews PO → Accept / Reject
        │
        ▼
Vendor marks Shipped → Manufacturer tracks delivery
        │
        ▼
Order marked Delivered ✓
```

> **Business rule enforced in backend:** An Order can only be created if it references a valid, accepted `quotation_id`. Direct orders without a prior RFQ/Quote cycle are not permitted.

---

## Portals & Features

### 🔴 Admin Portal (`/admin`)
- Dashboard with live pending application counts
- Review & approve/reject **Vendor** and **Manufacturer** applications
- Manage admin accounts (create / list / deactivate)

### 🟦 Vendor Portal (`/vendor`)
- **Dashboard** — live stats (products, pending orders, shipped)
- **Products** — full CRUD with SKU, category, image upload
- **Orders** — view incoming Purchase Orders, accept or reject with reason
- **Shipping** — mark accepted orders as Shipped → Delivered
- **Returns** — placeholder (backend not yet implemented)

### 🟩 Manufacturer Portal (`/manufacturer`)
- **Browse Products** — search vendor catalogue, send RFQ per product
- **Quotations** — view submitted quotes per RFQ, select winning quote, place PO
- **Purchase Orders** — track all placed orders and their statuses
- **Order Tracking** — visual status timeline per order
- **Returns** — placeholder (backend not yet implemented)

---

## Project Structure — Service Layer

All API calls go through a typed service layer. Services return the full `APIResponse` envelope `{ status, message, data, errors }`.

| Service File | Endpoints |
|---|---|
| `authService.js` | `/auth/register`, `/auth/login`, `/auth/admin/login`, `/auth/me` |
| `productService.js` | `GET/POST/PUT/DELETE /products` |
| `rfqService.js` | `GET/POST /vendor/rfq`, `PUT /vendor/rfq/:id` |
| `quoteService.js` | `POST /vendor/rfq/quote`, `GET /vendor/rfq/:id/quotes`, `POST .../select-quote/:id` |
| `orderService.js` | `GET/POST /orders`, `GET /orders/:id`, `POST .../vendor-response`, `PATCH .../status` |
| `uploadService.js` | `POST /uploads/po-document`, `POST /uploads/product-image` |

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A PostgreSQL database (local or Supabase)

### 1. Clone the repo
```bash
git clone https://github.com/Manvithnaik/vendor-portal.git
cd vendor-portal
git checkout main   # production branch
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # macOS/Linux

pip install -r requirements.txt

# Copy and fill environment variables
cp .env.example .env          # edit DATABASE_URL, SECRET_KEY etc.

# Run migrations
alembic upgrade head

# Seed the default admin account
python seed_admin.py

# Start server
uvicorn app.main:app --reload
```
Backend runs at **http://127.0.0.1:8000**

### 3. Frontend setup
```bash
cd frontend
npm install
npm start
```
Frontend runs at **http://localhost:3000**

---

## Environment Variables

Create `backend/.env`:

```env
# Database (Supabase PostgreSQL or local)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
SECRET_KEY=your-256-bit-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000

# File uploads
UPLOAD_DIR=./uploads
```

---

## API Documentation

Interactive Swagger UI is available at:

```
http://127.0.0.1:8000/docs
```

ReDoc alternative:
```
http://127.0.0.1:8000/redoc
```

### Auth token types

| Token type | Used by | Endpoint |
|---|---|---|
| `type: user` | Vendors & Manufacturers | `POST /api/v1/auth/login` |
| `type: admin` | Platform admins | `POST /api/v1/auth/admin/login` |

---

## Database Schema

~28 tables across these domains:

| Domain | Key Tables |
|---|---|
| Identity | `organizations`, `users`, `roles`, `admins` |
| Products | `products`, `product_categories` |
| Procurement | `rfqs`, `rfq_broadcasts`, `quotes` |
| Orders | `orders`, `order_status_history` |
| Logistics | `shipments` |
| Finance | `invoices`, `payments` |
| Post-sale | `disputes`, `refunds`, `returns` |
| Support | `support_tickets` |
| Contracts | `contracts` |

> Full schema at `database/schema.sql`

### Important naming convention

The DB uses inverted terminology from the frontend:

| Frontend role | DB `org_type` |
|---|---|
| `"vendor"` (seller) | `OrgTypeEnum.manufacturer` |
| `"manufacturer"` (buyer) | `OrgTypeEnum.customer` |

This is handled transparently by `backend/app/utils/mappers.py`.

---

## Key Design Decisions

### Layered API response envelope
All endpoints return `{ status, message, data, errors }`. The Axios interceptor in `src/api/client.js` unwraps this transparently — callers receive the full envelope and access `.data`.

### Admin token isolation
Admin JWTs have `type: admin`. The `get_current_user` dependency rejects them, and `get_current_admin` accepts only them. `AuthContext.initAuth` skips `/auth/me` for admin sessions to prevent 401 redirect loops.

### RFQ visibility for vendors
Vendors see:
1. RFQs explicitly broadcast to their org (`rfq_broadcasts` table), **OR**
2. Open RFQs with no specific broadcast targeting (visible to all vendors)

### Route guards
`PrivateRoute` uses strict role matching — a `null` or mismatched role always redirects, never bypasses. Admins are redirected to `/admin`, vendors to `/vendor`, manufacturers to `/manufacturer`.

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — tagged `v1.0` |
| `dev` | Active development |

---

## License

MIT