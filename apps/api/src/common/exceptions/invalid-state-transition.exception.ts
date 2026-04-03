import { BadRequestException } from '@nestjs/common';

export class InvalidStateTransitionException extends BadRequestException {
  constructor(entity: string, currentState: string, requestedState: string) {
    super(
      `Invalid state transition for ${entity}: cannot transition from '${currentState}' to '${requestedState}'`,
    );
  }
}
