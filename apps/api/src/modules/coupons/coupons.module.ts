import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Coupon, CouponSchema } from './schemas/coupon.schema';
import { CouponUsage, CouponUsageSchema } from './schemas/coupon-usage.schema';
import { CouponService } from './services/coupon.service';
import { AdminCouponController } from './controllers/admin-coupon.controller';
import { CustomerCouponController } from './controllers/customer-coupon.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
    ]),
  ],
  controllers: [AdminCouponController, CustomerCouponController],
  providers: [CouponService],
  exports: [MongooseModule, CouponService],
})
export class CouponsModule {}
