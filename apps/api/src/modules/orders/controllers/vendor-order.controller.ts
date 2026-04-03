import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { ActiveVendorGuard } from '@common/guards/active-vendor.guard';
import { OrderService } from '../services/order.service';
import { Order } from '../schemas/order.schema';
import { OrderQueryDto } from '../dto';

@ApiTags('Vendor - Orders')
@ApiBearerAuth()
@Controller('vendor/orders')
@Roles(UserRole.VENDOR, UserRole.VENDOR_STAFF)
@UseGuards(ActiveVendorGuard)
export class VendorOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'List vendor orders' })
  async listVendorOrders(
    @CurrentUser() user: JwtPayload,
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    return this.orderService.findByVendor(user.vendorId!, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail for vendor (own items only)' })
  async getVendorOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.orderService.findOneForVendor(id, user.vendorId!);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm order items for this vendor' })
  async confirmOrderItems(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.orderService.confirmOrderItems(id, user.vendorId!);
  }
}
