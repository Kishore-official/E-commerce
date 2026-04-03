import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { ActiveVendorGuard } from '@common/guards/active-vendor.guard';
import { ReviewService } from '../services/review.service';
import { Review } from '../schemas/review.schema';
import { ReviewQueryDto } from '../dto';

@ApiTags('Vendor - Reviews')
@ApiBearerAuth()
@Controller('vendor/reviews')
@Roles(UserRole.VENDOR, UserRole.VENDOR_STAFF)
@UseGuards(ActiveVendorGuard)
export class VendorReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: 'List reviews on vendor products (read-only)' })
  async listVendorReviews(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    return this.reviewService.findByVendor(user.vendorId!, query);
  }
}
