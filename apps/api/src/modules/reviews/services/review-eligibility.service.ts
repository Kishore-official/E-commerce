import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ReviewEligibilityStatus } from '@ecommerce/shared-types';
import { EventBusService } from '@common/events/event-bus.service';
import { ReviewEligibility, ReviewEligibilityDocument } from '../schemas/review-eligibility.schema';
import { ShipmentItem, ShipmentItemDocument } from '@modules/logistics/schemas/shipment-item.schema';
import { Order, OrderDocument } from '@modules/orders/schemas/order.schema';
import { OrderItem, OrderItemDocument } from '@modules/orders/schemas/order-item.schema';
import { Offer, OfferDocument } from '@modules/offers/schemas/offer.schema';
import { Product, ProductDocument } from '@modules/catalog/schemas/product.schema';
import { Variant, VariantDocument } from '@modules/catalog/schemas/variant.schema';
import { ReviewEligibilityCreatedEvent } from '../events/review.events';
import { ReviewEligibilityDto } from '../dto';

@Injectable()
export class ReviewEligibilityService {
  private readonly logger = new Logger(ReviewEligibilityService.name);

  constructor(
    @InjectModel(ReviewEligibility.name)
    private readonly eligibilityModel: Model<ReviewEligibilityDocument>,
    @InjectModel(ShipmentItem.name)
    private readonly shipmentItemModel: Model<ShipmentItemDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    private readonly eventBus: EventBusService,
  ) {}

  async createForDeliveredShipment(
    shipmentId: string,
    orderId: string,
  ): Promise<void> {
    try {
      // Find shipment items for this delivery
      const shipmentItems = await this.shipmentItemModel.find({ shipmentId }).exec();

      if (shipmentItems.length === 0) {
        this.logger.warn(`No shipment items found for shipment ${shipmentId}`);
        return;
      }

      // Get the order for userId
      const order = await this.orderModel.findOne({ id: orderId }).exec();
      if (!order) {
        this.logger.warn(`Order ${orderId} not found for eligibility creation`);
        return;
      }

      const eligibleUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      for (const si of shipmentItems) {
        const idempotencyKey = `review-eligibility:${si.orderItemId}`;

        // Idempotency check
        const existing = await this.eligibilityModel.findOne({ idempotencyKey }).exec();
        if (existing) {
          this.logger.debug(
            `Review eligibility already exists for order item ${si.orderItemId}`,
          );
          continue;
        }

        // Get order item → offer → product/variant IDs
        const orderItem = await this.orderItemModel.findOne({ id: si.orderItemId }).exec();
        if (!orderItem) {
          this.logger.warn(`OrderItem ${si.orderItemId} not found`);
          continue;
        }

        const offer = await this.offerModel.findOne({ id: orderItem.offerId }).exec();
        if (!offer) {
          this.logger.warn(`Offer ${orderItem.offerId} not found`);
          continue;
        }

        const eligibility = await this.eligibilityModel.create({
          id: uuidv4(),
          orderId,
          orderItemId: si.orderItemId,
          userId: order.userId,
          productId: offer.productId,
          variantId: offer.variantId,
          status: ReviewEligibilityStatus.ELIGIBLE,
          eligibleUntil,
          idempotencyKey,
        });

        this.eventBus.emit(
          new ReviewEligibilityCreatedEvent(eligibility.id, {
            orderId,
            orderItemId: si.orderItemId,
            userId: order.userId,
            productId: offer.productId,
          }),
        );

        this.logger.log(
          `Created review eligibility ${eligibility.id} for order item ${si.orderItemId}`,
        );
      }
    } catch (err) {
      // Don't block the delivery flow
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Failed to create review eligibilities for shipment ${shipmentId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async findByUser(userId: string): Promise<ReviewEligibilityDto[]> {
    const eligibilities = await this.eligibilityModel
      .find({
        userId,
        status: ReviewEligibilityStatus.ELIGIBLE,
      })
      .sort({ createdAt: -1 })
      .exec();

    // Load product and variant data for enrichment
    const productIds = [...new Set(eligibilities.map((e) => e.productId))];
    const variantIds = [...new Set(eligibilities.map((e) => e.variantId))];

    const [products, variants] = await Promise.all([
      productIds.length ? this.productModel.find({ id: { $in: productIds } }).exec() : [],
      variantIds.length ? this.variantModel.find({ id: { $in: variantIds } }).exec() : [],
    ]);
    const productMap = new Map(products.map((p: any) => [p.id, p] as [string, any]));
    const variantMap = new Map(variants.map((v: any) => [v.id, v] as [string, any]));

    return eligibilities.map((e) => {
      const product = productMap.get(e.productId);
      const variant = variantMap.get(e.variantId);
      return {
        id: e.id,
        orderId: e.orderId,
        orderItemId: e.orderItemId,
        userId: e.userId,
        productId: e.productId,
        variantId: e.variantId,
        status: e.status,
        eligibleUntil: e.eligibleUntil,
        createdAt: e.createdAt,
        productName: product?.name ?? 'Unknown Product',
        variantName: variant?.name ?? '',
        productSlug: product?.slug ?? '',
      };
    });
  }

  async findById(eligibilityId: string): Promise<ReviewEligibility | null> {
    return this.eligibilityModel.findOne({ id: eligibilityId }).exec();
  }

  async findByIdEnriched(eligibilityId: string): Promise<ReviewEligibilityDto | null> {
    const eligibility = await this.eligibilityModel.findOne({ id: eligibilityId }).exec();
    if (!eligibility) return null;

    // Load product and variant for enrichment
    const [product, variant] = await Promise.all([
      this.productModel.findOne({ id: eligibility.productId }).exec(),
      this.variantModel.findOne({ id: eligibility.variantId }).exec(),
    ]);

    return {
      id: eligibility.id,
      orderId: eligibility.orderId,
      orderItemId: eligibility.orderItemId,
      userId: eligibility.userId,
      productId: eligibility.productId,
      variantId: eligibility.variantId,
      status: eligibility.status,
      eligibleUntil: eligibility.eligibleUntil,
      createdAt: eligibility.createdAt,
      productName: product?.name ?? 'Unknown Product',
      variantName: variant?.name ?? '',
      productSlug: product?.slug ?? '',
    };
  }

  async markAsUsed(eligibilityId: string): Promise<void> {
    const result = await this.eligibilityModel.findOneAndUpdate(
      { id: eligibilityId, status: ReviewEligibilityStatus.ELIGIBLE },
      { $set: { status: ReviewEligibilityStatus.REVIEW_SUBMITTED } },
      { new: true }
    ).exec();
    if (!result) {
      throw new BadRequestException(
        'Eligibility already used or not found',
      );
    }
  }
}
