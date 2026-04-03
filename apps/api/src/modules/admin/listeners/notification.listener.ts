import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationType } from '@ecommerce/shared-types';
import { DomainEvent } from '@common/events/domain-event.base';
import { NotificationService } from '../services/notification.service';
import { Vendor, VendorDocument } from '@modules/identity/schemas/vendor.schema';
import { Product, ProductDocument } from '@modules/catalog/schemas/product.schema';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  // ── Vendor Notifications ───────────────────────────────────

  @OnEvent('orders.order.created')
  async onOrderCreated(event: DomainEvent): Promise<void> {
    const { orderNumber, grandTotal, currency, itemCount } = event.payload as {
      userId: string;
      orderNumber: string;
      grandTotal: number;
      currency: string;
      countryCode: string;
      itemCount: number;
    };

    // Notify admins about new orders
    await this.notificationService.createForAdmins({
      type: NotificationType.ORDER_CREATED,
      title: 'New Order Placed',
      message: `Order #${orderNumber} placed — ${itemCount} item(s)`,
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('offers.offer.approved')
  async onOfferApproved(event: DomainEvent): Promise<void> {
    const { vendorId } = event.payload as { vendorId: string; adminUserId: string };
    const userId = await this.resolveVendorUserId(vendorId);
    if (!userId) return;

    await this.notificationService.create({
      userId,
      type: NotificationType.OFFER_APPROVED,
      title: 'Offer Approved',
      message: 'Your offer has been approved and is now active',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('offers.offer.rejected')
  async onOfferRejected(event: DomainEvent): Promise<void> {
    const { vendorId, reason } = event.payload as { vendorId: string; adminUserId: string; reason?: string };
    const userId = await this.resolveVendorUserId(vendorId);
    if (!userId) return;

    await this.notificationService.create({
      userId,
      type: NotificationType.OFFER_REJECTED,
      title: 'Offer Rejected',
      message: reason ? `Your offer was rejected: ${reason}` : 'Your offer was rejected',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('catalog.product.approved')
  async onProductApproved(event: DomainEvent): Promise<void> {
    const userId = await this.resolveProductOwnerUserId(event.aggregateId);
    if (!userId) return;

    await this.notificationService.create({
      userId,
      type: NotificationType.PRODUCT_APPROVED,
      title: 'Product Approved',
      message: 'Your product has been approved',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('catalog.product.rejected')
  async onProductRejected(event: DomainEvent): Promise<void> {
    const { reason } = event.payload as { rejectedBy: string; reason?: string };
    const userId = await this.resolveProductOwnerUserId(event.aggregateId);
    if (!userId) return;

    await this.notificationService.create({
      userId,
      type: NotificationType.PRODUCT_REJECTED,
      title: 'Product Rejected',
      message: reason ? `Your product was rejected: ${reason}` : 'Your product was rejected',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('offers.offer.stock_depleted')
  async onStockDepleted(event: DomainEvent): Promise<void> {
    const { vendorId } = event.payload as { vendorId: string };
    const userId = await this.resolveVendorUserId(vendorId);
    if (!userId) return;

    await this.notificationService.create({
      userId,
      type: NotificationType.STOCK_DEPLETED,
      title: 'Stock Depleted',
      message: 'Your offer is out of stock',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('payments.payment.succeeded')
  async onPaymentSucceeded(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload as { orderId: string; amount: number; currency: string };

    await this.notificationService.createForAdmins({
      type: NotificationType.PAYMENT_SUCCEEDED,
      title: 'Payment Received',
      message: `Payment received for order`,
      relatedEntityId: orderId,
    });
  }

  @OnEvent('payments.payment.failed')
  async onPaymentFailed(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload as { orderId: string; errorMessage?: string };

    await this.notificationService.createForAdmins({
      type: NotificationType.PAYMENT_FAILED,
      title: 'Payment Failed',
      message: `Payment failed for order`,
      relatedEntityId: orderId,
    });
  }

  // ── Admin Notifications ────────────────────────────────────

  @OnEvent('identity.vendor.registered')
  async onVendorRegistered(event: DomainEvent): Promise<void> {
    await this.notificationService.createForAdmins({
      type: NotificationType.VENDOR_REGISTERED,
      title: 'New Vendor Registration',
      message: 'A new vendor has registered and needs review',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('catalog.product.submitted_for_review')
  async onProductSubmitted(event: DomainEvent): Promise<void> {
    await this.notificationService.createForAdmins({
      type: NotificationType.PRODUCT_SUBMITTED,
      title: 'Product Pending Review',
      message: 'A product has been submitted for review',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('offers.offer.submitted_for_review')
  async onOfferSubmitted(event: DomainEvent): Promise<void> {
    await this.notificationService.createForAdmins({
      type: NotificationType.OFFER_SUBMITTED,
      title: 'Offer Pending Review',
      message: 'An offer has been submitted for review',
      relatedEntityId: event.aggregateId,
    });
  }

  @OnEvent('reviews.review.submitted')
  async onReviewSubmitted(event: DomainEvent): Promise<void> {
    await this.notificationService.createForAdmins({
      type: NotificationType.REVIEW_SUBMITTED,
      title: 'Review Pending Moderation',
      message: 'A new review has been submitted',
      relatedEntityId: event.aggregateId,
    });
  }

  // ── Helper ─────────────────────────────────────────────────

  private async resolveVendorUserId(vendorId: string): Promise<string | null> {
    const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
    if (!vendor) {
      this.logger.warn(`Vendor ${vendorId} not found for notification`);
      return null;
    }
    return vendor.userId;
  }

  private async resolveProductOwnerUserId(productId: string): Promise<string | null> {
    const product = await this.productModel.findOne({ id: productId }).exec();
    if (!product) return null;
    return this.resolveVendorUserId(product.vendorId);
  }
}
