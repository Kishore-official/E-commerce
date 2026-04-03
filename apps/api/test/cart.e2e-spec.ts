import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';
import { Product } from '../src/modules/catalog/schemas/product.schema';
import { Variant } from '../src/modules/catalog/schemas/variant.schema';
import { Category } from '../src/modules/catalog/schemas/category.schema';
import { Brand } from '../src/modules/catalog/schemas/brand.schema';
import { Offer } from '../src/modules/offers/schemas/offer.schema';

describe('Cart (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let vendorModel: Model<Vendor>;
  let productModel: Model<Product>;
  let variantModel: Model<Variant>;
  let categoryModel: Model<Category>;
  let brandModel: Model<Brand>;
  let offerModel: Model<Offer>;

  let customerToken: string;
  let customerId: string;
  let vendorToken: string;
  let vendorId: string;
  let productId: string;
  let variantId: string;
  let activeOfferId: string;
  let pausedOfferId: string;
  let affiliateOfferId: string;
  let outOfStockOfferId: string;

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

    userModel = moduleFixture.get(getModelToken(User.name));
    vendorModel = moduleFixture.get(getModelToken(Vendor.name));
    productModel = moduleFixture.get(getModelToken(Product.name));
    variantModel = moduleFixture.get(getModelToken(Variant.name));
    categoryModel = moduleFixture.get(getModelToken(Category.name));
    brandModel = moduleFixture.get(getModelToken(Brand.name));
    offerModel = moduleFixture.get(getModelToken(Offer.name));

    // ── Setup customer ──
    const customerReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `cart-customer-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Cart',
        lastName: 'Customer',
      })
      .expect(201);

    customerId = customerReg.body.user.id;

    const customerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `cart-customer-${ts}@test.com`,
        password: 'Password123!',
      })
      .expect(200);
    customerToken = customerLogin.body.accessToken;

    // ── Setup vendor ──
    const vendorReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `cart-vendor-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Cart',
        lastName: 'Vendor',
      })
      .expect(201);

    const vendorUserId = vendorReg.body.user.id;
    vendorId = uuidv4();
    await userModel.findOneAndUpdate({ id: vendorUserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendorId,
      userId: vendorUserId,
      businessName: `CartShop-${ts}`,
      slug: `cartshop-${ts}`,
      businessEmail: `cart-vendor-${ts}@shop.com`,
      countryCode: 'IN',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    const vendorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `cart-vendor-${ts}@test.com`,
        password: 'Password123!',
      })
      .expect(200);
    vendorToken = vendorLogin.body.accessToken;

    // ── Setup category and brand ──
    const categoryId = uuidv4();
    await categoryModel.create({
      id: categoryId,
      name: 'Test Category',
      slug: `test-category-${ts}`,
      isActive: true,
      sortOrder: 0,
    });

    const brandId = uuidv4();
    await brandModel.create({
      id: brandId,
      name: 'Test Brand',
      slug: `test-brand-${ts}`,
      isActive: true,
    });

    // ── Setup product ──
    productId = uuidv4();
    await productModel.create({
      id: productId,
      vendorId,
      categoryId,
      brandId,
      name: `Test Product ${ts}`,
      slug: `test-product-${ts}`,
      status: 'approved',
    });

    // ── Setup variants ──
    variantId = uuidv4();
    await variantModel.create({
      id: variantId,
      productId,
      sku: `SKU-${ts}`,
      name: 'Test Variant',
      isActive: true,
      sortOrder: 0,
    });

    const variantId2 = uuidv4();
    await variantModel.create({
      id: variantId2,
      productId,
      sku: `SKU-${ts}-2`,
      name: 'Test Variant 2',
      isActive: true,
      sortOrder: 0,
    });

    const variantId3 = uuidv4();
    await variantModel.create({
      id: variantId3,
      productId,
      sku: `SKU-${ts}-3`,
      name: 'Test Variant 3',
      isActive: true,
      sortOrder: 0,
    });

    const variantId4 = uuidv4();
    await variantModel.create({
      id: variantId4,
      productId,
      sku: `SKU-${ts}-4`,
      name: 'Test Variant 4',
      isActive: true,
      sortOrder: 0,
    });

    // ── Setup offers ──
    activeOfferId = uuidv4();
    await offerModel.create({
      id: activeOfferId,
      productId,
      variantId,
      vendorId,
      offerType: 'marketplace',
      status: 'active',
      countryCode: 'IN',
      priceAmount: 50000,
      priceCurrency: 'INR',
      stockQuantity: 100,
      stockReserved: 0,
      fulfillmentType: 'vendor',
    });

    pausedOfferId = uuidv4();
    await offerModel.create({
      id: pausedOfferId,
      productId,
      variantId: variantId2,
      vendorId,
      offerType: 'marketplace',
      status: 'paused',
      countryCode: 'IN',
      priceAmount: 50000,
      priceCurrency: 'INR',
      stockQuantity: 100,
      stockReserved: 0,
      fulfillmentType: 'vendor',
    });

    affiliateOfferId = uuidv4();
    await offerModel.create({
      id: affiliateOfferId,
      productId,
      variantId: variantId3,
      vendorId,
      offerType: 'affiliate',
      status: 'active',
      countryCode: 'IN',
      priceAmount: 50000,
      priceCurrency: 'INR',
      stockQuantity: 0,
      stockReserved: 0,
      fulfillmentType: 'vendor',
    });

    outOfStockOfferId = uuidv4();
    await offerModel.create({
      id: outOfStockOfferId,
      productId,
      variantId: variantId4,
      vendorId,
      offerType: 'marketplace',
      status: 'active',
      countryCode: 'IN',
      priceAmount: 50000,
      priceCurrency: 'INR',
      stockQuantity: 5,
      stockReserved: 5,
      fulfillmentType: 'vendor',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Guest Cart', () => {
    const sessionId = `session-${ts}`;

    it('should get empty cart for guest', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('x-session-id', sessionId)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toEqual([]);
        });
    });

    it('should add item to guest cart', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('x-session-id', sessionId)
        .send({ offerId: activeOfferId, quantity: 2 })
        .expect(201)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].offerId).toBe(activeOfferId);
          expect(res.body.items[0].quantity).toBe(2);
          expect(res.body.items[0].priceSnapshot).toBe(50000);
        });
    });

    it('should reject paused offer', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('x-session-id', sessionId)
        .send({ offerId: pausedOfferId })
        .expect(400);
    });

    it('should reject affiliate offer', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('x-session-id', sessionId)
        .send({ offerId: affiliateOfferId })
        .expect(400);
    });

    it('should reject out of stock offer', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('x-session-id', sessionId)
        .send({ offerId: outOfStockOfferId, quantity: 1 })
        .expect(400);
    });

    it('should update item quantity in guest cart', async () => {
      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('x-session-id', sessionId)
        .expect(200);

      const itemId = cartRes.body.items[0].id;

      return request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${itemId}`)
        .set('x-session-id', sessionId)
        .send({ quantity: 5 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items[0].quantity).toBe(5);
        });
    });

    it('should remove item from guest cart', async () => {
      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('x-session-id', sessionId)
        .expect(200);

      const itemId = cartRes.body.items[0].id;

      await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${itemId}`)
        .set('x-session-id', sessionId)
        .expect(204);

      return request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('x-session-id', sessionId)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(0);
        });
    });

    it('should clear guest cart', async () => {
      // Add item first
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('x-session-id', sessionId)
        .send({ offerId: activeOfferId, quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('x-session-id', sessionId)
        .expect(204);

      return request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('x-session-id', sessionId)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(0);
        });
    });
  });

  describe('Authenticated Cart', () => {
    it('should get empty cart for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toEqual([]);
        });
    });

    it('should add item to authenticated cart', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId: activeOfferId, quantity: 3 })
        .expect(201)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].quantity).toBe(3);
        });
    });

    it('should increment quantity when adding same offer', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId: activeOfferId, quantity: 2 })
        .expect(201);

      const cartRes = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Should have incremented from 3 to 5
      expect(cartRes.body.items[0].quantity).toBe(5);
    });
  });

  describe('Cart Merge', () => {
    const guestSessionId = `merge-session-${ts}`;

    it('should merge guest cart into authenticated cart', async () => {
      // Add item to guest cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('x-session-id', guestSessionId)
        .send({ offerId: activeOfferId, quantity: 2 })
        .expect(201);

      // Clear authenticated cart first
      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(204);

      // Merge guest cart
      return request(app.getHttpServer())
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ sessionId: guestSessionId })
        .expect(201)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].quantity).toBe(2);
        });
    });

    it('should require authentication for merge', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/merge')
        .send({ sessionId: guestSessionId })
        .expect(401);
    });
  });

  describe('Validation', () => {
    it('should reject invalid offer ID', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId: uuidv4() })
        .expect(404);
    });

    it('should reject negative quantity', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId: activeOfferId, quantity: -1 })
        .expect(400);
    });

    it('should reject zero quantity', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId: activeOfferId, quantity: 0 })
        .expect(400);
    });

    it('should reject invalid UUID format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId: 'invalid-uuid' })
        .expect(400);
    });
  });
});
