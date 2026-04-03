import { ShipmentStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import { canTransitionShipment, assertShipmentTransition } from './shipment-status.machine';

describe('Shipment Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [ShipmentStatus, ShipmentStatus][] = [
      [ShipmentStatus.PENDING, ShipmentStatus.PICKING],
      [ShipmentStatus.PENDING, ShipmentStatus.CANCELLED],
      [ShipmentStatus.PICKING, ShipmentStatus.PACKED],
      [ShipmentStatus.PICKING, ShipmentStatus.CANCELLED],
      [ShipmentStatus.PACKED, ShipmentStatus.SHIPPED],
      [ShipmentStatus.PACKED, ShipmentStatus.CANCELLED],
      [ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.FAILED_DELIVERY],
      [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED],
      [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.FAILED_DELIVERY],
      [ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.IN_TRANSIT],
      [ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.RETURNED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionShipment(from, to)).toBe(true);
      expect(() => assertShipmentTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [ShipmentStatus, ShipmentStatus][] = [
      [ShipmentStatus.PENDING, ShipmentStatus.SHIPPED],
      [ShipmentStatus.PENDING, ShipmentStatus.DELIVERED],
      [ShipmentStatus.PICKING, ShipmentStatus.PENDING],
      [ShipmentStatus.PICKING, ShipmentStatus.SHIPPED],
      [ShipmentStatus.PACKED, ShipmentStatus.PENDING],
      [ShipmentStatus.PACKED, ShipmentStatus.PICKING],
      [ShipmentStatus.SHIPPED, ShipmentStatus.PENDING],
      [ShipmentStatus.SHIPPED, ShipmentStatus.CANCELLED],
      [ShipmentStatus.SHIPPED, ShipmentStatus.DELIVERED],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.PENDING],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.SHIPPED],
      [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
      [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.PENDING],
      [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.IN_TRANSIT],
      [ShipmentStatus.DELIVERED, ShipmentStatus.PENDING],
      [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED],
      [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED],
      [ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.PENDING],
      [ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.CANCELLED],
      [ShipmentStatus.RETURNED, ShipmentStatus.PENDING],
      [ShipmentStatus.RETURNED, ShipmentStatus.IN_TRANSIT],
      [ShipmentStatus.CANCELLED, ShipmentStatus.PENDING],
      [ShipmentStatus.CANCELLED, ShipmentStatus.SHIPPED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionShipment(from, to)).toBe(false);
      expect(() => assertShipmentTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
