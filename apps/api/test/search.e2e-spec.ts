import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { OpenSearchService } from '../src/modules/search/services/opensearch.service';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';

/**
 * Search e2e tests require OpenSearch and Redis running.
 * If OpenSearch is not available, the entire suite is skipped gracefully.
 *
 * To run: docker compose up -d redis opensearch && pnpm test:e2e -- --testPathPattern=search
 */
describe('Search (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let vendorModel: Model<Vendor>;
  let opensearchService: OpenSearchService;
  let opensearchAvailable: boolean;

  let vendorToken: string;
  let vendorId: string;
  let adminToken: string;

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

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    vendorModel = moduleFixture.get<Model<Vendor>>(getModelToken(Vendor.name));
    opensearchService = moduleFixture.get(OpenSearchService);
    opensearchAvailable = opensearchService.isAvailable();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Search availability check', () => {
    it('should report search status correctly', async () => {
      // If OpenSearch is available, the endpoint works.
      // If not, this test still passes — it just checks behavior.
      if (!opensearchAvailable) {
        // Without OpenSearch, GET /search/products should return 503
        await request(app.getHttpServer())
          .get('/api/v1/search/products')
          .expect(503);
        return;
      }

      // With OpenSearch, GET /search/products should return 200
      const res = await request(app.getHttpServer())
        .get('/api/v1/search/products')
        .expect(200);

      expect(res.body.hits).toBeDefined();
      expect(res.body.facets).toBeDefined();
      expect(res.body.total).toBeDefined();
    });
  });

  // The remaining tests only run when OpenSearch is available
  const describeIfOpenSearch = () =>
    opensearchAvailable ? describe : describe.skip;

  // Since we can't use dynamic describe.skip at parse time,
  // we guard each test with a conditional inside
  describe('Full search workflow (requires OpenSearch)', () => {
    beforeAll(async () => {
      if (!opensearchAvailable) return;

      // ── Setup vendor ──
      const v1Reg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `search-vendor-${ts}@test.com`,
          password: 'Password123!',
          firstName: 'Search',
          lastName: 'Vendor',
        })
        .expect(201);

      const v1UserId = v1Reg.body.user.id;
      vendorId = uuidv4();
      await userModel.findOneAndUpdate({ id: v1UserId }, { $set: { role: 'vendor' } });
      await vendorModel.create({
        id: vendorId,
        userId: v1UserId,
        businessName: `SearchShop-${ts}`,
        slug: `searchshop-${ts}`,
        businessEmail: `search-v-${ts}@shop.com`,
        countryCode: 'SA',
        status: 'approved',
        commissionRate: 10.0,
        approvedAt: new Date(),
      });

      const v1Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: `search-vendor-${ts}@test.com`,
          password: 'Password123!',
        })
        .expect(200);
      vendorToken = v1Login.body.accessToken;

      // ── Setup admin ──
      const adminReg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `search-admin-${ts}@test.com`,
          password: 'Password123!',
          firstName: 'Search',
          lastName: 'Admin',
        })
        .expect(201);
      await userModel.findOneAndUpdate({ id: adminReg.body.user.id }, { $set: { role: 'admin' } });
      const adminLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: `search-admin-${ts}@test.com`,
          password: 'Password123!',
        })
        .expect(200);
      adminToken = adminLogin.body.accessToken;

      // ── Create product + variant ──
      const prodRes = await request(app.getHttpServer())
        .post('/api/v1/vendor/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ name: `Search E2E Product ${ts}` })
        .expect(201);
      productId = prodRes.body.id;

      const varRes = await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/variants`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ sku: `SEARCH-SKU-${ts}`, name: 'Variant 1' })
        .expect(201);
      variantId = varRes.body.id;

      // Submit and approve
      await request(app.getHttpServer())
        .post(`/api/v1/vendor/products/${productId}/submit`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // ── Create and activate offer ──
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

      // Wait for BullMQ job processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Refresh index for immediate search
      await opensearchService.refreshIndex();
    });

    it('should find the activated offer via text search', async () => {
      if (!opensearchAvailable) return;

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/search/products?q=Search+E2E+Product+${ts}`,
        )
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      const found = res.body.hits.find(
        (h: any) => h.document.offer_id === offerId,
      );
      expect(found).toBeDefined();
      expect(found.document.price_amount).toBe(50000);
    });

    it('should return facets with search results', async () => {
      if (!opensearchAvailable) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/search/products')
        .expect(200);

      expect(res.body.facets).toBeDefined();
      expect(res.body.facets.countries).toBeDefined();
      expect(res.body.facets.priceRanges).toBeDefined();
    });

    it('should filter by countryCode', async () => {
      if (!opensearchAvailable) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/search/products?countryCode=SA')
        .expect(200);

      for (const hit of res.body.hits) {
        expect(hit.document.country_code).toBe('SA');
      }
    });

    it('should return autocomplete suggestions', async () => {
      if (!opensearchAvailable) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/search/suggest?q=Search+E2E`)
        .expect(200);

      expect(res.body.suggestions).toBeDefined();
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should trigger full reindex as admin', async () => {
      if (!opensearchAvailable) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/search/reindex')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalIndexed).toBeDefined();
      expect(res.body.durationMs).toBeDefined();
    });

    it('should return search status as admin', async () => {
      if (!opensearchAvailable) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/search/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.available).toBe(true);
      expect(res.body.reindexing).toBe(false);
    });
  });
});
