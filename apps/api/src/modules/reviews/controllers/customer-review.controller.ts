import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  NotFoundException,
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
import { IdempotencyKey } from '@common/decorators/idempotency-key.decorator';
import { ReviewService } from '../services/review.service';
import { ReviewEligibilityService } from '../services/review-eligibility.service';
import { Review } from '../schemas/review.schema';
import { CreateReviewDto, ReviewQueryDto, ReviewEligibilityDto } from '../dto';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
@Roles(UserRole.CUSTOMER)
export class CustomerReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly eligibilityService: ReviewEligibilityService,
  ) {}

  @Get('eligibilities')
  @ApiOperation({ summary: 'List review eligibilities for current user' })
  @ApiResponse({ status: 200 })
  async listEligibilities(
    @CurrentUser() user: JwtPayload,
  ): Promise<ReviewEligibilityDto[]> {
    return this.eligibilityService.findByUser(user.sub);
  }

  @Get('eligibilities/:id')
  @ApiOperation({ summary: 'Get a single review eligibility' })
  async getEligibility(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReviewEligibilityDto> {
    const eligibility = await this.eligibilityService.findByIdEnriched(id);
    if (!eligibility || eligibility.userId !== user.sub) {
      throw new NotFoundException('Eligibility not found');
    }
    return eligibility;
  }

  @Post()
  @ApiOperation({ summary: 'Submit a review' })
  @ApiResponse({ status: 201, description: 'Review submitted' })
  async createReview(
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateReviewDto,
  ): Promise<Review> {
    return this.reviewService.createReview(user.sub, dto, idempotencyKey);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my reviews' })
  @ApiResponse({ status: 200 })
  async listMyReviews(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    return this.reviewService.findByUser(user.sub, query);
  }
}
