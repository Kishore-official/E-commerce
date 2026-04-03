# Product Requirements Document — V1 Scope

> **Version:** 1.0
> **Date:** 2026-02-26
> **Status:** Approved

---

## 1. Product Vision

Build a global e-commerce affiliate + marketplace platform that enables vendors to sell physical products through the platform (marketplace offers) or redirect buyers to external merchants (affiliate offers). The platform handles catalog management, search, checkout, payments, logistics tracking, and verified reviews.

V1 launches in Saudi Arabia with the data model designed for eventual expansion to 17 countries.

---

## 2. V1 Scope Summary

### In Scope

| Area | What's Included |
|------|----------------|
| **Product types** | Physical products only |
| **Offer types** | Marketplace (vendor sells via platform) + Affiliate (redirect to external merchant) |
| **Countries** | Saudi Arabia (SA) launch; multi-country schema from day one |
| **Users** | Customers, vendors (owner + staff), admins (admin + super_admin) |
| **Catalog** | Products, variants, categories, brands, images, attributes |
| **Search** | Full-text search via OpenSearch, facets, autocomplete (1M+ product design target) |
| **Cart** | Guest + authenticated carts, merge on login |
| **Orders** | Order lifecycle with state machine, idempotent creation |
| **Payments** | Payment initiation, gateway webhooks, refunds (stub gateway in v1) |
| **Logistics** | Shipments, tracking, carrier webhooks (manual tracking in v1) |
| **Reviews** | Verified reviews only — requires delivered order, moderated by admin |
| **Affiliate** | Link generation, click tracking, commission calculation |
| **Vendor portal** | Self-service: products, offers, orders, staff management |
| **Admin panel** | Moderation, order management, settings, audit logs, dashboard |
| **Auth** | Email/password, JWT + refresh tokens, RBAC |

### Out of Scope for V1

- Travel / booking / experiences (direct booking)
- Digital products / downloads
- Subscription / recurring billing
- OAuth / social login
- Real-time features (WebSockets)
- Multi-language / i18n (designed for, not implemented)
- Multi-country business logic (schema supports it, app logic is SA-only)
- Mobile apps (responsive web only)
- Advanced analytics / reporting beyond dashboard stats
- Coupon / discount code system
- Wishlists / saved items
- Vendor messaging / chat

---

## 3. User Roles

| Role | Description |
|------|-------------|
| **Guest** | Unauthenticated visitor. Can browse, search, add to cart (session-based). |
| **Customer** | Registered user. Can checkout, place orders, track shipments, submit verified reviews. |
| **Vendor Owner** | Business owner who registered as a vendor. Full control of own vendor account. |
| **Vendor Staff** | Invited by vendor owner. Scoped permissions (e.g., manage products, view orders). |
| **Admin** | Platform operator. Moderates content, manages orders, views analytics. |
| **Super Admin** | Full system access. Manages admins, platform settings, can perform all actions. |

---

## 4. User Stories

### Customer

- As a customer, I can register with email/password and verify my email
- As a customer, I can browse products by category and brand
- As a customer, I can search for products with filters (price, rating, category)
- As a customer, I can view product details with images, variants, and available offers
- As a customer, I can add marketplace offers to my cart
- As a customer, I can click affiliate offers to be redirected to external merchants
- As a customer, I can checkout and pay for my cart (marketplace items)
- As a customer, I can view my order history and order details
- As a customer, I can track shipments for my orders
- As a customer, I can cancel orders before they are shipped
- As a customer, I can submit reviews for delivered items (verified purchase only)
- As a customer, I can edit my pending reviews before moderation

### Vendor

- As a vendor, I can register my business and apply for approval
- As a vendor, I can create products with variants, images, and attributes
- As a vendor, I can submit products for admin review
- As a vendor, I can create marketplace offers (set price, stock, country)
- As a vendor, I can create affiliate offers (set redirect URL, commission)
- As a vendor, I can manage offer status (activate, pause, update stock)
- As a vendor, I can view orders containing my items
- As a vendor, I can confirm orders and create shipments
- As a vendor, I can add tracking information to shipments
- As a vendor, I can invite staff members with scoped permissions
- As a vendor, I can view my affiliate link performance and commissions
- As a vendor, I can manage my business profile

### Admin

- As an admin, I can approve or reject vendor applications
- As an admin, I can approve or reject products submitted for review
- As an admin, I can moderate reviews (approve/reject)
- As an admin, I can view and manage all orders
- As an admin, I can issue refunds
- As an admin, I can force-deliver or cancel shipments
- As an admin, I can view audit logs
- As an admin, I can view dashboard statistics (orders, revenue, vendors, products)
- As an admin, I can trigger a full search reindex
- As an admin, I can confirm affiliate commissions
- As a super admin, I can manage platform settings
- As a super admin, I can manage user roles

---

## 5. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| **Search scale** | Support 1M+ products in OpenSearch index |
| **Response time** | API p95 < 500ms for read endpoints |
| **Availability** | 99.5% uptime target |
| **Security** | OWASP Top 10 mitigations, bcrypt passwords, JWT auth, input validation |
| **Data integrity** | Idempotent order creation, payment callbacks, review creation |
| **Audit** | All admin/vendor actions logged with user, action, entity, changes |
| **Multi-country readiness** | Schema supports country_code, currency, locale from day one |

---

## 6. Business Rules

### Offers
- A marketplace offer requires an approved product and an active vendor
- An affiliate offer requires a valid external URL
- One variant can have one offer per vendor per country
- Stock is tracked for marketplace offers only (affiliate offers have no stock concept)
- Stock is reserved during checkout and released on cancellation

### Orders
- Orders can only be placed for marketplace offers (affiliate = redirect only)
- All cart items are re-validated (price, stock, offer status) at order creation
- Order creation is idempotent via `idempotency_key`
- Orders can be cancelled before any items are shipped
- Prices are snapshotted at order creation time

### Payments
- Payment callback handling is idempotent via `gateway_payment_id`
- Order is confirmed only after successful payment
- Order is cancelled if payment fails
- Refunds can only be issued by admins

### Reviews
- A review can only be submitted for a delivered order item
- Review eligibility is auto-created when a shipment is marked as delivered
- Eligibility expires after 90 days
- Each order item can produce at most one review
- Reviews go through admin moderation before being published
- Only approved reviews are visible to the public

### Vendors
- Vendor registration requires admin approval
- Suspended vendors cannot create or activate offers
- Vendor staff permissions are stored as JSONB and checked at the service layer

---

## 7. Launch Country Configuration

| Setting | Value |
|---------|-------|
| Country code | SA |
| Currency | SAR (Saudi Riyal) |
| Currency minor units | Halalah (1 SAR = 100 halalah) |
| Default language | English (v1) |
| Payment gateways | Stub (v1), designed for HyperPay/Tap/Stripe |
| Shipping carriers | Manual tracking (v1), designed for Aramex/SMSA/DHL |
| Tax handling | Included in price (v1), configurable per country later |
| Review eligibility window | 90 days after delivery |

---

## 8. Success Criteria for V1

1. A vendor can register, get approved, create products with variants, create offers, and manage stock
2. A customer can search products, add to cart, checkout, pay, and receive order confirmation
3. A vendor can create shipments and add tracking for fulfilled orders
4. A customer can track their shipment and submit a verified review after delivery
5. An admin can moderate vendors, products, and reviews from the admin panel
6. Search handles 1M+ products with sub-second response times
7. All payment and order operations are idempotent and state-machine driven
8. No unverified reviews can exist in the system
