import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { IdempotencyKey } from '@common/decorators/idempotency-key.decorator';
import { PaymentService } from '../services/payment.service';
import { Refund } from '../schemas/refund.schema';
import { InitiateRefundDto } from '../dto';

@ApiTags('Admin - Refunds')
@ApiBearerAuth()
@Controller('admin/refunds')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminRefundController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate refund' })
  async initiateRefund(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiateRefundDto,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<Refund> {
    return this.paymentService.initiateRefund(dto, idempotencyKey, user.sub);
  }
}
