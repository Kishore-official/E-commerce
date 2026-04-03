# ADR 0007: Marketplace vs Affiliate Offer Types

> **Status:** Accepted
> **Date:** 2026-02-26

## Context

The platform supports two fundamentally different ways to sell products:
1. **Marketplace:** The vendor sells through the platform. The platform handles checkout, payment, and coordinates logistics.
2. **Affiliate:** The platform redirects the buyer to an external merchant's website. The platform earns a commission on referred sales.

We need to decide whether these are separate systems or unified under a single model.

## Decision

Use a **single `offers` table** with an `offer_type` discriminator column (`'marketplace'` or `'affiliate'`). Both types share the same product/variant relationship but differ in behavior.

## Behavioral Differences

| Aspect | Marketplace Offer | Affiliate Offer |
|--------|------------------|-----------------|
| `offer_type` | `'marketplace'` | `'affiliate'` |
| Checkout | Added to cart, ordered through platform | Redirect to external URL (302) |
| Stock tracking | Yes (`stock_quantity`, `stock_reserved`) | No (external merchant's concern) |
| Payment | Processed by platform | External |
| Shipment | Created and tracked in platform | External |
| Review eligibility | Created on delivery | Not applicable (no platform order) |
| `affiliate_url` | NULL | Required |
| `affiliate_commission_pct` | NULL | Required |
| `fulfillment_type` | `'vendor'` or `'platform'` | N/A |
| Revenue model | Platform commission on sale | Affiliate commission on referral |

## Cart and Order Rules

- **Only marketplace offers** can be added to the cart and ordered through the platform
- **Affiliate offers** display a "Buy from Merchant" button that redirects via the affiliate tracking system
- The storefront shows both offer types on the same product page, clearly labeled

## Affiliate Tracking

When a customer clicks an affiliate offer:
1. `GET /affiliate/links/:code` — logs the click in `affiliate_clicks`
2. Returns `302 redirect` to the `target_url`
3. Commission is calculated if the external merchant reports a sale (manual confirmation in v1, API integration in future)

## Why Single Table

- Products already have variants. Offers are always per-variant. Separating marketplace and affiliate into different tables would duplicate the product/variant relationship.
- The storefront needs to display both offer types side-by-side for comparison. A single query with `offer_type` filter is simpler than joining two tables.
- Most columns are shared (product_id, variant_id, vendor_id, price, status, country_code).

## Consequences

- The `offers` table has nullable columns (`affiliate_url`, `stock_quantity`) that are relevant to only one type
- Application logic must check `offer_type` before allowing cart addition (only marketplace)
- Validation rules differ by type (enforced in DTO validation + service layer)
- Search index includes both types, with `offer_type` as a filterable facet
