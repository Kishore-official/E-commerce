# ADR 0006: Verified Reviews Only

> **Status:** Accepted
> **Date:** 2026-02-26

## Context

Product reviews are critical for buyer trust and conversion. Fake reviews are a significant problem in e-commerce. We need a review system that guarantees authenticity.

## Decision

Only allow reviews from customers who have **received a delivered order** for the specific product. This is enforced through a `review_eligibility` record that is created when a shipment is delivered.

## Flow

```
1. Customer places order → order_items created
2. Vendor ships items → shipment created
3. Carrier delivers → ShipmentDelivered event fired
4. System creates review_eligibility record (idempotent, one per order_item)
5. Customer sees eligible items in "Write a Review" section
6. Customer submits review → linked to review_eligibility
7. Admin moderates review → approved or rejected
8. Approved review becomes visible on product page
```

## Eligibility Rules

- **One eligibility per order item.** `UNIQUE(order_item_id)` on `review_eligibility`.
- **One review per eligibility.** `UNIQUE(review_eligibility_id)` on `reviews`.
- **Time-limited.** Eligibility expires 90 days after delivery (`eligible_until` column). Expired eligibilities cannot be used.
- **Idempotent creation.** The `idempotency_key` is derived from `order_item_id` to prevent duplicate eligibility from carrier webhook retries.

## Eligibility States

```
eligible → review_submitted (customer submits review)
eligible → expired (cron job expires past-deadline records)
```

## Review States

```
pending_moderation → approved (admin approves)
pending_moderation → rejected (admin rejects with reason)
```

## What's NOT Allowed

- Reviewing a product you never purchased
- Reviewing a product from an undelivered order
- Submitting multiple reviews for the same order item
- Submitting a review after the eligibility window (90 days)
- Displaying reviews that haven't been approved by a moderator

## Consequences

- Higher quality reviews (all verified purchases)
- Lower review volume compared to open review systems
- Admin moderation creates a processing bottleneck (mitigated by moderation queue in admin panel)
- Delayed review visibility (delivery + moderation time)
- Customers may forget to review (mitigated by reminder emails, future phase)
