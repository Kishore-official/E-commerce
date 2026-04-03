import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { VendorStatus } from '@ecommerce/shared-types';
import { ProductStatus } from '@ecommerce/shared-types';
import { OfferStatus } from '@ecommerce/shared-types';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';
import { Product } from '../src/modules/catalog/schemas/product.schema';
import { Variant } from '../src/modules/catalog/schemas/variant.schema';
import { Offer } from '../src/modules/offers/schemas/offer.schema';

describe('Audit Logs (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<any>;
  let vendorModel: Model<any>;
  let productModel: Model<any>;
  let variantModel: Model<any>;
  let offerModel: Model<any>;

  let adminToken: string;
  let adminUserId: string;
  let vendorToken: string;
  let vendorId: string;
  let vendorUserId: string;
  let productId: string;
  let variantId: string;
  let offerId: string;

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
    offerModel = moduleFixture.get(getModelToken(Offer.name));

    // ── Setup admin ──
    const adminReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `audit-admin-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Audit',
        lastName: 'Admin',
      })
      .expect(201);

    adminUserId = adminReg.body.user.id;
    await userModel.findOneAndUpdate({ id: adminUserId }, { $set: { role: 'admin' } });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `audit-admin-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // ── Setup vendor ──
    const vendorReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `audit-vendor-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Audit',
        lastName: 'Vendor',
      })
      .expect(201);

    vendorUserId = vendorReg.body.user.id;
    vendorId = uuidv4();
    await userModel.findOneAndUpdate({ id: vendorUserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendorId,
      userId: vendorUserId,
      businessName: `AuditShop-${ts}`,
      slug: `auditshop-${ts}`,
      businessEmail: `audit-vendor-${ts}@shop.com`,
      countryCode: 'IN',
      status: 'pending',
      commissionRate: 10.0,
    });

    const vendorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `audit-vendor-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    vendorToken = vendorLogin.body.accessToken;

    // ── Setup product ──
    productId = uuidv4();
    await productModel.create({
      id: productId,
      vendorId,
      name: `Audit Product ${ts}`,
      slug: `audit-product-${ts}`,
      status: 'pending_review',
    });

    variantId = uuidv4();
    await variantModel.create({
      id: variantId,
      productId,
      sku: `SKU-${ts}`,
      name: `Variant ${ts}`,
      isActive: true,
      sortOrder: 0,
    });

    // ── Setup offer ──
    offerId = uuidv4();
    await offerModel.create({
      id: offerId,
      productId,
      variantId,
      vendorId,
      offerType: 'marketplace',
      status: 'pending_review',
      countryCode: 'IN',
      priceAmount: 100000,
      priceCurrency: 'INR',
      stockQuantity: 10,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('should return empty list initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.totalItems).toBe(0);
    });

    it('should log vendor approval', async () => {
      // Approve vendor
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/identity/vendors/${vendorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Wait a bit for async event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      const approvalLog = res.body.data.find((log: any) => log.action === 'vendor.approved');
      expect(approvalLog).toBeDefined();
      expect(approvalLog.entityType).toBe('Vendor');
      expect(approvalLog.entityId).toBe(vendorId);
      expect(approvalLog.userId).toBe(adminUserId);
      expect(approvalLog.changes.status.old).toBe('pending');
      expect(approvalLog.changes.status.new).toBe('approved');
    });

    it('should log product approval', async () => {
      // Approve product
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Wait a bit for async event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs?entityType=Product')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const productLog = res.body.data.find((log: any) => log.action === 'product.approved');
      expect(productLog).toBeDefined();
      expect(productLog.entityType).toBe('Product');
      expect(productLog.entityId).toBe(productId);
    });

    it('should log offer approval', async () => {
      // Approve offer
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/offers/${offerId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Wait a bit for async event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs?entityType=Offer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const offerLog = res.body.data.find((log: any) => log.action === 'offer.approved');
      expect(offerLog).toBeDefined();
      expect(offerLog.entityType).toBe('Offer');
      expect(offerLog.entityId).toBe(offerId);
    });

    it('should filter by action', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs?action=vendor.approved')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((log: any) => log.action === 'vendor.approved')).toBe(true);
    });

    it('should filter by userId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/audit-logs?userId=${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((log: any) => log.userId === adminUserId)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/audit-logs/:id', () => {
    it('should return single audit log', async () => {
      // Get first log
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (listRes.body.data.length > 0) {
        const logId = listRes.body.data[0].id;
        const res = await request(app.getHttpServer())
          .get(`/api/v1/admin/audit-logs/${logId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.id).toBe(logId);
        expect(res.body.action).toBeDefined();
        expect(res.body.entityType).toBeDefined();
      }
    });
  });

  describe('GET /api/v1/admin/audit-logs/approval-queue/summary', () => {
    it('should return approval queue summary', async () => {
      // Create pending items
      const pendingVendorId = uuidv4();
      const pendingVendorUserId = uuidv4();
      await userModel.create({
        id: pendingVendorUserId,
        email: `pending-${ts}@test.com`,
        passwordHash: 'hash',
        firstName: 'Pending',
        lastName: 'Vendor',
        role: 'vendor',
        isActive: true,
      });
      await vendorModel.create({
        id: pendingVendorId,
        userId: pendingVendorUserId,
        businessName: `Pending-${ts}`,
        slug: `pending-${ts}`,
        businessEmail: `pending-${ts}@shop.com`,
        countryCode: 'IN',
        status: 'pending',
        commissionRate: 10.0,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs/approval-queue/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('vendors');
      expect(res.body).toHaveProperty('products');
      expect(res.body).toHaveProperty('offers');
      expect(typeof res.body.vendors.pending).toBe('number');
      expect(typeof res.body.products.pendingReview).toBe('number');
      expect(typeof res.body.offers.pendingReview).toBe('number');
    });
  });
});
