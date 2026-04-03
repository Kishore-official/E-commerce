export abstract class DomainEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
    public readonly payload: Record<string, unknown> = {},
  ) {
    this.occurredAt = new Date();
  }
}
