import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@ecommerce/shared-types';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CouponService } from '../services/coupon.service';
import { CreateCouponDto, UpdateCouponDto } from '../dto';

@ApiTags('Admin - Coupons')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/coupons')
export class AdminCouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  async create(
    @Body() dto: CreateCouponDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.couponService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all coupons' })
  async findAll(@Query() query: PaginationDto) {
    return this.couponService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  async findOne(@Param('id') id: string) {
    return this.couponService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a coupon' })
  async deactivate(@Param('id') id: string) {
    return this.couponService.deactivate(id);
  }
}
