import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/identity/schemas/user.schema';
import { Vendor } from '../src/modules/identity/schemas/vendor.schema';

describe('Checkout Flow (e2e)', () => {
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
  let paymentId: string;
  let gatewayPaymentId: string;
  let shipmentId: string;

  const ts = Date.now();

  const shippingAddress = {
    name: 'Test Customer',
    line1: '123 Main Street',
    city: 'Riyadh',
    postalCode: '12345',
    countryCode: 'SA',
    phone: '+966501234567',
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
    const custReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `checkout-customer-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Checkout',
        lastName: 'Customer',
      })
      .expect(201);

    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `checkout-customer-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    customerToken = custLogin.body.accessToken;

    // ── Register vendor ──
    const vendorReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `checkout-vendor-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Checkout',
        lastName: 'Vendor',
      })
      .expect(201);

    const vendorUserId = vendorReg.body.user.id;
    vendorId = uuidv4();
    await userModel.findOneAndUpdate({ id: vendorUserId }, { $set: { role: 'vendor' } });
    await vendorModel.create({
      id: vendorId,
      userId: vendorUserId,
      businessName: `CheckoutShop-${ts}`,
      slug: `checkoutshop-${ts}`,
      businessEmail: `checkout-v-${ts}@shop.com`,
      countryCode: 'SA',
      status: 'approved',
      commissionRate: 10.0,
      approvedAt: new Date(),
    });

    const vendorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `checkout-vendor-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    vendorToken = vendorLogin.body.accessToken;

    // ── Register admin ──
    const adminReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `checkout-admin-${ts}@test.com`,
        password: 'Password123!',
        firstName: 'Checkout',
        lastName: 'Admin',
      })
      .expect(201);

    await userModel.findOneAndUpdate({ id: adminReg.body.user.id }, { $set: { role: 'admin' } });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `checkout-admin-${ts}@test.com`, password: 'Password123!' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // ── Create product + variant + offer ──
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/products')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ name: `Checkout E2E Product ${ts}` })
      .expect(201);
    productId = prodRes.body.id;

    const varRes = await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/variants`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ sku: `CHECKOUT-SKU-${ts}`, name: 'Standard' })
      .expect(201);
    variantId = varRes.body.id;

    // Submit and approve product
    await request(app.getHttpServer())
      .post(`/api/v1/vendor/products/${productId}/submit`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);

    await request(app.getHttpServer())
        .patch(`/api/v1/admin/catalog/products/${productId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Create and activate marketplace offer
    const offerRes = await request(app.getHttpServer())
      .post('/api/v1/vendor/offers')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        productId,
        variantId,
        offerType: 'marketplace',
        priceAmount: 75000,
        stockQuantity: 20,
      })
      .expect(201);
    offerId = offerRes.body.id;

    // Submit for review
    await request(app.getHttpServer())
      .post(`/api/v1/vendor/offers/${offerId}/submit`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(201);

    // Admin approves the offer
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/offers/${offerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Cart ──

  describe('Cart operations', () => {
    it('should add item to cart', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId, quantity: 2 })
        .expect(201);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].offerId).toBe(offerId);
      expect(res.body.items[0].quantity).toBe(2);
      expect(res.body.items[0].priceSnapshot).toBe(75000);
    });

    it('should get active cart', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
    });
  });

  // ── Order Creation (idempotent) ──

  describe('Order creation', () => {
    const idempotencyKey = uuidv4();

    it('should create order from cart', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ shippingAddress })
        .expect(201);

      expect(res.body.status).toBe('pending_payment');
      expect(res.body.grandTotal).toBeGreaterThan(0);
      expect(res.body.items).toHaveLength(1);
      orderId = res.body.id;
      orderItemId = res.body.items[0].id;
    });

    it('should return same order on duplicate idempotency key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ shippingAddress })
        .expect(201);

      expect(res.body.id).toBe(orderId);
    });

    it('should list customer orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Payment Initiation (idempotent) ──

  describe('Payment initiation', () => {
    const paymentIdempotencyKey = uuidv4();

    it('should initiate payment for order', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', paymentIdempotencyKey)
        .send({ orderId })
        .expect(201);

      expect(res.body.status).toBe('processing');
      expect(res.body.orderId).toBe(orderId);
      expect(res.body.gatewayPaymentId).toBeDefined();
      paymentId = res.body.id;
      gatewayPaymentId = res.body.gatewayPaymentId;
    });

    it('should return same payment on duplicate idempotency key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Idempotency-Key', paymentIdempotencyKey)
        .send({ orderId })
        .expect(201);

      expect(res.body.id).toBe(paymentId);
    });
  });

  // ── Payment Webhook ──

  describe('Payment webhook', () => {
    it('should process payment.succeeded webhook', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/mock')
        .send({
          eventType: 'payment.succeeded',
          gatewayPaymentId,
        })
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('should confirm order after payment success', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.status).toBe('confirmed');
    });

    it('should skip duplicate payment webhook (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/mock')
        .send({
          eventType: 'payment.succeeded',
          gatewayPaymentId,
        })
        .expect(200);

      expect(res.body.received).toBe(true);

      // Payment should still be SUCCEEDED (no error from re-processing)
      const payRes = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(payRes.body.status).toBe('succeeded');
    });
  });

  // ── Vendor Confirms Items ──

  describe('Vendor order confirmation', () => {
    it('should confirm order items', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(res.body.status).toBe('processing');
      // items should be confirmed
      const confirmedItem = res.body.items.find((i: any) => i.id === orderItemId);
      expect(confirmedItem.status).toBe('confirmed');
    });
  });

  // ── Shipment Creation ──

  describe('Shipment creation and shipping', () => {
    it('should create shipment for confirmed items', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/vendor/shipments')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          orderId,
          items: [{ orderItemId, quantity: 2 }],
        })
        .expect(201);

      expect(res.body.status).toBe('pending');
      expect(res.body.orderId).toBe(orderId);
      shipmentId = res.body.id;
    });

    it('should mark shipment as shipped with tracking', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendor/shipments/${shipmentId}/ship`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          trackingNumber: `TRK-${ts}`,
          carrier: 'DHL',
        })
        .expect(200);

      expect(res.body.status).toBe('shipped');
      expect(res.body.trackingNumber).toBe(`TRK-${ts}`);
      expect(res.body.carrier).toBe('DHL');
    });

    it('should get tracking info', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/shipments/${shipmentId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.id).toBe(shipmentId);
      expect(res.body.status).toBe('shipped');
    });
  });

  // ── Carrier Webhooks ──

  describe('Carrier webhook processing', () => {
    const deliveredAt = '2026-01-20T14:00:00.000Z';

    it('should process in_transit carrier webhook', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/logistics/webhooks/carrier')
        .send({
          trackingNumber: `TRK-${ts}`,
          status: 'in_transit',
          description: 'Package in transit to destination',
          location: 'Jeddah Hub',
          occurredAt: '2026-01-19T10:00:00.000Z',
        })
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('should process delivered carrier webhook', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/logistics/webhooks/carrier')
        .send({
          trackingNumber: `TRK-${ts}`,
          status: 'delivered',
          description: 'Delivered to recipient',
          location: 'Riyadh, Customer Address',
          occurredAt: deliveredAt,
        })
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('should skip duplicate carrier webhook (idempotent)', async () => {
      // Same event with same occurredAt should be deduplicated
      const res = await request(app.getHttpServer())
        .post('/api/v1/logistics/webhooks/carrier')
        .send({
          trackingNumber: `TRK-${ts}`,
          status: 'delivered',
          description: 'Delivered to recipient',
          location: 'Riyadh, Customer Address',
          occurredAt: deliveredAt,
        })
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('should verify shipment is DELIVERED', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/shipments/${shipmentId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.status).toBe('delivered');
      expect(res.body.deliveredAt).toBeDefined();
    });

    it('should verify order reflects delivery', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Order should be DELIVERED since all items are delivered
      expect(res.body.status).toBe('delivered');
    });
  });
});
