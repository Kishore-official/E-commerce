import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReviewEligibilityStatus } from '@ecommerce/shared-types';
import { ReviewEligibilityService } from './review-eligibility.service';
import { ReviewEligibility } from '../schemas/review-eligibility.schema';
import { ShipmentItem } from '@modules/logistics/schemas/shipment-item.schema';
import { Order } from '@modules/orders/schemas/order.schema';
import { OrderItem } from '@modules/orders/schemas/order-item.schema';
import { Offer } from '@modules/offers/schemas/offer.schema';
import { EventBusService } from '@common/events/event-bus.service';
import { BadRequestException } from '@nestjs/common';

describe('ReviewEligibilityService', () => {
  let service: ReviewEligibilityService;
  let eligibilityModel: any;
  let shipmentItemModel: any;
  let orderModel: any;
  let orderItemModel: any;
  let offerModel: any;
  let eventBus: any;

  beforeEach(async () => {
    const mockEligibilityModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockShipmentItemModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };

    const mockOrderModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockOrderItemModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockOfferModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewEligibilityService,
        {
          provide: getModelToken(ReviewEligibility.name),
          useValue: mockEligibilityModel,
        },
        {
          provide: getModelToken(ShipmentItem.name),
          useValue: mockShipmentItemModel,
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
          provide: getModelToken(Offer.name),
          useValue: mockOfferModel,
        },
        {
          provide: EventBusService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewEligibilityService>(ReviewEligibilityService);
    eligibilityModel = module.get(getModelToken(ReviewEligibility.name));
    shipmentItemModel = module.get(getModelToken(ShipmentItem.name));
    orderModel = module.get(getModelToken(Order.name));
    orderItemModel = module.get(getModelToken(OrderItem.name));
    offerModel = module.get(getModelToken(Offer.name));
    eventBus = module.get(EventBusService);
  });

  describe('createForDeliveredShipment', () => {
    const shipmentId = 'ship-1';
    const orderId = 'order-1';

    it('should create eligibility for each shipment item', async () => {
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { shipmentId, orderItemId: 'oi-1', quantity: 1 },
        ]),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: orderId, userId: 'user-1' }),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      orderItemModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'oi-1', offerId: 'offer-1' }),
      });
      offerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'offer-1',
          productId: 'prod-1',
          variantId: 'var-1',
        }),
      });
      eligibilityModel.create.mockResolvedValue({
        id: 'elig-1',
        orderId,
        orderItemId: 'oi-1',
        userId: 'user-1',
        productId: 'prod-1',
        variantId: 'var-1',
        status: ReviewEligibilityStatus.ELIGIBLE,
        idempotencyKey: 'review-eligibility:oi-1',
      });

      await service.createForDeliveredShipment(shipmentId, orderId);

      expect(eligibilityModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          orderItemId: 'oi-1',
          userId: 'user-1',
          productId: 'prod-1',
          variantId: 'var-1',
          status: ReviewEligibilityStatus.ELIGIBLE,
          idempotencyKey: 'review-eligibility:oi-1',
        }),
      );
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should skip existing eligibility (idempotent)', async () => {
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { shipmentId, orderItemId: 'oi-1', quantity: 1 },
        ]),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: orderId, userId: 'user-1' }),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'existing-elig' }),
      });

      await service.createForDeliveredShipment(shipmentId, orderId);

      expect(eligibilityModel.create).not.toHaveBeenCalled();
    });

    it('should set 90-day expiry', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { shipmentId, orderItemId: 'oi-1', quantity: 1 },
        ]),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: orderId, userId: 'user-1' }),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      orderItemModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'oi-1', offerId: 'offer-1' }),
      });
      offerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'offer-1',
          productId: 'prod-1',
          variantId: 'var-1',
        }),
      });
      eligibilityModel.create.mockResolvedValue({
        id: 'elig-1',
        eligibleUntil: new Date(now + 90 * 24 * 60 * 60 * 1000),
      });

      await service.createForDeliveredShipment(shipmentId, orderId);

      const expectedExpiry = new Date(now + 90 * 24 * 60 * 60 * 1000);
      expect(eligibilityModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eligibleUntil: expectedExpiry,
        }),
      );

      jest.restoreAllMocks();
    });

    it('should handle missing shipment items gracefully', async () => {
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.createForDeliveredShipment(shipmentId, orderId),
      ).resolves.not.toThrow();

      expect(eligibilityModel.create).not.toHaveBeenCalled();
    });

    it('should handle missing order gracefully', async () => {
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { shipmentId, orderItemId: 'oi-1', quantity: 1 },
        ]),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createForDeliveredShipment(shipmentId, orderId),
      ).resolves.not.toThrow();

      expect(eligibilityModel.create).not.toHaveBeenCalled();
    });

    it('should handle errors without throwing', async () => {
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await expect(
        service.createForDeliveredShipment(shipmentId, orderId),
      ).resolves.not.toThrow();
    });

    it('should create eligibilities for multiple items', async () => {
      shipmentItemModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { shipmentId, orderItemId: 'oi-1', quantity: 1 },
          { shipmentId, orderItemId: 'oi-2', quantity: 2 },
        ]),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: orderId, userId: 'user-1' }),
      });
      eligibilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      orderItemModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ id: 'oi-1', offerId: 'offer-1' }),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ id: 'oi-2', offerId: 'offer-2' }),
        });
      offerModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ id: 'offer-1', productId: 'prod-1', variantId: 'var-1' }),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ id: 'offer-2', productId: 'prod-2', variantId: 'var-2' }),
        });
      eligibilityModel.create
        .mockResolvedValueOnce({ id: 'elig-1' })
        .mockResolvedValueOnce({ id: 'elig-2' });

      await service.createForDeliveredShipment(shipmentId, orderId);

      expect(eligibilityModel.create).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByUser', () => {
    it('should return only ELIGIBLE eligibilities', async () => {
      const mockEligibilities = [
        {
          id: 'e1',
          orderId: 'order-1',
          orderItemId: 'oi-1',
          userId: 'user-1',
          productId: 'prod-1',
          variantId: 'var-1',
          status: ReviewEligibilityStatus.ELIGIBLE,
          eligibleUntil: new Date(),
          createdAt: new Date(),
        },
      ];
      eligibilityModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockEligibilities),
        }),
      });

      const result = await service.findByUser('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
      expect(eligibilityModel.find).toHaveBeenCalledWith({
        userId: 'user-1',
        status: ReviewEligibilityStatus.ELIGIBLE,
      });
    });
  });

  describe('markAsUsed', () => {
    it('should atomically transition from ELIGIBLE to REVIEW_SUBMITTED', async () => {
      eligibilityModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'e1',
          status: ReviewEligibilityStatus.REVIEW_SUBMITTED,
        }),
      });

      await service.markAsUsed('e1');

      expect(eligibilityModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'e1', status: ReviewEligibilityStatus.ELIGIBLE },
        { $set: { status: ReviewEligibilityStatus.REVIEW_SUBMITTED } },
        { new: true },
      );
    });

    it('should throw when eligibility already used or not found', async () => {
      eligibilityModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.markAsUsed('e1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
