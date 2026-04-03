# ADR 0003: Explicit State Machines Over Boolean Flags

> **Status:** Accepted
> **Date:** 2026-02-26

## Context

Our platform has several entities with complex lifecycle management: orders, payments, shipments, review eligibility, and offers. We need a pattern for managing these state transitions safely.

## Decision

Use **explicit state machines** with defined states, valid transitions, and transition side effects. Never use scattered boolean flags (e.g., `is_paid`, `is_shipped`, `is_delivered`) to represent lifecycle state.

## State Machines in V1

| Entity | States | Transitions |
|--------|--------|-------------|
| **Order** | pending_payment, confirmed, processing, partially_shipped, shipped, delivered, completed, cancelled, refunded | 12 transitions |
| **Payment** | pending, processing, succeeded, failed, cancelled, partially_refunded, refunded | 7 transitions |
| **Shipment** | pending, picking, packed, shipped, in_transit, out_for_delivery, delivered, failed_delivery, returned, cancelled | 10 transitions |
| **Review Eligibility** | eligible, review_submitted, expired | 2 transitions |
| **Offer** | draft, active, paused, out_of_stock, archived | 6 transitions |

## Implementation Pattern

Each state machine is implemented as a service method that:
1. Validates the current state allows the requested transition
2. Performs the transition (updates the entity)
3. Records the transition in a history table (for orders)
4. Emits a domain event for the new state

```typescript
// Example: OrderStateMachine
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['partially_shipped', 'shipped'],
  // ...
};

async transition(order: Order, newStatus: OrderStatus, metadata?: any): Promise<Order> {
  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed?.includes(newStatus)) {
    throw new InvalidStateTransitionException(order.status, newStatus);
  }
  // update, record history, emit event
}
```

## Why Not Boolean Flags

Boolean flags like `is_paid`, `is_shipped`, `is_cancelled` create problems:
- **Invalid states:** `is_paid = true` AND `is_cancelled = true` — is the order paid or cancelled?
- **Missing transitions:** No enforcement of valid paths (can jump from any state to any state)
- **No history:** Cannot answer "when did this order move to shipped?"
- **Scattered logic:** State checks spread across controllers, services, and guards with inconsistent conditions

## Consequences

- Every entity status change goes through the state machine — no direct status field updates
- Transition history is recorded for orders (audit trail)
- Invalid transitions throw `InvalidStateTransitionException` (400 Bad Request)
- Domain events fired on every transition enable downstream reactions
