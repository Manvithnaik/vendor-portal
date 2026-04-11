# VendorHub — Vendor & Manufacturer Portal

A full-featured frontend portal for managing vendor-manufacturer workflows, built with React.js and Tailwind CSS.

## Features

- **Public Website** — Landing page with hero, features, and registration CTAs
- **Vendor & Manufacturer Registration** — Full form with status tracking
- **Role-based Login** — Admin, Vendor, Manufacturer with application approval gates
- **Admin Dashboard** — Approve/reject applications, manage admins
- **Vendor Dashboard** — Product CRUD, order management, shipping updates
- **Manufacturer Dashboard** — Browse products, place orders, track shipments
- **Application Status Tracker** — Visual timeline with resubmit capability

## Quick Start

### Prerequisites
- **Node.js** v16 or higher (https://nodejs.org)
- **npm** (comes with Node.js)

### Steps to Run

```bash
# 1. Extract the zip and navigate into it
cd vendor-portal

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app will open at **http://localhost:3000**

## Demo Credentials

| Role         | Email                  | Password  |
|--------------|------------------------|-----------|
| Admin        | admin@vendorhub.com    | admin123  |

> For Vendor/Manufacturer: Register first, then log in as Admin to approve the application, then log in as Vendor/Manufacturer.

## Workflow

1. **Register** as a Vendor or Manufacturer on the homepage
2. **Check status** on the Application Status page
3. **Admin logs in** → approves the application
4. **Vendor/Manufacturer logs in** with their credentials
5. **Vendor** adds products → **Manufacturer** browses and places orders
6. **Vendor** accepts orders and updates shipping status
7. **Manufacturer** tracks order delivery

## Tech Stack

- React 18 + React Router v6
- Tailwind CSS 3
- Lucide React icons
- localStorage for persistence (no backend needed)

## Project Structure

```
src/
├── App.js                  # Main routing
├── index.js                # Entry point
├── index.css               # Tailwind + custom styles
├── context/
│   └── AuthContext.js       # Auth state management
├── utils/
│   └── storage.js           # localStorage CRUD utilities
├── components/
│   ├── layout/
│   │   ├── Sidebar.js       # Dashboard sidebar navigation
│   │   └── DashboardLayout.js
│   └── common/
│       ├── StatusBadge.js
│       ├── StatusTimeline.js
│       ├── Modal.js
│       └── Toast.js
└── pages/
    ├── public/HomePage.js
    ├── auth/
    │   ├── LoginPage.js
    │   ├── RegisterPage.js
    │   └── ApplicationStatusPage.js
    ├── admin/
    │   ├── AdminDashboard.js
    │   ├── VendorApplications.js
    │   ├── ManufacturerApplications.js
    │   └── ManageAdmins.js
    ├── vendor/
    │   ├── VendorDashboard.js
    │   ├── VendorProfile.js
    │   ├── VendorProducts.js
    │   ├── VendorOrders.js
    │   └── VendorShipping.js
    └── manufacturer/
        ├── ManufacturerDashboard.js
        ├── ManufacturerProfile.js
        ├── BrowseProducts.js
        ├── PurchaseOrders.js
        └── OrderTracking.js
```
