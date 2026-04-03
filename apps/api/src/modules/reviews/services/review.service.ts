import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  ReviewStatus,
  ReviewEligibilityStatus,
  PaginatedResult,
} from '@ecommerce/shared-types';
import { EventBusService } from '@common/events/event-bus.service';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { Review, ReviewDocument } from '../schemas/review.schema';
import { ReviewEligibility, ReviewEligibilityDocument } from '../schemas/review-eligibility.schema';
import { Product, ProductDocument } from '@modules/catalog/schemas/product.schema';
import { CreateReviewDto, ReviewQueryDto, ModerateReviewDto } from '../dto';
import { assertReviewTransition } from '../state-machines/review-status.machine';
import { ReviewEligibilityService } from './review-eligibility.service';
import {
  ReviewSubmittedEvent,
  ReviewApprovedEvent,
  ReviewRejectedEvent,
} from '../events/review.events';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(ReviewEligibility.name)
    private readonly eligibilityModel: Model<ReviewEligibilityDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly eligibilityService: ReviewEligibilityService,
    private readonly eventBus: EventBusService,
  ) {}

  async createReview(
    userId: string,
    dto: CreateReviewDto,
    idempotencyKey: string,
  ): Promise<Review> {
    // Idempotency check
    const existing = await this.reviewModel.findOne({ idempotencyKey }).exec();
    if (existing) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('Idempotency key conflict');
      }
      return existing;
    }

    // Validate eligibility
    const eligibility = await this.eligibilityModel.findOne({ id: dto.reviewEligibilityId }).exec();
    if (!eligibility) {
      throw new NotFoundException('Review eligibility not found');
    }
    if (eligibility.userId !== userId) {
      throw new ForbiddenException('This review eligibility does not belong to you');
    }
    if (eligibility.status !== ReviewEligibilityStatus.ELIGIBLE) {
      throw new BadRequestException(
        `Eligibility status is '${eligibility.status}', cannot submit review`,
      );
    }
    if (new Date() > new Date(eligibility.eligibleUntil)) {
      throw new BadRequestException('Review eligibility has expired');
    }

    // Create review
    const review = await this.reviewModel.create({
      id: uuidv4(),
      reviewEligibilityId: eligibility.id,
      userId,
      productId: eligibility.productId,
      variantId: eligibility.variantId,
      rating: dto.rating,
      title: dto.title || undefined,
      body: dto.body || undefined,
      status: ReviewStatus.PENDING_MODERATION,
      idempotencyKey,
    });

    // Mark eligibility as used
    await this.eligibilityService.markAsUsed(eligibility.id);

    this.eventBus.emit(
      new ReviewSubmittedEvent(review.id, {
        userId,
        productId: eligibility.productId,
        rating: dto.rating,
      }),
    );

    this.logger.log(
      `Review ${review.id} submitted for product ${eligibility.productId}`,
    );

    return review;
  }

  async findByProduct(
    productId: string,
    query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    const filter: Record<string, unknown> = {
      productId,
      status: ReviewStatus.APPROVED,
    };
    if (query.rating) {
      filter.rating = query.rating;
    }

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async findByUser(
    userId: string,
    query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    const filter: Record<string, unknown> = { userId };
    if (query.status) {
      filter.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async findByVendor(
    vendorId: string,
    query: ReviewQueryDto,
  ): Promise<PaginatedResult<Review>> {
    // Find products belonging to this vendor
    const vendorProducts = await this.productModel.find(
      { vendorId },
      { id: 1 },
    ).exec();
    const vendorProductIds = vendorProducts.map((p) => p.id);

    if (vendorProductIds.length === 0) {
      return buildPaginatedResult([], 0, query.page, query.limit);
    }

    const filter: Record<string, unknown> = {
      productId: { $in: vendorProductIds },
    };
    if (query.status) {
      filter.status = query.status;
    }
    if (query.rating) {
      filter.rating = query.rating;
    }

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async findAll(query: ReviewQueryDto): Promise<PaginatedResult<Review>> {
    const filter: Record<string, unknown> = {};

    if (query.productId) {
      filter.productId = query.productId;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.rating) {
      filter.rating = query.rating;
    }
    if (query.userId) {
      filter.userId = query.userId;
    }

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async findById(reviewId: string): Promise<Review> {
    const review = await this.reviewModel.findOne({ id: reviewId }).exec();
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async moderate(
    reviewId: string,
    dto: ModerateReviewDto,
    moderatorId: string,
  ): Promise<Review> {
    const review = await this.findById(reviewId);

    assertReviewTransition(review.status, dto.status);

    const updateData: Record<string, unknown> = {
      status: dto.status,
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
    };
    if (dto.status === ReviewStatus.REJECTED) {
      updateData.rejectionReason = dto.rejectionReason || undefined;
    } else {
      updateData.rejectionReason = undefined;
    }

    const updated = await this.reviewModel.findOneAndUpdate(
      { id: reviewId },
      { $set: updateData },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException('Review not found after update');

    if (dto.status === ReviewStatus.APPROVED) {
      this.eventBus.emit(
        new ReviewApprovedEvent(updated.id, {
          productId: updated.productId,
          moderatedBy: moderatorId,
        }),
      );
    } else {
      this.eventBus.emit(
        new ReviewRejectedEvent(updated.id, {
          productId: updated.productId,
          moderatedBy: moderatorId,
          rejectionReason: dto.rejectionReason || '',
        }),
      );
    }

    this.logger.log(
      `Review ${reviewId} moderated to ${dto.status} by ${moderatorId}`,
    );

    return updated;
  }

  async getProductRatingSummary(
    productId: string,
  ): Promise<{ averageRating: number; totalReviews: number }> {
    const reviews = await this.reviewModel.find({
      productId,
      status: ReviewStatus.APPROVED,
    }).exec();

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
    };
  }

}
