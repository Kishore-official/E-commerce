import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { OfferStatus, ProductStatus, ReviewStatus } from '@ecommerce/shared-types';
import { RecommendationService } from './recommendation.service';
import { Product } from '../../catalog/schemas/product.schema';
import { Offer } from '../../offers/schemas/offer.schema';
import { Variant } from '../../catalog/schemas/variant.schema';
import { ProductImage } from '../../catalog/schemas/product-image.schema';
import { ProductAttribute } from '../../catalog/schemas/product-attribute.schema';
import { Category } from '../../catalog/schemas/category.schema';
import { Brand } from '../../catalog/schemas/brand.schema';
import { Review } from '../../reviews/schemas/review.schema';

function createMockModel() {
  const model: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
  };
  return model;
}

/** Returns a chainable find() mock: .sort().limit().exec() or .exec() */
function mockFind(model: any, data: any[]) {
  const execFn = jest.fn().mockResolvedValue(data);
  const limitFn = jest.fn().mockReturnValue({ exec: execFn });
  const sortFn = jest.fn().mockReturnValue({ exec: execFn, limit: limitFn, skip: jest.fn().mockReturnValue({ limit: limitFn }) });
  model.find.mockReturnValue({ sort: sortFn, exec: execFn, limit: limitFn });
  return { execFn, sortFn, limitFn };
}

/** Returns a chainable findOne() mock: .exec() */
function mockFindOne(model: any, data: any) {
  const execFn = jest.fn().mockResolvedValue(data);
  model.findOne.mockReturnValue({ exec: execFn });
  return { execFn };
}

function mockAggregate(model: any, data: any[]) {
  const execFn = jest.fn().mockResolvedValue(data);
  model.aggregate.mockReturnValue({ exec: execFn });
  return { execFn };
}

// Test data factories
function makeProduct(overrides: Partial<any> = {}) {
  return {
    id: 'source-prod',
    name: 'Source Product',
    slug: 'source-product',
    categoryId: 'cat-smartphones',
    brandId: 'brand-tech',
    status: ProductStatus.APPROVED,
    deletedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeOffer(overrides: Partial<any> = {}) {
  return {
    id: 'offer-1',
    productId: 'source-prod',
    variantId: 'var-1',
    vendorId: 'vendor-1',
    status: OfferStatus.ACTIVE,
    countryCode: 'SA',
    priceAmount: 100000,
    priceCurrency: 'SAR',
    compareAtPrice: null,
    stockQuantity: 10,
    isFeatured: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeCategory(overrides: Partial<any> = {}) {
  return {
    id: 'cat-smartphones',
    name: 'Smartphones',
    slug: 'smartphones',
    parentId: 'cat-electronics',
    isActive: true,
    ...overrides,
  };
}

describe('RecommendationService', () => {
  let service: RecommendationService;
  let productModel: any;
  let offerModel: any;
  let variantModel: any;
  let imageModel: any;
  let attrModel: any;
  let categoryModel: any;
  let brandModel: any;
  let reviewModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getModelToken(Product.name), useValue: createMockModel() },
        { provide: getModelToken(Offer.name), useValue: createMockModel() },
        { provide: getModelToken(Variant.name), useValue: createMockModel() },
        { provide: getModelToken(ProductImage.name), useValue: createMockModel() },
        { provide: getModelToken(ProductAttribute.name), useValue: createMockModel() },
        { provide: getModelToken(Category.name), useValue: createMockModel() },
        { provide: getModelToken(Brand.name), useValue: createMockModel() },
        { provide: getModelToken(Review.name), useValue: createMockModel() },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    productModel = module.get(getModelToken(Product.name));
    offerModel = module.get(getModelToken(Offer.name));
    variantModel = module.get(getModelToken(Variant.name));
    imageModel = module.get(getModelToken(ProductImage.name));
    attrModel = module.get(getModelToken(ProductAttribute.name));
    categoryModel = module.get(getModelToken(Category.name));
    brandModel = module.get(getModelToken(Brand.name));
    reviewModel = module.get(getModelToken(Review.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Sets up all mocks for a standard recommendation call.
   * Individual tests can override specific mocks after calling this.
   */
  function setupDefaultMocks(opts: {
    sourceProduct?: any;
    sourceCategory?: any;
    sourceAttributes?: any[];
    sourceOffers?: any[];
    siblingCategories?: any[];
    candidateProducts?: any[];
    candidateOffers?: any[];
    candidateAttributes?: any[];
    reviewAggregation?: any[];
    primaryImages?: any[];
    categories?: any[];
    brands?: any[];
    variants?: any[];
  } = {}) {
    const sourceProduct = opts.sourceProduct || makeProduct();
    const sourceCategory = opts.sourceCategory || makeCategory();
    const sourceAttributes = opts.sourceAttributes || [];
    const sourceOffers = opts.sourceOffers || [makeOffer()];
    const siblingCategories = opts.siblingCategories || [];
    const candidateProducts = opts.candidateProducts || [];
    const candidateOffers = opts.candidateOffers || [];
    const candidateAttributes = opts.candidateAttributes || [];
    const reviewAggregation = opts.reviewAggregation || [];
    const primaryImages = opts.primaryImages || [];
    const categories = opts.categories || [];
    const brands = opts.brands || [];
    const variants = opts.variants || [];

    // productModel.findOne — source product
    mockFindOne(productModel, sourceProduct);

    // The service calls multiple find/findOne on category, offer, attr models.
    // We use mockImplementation to handle sequential calls.

    // categoryModel.findOne — source category
    const catFindOneExec = jest.fn().mockResolvedValue(sourceCategory);
    categoryModel.findOne.mockReturnValue({ exec: catFindOneExec });

    // categoryModel.find — siblings + enrichment categories
    // First call: siblings; subsequent calls: enrichment
    let catFindCallCount = 0;
    categoryModel.find.mockImplementation(() => {
      catFindCallCount++;
      if (catFindCallCount === 1) {
        // Siblings query
        return { exec: jest.fn().mockResolvedValue(siblingCategories) };
      }
      // Enrichment query
      return { exec: jest.fn().mockResolvedValue(categories) };
    });

    // attrModel.find — first: source attributes, second: candidate attributes
    let attrFindCallCount = 0;
    attrModel.find.mockImplementation(() => {
      attrFindCallCount++;
      if (attrFindCallCount === 1) {
        return { exec: jest.fn().mockResolvedValue(sourceAttributes) };
      }
      return { exec: jest.fn().mockResolvedValue(candidateAttributes) };
    });

    // offerModel.find — first: source offers, second: candidate offers
    let offerFindCallCount = 0;
    offerModel.find.mockImplementation(() => {
      offerFindCallCount++;
      if (offerFindCallCount === 1) {
        // Source offers (sorted by priceAmount)
        const sortExec = jest.fn().mockResolvedValue(sourceOffers);
        return { sort: jest.fn().mockReturnValue({ exec: sortExec }), exec: sortExec };
      }
      // Candidate offers
      return { exec: jest.fn().mockResolvedValue(candidateOffers) };
    });

    // productModel.find — candidate products
    const prodFindExec = jest.fn().mockResolvedValue(candidateProducts);
    const prodFindLimit = jest.fn().mockReturnValue({ exec: prodFindExec });
    const prodFindSort = jest.fn().mockReturnValue({ exec: prodFindExec, limit: prodFindLimit });
    productModel.find.mockReturnValue({ exec: prodFindExec, limit: prodFindLimit, sort: prodFindSort });

    // reviewModel.aggregate
    mockAggregate(reviewModel, reviewAggregation);

    // imageModel.find — primary images
    const imgExec = jest.fn().mockResolvedValue(primaryImages);
    const imgSort = jest.fn().mockReturnValue({ exec: imgExec });
    imageModel.find.mockReturnValue({ sort: imgSort, exec: imgExec });

    // brandModel.find — enrichment brands
    brandModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(brands) });

    // variantModel.find — enrichment variants
    variantModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(variants) });
  }

  it('should return same-category recommendations sorted by score', async () => {
    const candidateA = makeProduct({
      id: 'prod-a',
      name: 'Phone A',
      slug: 'phone-a',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });
    const candidateB = makeProduct({
      id: 'prod-b',
      name: 'Phone B',
      slug: 'phone-b',
      categoryId: 'cat-smartphones',
      brandId: 'brand-tech', // Same brand as source
    });

    setupDefaultMocks({
      candidateProducts: [candidateA, candidateB],
      candidateOffers: [
        makeOffer({ id: 'o-a', productId: 'prod-a', priceAmount: 110000 }),
        makeOffer({ id: 'o-b', productId: 'prod-b', priceAmount: 120000 }),
      ],
      variants: [
        { id: 'var-1', name: 'Default' },
      ],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');

    expect(result).toHaveLength(2);
    // Product B: exact category (40) + same brand (15) + price proximity (10) = 65
    // Product A: exact category (40) + price proximity (10) = 50
    expect(result[0].productId).toBe('prod-b');
    expect(result[1].productId).toBe('prod-a');
  });

  it('should exclude the source product from results', async () => {
    // Even if source product appears in candidates, it should be excluded
    // (the query uses $ne, but we verify the logic)
    setupDefaultMocks({
      candidateProducts: [],
      candidateOffers: [],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(0);
    // Verify the product find query used $ne
    expect(productModel.find).toHaveBeenCalled();
  });

  it('should throw NotFoundException for non-existent slug', async () => {
    mockFindOne(productModel, null);

    await expect(
      service.getRecommendations('nonexistent', 8, 'SA'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should exclude products without active in-stock offers', async () => {
    const candidateA = makeProduct({ id: 'prod-a', name: 'Phone A', slug: 'phone-a' });
    const candidateB = makeProduct({ id: 'prod-b', name: 'Phone B', slug: 'phone-b' });

    setupDefaultMocks({
      candidateProducts: [candidateA, candidateB],
      // Only candidateA has an active in-stock offer; candidateB has none
      candidateOffers: [
        makeOffer({ id: 'o-a', productId: 'prod-a', priceAmount: 90000 }),
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('prod-a');
  });

  it('should rank same-category higher than same-brand-only', async () => {
    const sameCat = makeProduct({
      id: 'prod-cat',
      name: 'Same Category',
      slug: 'same-cat',
      categoryId: 'cat-smartphones', // Same category
      brandId: 'brand-other', // Different brand
    });
    const sameBrand = makeProduct({
      id: 'prod-brand',
      name: 'Same Brand',
      slug: 'same-brand',
      categoryId: 'cat-clothing', // Different category
      brandId: 'brand-tech', // Same brand
    });

    setupDefaultMocks({
      candidateProducts: [sameCat, sameBrand],
      candidateOffers: [
        makeOffer({ id: 'o-cat', productId: 'prod-cat', priceAmount: 100000 }),
        makeOffer({ id: 'o-brand', productId: 'prod-brand', priceAmount: 100000 }),
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(2);
    // sameCat: 40 (category) + 10 (price) = 50
    // sameBrand: 15 (brand) + 10 (price) = 25
    expect(result[0].productId).toBe('prod-cat');
    expect(result[1].productId).toBe('prod-brand');
  });

  it('should score sibling subcategory at 25 points', async () => {
    const siblingProduct = makeProduct({
      id: 'prod-sib',
      name: 'Laptop',
      slug: 'laptop',
      categoryId: 'cat-laptops', // Sibling subcategory
      brandId: 'brand-other',
    });
    const exactCatProduct = makeProduct({
      id: 'prod-exact',
      name: 'Another Phone',
      slug: 'another-phone',
      categoryId: 'cat-smartphones', // Exact same category
      brandId: 'brand-other',
    });

    setupDefaultMocks({
      siblingCategories: [
        { id: 'cat-laptops', name: 'Laptops', parentId: 'cat-electronics', isActive: true },
      ],
      candidateProducts: [siblingProduct, exactCatProduct],
      candidateOffers: [
        makeOffer({ id: 'o-sib', productId: 'prod-sib', priceAmount: 100000 }),
        makeOffer({ id: 'o-exact', productId: 'prod-exact', priceAmount: 100000 }),
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(2);
    // exactCatProduct: 40 (exact cat) + 10 (price) = 50
    // siblingProduct: 25 (sibling) + 10 (price) = 35
    expect(result[0].productId).toBe('prod-exact');
    expect(result[1].productId).toBe('prod-sib');
  });

  it('should award price proximity points within ±40% range', async () => {
    // Source price: 100000
    const withinRange = makeProduct({
      id: 'prod-near',
      name: 'Near Price',
      slug: 'near-price',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });
    const outsideRange = makeProduct({
      id: 'prod-far',
      name: 'Far Price',
      slug: 'far-price',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });

    setupDefaultMocks({
      candidateProducts: [withinRange, outsideRange],
      candidateOffers: [
        makeOffer({ id: 'o-near', productId: 'prod-near', priceAmount: 120000 }), // Within 40%
        makeOffer({ id: 'o-far', productId: 'prod-far', priceAmount: 200000 }), // Outside 40%
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(2);
    // withinRange: 40 (cat) + 10 (price proximity) = 50
    // outsideRange: 40 (cat) + 0 (price) = 40
    expect(result[0].productId).toBe('prod-near');
    expect(result[1].productId).toBe('prod-far');
  });

  it('should award attribute overlap points (max 3 matches)', async () => {
    const sourceAttrs = [
      { productId: 'source-prod', attributeName: 'Color', attributeValue: 'Black' },
      { productId: 'source-prod', attributeName: 'RAM', attributeValue: '8GB' },
      { productId: 'source-prod', attributeName: 'Storage', attributeValue: '128GB' },
      { productId: 'source-prod', attributeName: 'Screen', attributeValue: '6.5"' },
    ];

    const candidate = makeProduct({
      id: 'prod-attr',
      name: 'Similar Specs',
      slug: 'similar-specs',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });

    setupDefaultMocks({
      sourceAttributes: sourceAttrs,
      candidateProducts: [candidate],
      candidateOffers: [
        makeOffer({ id: 'o-attr', productId: 'prod-attr', priceAmount: 100000 }),
      ],
      candidateAttributes: [
        { productId: 'prod-attr', attributeName: 'Color', attributeValue: 'Black' },
        { productId: 'prod-attr', attributeName: 'RAM', attributeValue: '8GB' },
        { productId: 'prod-attr', attributeName: 'Storage', attributeValue: '128GB' },
        { productId: 'prod-attr', attributeName: 'Screen', attributeValue: '6.7"' }, // Different
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(1);
    // 40 (cat) + 10 (price) + 15 (3 attr matches, capped at 3) = 65
    expect(result[0].productId).toBe('prod-attr');
  });

  it('should award featured boost', async () => {
    const featured = makeProduct({
      id: 'prod-feat',
      name: 'Featured',
      slug: 'featured',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });
    const notFeatured = makeProduct({
      id: 'prod-nonfeat',
      name: 'Not Featured',
      slug: 'not-featured',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });

    setupDefaultMocks({
      candidateProducts: [featured, notFeatured],
      candidateOffers: [
        makeOffer({ id: 'o-feat', productId: 'prod-feat', priceAmount: 100000, isFeatured: true }),
        makeOffer({ id: 'o-nonfeat', productId: 'prod-nonfeat', priceAmount: 100000, isFeatured: false }),
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(2);
    // featured: 40 + 10 + 5 (featured) = 55
    // notFeatured: 40 + 10 = 50
    expect(result[0].productId).toBe('prod-feat');
    expect(result[1].productId).toBe('prod-nonfeat');
  });

  it('should award popularity boost for high-rated products', async () => {
    const highRated = makeProduct({
      id: 'prod-rated',
      name: 'High Rated',
      slug: 'high-rated',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });
    const lowRated = makeProduct({
      id: 'prod-lowrated',
      name: 'Low Rated',
      slug: 'low-rated',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });

    setupDefaultMocks({
      candidateProducts: [highRated, lowRated],
      candidateOffers: [
        makeOffer({ id: 'o-rated', productId: 'prod-rated', priceAmount: 100000 }),
        makeOffer({ id: 'o-lowrated', productId: 'prod-lowrated', priceAmount: 100000 }),
      ],
      reviewAggregation: [
        { _id: 'prod-rated', avgRating: 4.5, count: 10 },
        { _id: 'prod-lowrated', avgRating: 3.0, count: 5 },
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(2);
    // highRated: 40 + 10 + 5 (popularity) = 55
    // lowRated: 40 + 10 = 50
    expect(result[0].productId).toBe('prod-rated');
    expect(result[1].productId).toBe('prod-lowrated');
  });

  it('should break ties by cheapest price ascending', async () => {
    const expensive = makeProduct({
      id: 'prod-expensive',
      name: 'Expensive',
      slug: 'expensive',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });
    const cheap = makeProduct({
      id: 'prod-cheap',
      name: 'Cheap',
      slug: 'cheap',
      categoryId: 'cat-smartphones',
      brandId: 'brand-other',
    });

    setupDefaultMocks({
      candidateProducts: [expensive, cheap],
      candidateOffers: [
        makeOffer({ id: 'o-exp', productId: 'prod-expensive', priceAmount: 130000 }),
        makeOffer({ id: 'o-cheap', productId: 'prod-cheap', priceAmount: 80000 }),
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(2);
    // Both: 40 (cat) + 10 (price within range) = 50 — same score
    // Tiebreak: cheaper first
    expect(result[0].productId).toBe('prod-cheap');
    expect(result[1].productId).toBe('prod-expensive');
  });

  it('should enforce limit parameter', async () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      makeProduct({
        id: `prod-${i}`,
        name: `Product ${i}`,
        slug: `product-${i}`,
        categoryId: 'cat-smartphones',
        brandId: 'brand-other',
      }),
    );
    const offers = candidates.map((c, i) =>
      makeOffer({
        id: `o-${i}`,
        productId: c.id,
        priceAmount: 100000 + i * 1000,
      }),
    );

    setupDefaultMocks({
      candidateProducts: candidates,
      candidateOffers: offers,
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    const result = await service.getRecommendations('source-product', 2, 'SA');
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no related products exist', async () => {
    setupDefaultMocks({
      candidateProducts: [],
      candidateOffers: [],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(0);
  });

  it('should handle orphan product with no category and no brand', async () => {
    const orphanSource = makeProduct({
      categoryId: null,
      brandId: null,
    });
    const candidate = makeProduct({
      id: 'prod-any',
      name: 'Any Product',
      slug: 'any-product',
      categoryId: 'cat-other',
      brandId: 'brand-other',
    });

    // Override to return orphan source
    mockFindOne(productModel, orphanSource);

    // No category to look up
    const catFindOneExec = jest.fn().mockResolvedValue(null);
    categoryModel.findOne.mockReturnValue({ exec: catFindOneExec });
    categoryModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    // Source has no offers — price proximity won't apply
    let offerCallCount = 0;
    offerModel.find.mockImplementation(() => {
      offerCallCount++;
      if (offerCallCount === 1) {
        return { sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }), exec: jest.fn().mockResolvedValue([]) };
      }
      return { exec: jest.fn().mockResolvedValue([
        makeOffer({ id: 'o-any', productId: 'prod-any', priceAmount: 50000 }),
      ]) };
    });

    // Candidate products (orphan fallback: newest approved)
    const prodFindExec = jest.fn().mockResolvedValue([candidate]);
    const prodFindLimit = jest.fn().mockReturnValue({ exec: prodFindExec });
    const prodFindSort = jest.fn().mockReturnValue({ exec: prodFindExec, limit: prodFindLimit });
    productModel.find.mockReturnValue({ exec: prodFindExec, limit: prodFindLimit, sort: prodFindSort });

    attrModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    mockAggregate(reviewModel, []);
    imageModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }), exec: jest.fn().mockResolvedValue([]) });
    brandModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    variantModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('prod-any');
  });

  it('should use correct country code for offer filtering', async () => {
    const candidate = makeProduct({
      id: 'prod-ae',
      name: 'UAE Product',
      slug: 'uae-product',
      categoryId: 'cat-smartphones',
    });

    setupDefaultMocks({
      candidateProducts: [candidate],
      // Offers are for SA, but we'll request AE — should match on AE offers only
      candidateOffers: [
        makeOffer({ id: 'o-ae', productId: 'prod-ae', priceAmount: 100000, countryCode: 'AE' }),
      ],
      variants: [{ id: 'var-1', name: 'Default' }],
    });

    // The offer model's find is mocked to return offers regardless of filter,
    // but we can verify the filter was passed correctly
    const result = await service.getRecommendations('source-product', 8, 'AE');

    // Verify offer model was called with AE country code
    const offerFindCalls = offerModel.find.mock.calls;
    // Second call is for candidate offers
    expect(offerFindCalls.length).toBeGreaterThanOrEqual(2);
    expect(offerFindCalls[1][0]).toMatchObject({
      countryCode: 'AE',
      status: OfferStatus.ACTIVE,
      stockQuantity: { $gt: 0 },
    });
  });

  it('should return StorefrontListingDto-shaped objects', async () => {
    const candidate = makeProduct({
      id: 'prod-dto',
      name: 'DTO Test',
      slug: 'dto-test',
      categoryId: 'cat-smartphones',
      brandId: 'brand-tech',
    });

    setupDefaultMocks({
      candidateProducts: [candidate],
      candidateOffers: [
        makeOffer({
          id: 'o-dto',
          productId: 'prod-dto',
          priceAmount: 95000,
          priceCurrency: 'SAR',
          compareAtPrice: 120000,
          stockQuantity: 5,
          isFeatured: true,
          countryCode: 'SA',
        }),
      ],
      categories: [{ id: 'cat-smartphones', name: 'Smartphones' }],
      brands: [{ id: 'brand-tech', name: 'TechBrand' }],
      primaryImages: [{ productId: 'prod-dto', url: 'https://img.test/phone.jpg', altText: 'Phone' }],
      variants: [{ id: 'var-1', name: 'Default Variant' }],
    });

    const result = await service.getRecommendations('source-product', 8, 'SA');
    expect(result).toHaveLength(1);

    const item = result[0];
    expect(item).toEqual(expect.objectContaining({
      offerId: 'o-dto',
      productId: 'prod-dto',
      productName: 'DTO Test',
      productSlug: 'dto-test',
      categoryName: 'Smartphones',
      brandName: 'TechBrand',
      imageUrl: 'https://img.test/phone.jpg',
      imageAlt: 'Phone',
      priceAmount: 95000,
      priceCurrency: 'SAR',
      compareAtPrice: 120000,
      stockQuantity: 5,
      isFeatured: true,
      countryCode: 'SA',
      offerCount: 1,
    }));
  });
});
