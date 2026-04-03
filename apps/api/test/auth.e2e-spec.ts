import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/identity/schemas/user.schema';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<any>;

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

  const testUser = {
    email: `e2e-${Date.now()}@test.com`,
    password: 'Password123!',
    firstName: 'E2E',
    lastName: 'Test',
  };

  let accessToken: string;
  let refreshToken: string;

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res: any) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.body.user.role).toBe('customer');
          expect(res.body.user.firstName).toBe('E2E');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'not-an-email' })
        .expect(400);
    });

    it('should reject short password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'short@test.com', password: 'Ab1' })
        .expect(400);
    });

    it('should reject password without uppercase', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'noup@test.com', password: 'password123' })
        .expect(400);
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'partial@test.com' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.user.email).toBe(testUser.email);
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPass123' })
        .expect(401);
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'Password123!' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return profile with valid JWT', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.firstName).toBe('E2E');
          expect(res.body.role).toBe('customer');
        });
    });

    it('should reject without JWT', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject with invalid JWT', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('should update profile fields', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated', phone: '+966501234567' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.firstName).toBe('Updated');
          expect(res.body.phone).toBe('+966501234567');
          expect(res.body.lastName).toBe('Test');
        });
    });

    it('should reject unknown fields', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'super_admin' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue new tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          // New tokens should be different
          expect(res.body.refreshToken).not.toBe(refreshToken);
          // Update for subsequent tests
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject already-used (revoked) refresh token', async () => {
      // The old refresh token was revoked by the previous test
      const oldToken = 'some-already-used-token';
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldToken })
        .expect(401);
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'completely-invalid-token' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(401);
    });

    it('should revoke refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.message).toBe('Logged out successfully');
        });
    });

    it('should not allow refresh with revoked token after logout', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Health check remains public', () => {
    it('should be accessible without JWT', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Vendor Registration', () => {
    let customerToken: string;
    let customerUserId: string;
    let customerEmail: string;
    let vendorId: string;
    let adminToken: string;
    const ts = Date.now();

    beforeAll(async () => {
      // Register a customer
      customerEmail = `vendor-customer-${ts}@test.com`;
      const customerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: customerEmail,
          password: 'Password123!',
          firstName: 'Vendor',
          lastName: 'Customer',
        })
        .expect(201);
      customerToken = customerRes.body.accessToken;
      customerUserId = customerRes.body.user.id;

      // Register an admin
      const adminRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `vendor-admin-${ts}@test.com`,
          password: 'Password123!',
          firstName: 'Admin',
          lastName: 'User',
        })
        .expect(201);

      await userModel.findOneAndUpdate(
        { id: adminRes.body.user.id },
        { $set: { role: 'admin' } },
      );

      const adminLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminRes.body.user.email,
          password: 'Password123!',
        })
        .expect(200);
      adminToken = adminLogin.body.accessToken;
    });

    it('should allow customer to register as vendor', () => {
      return request(app.getHttpServer())
        .post('/api/v1/vendors/register')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          businessName: 'Test Business',
          businessEmail: 'business@test.com',
          phone: '+966501234567',
          description: 'A test business',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.businessName).toBe('Test Business');
          expect(res.body.status).toBe('pending');
          expect(res.body.slug).toBeDefined();
          vendorId = res.body.id;
        });
    });

    it('should reject duplicate vendor registration', () => {
      return request(app.getHttpServer())
        .post('/api/v1/vendors/register')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          businessName: 'Another Business',
          businessEmail: 'another@test.com',
        })
        .expect(409);
    });

    it('should reject vendor registration without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/vendors/register')
        .send({
          businessName: 'Unauthorized Business',
          businessEmail: 'unauthorized@test.com',
        })
        .expect(401);
    });

    it('should reject vendor registration with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/vendors/register')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          businessName: 'Incomplete',
        })
        .expect(400);
    });

    it('should allow admin to list vendors', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/identity/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should allow admin to approve vendor', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/identity/vendors/${vendorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('approved');
          expect(res.body.approvedAt).toBeDefined();
        });
    });

    it('should update user role to VENDOR after approval', async () => {
      // Check the user directly
      const user = await userModel.findOne({ id: customerUserId });
      expect(user.role).toBe('vendor');

      // Re-login to get updated token with vendorId
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: customerEmail,
          password: 'Password123!',
        })
        .expect(200);

      expect(loginRes.body.user.role).toBe('vendor');
      expect(loginRes.body.user.vendorId).toBeDefined();
    });

    it('should reject double approval', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/identity/vendors/${vendorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should allow admin to reject a pending vendor', async () => {
      // Create another vendor for rejection test
      const customer2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `vendor-customer2-${ts}@test.com`,
          password: 'Password123!',
          firstName: 'Vendor2',
          lastName: 'Customer2',
        })
        .expect(201);

      const customer2Token = customer2Res.body.accessToken;

      const vendor2Res = await request(app.getHttpServer())
        .post('/api/v1/vendors/register')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          businessName: 'Rejectable Business',
          businessEmail: 'reject@test.com',
        })
        .expect(201);

      const vendor2Id = vendor2Res.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/admin/identity/vendors/${vendor2Id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('rejected');
        });
    });

    it('should reject vendor approval by non-admin', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/identity/vendors/${vendorId}/approve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should allow vendor to get own profile', async () => {
      // Re-login as vendor to get updated token
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: customerEmail,
          password: 'Password123!',
        })
        .expect(200);

      const vendorToken = loginRes.body.accessToken;

      return request(app.getHttpServer())
        .get('/api/v1/vendors/me')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.businessName).toBe('Test Business');
          expect(res.body.status).toBe('approved');
        });
    });

    it('should allow vendor to update own profile', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: customerEmail,
          password: 'Password123!',
        })
        .expect(200);

      const vendorToken = loginRes.body.accessToken;

      return request(app.getHttpServer())
        .patch('/api/v1/vendors/me')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          businessName: 'Updated Business Name',
          phone: '+966509876543',
          description: 'Updated description',
        })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.businessName).toBe('Updated Business Name');
          expect(res.body.phone).toBe('+966509876543');
          expect(res.body.description).toBe('Updated description');
        });
    });

    it('should reject vendor profile access by non-vendor', () => {
      return request(app.getHttpServer())
        .get('/api/v1/vendors/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should allow admin to get vendor detail', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/admin/identity/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.id).toBe(vendorId);
          expect(res.body.businessName).toBeDefined();
          expect(res.body.user).toBeDefined();
        });
    });

    it('should allow admin to create vendor', async () => {
      const newVendorEmail = `admin-created-${ts}@test.com`;
      return request(app.getHttpServer())
        .post('/api/v1/admin/identity/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: newVendorEmail,
          firstName: 'Admin',
          lastName: 'Created',
          password: 'Password123!',
          businessName: 'Admin Created Business',
          businessEmail: 'admin-business@test.com',
          status: 'approved',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.businessName).toBe('Admin Created Business');
          expect(res.body.status).toBe('approved');
        });
    });

    it('should allow admin to reject vendor with reason', async () => {
      // Create a pending vendor
      const customer3Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `vendor-customer3-${ts}@test.com`,
          password: 'Password123!',
          firstName: 'Vendor3',
          lastName: 'Customer3',
        })
        .expect(201);

      const customer3Token = customer3Res.body.accessToken;

      const vendor3Res = await request(app.getHttpServer())
        .post('/api/v1/vendors/register')
        .set('Authorization', `Bearer ${customer3Token}`)
        .send({
          businessName: 'Rejectable Business 2',
          businessEmail: 'reject2@test.com',
        })
        .expect(201);

      const vendor3Id = vendor3Res.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/admin/identity/vendors/${vendor3Id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Business license verification failed',
        })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('rejected');
          expect(res.body.rejectionReason).toBe('Business license verification failed');
        });
    });

    it('should allow admin to suspend vendor with reason', async () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/identity/vendors/${vendorId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Violation of terms of service',
        })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('suspended');
          expect(res.body.rejectionReason).toBe('Violation of terms of service');
        });
    });
  });
});
