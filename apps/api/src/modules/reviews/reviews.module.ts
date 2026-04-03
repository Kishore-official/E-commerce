import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewEligibility, ReviewEligibilitySchema } from './schemas/review-eligibility.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewMedia, ReviewMediaSchema } from './schemas/review-media.schema';
import { OrdersModule } from '../orders/orders.module';
import { LogisticsModule } from '../logistics/logistics.module';
import { OffersModule } from '../offers/offers.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ReviewEligibilityService } from './services/review-eligibility.service';
import { ReviewService } from './services/review.service';
import { DeliveryEventListener } from './listeners/delivery-event.listener';
import { CustomerReviewController } from './controllers/customer-review.controller';
import { PublicReviewController } from './controllers/public-review.controller';
import { AdminReviewController } from './controllers/admin-review.controller';
import { VendorReviewController } from './controllers/vendor-review.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewEligibility.name, schema: ReviewEligibilitySchema },
      { name: Review.name, schema: ReviewSchema },
      { name: ReviewMedia.name, schema: ReviewMediaSchema },
    ]),
    OrdersModule,
    LogisticsModule,
    OffersModule,
    CatalogModule,
  ],
  controllers: [
    CustomerReviewController,
    PublicReviewController,
    AdminReviewController,
    VendorReviewController,
  ],
  providers: [
    ReviewEligibilityService,
    ReviewService,
    DeliveryEventListener,
  ],
  exports: [MongooseModule, ReviewEligibilityService, ReviewService],
})
export class ReviewsModule {}
