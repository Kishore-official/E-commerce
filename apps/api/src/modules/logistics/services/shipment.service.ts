import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  ShipmentStatus,
  OrderStatus,
  OrderItemStatus,
  PaginatedResult,
} from '@ecommerce/shared-types';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { PaginationDto } from '@common/dto/pagination.dto';
import { EventBusService } from '@common/events/event-bus.service';
import { Shipment, ShipmentDocument } from '../schemas/shipment.schema';
import { ShipmentItem, ShipmentItemDocument } from '../schemas/shipment-item.schema';
import { ShipmentTrackingEvent, ShipmentTrackingEventDocument } from '../schemas/shipment-tracking-event.schema';
import { Order, OrderDocument } from '@modules/orders/schemas/order.schema';
import { OrderItem, OrderItemDocument } from '@modules/orders/schemas/order-item.schema';
import { CreateShipmentDto, MarkShippedDto } from '../dto';
import {
  CARRIER_PROVIDER_PORT,
  CarrierProviderPort,
} from '../ports/carrier-provider.port';
import {
  assertShipmentTransition,
  canTransitionShipment,
} from '../state-machines/shipment-status.machine';
import {
  ShipmentCreatedEvent,
  ShipmentShippedEvent,
  ShipmentDeliveredEvent,
  ShipmentStatusChangedEvent,
} from '../events/logistics.events';

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    @InjectModel(Shipment.name)
    private readonly shipmentModel: Model<ShipmentDocument>,
    @InjectModel(ShipmentItem.name)
    private readonly shipmentItemModel: Model<ShipmentItemDocument>,
    @InjectModel(ShipmentTrackingEvent.name)
    private readonly trackingEventModel: Model<ShipmentTrackingEventDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @Inject(CARRIER_PROVIDER_PORT)
    private readonly carrier: CarrierProviderPort,
    private readonly eventBus: EventBusService,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<Shipment>> {
    const [data, total] = await Promise.all([
      this.shipmentModel
        .find()
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.shipmentModel.countDocuments().exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async createShipment(vendorId: string, dto: CreateShipmentDto): Promise<Shipment> {
    const order = await this.orderModel.findOne({ id: dto.orderId }).exec();
    if (!order) throw new NotFoundException('Order not found');

    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PROCESSING
    ) {
      throw new BadRequestException(
        `Order must be CONFIRMED or PROCESSING (current: ${order.status})`,
      );
    }

    const orderItems = await this.orderItemModel.find({ orderId: dto.orderId }).exec();

    // Validate each item
    const orderItemIds: string[] = [];
    for (const shipmentItem of dto.items) {
      const orderItem = orderItems.find((i) => i.id === shipmentItem.orderItemId);
      if (!orderItem) {
        throw new NotFoundException(`Order item ${shipmentItem.orderItemId} not found in this order`);
      }
      if (orderItem.vendorId !== vendorId) {
        throw new BadRequestException(
          `Order item ${shipmentItem.orderItemId} does not belong to your vendor account`,
        );
      }
      if (orderItem.status !== OrderItemStatus.CONFIRMED) {
        throw new BadRequestException(
          `Order item ${shipmentItem.orderItemId} must be CONFIRMED (current: ${orderItem.status})`,
        );
      }

      // Check not already in another shipment
      const existingShipmentItem = await this.shipmentItemModel.findOne({
        orderItemId: shipmentItem.orderItemId,
      }).exec();
      if (existingShipmentItem) {
        throw new BadRequestException(
          `Order item ${shipmentItem.orderItemId} is already assigned to a shipment`,
        );
      }

      orderItemIds.push(orderItem.id);
    }

    // Create shipment
    const shipment = await this.shipmentModel.create({
      id: uuidv4(),
      orderId: dto.orderId,
      vendorId,
      status: ShipmentStatus.PENDING,
      carrier: dto.carrier || undefined,
      trackingNumber: dto.trackingNumber || undefined,
    });

    // Create shipment items
    const shipmentItems = dto.items.map((item) => ({
      id: uuidv4(),
      shipmentId: shipment.id,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
    }));
    await this.shipmentItemModel.insertMany(shipmentItems);

    // Move order to PROCESSING if it's still CONFIRMED
    if (order.status === OrderStatus.CONFIRMED) {
      await this.orderModel.findOneAndUpdate(
        { id: dto.orderId },
        { $set: { status: OrderStatus.PROCESSING } },
        { new: true }
      ).exec();
    }

    this.eventBus.emit(
      new ShipmentCreatedEvent(shipment.id, {
        orderId: dto.orderId,
        vendorId,
        orderItemIds,
      }),
    );

    const items = await this.shipmentItemModel.find({ shipmentId: shipment.id }).exec();
    (shipment as any).items = items;
    return shipment;
  }

  async markAsShipped(
    shipmentId: string,
    vendorId: string,
    dto: MarkShippedDto,
  ): Promise<Shipment> {
    const shipment = await this.shipmentModel.findOne({ id: shipmentId }).exec();
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.vendorId !== vendorId) {
      throw new BadRequestException('Shipment does not belong to your vendor account');
    }

    // Allow transition from PENDING/PICKING/PACKED to SHIPPED
    // First go through intermediary states if needed
    let currentStatus = shipment.status;
    if (currentStatus === ShipmentStatus.PENDING) {
      currentStatus = ShipmentStatus.PICKING;
    }
    if (currentStatus === ShipmentStatus.PICKING) {
      currentStatus = ShipmentStatus.PACKED;
    }
    assertShipmentTransition(currentStatus, ShipmentStatus.SHIPPED);

    const updated = await this.shipmentModel.findOneAndUpdate(
      { id: shipmentId },
      {
        $set: {
          status: ShipmentStatus.SHIPPED,
          trackingNumber: dto.trackingNumber,
          carrier: dto.carrier,
          shippingLabelUrl: dto.shippingLabelUrl || undefined,
          shippedAt: new Date(),
        },
      },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException('Shipment not found after update');

    // Now transition order items to SHIPPED
    const shipmentItems = await this.shipmentItemModel.find({ shipmentId }).exec();
    for (const si of shipmentItems) {
      await this.orderItemModel.findOneAndUpdate(
        { id: si.orderItemId, status: OrderItemStatus.CONFIRMED },
        { $set: { status: OrderItemStatus.SHIPPED } },
        { new: true }
      ).exec();
    }

    // Update order shipping status
    await this.updateOrderShippingStatus(updated.orderId);

    this.eventBus.emit(
      new ShipmentShippedEvent(updated.id, {
        orderId: updated.orderId,
        trackingNumber: dto.trackingNumber,
        carrier: dto.carrier,
      }),
    );

    return updated;
  }

  async findByVendor(
    vendorId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<Shipment>> {
    const [data, totalItems] = await Promise.all([
      this.shipmentModel
        .find({ vendorId })
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.shipmentModel.countDocuments({ vendorId }).exec(),
    ]);

    // Load items for each shipment
    const shipmentIds = data.map((s) => s.id);
    const allItems = await this.shipmentItemModel.find({ shipmentId: { $in: shipmentIds } }).exec();
    const itemsByShipment = new Map<string, ShipmentItem[]>();
    allItems.forEach((item) => {
      const list = itemsByShipment.get(item.shipmentId) || [];
      list.push(item);
      itemsByShipment.set(item.shipmentId, list);
    });
    data.forEach((shipment) => {
      (shipment as any).items = itemsByShipment.get(shipment.id) || [];
    });

    return buildPaginatedResult(data, totalItems, query.page, query.limit);
  }

  async findOneForVendor(shipmentId: string, vendorId: string): Promise<Shipment> {
    const shipment = await this.shipmentModel.findOne({ id: shipmentId, vendorId }).exec();
    if (!shipment) throw new NotFoundException('Shipment not found');
    
    const [items, trackingEvents] = await Promise.all([
      this.shipmentItemModel.find({ shipmentId }).exec(),
      this.trackingEventModel.find({ shipmentId }).sort({ occurredAt: 1 }).exec(),
    ]);
    (shipment as any).items = items;
    (shipment as any).trackingEvents = trackingEvents;
    
    return shipment;
  }

  async getTracking(shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentModel.findOne({ id: shipmentId }).exec();
    if (!shipment) throw new NotFoundException('Shipment not found');
    
    const [items, trackingEvents] = await Promise.all([
      this.shipmentItemModel.find({ shipmentId }).exec(),
      this.trackingEventModel.find({ shipmentId }).sort({ occurredAt: 1 }).exec(),
    ]);
    (shipment as any).items = items;
    (shipment as any).trackingEvents = trackingEvents;
    
    return shipment;
  }

  async processCarrierWebhook(
    headers: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<void> {
    if (!this.carrier.verifyWebhookSignature({ headers, body })) {
      throw new UnauthorizedException('Invalid carrier webhook signature');
    }

    const event = this.carrier.parseWebhook({ headers, body });

    const shipment = await this.shipmentModel.findOne({
      trackingNumber: event.trackingNumber,
    }).exec();
    if (!shipment) {
      this.logger.warn(`Shipment not found for tracking number: ${event.trackingNumber}`);
      return;
    }

    // Deduplicate: check if this exact event already exists
    const existingEvent = await this.trackingEventModel.findOne({
      shipmentId: shipment.id,
      status: event.status,
      occurredAt: event.occurredAt,
    }).exec();
    if (existingEvent) {
      this.logger.log(`Duplicate carrier event for shipment ${shipment.id}, skipping`);
      return;
    }

    // Create tracking event
    await this.trackingEventModel.create({
      id: uuidv4(),
      shipmentId: shipment.id,
      status: event.status,
      description: event.description,
      location: event.location || undefined,
      occurredAt: event.occurredAt,
      rawPayload: event.rawPayload,
    });

    // Normalize and update shipment status
    const normalizedStatus = this.normalizeCarrierStatus(event.status);
    if (normalizedStatus && canTransitionShipment(shipment.status, normalizedStatus)) {
      const fromStatus = shipment.status;
      const updateData: Record<string, unknown> = { status: normalizedStatus };

      if (normalizedStatus === ShipmentStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      }

      await this.shipmentModel.findOneAndUpdate(
        { id: shipment.id },
        { $set: updateData },
        { new: true }
      ).exec();

      this.eventBus.emit(
        new ShipmentStatusChangedEvent(shipment.id, {
          orderId: shipment.orderId,
          fromStatus,
          toStatus: normalizedStatus,
        }),
      );

      if (normalizedStatus === ShipmentStatus.DELIVERED) {
        // Update order item status to DELIVERED first
        const shipmentItems = await this.shipmentItemModel.find({ shipmentId: shipment.id }).exec();
        for (const si of shipmentItems) {
          await this.orderItemModel.findOneAndUpdate(
            { id: si.orderItemId, status: OrderItemStatus.SHIPPED },
            { $set: { status: OrderItemStatus.DELIVERED } },
            { new: true }
          ).exec();
        }

        // Check if all order items are delivered
        await this.checkOrderDelivered(shipment.orderId);

        // Emit delivered event after all state mutations are committed
        await this.eventBus.emitAsync(
          new ShipmentDeliveredEvent(shipment.id, {
            orderId: shipment.orderId,
          }),
        );
      }
    }
  }

  async cancelPendingShipments(orderId: string): Promise<void> {
    await this.shipmentModel.updateMany(
      { orderId, status: { $in: [ShipmentStatus.PENDING, ShipmentStatus.PICKING, ShipmentStatus.PACKED] } },
      { $set: { status: ShipmentStatus.CANCELLED } }
    ).exec();
  }

  private normalizeCarrierStatus(carrierStatus: string): ShipmentStatus | null {
    const mapping: Record<string, ShipmentStatus> = {
      shipped: ShipmentStatus.SHIPPED,
      in_transit: ShipmentStatus.IN_TRANSIT,
      out_for_delivery: ShipmentStatus.OUT_FOR_DELIVERY,
      delivered: ShipmentStatus.DELIVERED,
      failed_delivery: ShipmentStatus.FAILED_DELIVERY,
      returned: ShipmentStatus.RETURNED,
    };
    return mapping[carrierStatus.toLowerCase()] || null;
  }

  private async updateOrderShippingStatus(orderId: string): Promise<void> {
    const order = await this.orderModel.findOne({ id: orderId }).exec();
    if (!order) return;

    const items = await this.orderItemModel.find({ orderId }).exec();

    const allShipped = items.every(
      (i) => i.status === OrderItemStatus.SHIPPED || i.status === OrderItemStatus.DELIVERED,
    );
    const someShipped = items.some(
      (i) => i.status === OrderItemStatus.SHIPPED || i.status === OrderItemStatus.DELIVERED,
    );

    if (allShipped && order.status === OrderStatus.PROCESSING) {
      await this.orderModel.findOneAndUpdate(
        { id: orderId },
        { $set: { status: OrderStatus.SHIPPED } },
        { new: true }
      ).exec();
    } else if (someShipped && order.status === OrderStatus.PROCESSING) {
      await this.orderModel.findOneAndUpdate(
        { id: orderId },
        { $set: { status: OrderStatus.PARTIALLY_SHIPPED } },
        { new: true }
      ).exec();
    }
  }

  private async checkOrderDelivered(orderId: string): Promise<void> {
    const order = await this.orderModel.findOne({ id: orderId }).exec();
    if (!order) return;

    const items = await this.orderItemModel.find({ orderId }).exec();

    const allDelivered = items.every(
      (i) => i.status === OrderItemStatus.DELIVERED,
    );
    if (
      allDelivered &&
      (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.PARTIALLY_SHIPPED)
    ) {
      // If partially shipped, go through SHIPPED first
      if (order.status === OrderStatus.PARTIALLY_SHIPPED) {
        await this.orderModel.findOneAndUpdate(
          { id: orderId },
          { $set: { status: OrderStatus.SHIPPED } },
          { new: true }
        ).exec();
      }
      await this.orderModel.findOneAndUpdate(
        { id: orderId },
        { $set: { status: OrderStatus.DELIVERED } },
        { new: true }
      ).exec();
    }
  }
}
