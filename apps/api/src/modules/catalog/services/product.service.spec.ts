import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductStatus } from '@ecommerce/shared-types';
import { ProductService } from './product.service';
import { Product } from '../schemas/product.schema';
import { ProductImage } from '../schemas/product-image.schema';
import { ProductAttribute } from '../schemas/product-attribute.schema';
import { Variant } from '../schemas/variant.schema';
import { EventBusService } from '@common/events/event-bus.service';
import { StorageService } from '@common/services/storage.service';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

describe('ProductService', () => {
  let service: ProductService;
  let productModel: any;
  let imageModel: any;
  let attrModel: any;
  let variantModel: any;
  let eventBus: any;

  const mockProduct: Partial<Product> = {
    id: 'prod-1',
    vendorId: 'vendor-1',
    name: 'Test Product',
    slug: 'test-product',
    status: ProductStatus.DRAFT,
    categoryId: null,
    brandId: null,
    description: null,
    shortDescription: null,
    countryOfOrigin: null,
    metaTitle: null,
    metaDescription: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper to create chainable mock for find().sort().skip().limit().exec()
  function createFindChain(resolvedValue: any = []) {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
    return chain;
  }

  beforeEach(async () => {
    const mockProductModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(createFindChain()),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };

    const mockImageModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(createFindChain()),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      insertMany: jest.fn(),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
    };

    const mockAttrModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(createFindChain()),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      insertMany: jest.fn(),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
    };

    const mockVariantModel = {
      find: jest.fn().mockReturnValue(createFindChain()),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(ProductImage.name),
          useValue: mockImageModel,
        },
        {
          provide: getModelToken(ProductAttribute.name),
          useValue: mockAttrModel,
        },
        {
          provide: getModelToken(Variant.name),
          useValue: mockVariantModel,
        },
        {
          provide: EventBusService,
          useValue: { emit: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: {
            extractKeyFromUrl: jest.fn().mockReturnValue(null),
            deleteFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productModel = module.get(getModelToken(Product.name));
    imageModel = module.get(getModelToken(ProductImage.name));
    attrModel = module.get(getModelToken(ProductAttribute.name));
    variantModel = module.get(getModelToken(Variant.name));
    eventBus = module.get(EventBusService);
  });

  describe('create', () => {
    it('should create a product in DRAFT status with generated slug', async () => {
      // ensureUniqueSlug - findOne returns null (slug is unique)
      productModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      productModel.create.mockResolvedValue({
        id: 'prod-1',
        vendorId: 'vendor-1',
        name: 'Test Product',
        slug: 'test-product',
        status: ProductStatus.DRAFT,
      });

      const result = await service.create('vendor-1', {
        name: 'Test Product',
      });

      expect(result.vendorId).toBe('vendor-1');
      expect(result.status).toBe(ProductStatus.DRAFT);
      expect(result.slug).toBe('test-product');
      expect(productModel.create).toHaveBeenCalled();
    });

    it('should handle slug collision by appending suffix', async () => {
      // First call for ensureUniqueSlug: slug exists
      productModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ id: 'existing' }) })
        // Second call (suffixed slug) is unique
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      productModel.create.mockImplementation((data) =>
        Promise.resolve({ ...data }),
      );

      const result = await service.create('vendor-1', {
        name: 'Test Product',
      });

      expect(result.slug).toMatch(/^test-product-[a-z0-9]+$/);
    });
  });

  describe('findOneByVendor', () => {
    it('should return product when found with matching vendorId', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct }),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));

      const result = await service.findOneByVendor('prod-1', 'vendor-1');
      expect(result.id).toBe('prod-1');
    });

    it('should throw NotFoundException when product not found', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findOneByVendor('nonexistent', 'vendor-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product in DRAFT status', async () => {
      const draftProduct = { ...mockProduct };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(draftProduct),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...draftProduct, description: 'Updated desc' }),
      });

      const result = await service.update('prod-1', 'vendor-1', {
        description: 'Updated desc',
      });

      expect(result.description).toBe('Updated desc');
    });

    it('should allow minor field edits on APPROVED products', async () => {
      const approvedProduct = { ...mockProduct, status: ProductStatus.APPROVED };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(approvedProduct),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...approvedProduct,
          description: 'Updated desc',
          metaTitle: 'New meta title',
        }),
      });

      const result = await service.update('prod-1', 'vendor-1', {
        description: 'Updated desc',
        metaTitle: 'New meta title',
      });

      expect(result.description).toBe('Updated desc');
      expect(result.metaTitle).toBe('New meta title');
    });

    it('should throw BadRequestException when trying to edit major fields on APPROVED product', async () => {
      const approvedProduct = { ...mockProduct, status: ProductStatus.APPROVED };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(approvedProduct),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));

      await expect(
        service.update('prod-1', 'vendor-1', { name: 'New Name' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('prod-1', 'vendor-1', { categoryId: 'new-category' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when product is PENDING_REVIEW', async () => {
      const pendingProduct = { ...mockProduct, status: ProductStatus.PENDING_REVIEW };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(pendingProduct),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));

      await expect(
        service.update('prod-1', 'vendor-1', { description: 'Updated' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should regenerate slug when name changes in DRAFT', async () => {
      const draftProduct = { ...mockProduct };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(draftProduct),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...draftProduct, name: 'New Name', slug: 'new-name' }),
      });

      const result = await service.update('prod-1', 'vendor-1', {
        name: 'New Name',
      });

      expect(result.slug).toBe('new-name');
    });
  });

  describe('archive', () => {
    it('should archive an APPROVED product', async () => {
      const approvedProduct = { ...mockProduct, status: ProductStatus.APPROVED };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(approvedProduct),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...approvedProduct, status: ProductStatus.ARCHIVED }),
      });

      const result = await service.archive('prod-1', 'vendor-1');

      expect(result.status).toBe(ProductStatus.ARCHIVED);
    });

    it('should throw InvalidStateTransitionException from DRAFT', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct }),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));

      await expect(service.archive('prod-1', 'vendor-1')).rejects.toThrow(
        InvalidStateTransitionException,
      );
    });
  });

  describe('addAttribute', () => {
    it('should add an attribute to a product', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct }),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));
      attrModel.create.mockResolvedValue({
        id: 'attr-1',
        attributeName: 'Color',
        attributeValue: 'Black',
        productId: 'prod-1',
      });

      const result = await service.addAttribute('prod-1', 'vendor-1', {
        attributeName: 'Color',
        attributeValue: 'Black',
      });

      expect(result.attributeName).toBe('Color');
      expect(result.attributeValue).toBe('Black');
    });
  });

  describe('updateAttribute', () => {
    it('should update an attribute', async () => {
      attrModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'attr-1',
          attributeName: 'Color',
          attributeValue: 'Black',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, vendorId: 'vendor-1' }),
      });
      attrModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'attr-1',
          attributeName: 'Color',
          attributeValue: 'White',
          productId: 'prod-1',
        }),
      });

      const result = await service.updateAttribute('attr-1', 'vendor-1', {
        attributeValue: 'White',
      });

      expect(result.attributeValue).toBe('White');
    });
  });

  describe('removeAttribute', () => {
    it('should remove an attribute', async () => {
      attrModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'attr-1',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, vendorId: 'vendor-1' }),
      });
      attrModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      await service.removeAttribute('attr-1', 'vendor-1');

      expect(attrModel.deleteOne).toHaveBeenCalled();
    });
  });

  describe('submitForReview', () => {
    it('should transition DRAFT to PENDING_REVIEW when product has variants', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct }),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));
      variantModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, status: ProductStatus.PENDING_REVIEW }),
      });

      const result = await service.submitForReview('prod-1', 'vendor-1');

      expect(result.status).toBe(ProductStatus.PENDING_REVIEW);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw when product has no variants', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct }),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));
      variantModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await expect(
        service.submitForReview('prod-1', 'vendor-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InvalidStateTransitionException from APPROVED', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.APPROVED,
        }),
      });
      variantModel.find.mockReturnValue(createFindChain([]));
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));

      await expect(
        service.submitForReview('prod-1', 'vendor-1'),
      ).rejects.toThrow(InvalidStateTransitionException);
    });
  });

  describe('approve', () => {
    it('should transition PENDING_REVIEW to APPROVED and emit event', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.PENDING_REVIEW,
        }),
      });
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, status: ProductStatus.APPROVED }),
      });

      const result = await service.approve('prod-1', 'admin-1');

      expect(result.status).toBe(ProductStatus.APPROVED);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw for DRAFT status', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct }),
      });

      await expect(service.approve('prod-1', 'admin-1')).rejects.toThrow(
        InvalidStateTransitionException,
      );
    });
  });

  describe('reject', () => {
    it('should transition PENDING_REVIEW to REJECTED and emit event with reason', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.PENDING_REVIEW,
        }),
      });
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.REJECTED,
          rejectionReason: 'Low quality',
        }),
      });

      const result = await service.reject('prod-1', 'admin-1', 'Low quality');

      expect(result.status).toBe(ProductStatus.REJECTED);
      expect(result.rejectionReason).toBe('Low quality');
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should store null rejection reason when not provided', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.PENDING_REVIEW,
        }),
      });
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          status: ProductStatus.REJECTED,
          rejectionReason: null,
        }),
      });

      const result = await service.reject('prod-1', 'admin-1');

      expect(result.status).toBe(ProductStatus.REJECTED);
      expect(result.rejectionReason).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return only APPROVED products', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          id: 'prod-1',
          status: ProductStatus.APPROVED,
        }),
      });
      variantModel.find.mockReturnValue(
        createFindChain([{ isActive: true }]),
      );
      imageModel.find.mockReturnValue(createFindChain([]));
      attrModel.find.mockReturnValue(createFindChain([]));

      const result = await service.findBySlug('test-product');
      expect(result.variants).toHaveLength(1);
    });

    it('should throw NotFoundException for DRAFT product', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findBySlug('draft-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
