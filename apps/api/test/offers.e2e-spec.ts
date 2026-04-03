import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';

describe('Offers (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let vendorModel: Model<Vendor>;

  let vendorToken: string;
  let vendorId: string;
  let vendor2Token: string;
  let adminToken: string;

  let productId: string;
  let variantId: string;
  let variantId2: string;
  let marketplaceOfferId: string;
  let affiliateOfferId: string;

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

    // ── Setup vendor1 ──
    const v1Reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `offer-vendor1-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Offer',
        lastName: 'Vendor',
      })
      .expect(201);

    const v1UserId = v1Reg.body.user.id;
    vendorId = uuidv4();
    await userModel.findOneAndUpdate({ id: v1UserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendorId,
      userId: v1UserId,
      businessName: `OfferShop-${ts}`,
      slug: `offershop-${ts}`,
      businessEmail: `offer-v1-${ts}@shop.com`,
      countryCode: 'IN',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    const v1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `offer-vendor1-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    vendorToken = v1Login.body.accessToken;

    // ── Setup vendor2 ──
    const v2Reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `offer-vendor2-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'Vendor',
      })
      .expect(201);

    const v2UserId = v2Reg.body.user.id;
    const vendor2Id = uuidv4();
    await userModel.findOneAndUpdate({ id: v2UserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendor2Id,
      userId: v2UserId,
      businessName: `OtherOffer-${ts}`,
      slug: `otheroffer-${ts}`,
      businessEmail: `offer-v2-${ts}@shop.com`,
      countryCode: 'IN',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    const v2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `offer-vendor2-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    vendor2Token = v2Login.body.accessToken;

    // ── Setup admin ──
    const adminReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `offer-admin-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Offer',
        lastName: 'Admin',
      })
      .expect(201);

    await userModel.findOneAndUpdate({ id: adminReg.body.user.id }, { $set: { role: 'admin' } });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `offer-admin-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // ── Create approved product with 2 variants ──
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/products')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ name: `Offer E2E Product ${ts}` })
      .expect(201);
    productId = prodRes.body.id;

    const var1Res = await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/variants`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ sku: `OFFER-SKU1-${ts}`, name: 'Variant 1' })
      .expect(201);
    variantId = var1Res.body.id;

    const var2Res = await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/variants`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ sku: `OFFER-SKU2-${ts}`, name: 'Variant 2' })
      .expect(201);
    variantId2 = var2Res.body.id;

    // Submit and approve product
    await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/submit`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);

    await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Create offers ──

  describe('POST /api/v1/vendor/offers', () => {
    it('should create a marketplace offer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          variantId,
          offerType: 'marketplace',
          priceAmount: 100000,
          stockQuantity: 25,
        })
        .expect(201);

      expect(res.body.status).toBe('draft');
      expect(res.body.vendorId).toBe(vendorId);
      expect(res.body.priceAmount).toBe(100000);
      marketplaceOfferId = res.body.id;
    });

    it('should create an affiliate offer with URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          variantId: variantId2,
          offerType: 'affiliate',
          priceAmount: 50000,
          affiliateUrl: 'https://affiliate.example.com/product',
          affiliateCommissionPct: 5.5,
        })
        .expect(201);

      expect(res.body.offerType).toBe('affiliate');
      affiliateOfferId = res.body.id;
    });

    it('should reject duplicate variant+vendor+country', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          variantId,
          offerType: 'marketplace',
          priceAmount: 90000,
        })
        .expect(409);
    });

    it('should reject when product does not belong to vendor', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendor2Token}`)
        .send({
          productId,
          variantId,
          offerType: 'marketplace',
          priceAmount: 80000,
        })
        .expect(404);
    });
  });

  // ── Submit for Review / Admin Approval ──

  describe('POST /api/v1/vendor/offers/:id/submit', () => {
    it('should submit a draft offer for review (product is approved)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vendor/offers/${marketplaceOfferId}/submit`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.status).toBe('pending_review');
    });

    it('should reject submit from non-draft status', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/vendor/offers/${marketplaceOfferId}/submit`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/v1/admin/offers/:id/approve', () => {
    it('should approve a pending_review offer', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${marketplaceOfferId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('active');
    });

    it('should reject double approval', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${marketplaceOfferId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── Activate / Pause ──

  describe('PATCH /api/v1/vendor/offers/:id/activate', () => {
    it('should reactivate a paused offer (no re-approval needed)', async () => {
      // First pause the offer
      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/pause`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      // Then reactivate
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/activate`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.status).toBe('active');
    });
  });

  describe('PATCH /api/v1/vendor/offers/:id/pause', () => {
    it('should pause an active offer', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/pause`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.status).toBe('paused');
    });

    it('should reactivate a paused offer', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/activate`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.status).toBe('active');
    });
  });

  // ── Stock management ──

  describe('PATCH /api/v1/vendor/offers/:id/stock', () => {
    it('should update stock quantity', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/stock`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ stockQuantity: 50 })
        .expect(200);

      expect(res.body.stockQuantity).toBe(50);
      expect(res.body.status).toBe('active');
    });

    it('should auto-transition to OUT_OF_STOCK when stock hits 0', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/stock`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ stockQuantity: 0 })
        .expect(200);

      expect(res.body.stockQuantity).toBe(0);
      expect(res.body.status).toBe('out_of_stock');
    });

    it('should auto-transition back to ACTIVE when restocked', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/stock`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ stockQuantity: 10 })
        .expect(200);

      expect(res.body.stockQuantity).toBe(10);
      expect(res.body.status).toBe('active');
    });

    it('should reject stock update for affiliate offers', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${affiliateOfferId}/stock`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ stockQuantity: 10 })
        .expect(400);
    });
  });

  // ── Vendor offers list ──

  describe('GET /api/v1/vendor/offers', () => {
    it('should list own offers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
    });
  });

  // ── Update offer ──

  describe('PATCH /api/v1/vendor/offers/:id', () => {
    it('should reject update on active offer', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ priceAmount: 99000 })
        .expect(400);
    });

    it('should allow update on draft offer', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${affiliateOfferId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ priceAmount: 45000 })
        .expect(200);

      expect(res.body.priceAmount).toBe(45000);
    });
  });

  // ── Public endpoints ──

  describe('GET /api/v1/offers', () => {
    it('should list only ACTIVE offers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/offers')
        .expect(200);

      expect(res.body.data).toBeDefined();
      // All returned offers should be active
      for (const offer of res.body.data) {
        expect(offer.status).toBe('active');
      }
    });

    it('should filter by countryCode', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/offers?countryCode=SA')
        .expect(200);

      for (const offer of res.body.data) {
        expect(offer.countryCode).toBe('SA');
      }
    });
  });

  describe('GET /api/v1/offers/:id', () => {
    it('should return active offer detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/offers/${marketplaceOfferId}`)
        .expect(200);

      expect(res.body.id).toBe(marketplaceOfferId);
    });

    it('should return 404 for draft offer', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/offers/${affiliateOfferId}`)
        .expect(404);
    });
  });

  // ── Admin ──

  describe('GET /api/v1/admin/offers', () => {
    it('should list all offers as admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/offers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PATCH /api/v1/admin/offers/:id/reject', () => {
    it('should reject a pending_review offer', async () => {
      // Create a new offer and submit it
      const newOfferRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          variantId: variantId2,
          offerType: 'marketplace',
          priceAmount: 75000,
          stockQuantity: 15,
        })
        .expect(201);

      const newOfferId = newOfferRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/vendor/offers/${newOfferId}/submit`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${newOfferId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Does not meet quality standards' })
        .expect(200);

      expect(res.body.status).toBe('rejected');
      expect(res.body.rejectionReason).toBe('Does not meet quality standards');
    });

    it('should allow vendor to edit rejected offer back to draft', async () => {
      // Create and reject an offer
      const newOfferRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          variantId,
          offerType: 'marketplace',
          priceAmount: 80000,
          stockQuantity: 20,
        })
        .expect(201);

      const newOfferId = newOfferRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/vendor/offers/${newOfferId}/submit`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${newOfferId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Vendor can update rejected offer
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${newOfferId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ priceAmount: 85000 })
        .expect(200);

      expect(res.body.priceAmount).toBe(85000);
    });
  });

  describe('PATCH /api/v1/admin/offers/:id/archive', () => {
    it('should archive an offer', async () => {
      // Submit and approve the affiliate offer first
      await request(app.getHttpServer())
        .post(`/api/v1/vendor/offers/${affiliateOfferId}/submit`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${affiliateOfferId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${affiliateOfferId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('archived');
    });
  });

  // ── Vendor archive ──

  describe('PATCH /api/v1/vendor/offers/:id/archive', () => {
    it('should allow vendor to archive own offer', async () => {
      // Create a new offer
      const newOfferRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          variantId,
          offerType: 'marketplace',
          priceAmount: 90000,
          stockQuantity: 30,
        })
        .expect(201);

      const newOfferId = newOfferRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${newOfferId}/archive`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.status).toBe('archived');
    });
  });

  // ── Single offer GET endpoints ──

  describe('GET /api/v1/vendor/offers/:id', () => {
    it('should return own offer detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/vendor/offers/${marketplaceOfferId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.id).toBe(marketplaceOfferId);
      expect(res.body.vendorId).toBe(vendorId);
    });

    it('should return 404 for other vendor offer', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/vendor/offers/${marketplaceOfferId}`)
        .set('Authorization', `Bearer ${vendor2Token}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/admin/offers/:id', () => {
    it('should return offer detail for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/offers/${marketplaceOfferId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(marketplaceOfferId);
    });

    it('should return offer with rejection reason if rejected', async () => {
      // Create, submit, and reject an offer
      const newOfferRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/offers')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          variantId: variantId2,
          offerType: 'marketplace',
          priceAmount: 70000,
          stockQuantity: 12,
        })
        .expect(201);

      const newOfferId = newOfferRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/vendor/offers/${newOfferId}/submit`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${newOfferId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection reason' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/offers/${newOfferId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('rejected');
      expect(res.body.rejectionReason).toBe('Test rejection reason');
    });
  });

  // ── Vendor isolation ──

  describe('Vendor isolation', () => {
    it('vendor2 should not be able to activate vendor1 offer', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/offers/${marketplaceOfferId}/activate`)
        .set('Authorization', `Bearer ${vendor2Token}`)
        .expect(404);
    });
  });
});
