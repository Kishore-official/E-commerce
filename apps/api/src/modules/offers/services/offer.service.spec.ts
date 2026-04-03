import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { OfferStatus, OfferType, ProductStatus } from '@ecommerce/shared-types';
import { OfferService } from './offer.service';
import { Offer } from '../schemas/offer.schema';
import { Product } from '../../catalog/schemas/product.schema';
import { Variant } from '../../catalog/schemas/variant.schema';
import { EventBusService } from '@common/events/event-bus.service';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

describe('OfferService', () => {
  let service: OfferService;
  let offerModel: any;
  let productModel: any;
  let variantModel: any;
  let eventBus: any;

  const mockOffer: Partial<Offer> = {
    id: 'offer-1',
    vendorId: 'vendor-1',
    productId: 'prod-1',
    variantId: 'var-1',
    offerType: OfferType.MARKETPLACE,
    status: OfferStatus.DRAFT,
    countryCode: 'SA',
    priceAmount: 100000,
    priceCurrency: 'SAR',
    stockQuantity: 10,
    stockReserved: 0,
    compareAtPrice: null,
    costPrice: null,
    affiliateUrl: null,
    affiliateCommissionPct: null,
    fulfillmentType: 'vendor' as any,
    isFeatured: false,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockProduct: Partial<Product> = {
    id: 'prod-1',
    vendorId: 'vendor-1',
    status: ProductStatus.APPROVED,
  };

  const mockVariant: Partial<Variant> = {
    id: 'var-1',
    productId: 'prod-1',
  };

  // Helper to create a chainable mock for Mongoose queries
  function createChainableExec(resolvedValue: any) {
    return { exec: jest.fn().mockResolvedValue(resolvedValue) };
  }

  function createFindChain(resolvedValue: any) {
    return {
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(resolvedValue),
          }),
        }),
      }),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        {
          provide: getModelToken(Offer.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            findOneAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken(Variant.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
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

    service = module.get<OfferService>(OfferService);
    offerModel = module.get(getModelToken(Offer.name));
    productModel = module.get(getModelToken(Product.name));
    variantModel = module.get(getModelToken(Variant.name));
    eventBus = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an offer successfully', async () => {
      productModel.findOne.mockReturnValue(createChainableExec(mockProduct));
      variantModel.findOne.mockReturnValue(createChainableExec(mockVariant));
      // First findOne for duplicate check returns null (no existing offer)
      offerModel.findOne.mockReturnValue(createChainableExec(null));
      offerModel.create.mockResolvedValue(mockOffer);

      const result = await service.create('vendor-1', {
        productId: 'prod-1',
        variantId: 'var-1',
        offerType: OfferType.MARKETPLACE,
        priceAmount: 100000,
        stockQuantity: 10,
      });

      expect(result).toEqual(mockOffer);
      expect(offerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 'vendor-1',
          status: OfferStatus.DRAFT,
        }),
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      productModel.findOne.mockReturnValue(createChainableExec(null));

      await expect(
        service.create('vendor-1', {
          productId: 'prod-1',
          variantId: 'var-1',
          offerType: OfferType.MARKETPLACE,
          priceAmount: 100000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product does not belong to vendor', async () => {
      productModel.findOne.mockReturnValue(
        createChainableExec({ ...mockProduct, vendorId: 'vendor-2' }),
      );

      await expect(
        service.create('vendor-1', {
          productId: 'prod-1',
          variantId: 'var-1',
          offerType: OfferType.MARKETPLACE,
          priceAmount: 100000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if variant does not exist', async () => {
      productModel.findOne.mockReturnValue(createChainableExec(mockProduct));
      variantModel.findOne.mockReturnValue(createChainableExec(null));

      await expect(
        service.create('vendor-1', {
          productId: 'prod-1',
          variantId: 'var-1',
          offerType: OfferType.MARKETPLACE,
          priceAmount: 100000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate offer', async () => {
      productModel.findOne.mockReturnValue(createChainableExec(mockProduct));
      variantModel.findOne.mockReturnValue(createChainableExec(mockVariant));
      // findOne for duplicate check returns existing offer
      offerModel.findOne.mockReturnValue(createChainableExec(mockOffer));

      await expect(
        service.create('vendor-1', {
          productId: 'prod-1',
          variantId: 'var-1',
          offerType: OfferType.MARKETPLACE,
          priceAmount: 100000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update offer in DRAFT status', async () => {
      // findOwnOffer
      offerModel.findOne.mockReturnValue(createChainableExec(mockOffer));
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({ ...mockOffer, priceAmount: 90000 }),
      );

      const result = await service.update('offer-1', 'vendor-1', {
        priceAmount: 90000,
      });

      expect(result.priceAmount).toBe(90000);
    });

    it('should update offer in REJECTED status', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({ ...mockOffer, status: OfferStatus.REJECTED }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({ ...mockOffer, priceAmount: 90000 }),
      );

      const result = await service.update('offer-1', 'vendor-1', {
        priceAmount: 90000,
      });

      expect(result.priceAmount).toBe(90000);
    });

    it('should throw BadRequestException when updating ACTIVE offer', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({ ...mockOffer, status: OfferStatus.ACTIVE }),
      );

      await expect(
        service.update('offer-1', 'vendor-1', { priceAmount: 90000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitForReview', () => {
    it('should submit offer for review when product is approved', async () => {
      // findOwnOffer
      offerModel.findOne.mockReturnValue(createChainableExec(mockOffer));
      productModel.findOne.mockReturnValue(
        createChainableExec({ ...mockProduct, status: ProductStatus.APPROVED }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({ ...mockOffer, status: OfferStatus.PENDING_REVIEW }),
      );

      const result = await service.submitForReview('offer-1', 'vendor-1');

      expect(result.status).toBe(OfferStatus.PENDING_REVIEW);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException if product is not approved', async () => {
      offerModel.findOne.mockReturnValue(createChainableExec(mockOffer));
      productModel.findOne.mockReturnValue(
        createChainableExec({ ...mockProduct, status: ProductStatus.DRAFT }),
      );

      await expect(service.submitForReview('offer-1', 'vendor-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if marketplace offer has zero stock', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          offerType: OfferType.MARKETPLACE,
          stockQuantity: 0,
        }),
      );
      productModel.findOne.mockReturnValue(
        createChainableExec({ ...mockProduct, status: ProductStatus.APPROVED }),
      );

      await expect(service.submitForReview('offer-1', 'vendor-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if affiliate offer has no URL', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          offerType: OfferType.AFFILIATE,
          affiliateUrl: null,
        }),
      );
      productModel.findOne.mockReturnValue(
        createChainableExec({ ...mockProduct, status: ProductStatus.APPROVED }),
      );

      await expect(service.submitForReview('offer-1', 'vendor-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should reject offer and store reason', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          status: OfferStatus.PENDING_REVIEW,
        }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          status: OfferStatus.REJECTED,
          rejectionReason: 'Test reason',
        }),
      );

      const result = await service.reject('offer-1', 'admin-1', 'Test reason');

      expect(result.status).toBe(OfferStatus.REJECTED);
      expect(result.rejectionReason).toBe('Test reason');
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should reject offer without reason', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          status: OfferStatus.PENDING_REVIEW,
        }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          status: OfferStatus.REJECTED,
          rejectionReason: null,
        }),
      );

      const result = await service.reject('offer-1', 'admin-1');

      expect(result.status).toBe(OfferStatus.REJECTED);
      expect(result.rejectionReason).toBeNull();
    });
  });

  describe('archiveByVendor', () => {
    it('should archive offer by vendor', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({ ...mockOffer, status: OfferStatus.ACTIVE }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          status: OfferStatus.ARCHIVED,
        }),
      );

      const result = await service.archiveByVendor('offer-1', 'vendor-1');

      expect(result.status).toBe(OfferStatus.ARCHIVED);
      expect(eventBus.emit).toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('should update stock and auto-transition to OUT_OF_STOCK when stock hits 0', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          status: OfferStatus.ACTIVE,
          offerType: OfferType.MARKETPLACE,
        }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          stockQuantity: 0,
          status: OfferStatus.OUT_OF_STOCK,
        }),
      );

      const result = await service.updateStock('offer-1', 'vendor-1', { stockQuantity: 0 });

      expect(result.stockQuantity).toBe(0);
      expect(result.status).toBe(OfferStatus.OUT_OF_STOCK);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should auto-transition to ACTIVE when restocked', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          status: OfferStatus.OUT_OF_STOCK,
          stockQuantity: 0,
          offerType: OfferType.MARKETPLACE,
        }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          stockQuantity: 10,
          status: OfferStatus.ACTIVE,
        }),
      );

      const result = await service.updateStock('offer-1', 'vendor-1', { stockQuantity: 10 });

      expect(result.stockQuantity).toBe(10);
      expect(result.status).toBe(OfferStatus.ACTIVE);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException for affiliate offers', async () => {
      offerModel.findOne.mockReturnValue(
        createChainableExec({
          ...mockOffer,
          offerType: OfferType.AFFILIATE,
        }),
      );

      await expect(
        service.updateStock('offer-1', 'vendor-1', { stockQuantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
