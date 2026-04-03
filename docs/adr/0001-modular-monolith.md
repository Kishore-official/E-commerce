# ADR 0001: Modular Monolith Architecture

> **Status:** Accepted
> **Date:** 2026-02-26
> **Deciders:** Architecture Team

## Context

We are building a global e-commerce affiliate + marketplace platform that will eventually support 17 countries. The system has 10 identified bounded contexts (Identity, Catalog, Offers, Cart, Orders, Payments, Logistics, Reviews, Affiliate Tracking, Admin/Ops) with complex inter-domain workflows.

We need to decide the initial architecture style: microservices, monolith, or modular monolith.

## Decision

We will build a **modular monolith** — a single deployable NestJS application with strict domain module boundaries.

### Structure

```
apps/api/src/modules/
├── identity/       # Auth, users, vendors, sessions
├── catalog/        # Products, variants, categories, brands
├── offers/         # Marketplace + affiliate offers
├── cart/           # Shopping cart
├── orders/         # Order lifecycle
├── payments/       # Payment processing
├── logistics/      # Shipments, tracking
├── reviews/        # Verified reviews
├── affiliate/      # Link tracking, commissions
├── search/         # OpenSearch indexing/queries
└── admin/          # Audit, settings, moderation
```

### Boundary Rules

1. **No cross-module entity imports.** Module A never imports Module B's TypeORM entities. References use IDs only.
2. **Inter-module communication via EventBus.** Domain events are dispatched through NestJS EventEmitter2. No direct service-to-service calls for side effects.
3. **Service interfaces for queries.** When Module A needs data from Module B, it calls Module B's exported service method (not its repository).
4. **Each module owns its migrations.** Migration files are co-located or clearly named by domain.
5. **Shared code lives in `common/`.** Guards, pipes, filters, base entities, and utilities shared across all modules.

## Alternatives Considered

### Microservices

**Pros:**
- Independent deployment and scaling per service
- Technology diversity (different languages/frameworks per service)
- Team autonomy

**Cons:**
- Massive operational overhead for a small team (service mesh, API gateway, distributed tracing, circuit breakers)
- Distributed transactions are extremely complex (saga pattern required for orders→payments→inventory)
- Network latency between services
- Data consistency is much harder — eventual consistency by default
- Development velocity is significantly slower in early stages
- Premature optimization — we don't have the traffic to justify the complexity

### Traditional Monolith (no module boundaries)

**Pros:**
- Simplest to start with
- No boundary enforcement overhead

**Cons:**
- Tends toward a "big ball of mud" as the codebase grows
- Domain concepts get tangled — Product, Offer, and OrderItem logic intermixed
- Refactoring to extract services later is very painful without boundaries
- Hard to reason about change impact

## Rationale

The modular monolith gives us:

1. **Simplicity of deployment** — one NestJS app, one database, one deployment pipeline
2. **Domain clarity** — strict module boundaries prevent concept bleeding
3. **Transactional integrity** — cross-domain operations can use database transactions when needed (not possible with microservices)
4. **Extraction path** — if a module (e.g., Search, Payments) needs independent scaling later, it can be extracted as a service because boundaries are already enforced
5. **Fast development** — no network hops, no distributed debugging, simple local development
6. **Lower operational cost** — one service to monitor, deploy, and scale

### When to Consider Extraction

A module should be considered for extraction to a separate service when:
- It has fundamentally different scaling requirements (e.g., Search under heavy read load)
- It requires independent deployment cadence
- It has no transactional coupling with other modules
- The team has grown large enough to warrant service ownership

We do NOT extract preemptively. Extraction is driven by observed need, not anticipated need.

## Consequences

### Positive
- Single codebase, simple deployment
- Database transactions across modules when needed
- Faster development velocity for a small team
- Clear extraction path for future scaling

### Negative
- Must actively enforce module boundaries (code reviews, linting)
- All modules scale together (cannot independently scale Search without extracting it)
- Single point of failure (mitigated by health checks, graceful shutdown, horizontal scaling)
- Risk of boundary erosion if discipline slips

### Mitigations
- Module boundary enforcement via code review checklist
- Consider an ESLint plugin or import restrictions to prevent cross-module entity imports
- Regular architecture reviews to assess whether any module needs extraction
