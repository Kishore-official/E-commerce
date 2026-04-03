import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { IdempotencyKey } from '@common/decorators/idempotency-key.decorator';
import { OrderService } from '../services/order.service';
import { Order } from '../schemas/order.schema';
import { CreateOrderDto, OrderQueryDto, CancelOrderDto } from '../dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@Roles(UserRole.CUSTOMER)
export class CustomerOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart (idempotent)' })
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<Order> {
    if (dto.buyNowItems?.length) {
      return this.orderService.createFromBuyNow(user.sub, dto, idempotencyKey);
    }
    return this.orderService.createFromCart(user.sub, dto, idempotencyKey);
  }

  @Get()
  @ApiOperation({ summary: 'List my orders' })
  async listOrders(
    @CurrentUser() user: JwtPayload,
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    return this.orderService.findByUser(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.orderService.findById(id, user.sub);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<Order> {
    return this.orderService.cancelOrder(id, user.sub, dto);
  }
}
