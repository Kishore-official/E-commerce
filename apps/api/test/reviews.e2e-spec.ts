import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';

describe('Reviews (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let vendorModel: Model<Vendor>;

  let customerToken: string;
  let vendorToken: string;
  let vendorId: string;
  let adminToken: string;

  let productId: string;
  let variantId: string;
  let offerId: string;

  let orderId: string;
  let orderItemId: string;
  let shipmentId: string;

  let eligibilityId: string;
  let reviewId: string;

  const ts = Date.now();

  const shippingAddress = {
    name: 'Review Test Customer',
    line1: '456 Review Street',
    city: 'Riyadh',
    postalCode: '54321',
    countryCode: 'SA',
    phone: '+966509876543',
  };

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

    // ── Register customer ──
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `review-customer-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Review',
        lastName: 'Customer',
      })
      .expect(201);

    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `review-customer-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    customerToken = custLogin.body.accessToken;

    // ── Register vendor ──
    const vendorReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `review-vendor-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Review',
        lastName: 'Vendor',
      })
      .expect(201);

    const vendorUserId = vendorReg.body.user.id;
    vendorId = uuidv4();
    await userModel.findOneAndUpdate({ id: vendorUserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendorId,
      userId: vendorUserId,
      businessName: `ReviewShop-${ts}`,
      slug: `reviewshop-${ts}`,
      businessEmail: `review-v-${ts}@shop.com`,
      countryCode: 'SA',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    const vendorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `review-vendor-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    vendorToken = vendorLogin.body.accessToken;

    // ── Register admin ──
    const adminReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `review-admin-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Review',
        lastName: 'Admin',
      })
      .expect(201);

    await userModel.findOneAndUpdate({ id: adminReg.body.user.id }, { $set: { role: 'admin' } });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `review-admin-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // ── Create product + variant + offer ──
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/products')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ name: `Review E2E Product ${ts}` })
      .expect(201);
    productId = prodRes.body.id;

    const varRes = await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/variants`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ sku: `REVIEW-SKU-${ts}`, name: 'Standard' })
      .expect(201);
    variantId = varRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/submit`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);

    await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const offerRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/offers')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        productId,
        variantId,
        offerType: 'marketplace',
        priceAmount: 50000,
        stockQuantity: 10,
      })
      .expect(201);
    offerId = offerRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/vendor/offers/${offerId}/activate`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);

    // ── Complete checkout flow to get to DELIVERED ──

    // Add to cart
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId, quantity: 1 })
      .expect(201);

    // Create order
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({ shippingAddress })
      .expect(201);
    orderId = orderRes.body.id;
    orderItemId = orderRes.body.items[0].id;

    // Pay
    const payRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({ orderId })
      .expect(201);

    // Payment webhook
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/mock')
      .send({
        eventType: 'payment.succeeded',
        gatewayPaymentId: payRes.body.gatewayPaymentId,
      })
      .expect(200);

    // Vendor confirms
    await request(app.getHttpServer())
      .patch(`/api/v1/vendor/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);

    // Create shipment
    const shipRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/shipments')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        orderId,
        items: [{ orderItemId, quantity: 1 }],
      })
      .expect(201);
    shipmentId = shipRes.body.id;

    // Ship
    await request(app.getHttpServer())
      .patch(`/api/v1/vendor/shipments/${shipmentId}/ship`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        trackingNumber: `REVIEW-TRK-${ts}`,
        carrier: 'Aramex',
      })
      .expect(200);

    // Carrier webhook: in_transit (required before delivered per state machine)
    await request(app.getHttpServer())
      .post('/api/v1/logistics/webhooks/carrier')
      .send({
        trackingNumber: `REVIEW-TRK-${ts}`,
        status: 'in_transit',
        description: 'Package in transit',
        location: 'Sorting facility',
        occurredAt: '2026-01-20T10:00:00.000Z',
      })
      .expect(200);

    // Carrier webhook: delivered
    await request(app.getHttpServer())
      .post('/api/v1/logistics/webhooks/carrier')
      .send({
        trackingNumber: `REVIEW-TRK-${ts}`,
        status: 'delivered',
        description: 'Delivered to recipient',
        location: 'Riyadh',
        occurredAt: '2026-01-20T14:00:00.000Z',
      })
      .expect(200);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── Eligibility Tests ──

  describe('Review eligibility', () => {
    it('should have auto-created eligibility after delivery', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reviews/eligibilities')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].productId).toBe(productId);
      expect(res.body[0].variantId).toBe(variantId);
      expect(res.body[0].status).toBe('eligible');
      eligibilityId = res.body[0].id;
    });
  });

  // ── Review Submission ──

  describe('Review submission', () => {
    const reviewIdempotencyKey = uuidv4();

    it('should submit a review for eligible item', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', reviewIdempotencyKey)
        .send({
          reviewEligibilityId: eligibilityId,
          rating: 5,
          title: 'Excellent product!',
          body: 'Arrived quickly, great quality.',
        })
        .expect(201);

      expect(res.body.rating).toBe(5);
      expect(res.body.title).toBe('Excellent product!');
      expect(res.body.status).toBe('pending_moderation');
      expect(res.body.productId).toBe(productId);
      reviewId = res.body.id;
    });

    it('should return same review on duplicate idempotency key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', reviewIdempotencyKey)
        .send({
          reviewEligibilityId: eligibilityId,
          rating: 5,
          title: 'Excellent product!',
          body: 'Arrived quickly, great quality.',
        })
        .expect(201);

      expect(res.body.id).toBe(reviewId);
    });

    it('should reject review without valid eligibility', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          reviewEligibilityId: uuidv4(), // non-existent
          rating: 3,
        })
        .expect(404);
    });

    it('should reject duplicate review on same eligibility', async () => {
      // Eligibility is now REVIEW_SUBMITTED
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({
          reviewEligibilityId: eligibilityId,
          rating: 4,
        })
        .expect(400);
    });

    it('should list customer reviews', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reviews/my')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(reviewId);
    });
  });

  // ── Public Reviews ──

  describe('Public product reviews', () => {
    it('should return empty before moderation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}/reviews`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });

    it('should return zero summary before approval', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}/reviews/summary`)
        .expect(200);

      expect(res.body.totalReviews).toBe(0);
      expect(res.body.averageRating).toBe(0);
    });
  });

  // ── Admin Moderation ──

  describe('Admin moderation', () => {
    it('should list pending reviews', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/reviews?status=pending_moderation')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const pendingReview = res.body.data.find((r: any) => r.id === reviewId);
      expect(pendingReview).toBeDefined();
    });

    it('should get review detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(reviewId);
      expect(res.body.status).toBe('pending_moderation');
    });

    it('should approve review', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/reviews/${reviewId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(res.body.status).toBe('approved');
      expect(res.body.moderatedBy).toBeDefined();
      expect(res.body.moderatedAt).toBeDefined();
    });
  });

  // ── Public Reviews After Approval ──

  describe('Public reviews after approval', () => {
    it('should show approved review in product reviews', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}/reviews`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].rating).toBe(5);
      expect(res.body.data[0].title).toBe('Excellent product!');
    });

    it('should show rating summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}/reviews/summary`)
        .expect(200);

      expect(res.body.totalReviews).toBe(1);
      expect(res.body.averageRating).toBe(5);
    });
  });

  // ── Eligibility consumed ──

  describe('Eligibility consumed', () => {
    it('should show no more eligible items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reviews/eligibilities')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });
});
