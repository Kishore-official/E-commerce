import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/identity/schemas/user.schema';

describe('Foundation Flow (e2e) - Full Happy Path', () => {
  let app: INestApplication;
  let userModel: Model<any>;

  const ts = Date.now();
  let customerToken: string;
  let customerUserId: string;
  let adminToken: string;
  let vendorId: string;
  let productId: string;
  let variantId: string;
  let offerId: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete full foundation flow: customer -> vendor -> product -> offer -> public listing', async () => {
    // Step 1: Register customer
    const customerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `foundation-customer-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Foundation',
        lastName: 'Customer',
      })
      .expect(201);

    expect(customerRes.body.user.role).toBe('customer');
    customerToken = customerRes.body.accessToken;
    customerUserId = customerRes.body.user.id;

    // Step 2: Register as vendor
    const vendorRes = await request(app.getHttpServer())
      .post('/api/v1/vendors/register')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        businessName: `Foundation Business ${ts}`,
        businessEmail: `foundation-business-${ts}@test.com`,
        phone: '+966501234567',
        description: 'A test business for foundation flow',
      })
      .expect(201);

    expect(vendorRes.body.status).toBe('pending');
    vendorId = vendorRes.body.id;

    // Step 3: Register admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `foundation-admin-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Foundation',
        lastName: 'Admin',
      })
      .expect(201);

    await userModel.findOneAndUpdate(
      { id: adminRes.body.user.id },
      { $set: { role: 'admin' } },
    );

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `foundation-admin-${ts}@test.com`,
        password: 'Password123!',
      })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // Step 4: Admin approves vendor
    const approveVendorRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/vendors/${vendorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(approveVendorRes.body.status).toBe('approved');

    // Step 5: Re-login customer to get vendor role
    const vendorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `foundation-customer-${ts}@test.com`,
        password: 'Password123!',
      })
      .expect(200);

    expect(vendorLogin.body.user.role).toBe('vendor');
    expect(vendorLogin.body.user.vendorId).toBe(vendorId);
    customerToken = vendorLogin.body.accessToken;

    // Step 6: Vendor creates product
    const productRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: `Foundation Product ${ts}`,
        description: 'A test product for foundation flow',
        shortDescription: 'Test product',
      })
      .expect(201);

    expect(productRes.body.status).toBe('draft');
    productId = productRes.body.id;

    // Step 7: Vendor creates variant
    const variantRes = await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/variants`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        sku: `FOUNDATION-SKU-${ts}`,
        name: 'Foundation Variant',
      })
      .expect(201);

    variantId = variantRes.body.id;

    // Step 8: Vendor submits product for review
    const submitProductRes = await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/submit`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(submitProductRes.body.status).toBe('pending_review');

    // Step 9: Admin approves product
    const approveProductRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(approveProductRes.body.status).toBe('approved');

    // Step 10: Vendor creates offer
    const offerRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/offers')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId,
        variantId,
        offerType: 'marketplace',
        priceAmount: 100000,
        stockQuantity: 25,
      })
      .expect(201);

    expect(offerRes.body.status).toBe('draft');
    offerId = offerRes.body.id;

    // Step 11: Vendor submits offer for review
    const submitOfferRes = await request(app.getHttpServer())
      .post(`/api/v1/vendor/offers/${offerId}/submit`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(submitOfferRes.body.status).toBe('pending_review');

    // Step 12: Admin approves offer
    const approveOfferRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/offers/${offerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(approveOfferRes.body.status).toBe('active');

    // Step 13: Public endpoint returns the active offer
    const publicOffersRes = await request(app.getHttpServer())
      .get('/api/v1/offers')
      .expect(200);

    expect(publicOffersRes.body.data).toBeDefined();
    expect(Array.isArray(publicOffersRes.body.data)).toBe(true);
    const foundOffer = publicOffersRes.body.data.find(
      (o: any) => o.id === offerId,
    );
    expect(foundOffer).toBeDefined();
    expect(foundOffer.status).toBe('active');
    expect(foundOffer.priceAmount).toBe(100000);

    // Step 14: Public endpoint returns offer by ID
    const publicOfferRes = await request(app.getHttpServer())
      .get(`/api/v1/offers/${offerId}`)
      .expect(200);

    expect(publicOfferRes.body.id).toBe(offerId);
    expect(publicOfferRes.body.status).toBe('active');
  });
});
