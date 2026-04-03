import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const key = request.headers['x-idempotency-key'];
    if (!key) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    return key as string;
  },
);
