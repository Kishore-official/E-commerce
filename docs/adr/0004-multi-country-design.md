# ADR 0004: Config-Driven Multi-Country Support

> **Status:** Accepted
> **Date:** 2026-02-26

## Context

The platform is designed for eventual operation in 17 countries. V1 launches in Saudi Arabia (SA) only. We need a design that supports multi-country expansion without requiring code changes for each new country.

## Decision

Design the **data model** for multi-country from day one. Keep **application logic** single-country (SA) in v1. Country-specific behavior is driven by **configuration rows** in `platform_settings`, not by code branches.

## Schema Design

Every entity that varies by country includes a `country_code CHAR(2)` column:

- `vendors.country_code` — vendor's operating country
- `offers.country_code` — offer availability by country
- `offers.price_currency` — currency per offer
- `orders.country_code` — order's country context
- `carts.country_code` — cart's country context
- `platform_settings.country_code` — NULL for global, 'SA' for country-specific

## Configuration Approach

```sql
-- platform_settings examples
('default_currency', '"SAR"', 'SA', 'Default currency for Saudi Arabia')
('supported_payment_gateways', '["hyperpay","tap"]', 'SA', 'Payment gateways for SA')
('supported_carriers', '["aramex","smsa"]', 'SA', 'Shipping carriers for SA')
('tax_included_in_price', 'true', 'SA', 'Whether prices include tax')
('review_eligibility_days', '90', NULL, 'Global: days after delivery to submit review')
```

Adding a new country means:
1. Insert `platform_settings` rows for the new country
2. Vendors create offers with the new `country_code`
3. No code changes required for basic functionality

## What V1 Does NOT Implement

- Multi-currency checkout (single currency per order)
- Cross-country shipping
- Country-specific tax calculation engines
- Localized content (i18n)
- Country-specific legal compliance (GDPR, etc.)

These are designed for but deferred to future phases.

## Consequences

- Every relevant table carries `country_code` — small storage overhead, large future flexibility
- Application code uses a `CountryConfigService` that reads from `platform_settings`
- In v1, country-related logic is simple: always 'SA', always 'SAR'
- Future country launches are primarily data/config tasks, not code tasks
