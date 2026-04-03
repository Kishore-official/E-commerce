# V1 Database Schema

## Overview

30 tables across 10 domain modules. SQLite for local dev, designed for PostgreSQL in production.

**Conventions:**
- UUID primary keys (varchar(36)) — generated in app layer
- `created_at`, `updated_at` audit timestamps on all tables
- `deleted_at` for soft-deletable entities (products, offers)
- Money stored as integer minor units (1 SAR = 100 halalah)
- JSON columns use `simple-json` (text with auto-serialization)
- Cross-module references are plain FK columns — no TypeORM relations across module boundaries
- Status fields use varchar with enum validation at app layer

## Table Summary

| Module | Table | Rows (est.) | Key Constraints |
|--------|-------|-------------|-----------------|
| **Identity** | `users` | 10K-100K | UNIQUE(email) |
| | `vendors` | 100-1K | UNIQUE(slug), UNIQUE(user_id) |
| | `vendor_staff` | 100-500 | UNIQUE(vendor_id, user_id) |
| | `refresh_tokens` | 10K-100K | UNIQUE(token_hash) |
| **Catalog** | `categories` | 50-500 | UNIQUE(slug), self-ref parent_id |
| | `brands` | 50-500 | UNIQUE(slug) |
| | `products` | 1K-50K | UNIQUE(slug), soft-delete |
| | `variants` | 5K-200K | UNIQUE(sku), CASCADE delete |
| | `product_images` | 10K-500K | CASCADE delete |
| | `product_attributes` | 10K-500K | CASCADE delete (EAV pattern) |
| **Offers** | `offers` | 5K-200K | UNIQUE(variant, vendor, country), soft-delete |
| **Cart** | `carts` | 1K-50K | guest (session_id) or auth (user_id) |
| | `cart_items` | 5K-200K | UNIQUE(cart_id, offer_id), CASCADE delete |
| **Orders** | `orders` | 1K-100K | UNIQUE(order_number), UNIQUE(idempotency_key) |
| | `order_items` | 5K-500K | CASCADE delete |
| | `order_status_history` | 10K-1M | Append-only audit trail |
| **Payments** | `payments` | 1K-100K | UNIQUE(idempotency_key), UNIQUE(gateway_payment_id) |
| | `payment_attempts` | 2K-200K | Append-only log |
| | `refunds` | 100-10K | UNIQUE(idempotency_key), UNIQUE(gateway_refund_id) |
| **Logistics** | `shipments` | 1K-100K | |
| | `shipment_items` | 5K-500K | UNIQUE(shipment_id, order_item_id) |
| | `shipment_tracking_events` | 10K-1M | Append-only from carrier webhooks |
| **Reviews** | `review_eligibility` | 5K-500K | UNIQUE(order_item_id), UNIQUE(idempotency_key) |
| | `reviews` | 1K-100K | UNIQUE(review_eligibility_id), UNIQUE(idempotency_key) |
| | `review_media` | 2K-200K | CASCADE delete |
| **Affiliate** | `affiliate_links` | 100-10K | UNIQUE(code) |
| | `affiliate_clicks` | 10K-1M | High-volume append-only |
| | `affiliate_commissions` | 1K-100K | UNIQUE(idempotency_key) |
| **Admin** | `audit_logs` | 100K-10M | Append-only, composite index on (entity_type, entity_id) |
| | `platform_settings` | 10-100 | UNIQUE(key, country_code) |

## Entity Relationship Diagram

```
IDENTITY                        CATALOG                         OFFERS
┌──────────┐                   ┌──────────────┐                ┌──────────┐
│  users   │◄──┐               │  categories  │◄─┐             │  offers  │
│          │   │  ┌──────────┐ │  (self-ref)  │  │             │          │
│ email UQ │   ├──│ vendors  │ └──────┬───────┘  │             │ product* │
│ role     │   │  │          │        │          │             │ variant* │
└────┬─────┘   │  │ slug UQ  │ ┌──────▼───────┐  │             │ vendor*  │
     │         │  │ user UQ  │ │  products    │──┘             │ country  │
     │         │  └──────────┘ │              │                │ price    │
     │         │               │ vendor*      │◄─── ┌────────┐ │ stock    │
     │    ┌────┴─────┐         │ slug UQ      │     │ brands │ │ UQ(v,vn,│
     │    │  vendor  │         │ soft-delete  │◄────│ slug UQ│ │    cc)  │
     │    │  _staff  │         └──┬──┬────────┘     └────────┘ └────┬────┘
     │    │ UQ(v,u)  │            │  │                              │
     │    └──────────┘     ┌──────┘  └──────┐                      │
     │                     ▼                ▼                      │
     │              ┌───────────┐   ┌──────────────┐               │
┌────┴─────────┐    │ variants  │   │product_images│               │
│refresh_tokens│    │           │   └──────────────┘               │
│ token_hash UQ│    │ sku UQ    │   ┌──────────────┐               │
└──────────────┘    └───────────┘   │product_attrs │               │
                                    └──────────────┘               │
                                                                   │
CART                    ORDERS                          PAYMENTS    │
┌──────────┐           ┌──────────────┐               ┌──────────┐ │
│  carts   │◄──┐       │   orders     │◄──────────────│ payments │ │
│          │   │       │              │               │          │ │
│ user*?   │   │       │ user*        │               │ order*   │ │
│ session? │   │       │ order_num UQ │               │ idemp UQ │ │
└────┬─────┘   │       │ idemp UQ     │               │ gw_id UQ │ │
     │         │       └──┬───────────┘               └────┬─────┘ │
┌────▼─────┐   │          │                                │       │
│cart_items │───┘   ┌──────▼───────┐               ┌───────▼─────┐ │
│          │       │ order_items  │               │  payment    │ │
│ offer*   │       │              │               │  _attempts  │ │
│ UQ(c,o)  │       │ offer*       │               └─────────────┘ │
└──────────┘       │ vendor*      │               ┌─────────────┐ │
                   │ snapshots    │               │   refunds   │ │
                   └──────────────┘               │ idemp UQ    │ │
                   ┌──────────────┐               └─────────────┘ │
                   │order_status  │                                │
                   │  _history    │                                │
                   │ append-only  │                                │
                   └──────────────┘                                │
                                                                   │
LOGISTICS                REVIEWS                    AFFILIATE      │
┌──────────────┐        ┌───────────────┐          ┌────────────┐  │
│  shipments   │        │review_eligib. │          │ aff_links  │◄─┘
│              │        │               │          │            │
│ order*       │        │ order_item UQ │          │ offer*     │
│ vendor*      │        │ user*         │          │ code UQ    │
└──┬─────┬─────┘        │ product*      │          └──┬─────┬───┘
   │     │              │ idemp UQ      │             │     │
   ▼     ▼              └───────┬───────┘             ▼     ▼
┌──────┐┌──────────┐            │              ┌─────────┐┌──────────┐
│ ship ││ tracking │     ┌──────▼───────┐      │  aff    ││  aff     │
│_items││ _events  │     │   reviews    │      │ _clicks ││ _commis  │
│      ││          │     │              │      └─────────┘│ sions    │
│UQ(s, ││ append-  │     │ elig UQ      │                 │ idemp UQ │
│  oi) ││ only     │     │ user*        │                 └──────────┘
└──────┘└──────────┘     │ product*     │
                         │ idemp UQ     │     ADMIN
                         └──────┬───────┘     ┌─────────────┐
                                │             │ audit_logs   │
                         ┌──────▼───────┐     │ IDX(type,id) │
                         │review_media  │     ├─────────────┤
                         └──────────────┘     │ platform    │
                                              │ _settings   │
Legend:                                       │ UQ(key,cc)  │
  ◄── = FK relation (within module)           └─────────────┘
  *   = cross-module ID reference (no ORM relation)
  UQ  = unique constraint
```

## Index Strategy

### Query-driven indexes

| Index | Purpose | Expected Query Pattern |
|-------|---------|----------------------|
| `idx_users_role` | Admin: list users by role | `WHERE role = ?` |
| `idx_vendors_status` | Admin: filter vendors by approval status | `WHERE status = ?` |
| `idx_products_vendor_id` | Vendor portal: list own products | `WHERE vendor_id = ?` |
| `idx_products_status` | Admin/storefront: filter by status | `WHERE status = 'approved'` |
| `idx_offers_product_country_status` | Storefront: list offers for product | `WHERE product_id = ? AND country_code = ? AND status = 'active'` |
| `idx_offers_vendor_status` | Vendor portal: list own offers | `WHERE vendor_id = ? AND status = ?` |
| `idx_orders_user_id` | Customer: order history | `WHERE user_id = ?` |
| `idx_orders_status` | Admin: orders by status | `WHERE status = ?` |
| `idx_order_items_vendor_id` | Vendor: orders containing own items | `WHERE vendor_id = ?` |
| `idx_payments_order_id` | Payment lookup for order | `WHERE order_id = ?` |
| `idx_shipments_order_id` | Shipments for order | `WHERE order_id = ?` |
| `idx_reviews_product_id` | Product page: list reviews | `WHERE product_id = ? AND status = 'approved'` |
| `idx_review_eligibility_user_id` | Customer: eligible items to review | `WHERE user_id = ? AND status = 'eligible'` |
| `idx_audit_logs_entity` | Audit trail: entity history | `WHERE entity_type = ? AND entity_id = ?` |

### Indexes NOT created (by design)

- No full-text search indexes on products — OpenSearch handles all search queries
- No composite indexes on audit_logs beyond (entity_type, entity_id) — audit queries are admin-only, low frequency
- No index on `offers.is_featured` — featured products are cached in application layer

## Design Tradeoffs

### 1. SQLite for Dev, PostgreSQL for Production
**Tradeoff:** SQLite lacks native UUID, JSONB, and timezone types. TypeORM abstracts these differences but some Postgres-specific features (e.g. GIN indexes on JSONB, native arrays) are unavailable in dev.

**Why:** Zero-dependency local development. No Docker required for basic API work. TypeORM entity definitions work identically on both databases — only the connection config changes.

**Migration path:** Change `type: 'better-sqlite3'` to `type: 'postgres'` in config. Update connection params. Run migration against Postgres. All entities, indexes, and constraints apply unchanged.

### 2. UUIDs as varchar(36) — Not Native UUID Type
**Tradeoff:** 36 bytes per key vs 16 bytes for native Postgres UUID. Slightly slower joins.

**Why:** SQLite has no native UUID type. App-layer UUID generation works identically on both databases. The performance difference is negligible at V1 scale (< 1M rows per table). When switching to Postgres, can migrate to native `uuid` type.

### 3. simple-json Instead of JSONB
**Tradeoff:** Cannot query inside JSON columns at the database level. No GIN indexes on JSON fields.

**Why:** SQLite has no native JSON type. `simple-json` stores as text with app-layer serialization. JSON columns in this schema (shipping_address, dimensions_cm, metadata, permissions) are read as whole objects — they are not filtered or sorted by internal keys. When switching to Postgres, change to `jsonb` for columns that need in-DB queries.

### 4. Cross-Module References as Plain Columns
**Tradeoff:** No cascading deletes or TypeORM eager loading across module boundaries. Must manually maintain referential integrity.

**Why:** Domain isolation. Modules should not import each other's entities. This prevents circular dependencies and keeps domain boundaries clean. A product deletion should emit a domain event; the Offers module reacts independently rather than relying on database cascade.

### 5. Money as Integer (Minor Units)
**Tradeoff:** Application code must convert between major and minor units for display. Raw database values are not human-readable.

**Why:** Eliminates floating-point precision errors. `10.50 SAR` is stored as `1050` (halalah). All arithmetic is integer-safe. The `money.util.ts` utility handles conversion. This is standard practice in payment systems.

### 6. EAV Pattern for Product Attributes
**Tradeoff:** Extra table, more complex queries for attribute filtering, no compile-time type safety on attribute names.

**Why:** Product attributes vary wildly between categories (electronics have "screen size", clothing has "material"). A fixed-column schema would require ALTER TABLE for each new attribute type. The EAV table allows vendors to add arbitrary attributes without schema changes. Attribute-based filtering happens in OpenSearch, not SQL.

### 7. Offer-Level Inventory (Not Separate Inventory Table)
**Tradeoff:** Stock is coupled to the offer. Cannot track warehouse-level or location-level inventory.

**Why:** V1 is single-warehouse per vendor, single-country (SA). stock_quantity + stock_reserved on the Offer entity is sufficient. Atomic stock operations use `UPDATE offers SET stock_quantity = stock_quantity - :qty WHERE stock_quantity >= :qty` to prevent overselling. A separate inventory module can be added later when multi-warehouse support is needed.

### 8. Append-Only Tables for History/Events
**Tradeoff:** Tables like `order_status_history`, `shipment_tracking_events`, `payment_attempts`, and `audit_logs` grow unboundedly.

**Why:** These tables form the audit trail. They should never be updated or deleted. Archival policies (move rows older than N months to cold storage) can be added later without changing the schema.

### 9. Idempotency Keys on Critical Operations
**Tradeoff:** Extra UNIQUE constraint and column on orders, payments, refunds, reviews, review_eligibility, and commissions.

**Why:** Network failures, webhook retries, and duplicate form submissions must not create duplicate records. The idempotency_key is set by the caller. On duplicate key insertion, the database rejects the operation and the app returns the existing record. This is a fundamental requirement for payment safety.

### 10. No Foreign Keys Across Module Boundaries
**Tradeoff:** Database cannot enforce that `orders.user_id` actually references a valid user. Orphan references are possible.

**Why:** Strict domain separation. In a future microservice split, cross-service foreign keys don't exist. Application-level validation (check user exists before creating order) provides the same guarantee. This keeps modules independently deployable and testable.

## File Locations

```
apps/api/src/
├── common/entities/base.entity.ts          # BaseEntity, SoftDeletableEntity
├── database/
│   ├── data-source.ts                      # TypeORM CLI data source
│   ├── migrations/
│   │   └── 1740600000000-InitialSchema.ts  # Creates all 30 tables
│   └── seeds/
│       └── dev-seed.ts                     # Development seed data
└── modules/
    ├── identity/entities/                  # User, Vendor, VendorStaff, RefreshToken
    ├── catalog/entities/                   # Category, Brand, Product, Variant, ProductImage, ProductAttribute
    ├── offers/entities/                    # Offer
    ├── cart/entities/                      # Cart, CartItem
    ├── orders/entities/                    # Order, OrderItem, OrderStatusHistory
    ├── payments/entities/                  # Payment, PaymentAttempt, Refund
    ├── logistics/entities/                 # Shipment, ShipmentItem, ShipmentTrackingEvent
    ├── reviews/entities/                   # ReviewEligibility, Review, ReviewMedia
    ├── affiliate/entities/                 # AffiliateLink, AffiliateClick, AffiliateCommission
    └── admin/entities/                     # AuditLog, PlatformSetting
```
