# E-Commerce Platform — Complete App Overview

> Global e-commerce affiliate + marketplace platform  
> V1 Launch Country: Saudi Arabia (SA) | Currency: SAR

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | NestJS + TypeScript |
| Frontend (3 apps) | Next.js + TypeScript + Tailwind CSS |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | TypeORM |
| Search | OpenSearch |
| Cache/Jobs | Redis + BullMQ |
| Storage | Local filesystem (dev) / S3 (prod) |
| Monorepo | pnpm workspaces + Turborepo |
| Auth | JWT + Refresh Tokens + RBAC |

---

## Project Structure

```
D:\E-commerce\
├── apps/
│   ├── storefront/     → Customer-facing shop        (http://localhost:3001)
│   ├── vendor/         → Vendor management portal     (http://localhost:3002)
│   └── admin/          → Admin dashboard              (http://localhost:3003)
├── services/
│   └── api/            → NestJS backend API           (http://localhost:3000)
├── packages/
│   ├── shared-types/   → Shared TypeScript enums & types
│   └── ui-kit/         → Shared UI components, hooks, providers
└── docs/               → Architecture docs, plans, ADRs
```

---

## 10 Domain Modules

| # | Domain | What It Owns |
|---|--------|-------------|
| 1 | **Identity** | Users, Vendors, Vendor Staff, Auth, Refresh Tokens |
| 2 | **Catalog** | Products, Variants, Categories, Brands, Images, Attributes |
| 3 | **Offers** | Marketplace Offers, Affiliate Offers |
| 4 | **Cart** | Shopping Carts, Cart Items |
| 5 | **Orders** | Orders, Order Items, Order Status History |
| 6 | **Payments** | Payments, Payment Attempts, Refunds |
| 7 | **Logistics** | Shipments, Shipment Items, Tracking Events |
| 8 | **Reviews** | Review Eligibility, Reviews, Review Media |
| 9 | **Affiliate** | Affiliate Links, Clicks, Commissions |
| 10 | **Admin/Ops** | Audit Logs, Platform Settings |

**Total: 30 database tables**

---

## User Roles (7)

| Role | Login Email | Password |
|------|-----------|----------|
| Super Admin | `superadmin@ecommerce.local` | `Password123!` |
| Admin | `admin@ecommerce.local` | `Password123!` |
| Moderator | `moderator@ecommerce.local` | `Password123!` |
| Ops | `ops@ecommerce.local` | `Password123!` |
| Vendor | `vendor1@ecommerce.local` | `Password123!` |
| Vendor | `vendor2@ecommerce.local` | `Password123!` |
| Customer | `customer1@ecommerce.local` | `Password123!` |
| Customer | `customer2@ecommerce.local` | `Password123!` |
| Customer | `customer3@ecommerce.local` | `Password123!` |

---

## What Each Role Can Do

### Customer (Storefront — http://localhost:3001)

| Feature | Description |
|---------|------------|
| Register/Login | Create account with email and password |
| Browse Products | View products by category, brand, or search |
| Search | Full-text search with filters (price, rating, category) |
| View Product Details | See images, variants, descriptions, and available offers |
| Add to Cart | Add marketplace offers to shopping cart |
| Affiliate Redirect | Click affiliate offers to visit external merchants |
| Checkout | Place orders and pay for cart items |
| Order History | View past orders and order details |
| Track Shipments | See real-time shipment status and tracking |
| Cancel Orders | Cancel orders before they are shipped |
| Write Reviews | Submit reviews for delivered items only (verified purchase) |
| Edit Reviews | Modify pending reviews before admin moderation |
| Profile | Manage personal profile information |

### Vendor (Vendor Portal — http://localhost:3002)

| Feature | Description |
|---------|------------|
| Register Business | Apply for vendor approval |
| Dashboard | Overview of sales, orders, and products |
| Create Products | Add products with variants, images, and attributes |
| Upload Images | Upload product images (drag & drop, up to 5MB) |
| Submit for Review | Send products to admin for approval |
| Create Marketplace Offers | Set price, stock quantity, and country |
| Create Affiliate Offers | Set redirect URL and commission rate |
| Manage Offers | Activate, pause, update stock, archive offers |
| View Orders | See orders containing their products |
| Confirm Orders | Accept and confirm customer orders |
| Create Shipments | Create shipments for confirmed orders |
| Add Tracking | Add carrier and tracking number to shipments |
| Manage Staff | Invite staff members with specific permissions |
| View Reviews | See reviews on their products |
| Affiliate Performance | Track affiliate link clicks and commissions |
| Business Settings | Manage business profile and settings |

### Admin (Admin Panel — http://localhost:3003)

| Feature | Description |
|---------|------------|
| Dashboard | Platform-wide statistics (orders, revenue, vendors, products) |
| Manage Users | View and manage all user accounts |
| Approve Vendors | Approve or reject vendor applications |
| Approve Products | Approve or reject products submitted for review |
| Moderate Reviews | Approve or reject customer reviews |
| Manage Orders | View and manage all orders across the platform |
| Issue Refunds | Process refunds for orders |
| Manage Shipments | Force-deliver or cancel shipments |
| Manage Categories | Create and organize product categories |
| Manage Brands | Create and manage product brands |
| Manage Offers | View and manage all offers |
| View Audit Logs | See all admin and vendor actions |
| Search Reindex | Trigger full search index rebuild |
| Affiliate Commissions | Confirm affiliate commission payouts |
| Platform Settings | Manage platform-wide settings (super admin only) |
| Manage Roles | Assign and change user roles (super admin only) |

---

## Permission Matrix

| Operation | Super Admin | Admin | Moderator | Ops | Vendor | Customer |
|-----------|:-----------:|:-----:|:---------:|:---:|:------:|:--------:|
| Manage platform settings | Yes | — | — | — | — | — |
| Manage users/roles | Yes | Yes | — | — | — | — |
| Approve/reject vendors | Yes | Yes | — | — | — | — |
| Approve/reject products | Yes | Yes | Yes | — | — | — |
| Moderate reviews | Yes | Yes | Yes | — | — | — |
| View all orders | Yes | Yes | — | Yes | — | — |
| Manage shipments | Yes | Yes | — | Yes | — | — |
| View analytics | Yes | Yes | — | Yes | — | — |
| Issue refunds | Yes | Yes | — | — | — | — |
| Create/edit products | — | — | — | — | Yes | — |
| Manage offers | — | — | — | — | Yes | — |
| View own vendor orders | — | — | — | — | Yes | — |
| Manage vendor staff | — | — | — | — | Yes | — |
| Browse catalog | Yes | Yes | Yes | Yes | Yes | Yes |
| Place orders | — | — | — | — | — | Yes |
| Submit reviews | — | — | — | — | — | Yes |
| Manage own profile | Yes | Yes | Yes | Yes | Yes | Yes |

---

## Key Business Flows

### 1. Vendor Onboarding
```
Vendor Registers → Admin Reviews → Approved/Rejected
                                        ↓
                              Vendor Creates Products
                                        ↓
                              Submits for Admin Review
                                        ↓
                              Admin Approves Product
                                        ↓
                              Vendor Creates Offers (price, stock)
                                        ↓
                              Offer Goes Live on Storefront
```

### 2. Customer Purchase Flow
```
Customer Browses/Searches → Adds to Cart → Checkout
                                              ↓
                                        Place Order (stock reserved, prices snapshotted)
                                              ↓
                                        Payment Processing
                                              ↓
                                   Success → Order Confirmed
                                   Failure → Order Cancelled (stock released)
```

### 3. Order Fulfillment
```
Order Confirmed → Vendor Creates Shipment → Picks Items → Packs
                                                            ↓
                                          Ships → In Transit → Delivered
                                                                  ↓
                                                    Review Eligibility Created (90-day window)
                                                                  ↓
                                                    Customer Submits Review
                                                                  ↓
                                                    Admin Moderates → Published
```

### 4. Product Lifecycle
```
DRAFT → PENDING_REVIEW → APPROVED → (live on storefront)
                       → REJECTED → (vendor can edit and resubmit)
```

### 5. Order Status Lifecycle
```
PENDING_PAYMENT → CONFIRMED → PROCESSING → PARTIALLY_SHIPPED → SHIPPED → DELIVERED → COMPLETED
                → CANCELLED (if payment fails or customer cancels before shipping)
```

### 6. Payment Lifecycle
```
PENDING → PROCESSING → SUCCEEDED → PARTIALLY_REFUNDED → REFUNDED
                     → FAILED
```

### 7. Shipment Lifecycle
```
PENDING → PICKING → PACKED → SHIPPED → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                                                      → FAILED_DELIVERY → RETURNED
Any pre-shipped state → CANCELLED
```

---

## Offer Types

| Type | How It Works |
|------|-------------|
| **Marketplace** | Vendor sells through the platform. Cart, checkout, payment, and shipping handled by the platform. Stock is tracked. |
| **Affiliate** | Customer clicks and is redirected to an external merchant's website. No cart/checkout. Clicks and commissions are tracked. |

---

## Key Technical Features

| Feature | Implementation |
|---------|---------------|
| **State Machines** | Every entity status uses explicit transition maps (no loose flags) |
| **Idempotency** | Orders, payments, refunds, and reviews use idempotency keys to prevent duplicates |
| **Domain Events** | Cross-module communication via EventBus (EventEmitter2) |
| **JWT Auth** | Access token (15 min) + Refresh token (7 days, rotated) |
| **Image Upload** | Drag & drop upload, stored locally in dev, S3 in production |
| **Verified Reviews** | Only delivered order items can be reviewed, within 90-day window |
| **Audit Logging** | All admin/vendor actions logged with user, action, entity, and changes |
| **Price Storage** | All prices in minor currency units (halalah for SAR: 1 SAR = 100 halalah) |
| **Soft Delete** | Products and offers use soft delete (deleted_at) |

---

## API Endpoints Summary

| Module | Endpoint Prefix | Audience |
|--------|----------------|----------|
| Auth | `/api/v1/auth/*` | Public |
| Products | `/api/v1/vendor/products/*` | Vendor |
| Products | `/api/v1/products/*` | Public (browsing) |
| Products | `/api/v1/admin/catalog/*` | Admin |
| Offers | `/api/v1/vendor/offers/*` | Vendor |
| Offers | `/api/v1/offers/*` | Public |
| Cart | `/api/v1/cart/*` | Customer |
| Orders | `/api/v1/orders/*` | Customer |
| Orders | `/api/v1/vendor/orders/*` | Vendor |
| Orders | `/api/v1/admin/orders/*` | Admin |
| Payments | `/api/v1/payments/*` | Customer/Admin |
| Shipments | `/api/v1/vendor/shipments/*` | Vendor |
| Shipments | `/api/v1/tracking/*` | Customer |
| Reviews | `/api/v1/reviews/*` | Customer |
| Reviews | `/api/v1/admin/reviews/*` | Admin |
| Search | `/api/v1/search/*` | Public |
| Affiliate | `/api/v1/affiliate/*` | Vendor |

---

## Database

| Environment | Database | Location |
|-------------|----------|----------|
| Development | SQLite (better-sqlite3) | `D:\E-commerce\data\ecommerce.sqlite` |
| Production | PostgreSQL | Configured via environment variables |

- **Auto-sync**: Enabled in development (tables auto-created from entities)
- **30 tables** across 10 domain modules
- **UUID primary keys** on all tables
- **Timestamps**: `created_at` and `updated_at` on all tables

---

## How to Run

```bash
# Install dependencies
pnpm install

# Start all apps (API + 3 frontends)
pnpm dev

# Seed the database with test data
cd apps/api && npx ts-node src/database/seeds/dev-seed.ts
```

| App | URL |
|-----|-----|
| API | http://localhost:3000 |
| Storefront | http://localhost:3001 |
| Vendor Portal | http://localhost:3002 |
| Admin Panel | http://localhost:3003 |
| Swagger API Docs | http://localhost:3000/api/docs |

