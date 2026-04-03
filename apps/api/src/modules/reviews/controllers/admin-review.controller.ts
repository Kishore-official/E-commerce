import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { ReviewService } from '../services/review.service';
import { Review } from '../schemas/review.schema';
import { ReviewQueryDto, ModerateReviewDto } from '../dto';

@ApiTags('Admin - Reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class AdminReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: 'List all reviews with filters' })
  @ApiResponse({ status: 200 })
  async listReviews(
    @Query() query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    return this.reviewService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review detail' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getReview(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Review> {
    return this.reviewService.findById(id);
  }

  @Patch(':id/moderate')
  @ApiOperation({ summary: 'Moderate a review (approve/reject)' })
  @ApiResponse({ status: 200 })
  async moderateReview(
    @CurrentUser('sub') moderatorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ): Promise<Review> {
    return this.reviewService.moderate(id, dto, moderatorId as string);
  }
}
