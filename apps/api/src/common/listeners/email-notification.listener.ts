import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DomainEvent } from '@common/events/domain-event.base';
import { EMAIL_SERVICE_PORT, EmailServicePort } from '@common/services/email/email.port';
import { EmailTemplateService } from '@common/services/email/email-template.service';
import { SMS_SERVICE_PORT, SmsServicePort } from '@common/services/sms/sms.port';
import { User, UserDocument } from '@modules/identity/schemas/user.schema';
import { Vendor, VendorDocument } from '@modules/identity/schemas/vendor.schema';
import { Order, OrderDocument } from '@modules/orders/schemas/order.schema';

@Injectable()
export class EmailNotificationListener {
  private readonly logger = new Logger(EmailNotificationListener.name);

  constructor(
    @Inject(EMAIL_SERVICE_PORT)
    private readonly emailService: EmailServicePort,
    @Inject(SMS_SERVICE_PORT)
    private readonly smsService: SmsServicePort,
    private readonly templates: EmailTemplateService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  // ── Order Events ─────────────────────────────────────────────

  @OnEvent('orders.order.confirmed')
  async onOrderConfirmed(event: DomainEvent): Promise<void> {
    try {
      const { userId, orderNumber, grandTotal, currency, itemCount } = event.payload as {
        userId: string;
        orderNumber: string;
        grandTotal: number;
        currency: string;
        itemCount: number;
      };

      const user = await this.userModel.findOne({ id: userId }).exec();
      if (!user) return;

      const email = this.templates.orderConfirmation({
        customerName: user.firstName,
        orderNumber,
        grandTotal,
        currency,
        itemCount,
      });

      await this.emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: ['order-confirmed'],
      });

      if (user.phone) {
        await this.smsService.sendSms({
          to: user.phone,
          message: `MERIDIAN: Order #${orderNumber} confirmed! Total: ${this.formatCurrency(grandTotal, currency)}. Track at meridian.com/account/orders`,
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to send order confirmation: ${error.message}`, error.stack);
    }
  }

  // ── Payment Events ───────────────────────────────────────────

  @OnEvent('payments.payment.succeeded')
  async onPaymentSucceeded(event: DomainEvent): Promise<void> {
    try {
      const { orderId, amount, currency } = event.payload as {
        orderId: string;
        amount: number;
        currency: string;
      };

      const order = await this.orderModel.findOne({ id: orderId }).exec();
      if (!order) return;

      const user = await this.userModel.findOne({ id: order.userId }).exec();
      if (!user) return;

      const email = this.templates.paymentSuccess({
        customerName: user.firstName,
        orderNumber: order.orderNumber,
        amount,
        currency,
      });

      await this.emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: ['payment-success'],
      });
    } catch (error: any) {
      this.logger.error(`Failed to send payment success email: ${error.message}`, error.stack);
    }
  }

  @OnEvent('payments.payment.failed')
  async onPaymentFailed(event: DomainEvent): Promise<void> {
    try {
      const { orderId } = event.payload as { orderId: string };

      const order = await this.orderModel.findOne({ id: orderId }).exec();
      if (!order) return;

      const user = await this.userModel.findOne({ id: order.userId }).exec();
      if (!user) return;

      const email = this.templates.paymentFailed({
        customerName: user.firstName,
        orderNumber: order.orderNumber,
        amount: order.grandTotal,
        currency: order.currency,
      });

      await this.emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: ['payment-failed'],
      });
    } catch (error: any) {
      this.logger.error(`Failed to send payment failed email: ${error.message}`, error.stack);
    }
  }

  // ── Shipment Events ──────────────────────────────────────────

  @OnEvent('logistics.shipment.shipped')
  async onShipmentShipped(event: DomainEvent): Promise<void> {
    await this.sendShipmentEmail(event, 'shipped');
  }

  @OnEvent('logistics.shipment.delivered')
  async onShipmentDelivered(event: DomainEvent): Promise<void> {
    await this.sendShipmentEmail(event, 'delivered');
  }

  private async sendShipmentEmail(event: DomainEvent, status: string): Promise<void> {
    try {
      const { orderId, trackingNumber, carrier } = event.payload as {
        orderId: string;
        trackingNumber?: string;
        carrier?: string;
      };

      const order = await this.orderModel.findOne({ id: orderId }).exec();
      if (!order) return;

      const user = await this.userModel.findOne({ id: order.userId }).exec();
      if (!user) return;

      const email = this.templates.shipmentUpdate({
        customerName: user.firstName,
        orderNumber: order.orderNumber,
        trackingNumber,
        carrier,
        status,
      });

      await this.emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [`shipment-${status}`],
      });

      if (user.phone && status === 'shipped') {
        await this.smsService.sendSms({
          to: user.phone,
          message: `MERIDIAN: Order #${order.orderNumber} shipped!${trackingNumber ? ` Tracking: ${trackingNumber}` : ''} Track at meridian.com/account/orders`,
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to send shipment email: ${error.message}`, error.stack);
    }
  }

  // ── Vendor Events ────────────────────────────────────────────

  @OnEvent('catalog.product.approved')
  async onProductApproved(event: DomainEvent): Promise<void> {
    await this.sendVendorApprovalEmail(event.aggregateId, 'Product', true);
  }

  @OnEvent('catalog.product.rejected')
  async onProductRejected(event: DomainEvent): Promise<void> {
    const { reason } = event.payload as { reason?: string };
    await this.sendVendorApprovalEmail(event.aggregateId, 'Product', false, reason);
  }

  @OnEvent('offers.offer.approved')
  async onOfferApproved(event: DomainEvent): Promise<void> {
    const { vendorId } = event.payload as { vendorId: string };
    await this.sendVendorNotificationByVendorId(vendorId, 'Offer', true);
  }

  @OnEvent('offers.offer.rejected')
  async onOfferRejected(event: DomainEvent): Promise<void> {
    const { vendorId, reason } = event.payload as { vendorId: string; reason?: string };
    await this.sendVendorNotificationByVendorId(vendorId, 'Offer', false, reason);
  }

  @OnEvent('offers.offer.stock_depleted')
  async onStockDepleted(event: DomainEvent): Promise<void> {
    try {
      const { vendorId, productName } = event.payload as { vendorId: string; productName?: string };
      const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
      if (!vendor) return;

      const user = await this.userModel.findOne({ id: vendor.userId }).exec();
      if (!user) return;

      const email = this.templates.stockDepleted(
        vendor.businessName,
        productName || 'your product',
      );

      await this.emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: ['stock-depleted'],
      });
    } catch (error: any) {
      this.logger.error(`Failed to send stock depleted email: ${error.message}`, error.stack);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async sendVendorApprovalEmail(
    productId: string,
    entityType: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    try {
      // Dynamically import to avoid circular dependency
      const { Product } = await import('@modules/catalog/schemas/product.schema');
      const productModel = this.userModel.db.model(Product.name);
      const product = await productModel.findOne({ id: productId }).exec();
      if (!product) return;

      const vendor = await this.vendorModel.findOne({ id: (product as any).vendorId }).exec();
      if (!vendor) return;

      const user = await this.userModel.findOne({ id: vendor.userId }).exec();
      if (!user) return;

      const data = {
        vendorName: vendor.businessName,
        entityType,
        entityName: (product as any).name,
        reason,
      };

      const email = approved
        ? this.templates.vendorApproval(data)
        : this.templates.vendorRejection(data);

      await this.emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [approved ? `${entityType.toLowerCase()}-approved` : `${entityType.toLowerCase()}-rejected`],
      });
    } catch (error: any) {
      this.logger.error(`Failed to send vendor ${entityType} email: ${error.message}`, error.stack);
    }
  }

  private async sendVendorNotificationByVendorId(
    vendorId: string,
    entityType: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    try {
      const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
      if (!vendor) return;

      const user = await this.userModel.findOne({ id: vendor.userId }).exec();
      if (!user) return;

      const data = { vendorName: vendor.businessName, entityType, reason };
      const email = approved
        ? this.templates.vendorApproval(data)
        : this.templates.vendorRejection(data);

      await this.emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [approved ? `${entityType.toLowerCase()}-approved` : `${entityType.toLowerCase()}-rejected`],
      });
    } catch (error: any) {
      this.logger.error(`Failed to send vendor notification: ${error.message}`, error.stack);
    }
  }

  private formatCurrency(amountInMinorUnits: number, currency: string): string {
    const amount = amountInMinorUnits / 100;
    if (currency === 'INR') return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    return `${currency} ${amount.toFixed(2)}`;
  }
}
