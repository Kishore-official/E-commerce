import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { OrderService } from '../services/order.service';
import { Order } from '../schemas/order.schema';
import { OrderQueryDto, AdminUpdateStatusDto } from '../dto';

@ApiTags('Admin - Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPS)
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders' })
  async listAllOrders(
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    return this.orderService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail (admin)' })
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.orderService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateStatusDto,
  ): Promise<Order> {
    return this.orderService.adminUpdateStatus(id, dto, user.sub);
  }
}
