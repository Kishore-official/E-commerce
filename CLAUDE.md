# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
# Monorepo-level (runs via Turborepo)
pnpm build                    # Build all packages (~10s)
pnpm test                     # Run all unit tests
pnpm test:e2e                 # Run all E2E tests
pnpm lint                     # Lint all packages
pnpm dev                      # Start all apps in watch mode

# API-specific (from repo root)
pnpm --filter @ecommerce/api test              # Unit tests (jest)
pnpm --filter @ecommerce/api test:e2e          # E2E tests (jest --config ./test/jest-e2e.config.ts)
pnpm --filter @ecommerce/api test -- --testPathPattern="reviews"   # Run specific test file
pnpm --filter @ecommerce/api test:e2e -- --testPathPattern="checkout"  # Run specific E2E

# Or from apps/api/ directly
cd apps/api && npx jest --testPathPattern reviews              # Unit tests matching pattern
cd apps/api && npx jest --config ./test/jest-e2e.config.ts --testPathPattern reviews --forceExit  # E2E

# Frontend-specific
pnpm --filter @ecommerce/storefront dev        # Storefront only (port 3001)
pnpm --filter @ecommerce/vendor dev            # Vendor portal only (port 3002)
pnpm --filter @ecommerce/admin dev             # Admin panel only (port 3003)

# No migrations needed — MongoDB/Mongoose schemas auto-sync
```

## Architecture

**Modular monolith**: Single NestJS app at `apps/api/` with domain modules in `src/modules/`. Three Next.js 14 frontends (storefront, vendor, admin) in `apps/`. Shared code in `packages/`.

**Database**: MongoDB Atlas with Mongoose ODM. Connection via `MONGODB_URI` env var. Schemas defined in `src/modules/*/schemas/`. E2E tests run against the same MongoDB instance (configured in `test/setup-env.ts`).

**Package manager**: pnpm workspaces + Turborepo.

### Workspace Packages

| Package | Name | Port |
|---------|------|------|
| `apps/api` | `@ecommerce/api` | 3000 |
| `apps/storefront` | `@ecommerce/storefront` | 3001 |
| `apps/vendor` | `@ecommerce/vendor` | 3002 |
| `apps/admin` | `@ecommerce/admin` | 3003 |
| `packages/shared-types` | `@ecommerce/shared-types` | — |
| `packages/ui-kit` | `@ecommerce/ui-kit` | — |
| `packages/tsconfig` | `@ecommerce/tsconfig` | — |
| `packages/eslint-config` | `@ecommerce/eslint-config` | — |

### Domain Modules

```
Identity     → Users, vendors, auth (JWT + refresh tokens, 7 roles)
Catalog      → Products, variants, brands, categories (DRAFT→PENDING_REVIEW→APPROVED/REJECTED)
Offers       → Seller offers per variant/country (DRAFT→ACTIVE↔PAUSED→OUT_OF_STOCK)
Cart         → Shopping carts (MARKETPLACE offers only)
Orders       → Orders + order items (PENDING_PAYMENT→CONFIRMED→...→DELIVERED→COMPLETED)
Payments     → Payment processing via port/adapter (PENDING→PROCESSING→SUCCEEDED/FAILED)
Logistics    → Shipments + carrier tracking (PENDING→PICKING→PACKED→SHIPPED→IN_TRANSIT→DELIVERED)
Reviews      → Verified reviews with eligibility (auto-created on delivery, 90-day window)
Affiliate    → Affiliate tracking & commissions
Admin        → Admin operations tooling, notifications, audit logs
Storefront   → Public storefront API (homepage, featured products)
```

Cross-module communication uses domain events via `EventBusService` (wraps EventEmitter2). Modules import other modules for read-only repository access.

### Key Patterns

**State machines** — Every entity with a status uses an explicit transition map in `state-machines/`. Pattern: `VALID_TRANSITIONS` record + `canTransition()` + `assertTransition()` functions. Never use loose boolean flags.

**Domain events** — Extend `DomainEvent` base class. Use `eventBus.emit()` for fire-and-forget, `eventBus.emitAsync()` when listeners must complete before returning. Event names use dot notation: `orders.order.confirmed`, `logistics.shipment.delivered`.

**Port/Adapter** — External integrations use port interfaces with mock adapters: `PAYMENT_GATEWAY_PORT → MockPaymentGateway`, `CARRIER_PROVIDER_PORT → MockCarrierProvider`.

**Idempotency** — Orders, payments, refunds, and reviews use `@IdempotencyKey()` decorator (extracts `X-Idempotency-Key` header). Entities have `idempotencyKey` field with unique constraint. Services check-first-then-create.

**Schemas** — Mongoose schemas with `id` (UUID string), `createdAt`, `updatedAt` (via `timestamps: true`). Prices stored in minor currency units (paise for INR). Fields use camelCase names.

### Auth & Guards

Three global/per-route guards:
- `JwtAuthGuard` (global) — validates Bearer token. Bypass with `@Public()`.
- `RolesGuard` (global) — checks `@Roles(UserRole.ADMIN, ...)`. No roles = any authenticated user.
- `VendorOwnerGuard` (per-route) — ensures vendor owns the resource. Admins bypass.

Key decorators: `@Public()`, `@Roles(...)`, `@CurrentUser()` (returns JwtPayload with `sub`, `email`, `role`, `vendorId?`), `@IdempotencyKey()`.

### Path Aliases (API tsconfig)

```
@common/*  → src/common/*     (guards, decorators, entities, events, dto, filters, config)
@modules/* → src/modules/*    (domain modules)
@jobs/*    → src/jobs/*        (BullMQ queue definitions)
@database/* → src/database/*  (utility scripts)
```

### Module Structure Convention

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

### Frontend Architecture

- **ui-kit**: Source-consumed via `transpilePackages` in each Next.js app (no separate build step needed). Uses `class-variance-authority` for component variants, `cn()` = `clsx` + `tailwind-merge`.
- **Data fetching**: SWR + Axios. API client in `packages/ui-kit/src/lib/api-client.ts` with JWT refresh queue.
- **Auth state**: Access token in memory, refresh token in localStorage. Auth provider in ui-kit.
- **Icons**: `lucide-react` across all three frontends.
- **Route groups**: storefront uses `(shop)/(account)/(auth)`, vendor uses `(portal)`, admin uses `(dashboard)`.
- **API proxy**: Next.js rewrites `/api/*` to the NestJS backend in dev mode (configured in `next.config.mjs`).
- **Styling**: Storefront has shared CSS module at `apps/storefront/src/app/store.module.css`. Vendor portal CSS at `apps/vendor/src/app/(portal)/portal.module.css`.

### Test Conventions

- Unit tests: `*.spec.ts` colocated with source files. Mock repos via `getModelToken()`.
- E2E tests: `test/*.e2e-spec.ts`. Full HTTP tests with supertest against MongoDB.
- E2E setup: registers users, assigns roles via Mongoose models, creates full entity chains.
- `PaginationMeta` uses `totalItems` (not `total`).

### Important Cross-Module Facts

- `OrderItem` has `offerId` but NOT `productId`/`variantId` — must join through `Offer` entity.
- `Offer` has `deletedAt` field for soft-delete — queries should filter by `deletedAt: null`.
- Shipment state machine requires `SHIPPED → IN_TRANSIT → DELIVERED` (no direct SHIPPED→DELIVERED).
- `ShipmentDeliveredEvent` uses `emitAsync` so the `DeliveryEventListener` completes before webhook returns.
- Review eligibility auto-created on delivery, one per orderItemId, 90-day expiry window.
- EventEmitter2 config: `wildcard: true`, `delimiter: '.'`.
- Stock reservation: `stockReserved` incremented on order creation, decremented on cancellation.

## Coding Rules

- Prefer explicit typed interfaces and DTOs
- Write tests with each major feature
- Do not introduce microservices unless clearly justified
- Design config-driven country support (launch country: IN/INR)
- Ask before making irreversible architecture tradeoffs
- When planning, propose file paths, modules, APIs, DB changes, and test strategy
- Keep Product, Variant, Offer, OrderItem, Shipment, ReviewEligibility as separate concepts
- Search index (OpenSearch) is a derived read model, never source of truth
- Use state machines for status fields, not scattered boolean flags
- Use idempotency for payments, orders, shipment sync, and review creation
- Never merge domain boundaries (see list above); each is a separate NestJS module
