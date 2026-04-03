import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ShipmentStatus,
  OrderStatus,
  OrderItemStatus,
} from '@ecommerce/shared-types';
import { ShipmentService } from './shipment.service';
import { Shipment } from '../schemas/shipment.schema';
import { ShipmentItem } from '../schemas/shipment-item.schema';
import { ShipmentTrackingEvent } from '../schemas/shipment-tracking-event.schema';
import { Order } from '../../orders/schemas/order.schema';
import { OrderItem } from '../../orders/schemas/order-item.schema';
import { CARRIER_PROVIDER_PORT } from '../ports/carrier-provider.port';
import { EventBusService } from '@common/events/event-bus.service';

describe('ShipmentService', () => {
  let service: ShipmentService;
  let shipmentModel: any;
  let shipmentItemModel: any;
  let trackingEventModel: any;
  let orderModel: any;
  let orderItemModel: any;
  let carrier: any;
  let eventBus: any;

  const mockOrder = {
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatus.CONFIRMED,
  };

  const mockOrderItem = {
    id: 'oi-1',
    orderId: 'order-1',
    vendorId: 'vendor-1',
    status: OrderItemStatus.CONFIRMED,
    quantity: 2,
  };

  const mockShipment = {
    id: 'ship-1',
    orderId: 'order-1',
    vendorId: 'vendor-1',
    status: ShipmentStatus.PENDING,
    trackingNumber: null,
    carrier: null,
    shippingLabelUrl: null,
    shippedAt: null,
    deliveredAt: null,
  };

  beforeEach(async () => {
    const mockShipmentModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
      updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }) }),
    };

    const mockShipmentItemModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    const mockTrackingEventModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
      create: jest.fn(),
    };

    const mockOrderModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockOrderItemModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentService,
        {
          provide: getModelToken(Shipment.name),
          useValue: mockShipmentModel,
        },
        {
          provide: getModelToken(ShipmentItem.name),
          useValue: mockShipmentItemModel,
        },
        {
          provide: getModelToken(ShipmentTrackingEvent.name),
          useValue: mockTrackingEventModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(OrderItem.name),
          useValue: mockOrderItemModel,
        },
        {
          provide: CARRIER_PROVIDER_PORT,
          useValue: {
            verifyWebhookSignature: jest.fn().mockReturnValue(true),
            parseWebhook: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { emit: jest.fn(), emitAsync: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<ShipmentService>(ShipmentService);
    shipmentModel = module.get(getModelToken(Shipment.name));
    shipmentItemModel = module.get(getModelToken(ShipmentItem.name));
    trackingEventModel = module.get(getModelToken(ShipmentTrackingEvent.name));
    orderModel = module.get(getModelToken(Order.name));
    orderItemModel = module.get(getModelToken(OrderItem.name));
    carrier = module.get(CARRIER_PROVIDER_PORT);
    eventBus = module.get(EventBusService);
  });

  describe('createShipment', () => {
    it('should create shipment for confirmed order items', async () => {
      // 1st orderModel.findOne: validate order
      orderModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockOrder }),
      });
      // 1st orderItemModel.find: get order items (CONFIRMED)
      orderItemModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ ...mockOrderItem }]),
      });
      // shipmentItemModel.findOne: item not yet assigned to a shipment
      shipmentItemModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const createdShipment = { ...mockShipment, id: 'ship-1' };
      shipmentModel.create.mockResolvedValue(createdShipment);
      shipmentItemModel.insertMany.mockResolvedValue([]);

      // orderItemModel.findOneAndUpdate for status update to SHIPPED
      orderItemModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrderItem, status: OrderItemStatus.SHIPPED }),
      });

      // updateOrderShippingStatus internals:
      // 2nd orderModel.findOne for the order
      orderModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockOrder }),
      });
      // 2nd orderItemModel.find for all items (now SHIPPED)
      orderItemModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ ...mockOrderItem, status: OrderItemStatus.SHIPPED }]),
      });
      // orderModel.findOneAndUpdate for order status transitions
      orderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPED }),
      });

      // shipmentItemModel.find for returning items with shipment
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.createShipment('vendor-1', {
        orderId: 'order-1',
        items: [{ orderItemId: 'oi-1', quantity: 2 }],
      });

      expect(shipmentModel.create).toHaveBeenCalled();
      expect(shipmentItemModel.insertMany).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw if order not found', async () => {
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createShipment('vendor-1', {
          orderId: 'missing',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if order is not CONFIRMED or PROCESSING', async () => {
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.PENDING_PAYMENT,
        }),
      });

      await expect(
        service.createShipment('vendor-1', {
          orderId: 'order-1',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order item does not belong to vendor', async () => {
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrder }),
      });
      orderItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{
          ...mockOrderItem,
          vendorId: 'other-vendor',
        }]),
      });

      await expect(
        service.createShipment('vendor-1', {
          orderId: 'order-1',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order item is not CONFIRMED', async () => {
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrder }),
      });
      orderItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{
          ...mockOrderItem,
          status: OrderItemStatus.PENDING,
        }]),
      });

      await expect(
        service.createShipment('vendor-1', {
          orderId: 'order-1',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order item already assigned to a shipment', async () => {
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrder }),
      });
      orderItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ ...mockOrderItem }]),
      });
      shipmentItemModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'existing-si' }),
      });

      await expect(
        service.createShipment('vendor-1', {
          orderId: 'order-1',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsShipped', () => {
    it('should mark PENDING shipment as shipped with tracking', async () => {
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockShipment }),
      });
      const updatedShipment = {
        ...mockShipment,
        status: ShipmentStatus.SHIPPED,
        trackingNumber: 'TRK-123',
        carrier: 'DHL',
      };
      shipmentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedShipment),
      });

      const result = await service.markAsShipped('ship-1', 'vendor-1', {
        trackingNumber: 'TRK-123',
        carrier: 'DHL',
      });

      expect(result.status).toBe(ShipmentStatus.SHIPPED);
      expect(result.trackingNumber).toBe('TRK-123');
      expect(result.carrier).toBe('DHL');
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw if shipment not found', async () => {
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.markAsShipped('missing', 'vendor-1', {
          trackingNumber: 'TRK',
          carrier: 'DHL',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if shipment does not belong to vendor', async () => {
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockShipment,
          vendorId: 'other-vendor',
        }),
      });

      await expect(
        service.markAsShipped('ship-1', 'vendor-1', {
          trackingNumber: 'TRK',
          carrier: 'DHL',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTracking', () => {
    it('should return shipment with items and tracking events', async () => {
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockShipment }),
      });
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      trackingEventModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getTracking('ship-1');
      expect(result.id).toBe('ship-1');
    });

    it('should throw if shipment not found', async () => {
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getTracking('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processCarrierWebhook', () => {
    it('should reject invalid signature', async () => {
      carrier.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.processCarrierWebhook({}, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should create tracking event and update shipment status', async () => {
      const occurredAt = new Date('2026-01-15T10:00:00Z');
      carrier.parseWebhook.mockReturnValue({
        trackingNumber: 'TRK-123',
        status: 'in_transit',
        description: 'Package in transit',
        location: 'Riyadh Hub',
        occurredAt,
        rawPayload: {},
      });
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockShipment,
          status: ShipmentStatus.SHIPPED,
          trackingNumber: 'TRK-123',
        }),
      });
      trackingEventModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      trackingEventModel.create.mockResolvedValue({ id: 'te-1' });
      shipmentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockShipment,
          status: ShipmentStatus.IN_TRANSIT,
        }),
      });

      await service.processCarrierWebhook({}, {});

      expect(trackingEventModel.create).toHaveBeenCalled();
      expect(shipmentModel.findOneAndUpdate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should skip duplicate carrier webhook (idempotent)', async () => {
      const occurredAt = new Date('2026-01-15T10:00:00Z');
      carrier.parseWebhook.mockReturnValue({
        trackingNumber: 'TRK-123',
        status: 'in_transit',
        description: 'Package in transit',
        occurredAt,
        rawPayload: {},
      });
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockShipment,
          status: ShipmentStatus.IN_TRANSIT,
          trackingNumber: 'TRK-123',
        }),
      });
      trackingEventModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'existing-event' }),
      });

      await service.processCarrierWebhook({}, {});

      expect(trackingEventModel.create).not.toHaveBeenCalled();
      expect(shipmentModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should skip if shipment not found by tracking number', async () => {
      carrier.parseWebhook.mockReturnValue({
        trackingNumber: 'UNKNOWN',
        status: 'in_transit',
        description: 'Unknown',
        occurredAt: new Date(),
        rawPayload: {},
      });
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.processCarrierWebhook({}, {});
      expect(trackingEventModel.create).not.toHaveBeenCalled();
    });

    it('should handle delivered status and update order items', async () => {
      const occurredAt = new Date('2026-01-20T14:00:00Z');
      carrier.parseWebhook.mockReturnValue({
        trackingNumber: 'TRK-123',
        status: 'delivered',
        description: 'Delivered to recipient',
        occurredAt,
        rawPayload: {},
      });
      shipmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockShipment,
          status: ShipmentStatus.OUT_FOR_DELIVERY,
          trackingNumber: 'TRK-123',
        }),
      });
      trackingEventModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      trackingEventModel.create.mockResolvedValue({ id: 'te-1' });
      shipmentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockShipment,
          status: ShipmentStatus.DELIVERED,
          deliveredAt: new Date(),
        }),
      });
      // shipmentItemModel.find for finding items to update to DELIVERED
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { id: 'si-1', orderItemId: 'oi-1' },
        ]),
      });
      // orderItemModel.findOneAndUpdate for updating item status to DELIVERED
      orderItemModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockOrderItem,
          status: OrderItemStatus.DELIVERED,
        }),
      });
      // checkOrderDelivered internals:
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.SHIPPED,
        }),
      });
      orderItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { ...mockOrderItem, status: OrderItemStatus.DELIVERED },
        ]),
      });
      orderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.DELIVERED,
        }),
      });

      await service.processCarrierWebhook({}, {});

      expect(shipmentModel.findOneAndUpdate).toHaveBeenCalled();
      expect(orderItemModel.findOneAndUpdate).toHaveBeenCalled();
      expect(eventBus.emitAsync).toHaveBeenCalled();
    });
  });

  describe('cancelPendingShipments', () => {
    it('should cancel all pending shipments for an order via updateMany', async () => {
      shipmentModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
      });

      await service.cancelPendingShipments('order-1');

      expect(shipmentModel.updateMany).toHaveBeenCalledWith(
        { orderId: 'order-1', status: ShipmentStatus.PENDING },
        { $set: { status: ShipmentStatus.CANCELLED } },
      );
    });

    it('should no-op if no pending shipments', async () => {
      shipmentModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      });

      await service.cancelPendingShipments('order-1');
      expect(shipmentModel.updateMany).toHaveBeenCalled();
    });
  });
});
