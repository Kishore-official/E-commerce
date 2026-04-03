import { DomainEvent } from '@common/events/domain-event.base';

export class VendorRegisteredEvent extends DomainEvent {
  constructor(vendorId: string, userId: string) {
    super('identity.vendor.registered', vendorId, { userId });
  }
}

export class VendorApprovedEvent extends DomainEvent {
  constructor(vendorId: string, userId: string, approvedBy: string) {
    super('identity.vendor.approved', vendorId, { userId, approvedBy });
  }
}

export class VendorRejectedEvent extends DomainEvent {
  constructor(vendorId: string, userId: string, rejectedBy: string, reason?: string) {
    super('identity.vendor.rejected', vendorId, { userId, rejectedBy, reason });
  }
}

export class VendorSuspendedEvent extends DomainEvent {
  constructor(vendorId: string, userId: string, suspendedBy: string, reason?: string) {
    super('identity.vendor.suspended', vendorId, { userId, suspendedBy, reason });
  }
}

