import { ShipmentStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [ShipmentStatus.PICKING, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PICKING]: [ShipmentStatus.PACKED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PACKED]: [ShipmentStatus.SHIPPED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.SHIPPED]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED, ShipmentStatus.FAILED_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.FAILED_DELIVERY],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.FAILED_DELIVERY]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.RETURNED],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipment(from, to)) {
    throw new InvalidStateTransitionException('Shipment', from, to);
  }
}
