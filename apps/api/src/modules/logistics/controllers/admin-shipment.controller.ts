import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ShipmentService } from '../services/shipment.service';
import { Shipment } from '../schemas/shipment.schema';

@ApiTags('Admin - Shipments')
@ApiBearerAuth()
@Controller('admin/shipments')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPS)
export class AdminShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Get()
  @ApiOperation({ summary: 'List all shipments (admin)' })
  async listShipments(
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<Shipment>> {
    return this.shipmentService.findAll(query);
  }
}
