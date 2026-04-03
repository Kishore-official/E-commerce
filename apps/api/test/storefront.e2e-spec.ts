import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { OfferStatus, ProductStatus } from '@ecommerce/shared-types';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';
import { Product } from '../src/modules/catalog/schemas/product.schema';
import { Variant } from '../src/modules/catalog/schemas/variant.schema';
import { Category } from '../src/modules/catalog/schemas/category.schema';
import { Brand } from '../src/modules/catalog/schemas/brand.schema';
import { Offer } from '../src/modules/offers/schemas/offer.schema';

describe('Storefront (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let vendorModel: Model<Vendor>;
  let productModel: Model<Product>;
  let variantModel: Model<Variant>;
  let categoryModel: Model<Category>;
  let brandModel: Model<Brand>;
  let offerModel: Model<Offer>;

  let vendorId: string;
  let productId: string;
  let variantId: string;
  let offerId: string;
  let categoryId: string;
  let brandId: string;

  const ts = Date.now();

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

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    vendorModel = moduleFixture.get<Model<Vendor>>(getModelToken(Vendor.name));
    productModel = moduleFixture.get<Model<Product>>(getModelToken(Product.name));
    variantModel = moduleFixture.get<Model<Variant>>(getModelToken(Variant.name));
    categoryModel = moduleFixture.get<Model<Category>>(getModelToken(Category.name));
    brandModel = moduleFixture.get<Model<Brand>>(getModelToken(Brand.name));
    offerModel = moduleFixture.get<Model<Offer>>(getModelToken(Offer.name));

    // Setup vendor
    const vendorUserId = uuidv4();
    await userModel.create({
      id: vendorUserId,
      email: `storefront-vendor-${ts}@test.com`,
      passwordHash: 'hash',
      firstName: 'Storefront',
      lastName: 'Vendor',
      role: 'vendor',
      isActive: true,
    });

    vendorId = uuidv4();
    await vendorModel.create({
      id: vendorId,
      userId: vendorUserId,
      businessName: `StorefrontShop-${ts}`,
      slug: `storefrontshop-${ts}`,
      businessEmail: `storefront-${ts}@shop.com`,
      countryCode: 'SA',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    // Setup category
    categoryId = uuidv4();
    await categoryModel.create({
      id: categoryId,
      name: `Category ${ts}`,
      slug: `category-${ts}`,
      isActive: true,
      sortOrder: 0,
    });

    // Setup brand
    brandId = uuidv4();
    await brandModel.create({
      id: brandId,
      name: `Brand ${ts}`,
      slug: `brand-${ts}`,
      isActive: true,
    });

    // Setup product
    productId = uuidv4();
    await productModel.create({
      id: productId,
      vendorId,
      categoryId,
      brandId,
      name: `Storefront Product ${ts}`,
      slug: `storefront-product-${ts}`,
      description: 'Test product description',
      status: 'approved',
    });

    // Setup variant
    variantId = uuidv4();
    await variantModel.create({
      id: variantId,
      productId,
      sku: `SKU-${ts}`,
      name: `Variant ${ts}`,
      isActive: true,
      sortOrder: 0,
    });

    // Setup offer
    offerId = uuidv4();
    await offerModel.create({
      id: offerId,
      productId,
      variantId,
      vendorId,
      offerType: 'marketplace',
      status: 'active',
      countryCode: 'SA',
      priceAmount: 100000,
      priceCurrency: 'SAR',
      stockQuantity: 10,
      isFeatured: true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/storefront/listings', () => {
    it('should return paginated listings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/storefront/listings')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(0);
    });

    it('should filter by categorySlug', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings?categorySlug=category-${ts}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      // Should find our test product
      const found = res.body.data.find((item: any) => item.productId === productId);
      expect(found).toBeDefined();
    });

    it('should filter by isFeatured', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/storefront/listings?isFeatured=true')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      if (res.body.data.length > 0) {
        expect(res.body.data.every((item: any) => item.isFeatured === true)).toBe(true);
      }
    });

    it('should filter by search query', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings?search=Storefront Product ${ts}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      const found = res.body.data.find((item: any) => item.productId === productId);
      expect(found).toBeDefined();
    });

    it('should sort by price_asc', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/storefront/listings?sort=price_asc')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      if (res.body.data.length > 1) {
        for (let i = 1; i < res.body.data.length; i++) {
          expect(res.body.data[i].priceAmount).toBeGreaterThanOrEqual(res.body.data[i - 1].priceAmount);
        }
      }
    });

    it('should return listing with correct structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/storefront/listings')
        .expect(200);

      if (res.body.data.length > 0) {
        const listing = res.body.data[0];
        expect(listing).toHaveProperty('offerId');
        expect(listing).toHaveProperty('productId');
        expect(listing).toHaveProperty('productName');
        expect(listing).toHaveProperty('productSlug');
        expect(listing).toHaveProperty('priceAmount');
        expect(listing).toHaveProperty('priceCurrency');
        expect(listing).toHaveProperty('stockQuantity');
        expect(listing).toHaveProperty('offerCount');
      }
    });
  });

  describe('GET /api/v1/storefront/listings/:slug', () => {
    it('should return product detail with offers', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/storefront-product-${ts}`)
        .expect(200);

      expect(res.body.product).toBeDefined();
      expect(res.body.product.id).toBe(productId);
      expect(res.body.product.name).toContain('Storefront Product');
      expect(res.body.variants).toBeInstanceOf(Array);
      expect(res.body.variants.length).toBeGreaterThan(0);
      expect(res.body.variants[0].offers).toBeInstanceOf(Array);
      expect(res.body.variants[0].offers.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/storefront/listings/nonexistent-product')
        .expect(404);
    });

    it('should only include variants with active offers', async () => {
      // Create a variant without offers
      const variantWithoutOfferId = uuidv4();
      await variantModel.create({
        id: variantWithoutOfferId,
        productId,
        sku: `SKU-NO-OFFER-${ts}`,
        name: `Variant No Offer ${ts}`,
        isActive: true,
        sortOrder: 1,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/storefront-product-${ts}`)
        .expect(200);

      // Should not include variant without offers
      const variantWithoutOffer = res.body.variants.find((v: any) => v.id === variantWithoutOfferId);
      expect(variantWithoutOffer).toBeUndefined();
    });

    it('should sort offers by price ASC', async () => {
      // Create another offer with higher price
      const offerId2 = uuidv4();
      await offerModel.create({
        id: offerId2,
        productId,
        variantId,
        vendorId,
        offerType: 'marketplace',
        status: 'active',
        countryCode: 'SA',
        priceAmount: 150000,
        priceCurrency: 'SAR',
        stockQuantity: 5,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/storefront/listings/storefront-product-${ts}`)
        .expect(200);

      const variant = res.body.variants.find((v: any) => v.id === variantId);
      expect(variant).toBeDefined();
      if (variant && variant.offers.length > 1) {
        expect(variant.offers[0].priceAmount).toBeLessThanOrEqual(variant.offers[1].priceAmount);
      }
    });
  });
});
