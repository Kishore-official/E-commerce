import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  grandTotal: number;
  currency: string;
  itemCount: number;
}

interface ShipmentEmailData {
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
}

interface PaymentEmailData {
  customerName: string;
  orderNumber: string;
  amount: number;
  currency: string;
}

interface VendorEmailData {
  vendorName: string;
  entityType: string;
  entityName?: string;
  reason?: string;
}

interface OtpEmailData {
  name: string;
  otp: string;
  expiresInMinutes: number;
}

@Injectable()
export class EmailTemplateService {
  private readonly storefrontUrl: string;
  private readonly brandColor = '#c4933f';
  private readonly bgColor = '#faf7f2';

  constructor(private readonly configService: ConfigService) {
    this.storefrontUrl = this.configService.get<string>('app.storefrontUrl', 'http://localhost:3001');
  }

  private layout(title: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${this.bgColor};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${this.bgColor};padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1614;padding:28px 40px;text-align:center;">
              <span style="font-size:24px;letter-spacing:6px;color:${this.brandColor};font-weight:300;">MERIDIAN</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f0e8;padding:24px 40px;text-align:center;font-size:12px;color:#8a8278;">
              <p style="margin:0 0 8px;">This is an automated email from MERIDIAN. Please do not reply.</p>
              <p style="margin:0;">
                <a href="${this.storefrontUrl}" style="color:${this.brandColor};text-decoration:none;">Visit Store</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ── Order Emails ─────────────────────────────────────────────

  orderConfirmation(data: OrderEmailData): { subject: string; html: string; text: string } {
    const formattedTotal = this.formatCurrency(data.grandTotal, data.currency);
    return {
      subject: `Order Confirmed — #${data.orderNumber}`,
      html: this.layout('Order Confirmed', `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">Thank you, ${data.customerName}!</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Your order <strong>#${data.orderNumber}</strong> has been confirmed.
        </p>
        <table width="100%" style="background-color:#faf7f2;border-radius:6px;padding:20px;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 16px;color:#8a8278;font-size:14px;">Order Number</td>
            <td style="padding:8px 16px;color:#1a1614;font-weight:600;text-align:right;">#${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding:8px 16px;color:#8a8278;font-size:14px;">Items</td>
            <td style="padding:8px 16px;color:#1a1614;font-weight:600;text-align:right;">${data.itemCount}</td>
          </tr>
          <tr>
            <td style="padding:8px 16px;color:#8a8278;font-size:14px;">Total</td>
            <td style="padding:8px 16px;color:${this.brandColor};font-weight:700;font-size:18px;text-align:right;">${formattedTotal}</td>
          </tr>
        </table>
        <a href="${this.storefrontUrl}/account/orders" style="display:inline-block;background-color:#1a1614;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">View Order</a>
      `),
      text: `Thank you ${data.customerName}! Your order #${data.orderNumber} (${data.itemCount} items, ${formattedTotal}) has been confirmed. Track it at ${this.storefrontUrl}/account/orders`,
    };
  }

  // ── Shipment Emails ──────────────────────────────────────────

  shipmentUpdate(data: ShipmentEmailData): { subject: string; html: string; text: string } {
    const statusLabel = this.shipmentStatusLabel(data.status);
    return {
      subject: `Shipment ${statusLabel} — Order #${data.orderNumber}`,
      html: this.layout('Shipment Update', `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">Shipment ${statusLabel}</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Hi ${data.customerName}, your order <strong>#${data.orderNumber}</strong> shipment has been updated.
        </p>
        <table width="100%" style="background-color:#faf7f2;border-radius:6px;padding:20px;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 16px;color:#8a8278;font-size:14px;">Status</td>
            <td style="padding:8px 16px;color:${this.brandColor};font-weight:600;text-align:right;">${statusLabel}</td>
          </tr>
          ${data.trackingNumber ? `<tr>
            <td style="padding:8px 16px;color:#8a8278;font-size:14px;">Tracking</td>
            <td style="padding:8px 16px;color:#1a1614;font-weight:600;text-align:right;">${data.trackingNumber}</td>
          </tr>` : ''}
          ${data.carrier ? `<tr>
            <td style="padding:8px 16px;color:#8a8278;font-size:14px;">Carrier</td>
            <td style="padding:8px 16px;color:#1a1614;text-align:right;">${data.carrier}</td>
          </tr>` : ''}
        </table>
        <a href="${this.storefrontUrl}/account/orders" style="display:inline-block;background-color:#1a1614;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">Track Order</a>
      `),
      text: `Hi ${data.customerName}, your order #${data.orderNumber} is now ${statusLabel}.${data.trackingNumber ? ` Tracking: ${data.trackingNumber}` : ''} Track at ${this.storefrontUrl}/account/orders`,
    };
  }

  // ── Payment Emails ───────────────────────────────────────────

  paymentSuccess(data: PaymentEmailData): { subject: string; html: string; text: string } {
    const formattedAmount = this.formatCurrency(data.amount, data.currency);
    return {
      subject: `Payment Received — Order #${data.orderNumber}`,
      html: this.layout('Payment Received', `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">Payment Successful</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Hi ${data.customerName}, we've received your payment of <strong>${formattedAmount}</strong> for order <strong>#${data.orderNumber}</strong>.
        </p>
        <div style="text-align:center;padding:24px;background-color:#f0fdf4;border-radius:6px;margin-bottom:24px;">
          <span style="font-size:32px;">✓</span>
          <p style="color:#16a34a;font-weight:600;margin:8px 0 0;">Payment Confirmed</p>
        </div>
      `),
      text: `Payment of ${formattedAmount} received for order #${data.orderNumber}. Thank you, ${data.customerName}!`,
    };
  }

  paymentFailed(data: PaymentEmailData): { subject: string; html: string; text: string } {
    return {
      subject: `Payment Failed — Order #${data.orderNumber}`,
      html: this.layout('Payment Failed', `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">Payment Failed</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Hi ${data.customerName}, your payment for order <strong>#${data.orderNumber}</strong> was not successful. Please try again.
        </p>
        <a href="${this.storefrontUrl}/account/orders" style="display:inline-block;background-color:${this.brandColor};color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">Retry Payment</a>
      `),
      text: `Hi ${data.customerName}, your payment for order #${data.orderNumber} failed. Please try again at ${this.storefrontUrl}/account/orders`,
    };
  }

  // ── Vendor Emails ────────────────────────────────────────────

  vendorApproval(data: VendorEmailData): { subject: string; html: string; text: string } {
    return {
      subject: `Your ${data.entityType} has been approved — MERIDIAN`,
      html: this.layout(`${data.entityType} Approved`, `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">${data.entityType} Approved!</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Hi ${data.vendorName}, your ${data.entityType.toLowerCase()}${data.entityName ? ` "${data.entityName}"` : ''} has been approved and is now live.
        </p>
        <div style="text-align:center;padding:24px;background-color:#f0fdf4;border-radius:6px;margin-bottom:24px;">
          <span style="font-size:32px;">✓</span>
          <p style="color:#16a34a;font-weight:600;margin:8px 0 0;">Approved</p>
        </div>
      `),
      text: `Hi ${data.vendorName}, your ${data.entityType.toLowerCase()}${data.entityName ? ` "${data.entityName}"` : ''} has been approved on MERIDIAN.`,
    };
  }

  vendorRejection(data: VendorEmailData): { subject: string; html: string; text: string } {
    return {
      subject: `Your ${data.entityType} needs changes — MERIDIAN`,
      html: this.layout(`${data.entityType} Rejected`, `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">${data.entityType} Not Approved</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Hi ${data.vendorName}, your ${data.entityType.toLowerCase()}${data.entityName ? ` "${data.entityName}"` : ''} was not approved.
        </p>
        ${data.reason ? `<div style="background-color:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;margin-bottom:24px;">
          <p style="color:#991b1b;margin:0;font-size:14px;"><strong>Reason:</strong> ${data.reason}</p>
        </div>` : ''}
        <p style="color:#4a4540;line-height:1.6;">Please update and resubmit.</p>
      `),
      text: `Hi ${data.vendorName}, your ${data.entityType.toLowerCase()} was not approved.${data.reason ? ` Reason: ${data.reason}` : ''} Please update and resubmit.`,
    };
  }

  // ── OTP / Auth Emails ────────────────────────────────────────

  otpVerification(data: OtpEmailData): { subject: string; html: string; text: string } {
    return {
      subject: `Your verification code — ${data.otp}`,
      html: this.layout('Verification Code', `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">Verify your email</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Hi ${data.name}, use the code below to verify your email address.
        </p>
        <div style="text-align:center;padding:24px;margin-bottom:24px;">
          <span style="font-size:36px;letter-spacing:8px;font-weight:700;color:#1a1614;background-color:#faf7f2;padding:16px 32px;border-radius:8px;border:2px dashed ${this.brandColor};">${data.otp}</span>
        </div>
        <p style="color:#8a8278;font-size:13px;text-align:center;">This code expires in ${data.expiresInMinutes} minutes. Do not share it with anyone.</p>
      `),
      text: `Hi ${data.name}, your MERIDIAN verification code is ${data.otp}. It expires in ${data.expiresInMinutes} minutes.`,
    };
  }

  welcomeEmail(name: string): { subject: string; html: string; text: string } {
    return {
      subject: `Welcome to MERIDIAN`,
      html: this.layout('Welcome', `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">Welcome, ${name}!</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Thank you for joining MERIDIAN. We're delighted to have you.
        </p>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Explore our curated collection of premium products from trusted vendors.
        </p>
        <a href="${this.storefrontUrl}" style="display:inline-block;background-color:#1a1614;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;">Start Shopping</a>
      `),
      text: `Welcome to MERIDIAN, ${name}! Explore our curated collection at ${this.storefrontUrl}`,
    };
  }

  // ── Stock Alert (Vendor) ─────────────────────────────────────

  stockDepleted(vendorName: string, productName: string): { subject: string; html: string; text: string } {
    return {
      subject: `Stock Alert — ${productName} is out of stock`,
      html: this.layout('Stock Depleted', `
        <h2 style="color:#1a1614;margin:0 0 16px;font-size:22px;">Stock Depleted</h2>
        <p style="color:#4a4540;line-height:1.6;margin:0 0 24px;">
          Hi ${vendorName}, your offer for <strong>${productName}</strong> is now out of stock. Please restock to continue receiving orders.
        </p>
        <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:4px;margin-bottom:24px;">
          <p style="color:#92400e;margin:0;font-size:14px;"><strong>Action needed:</strong> Update your stock quantity to resume sales.</p>
        </div>
      `),
      text: `Hi ${vendorName}, your offer for "${productName}" is out of stock. Please restock to continue receiving orders.`,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private formatCurrency(amountInMinorUnits: number, currency: string): string {
    const amount = amountInMinorUnits / 100;
    if (currency === 'INR') return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    return `${currency} ${amount.toFixed(2)}`;
  }

  private shipmentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      picking: 'Being Prepared',
      packed: 'Packed',
      shipped: 'Shipped',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
    };
    return labels[status] || status;
  }
}
