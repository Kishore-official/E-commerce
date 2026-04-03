import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { ActiveVendorGuard } from '@common/guards/active-vendor.guard';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ShipmentService } from '../services/shipment.service';
import { Shipment } from '../schemas/shipment.schema';
import { CreateShipmentDto, MarkShippedDto } from '../dto';

@ApiTags('Vendor - Shipments')
@ApiBearerAuth()
@Controller('vendor/shipments')
@Roles(UserRole.VENDOR, UserRole.VENDOR_STAFF)
@UseGuards(ActiveVendorGuard)
export class VendorShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Get()
  @ApiOperation({ summary: 'List vendor shipments' })
  async listShipments(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<Shipment>> {
    return this.shipmentService.findByVendor(user.vendorId!, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment detail' })
  async getShipment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Shipment> {
    return this.shipmentService.findOneForVendor(id, user.vendorId!);
  }

  @Post()
  @ApiOperation({ summary: 'Create shipment for order items' })
  async createShipment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentService.createShipment(user.vendorId!, dto);
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Mark shipment as shipped with tracking info' })
  async markAsShipped(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkShippedDto,
  ): Promise<Shipment> {
    return this.shipmentService.markAsShipped(id, user.vendorId!, dto);
  }
}
