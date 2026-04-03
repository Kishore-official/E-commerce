import { Controller, Get, Param, Query, ParseUUIDPipe, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginatedResult } from '@ecommerce/shared-types';
import { Public } from '@common/decorators';
import { ReviewService } from '../services/review.service';
import { Review } from '../schemas/review.schema';
import { ReviewQueryDto } from '../dto';

@ApiTags('Product Reviews')
@Controller('products')
@UseInterceptors(ClassSerializerInterceptor)
export class PublicReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Public()
  @Get(':productId/reviews')
  @ApiOperation({ summary: 'List approved reviews for a product' })
  @ApiResponse({ status: 200 })
  async listProductReviews(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    return this.reviewService.findByProduct(productId, query);
  }

  @Public()
  @Get(':productId/reviews/summary')
  @ApiOperation({ summary: 'Get product rating summary' })
  @ApiResponse({ status: 200 })
  async getProductRatingSummary(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<{ averageRating: number; totalReviews: number }> {
    return this.reviewService.getProductRatingSummary(productId);
  }
}
