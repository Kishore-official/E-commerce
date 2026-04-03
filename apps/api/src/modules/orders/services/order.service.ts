import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  OrderStatus,
  OrderItemStatus,
  OfferStatus,
  PaginatedResult,
} from '@ecommerce/shared-types';
import { EventBusService } from '@common/events/event-bus.service';
import { Order, OrderDocument } from '../schemas/order.schema';
import { OrderItem, OrderItemDocument } from '../schemas/order-item.schema';
import { OrderStatusHistory, OrderStatusHistoryDocument } from '../schemas/order-status-history.schema';
import { Offer, OfferDocument } from '@modules/offers/schemas/offer.schema';
import { Product, ProductDocument } from '@modules/catalog/schemas/product.schema';
import { Variant, VariantDocument } from '@modules/catalog/schemas/variant.schema';
import { CartService } from '@modules/cart/services/cart.service';
import { CouponService } from '@modules/coupons/services/coupon.service';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { CreateOrderDto, OrderQueryDto, CancelOrderDto, AdminUpdateStatusDto } from '../dto';
import { assertOrderTransition } from '../state-machines/order-status.machine';
import { assertOrderItemTransition } from '../state-machines/order-item-status.machine';
import { generateOrderNumber } from '../utils/order-number.util';
import {
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
  OrderStatusChangedEvent,
} from '../events/order.events';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(OrderStatusHistory.name)
    private readonly statusHistoryModel: Model<OrderStatusHistoryDocument>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly cartService: CartService,
    private readonly couponService: CouponService,
    private readonly eventBus: EventBusService,
  ) {}

  async createFromCart(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<Order> {
    // Idempotency check
    const existing = await this.orderModel.findOne({ idempotencyKey }).exec();
    if (existing) {
      const items = await this.orderItemModel.find({ orderId: existing.id }).exec();
      (existing as any).items = items;
      return existing;
    }

    // Validate cart
    const cart = await this.cartService.getCartForCheckout(userId);

    // Build order in a MongoDB transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const orderNumber = generateOrderNumber();
      let subtotal = 0;

      // Create order
      const newOrder = await this.orderModel.create([{
        id: uuidv4(),
        orderNumber,
        userId,
        countryCode: dto.shippingAddress.countryCode,
        status: OrderStatus.PENDING_PAYMENT,
        subtotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        currency: (cart.items as any[])[0].currency,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress || undefined,
        notes: dto.notes || undefined,
        idempotencyKey,
      }], { session });

      const savedOrder = newOrder[0];

      // Create order items
      for (const cartItem of cart.items as any[]) {
        const offer = await this.offerModel.findOne({ id: cartItem.offerId }).session(session).exec();
        if (!offer || offer.status !== OfferStatus.ACTIVE) {
          throw new BadRequestException(`Offer ${cartItem.offerId} is no longer available`);
        }

        const [product, variant] = await Promise.all([
          this.productModel.findOne({ id: offer.productId }).session(session).exec(),
          this.variantModel.findOne({ id: offer.variantId }).session(session).exec(),
        ]);

        const totalPrice = cartItem.priceSnapshot * cartItem.quantity;
        subtotal += totalPrice;

        await this.orderItemModel.create([{
          id: uuidv4(),
          orderId: savedOrder.id,
          offerId: cartItem.offerId,
          vendorId: offer.vendorId,
          productName: product?.name || 'Unknown Product',
          variantName: variant?.name || 'Default',
          sku: variant?.sku || '',
          quantity: cartItem.quantity,
          unitPrice: cartItem.priceSnapshot,
          totalPrice,
          currency: cartItem.currency,
          offerType: offer.offerType,
          status: OrderItemStatus.PENDING,
        }], { session });

        // Reserve stock atomically with availability check
        const reserved = await this.offerModel.findOneAndUpdate(
          {
            id: offer.id,
            $expr: {
              $lte: [
                { $add: ['$stockReserved', cartItem.quantity] },
                '$stockQuantity',
              ],
            },
          },
          { $inc: { stockReserved: cartItem.quantity } },
          { session, new: true }
        ).exec();
        if (!reserved) {
          throw new BadRequestException(
            `Insufficient stock for offer ${cartItem.offerId}`,
          );
        }
      }

      // Apply coupon if provided
      let discountTotal = 0;
      let appliedCouponId: string | undefined;
      const couponCode = dto.couponCode || (cart as any).appliedCouponCode;

      if (couponCode) {
        try {
          const couponResult = await this.couponService.validateCoupon(couponCode, userId, subtotal);
          discountTotal = couponResult.discountAmount;
          appliedCouponId = couponResult.coupon.id;
        } catch (err: any) {
          this.logger.warn(`Coupon "${couponCode}" not applied: ${err.message}`);
          // Don't fail the order — just skip the coupon
        }
      }

      // Update totals with tax
      const vatRate = savedOrder.countryCode === 'SA' ? 0.15
        : savedOrder.countryCode === 'IN' ? 0.18
        : 0;
      const taxTotal = Math.round(subtotal * vatRate);
      const grandTotal = subtotal + savedOrder.shippingTotal + taxTotal - discountTotal;

      await this.orderModel.findOneAndUpdate(
        { id: savedOrder.id },
        { $set: { subtotal, taxTotal, discountTotal, grandTotal } },
        { session, new: true }
      ).exec();

      // Status history
      await this.statusHistoryModel.create([{
        id: uuidv4(),
        orderId: savedOrder.id,
        status: OrderStatus.PENDING_PAYMENT,
        changedBy: userId,
        notes: 'Order created',
      }], { session });

      await session.commitTransaction();
      session.endSession();

      const order = await this.findById(savedOrder.id);

      // Record coupon usage
      if (appliedCouponId && discountTotal > 0) {
        await this.couponService.recordUsage(appliedCouponId, userId, order.id, discountTotal);
      }

      // Mark cart as converted
      await this.cartService.convertCart(cart.id, order.id);

      // Emit event
      this.eventBus.emit(
        new OrderCreatedEvent(order.id, {
          userId,
          orderNumber: order.orderNumber,
          grandTotal: order.grandTotal,
          currency: order.currency,
          countryCode: order.countryCode,
          itemCount: (cart.items as any[]).length,
        }),
      );

      return order;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async createFromBuyNow(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<Order> {
    const existing = await this.orderModel.findOne({ idempotencyKey }).exec();
    if (existing) {
      const items = await this.orderItemModel.find({ orderId: existing.id }).exec();
      (existing as any).items = items;
      return existing;
    }

    const buyNowItems = dto.buyNowItems!;
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const orderNumber = generateOrderNumber();
      let subtotal = 0;
      let currency = 'INR';

      const newOrder = await this.orderModel.create([{
        id: uuidv4(),
        orderNumber,
        userId,
        countryCode: dto.shippingAddress.countryCode,
        status: OrderStatus.PENDING_PAYMENT,
        subtotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        currency: 'INR',
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress || undefined,
        notes: dto.notes || undefined,
        idempotencyKey,
      }], { session });

      const savedOrder = newOrder[0];

      for (const buyNowItem of buyNowItems) {
        const offer = await this.offerModel.findOne({
          id: buyNowItem.offerId,
          deletedAt: null,
        }).session(session).exec();
        if (!offer || offer.status !== OfferStatus.ACTIVE) {
          throw new BadRequestException(`Offer ${buyNowItem.offerId} is no longer available`);
        }

        const [product, variant] = await Promise.all([
          this.productModel.findOne({ id: offer.productId }).session(session).exec(),
          this.variantModel.findOne({ id: offer.variantId }).session(session).exec(),
        ]);

        currency = offer.priceCurrency;
        const totalPrice = offer.priceAmount * buyNowItem.quantity;
        subtotal += totalPrice;

        await this.orderItemModel.create([{
          id: uuidv4(),
          orderId: savedOrder.id,
          offerId: buyNowItem.offerId,
          vendorId: offer.vendorId,
          productName: product?.name || 'Unknown Product',
          variantName: variant?.name || 'Default',
          sku: variant?.sku || '',
          quantity: buyNowItem.quantity,
          unitPrice: offer.priceAmount,
          totalPrice,
          currency: offer.priceCurrency,
          offerType: offer.offerType,
          status: OrderItemStatus.PENDING,
        }], { session });

        const reserved = await this.offerModel.findOneAndUpdate(
          {
            id: offer.id,
            $expr: {
              $lte: [
                { $add: ['$stockReserved', buyNowItem.quantity] },
                '$stockQuantity',
              ],
            },
          },
          { $inc: { stockReserved: buyNowItem.quantity } },
          { session, new: true }
        ).exec();
        if (!reserved) {
          throw new BadRequestException(
            `Insufficient stock for offer ${buyNowItem.offerId}`,
          );
        }
      }

      const vatRate = savedOrder.countryCode === 'SA' ? 0.15
        : savedOrder.countryCode === 'IN' ? 0.18
        : 0;
      const taxTotal = Math.round(subtotal * vatRate);
      const grandTotal = subtotal + savedOrder.shippingTotal + taxTotal - savedOrder.discountTotal;

      await this.orderModel.findOneAndUpdate(
        { id: savedOrder.id },
        { $set: { subtotal, taxTotal, grandTotal, currency } },
        { session, new: true }
      ).exec();

      await this.statusHistoryModel.create([{
        id: uuidv4(),
        orderId: savedOrder.id,
        status: OrderStatus.PENDING_PAYMENT,
        changedBy: userId,
        notes: 'Order created (Buy Now)',
      }], { session });

      await session.commitTransaction();
      session.endSession();

      const order = await this.findById(savedOrder.id);

      this.eventBus.emit(
        new OrderCreatedEvent(order.id, {
          userId,
          orderNumber: order.orderNumber,
          grandTotal: order.grandTotal,
          currency: order.currency,
          countryCode: order.countryCode,
          itemCount: buyNowItems.length,
        }),
      );

      return order;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async findById(orderId: string, userId?: string): Promise<Order> {
    const filter: Record<string, unknown> = { id: orderId };
    if (userId) filter.userId = userId;

    const order = await this.orderModel.findOne(filter).exec();
    if (!order) throw new NotFoundException('Order not found');
    
    const [items, statusHistory] = await Promise.all([
      this.orderItemModel.find({ orderId }).exec(),
      this.statusHistoryModel.find({ orderId }).sort({ createdAt: 1 }).exec(),
    ]);
    
    (order as any).items = items;
    (order as any).statusHistory = statusHistory;
    
    return order;
  }

  async findByUser(
    userId: string,
    query: OrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    const filter: Record<string, unknown> = { userId };
    if (query.status) filter.status = query.status;
    if (query.countryCode) filter.countryCode = query.countryCode;

    const [data, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    // Load items for each order
    const orderIds = data.map((o) => o.id);
    const allItems = await this.orderItemModel.find({ orderId: { $in: orderIds } }).exec();
    const itemsByOrder = new Map<string, OrderItem[]>();
    allItems.forEach((item) => {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    });
    data.forEach((order) => {
      (order as any).items = itemsByOrder.get(order.id) || [];
    });

    return buildPaginatedResult(data, totalItems, query.page, query.limit);
  }

  async findByVendor(
    vendorId: string,
    query: OrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    // Find order items for this vendor first
    const itemFilter: Record<string, unknown> = { vendorId };
    const vendorItems = await this.orderItemModel.find(itemFilter).exec();
    const orderIds = [...new Set(vendorItems.map((i) => i.orderId))];

    if (orderIds.length === 0) {
      return buildPaginatedResult([], 0, query.page, query.limit);
    }

    const filter: Record<string, unknown> = { id: { $in: orderIds } };
    if (query.status) filter.status = query.status;

    const [data, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    // Load all items and filter to vendor items only
    const allOrderIds = data.map((o) => o.id);
    const allItems = await this.orderItemModel.find({ orderId: { $in: allOrderIds } }).exec();
    const itemsByOrder = new Map<string, OrderItem[]>();
    allItems.forEach((item) => {
      if (item.vendorId === vendorId) {
        const list = itemsByOrder.get(item.orderId) || [];
        list.push(item);
        itemsByOrder.set(item.orderId, list);
      }
    });
    
    const filtered = data.map((order) => ({
      ...order.toObject(),
      items: itemsByOrder.get(order.id) || [],
    })) as Order[];

    return buildPaginatedResult(filtered, totalItems, query.page, query.limit);
  }

  async findOneForVendor(orderId: string, vendorId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ id: orderId }).exec();
    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    const allItems = await this.orderItemModel.find({ orderId }).exec();
    const vendorItems = allItems.filter((i) => i.vendorId === vendorId);
    
    if (vendorItems.length === 0) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    return { ...order.toObject(), items: vendorItems } as Order;
  }

  async findAll(query: OrderQueryDto): Promise<PaginatedResult<Order>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.countryCode) filter.countryCode = query.countryCode;

    const [data, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    // Load items for each order
    const orderIds = data.map((o) => o.id);
    const allItems = await this.orderItemModel.find({ orderId: { $in: orderIds } }).exec();
    const itemsByOrder = new Map<string, OrderItem[]>();
    allItems.forEach((item) => {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    });
    data.forEach((order) => {
      (order as any).items = itemsByOrder.get(order.id) || [];
    });

    return buildPaginatedResult(data, totalItems, query.page, query.limit);
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    dto: CancelOrderDto,
  ): Promise<Order> {
    const order = await this.findById(orderId, userId);
    assertOrderTransition(order.status, OrderStatus.CANCELLED);

    return this.transitionStatus(
      order,
      OrderStatus.CANCELLED,
      userId,
      dto.reason,
    );
  }

  async confirmOrder(orderId: string, paymentId: string): Promise<void> {
    const order = await this.findById(orderId);
    assertOrderTransition(order.status, OrderStatus.CONFIRMED);

    await this.transitionStatus(
      order,
      OrderStatus.CONFIRMED,
      null,
      `Payment ${paymentId} succeeded`,
    );

    this.eventBus.emit(new OrderConfirmedEvent(order.id, order.userId));
  }

  async confirmOrderItems(orderId: string, vendorId: string): Promise<Order> {
    const order = await this.findById(orderId);

    if (order.status === OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Cannot confirm items on an order that is awaiting payment',
      );
    }

    const items = (order.items || []).filter(
      (i) => i.vendorId === vendorId && i.status === OrderItemStatus.PENDING,
    );
    if (items.length === 0) {
      throw new BadRequestException('No pending items to confirm for this vendor');
    }

    for (const item of items) {
      assertOrderItemTransition(item.status, OrderItemStatus.CONFIRMED);
      await this.orderItemModel.findOneAndUpdate(
        { id: item.id },
        { $set: { status: OrderItemStatus.CONFIRMED } },
        { new: true }
      ).exec();
    }

    // If order is CONFIRMED, transition to PROCESSING
    if (order.status === OrderStatus.CONFIRMED) {
      assertOrderTransition(order.status, OrderStatus.PROCESSING);
      await this.transitionStatus(order, OrderStatus.PROCESSING, null, 'Vendor confirmed items');
    }

    return this.findById(orderId);
  }

  async adminUpdateStatus(
    orderId: string,
    dto: AdminUpdateStatusDto,
    adminUserId: string,
  ): Promise<Order> {
    const order = await this.findById(orderId);
    assertOrderTransition(order.status, dto.status);

    return this.transitionStatus(
      order,
      dto.status,
      adminUserId,
      dto.reason,
    );
  }

  async updateOrderShippingStatus(orderId: string): Promise<void> {
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
      await this.transitionStatus(order, OrderStatus.SHIPPED, null, 'All items shipped');
    } else if (someShipped && order.status === OrderStatus.PROCESSING) {
      await this.transitionStatus(order, OrderStatus.PARTIALLY_SHIPPED, null, 'Some items shipped');
    }
  }

  private async transitionStatus(
    order: Order,
    toStatus: OrderStatus,
    changedBy: string | null,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<Order> {
    const fromStatus = order.status;
    const updateData: Record<string, unknown> = { status: toStatus };

    if (toStatus === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      // Release reserved stock
      const items = (order.items as any[]) || await this.orderItemModel.find({ orderId: order.id }).exec();
      for (const item of items) {
        await this.offerModel.findOneAndUpdate(
          { id: item.offerId },
          { $inc: { stockReserved: -item.quantity } }
        ).exec();
      }
    }
    if (toStatus === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updated = await this.orderModel.findOneAndUpdate(
      { id: order.id },
      { $set: updateData },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Order '${order.id}' not found`);

    await this.statusHistoryModel.create({
      id: uuidv4(),
      orderId: order.id,
      status: toStatus,
      changedBy: changedBy || undefined,
      notes: reason || undefined,
    });

    this.eventBus.emit(
      new OrderStatusChangedEvent(order.id, {
        fromStatus,
        toStatus,
        changedBy: changedBy || undefined,
        reason,
      }),
    );

    if (toStatus === OrderStatus.CANCELLED) {
      this.eventBus.emit(
        new OrderCancelledEvent(order.id, {
          userId: order.userId,
          reason,
        }),
      );
    }

    return updated;
  }

}
