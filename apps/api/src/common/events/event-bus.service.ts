import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from './domain-event.base';

@Injectable()
export class EventBusService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit(event: DomainEvent): boolean {
    return this.eventEmitter.emit(event.eventName, event);
  }

  async emitAsync(event: DomainEvent): Promise<unknown[]> {
    return this.eventEmitter.emitAsync(event.eventName, event);
  }
}
