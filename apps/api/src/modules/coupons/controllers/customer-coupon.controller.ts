import { Controller, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CouponService } from '../services/coupon.service';
import { ApplyCouponDto } from '../dto';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CustomerCouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code (preview discount before checkout)' })
  async validate(
    @Body() dto: ApplyCouponDto,
    @CurrentUser() user: { sub: string },
  ) {
    // Validate with a 0 subtotal just to check eligibility
    // The actual discount will be calculated at checkout with real subtotal
    const result = await this.couponService.validateCoupon(dto.code, user.sub, 0);
    return {
      valid: result.valid,
      coupon: {
        code: result.coupon.code,
        description: result.coupon.description,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
        maxDiscountAmount: result.coupon.maxDiscountAmount,
        minOrderAmount: result.coupon.minOrderAmount,
      },
    };
  }
}
