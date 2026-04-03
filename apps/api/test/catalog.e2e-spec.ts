import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';

describe('Catalog (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let vendorModel: Model<Vendor>;

  // Vendor 1 context
  let vendor1Token: string;
  let vendor1Id: string;
  let productId: string;
  let variantId: string;
  let imageId: string;
  let productSlug: string;

  // Vendor 2 context
  let vendor2Token: string;

  // Admin context
  let adminToken: string;

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

    // Register vendor1 user
    const v1Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `vendor1-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Vendor',
        lastName: 'One',
      })
      .expect(201);

    const v1UserId = v1Res.body.user.id;

    // Update role to vendor and create vendor record
    vendor1Id = uuidv4();
    await userModel.findOneAndUpdate({ id: v1UserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendor1Id,
      userId: v1UserId,
      businessName: `TestShop-${ts}`,
      slug: `testshop-${ts}`,
      businessEmail: `vendor1-${ts}@shop.com`,
      countryCode: 'IN',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    // Re-login to get token with vendorId
    const v1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `vendor1-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    vendor1Token = v1Login.body.accessToken;

    // Register vendor2 user
    const v2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `vendor2-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Vendor',
        lastName: 'Two',
      })
      .expect(201);

    const v2UserId = v2Res.body.user.id;
    const vendor2Id = uuidv4();
    await userModel.findOneAndUpdate({ id: v2UserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendor2Id,
      userId: v2UserId,
      businessName: `OtherShop-${ts}`,
      slug: `othershop-${ts}`,
      businessEmail: `vendor2-${ts}@shop.com`,
      countryCode: 'IN',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    const v2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `vendor2-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    vendor2Token = v2Login.body.accessToken;

    // Register admin user
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `admin-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
      })
      .expect(201);

    await userModel.findOneAndUpdate({ id: adminRes.body.user.id }, { $set: { role: 'admin' } });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `admin-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Vendor Product CRUD ──

  describe('POST /api/v1/vendor/products', () => {
    it('should create a product in DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          name: `E2E Test Product ${ts}`,
          description: 'A test product for e2e',
        })
        .expect(201);

      expect(res.body.status).toBe('draft');
      expect(res.body.vendorId).toBe(vendor1Id);
      expect(res.body.slug).toContain('e2e-test-product');
      productId = res.body.id;
      productSlug = res.body.slug;
    });

    it('should reject request with missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ description: 'No name' })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v1/vendor/products', () => {
    it('should list own products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('GET /api/v1/vendor/products/:id', () => {
    it('should get own product detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/vendor/products/${productId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
    });
  });

  describe('PATCH /api/v1/vendor/products/:id', () => {
    it('should update own product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/products/${productId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ shortDescription: 'Updated short desc' })
        .expect(200);

      expect(res.body.shortDescription).toBe('Updated short desc');
    });
  });

  // ── Variants ──

  describe('POST /api/v1/vendor/products/:id/variants', () => {
    it('should create a variant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/variants`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          sku: `E2E-SKU-${ts}`,
          name: '128GB Black',
        })
        .expect(201);

      expect(res.body.sku).toBe(`E2E-SKU-${ts}`);
      expect(res.body.productId).toBe(productId);
      variantId = res.body.id;
    });

    it('should reject duplicate SKU', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/variants`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          sku: `E2E-SKU-${ts}`,
          name: 'Duplicate SKU',
        })
        .expect(409);
    });
  });

  // ── Images ──

  describe('POST /api/v1/vendor/products/:id/images', () => {
    it('should add an image', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/images`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          url: 'https://cdn.example.com/img1.jpg',
          altText: 'Test image',
          isPrimary: true,
        })
        .expect(201);

      expect(res.body.url).toBe('https://cdn.example.com/img1.jpg');
      expect(res.body.isPrimary).toBe(true);
      imageId = res.body.id;
    });
  });

  // ── Submit for review ──

  describe('POST /api/v1/vendor/products/:id/submit', () => {
    it('should submit product for review', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/submit`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(200);

      expect(res.body.status).toBe('pending_review');
    });

    it('should reject double submit', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/submit`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(400);
    });
  });

  // ── Admin approval ──

  describe('GET /api/v1/admin/catalog/products', () => {
    it('should list all products as admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/catalog/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject access for vendor role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/catalog/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/admin/catalog/products/:id/approve', () => {
    it('should approve a pending product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('approved');
    });

    it('should reject re-approve', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── Cannot edit approved product ──

  describe('PATCH /api/v1/vendor/products/:id (approved)', () => {
    it('should reject edits to approved product', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/products/${productId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ name: 'Trying to change approved product' })
        .expect(400);
    });
  });

  // ── Public endpoints ──

  describe('GET /api/v1/products/:slug', () => {
    it('should return approved product by slug', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productSlug}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
      expect(res.body.status).toBe('approved');
    });

    it('should return 404 for non-existent slug', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/nonexistent-slug-xyz')
        .expect(404);
    });
  });

  describe('GET /api/v1/products/:id/variants', () => {
    it('should list active variants for approved product', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}/variants`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Categories & Brands (admin) ──

  describe('Admin categories and brands', () => {
    let categoryId: string;

    it('POST /api/v1/admin/categories should create a category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Category ${ts}` })
        .expect(201);

      expect(res.body.slug).toContain('e2e-category');
      categoryId = res.body.id;
    });

    it('PATCH /api/v1/admin/categories/:id should update', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(res.body.description).toBe('Updated description');
    });

    it('POST /api/v1/admin/brands should create a brand', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Brand ${ts}` })
        .expect(201);

      expect(res.body.slug).toContain('e2e-brand');
    });
  });

  describe('Public categories and brands', () => {
    it('GET /api/v1/categories should list active categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/brands should list active brands', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/brands')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Vendor isolation ──

  describe('Vendor isolation', () => {
    it('vendor2 should not see vendor1 product', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/vendor/products/${productId}`)
        .set('Authorization', `Bearer ${vendor2Token}`)
        .expect(404);
    });
  });

  // ── Image deletion ──

  describe('DELETE /api/v1/vendor/products/:id/images/:imageId', () => {
    it('should delete an image (product must be approved, but delete is allowed)', async () => {
      // Create a new draft product to test image deletion
      const prodRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ name: `Img Delete Test ${ts}` })
        .expect(201);

      const imgRes = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${prodRes.body.id}/images`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ url: 'https://cdn.example.com/delete-me.jpg' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/vendor/products/${prodRes.body.id}/images/${imgRes.body.id}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(204);
    });
  });

  // ── Rejection with reason ──

  describe('PATCH /api/v1/admin/catalog/products/:id/reject', () => {
    it('should reject product with reason', async () => {
      // Create and submit a product for rejection
      const prodRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ name: `Reject Test ${ts}` })
        .expect(201);

      const rejectProdId = prodRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${rejectProdId}/variants`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ sku: `REJECT-SKU-${ts}`, name: 'Test Variant' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${rejectProdId}/submit`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(200);

      const rejectRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${rejectProdId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Product images do not meet quality standards' })
        .expect(200);

      expect(rejectRes.body.status).toBe('rejected');
      expect(rejectRes.body.rejectionReason).toBe('Product images do not meet quality standards');
    });
  });

  // ── Archive ──

  describe('PATCH /api/v1/vendor/products/:id/archive', () => {
    it('should archive an approved product', async () => {
      const archiveRes = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/products/${productId}/archive`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(200);

      expect(archiveRes.body.status).toBe('archived');
    });

    it('should reject archive from DRAFT status', async () => {
      const draftProdRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ name: `Draft Archive Test ${ts}` })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/products/${draftProdRes.body.id}/archive`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(400);
    });
  });

  // ── Edit policy for approved products ──

  describe('PATCH /api/v1/vendor/products/:id (approved product)', () => {
    it('should allow minor field edits on approved product', async () => {
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/products/${productId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          description: 'Updated description',
          metaTitle: 'Updated meta title',
        })
        .expect(200);

      expect(updateRes.body.description).toBe('Updated description');
      expect(updateRes.body.metaTitle).toBe('Updated meta title');
    });

    it('should reject major field edits on approved product', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/products/${productId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ name: 'New Name' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/products/${productId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ categoryId: 'new-category-id' })
        .expect(400);
    });
  });

  // ── Variant delete ──

  describe('DELETE /api/v1/vendor/variants/:id', () => {
    it('should delete variant from DRAFT product', async () => {
      const draftProdRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ name: `Variant Delete Test ${ts}` })
        .expect(201);

      const varRes = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${draftProdRes.body.id}/variants`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ sku: `DELETE-SKU-${ts}`, name: 'To Delete' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/vendor/variants/${varRes.body.id}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(204);
    });

    it('should reject deletion from APPROVED product', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/vendor/variants/${variantId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(400);
    });
  });

  // ── Attributes CRUD ──

  describe('POST /api/v1/vendor/products/:id/attributes', () => {
    it('should add an attribute to a product', async () => {
      const attrRes = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/attributes`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          attributeName: 'Color',
          attributeValue: 'Black',
        })
        .expect(201);

      expect(attrRes.body.attributeName).toBe('Color');
      expect(attrRes.body.attributeValue).toBe('Black');
    });
  });

  describe('PATCH /api/v1/vendor/attributes/:id', () => {
    it('should update an attribute', async () => {
      const attrRes = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/attributes`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          attributeName: 'Material',
          attributeValue: 'Plastic',
        })
        .expect(201);

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/attributes/${attrRes.body.id}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ attributeValue: 'Metal' })
        .expect(200);

      expect(updateRes.body.attributeValue).toBe('Metal');
    });
  });

  describe('DELETE /api/v1/vendor/attributes/:id', () => {
    it('should delete an attribute', async () => {
      const attrRes = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/attributes`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          attributeName: 'Warranty',
          attributeValue: '1 Year',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/vendor/attributes/${attrRes.body.id}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .expect(204);
    });
  });

  // ── Admin get product detail ──

  describe('GET /api/v1/admin/catalog/products/:id', () => {
    it('should get product detail as admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/catalog/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
      expect(res.body.variants).toBeDefined();
      expect(res.body.images).toBeDefined();
      expect(res.body.attributes).toBeDefined();
    });
  });

  // ── Variant update on approved product ──

  describe('PATCH /api/v1/vendor/variants/:id (approved product)', () => {
    it('should allow minor field edits on variant of approved product', async () => {
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/variants/${variantId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({
          isActive: false,
          barcode: '1234567890',
        })
        .expect(200);

      expect(updateRes.body.isActive).toBe(false);
      expect(updateRes.body.barcode).toBe('1234567890');
    });

    it('should reject major field edits on variant of approved product', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/vendor/variants/${variantId}`)
        .set('Authorization', `Bearer ${vendor1Token}`)
        .send({ name: 'New Variant Name' })
        .expect(400);
    });
  });
});
