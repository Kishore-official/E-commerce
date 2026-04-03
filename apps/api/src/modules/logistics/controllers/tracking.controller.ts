import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentService } from '../services/shipment.service';
import { Shipment } from '../schemas/shipment.schema';

@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('shipments')
export class TrackingController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get shipment tracking info' })
  async getTracking(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Shipment> {
    return this.shipmentService.getTracking(id);
  }
}
