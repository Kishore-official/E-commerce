import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OfferStatus, ProductStatus } from '@ecommerce/shared-types';
import { Offer } from '@modules/offers/schemas/offer.schema';
import { Product } from '@modules/catalog/schemas/product.schema';
import { Variant } from '@modules/catalog/schemas/variant.schema';
import { Category } from '@modules/catalog/schemas/category.schema';
import { Brand } from '@modules/catalog/schemas/brand.schema';
import { ProductImage } from '@modules/catalog/schemas/product-image.schema';
import { ProductAttribute } from '@modules/catalog/schemas/product-attribute.schema';
import { SearchIndexingService } from '../services/search-indexing.service';
import { OpenSearchService } from '../services/opensearch.service';

describe('SearchIndexingService', () => {
  let service: SearchIndexingService;
  let opensearch: jest.Mocked<OpenSearchService>;

  // Each mock model needs to support chainable methods (.exec(), .sort().exec(), etc.)
  const mockOfferModel = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockProductModel = { findOne: jest.fn() };
  const mockVariantModel = { findOne: jest.fn() };
  const mockCategoryModel = { findOne: jest.fn() };
  const mockBrandModel = { findOne: jest.fn() };
  const mockImageModel = { findOne: jest.fn() };
  const mockAttrModel = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset default mock implementations: each returns { exec } or { sort: ..., exec }
    mockOfferModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockOfferModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      exec: jest.fn().mockResolvedValue([]),
    });
    mockProductModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockVariantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockCategoryModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockBrandModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockImageModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      exec: jest.fn().mockResolvedValue(null),
    });
    mockAttrModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexingService,
        {
          provide: OpenSearchService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
            indexDocument: jest.fn(),
            deleteDocument: jest.fn(),
          },
        },
        { provide: getModelToken(Offer.name), useValue: mockOfferModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Variant.name), useValue: mockVariantModel },
        { provide: getModelToken(Category.name), useValue: mockCategoryModel },
        { provide: getModelToken(Brand.name), useValue: mockBrandModel },
        { provide: getModelToken(ProductImage.name), useValue: mockImageModel },
        {
          provide: getModelToken(ProductAttribute.name),
          useValue: mockAttrModel,
        },
      ],
    }).compile();

    service = module.get(SearchIndexingService);
    opensearch = module.get(OpenSearchService);
  });

  const makeOffer = (overrides: Partial<Offer> = {}): Offer =>
    ({
      id: 'offer-1',
      productId: 'prod-1',
      variantId: 'var-1',
      vendorId: 'vendor-1',
      offerType: 'marketplace',
      status: OfferStatus.ACTIVE,
      countryCode: 'SA',
      priceAmount: 10000,
      priceCurrency: 'SAR',
      compareAtPrice: null,
      stockQuantity: 25,
      isFeatured: false,
      fulfillmentType: 'vendor',
      createdAt: new Date('2024-01-01'),
      ...overrides,
    }) as any;

  const makeProduct = (overrides: Partial<Product> = {}): Product =>
    ({
      id: 'prod-1',
      name: 'Test Product',
      slug: 'test-product',
      description: 'A test product',
      shortDescription: 'Short desc',
      countryOfOrigin: 'CN',
      categoryId: 'cat-1',
      brandId: 'brand-1',
      status: ProductStatus.APPROVED,
      ...overrides,
    }) as any;

  /** Helper to set up all the chained mocks needed for buildDocument */
  function setupBuildDocumentMocks(opts: {
    variant?: any;
    category?: any;
    brand?: any;
    image?: any;
    attrs?: any[];
  } = {}) {
    mockVariantModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(opts.variant ?? null),
    });
    mockCategoryModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(opts.category ?? null),
    });
    mockBrandModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(opts.brand ?? null),
    });
    mockImageModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(opts.image ?? null),
      }),
    });
    mockAttrModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(opts.attrs ?? []),
    });
  }

  describe('indexOffer', () => {
    it('should index when offer is ACTIVE and product is APPROVED', async () => {
      mockOfferModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeOffer()),
      });
      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeProduct()),
      });

      setupBuildDocumentMocks({
        variant: { id: 'var-1', name: 'Variant 1', sku: 'SKU-1' },
        category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
        brand: { id: 'brand-1', name: 'Samsung', slug: 'samsung' },
        image: { url: 'https://img.test/1.jpg' },
        attrs: [],
      });

      await service.indexOffer('offer-1');

      expect(opensearch.indexDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          offer_id: 'offer-1',
          product_name: 'Test Product',
          category_name: 'Electronics',
          brand_name: 'Samsung',
          in_stock: true,
        }),
      );
    });

    it('should delete from index when offer is not ACTIVE', async () => {
      mockOfferModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeOffer({ status: OfferStatus.PAUSED })),
      });

      await service.indexOffer('offer-1');

      expect(opensearch.deleteDocument).toHaveBeenCalledWith('offer-1');
      expect(opensearch.indexDocument).not.toHaveBeenCalled();
    });

    it('should delete from index when product is not APPROVED', async () => {
      mockOfferModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeOffer()),
      });
      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.indexOffer('offer-1');

      expect(opensearch.deleteDocument).toHaveBeenCalledWith('offer-1');
    });

    it('should skip when OpenSearch is unavailable', async () => {
      (opensearch.isAvailable as jest.Mock).mockReturnValue(false);

      await service.indexOffer('offer-1');

      expect(mockOfferModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('removeOffer', () => {
    it('should call deleteDocument', async () => {
      await service.removeOffer('offer-1');

      expect(opensearch.deleteDocument).toHaveBeenCalledWith('offer-1');
    });
  });

  describe('indexAllOffersForProduct', () => {
    it('should index all ACTIVE offers for a product', async () => {
      const offer1 = makeOffer({ id: 'o1' });
      const offer2 = makeOffer({ id: 'o2' });

      // offerModel.find({ productId, status }).exec() — returns the list of offers
      mockOfferModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([offer1, offer2]),
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      // indexOffer calls offerModel.findOne for each offer
      mockOfferModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(makeOffer({ id: 'o1' })) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(makeOffer({ id: 'o2' })) });

      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeProduct()),
      });

      setupBuildDocumentMocks({
        variant: { id: 'var-1', name: 'V', sku: 'S' },
        category: null,
        brand: null,
        image: null,
        attrs: [],
      });

      await service.indexAllOffersForProduct('prod-1');

      expect(opensearch.indexDocument).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeAllOffersForProduct', () => {
    it('should remove all offers for a product', async () => {
      mockOfferModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          makeOffer({ id: 'o1' }),
          makeOffer({ id: 'o2' }),
        ]),
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await service.removeAllOffersForProduct('prod-1');

      expect(opensearch.deleteDocument).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildDocument', () => {
    it('should correctly denormalize all fields', async () => {
      const offer = makeOffer();
      const product = makeProduct();

      setupBuildDocumentMocks({
        variant: { id: 'var-1', name: 'Variant 1', sku: 'SKU-1' },
        category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
        brand: { id: 'brand-1', name: 'Samsung', slug: 'samsung' },
        image: { url: 'https://img.test/1.jpg' },
        attrs: [{ attributeName: 'Color', attributeValue: 'Black' }],
      });

      const doc = await service.buildDocument(offer, product);

      expect(doc.offer_id).toBe('offer-1');
      expect(doc.product_name).toBe('Test Product');
      expect(doc.category_name).toBe('Electronics');
      expect(doc.brand_name).toBe('Samsung');
      expect(doc.variant_name).toBe('Variant 1');
      expect(doc.sku).toBe('SKU-1');
      expect(doc.image_url).toBe('https://img.test/1.jpg');
      expect(doc.attributes).toEqual([
        { name: 'Color', value: 'Black' },
      ]);
      expect(doc.in_stock).toBe(true);
      expect(doc.price_amount).toBe(10000);
    });
  });
});
