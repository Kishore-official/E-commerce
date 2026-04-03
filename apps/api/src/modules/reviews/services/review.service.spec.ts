import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ReviewStatus,
  ReviewEligibilityStatus,
} from '@ecommerce/shared-types';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { Review } from '../schemas/review.schema';
import { ReviewEligibility } from '../schemas/review-eligibility.schema';
import { ReviewEligibilityService } from './review-eligibility.service';
import { EventBusService } from '@common/events/event-bus.service';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewModel: any;
  let eligibilityModel: any;
  let eligibilityService: any;
  let eventBus: any;

  const mockEligibility = {
    id: 'elig-1',
    userId: 'user-1',
    productId: 'prod-1',
    variantId: 'var-1',
    status: ReviewEligibilityStatus.ELIGIBLE,
    eligibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  };

  const mockReview = {
    id: 'review-1',
    reviewEligibilityId: 'elig-1',
    userId: 'user-1',
    productId: 'prod-1',
    variantId: 'var-1',
    rating: 5,
    title: 'Great product',
    body: 'Loved it!',
    status: ReviewStatus.PENDING_MODERATION,
    idempotencyKey: 'idem-1',
    moderatedBy: null,
    moderatedAt: null,
    rejectionReason: null,
  };

  beforeEach(async () => {
    const mockReviewModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockEligibilityModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: getModelToken(Review.name),
          useValue: mockReviewModel,
        },
        {
          provide: getModelToken(ReviewEligibility.name),
          useValue: mockEligibilityModel,
        },
        {
          provide: ReviewEligibilityService,
          useValue: {
            markAsUsed: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    reviewModel = module.get(getModelToken(Review.name));
    eligibilityModel = module.get(getModelToken(ReviewEligibility.name));
    eligibilityService = module.get(ReviewEligibilityService);
    eventBus = module.get(EventBusService);
  });

  describe('createReview', () => {
    it('should return existing review on duplicate idempotency key', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReview),
      });

      const result = await service.createReview('user-1', {
        reviewEligibilityId: 'elig-1',
        rating: 5,
      }, 'idem-1');

      expect(result).toEqual(mockReview);
      expect(reviewModel.create).not.toHaveBeenCalled();
    });

    it('should create review with valid eligibility', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockEligibility }),
      });
      reviewModel.create.mockResolvedValue({
        ...mockReview,
        rating: 4,
        title: 'Nice',
        body: 'Good product',
      });

      const result = await service.createReview('user-1', {
        reviewEligibilityId: 'elig-1',
        rating: 4,
        title: 'Nice',
        body: 'Good product',
      }, 'new-idem');

      expect(reviewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewEligibilityId: 'elig-1',
          userId: 'user-1',
          productId: 'prod-1',
          variantId: 'var-1',
          rating: 4,
          title: 'Nice',
          body: 'Good product',
          status: ReviewStatus.PENDING_MODERATION,
        }),
      );
      expect(eligibilityService.markAsUsed).toHaveBeenCalledWith('elig-1');
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw when eligibility not found', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createReview('user-1', { reviewEligibilityId: 'bad-id', rating: 3 }, 'k'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when eligibility belongs to different user', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockEligibility,
          userId: 'other-user',
        }),
      });

      await expect(
        service.createReview('user-1', { reviewEligibilityId: 'elig-1', rating: 3 }, 'k'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when eligibility is not ELIGIBLE', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockEligibility,
          status: ReviewEligibilityStatus.REVIEW_SUBMITTED,
        }),
      });

      await expect(
        service.createReview('user-1', { reviewEligibilityId: 'elig-1', rating: 3 }, 'k'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when eligibility has expired', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockEligibility,
          eligibleUntil: new Date(Date.now() - 1000), // expired
        }),
      });

      await expect(
        service.createReview('user-1', { reviewEligibilityId: 'elig-1', rating: 3 }, 'k'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByProduct', () => {
    it('should return only APPROVED reviews with pagination', async () => {
      const approvedReview = { ...mockReview, status: ReviewStatus.APPROVED };
      reviewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([approvedReview]),
            }),
          }),
        }),
      });
      reviewModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findByProduct('prod-1', {
        page: 1,
        limit: 20,
        skip: 0,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(reviewModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-1',
          status: ReviewStatus.APPROVED,
        }),
      );
    });
  });

  describe('findByUser', () => {
    it('should return user reviews with pagination', async () => {
      reviewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockReview]),
            }),
          }),
        }),
      });
      reviewModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findByUser('user-1', {
        page: 1,
        limit: 20,
        skip: 0,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(reviewModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return review by id', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReview),
      });

      const result = await service.findById('review-1');
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException when not found', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('moderate', () => {
    it('should approve review', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockReview }),
      });
      const approvedReview = {
        ...mockReview,
        status: ReviewStatus.APPROVED,
        moderatedBy: 'mod-1',
        moderatedAt: new Date(),
      };
      reviewModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(approvedReview),
      });

      const result = await service.moderate('review-1', {
        status: ReviewStatus.APPROVED,
      }, 'mod-1');

      expect(result.status).toBe(ReviewStatus.APPROVED);
      expect(result.moderatedBy).toBe('mod-1');
      expect(result.moderatedAt).toBeDefined();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should reject review with reason', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockReview }),
      });
      const rejectedReview = {
        ...mockReview,
        status: ReviewStatus.REJECTED,
        moderatedBy: 'mod-1',
        moderatedAt: new Date(),
        rejectionReason: 'Inappropriate content',
      };
      reviewModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(rejectedReview),
      });

      const result = await service.moderate('review-1', {
        status: ReviewStatus.REJECTED,
        rejectionReason: 'Inappropriate content',
      }, 'mod-1');

      expect(result.status).toBe(ReviewStatus.REJECTED);
      expect(result.rejectionReason).toBe('Inappropriate content');
    });

    it('should throw when review is already moderated', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockReview,
          status: ReviewStatus.APPROVED,
        }),
      });

      await expect(
        service.moderate('review-1', { status: ReviewStatus.REJECTED }, 'mod-1'),
      ).rejects.toThrow(InvalidStateTransitionException);
    });

    it('should throw when review not found', async () => {
      reviewModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.moderate('bad-id', { status: ReviewStatus.APPROVED }, 'mod-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductRatingSummary', () => {
    it('should return average rating and count', async () => {
      reviewModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { ...mockReview, rating: 5, status: ReviewStatus.APPROVED },
          { ...mockReview, rating: 4, status: ReviewStatus.APPROVED },
          { ...mockReview, rating: 4, status: ReviewStatus.APPROVED },
        ]),
      });

      const result = await service.getProductRatingSummary('prod-1');

      expect(result.averageRating).toBe(4.33);
      expect(result.totalReviews).toBe(3);
    });

    it('should return zero when no reviews', async () => {
      reviewModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getProductRatingSummary('prod-1');

      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
    });
  });
});
