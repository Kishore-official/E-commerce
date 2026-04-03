# Search Indexing: Architecture & Operations

## Overview

The search system uses **OpenSearch as a derived read model**. PostgreSQL/SQLite remains the source of truth for all product and offer data. If the OpenSearch index is lost or corrupted, a full reindex from the database restores it completely.

## Architecture

### Write Path (Event-Driven Sync)

```
1. Service mutates DB (e.g., offer activated)
2. Service emits DomainEvent via EventBusService
3. SearchIndexListener (@OnEvent) receives the event
4. Listener enqueues a BullMQ job into the 'search-index' queue
5. SearchIndexProcessor picks up the job from Redis
6. Processor calls SearchIndexingService
7. IndexingService reads fresh data from DB
8. IndexingService calls OpenSearchService to index/delete document
```

### Read Path

```
Customer → GET /search/products?q=...&categoryId=...
  → SearchController validates DTO
  → SearchQueryService builds OpenSearch query
  → OpenSearchService executes search
  → Response: hits + facets + pagination
```

### Events That Trigger Index Updates

| Event | Action | Index Operation |
|-------|--------|----------------|
| `catalog.product.approved` | Product becomes visible | Index all ACTIVE offers for this product |
| `catalog.product.rejected` | Product removed from visibility | Remove all offers for this product |
| `offers.offer.activated` | Offer becomes buyable | Index this offer |
| `offers.offer.paused` | Offer temporarily unavailable | Remove from index |
| `offers.offer.stock_depleted` | Out of stock | Remove from index |
| `offers.offer.archived` | Permanently removed | Remove from index |

## Index Document Shape

Each document represents one **ACTIVE offer** with denormalized product, category, brand, and variant data:

```typescript
{
  offer_id: string,          // Document ID
  offer_type: string,        // 'marketplace' | 'affiliate'
  country_code: string,      // e.g., 'SA'
  price_amount: number,      // Minor units (halalah for SAR)
  price_currency: string,    // e.g., 'SAR'
  stock_quantity: number,
  in_stock: boolean,         // Derived: affiliate=always true, marketplace=stock>0
  is_featured: boolean,
  vendor_id: string,

  // Denormalized from Product
  product_id: string,
  product_name: string,      // Full-text searchable
  product_slug: string,
  description: string,       // Full-text searchable
  short_description: string, // Full-text searchable

  // Denormalized from Category
  category_id: string,
  category_name: string,     // Faceted

  // Denormalized from Brand
  brand_id: string,
  brand_name: string,        // Faceted + searchable

  // Denormalized from Variant
  variant_id: string,
  variant_name: string,
  sku: string,

  // Primary image
  image_url: string | null,

  // Attributes for filtering
  attributes: [{ name: string, value: string }],

  indexed_at: string,        // ISO timestamp
  created_at: string,
}
```

## Reindex Strategy

### Full Reindex (Zero-Downtime)

Triggered via `POST /admin/search/reindex`:

1. Create a new versioned index: `offers_v{timestamp}`
2. Read all ACTIVE offers with APPROVED products from DB in batches of 200
3. Bulk index each batch into the **new** index (not the alias)
4. Refresh the new index
5. Atomically swap the `offers_active` alias to point to the new index
6. Delete the old index

**Zero-downtime**: The alias swap is atomic. Searches continue against the old index until the swap completes. No search downtime.

**Concurrency guard**: Only one reindex can run at a time. Subsequent requests return 409 Conflict.

### When to Reindex

- **After deployment**: If index mapping changes, trigger a full reindex
- **After data migration**: If product/offer data is bulk-imported
- **Recovery**: If index data appears stale or inconsistent
- **Planned**: Future daily cron job for reconciliation

## Failure Handling

### OpenSearch Unavailable at Startup

- `OpenSearchService.onModuleInit()` catches connection errors
- Sets `available = false`, logs a warning
- The rest of the platform works normally
- Search endpoints return HTTP 503 "Search is temporarily unavailable"
- No data is lost — events still fire, queue jobs will retry

### OpenSearch Goes Down Mid-Operation

- BullMQ jobs retry 3 times with exponential backoff (2s, 4s, 8s)
- Failed jobs remain in the dead letter queue for inspection
- A full reindex catches up any missed updates

### Redis Unavailable

- Event listeners fail to enqueue jobs
- The original DB write is NOT affected (events are fire-and-forget)
- Missed events are caught by the next full reindex

### Partial Reindex Failure

- The old index remains intact (alias swap only happens after success)
- `reindexInProgress` flag is reset in a `finally` block
- Individual document failures are counted and returned in the response
- The rest of the batch continues processing

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/products` | Public | Full-text search with facets |
| GET | `/search/suggest` | Public | Autocomplete suggestions |
| POST | `/admin/search/reindex` | Admin | Trigger full reindex |
| GET | `/admin/search/status` | Admin | Check availability & reindex status |

### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Full-text search query |
| `categoryId` | string | Filter by category |
| `brandId` | string | Filter by brand |
| `countryCode` | string | Filter by country (e.g., SA) |
| `priceMin` | int | Minimum price (minor units) |
| `priceMax` | int | Maximum price (minor units) |
| `offerType` | enum | `marketplace` or `affiliate` |
| `inStock` | boolean | Filter in-stock only |
| `isFeatured` | boolean | Filter featured only |
| `sortBy` | enum | `relevance`, `price_asc`, `price_desc`, `newest` |
| `page` | int | Page number (default: 1) |
| `limit` | int | Results per page (default: 20, max: 100) |

## Running Locally

```bash
# Start OpenSearch and Redis
docker compose -f infrastructure/docker/docker-compose.yml up -d redis opensearch

# Start the API
cd apps/api && pnpm start:dev

# Verify connection
curl http://localhost:9200  # OpenSearch should respond

# Trigger initial index
curl -X POST http://localhost:3000/api/v1/admin/search/reindex \
  -H "Authorization: Bearer <admin-token>"

# Search
curl "http://localhost:3000/api/v1/search/products?q=samsung"
```

## Future Enhancements

- Daily cron reindex for reconciliation (`@nestjs/schedule`)
- Category hierarchy facets with parent/child aggregation
- Review scores in index (after Phase 10: Reviews)
- Arabic/English synonym support
- Response `_source` filtering for smaller payloads
- Request caching for popular queries
