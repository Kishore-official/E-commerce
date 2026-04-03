import { DomainEvent } from '@common/events/domain-event.base';

export class UserRoleChangedEvent extends DomainEvent {
  constructor(
    userId: string,
    payload: { changedBy: string; oldRole: string; newRole: string },
  ) {
    super('identity.user.role_changed', userId, payload);
  }
}

export class UserStatusChangedEvent extends DomainEvent {
  constructor(
    userId: string,
    payload: { changedBy: string; isActive: boolean },
  ) {
    super('identity.user.status_changed', userId, payload);
  }
}
