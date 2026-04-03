# V1 Implementation Plan — Global E-commerce Affiliate + Marketplace Platform

> **Status:** Approved
> **Date:** 2026-02-26
> **Author:** Architecture Team

## Context

We are building a global e-commerce affiliate + marketplace platform designed for eventual 17-country support. V1 launches with one country (Saudi Arabia), physical products only, marketplace + affiliate offers, verified reviews, vendor self-service, and admin moderation.

The architecture is a **modular monolith** to avoid premature microservice complexity while maintaining strict domain boundaries. The platform supports two offer types: **marketplace** (vendor sells through the platform) and **affiliate** (redirect to external merchant). Travel is out of scope for v1.

---

## 1. Repo / Module Structure

**Tooling:** pnpm workspaces + Turborepo

```
E-commerce/
├── apps/
│   ├── storefront/              # Next.js — customer-facing store
│   ├── vendor/                  # Next.js — vendor portal
│   └── admin/                   # Next.js — admin panel
├── services/
│   └── api/                     # NestJS — modular monolith backend
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── common/          # Shared: guards, filters, interceptors, DTOs, utils, config
│           │   ├── config/      # app, database, redis, auth, s3, opensearch configs
│           │   ├── constants/   # countries, currencies, roles
│           │   ├── decorators/  # @CurrentUser, @Roles, @IdempotencyKey, @Public
│           │   ├── dto/         # PaginationDto, ApiResponseDto
│           │   ├── entities/    # BaseEntity (UUID PK, timestamps, soft delete)
│           │   ├── events/      # DomainEvent base, EventBus service
│           │   ├── filters/     # HttpExceptionFilter, AllExceptionsFilter
│           │   ├── guards/      # JwtAuthGuard, RolesGuard, VendorOwnerGuard
│           │   ├── interceptors/# LoggingInterceptor, TransformInterceptor
│           │   ├── pipes/       # ValidationPipe config
│           │   └── utils/       # slug, money, country helpers
│           ├── modules/
│           │   ├── identity/    # Auth, users, vendors, roles, sessions
│           │   ├── catalog/     # Products, variants, categories, brands, images
│           │   ├── offers/      # Marketplace + affiliate offers, pricing
│           │   ├── cart/        # Carts, cart items
│           │   ├── orders/      # Orders, order items, state machine
│           │   ├── payments/    # Payment intents, attempts, refunds, state machine
│           │   ├── logistics/   # Shipments, tracking, carrier webhooks
│           │   ├── reviews/     # Review eligibility, reviews, moderation
│           │   ├── affiliate/   # Affiliate links, clicks, commissions
│           │   ├── search/      # OpenSearch indexing and query service
│           │   └── admin/       # Audit logs, platform settings, moderation
│           ├── jobs/            # BullMQ queue definitions and processors
│           └── database/
│               ├── migrations/  # TypeORM migrations (ordered)
│               └── seeds/       # Dev seed data
├── packages/
│   ├── shared-types/            # TypeScript interfaces shared across all apps
│   ├── tsconfig/                # Shared tsconfig presets (base, nestjs, nextjs)
│   ├── eslint-config/           # Shared ESLint config
│   └── ui-kit/                  # Shared React components (Tailwind-based)
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml   # Postgres, Redis, OpenSearch, MinIO
│   │   └── postgres/init.sql
│   └── scripts/
│       └── setup-dev.sh
├── docs/
│   ├── adr/                     # Architecture Decision Records
│   ├── plans/                   # Implementation plans
│   ├── prd/                     # Product requirements
│   └── diagrams/                # Domain maps, ERDs, state machines
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
├── Dockerfile.api
└── README.md
```

**Key structural decisions:**
- Backend is ONE NestJS app (`apps/api`) with domain modules inside `src/modules/` — modular monolith pattern
- Each domain module owns its entities, DTOs, controllers, and services
- Cross-domain communication via internal EventBus (NestJS EventEmitter2), not HTTP
- Shared types in `packages/shared-types` consumed by all apps

---

## 2. Domain Map — Bounded Contexts

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Identity    │────▶│   Catalog   │────▶│   Offers    │
│             │     │             │     │             │
│ Users       │     │ Products    │     │ Marketplace │
│ Vendors     │     │ Variants    │     │ Affiliate   │
│ Roles/RBAC  │     │ Categories  │     │ Pricing     │
│ Sessions    │     │ Brands      │     │ Stock       │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │            ┌──────▼──────┐     ┌──────▼──────┐
       │            │   Search    │     │    Cart     │
       │            │             │     │             │
       │            │ Indexing    │     │ Cart items  │
       │            │ Querying    │     │ Validation  │
       │            └─────────────┘     └──────┬──────┘
       │                                       │
       │            ┌──────────────────────────▼┐
       └───────────▶│         Orders            │
                    │                           │
                    │ Order lifecycle            │
                    │ Order items                │
                    └─────┬──────────┬──────────┘
                          │          │
                   ┌──────▼──────┐  ┌▼─────────────┐
                   │  Payments   │  │   Logistics   │
                   │             │  │               │
                   │ Intents     │  │ Shipments     │
                   │ Attempts    │  │ Tracking      │
                   │ Refunds     │  │ Carrier hooks │
                   └─────────────┘  └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │   Reviews     │
                                    │               │
                                    │ Eligibility   │
                                    │ Reviews       │
                                    │ Moderation    │
                                    └───────────────┘

         ┌─────────────┐     ┌─────────────┐
         │  Affiliate   │     │  Admin/Ops  │
         │              │     │             │
         │ Links        │     │ Audit logs  │
         │ Clicks       │     │ Settings    │
         │ Commissions  │     │ Moderation  │
         └─────────────┘     └─────────────┘
```

### Domain responsibilities and inter-domain contracts

| Domain | Owns | Publishes Events | Consumes Events From |
|--------|------|------------------|---------------------|
| **Identity** | users, vendors, roles, permissions, sessions | `UserRegistered`, `VendorApproved`, `VendorSuspended` | — |
| **Catalog** | products, variants, categories, brands, product_images, product_attributes | `ProductCreated`, `ProductUpdated`, `ProductApproved`, `VariantCreated` | Identity (vendor ownership) |
| **Offers** | offers, offer_prices, country_availability | `OfferCreated`, `OfferUpdated`, `OfferDeactivated`, `StockChanged` | Catalog (product/variant refs) |
| **Cart** | carts, cart_items | `CartUpdated` | Offers (price/stock validation) |
| **Orders** | orders, order_items, order_status_history | `OrderCreated`, `OrderConfirmed`, `OrderCancelled`, `OrderCompleted` | Cart, Offers, Identity |
| **Payments** | payments, payment_attempts, refunds | `PaymentSucceeded`, `PaymentFailed`, `RefundIssued` | Orders |
| **Logistics** | shipments, shipment_items, shipment_tracking_events | `ShipmentCreated`, `ShipmentShipped`, `ShipmentDelivered` | Orders |
| **Reviews** | review_eligibility, reviews, review_media | `ReviewSubmitted`, `ReviewApproved`, `ReviewRejected` | Logistics (`ShipmentDelivered`) |
| **Affiliate** | affiliate_links, affiliate_clicks, affiliate_commissions | `AffiliateClickTracked`, `CommissionCalculated` | Orders (`OrderCompleted`) |
| **Admin/Ops** | audit_logs, platform_settings | — | All domains (audit trail) |

**Inter-domain rules:**
- Domains communicate via domain events through in-process EventBus (EventEmitter2)
- A domain NEVER directly queries another domain's repository — uses exported service interfaces
- Cross-domain references use IDs only (e.g., `order_items.offer_id`)

---

## 3. Core DB Entities and Relationships

All tables use `UUID` PKs via `uuid_generate_v4()`. All include `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. Soft-deletable tables include `deleted_at TIMESTAMPTZ NULL`.

### Identity

```sql
-- users
id              UUID PK DEFAULT uuid_generate_v4()
email           VARCHAR(255) NOT NULL UNIQUE
password_hash   VARCHAR(255) NOT NULL
first_name      VARCHAR(100) NOT NULL
last_name       VARCHAR(100) NOT NULL
phone           VARCHAR(20) NULL
avatar_url      VARCHAR(500) NULL
role            VARCHAR(50) NOT NULL DEFAULT 'customer'
email_verified  BOOLEAN NOT NULL DEFAULT false
is_active       BOOLEAN NOT NULL DEFAULT true
last_login_at   TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- vendors
id              UUID PK
user_id         UUID NOT NULL REFERENCES users(id)
business_name   VARCHAR(255) NOT NULL
slug            VARCHAR(255) NOT NULL UNIQUE
business_email  VARCHAR(255) NOT NULL
phone           VARCHAR(20) NULL
logo_url        VARCHAR(500) NULL
description     TEXT NULL
country_code    CHAR(2) NOT NULL DEFAULT 'SA'
status          VARCHAR(50) NOT NULL DEFAULT 'pending'
commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00
approved_at     TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- vendor_staff
id              UUID PK
vendor_id       UUID NOT NULL REFERENCES vendors(id)
user_id         UUID NOT NULL REFERENCES users(id)
permissions     JSONB NOT NULL DEFAULT '[]'
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE(vendor_id, user_id)

-- refresh_tokens
id              UUID PK
user_id         UUID NOT NULL REFERENCES users(id)
token_hash      VARCHAR(255) NOT NULL UNIQUE
expires_at      TIMESTAMPTZ NOT NULL
revoked         BOOLEAN NOT NULL DEFAULT false
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Catalog

```sql
-- categories (self-referencing tree)
id              UUID PK
parent_id       UUID NULL REFERENCES categories(id)
name            VARCHAR(255) NOT NULL
slug            VARCHAR(255) NOT NULL UNIQUE
description     TEXT NULL
image_url       VARCHAR(500) NULL
sort_order      INTEGER NOT NULL DEFAULT 0
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- brands
id              UUID PK
name            VARCHAR(255) NOT NULL
slug            VARCHAR(255) NOT NULL UNIQUE
logo_url        VARCHAR(500) NULL
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- products
id              UUID PK
vendor_id       UUID NOT NULL REFERENCES vendors(id)
category_id     UUID NULL REFERENCES categories(id)
brand_id        UUID NULL REFERENCES brands(id)
name            VARCHAR(500) NOT NULL
slug            VARCHAR(500) NOT NULL UNIQUE
description     TEXT NULL
short_description VARCHAR(1000) NULL
status          VARCHAR(50) NOT NULL DEFAULT 'draft'
country_of_origin CHAR(2) NULL
meta_title      VARCHAR(255) NULL
meta_description VARCHAR(500) NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
deleted_at      TIMESTAMPTZ NULL

-- variants
id              UUID PK
product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
sku             VARCHAR(100) NOT NULL UNIQUE
name            VARCHAR(255) NOT NULL
barcode         VARCHAR(100) NULL
weight_grams    INTEGER NULL
dimensions_cm   JSONB NULL
is_active       BOOLEAN NOT NULL DEFAULT true
sort_order      INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- product_images
id              UUID PK
product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
variant_id      UUID NULL REFERENCES variants(id) ON DELETE SET NULL
url             VARCHAR(500) NOT NULL
alt_text        VARCHAR(255) NULL
sort_order      INTEGER NOT NULL DEFAULT 0
is_primary      BOOLEAN NOT NULL DEFAULT false
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- product_attributes
id              UUID PK
product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
variant_id      UUID NULL REFERENCES variants(id) ON DELETE CASCADE
attribute_name  VARCHAR(100) NOT NULL
attribute_value VARCHAR(500) NOT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Offers

```sql
-- offers
id              UUID PK
product_id      UUID NOT NULL REFERENCES products(id)
variant_id      UUID NOT NULL REFERENCES variants(id)
vendor_id       UUID NOT NULL REFERENCES vendors(id)
offer_type      VARCHAR(20) NOT NULL       -- 'marketplace' | 'affiliate'
status          VARCHAR(50) NOT NULL DEFAULT 'draft'
country_code    CHAR(2) NOT NULL DEFAULT 'SA'
price_amount    INTEGER NOT NULL           -- minor units (halalah)
price_currency  CHAR(3) NOT NULL DEFAULT 'SAR'
compare_at_price INTEGER NULL              -- strikethrough price
cost_price      INTEGER NULL               -- vendor cost (private)
stock_quantity  INTEGER NOT NULL DEFAULT 0
stock_reserved  INTEGER NOT NULL DEFAULT 0
affiliate_url   VARCHAR(2000) NULL         -- affiliate offers only
affiliate_commission_pct DECIMAL(5,2) NULL
fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'vendor'
is_featured     BOOLEAN NOT NULL DEFAULT false
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
deleted_at      TIMESTAMPTZ NULL
UNIQUE(variant_id, vendor_id, country_code)
```

### Cart

```sql
-- carts
id              UUID PK
user_id         UUID NULL REFERENCES users(id)
session_id      VARCHAR(255) NULL
country_code    CHAR(2) NOT NULL DEFAULT 'SA'
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- cart_items
id              UUID PK
cart_id         UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE
offer_id        UUID NOT NULL REFERENCES offers(id)
quantity        INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0)
price_snapshot  INTEGER NOT NULL
currency        CHAR(3) NOT NULL DEFAULT 'SAR'
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE(cart_id, offer_id)
```

### Orders

```sql
-- orders
id              UUID PK
order_number    VARCHAR(20) NOT NULL UNIQUE
user_id         UUID NOT NULL REFERENCES users(id)
country_code    CHAR(2) NOT NULL
status          VARCHAR(50) NOT NULL DEFAULT 'pending_payment'
subtotal        INTEGER NOT NULL
shipping_total  INTEGER NOT NULL DEFAULT 0
tax_total       INTEGER NOT NULL DEFAULT 0
discount_total  INTEGER NOT NULL DEFAULT 0
grand_total     INTEGER NOT NULL
currency        CHAR(3) NOT NULL
shipping_address JSONB NOT NULL
billing_address  JSONB NULL
notes           TEXT NULL
idempotency_key VARCHAR(255) NOT NULL UNIQUE
cancelled_at    TIMESTAMPTZ NULL
completed_at    TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- order_items
id              UUID PK
order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
offer_id        UUID NOT NULL REFERENCES offers(id)
vendor_id       UUID NOT NULL REFERENCES vendors(id)
product_name    VARCHAR(500) NOT NULL
variant_name    VARCHAR(255) NOT NULL
sku             VARCHAR(100) NOT NULL
quantity        INTEGER NOT NULL CHECK(quantity > 0)
unit_price      INTEGER NOT NULL
total_price     INTEGER NOT NULL
currency        CHAR(3) NOT NULL
offer_type      VARCHAR(20) NOT NULL
status          VARCHAR(50) NOT NULL DEFAULT 'pending'
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- order_status_history
id              UUID PK
order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
from_status     VARCHAR(50) NULL
to_status       VARCHAR(50) NOT NULL
changed_by      UUID NULL REFERENCES users(id)
reason          TEXT NULL
metadata        JSONB NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Payments

```sql
-- payments
id              UUID PK
order_id        UUID NOT NULL REFERENCES orders(id)
amount          INTEGER NOT NULL
currency        CHAR(3) NOT NULL
status          VARCHAR(50) NOT NULL DEFAULT 'pending'
gateway         VARCHAR(50) NOT NULL
gateway_payment_id VARCHAR(255) NULL UNIQUE
payment_method  VARCHAR(50) NULL
idempotency_key VARCHAR(255) NOT NULL UNIQUE
metadata        JSONB NULL
paid_at         TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- payment_attempts
id              UUID PK
payment_id      UUID NOT NULL REFERENCES payments(id)
gateway_response JSONB NULL
status          VARCHAR(50) NOT NULL
error_message   TEXT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- refunds
id              UUID PK
payment_id      UUID NOT NULL REFERENCES payments(id)
order_id        UUID NOT NULL REFERENCES orders(id)
amount          INTEGER NOT NULL
currency        CHAR(3) NOT NULL
status          VARCHAR(50) NOT NULL DEFAULT 'pending'
reason          TEXT NULL
gateway_refund_id VARCHAR(255) NULL UNIQUE
idempotency_key VARCHAR(255) NOT NULL UNIQUE
processed_at    TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Logistics

```sql
-- shipments
id              UUID PK
order_id        UUID NOT NULL REFERENCES orders(id)
vendor_id       UUID NOT NULL REFERENCES vendors(id)
tracking_number VARCHAR(100) NULL
carrier         VARCHAR(50) NULL
status          VARCHAR(50) NOT NULL DEFAULT 'pending'
estimated_delivery_at TIMESTAMPTZ NULL
shipped_at      TIMESTAMPTZ NULL
delivered_at    TIMESTAMPTZ NULL
shipping_label_url VARCHAR(500) NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- shipment_items
id              UUID PK
shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE
order_item_id   UUID NOT NULL REFERENCES order_items(id)
quantity        INTEGER NOT NULL CHECK(quantity > 0)
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE(shipment_id, order_item_id)

-- shipment_tracking_events
id              UUID PK
shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE
status          VARCHAR(100) NOT NULL
description     TEXT NULL
location        VARCHAR(255) NULL
occurred_at     TIMESTAMPTZ NOT NULL
raw_payload     JSONB NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Reviews

```sql
-- review_eligibility
id              UUID PK
order_id        UUID NOT NULL REFERENCES orders(id)
order_item_id   UUID NOT NULL REFERENCES order_items(id) UNIQUE
user_id         UUID NOT NULL REFERENCES users(id)
product_id      UUID NOT NULL REFERENCES products(id)
variant_id      UUID NOT NULL REFERENCES variants(id)
status          VARCHAR(50) NOT NULL DEFAULT 'eligible'
eligible_until  TIMESTAMPTZ NOT NULL
idempotency_key VARCHAR(255) NOT NULL UNIQUE
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- reviews
id              UUID PK
review_eligibility_id UUID NOT NULL REFERENCES review_eligibility(id) UNIQUE
user_id         UUID NOT NULL REFERENCES users(id)
product_id      UUID NOT NULL REFERENCES products(id)
variant_id      UUID NOT NULL REFERENCES variants(id)
rating          SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5)
title           VARCHAR(255) NULL
body            TEXT NULL
status          VARCHAR(50) NOT NULL DEFAULT 'pending_moderation'
moderated_by    UUID NULL REFERENCES users(id)
moderated_at    TIMESTAMPTZ NULL
rejection_reason TEXT NULL
idempotency_key VARCHAR(255) NOT NULL UNIQUE
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- review_media
id              UUID PK
review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE
media_type      VARCHAR(20) NOT NULL
url             VARCHAR(500) NOT NULL
sort_order      INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Affiliate

```sql
-- affiliate_links
id              UUID PK
offer_id        UUID NOT NULL REFERENCES offers(id)
code            VARCHAR(50) NOT NULL UNIQUE
target_url      VARCHAR(2000) NOT NULL
click_count     INTEGER NOT NULL DEFAULT 0
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- affiliate_clicks
id              UUID PK
affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id)
user_id         UUID NULL REFERENCES users(id)
ip_address      VARCHAR(45) NULL
user_agent      TEXT NULL
referer         VARCHAR(2000) NULL
country_code    CHAR(2) NULL
clicked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- affiliate_commissions
id              UUID PK
affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id)
order_id        UUID NULL REFERENCES orders(id)
click_id        UUID NULL REFERENCES affiliate_clicks(id)
amount          INTEGER NOT NULL
currency        CHAR(3) NOT NULL
status          VARCHAR(50) NOT NULL DEFAULT 'pending'
idempotency_key VARCHAR(255) NOT NULL UNIQUE
confirmed_at    TIMESTAMPTZ NULL
paid_at         TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Admin / Ops

```sql
-- audit_logs
id              UUID PK
user_id         UUID NULL REFERENCES users(id)
action          VARCHAR(100) NOT NULL
entity_type     VARCHAR(100) NOT NULL
entity_id       UUID NOT NULL
changes         JSONB NULL
ip_address      VARCHAR(45) NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- platform_settings
id              UUID PK
key             VARCHAR(255) NOT NULL
value           JSONB NOT NULL
country_code    CHAR(2) NULL
description     TEXT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE(key, country_code)
```

---

## 4. API Surface for V1

All endpoints prefixed with `/api/v1`. Auth header: `Authorization: Bearer <jwt>`.

### Identity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register customer |
| POST | `/auth/login` | Public | Login → JWT + refresh token |
| POST | `/auth/refresh` | Public | Refresh JWT |
| POST | `/auth/logout` | Authed | Revoke refresh token |
| GET | `/auth/me` | Authed | Get current user profile |
| PATCH | `/auth/me` | Authed | Update profile |
| POST | `/auth/change-password` | Authed | Change password |
| POST | `/vendors/register` | Customer | Apply as vendor |
| GET | `/vendors/me` | Vendor | Get own vendor profile |
| PATCH | `/vendors/me` | Vendor | Update vendor profile |
| GET | `/vendors/me/staff` | VendorOwner | List staff members |
| POST | `/vendors/me/staff` | VendorOwner | Invite staff member |
| DELETE | `/vendors/me/staff/:id` | VendorOwner | Remove staff member |
| GET | `/admin/users` | Admin | List/search users |
| PATCH | `/admin/users/:id/role` | SuperAdmin | Change user role |
| GET | `/admin/vendors` | Admin | List/filter vendors |
| PATCH | `/admin/vendors/:id/approve` | Admin | Approve vendor |
| PATCH | `/admin/vendors/:id/suspend` | Admin | Suspend vendor |
| PATCH | `/admin/vendors/:id/reject` | Admin | Reject vendor |

### Catalog

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Public | List active categories (tree) |
| GET | `/categories/:slug` | Public | Get category by slug |
| GET | `/brands` | Public | List active brands |
| GET | `/products/:slug` | Public | Get product detail (approved only) |
| GET | `/products/:id/variants` | Public | List variants |
| POST | `/vendor/products` | Vendor | Create product (draft) |
| GET | `/vendor/products` | Vendor | List own products |
| GET | `/vendor/products/:id` | Vendor | Get own product detail |
| PATCH | `/vendor/products/:id` | Vendor | Update own product |
| POST | `/vendor/products/:id/submit` | Vendor | Submit for review |
| POST | `/vendor/products/:id/images` | Vendor | Upload images |
| DELETE | `/vendor/products/:id/images/:imageId` | Vendor | Delete image |
| POST | `/vendor/products/:id/variants` | Vendor | Create variant |
| PATCH | `/vendor/variants/:id` | Vendor | Update variant |
| GET | `/admin/products` | Admin | List all products |
| PATCH | `/admin/products/:id/approve` | Admin | Approve product |
| PATCH | `/admin/products/:id/reject` | Admin | Reject product |
| POST | `/admin/categories` | Admin | Create category |
| PATCH | `/admin/categories/:id` | Admin | Update category |
| POST | `/admin/brands` | Admin | Create brand |
| PATCH | `/admin/brands/:id` | Admin | Update brand |

### Offers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offers` | Public | List active offers (filterable) |
| GET | `/offers/:id` | Public | Get offer detail |
| POST | `/vendor/offers` | Vendor | Create offer |
| GET | `/vendor/offers` | Vendor | List own offers |
| PATCH | `/vendor/offers/:id` | Vendor | Update offer |
| PATCH | `/vendor/offers/:id/activate` | Vendor | Activate offer |
| PATCH | `/vendor/offers/:id/pause` | Vendor | Pause offer |
| PATCH | `/vendor/offers/:id/stock` | Vendor | Update stock |
| GET | `/admin/offers` | Admin | List all offers |
| PATCH | `/admin/offers/:id/archive` | Admin | Archive offer |

### Cart

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cart` | Customer/Guest | Get current cart |
| POST | `/cart/items` | Customer/Guest | Add item |
| PATCH | `/cart/items/:id` | Customer/Guest | Update quantity |
| DELETE | `/cart/items/:id` | Customer/Guest | Remove item |
| DELETE | `/cart` | Customer/Guest | Clear cart |
| POST | `/cart/merge` | Customer | Merge guest → user cart |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | Customer | Create order (idempotency_key required) |
| GET | `/orders` | Customer | List own orders |
| GET | `/orders/:id` | Customer | Get order detail |
| POST | `/orders/:id/cancel` | Customer | Cancel order |
| GET | `/vendor/orders` | Vendor | List orders with own items |
| GET | `/vendor/orders/:id` | Vendor | Get order (own items only) |
| PATCH | `/vendor/orders/:id/confirm` | Vendor | Confirm order items |
| GET | `/admin/orders` | Admin | List all orders |
| GET | `/admin/orders/:id` | Admin | Get any order detail |
| PATCH | `/admin/orders/:id/cancel` | Admin | Force-cancel order |

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/initiate` | Customer | Initiate payment (idempotency_key) |
| GET | `/payments/:id` | Customer | Get payment status |
| POST | `/payments/webhook/:gateway` | Public (sig verified) | Payment callback |
| POST | `/admin/refunds` | Admin | Issue refund |
| GET | `/admin/payments` | Admin | List all payments |

### Logistics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/vendor/shipments` | Vendor | Create shipment |
| GET | `/vendor/shipments` | Vendor | List own shipments |
| PATCH | `/vendor/shipments/:id/ship` | Vendor | Mark shipped + tracking |
| GET | `/shipments/:id/tracking` | Customer | Get tracking |
| POST | `/logistics/webhooks/carrier` | Public (sig verified) | Carrier webhook |
| GET | `/admin/shipments` | Admin | List all shipments |
| PATCH | `/admin/shipments/:id/deliver` | Admin | Force-deliver |

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/:productId/reviews` | Public | List approved reviews |
| GET | `/products/:productId/reviews/summary` | Public | Rating summary |
| GET | `/reviews/eligible` | Customer | List eligible items |
| POST | `/reviews` | Customer | Submit review (idempotency_key) |
| PATCH | `/reviews/:id` | Customer | Edit pending review |
| GET | `/admin/reviews` | Admin | Moderation queue |
| PATCH | `/admin/reviews/:id/approve` | Admin | Approve review |
| PATCH | `/admin/reviews/:id/reject` | Admin | Reject review |

### Affiliate

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/affiliate/links` | Vendor | List own links |
| POST | `/affiliate/links` | Vendor | Create link |
| GET | `/affiliate/links/:code` | Public | Redirect (302) + track click |
| GET | `/affiliate/commissions` | Vendor | List own commissions |
| GET | `/admin/affiliate/commissions` | Admin | List all commissions |
| PATCH | `/admin/affiliate/commissions/:id/confirm` | Admin | Confirm commission |

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/products` | Public | Full-text search with facets |
| GET | `/search/suggest` | Public | Autocomplete |
| POST | `/admin/search/reindex` | Admin | Trigger full reindex |

### Admin/Ops

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/audit-logs` | Admin | Query audit logs |
| GET | `/admin/settings` | Admin | List settings |
| PATCH | `/admin/settings/:key` | SuperAdmin | Update setting |
| GET | `/admin/dashboard/stats` | Admin | Dashboard stats |
| GET | `/health` | Public | Health check |

---

## 5. Background Jobs / Events

| Job/Event | Producer | Consumer(s) | Queue | Retry | Purpose |
|-----------|----------|-------------|-------|-------|---------|
| `OrderCreated` | Orders | Payments, Inventory | `order-events` | 3x exp. backoff | Reserve stock, initiate payment |
| `PaymentSucceeded` | Payments | Orders | `payment-events` | 3x | Confirm order |
| `PaymentFailed` | Payments | Orders, Inventory | `payment-events` | 3x | Cancel order, release stock |
| `OrderConfirmed` | Orders | Logistics, Notifications | `order-events` | 3x | Notify vendor to fulfill |
| `ShipmentDelivered` | Logistics | Reviews | `logistics-events` | 3x | Create review eligibility |
| `OrderCompleted` | Orders | Affiliate | `order-events` | 3x | Calculate commissions |
| `ProductCreated/Updated` | Catalog | Search | `search-index` | 5x | Index in OpenSearch |
| `OfferCreated/Updated` | Offers | Search | `search-index` | 5x | Update search index |
| `OfferDeactivated` | Offers | Search | `search-index` | 3x | Remove from index |
| `SendEmail` | Various | Email service | `email` | 3x | Transactional emails |
| `AffiliateClickTracked` | Affiliate | Analytics | `affiliate-events` | 1x | Increment click count |
| `ExpireEligibility` | Cron | Reviews | `review-cron` | 1x | Expire past-deadline eligibility |
| `FullReindex` | Cron/Manual | Search | `search-index` | 1x | Daily reconciliation |
| `CleanExpiredCarts` | Cron | Cart | `cart-cron` | 1x | Remove 30-day-old carts |
| `AuditLog` | All domains | Admin | `audit` | 3x | Write audit trail |

All jobs use BullMQ with Redis. Dead-letter queue for permanently failed jobs.

---

## 6. State Machines

### Order Lifecycle

```
States: pending_payment, confirmed, processing, partially_shipped,
        shipped, delivered, completed, cancelled, refunded

pending_payment  → confirmed         (PaymentSucceeded)
pending_payment  → cancelled         (PaymentFailed / customer cancel)
confirmed        → processing        (vendor starts fulfilling)
processing       → partially_shipped (some items shipped)
processing       → shipped           (all items shipped)
partially_shipped → shipped          (remaining items shipped)
shipped          → delivered          (all shipments delivered)
delivered        → completed          (auto after X days / admin)
confirmed        → cancelled          (before shipping starts)
completed        → refunded           (admin issues refund)
delivered        → refunded           (admin issues refund)
```

### Payment Lifecycle

```
States: pending, processing, succeeded, failed, cancelled,
        partially_refunded, refunded

pending    → processing            (gateway processing)
processing → succeeded             (gateway confirms)
processing → failed                (gateway rejects)
pending    → cancelled             (order cancelled before payment)
succeeded  → partially_refunded    (partial refund issued)
succeeded  → refunded              (full refund issued)
partially_refunded → refunded      (remaining refund issued)
```

### Shipment Lifecycle

```
States: pending, picking, packed, shipped, in_transit,
        out_for_delivery, delivered, failed_delivery, returned, cancelled

pending          → picking            (vendor starts picking)
picking          → packed             (items packed)
packed           → shipped            (handed to carrier)
shipped          → in_transit         (carrier scan)
in_transit       → out_for_delivery   (last mile)
out_for_delivery → delivered          (delivery confirmed)
out_for_delivery → failed_delivery    (delivery failed)
failed_delivery  → returned           (returned to sender)
Any pre-shipped  → cancelled          (vendor/admin cancels)
```

### Review Eligibility Lifecycle

```
States: eligible, review_submitted, expired

eligible → review_submitted  (customer submits review)
eligible → expired           (past eligible_until date)
```

### Offer Status

```
States: draft, active, paused, out_of_stock, archived

draft        → active        (vendor activates, product must be approved)
active       → paused        (vendor pauses)
paused       → active        (vendor reactivates)
active       → out_of_stock  (stock hits 0, automatic)
out_of_stock → active        (stock replenished)
any          → archived      (vendor or admin archives)
```

---

## 7. Security and Permissions Design

### Roles

| Role | Scope |
|------|-------|
| `super_admin` | Full system access, manages admins |
| `admin` | Moderate content, manage orders, view analytics |
| `vendor_owner` | Full access to own vendor data |
| `vendor_staff` | Scoped access per `vendor_staff.permissions` |
| `customer` | Browse, buy, review, manage own data |
| `guest` | Public browsing, session-based cart |

### Auth Flow

1. **Register:** POST `/auth/register` → bcrypt hash (12 rounds) → create user → JWT + refresh token
2. **Login:** verify credentials → JWT (15min) + refresh token (7 days, stored hashed)
3. **JWT claims:** `{ sub: userId, role, vendorId?, email, iat, exp }`
4. **Refresh:** validate token hash → new JWT + rotated refresh token
5. **Guards:** `JwtAuthGuard` → `RolesGuard` → `VendorOwnerGuard`

### Permission Matrix

| Operation | SuperAdmin | Admin | VendorOwner | VendorStaff | Customer |
|-----------|:---------:|:-----:|:-----------:|:-----------:|:--------:|
| Approve vendor | Y | Y | — | — | — |
| Approve product | Y | Y | — | — | — |
| Create product | — | — | Y | Y* | — |
| Manage offers | — | — | Y | Y* | — |
| View all orders | Y | Y | — | — | — |
| View vendor orders | — | — | Y | Y* | — |
| Place order | — | — | — | — | Y |
| Submit review | — | — | — | — | Y |
| Moderate reviews | Y | Y | — | — | — |
| Manage settings | Y | — | — | — | — |
| Issue refunds | Y | Y | — | — | — |

*Scoped by `vendor_staff.permissions` JSONB.

### Security Measures

- **Rate limiting:** `@nestjs/throttler` — 100/min public, 300/min authed, 10/min auth endpoints
- **Validation:** `class-validator` with `whitelist: true, forbidNonWhitelisted: true`
- **CORS:** restrict to known frontend origins
- **Helmet:** standard security headers
- **Webhook verification:** gateway/carrier-specific signatures
- **File uploads:** MIME validation, max 10MB images / 50MB video
- **SQL injection:** TypeORM parameterized queries only
- **Passwords:** bcrypt 12 rounds, min 8 chars

---

## 8. Phased Implementation Roadmap

### Phase 1: Foundation & Architecture Docs — Size: S
- All ADRs, PRD, diagrams, this plan
- **Done when:** All architecture documented and reviewed

### Phase 2: Monorepo Scaffolding — Size: M
- Root config, shared packages, NestJS skeleton, Next.js skeletons, docker-compose, health endpoint
- **Depends on:** Phase 1
- **Done when:** `pnpm install && pnpm build` works, `docker compose up` healthy, health returns 200

### Phase 3: Auth & RBAC — Size: M
- Identity module: users, vendors, staff, tokens
- Auth endpoints, JWT/refresh, guards, decorators
- **Depends on:** Phase 2
- **Done when:** Register/login/refresh flow works, RBAC enforced, vendor approval flow complete

### Phase 4: Catalog & Offers — Size: L
- Catalog module: products, variants, categories, brands, images
- Offers module: marketplace + affiliate offers, state machine
- S3 upload integration
- **Depends on:** Phase 3
- **Done when:** Vendors create products/offers, admin moderates, public browses

### Phase 5: Search Indexing — Size: M
- Search module: OpenSearch client, async indexing, full-text search, facets, autocomplete
- **Depends on:** Phase 4
- **Done when:** Products searchable, real-time indexing, daily reindex works

### Phase 6: Cart & Checkout — Size: M
- Cart module: guest + auth carts, validation, merge
- **Depends on:** Phase 4
- **Done when:** Cart CRUD works, price/stock validation, guest merge on login

### Phase 7: Orders & Payments — Size: L
- Orders module: order creation, state machine, idempotency
- Payments module: initiation, webhook, state machine, refunds
- **Depends on:** Phase 6
- **Done when:** Full order→payment→confirmation flow, idempotency verified

### Phase 8: Vendor Portal — Size: M
- `apps/vendor/` full UI: dashboard, products, offers, orders, staff
- **Depends on:** Phase 7
- **Done when:** Vendors fully self-service

### Phase 9: Logistics — Size: M
- Logistics module: shipments, tracking, carrier webhooks, state machine
- **Depends on:** Phase 7
- **Done when:** Shipments created, tracking works, order status syncs

### Phase 10: Verified Reviews — Size: M
- Reviews module: eligibility auto-creation, review submission, moderation
- **Depends on:** Phase 9
- **Done when:** Only verified purchasers can review, moderation works

### Phase 11: Admin Ops Tooling — Size: M
- `apps/admin/` full UI: dashboard, moderation, orders, settings, audit logs
- **Depends on:** All prior phases
- **Done when:** Admins can manage all platform operations

---

## 9. Risks and Tradeoffs

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Monolith coupling — hidden cross-module dependencies | Enforce EventBus-only communication, no cross-module entity imports |
| 2 | TypeORM migration conflicts | `YYYYMMDDHHMMSS-description.ts` naming, never edit committed migrations |
| 3 | Payment idempotency failures | UNIQUE `idempotency_key`, check-before-process, optimistic locking |
| 4 | Search index divergence | Async re-index on writes, daily full reconciliation, never query-of-truth |
| 5 | Multi-country complexity creep | Launch SA only, `country_code` in schema, behavior via `platform_settings` |
| 6 | Review eligibility race conditions | `UNIQUE(order_item_id)`, deterministic idempotency key |
| 7 | BullMQ job data loss | Dead-letter queue, admin visibility, all critical jobs idempotent |
| 8 | Vendor data isolation breach | `VendorOwnerGuard` filters by JWT vendor_id, integration tests verify isolation |
| 9 | Cart-to-order price drift | Re-validate all items at order creation, atomic stock decrement |
| 10 | Frontend-backend type drift | `packages/shared-types`, OpenAPI spec from `@nestjs/swagger`, CI type checks |

---

## 10. Files to Create First

### Phase 1 — Foundation Docs
1. `docs/prd/v1-scope.md`
2. `docs/plans/v1-implementation-plan.md`
3. `docs/adr/0001-modular-monolith.md`
4. `docs/adr/0002-typeorm-over-prisma.md`
5. `docs/adr/0003-state-machines.md`
6. `docs/adr/0004-multi-country-design.md`
7. `docs/adr/0005-search-as-read-model.md`
8. `docs/adr/0006-verified-reviews-only.md`
9. `docs/adr/0007-offer-types.md`
10. `docs/diagrams/domain-map.md`
11. `docs/diagrams/erd.md`
12. `docs/diagrams/state-machines.md`

### Phase 2 — Monorepo Scaffolding
1. `.gitignore`, `.env.example`
2. `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
3. `.eslintrc.js`, `.prettierrc`
4. `packages/tsconfig/*`, `packages/eslint-config/*`
5. `packages/shared-types/src/common.types.ts`
6. `infrastructure/docker/docker-compose.yml`, `postgres/init.sql`
7. `infrastructure/scripts/setup-dev.sh`
8. `apps/api/` — full NestJS scaffold with common module
9. `apps/storefront/`, `apps/vendor/`, `apps/admin/` — Next.js skeletons
10. `packages/ui-kit/` — skeleton
11. `apps/api/test/` — E2E test infrastructure
12. `Dockerfile.api`, `README.md`

---

## Key Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | TypeORM | NestJS-native, decorator entities, migration control |
| Auth | Passport.js + `@nestjs/passport` | Strategy-based, extensible |
| Validation | class-validator + class-transformer | Decorator DTOs, NestJS pipe integration |
| Job queues | BullMQ + `@nestjs/bull` | Redis-backed, retries, DLQ, repeatable |
| Monorepo | pnpm + Turborepo | Fast installs, incremental builds |
| CSS | Tailwind CSS | Utility-first, consistent |
| API docs | @nestjs/swagger | Auto-generated OpenAPI 3.0 |
| Logging | Pino (nestjs-pino) | Structured JSON, low overhead |
| Testing | Jest + Supertest | NestJS default |

---

## Assumptions

1. Launch country: Saudi Arabia (SA), currency SAR
2. Payment gateway abstracted — stub in v1, designed for Stripe/HyperPay/Tap
3. Carrier integration abstracted — manual tracking in v1
4. Email abstracted — stub in v1, designed for SendGrid/SES
5. No OAuth/social login in v1 — email/password only
6. No real-time features in v1 — polling sufficient
7. English only in v1 — i18n designed but not implemented
8. No subscriptions — one-time purchases only
9. Storefront gets basic functional UI; vendor/admin portals are the priority
