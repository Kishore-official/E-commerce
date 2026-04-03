# ADR 0005: OpenSearch as Derived Read Model

> **Status:** Accepted
> **Date:** 2026-02-26

## Context

The platform must support full-text product search with facets, filters, and autocomplete across 1M+ products. PostgreSQL can handle basic search but struggles with the performance requirements of faceted search at scale.

## Decision

Use **OpenSearch** as a derived read model. PostgreSQL remains the **sole source of truth** for all product and offer data. The search index is rebuilt from Postgres data and is never authoritative.

## Architecture

```
Write Path:  Vendor/Admin → API → PostgreSQL → Domain Event → BullMQ → OpenSearch
Read Path:   Customer → API → OpenSearch (search results) → PostgreSQL (product detail)
```

### Indexing Strategy

1. **Real-time indexing:** Every `ProductCreated`, `ProductUpdated`, `OfferCreated`, `OfferUpdated`, `OfferDeactivated` event triggers an async BullMQ job that updates the OpenSearch index.
2. **Full reindex:** A daily cron job performs a complete reconciliation — reads all approved products + active offers from Postgres and rebuilds the index. This catches any missed events.
3. **Manual reindex:** Admin can trigger a full reindex at any time via `POST /admin/search/reindex`.

### Index Mapping

```json
{
  "product_id": "keyword",
  "product_name": "text (analyzed)",
  "description": "text (analyzed)",
  "category_id": "keyword",
  "category_name": "keyword",
  "brand_id": "keyword",
  "brand_name": "keyword",
  "vendor_id": "keyword",
  "country_code": "keyword",
  "offer_type": "keyword",
  "price_amount": "integer",
  "price_currency": "keyword",
  "in_stock": "boolean",
  "average_rating": "float",
  "review_count": "integer",
  "image_url": "keyword",
  "created_at": "date"
}
```

## What This Means

- **Search results** return product IDs and summary data from OpenSearch
- **Product detail pages** always read from PostgreSQL (never from the index)
- **If OpenSearch goes down**, search returns a graceful error. The rest of the platform continues working.
- **Index staleness** is bounded: worst case is one day (daily reindex catches drift)

## Consequences

- Two data stores to maintain (Postgres + OpenSearch)
- Async indexing means search results may lag writes by seconds
- Full reindex is an expensive operation for 1M+ products (run during low-traffic hours)
- Search never returns data that contradicts Postgres (product detail always reads from PG)
