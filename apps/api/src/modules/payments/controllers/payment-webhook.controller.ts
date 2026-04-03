import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PaymentService } from '../services/payment.service';

@ApiTags('Payment Webhooks')
@Controller('payments/webhook')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post(':gateway')
  @HttpCode(200)
  @ApiOperation({ summary: 'Payment gateway webhook callback' })
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Headers() headers: Record<string, string>,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: true }> {
    await this.paymentService.processWebhook(gateway, headers, body);
    return { received: true };
  }
}
