# ADR 0002: TypeORM Over Prisma

> **Status:** Accepted
> **Date:** 2026-02-26

## Context

We need an ORM for our NestJS + PostgreSQL backend. The two leading options in the TypeScript ecosystem are TypeORM and Prisma.

## Decision

Use **TypeORM** with the Data Mapper pattern.

## Rationale

| Factor | TypeORM | Prisma |
|--------|---------|--------|
| NestJS integration | First-class via `@nestjs/typeorm` | Community module, less idiomatic |
| Entity definition | Decorators on classes (matches NestJS style) | Separate `.prisma` schema file |
| Migration control | Generate + manually edit migrations | Auto-generated, harder to customize |
| Transactions | Native `QueryRunner` and `EntityManager` | Nested writes, `$transaction` (more limited) |
| Relations | Eager/lazy loading, query builder | Include-based, no lazy loading |
| Raw SQL | Easy escape hatch via `query()` | `$queryRaw` available |
| Decorator ecosystem | Works with class-validator, class-transformer | Separate validation layer needed |

Key reasons:
1. **Decorator consistency** — NestJS uses decorators everywhere (controllers, services, pipes, guards). TypeORM entities use the same pattern. Prisma's separate schema file breaks the decorator-based mental model.
2. **Migration control** — We need fine-grained control over migrations (index tuning, partial indexes, custom constraints). TypeORM generates migration stubs that we can edit. Prisma's auto-migrations are harder to customize.
3. **Transaction support** — Our order→payment→inventory flow requires multi-table transactions. TypeORM's `QueryRunner` gives explicit transaction control.

## Consequences

- Must manage migrations carefully (never edit committed migrations)
- TypeORM has quirks with relation loading that require attention
- Migration naming convention: `YYYYMMDDHHMMSS-description.ts`
