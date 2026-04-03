# E-commerce Platform

A production-grade global e-commerce affiliate + marketplace platform built as a modular monolith.

## Overview

This platform enables vendors to sell products through a marketplace model and affiliate links, with comprehensive order management, payment processing, logistics tracking, and verified reviews. The system is designed for scalability and maintainability using domain-driven design principles.

**Launch Country:** India (IN) | **Currency:** INR

## Architecture

- **Style:** Modular monolith
- **Backend:** NestJS + TypeScript
- **Frontend:** Next.js 14 + TypeScript (3 apps: storefront, vendor portal, admin panel)
- **Database:** MongoDB Atlas with Mongoose ODM
- **Cache/Jobs:** Redis + BullMQ
- **Search:** OpenSearch
- **Storage:** S3-compatible storage (MinIO in dev)
- **Monorepo:** pnpm workspaces + Turborepo

## Project Structure

```
apps/
  api/            → NestJS backend API (port 3000)
  storefront/     → Customer-facing store (port 3001)
  vendor/         → Vendor management portal (port 3002)
  admin/          → Admin dashboard (port 3003)
packages/
  shared-types/   → TypeScript interfaces shared across apps
  ui-kit/         → Shared React components (source-consumed via transpilePackages)
  tsconfig/       → Shared TypeScript configs
  eslint-config/  → Shared ESLint config
docs/
  adr/            → Architecture Decision Records
  plans/          → Implementation plans
  prd/            → Product requirements
  diagrams/       → Architecture diagrams
infrastructure/
  docker/         → Docker Compose for local development
```

## Domain Modules

The platform is organized into 11 bounded-context modules:

| Module | Responsibilities |
|--------|-----------------|
| **Identity** | Users, vendors, vendor staff, authentication (JWT + refresh tokens), 7 user roles |
| **Catalog** | Products, variants, brands, categories, images, attributes (DRAFT→PENDING_REVIEW→APPROVED/REJECTED) |
| **Offers** | Marketplace offers per variant/country (DRAFT→ACTIVE↔PAUSED→OUT_OF_STOCK) |
| **Cart** | Shopping carts (MARKETPLACE offers only) |
| **Orders** | Orders + order items (PENDING_PAYMENT→CONFIRMED→...→DELIVERED→COMPLETED) |
| **Payments** | Payment processing via port/adapter (PENDING→PROCESSING→SUCCEEDED/FAILED) |
| **Logistics** | Shipments + carrier tracking (PENDING→PICKING→PACKED→SHIPPED→IN_TRANSIT→DELIVERED) |
| **Reviews** | Verified reviews with eligibility (auto-created on delivery, 90-day window) |
| **Affiliate** | Affiliate tracking & commissions |
| **Admin** | Admin operations tooling, notifications, audit logs |
| **Storefront** | Public storefront API (homepage, featured products) |

Cross-module communication uses domain events via `EventBusService` (wraps EventEmitter2). Modules import other modules for read-only repository access.

## Key Patterns

### State Machines
Every entity with a status uses an explicit transition map in `state-machines/`. Pattern: `VALID_TRANSITIONS` record + `canTransition()` + `assertTransition()` functions. Never use loose boolean flags.

### Domain Events
Extend `DomainEvent` base class. Use `eventBus.emit()` for fire-and-forget, `eventBus.emitAsync()` when listeners must complete before returning. Event names use dot notation: `orders.order.confirmed`, `logistics.shipment.delivered`.

### Port/Adapter
External integrations use port interfaces with mock adapters: `PAYMENT_GATEWAY_PORT → MockPaymentGateway`, `CARRIER_PROVIDER_PORT → MockCarrierProvider`.

### Idempotency
Orders, payments, refunds, and reviews use `@IdempotencyKey()` decorator (extracts `X-Idempotency-Key` header). Entities have `idempotencyKey` field with unique constraint. Services check-first-then-create.

### Schemas
Mongoose schemas with `id` (UUID string), `createdAt`, `updatedAt` (via `timestamps: true`). Prices stored in minor currency units (paise for INR). Fields use camelCase names.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (optional, for Redis, OpenSearch, MinIO)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd E-commerce

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Build all packages
pnpm build
```

### Development

```bash
# Start all apps in watch mode (API + 3 frontends)
pnpm dev

# Start with full infrastructure (Redis, OpenSearch, MinIO)
cd infrastructure/docker && docker compose up -d && cd ../..
pnpm dev
```

### Local Services

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Storefront | http://localhost:3001 |
| Vendor Portal | http://localhost:3002 |
| Admin Panel | http://localhost:3003 |
| Swagger API Docs | http://localhost:3000/api/docs |
| Redis | localhost:6379 |
| OpenSearch | http://localhost:9200 |
| OpenSearch Dashboards | http://localhost:5601 |
| MinIO (S3) | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

## Build & Test Commands

### Monorepo-level (runs via Turborepo)

```bash
pnpm build                    # Build all packages (~10s)
pnpm test                     # Run all unit tests
pnpm test:e2e                 # Run all E2E tests
pnpm lint                     # Lint all packages
pnpm dev                      # Start all apps in watch mode
pnpm clean                    # Clean all build artifacts
```

### API-specific (from repo root)

```bash
# Unit tests
pnpm --filter @ecommerce/api test

# E2E tests
pnpm --filter @ecommerce/api test:e2e

# Run specific test file
pnpm --filter @ecommerce/api test -- --testPathPattern="reviews"

# Run specific E2E test
pnpm --filter @ecommerce/api test:e2e -- --testPathPattern="checkout"
```

### From apps/api/ directory

```bash
cd apps/api

# Unit tests matching pattern
npx jest --testPathPattern reviews

# E2E tests
npx jest --config ./test/jest-e2e.config.ts --testPathPattern reviews --forceExit

# No migrations needed — MongoDB/Mongoose schemas auto-sync
```

## Authentication & Authorization

### Guards

Three global/per-route guards:

- `JwtAuthGuard` (global) — validates Bearer token. Bypass with `@Public()`.
- `RolesGuard` (global) — checks `@Roles(UserRole.ADMIN, ...)`. No roles = any authenticated user.
- `VendorOwnerGuard` (per-route) — ensures vendor owns the resource. Admins bypass.

### Decorators

- `@Public()` — bypass authentication
- `@Roles(...)` — require specific roles
- `@CurrentUser()` — returns JwtPayload with `sub`, `email`, `role`, `vendorId?`
- `@IdempotencyKey()` — extracts `X-Idempotency-Key` header

### User Roles

7 roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `OPS`, `VENDOR`, `VENDOR_STAFF`, `CUSTOMER`

## Module Structure Convention

```
modules/{domain}/
├── controllers/         # Split by audience: admin-, customer-, vendor-, public-
├── dto/                 # class-validator DTOs + index.ts barrel
├── schemas/             # Mongoose schemas
├── events/              # DomainEvent subclasses
├── listeners/           # @OnEvent handlers for cross-module events
├── services/            # Business logic + colocated .spec.ts unit tests
├── state-machines/      # Status transition maps + .spec.ts tests
└── {domain}.module.ts   # NestJS module (imports, controllers, providers, exports)
```

## Path Aliases (tsconfig)

```
@common/*  → src/common/*     (guards, decorators, schemas, events, dto, filters, config)
@modules/* → src/modules/*    (domain modules)
@jobs/*    → src/jobs/*        (BullMQ queue definitions)
@database/* → src/database/*  (utility scripts)
```

## Test Conventions

- **Unit tests:** `*.spec.ts` colocated with source files. Mock repos via `getModelToken()`.
- **E2E tests:** `test/*.e2e-spec.ts`. Full HTTP tests with supertest against MongoDB.
- **E2E setup:** registers users, assigns roles via Mongoose models, creates full entity chains.
- `PaginationMeta` uses `totalItems` (not `total`).

## Important Cross-Module Facts

- `OrderItem` has `offerId` but NOT `productId`/`variantId` — must join through `Offer` entity.
- `Offer` has `deletedAt` field for soft-delete — queries should filter by `deletedAt: null`.
- Shipment state machine requires `SHIPPED → IN_TRANSIT → DELIVERED` (no direct SHIPPED→DELIVERED).
- `ShipmentDeliveredEvent` uses `emitAsync` so the `DeliveryEventListener` completes before webhook returns.
- Review eligibility auto-created on delivery, one per orderItemId, 90-day expiry window.
- EventEmitter2 config: `wildcard: true`, `delimiter: '.'`.
- Stock reservation: `stockReserved` incremented on order creation, decremented on cancellation.

## Environment Variables

Key environment variables (see `.env.example`):

- `MONGODB_URI` — MongoDB Atlas connection string
- `MONGODB_DB_NAME` — Database name
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — Redis connection
- `OPENSEARCH_NODE`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD` — OpenSearch
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` — S3 storage
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN` — Auth
- `API_PORT` — API server port (default: 3000)
- `STOREFRONT_URL`, `VENDOR_URL`, `ADMIN_URL` — Frontend URLs for CORS

## Deployment

The project includes Docker configuration for containerized deployment:

```bash
# Run with docker-compose
cd infrastructure/docker && docker compose up -d
```

See `docker-start.sh` and `Dockerfile` for deployment configuration.

## Documentation

- [V1 Implementation Plan](docs/plans/v1-implementation-plan.md)
- [V1 Product Requirements](docs/prd/v1-scope.md)
- [ADR: Modular Monolith](docs/adr/0001-modular-monolith.md)
- [ADR: TypeORM over Prisma](docs/adr/0002-typeorm-over-prisma.md)
- [ADR: State Machines](docs/adr/0003-state-machines.md)
- [ADR: Multi-Country Design](docs/adr/0004-multi-country-design.md)
- [ADR: Search as Read Model](docs/adr/0005-search-as-read-model.md)
- [ADR: Verified Reviews Only](docs/adr/0006-verified-reviews-only.md)
- [ADR: Offer Types](docs/adr/0007-offer-types.md)
- [Domain Map](docs/diagrams/domain-map.md)
- [ERD](docs/diagrams/erd.md)
- [State Machines](docs/diagrams/state-machines.md)

## Coding Standards

- Prefer explicit typed interfaces and DTOs
- Write tests with each major feature
- Do not introduce microservices unless clearly justified
- Design config-driven country support (launch country: IN/INR)
- Keep Product, Variant, Offer, OrderItem, Shipment, ReviewEligibility as separate concepts
- Search index (OpenSearch) is a derived read model, never source of truth
- Use state machines for status fields, not scattered boolean flags
- Use idempotency for payments, orders, shipment sync, and review creation

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]
"# E-commerce" 
#   E - c o m m e r c e  
 "# E-commerce" 
