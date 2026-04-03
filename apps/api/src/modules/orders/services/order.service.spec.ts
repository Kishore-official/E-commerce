import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  OrderStatus,
  OrderItemStatus,
  OfferStatus,
  OfferType,
} from '@ecommerce/shared-types';
import { OrderService } from './order.service';
import { Order } from '../schemas/order.schema';
import { OrderItem } from '../schemas/order-item.schema';
import { OrderStatusHistory } from '../schemas/order-status-history.schema';
import { Offer } from '../../offers/schemas/offer.schema';
import { Product } from '../../catalog/schemas/product.schema';
import { Variant } from '../../catalog/schemas/variant.schema';
import { CartService } from '../../cart/services/cart.service';
import { CouponService } from '../../coupons/services/coupon.service';
import { EventBusService } from '@common/events/event-bus.service';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

describe('OrderService', () => {
  let service: OrderService;
  let orderModel: any;
  let orderItemModel: any;
  let statusHistoryModel: any;
  let offerModel: any;
  let productModel: any;
  let variantModel: any;
  let cartService: any;
  let eventBus: any;
  let mockConnection: any;
  let mockSession: any;

  const mockAddress = {
    name: 'Test User',
    line1: '123 Main St',
    city: 'Riyadh',
    postalCode: '12345',
    countryCode: 'SA',
  };

  const mockOrder: Partial<Order> = {
    id: 'order-1',
    orderNumber: 'ORD-20260101-00001',
    userId: 'user-1',
    countryCode: 'SA',
    status: OrderStatus.PENDING_PAYMENT,
    subtotal: 100000,
    shippingTotal: 0,
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: 100000,
    currency: 'SAR',
    shippingAddress: mockAddress,
    billingAddress: null,
    notes: null,
    idempotencyKey: 'key-1',
    cancelledAt: null,
    completedAt: null,
    items: [],
    statusHistory: [],
  };

  const mockOrderItem: Partial<OrderItem> = {
    id: 'oi-1',
    orderId: 'order-1',
    offerId: 'offer-1',
    vendorId: 'vendor-1',
    productName: 'Test Product',
    variantName: 'Default',
    sku: 'SKU-001',
    quantity: 2,
    unitPrice: 50000,
    totalPrice: 100000,
    currency: 'SAR',
    offerType: OfferType.MARKETPLACE,
    status: OrderItemStatus.PENDING,
  };

  // Helper to create a chainable mock for Mongoose queries
  function chainExec(resolvedValue: any) {
    return { exec: jest.fn().mockResolvedValue(resolvedValue) };
  }

  // Helper for chained .session().exec() pattern
  function chainSessionExec(resolvedValue: any) {
    return {
      session: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(resolvedValue),
      }),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
  }

  function chainFindSort(resolvedValue: any) {
    return {
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(resolvedValue),
          }),
        }),
        exec: jest.fn().mockResolvedValue(resolvedValue),
      }),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
  }

  beforeEach(async () => {
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };

    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getModelToken(Order.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            findOneAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(OrderItem.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(OrderStatusHistory.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken(Offer.name),
          useValue: {
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(Variant.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: CartService,
          useValue: {
            getCartForCheckout: jest.fn(),
            convertCart: jest.fn(),
          },
        },
        {
          provide: CouponService,
          useValue: {
            validateCoupon: jest.fn(),
            recordUsage: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderModel = module.get(getModelToken(Order.name));
    orderItemModel = module.get(getModelToken(OrderItem.name));
    statusHistoryModel = module.get(getModelToken(OrderStatusHistory.name));
    offerModel = module.get(getModelToken(Offer.name));
    productModel = module.get(getModelToken(Product.name));
    variantModel = module.get(getModelToken(Variant.name));
    cartService = module.get(CartService);
    eventBus = module.get(EventBusService);
  });

  // Helper to set up findById mock (used by many methods):
  // findById calls orderModel.findOne().exec(), then orderItemModel.find().exec(),
  // then statusHistoryModel.find().sort().exec()
  function setupFindById(order: any, items: any[] = [], statusHistory: any[] = []) {
    orderModel.findOne.mockReturnValue(chainExec(order));
    orderItemModel.find.mockReturnValue(chainExec(items));
    statusHistoryModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(statusHistory),
      }),
    });
  }

  describe('createFromCart', () => {
    it('should return existing order for duplicate idempotency key', async () => {
      // Idempotency check: findOne({ idempotencyKey }) returns existing order
      orderModel.findOne.mockReturnValue(chainExec({ ...mockOrder }));
      // Then orderItemModel.find for loading items
      orderItemModel.find.mockReturnValue(chainExec([mockOrderItem]));

      const result = await service.createFromCart('user-1', {
        shippingAddress: mockAddress,
      } as any, 'key-1');

      expect(result.id).toBe('order-1');
      expect(mockConnection.startSession).not.toHaveBeenCalled();
    });

    it('should create order from cart with correct totals', async () => {
      const cart = {
        id: 'cart-1',
        items: [{
          offerId: 'offer-1',
          quantity: 2,
          priceSnapshot: 50000,
          currency: 'SAR',
        }],
      };

      const mockOffer1 = {
        id: 'offer-1',
        productId: 'prod-1',
        variantId: 'var-1',
        vendorId: 'vendor-1',
        status: OfferStatus.ACTIVE,
        offerType: OfferType.MARKETPLACE,
        priceAmount: 50000,
      };

      // 1. Idempotency check: no existing order
      // 2. findById after creation
      // 3. updateOrderShippingStatus or other findOne calls
      orderModel.findOne
        .mockReturnValueOnce(chainExec(null)) // idempotency check
        .mockReturnValueOnce(chainExec({ ...mockOrder, items: [mockOrderItem], statusHistory: [] })); // findById

      cartService.getCartForCheckout.mockResolvedValue(cart);

      // create with session: orderModel.create([{...}], { session }) -> returns array
      orderModel.create.mockResolvedValue([{
        ...mockOrder,
        id: 'order-new',
        countryCode: 'SA',
        shippingTotal: 0,
        discountTotal: 0,
      }]);

      // offerModel.findOne().session().exec() for each cart item
      offerModel.findOne.mockReturnValue(chainSessionExec(mockOffer1));

      // productModel.findOne().session().exec() and variantModel.findOne().session().exec()
      productModel.findOne.mockReturnValue(
        chainSessionExec({ id: 'prod-1', name: 'Test Product' }),
      );
      variantModel.findOne.mockReturnValue(
        chainSessionExec({ id: 'var-1', name: 'Default', sku: 'SKU-001' }),
      );

      // orderItemModel.create([{...}], { session })
      orderItemModel.create.mockResolvedValue([mockOrderItem]);

      // offerModel.findOneAndUpdate for stock reservation (with session)
      offerModel.findOneAndUpdate.mockReturnValue(chainExec(mockOffer1));

      // orderModel.findOneAndUpdate for total update (with session)
      orderModel.findOneAndUpdate.mockReturnValue(chainExec({ ...mockOrder }));

      // statusHistoryModel.create([{...}], { session })
      statusHistoryModel.create.mockResolvedValue([{}]);

      // findById after creation: need orderItemModel.find and statusHistoryModel.find
      orderItemModel.find.mockReturnValue(chainExec([mockOrderItem]));
      statusHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      cartService.convertCart.mockResolvedValue(undefined);

      const result = await service.createFromCart('user-1', {
        shippingAddress: mockAddress,
      } as any, 'key-new');

      expect(cartService.getCartForCheckout).toHaveBeenCalledWith('user-1');
      expect(cartService.convertCart).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return order with items and status history', async () => {
      setupFindById(
        { ...mockOrder },
        [mockOrderItem],
        [],
      );

      const result = await service.findById('order-1');
      expect(result.id).toBe('order-1');
    });

    it('should throw if order not found', async () => {
      orderModel.findOne.mockReturnValue(chainExec(null));

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('should filter by userId when provided', async () => {
      orderModel.findOne.mockReturnValue(chainExec(null));

      await expect(
        service.findById('order-1', 'wrong-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return paginated results', async () => {
      orderModel.find.mockReturnValue(chainFindSort([]));
      orderModel.countDocuments.mockReturnValue(chainExec(0));
      orderItemModel.find.mockReturnValue(chainExec([]));

      const result = await service.findByUser('user-1', {
        page: 1,
        limit: 10,
        get skip() { return 0; },
      } as any);

      expect(result.data).toEqual([]);
      expect(result.meta).toBeDefined();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel PENDING_PAYMENT order', async () => {
      // findById (called by cancelOrder)
      setupFindById(
        { ...mockOrder },
        [mockOrderItem],
        [],
      );

      // transitionStatus: findOneAndUpdate for status change
      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.CANCELLED, cancelledAt: new Date() }),
      );
      // transitionStatus: offerModel.findOneAndUpdate for stock release
      offerModel.findOneAndUpdate.mockReturnValue(chainExec({}));
      // transitionStatus: statusHistoryModel.create
      statusHistoryModel.create.mockResolvedValue({});

      const result = await service.cancelOrder('order-1', 'user-1', {
        reason: 'Changed my mind',
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should cancel CONFIRMED order', async () => {
      setupFindById(
        { ...mockOrder, status: OrderStatus.CONFIRMED },
        [mockOrderItem],
        [],
      );

      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.CANCELLED }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(chainExec({}));
      statusHistoryModel.create.mockResolvedValue({});

      const result = await service.cancelOrder('order-1', 'user-1', {});

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw for SHIPPED order', async () => {
      setupFindById(
        { ...mockOrder, status: OrderStatus.SHIPPED },
        [],
        [],
      );

      await expect(
        service.cancelOrder('order-1', 'user-1', {}),
      ).rejects.toThrow(InvalidStateTransitionException);
    });

    it('should release reserved stock on cancellation', async () => {
      setupFindById(
        { ...mockOrder },
        [{ ...mockOrderItem, quantity: 3 }],
        [],
      );

      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.CANCELLED }),
      );
      offerModel.findOneAndUpdate.mockReturnValue(chainExec({}));
      statusHistoryModel.create.mockResolvedValue({});

      await service.cancelOrder('order-1', 'user-1', {});

      expect(offerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'offer-1' },
        { $inc: { stockReserved: -3 } },
      );
    });
  });

  describe('confirmOrder', () => {
    it('should transition to CONFIRMED on payment success', async () => {
      setupFindById(
        { ...mockOrder },
        [],
        [],
      );

      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.CONFIRMED }),
      );
      statusHistoryModel.create.mockResolvedValue({});

      await service.confirmOrder('order-1', 'payment-1');

      expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'order-1' },
        { $set: { status: OrderStatus.CONFIRMED } },
        { new: true },
      );
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw for non-PENDING_PAYMENT order', async () => {
      setupFindById(
        { ...mockOrder, status: OrderStatus.CONFIRMED },
        [],
        [],
      );

      await expect(
        service.confirmOrder('order-1', 'payment-1'),
      ).rejects.toThrow(InvalidStateTransitionException);
    });
  });

  describe('confirmOrderItems', () => {
    it('should confirm vendor items and transition order to PROCESSING', async () => {
      // First findById call
      orderModel.findOne
        .mockReturnValueOnce(chainExec({
          ...mockOrder,
          status: OrderStatus.CONFIRMED,
        }));

      orderItemModel.find
        .mockReturnValueOnce(chainExec([{ ...mockOrderItem, status: OrderItemStatus.PENDING }])); // findById items
      statusHistoryModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        });

      // findOneAndUpdate for item status change
      orderItemModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrderItem, status: OrderItemStatus.CONFIRMED }),
      );

      // transitionStatus: orderModel.findOneAndUpdate
      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.PROCESSING }),
      );
      statusHistoryModel.create.mockResolvedValue({});

      // Second findById call (return at end)
      orderModel.findOne
        .mockReturnValueOnce(chainExec({
          ...mockOrder,
          status: OrderStatus.PROCESSING,
        }));
      orderItemModel.find
        .mockReturnValueOnce(chainExec([{ ...mockOrderItem, status: OrderItemStatus.CONFIRMED }]));
      statusHistoryModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        });

      const result = await service.confirmOrderItems('order-1', 'vendor-1');
      expect(orderItemModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw if no pending items for vendor', async () => {
      setupFindById(
        { ...mockOrder, status: OrderStatus.CONFIRMED },
        [{ ...mockOrderItem, vendorId: 'other-vendor' }],
        [],
      );

      await expect(
        service.confirmOrderItems('order-1', 'vendor-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adminUpdateStatus', () => {
    it('should transition with state machine validation', async () => {
      setupFindById(
        { ...mockOrder, status: OrderStatus.DELIVERED },
        [],
        [],
      );

      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.COMPLETED, completedAt: new Date() }),
      );
      statusHistoryModel.create.mockResolvedValue({});

      const result = await service.adminUpdateStatus(
        'order-1',
        { status: OrderStatus.COMPLETED } as any,
        'admin-1',
      );

      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should throw for invalid transition', async () => {
      setupFindById(
        { ...mockOrder, status: OrderStatus.COMPLETED },
        [],
        [],
      );

      await expect(
        service.adminUpdateStatus(
          'order-1',
          { status: OrderStatus.PENDING_PAYMENT } as any,
          'admin-1',
        ),
      ).rejects.toThrow(InvalidStateTransitionException);
    });
  });

  describe('updateOrderShippingStatus', () => {
    it('should transition to SHIPPED when all items shipped', async () => {
      orderModel.findOne.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.PROCESSING }),
      );
      orderItemModel.find.mockReturnValue(
        chainExec([
          { ...mockOrderItem, status: OrderItemStatus.SHIPPED },
          { ...mockOrderItem, id: 'oi-2', status: OrderItemStatus.SHIPPED },
        ]),
      );

      // transitionStatus
      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.SHIPPED }),
      );
      statusHistoryModel.create.mockResolvedValue({});

      await service.updateOrderShippingStatus('order-1');

      expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'order-1' },
        { $set: { status: OrderStatus.SHIPPED } },
        { new: true },
      );
    });

    it('should transition to PARTIALLY_SHIPPED when some items shipped', async () => {
      orderModel.findOne.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.PROCESSING }),
      );
      orderItemModel.find.mockReturnValue(
        chainExec([
          { ...mockOrderItem, status: OrderItemStatus.SHIPPED },
          { ...mockOrderItem, id: 'oi-2', status: OrderItemStatus.PENDING },
        ]),
      );

      orderModel.findOneAndUpdate.mockReturnValue(
        chainExec({ ...mockOrder, status: OrderStatus.PARTIALLY_SHIPPED }),
      );
      statusHistoryModel.create.mockResolvedValue({});

      await service.updateOrderShippingStatus('order-1');

      expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'order-1' },
        { $set: { status: OrderStatus.PARTIALLY_SHIPPED } },
        { new: true },
      );
    });

    it('should no-op if order not found', async () => {
      orderModel.findOne.mockReturnValue(chainExec(null));

      await service.updateOrderShippingStatus('missing');
      expect(orderModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });
});
