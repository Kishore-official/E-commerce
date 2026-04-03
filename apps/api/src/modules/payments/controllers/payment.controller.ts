import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { IdempotencyKey } from '@common/decorators/idempotency-key.decorator';
import { PaymentService } from '../services/payment.service';
import { Payment } from '../schemas/payment.schema';
import { InitiatePaymentDto } from '../dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@Roles(UserRole.CUSTOMER)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment for order (idempotent)' })
  async initiatePayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiatePaymentDto,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<Payment> {
    return this.paymentService.initiatePayment(user.sub, dto, idempotencyKey);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment status' })
  async getPayment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Payment> {
    return this.paymentService.getPaymentById(id);
  }
}
