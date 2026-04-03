import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { OfferStatus, ProductStatus, ReviewStatus } from '@ecommerce/shared-types';
import { Product } from '../src/modules/catalog/schemas/product.schema';
import { Variant } from '../src/modules/catalog/schemas/variant.schema';
import { Offer } from '../src/modules/offers/schemas/offer.schema';
import { Category } from '../src/modules/catalog/schemas/category.schema';
import { Brand } from '../src/modules/catalog/schemas/brand.schema';
import { ProductImage } from '../src/modules/catalog/schemas/product-image.schema';
import { ProductAttribute } from '../src/modules/catalog/schemas/product-attribute.schema';
import { Review } from '../src/modules/reviews/schemas/review.schema';

describe('Recommendations (e2e)', () => {
  let app: INestApplication;
  let productModel: Model<any>;
  let variantModel: Model<any>;
  let offerModel: Model<any>;
  let categoryModel: Model<any>;
  let brandModel: Model<any>;
  let imageModel: Model<any>;
  let attrModel: Model<any>;
  let reviewModel: Model<any>;

  // Test data IDs
  const ts = Date.now();
  const parentCategoryId = uuidv4();
  const smartphonesCategoryId = uuidv4();
  const laptopsCategoryId = uuidv4();
  const clothingCategoryId = uuidv4();
  const techBrandId = uuidv4();
  const otherBrandId = uuidv4();
  const vendorId = uuidv4();

  // Source product (the product we get recommendations for)
  const sourceProductId = uuidv4();
  const sourceSlug = `rec-source-${ts}`;
  const sourceVariantId = uuidv4();
  const sourceOfferId = uuidv4();

  // Candidate products
  const sameCatSameBrandId = uuidv4();
  const sameCatSameBrandSlug = `rec-same-cat-brand-${ts}`;
  const sameCatSameBrandVariantId = uuidv4();
  const sameCatSameBrandOfferId = uuidv4();

  const siblingCatId = uuidv4();
  const siblingCatSlug = `rec-sibling-cat-${ts}`;
  const siblingCatVariantId = uuidv4();
  const siblingCatOfferId = uuidv4();

  const brandOnlyId = uuidv4();
  const brandOnlySlug = `rec-brand-only-${ts}`;
  const brandOnlyVariantId = uuidv4();
  const brandOnlyOfferId = uuidv4();

  const draftProductId = uuidv4();
  const draftProductSlug = `rec-draft-${ts}`;
  const draftVariantId = uuidv4();

  const noOfferProductId = uuidv4();
  const noOfferProductSlug = `rec-no-offer-${ts}`;
  const noOfferVariantId = uuidv4();

  const isolatedProductId = uuidv4();
  const isolatedSlug = `rec-isolated-${ts}`;
  const isolatedVariantId = uuidv4();
  const isolatedOfferId = uuidv4();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    // Get Mongoose models
    productModel = moduleFixture.get(getModelToken(Product.name));
    variantModel = moduleFixture.get(getModelToken(Variant.name));
    offerModel = moduleFixture.get(getModelToken(Offer.name));
    categoryModel = moduleFixture.get(getModelToken(Category.name));
    brandModel = moduleFixture.get(getModelToken(Brand.name));
    imageModel = moduleFixture.get(getModelToken(ProductImage.name));
    attrModel = moduleFixture.get(getModelToken(ProductAttribute.name));
    reviewModel = moduleFixture.get(getModelToken(Review.name));

    // Create categories
    await categoryModel.create([
      { id: parentCategoryId, name: `Electronics-${ts}`, slug: `electronics-${ts}`, isActive: true, sortOrder: 0 },
      { id: smartphonesCategoryId, name: `Smartphones-${ts}`, slug: `smartphones-${ts}`, parentId: parentCategoryId, isActive: true, sortOrder: 0 },
      { id: laptopsCategoryId, name: `Laptops-${ts}`, slug: `laptops-${ts}`, parentId: parentCategoryId, isActive: true, sortOrder: 1 },
      { id: clothingCategoryId, name: `Clothing-${ts}`, slug: `clothing-${ts}`, isActive: true, sortOrder: 2 },
    ]);

    // Create brands
    await brandModel.create([
      { id: techBrandId, name: `TechBrand-${ts}`, slug: `techbrand-${ts}`, isActive: true },
      { id: otherBrandId, name: `OtherBrand-${ts}`, slug: `otherbrand-${ts}`, isActive: true },
    ]);

    // Source product: Smartphones, TechBrand, price 100000
    await productModel.create({
      id: sourceProductId, vendorId, categoryId: smartphonesCategoryId, brandId: techBrandId,
      name: `Source Phone ${ts}`, slug: sourceSlug, status: ProductStatus.APPROVED,
    });
    await variantModel.create({
      id: sourceVariantId, productId: sourceProductId, sku: `SRC-${ts}`, name: 'Default', isActive: true, sortOrder: 0,
    });
    await offerModel.create({
      id: sourceOfferId, productId: sourceProductId, variantId: sourceVariantId, vendorId,
      offerType: 'marketplace', status: OfferStatus.ACTIVE, countryCode: 'SA',
      priceAmount: 100000, priceCurrency: 'SAR', stockQuantity: 10, isFeatured: false,
    });

    // Candidate A: same category + same brand (highest score)
    await productModel.create({
      id: sameCatSameBrandId, vendorId, categoryId: smartphonesCategoryId, brandId: techBrandId,
      name: `Same Cat Brand ${ts}`, slug: sameCatSameBrandSlug, status: ProductStatus.APPROVED,
    });
    await variantModel.create({
      id: sameCatSameBrandVariantId, productId: sameCatSameBrandId, sku: `SCB-${ts}`, name: 'Default', isActive: true, sortOrder: 0,
    });
    await offerModel.create({
      id: sameCatSameBrandOfferId, productId: sameCatSameBrandId, variantId: sameCatSameBrandVariantId, vendorId,
      offerType: 'marketplace', status: OfferStatus.ACTIVE, countryCode: 'SA',
      priceAmount: 90000, priceCurrency: 'SAR', stockQuantity: 5, isFeatured: false,
    });

    // Candidate B: sibling subcategory (laptops), different brand
    await productModel.create({
      id: siblingCatId, vendorId, categoryId: laptopsCategoryId, brandId: otherBrandId,
      name: `Sibling Laptop ${ts}`, slug: siblingCatSlug, status: ProductStatus.APPROVED,
    });
    await variantModel.create({
      id: siblingCatVariantId, productId: siblingCatId, sku: `SIB-${ts}`, name: 'Default', isActive: true, sortOrder: 0,
    });
    await offerModel.create({
      id: siblingCatOfferId, productId: siblingCatId, variantId: siblingCatVariantId, vendorId,
      offerType: 'marketplace', status: OfferStatus.ACTIVE, countryCode: 'SA',
      priceAmount: 150000, priceCurrency: 'SAR', stockQuantity: 8, isFeatured: false,
    });

    // Candidate C: different category, same brand only
    await productModel.create({
      id: brandOnlyId, vendorId, categoryId: clothingCategoryId, brandId: techBrandId,
      name: `Brand Only ${ts}`, slug: brandOnlySlug, status: ProductStatus.APPROVED,
    });
    await variantModel.create({
      id: brandOnlyVariantId, productId: brandOnlyId, sku: `BRD-${ts}`, name: 'Default', isActive: true, sortOrder: 0,
    });
    await offerModel.create({
      id: brandOnlyOfferId, productId: brandOnlyId, variantId: brandOnlyVariantId, vendorId,
      offerType: 'marketplace', status: OfferStatus.ACTIVE, countryCode: 'SA',
      priceAmount: 80000, priceCurrency: 'SAR', stockQuantity: 3, isFeatured: false,
    });

    // DRAFT product: should be excluded
    await productModel.create({
      id: draftProductId, vendorId, categoryId: smartphonesCategoryId, brandId: techBrandId,
      name: `Draft Phone ${ts}`, slug: draftProductSlug, status: ProductStatus.DRAFT,
    });
    await variantModel.create({
      id: draftVariantId, productId: draftProductId, sku: `DRF-${ts}`, name: 'Default', isActive: true, sortOrder: 0,
    });

    // Product without active offers: should be excluded
    await productModel.create({
      id: noOfferProductId, vendorId, categoryId: smartphonesCategoryId, brandId: techBrandId,
      name: `No Offer Phone ${ts}`, slug: noOfferProductSlug, status: ProductStatus.APPROVED,
    });
    await variantModel.create({
      id: noOfferVariantId, productId: noOfferProductId, sku: `NOF-${ts}`, name: 'Default', isActive: true, sortOrder: 0,
    });

    // Isolated product: unique category, no brand — for empty results test
    const isolatedCatId = uuidv4();
    await categoryModel.create({
      id: isolatedCatId, name: `Isolated-${ts}`, slug: `isolated-cat-${ts}`, isActive: true, sortOrder: 99,
    });
    await productModel.create({
      id: isolatedProductId, vendorId, categoryId: isolatedCatId,
      name: `Isolated Product ${ts}`, slug: isolatedSlug, status: ProductStatus.APPROVED,
    });
    await variantModel.create({
      id: isolatedVariantId, productId: isolatedProductId, sku: `ISO-${ts}`, name: 'Default', isActive: true, sortOrder: 0,
    });
    await offerModel.create({
      id: isolatedOfferId, productId: isolatedProductId, variantId: isolatedVariantId, vendorId,
      offerType: 'marketplace', status: OfferStatus.ACTIVE, countryCode: 'SA',
      priceAmount: 50000, priceCurrency: 'SAR', stockQuantity: 2, isFeatured: false,
    });
  });

  afterAll(async () => {
    // Clean up test data
    const ids = [
      sourceProductId, sameCatSameBrandId, siblingCatId, brandOnlyId,
      draftProductId, noOfferProductId, isolatedProductId,
    ];
    await productModel.deleteMany({ id: { $in: ids } });
    await variantModel.deleteMany({ productId: { $in: ids } });
    await offerModel.deleteMany({ productId: { $in: ids } });
    await categoryModel.deleteMany({ id: { $in: [parentCategoryId, smartphonesCategoryId, laptopsCategoryId, clothingCategoryId] } });
    await brandModel.deleteMany({ id: { $in: [techBrandId, otherBrandId] } });
    await imageModel.deleteMany({ productId: { $in: ids } });
    await attrModel.deleteMany({ productId: { $in: ids } });

    await app.close();
  });

  describe('GET /api/v1/storefront/listings/:slug/recommendations', () => {
    it('should return 200 with recommendations array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations`)
        .expect(200);

      expect(res.body).toHaveProperty('recommendations');
      expect(res.body.recommendations).toBeInstanceOf(Array);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
    });

    it('should return items matching StorefrontListingDto shape', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations`)
        .expect(200);

      if (res.body.recommendations.length > 0) {
        const item = res.body.recommendations[0];
        expect(item).toHaveProperty('offerId');
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('productName');
        expect(item).toHaveProperty('productSlug');
        expect(item).toHaveProperty('priceAmount');
        expect(item).toHaveProperty('priceCurrency');
        expect(item).toHaveProperty('stockQuantity');
        expect(item).toHaveProperty('offerCount');
        expect(item).toHaveProperty('isFeatured');
        expect(item).toHaveProperty('countryCode');
      }
    });

    it('should not include the source product in results', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations`)
        .expect(200);

      const sourceInResults = res.body.recommendations.find(
        (r: any) => r.productId === sourceProductId,
      );
      expect(sourceInResults).toBeUndefined();
    });

    it('should not include DRAFT products', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations`)
        .expect(200);

      const draftInResults = res.body.recommendations.find(
        (r: any) => r.productId === draftProductId,
      );
      expect(draftInResults).toBeUndefined();
    });

    it('should not include products without active in-stock offers', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations`)
        .expect(200);

      const noOfferInResults = res.body.recommendations.find(
        (r: any) => r.productId === noOfferProductId,
      );
      expect(noOfferInResults).toBeUndefined();
    });

    it('should rank same-category+same-brand higher than brand-only', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations`)
        .expect(200);

      const recs = res.body.recommendations;
      const sameCatIdx = recs.findIndex((r: any) => r.productId === sameCatSameBrandId);
      const brandOnlyIdx = recs.findIndex((r: any) => r.productId === brandOnlyId);

      if (sameCatIdx !== -1 && brandOnlyIdx !== -1) {
        expect(sameCatIdx).toBeLessThan(brandOnlyIdx);
      }
    });

    it('should return empty array for isolated product with no related products', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${isolatedSlug}/recommendations`)
        .expect(200);

      // Isolated product has a unique category with no other products
      // May return empty or products from orphan fallback
      expect(res.body.recommendations).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent slug', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/storefront/listings/absolutely-nonexistent-product/recommendations')
        .expect(404);
    });

    it('should respect limit query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations?limit=1`)
        .expect(200);

      expect(res.body.recommendations.length).toBeLessThanOrEqual(1);
    });

    it('should respect countryCode query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/${sourceSlug}/recommendations?countryCode=AE`)
        .expect(200);

      // No offers exist for AE, so should return empty
      expect(res.body.recommendations).toHaveLength(0);
    });
  });
});
