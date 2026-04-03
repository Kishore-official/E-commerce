import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ShipmentService } from '../services/shipment.service';

@ApiTags('Carrier Webhooks')
@Controller('logistics/webhooks')
export class CarrierWebhookController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Public()
  @Post('carrier')
  @HttpCode(200)
  @ApiOperation({ summary: 'Carrier tracking webhook' })
  async handleCarrierWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: true }> {
    await this.shipmentService.processCarrierWebhook(headers, body);
    return { received: true };
  }
}
