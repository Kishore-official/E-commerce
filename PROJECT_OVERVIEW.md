# MERIDIAN — E-Commerce Platform

> **Global e-commerce affiliate + marketplace platform**
> Built for vendors to sell physical products (marketplace) or redirect buyers to external merchants (affiliate).
> V1 launches in Saudi Arabia with multi-country schema from day one.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Monorepo Structure](#monorepo-structure)
3. [Getting Started](#getting-started)
4. [API (Backend)](#api-backend)
5. [Frontend Apps](#frontend-apps)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [State Machines](#state-machines)
9. [Integrations](#integrations)
10. [Infrastructure & Deployment](#infrastructure--deployment)
11. [Testing](#testing)
12. [Business Rules](#business-rules)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 10, TypeORM, SQLite (dev) / PostgreSQL (prod) |
| **Frontend** | Next.js 14 (3 apps), React 18, Tailwind CSS |
| **Search** | OpenSearch 2.13 (derived read model) |
| **Queue** | BullMQ + Redis 7 |
| **Storage** | S3-compatible (MinIO for dev) |
| **Auth** | JWT + Refresh Tokens (Passport.js), bcrypt |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Containerization** | Docker, Nginx reverse proxy |
| **Language** | TypeScript (strict) across all packages |

---

## Monorepo Structure

```
ecommerce-platform/
├── apps/
│   ├── api/              # NestJS backend           (port 3000)
│   ├── storefront/       # Next.js — customer app   (port 3001)
│   ├── vendor/           # Next.js — vendor portal  (port 3002)
│   └── admin/            # Next.js — admin panel    (port 3003)
├── packages/
│   ├── shared-types/     # Enums & TypeScript interfaces (shared across all)
│   ├── ui-kit/           # 25+ React components, hooks, providers
│   ├── web-core/         # Axios API client, shared web utilities
│   ├── tsconfig/         # Shared TypeScript configs
│   └── eslint-config/    # Shared ESLint rules
├── infrastructure/
│   └── docker/           # docker-compose.yml (Redis, OpenSearch, MinIO)
├── docs/
│   ├── prd/              # Product requirements
│   ├── adr/              # Architecture decision records (ADR 0001–0007)
│   └── plans/            # Implementation plans
├── Dockerfile            # Multi-stage all-in-one image
├── Dockerfile.api        # API-only image
├── nginx.conf            # Reverse proxy (4 upstreams)
└── turbo.json            # Build pipeline
```

**8 workspace packages:** `@ecommerce/api`, `storefront`, `vendor`, `admin`, `shared-types`, `ui-kit`, `web-core`, `tsconfig`, `eslint-config`

---

## Getting Started

**Prerequisites:** Node.js >= 20, pnpm >= 9

```bash
# Install dependencies
pnpm install

# Start infrastructure (Redis, OpenSearch, MinIO)
cd infrastructure/docker && docker compose up -d

# Run all apps in dev mode
pnpm dev

# Build everything (~12s via Turborepo)
pnpm build

# Run tests
pnpm test          # Unit tests
pnpm test:e2e      # E2E tests
pnpm lint          # Lint all packages
```

| App | URL |
|-----|-----|
| API (Swagger) | http://localhost:3000/api/docs |
| Storefront | http://localhost:3001 |
| Vendor Portal | http://localhost:3002 |
| Admin Panel | http://localhost:3003 |

---

## API (Backend)

### Architecture: Modular Monolith

Single NestJS application with **12 bounded-context modules** in `apps/api/src/modules/`. Cross-module communication via domain events (EventEmitter2, wildcard + dot notation).

### Domain Modules & Endpoints (~111 total)

| Module | Endpoints | Responsibility |
|--------|-----------|----------------|
| **Identity** | 18 | Users, vendors, auth (JWT), role management |
| **Catalog** | 29 | Products, variants, brands, categories, images |
| **Offers** | 16 | Seller offers per variant/country (marketplace + affiliate) |
| **Cart** | 6 | Guest + authenticated carts, merge on login |
| **Orders** | 10 | Order lifecycle, status tracking |
| **Payments** | 5 | Payment processing, refunds, webhooks |
| **Logistics** | 7 | Shipments, carrier tracking, webhooks |
| **Reviews** | 10 | Verified reviews, eligibility, moderation |
| **Search** | 4 | Full-text search queries, admin reindex |
| **Admin** | 3 | Audit logs, platform settings |
| **Storefront** | 3 | Public product listing, featured/recommendations |
| **Affiliate** | 0 | Placeholder (link tracking, commissions — schema ready) |

**API prefix:** `/api/v1`
**Swagger docs:** `/api/docs`

### Module Structure Convention

```
modules/{domain}/
├── controllers/       # Split by audience: admin-, customer-, vendor-, public-
├── dto/               # class-validator DTOs
├── entities/          # TypeORM entities
├── events/            # DomainEvent subclasses
├── listeners/         # @OnEvent handlers for cross-module events
├── services/          # Business logic + colocated .spec.ts tests
├── state-machines/    # Status transition maps
└── {domain}.module.ts
```

### Key Architectural Patterns

| Pattern | Usage |
|---------|-------|
| **State Machines** | Every status field uses explicit `VALID_TRANSITIONS` map — never loose booleans |
| **Domain Events** | `eventBus.emit()` (fire-and-forget) / `emitAsync()` (await listeners). Dot notation: `orders.order.confirmed` |
| **Port/Adapter** | `PAYMENT_GATEWAY_PORT` → MockPaymentGateway, `CARRIER_PROVIDER_PORT` → MockCarrierProvider |
| **Idempotency** | `@IdempotencyKey()` decorator + unique constraint on orders, payments, refunds, reviews |
| **Soft Delete** | Offers use `SoftDeletableEntity` (deletedAt) — TypeORM excludes by default |

### Path Aliases (tsconfig)

```
@common/*  → src/common/*      (guards, decorators, entities, events, filters, config)
@modules/* → src/modules/*     (domain modules)
@jobs/*    → src/jobs/*         (BullMQ queue definitions)
@database/* → src/database/*   (data source, migrations)
```

---

## Frontend Apps

### Storefront (Customer-Facing) — 15 routes

**Design System: MERIDIAN** — "Refined Contemporary Marketplace"

| Element | Value |
|---------|-------|
| Palette | Charcoal `#1a1614`, Cream `#faf7f2`, Sand `#f0ebe0`, Gold `#c4933f`, Stone `#8a8278` |
| Fonts | Cormorant Garamond (headings/display) + DM Sans (body) |
| Icons | lucide-react |
| CSS Module | `apps/storefront/src/app/store.module.css` |

**Routes:**
- `/` — Homepage (hero, featured products, categories)
- `/search` — Search results with filters
- `/categories/[slug]` — Category listing
- `/products/[slug]` — Product detail (images, variants, offers)
- `/cart` — Shopping cart
- `/checkout` — Checkout flow
- `/checkout/confirmation` — Order confirmation
- `/login`, `/register` — Auth (luxury split-screen dark design)
- `/profile`, `/orders`, `/orders/[id]`, `/reviews`, `/reviews/new/[id]` — Account pages

### Vendor Portal — 17 routes

**Design:** Dark sidebar (`#0f172a`), indigo accent (`#6366f1`), Plus Jakarta Sans font.

**Routes:**
- `/dashboard` — Sales overview, stats
- `/products`, `/products/new`, `/products/[id]` — Product CRUD
- `/offers`, `/offers/new`, `/offers/[id]` — Offer CRUD
- `/orders`, `/orders/[id]` — Order management
- `/shipments`, `/shipments/[id]` — Shipment tracking
- `/reviews` — Customer reviews
- `/settings` — Profile & store settings
- Auth: `/login`, `/register`, `/pending`

### Admin Panel — 16 routes

**Routes:**
- `/dashboard` — Overview, system stats
- `/users`, `/vendors`, `/vendors/[id]` — User & vendor management
- `/products`, `/products/[id]` — Product catalog
- `/categories`, `/brands` — Taxonomy management
- `/offers`, `/offers/[id]` — Offer approval/rejection
- `/orders`, `/orders/[id]` — Order management
- `/shipments` — Shipment tracking
- `/reviews`, `/reviews/[id]` — Review moderation
- `/audit-logs` — Audit trail

### Shared UI Kit — 25+ components

Includes: Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, DropdownMenu, EmptyState, FormField, ImageUpload, Input, Modal, PageHeader, Pagination, PriceDisplay, SearchInput, Select, SidebarNav, Spinner, StatsCard, StatusBadge, Textarea, UnifiedLoginForm, UnifiedRegisterForm.

**5 hooks:** useApi, useAuth, useDebounce, usePagination, useToast
**3 providers:** AuthProvider, SWRProvider, ToastProvider
**Data fetching:** SWR (client-side) + Axios with JWT refresh queue

---

## Database Schema

**30 entities** across 10 modules. All extend `BaseEntity` (id, createdAt, updatedAt) or `SoftDeletableEntity` (adds deletedAt). Prices stored in minor currency units (halalah for SAR).

### Entity Map

| Module | Entities |
|--------|----------|
| **Identity** | User, Vendor, VendorStaff, RefreshToken |
| **Catalog** | Product, Category, Brand, Variant, ProductImage, ProductAttribute |
| **Offers** | Offer (unique: variantId + vendorId + countryCode) |
| **Cart** | Cart, CartItem |
| **Orders** | Order, OrderItem, OrderStatusHistory |
| **Payments** | Payment, PaymentAttempt, Refund |
| **Logistics** | Shipment, ShipmentItem, ShipmentTrackingEvent |
| **Reviews** | Review, ReviewEligibility, ReviewMedia |
| **Affiliate** | AffiliateLink, AffiliateClick, AffiliateCommission |
| **Admin** | AuditLog, PlatformSetting |

**Key relationships:**
- `OrderItem` has `offerId` (NOT productId/variantId) — must join through Offer
- `ReviewEligibility` auto-created on shipment delivery, one per orderItemId
- `Offer` is soft-deletable — TypeORM excludes deleted records by default

---

## Authentication & Authorization

### Auth Flow

| Step | Detail |
|------|--------|
| Register | `POST /api/v1/auth/register` → bcrypt hash → create User → return tokens |
| Login | `POST /api/v1/auth/login` → verify hash → access token (15 min) + refresh token (7 days) |
| Refresh | `POST /api/v1/auth/refresh` → verify stored refresh token → new access token |
| Storage | Access token: in-memory. Refresh token: localStorage (HTTP-only cookie in prod) |

### 7 Roles (RBAC)

| Role | Access |
|------|--------|
| `super_admin` | Full platform access |
| `admin` | Vendor/product/order management |
| `moderator` | Review moderation |
| `ops` | Operational tasks (shipments, payments) |
| `vendor` | Own products, offers, orders |
| `vendor_staff` | Scoped permissions under vendor |
| `customer` | Browse, buy, review |

### Guards

| Guard | Scope | Purpose |
|-------|-------|---------|
| `JwtAuthGuard` | Global | Validates Bearer token. Bypass with `@Public()` |
| `RolesGuard` | Global | Checks `@Roles(...)` decorator. No roles = any authenticated user |
| `VendorOwnerGuard` | Per-route | Ensures vendor owns the resource. Admins bypass |
| `ActiveVendorGuard` | Per-route | Ensures vendor status is APPROVED |

### JWT Payload

```typescript
{ sub: userId, email: string, role: UserRole, vendorId?: string }
```

---

## State Machines

9 explicit state machines control all status fields. Each uses a `VALID_TRANSITIONS` record with `canTransition()` and `assertTransition()` functions.

### Product Status
```
DRAFT → PENDING_REVIEW → APPROVED → ARCHIVED
                       → REJECTED → DRAFT (retry)
```
Products editable only in DRAFT/REJECTED.

### Offer Status
```
DRAFT → ACTIVE ↔ PAUSED
               → OUT_OF_STOCK (auto when stock=0)
               → ARCHIVED
```
Unique constraint: (variantId, vendorId, countryCode).

### Order Status
```
PENDING_PAYMENT → CONFIRMED → PROCESSING → PARTIALLY_SHIPPED → SHIPPED → DELIVERED → COMPLETED
Early cancellation from: PENDING_PAYMENT, CONFIRMED, PROCESSING
```

### Payment Status
```
PENDING → PROCESSING → SUCCEEDED → PARTIALLY_REFUNDED → REFUNDED
                     → FAILED → PENDING (retry)
```

### Shipment Status
```
PENDING → PICKING → PACKED → SHIPPED → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                      → FAILED_DELIVERY → IN_TRANSIT (retry) / RETURNED
```
**Critical rule:** SHIPPED → IN_TRANSIT → DELIVERED (no shortcut).

### Review & Eligibility
```
Review:      PENDING_MODERATION → APPROVED / REJECTED
Eligibility: ELIGIBLE → REVIEW_SUBMITTED / EXPIRED (90-day window)
```

---

## Integrations

### Payment Gateway (Port/Adapter)

```
Port: PaymentGatewayPort (createPayment, capturePayment, refundPayment, parseWebhook)
Adapter: MockPaymentGateway (dev) — designed for Stripe/HyperPay/Tap
Webhook: POST /api/v1/payments/webhook (idempotent processing)
```

### Shipping Carrier (Port/Adapter)

```
Port: CarrierProviderPort (createShipment, getTrackingInfo, parseWebhook)
Adapter: MockCarrierProvider (dev) — designed for Aramex/SMSA/DHL
Webhook: POST /api/v1/logistics/carrier-webhook (dedup: tracking+status+occurredAt)
```

### OpenSearch (Derived Read Model)

- Index: `offers_{countryCode}` (e.g., `offers_sa`)
- Sync: Domain Event → @OnEvent → BullMQ job → Processor → OpenSearch
- Graceful degradation: app works without OpenSearch (search returns 503)
- Supports 1M+ products target

### File Storage (S3/MinIO)

- Product images, shipping labels, review media
- Dev: MinIO on port 9000 (bucket: `ecommerce`)

### Message Queues (BullMQ — 9 queues)

`search-index`, `email`, `order-events`, `payment-events`, `logistics-events`, `affiliate-events`, `review-cron`, `cart-cron`, `audit`

---

## Infrastructure & Deployment

### Docker Compose Services (Dev)

| Service | Port | Purpose |
|---------|------|---------|
| Redis 7 | 6379 | BullMQ job queue |
| OpenSearch 2.13 | 9200 | Full-text search |
| OpenSearch Dashboards | 5601 | Search UI |
| MinIO | 9000/9001 | S3-compatible storage |
| PostgreSQL (optional) | 5432 | Production database |

### Production Docker

- **Multi-stage Dockerfile:** builds all 4 apps into a single image
- **Nginx reverse proxy** on port 3000:
  - `/api/` → NestJS (port 4000)
  - `/vendor/` → Vendor portal (port 4002)
  - `/admin/` → Admin panel (port 4003)
  - `/` → Storefront (port 4001)

### Environment Variables

```
# Database
DB_PATH=data/ecommerce.sqlite     # Dev (SQLite)
DATABASE_URL=postgres://...        # Prod (PostgreSQL)

# Auth
JWT_SECRET=...
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Services
REDIS_URL=redis://localhost:6379
OPENSEARCH_NODES=http://localhost:9200
S3_BUCKET=ecommerce
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## Testing

### Strategy

| Type | Location | Database | Framework |
|------|----------|----------|-----------|
| Unit | `*.spec.ts` colocated with source | Mocked repos | Jest 29 |
| E2E | `test/*.e2e-spec.ts` | In-memory SQLite | Jest + supertest |

### Test Counts

- **~400 unit tests** across 32 spec files
- **~109 E2E tests** across 12 spec files
- Covers: services, state machines, guards, controllers, full HTTP flows

### Running Tests

```bash
pnpm test                                                    # All unit tests
pnpm test:e2e                                                # All E2E tests
pnpm --filter @ecommerce/api test -- --testPathPattern="reviews"   # Specific test
```

---

## Business Rules

### Orders & Payments
- Only marketplace offers can be checked out (affiliate = redirect only)
- Cart items re-validated at order creation (price, stock, offer status)
- Order creation is idempotent via `X-Idempotency-Key` header
- Order confirmed only after successful payment
- Prices snapshotted at order creation time
- Stock reserved on order creation, released on cancellation

### Reviews
- Only verified purchases (delivered order items) can be reviewed
- Eligibility auto-created on delivery, expires after 90 days
- One review per order item maximum
- All reviews moderated before public visibility

### Vendors
- Vendor registration requires admin approval
- Suspended vendors cannot create or activate offers
- Products must be approved before offers can go active

### Launch Configuration (Saudi Arabia)
- Country: SA | Currency: SAR (stored in halalah)
- Tax: included in price (v1)
- Payment: stub gateway (designed for HyperPay/Stripe)
- Shipping: manual tracking (designed for Aramex/SMSA/DHL)

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Workspace packages | 8 |
| Apps | 4 (1 API + 3 frontends) |
| Domain modules | 12 |
| Database entities | 30 |
| API endpoints | ~111 |
| State machines | 9 |
| Auth roles | 7 |
| UI components | 25+ |
| BullMQ queues | 9 |
| Unit tests | ~400 |
| E2E tests | ~109 |
| Frontend routes | 48 (15 + 17 + 16) |
