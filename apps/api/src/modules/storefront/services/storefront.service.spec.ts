import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { OfferStatus, ProductStatus } from '@ecommerce/shared-types';
import { StorefrontService } from './storefront.service';
import { Offer } from '../../offers/schemas/offer.schema';
import { Product } from '../../catalog/schemas/product.schema';
import { Variant } from '../../catalog/schemas/variant.schema';
import { ProductImage } from '../../catalog/schemas/product-image.schema';
import { ProductAttribute } from '../../catalog/schemas/product-attribute.schema';
import { Category } from '../../catalog/schemas/category.schema';
import { Brand } from '../../catalog/schemas/brand.schema';

/**
 * Helper to create a mock Mongoose model with chainable methods.
 * - find() returns a chain of .sort().skip().limit().exec() OR .sort().exec() OR .exec()
 * - findOne() returns .sort().exec() OR .exec()
 */
function createMockModel() {
  const model: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };
  return model;
}

/**
 * Sets up a find() mock that returns a chainable { sort, skip, limit, exec }.
 * The exec resolves to the given data.
 */
function mockFindChain(model: any, resolvedData: any[]) {
  const execFn = jest.fn().mockResolvedValue(resolvedData);
  const limitFn = jest.fn().mockReturnValue({ exec: execFn });
  const skipFn = jest.fn().mockReturnValue({ limit: limitFn });
  const sortFn = jest.fn().mockReturnValue({ skip: skipFn, exec: execFn });

  model.find.mockReturnValue({ sort: sortFn, exec: execFn });
  return { execFn, sortFn, skipFn, limitFn };
}

/**
 * Sets up a findOne() mock that returns { sort, exec } chain.
 */
function mockFindOneChain(model: any, resolvedData: any) {
  const execFn = jest.fn().mockResolvedValue(resolvedData);
  const sortFn = jest.fn().mockReturnValue({ exec: execFn });
  model.findOne.mockReturnValue({ sort: sortFn, exec: execFn });
  return { execFn, sortFn };
}

describe('StorefrontService', () => {
  let service: StorefrontService;
  let offerModel: any;
  let productModel: any;
  let variantModel: any;
  let imageModel: any;
  let attrModel: any;
  let categoryModel: any;
  let brandModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorefrontService,
        { provide: getModelToken(Offer.name), useValue: createMockModel() },
        { provide: getModelToken(Product.name), useValue: createMockModel() },
        { provide: getModelToken(Variant.name), useValue: createMockModel() },
        { provide: getModelToken(ProductImage.name), useValue: createMockModel() },
        { provide: getModelToken(ProductAttribute.name), useValue: createMockModel() },
        { provide: getModelToken(Category.name), useValue: createMockModel() },
        { provide: getModelToken(Brand.name), useValue: createMockModel() },
      ],
    }).compile();

    service = module.get<StorefrontService>(StorefrontService);
    offerModel = module.get(getModelToken(Offer.name));
    productModel = module.get(getModelToken(Product.name));
    variantModel = module.get(getModelToken(Variant.name));
    imageModel = module.get(getModelToken(ProductImage.name));
    attrModel = module.get(getModelToken(ProductAttribute.name));
    categoryModel = module.get(getModelToken(Category.name));
    brandModel = module.get(getModelToken(Brand.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findListings', () => {
    /**
     * Sets up all the mock chains needed for a findListings call.
     * The service calls many models in sequence; each needs proper chaining.
     */
    function setupFindListingsMocks(opts: {
      products?: any[];
      variants?: any[];
      offers?: any[];
      categories?: any[];
      brands?: any[];
      images?: any[];
    } = {}) {
      const products = opts.products || [];
      const variants = opts.variants || [];
      const offers = opts.offers || [];
      const categories = opts.categories || [];
      const brands = opts.brands || [];
      const images = opts.images || [];

      // categoryModel.find() — for child categories
      // categoryModel.findOne() — for slug lookup
      // Both may be called multiple times; we use mockReturnValue for defaults
      mockFindChain(categoryModel, []);
      mockFindOneChain(categoryModel, null);

      // productModel.find(filter).exec()
      mockFindChain(productModel, products);

      // variantModel.find({ productId: { $in }, isActive }).exec()
      mockFindChain(variantModel, variants);

      // offerModel.find(filter).exec()
      mockFindChain(offerModel, offers);

      // categoryModel.find({ id: { $in } }).exec() — for fetching categories by IDs
      // We need to handle multiple calls to categoryModel.find; use mockImplementation
      // to return proper data based on call order. For simplicity, return categories/empty.
      // Override after initial setup:
      const catExec = jest.fn().mockResolvedValue(categories);
      categoryModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: catExec }), exec: catExec });

      // brandModel.find({ id: { $in } }).exec()
      const brandExec = jest.fn().mockResolvedValue(brands);
      brandModel.find.mockReturnValue({ exec: brandExec });

      // imageModel.find(...).sort({ sortOrder: 1 }).exec()
      const imgExec = jest.fn().mockResolvedValue(images);
      const imgSort = jest.fn().mockReturnValue({ exec: imgExec });
      imageModel.find.mockReturnValue({ sort: imgSort, exec: imgExec });
    }

    it('should return paginated listings', async () => {
      const now = new Date();
      const products = [
        { id: 'prod-1', name: 'Test Product', slug: 'test-product', categoryId: 'cat-1', brandId: 'brand-1', status: ProductStatus.APPROVED },
      ];
      const variants = [
        { id: 'var-1', productId: 'prod-1', name: 'Variant 1', sku: 'SKU-1', isActive: true },
      ];
      const offers = [
        {
          id: 'offer-1', productId: 'prod-1', variantId: 'var-1', priceAmount: 100000,
          priceCurrency: 'SAR', compareAtPrice: null, stockQuantity: 10, isFeatured: false,
          countryCode: 'SA', status: OfferStatus.ACTIVE, createdAt: now,
        },
      ];
      const categories = [{ id: 'cat-1', name: 'Category 1' }];
      const brands = [{ id: 'brand-1', name: 'Brand 1' }];
      const images = [{ productId: 'prod-1', url: 'https://example.com/image.jpg', altText: 'Test image', isPrimary: true }];

      setupFindListingsMocks({ products, variants, offers, categories, brands, images });

      const result = await service.findListings({
        page: 1,
        limit: 20,
        skip: 0,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].productName).toBe('Test Product');
      expect(result.data[0].priceAmount).toBe(100000);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should filter by categorySlug', async () => {
      const mockCategory = { id: 'cat-1', slug: 'electronics', isActive: true };

      // categoryModel.findOne for slug lookup
      mockFindOneChain(categoryModel, mockCategory);
      // categoryModel.find for child categories — return empty
      const catExec = jest.fn().mockResolvedValue([]);
      categoryModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: catExec }), exec: catExec });

      // Other models return empty
      mockFindChain(productModel, []);
      mockFindChain(variantModel, []);
      mockFindChain(offerModel, []);
      brandModel.find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      const imgExec = jest.fn().mockResolvedValue([]);
      imageModel.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: imgExec }), exec: imgExec });

      await service.findListings({
        page: 1,
        limit: 20,
        skip: 0,
        categorySlug: 'electronics',
      } as any);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'electronics', isActive: true });
    });

    it('should return empty result if categorySlug not found', async () => {
      mockFindOneChain(categoryModel, null);

      const result = await service.findListings({
        page: 1,
        limit: 20,
        skip: 0,
        categorySlug: 'nonexistent',
      } as any);

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it('should group by product and pick cheapest offer', async () => {
      const now = new Date();
      const products = [
        { id: 'prod-1', name: 'Test Product', slug: 'test-product', categoryId: null, brandId: null, status: ProductStatus.APPROVED },
      ];
      const variants = [
        { id: 'var-1', productId: 'prod-1', name: 'Variant 1', sku: 'SKU-1', isActive: true },
        { id: 'var-2', productId: 'prod-1', name: 'Variant 2', sku: 'SKU-2', isActive: true },
      ];
      const offers = [
        {
          id: 'offer-1', productId: 'prod-1', variantId: 'var-1', priceAmount: 150000,
          priceCurrency: 'SAR', compareAtPrice: null, stockQuantity: 10, isFeatured: false,
          countryCode: 'SA', status: OfferStatus.ACTIVE, createdAt: now,
        },
        {
          id: 'offer-2', productId: 'prod-1', variantId: 'var-2', priceAmount: 100000,
          priceCurrency: 'SAR', compareAtPrice: null, stockQuantity: 5, isFeatured: false,
          countryCode: 'SA', status: OfferStatus.ACTIVE, createdAt: now,
        },
      ];

      setupFindListingsMocks({ products, variants, offers });

      const result = await service.findListings({
        page: 1,
        limit: 20,
        skip: 0,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].offerId).toBe('offer-2'); // Cheapest offer
      expect(result.data[0].offerCount).toBe(2); // Two offers for this product
    });
  });

  describe('findProductDetail', () => {
    it('should return product detail with offers grouped by variant', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test description',
        shortDescription: 'Short desc',
        status: ProductStatus.APPROVED,
        categoryId: 'cat-1',
        brandId: 'brand-1',
        metaTitle: null,
        metaDescription: null,
        countryOfOrigin: null,
      };

      const mockVariants = [
        { id: 'var-1', name: 'Variant 1', sku: 'SKU-1', productId: 'prod-1', isActive: true, sortOrder: 0 },
        { id: 'var-2', name: 'Variant 2', sku: 'SKU-2', productId: 'prod-1', isActive: true, sortOrder: 1 },
      ];

      const mockOffers = [
        {
          id: 'offer-1', productId: 'prod-1', variantId: 'var-1',
          priceAmount: 100000, priceCurrency: 'SAR', compareAtPrice: null,
          stockQuantity: 10, offerType: 'marketplace' as any,
          fulfillmentType: 'vendor' as any, vendorId: 'vendor-1', isFeatured: false,
        },
        {
          id: 'offer-2', productId: 'prod-1', variantId: 'var-1',
          priceAmount: 120000, priceCurrency: 'SAR', compareAtPrice: null,
          stockQuantity: 5, offerType: 'marketplace' as any,
          fulfillmentType: 'vendor' as any, vendorId: 'vendor-2', isFeatured: false,
        },
      ];

      const mockCategory = { id: 'cat-1', name: 'Category 1', slug: 'category-1' };
      const mockBrand = { id: 'brand-1', name: 'Brand 1' };

      // productModel.findOne({ slug, status }).exec()
      mockFindOneChain(productModel, mockProduct);

      // categoryModel.findOne({ id: product.categoryId }).exec()
      mockFindOneChain(categoryModel, mockCategory);

      // brandModel.findOne({ id: product.brandId }).exec()
      mockFindOneChain(brandModel, mockBrand);

      // imageModel.find({ productId }).sort({ sortOrder: 1 }).exec()
      const imgExec = jest.fn().mockResolvedValue([]);
      const imgSort = jest.fn().mockReturnValue({ exec: imgExec });
      imageModel.find.mockReturnValue({ sort: imgSort, exec: imgExec });

      // attrModel.find({ productId }).exec()
      attrModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      // variantModel.find({ productId, isActive }).sort({ sortOrder: 1 }).exec()
      const varExec = jest.fn().mockResolvedValue(mockVariants);
      const varSort = jest.fn().mockReturnValue({ exec: varExec });
      variantModel.find.mockReturnValue({ sort: varSort, exec: varExec });

      // offerModel.find({ productId, status }).sort({ priceAmount: 1 }).exec()
      const offExec = jest.fn().mockResolvedValue(mockOffers);
      const offSort = jest.fn().mockReturnValue({ exec: offExec });
      offerModel.find.mockReturnValue({ sort: offSort, exec: offExec });

      const result = await service.findProductDetail('test-product');

      expect(result.product.name).toBe('Test Product');
      expect(result.variants).toHaveLength(1); // Only var-1 has offers
      expect(result.variants[0].offers).toHaveLength(2);
      expect(result.variants[0].offers[0].priceAmount).toBe(100000); // Sorted by price ASC
    });

    it('should throw NotFoundException if product not found', async () => {
      mockFindOneChain(productModel, null);

      await expect(service.findProductDetail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
