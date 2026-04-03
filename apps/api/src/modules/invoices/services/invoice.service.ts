import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import { OrderStatus, PaymentStatus, PaginatedResult } from '@ecommerce/shared-types';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { PaginationDto } from '@common/dto/pagination.dto';
import { Order, OrderDocument } from '@modules/orders/schemas/order.schema';
import { OrderItem, OrderItemDocument } from '@modules/orders/schemas/order-item.schema';
import { User, UserDocument } from '@modules/identity/schemas/user.schema';
import { Vendor, VendorDocument } from '@modules/identity/schemas/vendor.schema';
import { Payment, PaymentDocument } from '@modules/payments/schemas/payment.schema';
import {
  Invoice,
  InvoiceDocument,
  InvoiceLineItem,
  InvoiceAddress,
  SellerDetails,
} from '../schemas/invoice.schema';

const GST_RATE = 0.18;
const HALF_GST_RATE = GST_RATE / 2;

// Platform seller details (MERIDIAN marketplace)
const PLATFORM_SELLER: SellerDetails = {
  vendorId: 'platform',
  businessName: 'MERIDIAN Marketplace Pvt. Ltd.',
  legalName: 'MERIDIAN Marketplace Private Limited',
  gstin: '29AABCM0000A1Z5',
  pan: 'AABCM0000A',
  address: {
    name: 'MERIDIAN Marketplace',
    line1: '100, Electronic City Phase 1',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560100',
    countryCode: 'IN',
  },
};

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async generateInvoice(orderId: string): Promise<Invoice> {
    // Check if invoice already exists
    const existing = await this.invoiceModel.findOne({ orderId }).exec();
    if (existing) return existing;

    // Load order
    const order = await this.orderModel.findOne({ id: orderId }).exec();
    if (!order) throw new NotFoundException('Order not found');

    // Only generate for confirmed+ orders
    const invoiceableStatuses = [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.PARTIALLY_SHIPPED,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];
    if (!invoiceableStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Cannot generate invoice for order in status: ${order.status}`,
      );
    }

    // Load related data
    const [orderItems, user, payment] = await Promise.all([
      this.orderItemModel.find({ orderId }).exec(),
      this.userModel.findOne({ id: order.userId }).exec(),
      this.paymentModel.findOne({ orderId, status: PaymentStatus.SUCCEEDED }).exec(),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (orderItems.length === 0) throw new BadRequestException('No order items found');

    // Get primary vendor (first item's vendor for seller details)
    const primaryVendorId = orderItems[0].vendorId;
    const vendor = await this.vendorModel.findOne({ id: primaryVendorId }).exec();

    // Determine place of supply for IGST vs CGST+SGST
    const billingAddress = order.billingAddress || order.shippingAddress;
    const sellerState = vendor?.businessAddress?.state || 'Karnataka';
    const buyerState = billingAddress.state || '';
    const isInterState = sellerState.toLowerCase() !== buyerState.toLowerCase();

    // Build line items with GST breakdown
    const lineItems: InvoiceLineItem[] = orderItems.map((item) => {
      const taxableAmount = item.totalPrice;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      if (isInterState) {
        igstAmount = Math.round(taxableAmount * GST_RATE);
      } else {
        cgstAmount = Math.round(taxableAmount * HALF_GST_RATE);
        sgstAmount = Math.round(taxableAmount * HALF_GST_RATE);
      }

      return {
        orderItemId: item.id,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxableAmount,
        cgstRate: isInterState ? 0 : HALF_GST_RATE * 100,
        cgstAmount,
        sgstRate: isInterState ? 0 : HALF_GST_RATE * 100,
        sgstAmount,
        igstRate: isInterState ? GST_RATE * 100 : 0,
        igstAmount,
        totalAmount: taxableAmount + cgstAmount + sgstAmount + igstAmount,
      };
    });

    const cgstTotal = lineItems.reduce((sum, li) => sum + li.cgstAmount, 0);
    const sgstTotal = lineItems.reduce((sum, li) => sum + li.sgstAmount, 0);
    const igstTotal = lineItems.reduce((sum, li) => sum + li.igstAmount, 0);

    // Build seller details
    const seller: SellerDetails = vendor?.gstin
      ? {
          vendorId: vendor.id,
          businessName: vendor.businessName,
          legalName: vendor.legalName,
          gstin: vendor.gstin,
          pan: vendor.pan,
          address: vendor.businessAddress
            ? { name: vendor.businessName, ...vendor.businessAddress }
            : undefined,
        }
      : PLATFORM_SELLER;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.invoiceModel.create({
      id: uuidv4(),
      invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      billingAddress: billingAddress as InvoiceAddress,
      shippingAddress: order.shippingAddress as InvoiceAddress,
      seller,
      lineItems,
      subtotal: order.subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      shippingTotal: order.shippingTotal,
      discountTotal: order.discountTotal,
      grandTotal: order.grandTotal,
      currency: order.currency,
      paymentMethod: payment?.paymentMethod,
      paidAt: payment?.paidAt,
      placeOfSupply: buyerState || sellerState,
      isInterState,
      invoiceDate: payment?.paidAt || new Date(),
    });

    this.logger.log(`Invoice ${invoiceNumber} generated for order ${order.orderNumber}`);
    return invoice;
  }

  async getInvoiceByOrderId(orderId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel.findOne({ orderId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found for this order');
    return invoice;
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel.findOne({ id: invoiceId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async findByUser(userId: string, query: PaginationDto): Promise<PaginatedResult<Invoice>> {
    const [data, total] = await Promise.all([
      this.invoiceModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.invoiceModel.countDocuments({ userId }).exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async findAll(query: PaginationDto): Promise<PaginatedResult<Invoice>> {
    const [data, total] = await Promise.all([
      this.invoiceModel
        .find()
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.invoiceModel.countDocuments().exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async generatePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(invoiceId);
    return this.buildPdf(invoice);
  }

  async generatePdfByOrderId(orderId: string): Promise<Buffer> {
    const invoice = await this.invoiceModel.findOne({ orderId }).exec()
      || await this.generateInvoice(orderId);
    return this.buildPdf(invoice as Invoice);
  }

  // ── PDF Builder ──────────────────────────────────────────────

  private buildPdf(invoice: Invoice): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const leftCol = 40;
      const rightCol = 320;

      // ── Header ─────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', leftCol, 40, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#c4933f')
        .text('MERIDIAN', { align: 'center' });
      doc.fillColor('#000000');

      doc.moveDown(1);
      const headerY = doc.y;

      // Invoice details (right)
      doc.fontSize(9).font('Helvetica-Bold').text('Invoice No:', rightCol, headerY);
      doc.font('Helvetica').text(invoice.invoiceNumber, rightCol + 70, headerY);
      doc.font('Helvetica-Bold').text('Invoice Date:', rightCol, headerY + 14);
      doc.font('Helvetica').text(this.formatDate(invoice.invoiceDate), rightCol + 70, headerY + 14);
      doc.font('Helvetica-Bold').text('Order No:', rightCol, headerY + 28);
      doc.font('Helvetica').text(invoice.orderNumber, rightCol + 70, headerY + 28);
      if (invoice.paymentMethod) {
        doc.font('Helvetica-Bold').text('Payment:', rightCol, headerY + 42);
        doc.font('Helvetica').text(invoice.paymentMethod.toUpperCase(), rightCol + 70, headerY + 42);
      }

      // ── Seller & Buyer ─────────────────────────────────────
      const sellerY = headerY + 70;
      doc.fontSize(9).font('Helvetica-Bold').text('Sold By:', leftCol, sellerY);
      doc.font('Helvetica');
      doc.text(invoice.seller.businessName, leftCol, sellerY + 14);
      if (invoice.seller.legalName && invoice.seller.legalName !== invoice.seller.businessName) {
        doc.text(invoice.seller.legalName);
      }
      if (invoice.seller.address) {
        doc.text(invoice.seller.address.line1);
        if (invoice.seller.address.line2) doc.text(invoice.seller.address.line2);
        doc.text(`${invoice.seller.address.city}, ${invoice.seller.address.state || ''} ${invoice.seller.address.postalCode}`);
      }
      if (invoice.seller.gstin) doc.text(`GSTIN: ${invoice.seller.gstin}`);
      if (invoice.seller.pan) doc.text(`PAN: ${invoice.seller.pan}`);

      // Buyer
      doc.fontSize(9).font('Helvetica-Bold').text('Bill To:', rightCol, sellerY);
      doc.font('Helvetica');
      doc.text(invoice.billingAddress.name, rightCol, sellerY + 14);
      doc.text(invoice.billingAddress.line1);
      if (invoice.billingAddress.line2) doc.text(invoice.billingAddress.line2);
      doc.text(`${invoice.billingAddress.city}, ${invoice.billingAddress.state || ''} ${invoice.billingAddress.postalCode}`);
      if (invoice.billingAddress.phone) doc.text(`Ph: ${invoice.billingAddress.phone}`);

      // Place of supply
      const supplyY = Math.max(doc.y, sellerY + 100) + 10;
      doc.fontSize(8).font('Helvetica-Bold')
        .text(`Place of Supply: ${invoice.placeOfSupply} | ${invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}`, leftCol, supplyY);

      // ── Line Items Table ───────────────────────────────────
      const tableTop = supplyY + 20;
      this.drawTableHeader(doc, tableTop, invoice.isInterState);

      let y = tableTop + 18;
      for (const item of invoice.lineItems) {
        if (y > 700) {
          doc.addPage();
          y = 40;
          this.drawTableHeader(doc, y, invoice.isInterState);
          y += 18;
        }

        doc.fontSize(7).font('Helvetica');
        doc.text(`${item.productName} — ${item.variantName}`, leftCol + 2, y, { width: 150 });
        doc.text(item.sku, 195, y, { width: 55 });
        doc.text(String(item.quantity), 255, y, { width: 25, align: 'center' });
        doc.text(this.formatAmount(item.unitPrice), 282, y, { width: 55, align: 'right' });
        doc.text(this.formatAmount(item.taxableAmount), 340, y, { width: 55, align: 'right' });

        if (invoice.isInterState) {
          doc.text(`${item.igstRate}%`, 400, y, { width: 35, align: 'center' });
          doc.text(this.formatAmount(item.igstAmount), 438, y, { width: 50, align: 'right' });
        } else {
          doc.text(`${item.cgstRate}%`, 400, y, { width: 28, align: 'center' });
          doc.text(this.formatAmount(item.cgstAmount), 430, y, { width: 42, align: 'right' });
          doc.text(`${item.sgstRate}%`, 475, y, { width: 28, align: 'center' });
          doc.text(this.formatAmount(item.sgstAmount), 505, y, { width: 42, align: 'right' });
        }

        doc.text(this.formatAmount(item.totalAmount), pageWidth - 15, y, { width: 55, align: 'right' });

        y += 16;
        // Divider line
        doc.moveTo(leftCol, y - 2).lineTo(leftCol + pageWidth, y - 2)
          .strokeColor('#e8e2d6').lineWidth(0.5).stroke();
      }

      // ── Totals ─────────────────────────────────────────────
      y += 8;
      const totalsX = 380;
      const totalsValX = pageWidth - 15;

      doc.fontSize(8).font('Helvetica');
      doc.text('Subtotal:', totalsX, y, { width: 80 });
      doc.text(this.formatAmount(invoice.subtotal), totalsValX, y, { width: 55, align: 'right' });
      y += 14;

      if (!invoice.isInterState) {
        doc.text(`CGST:`, totalsX, y, { width: 80 });
        doc.text(this.formatAmount(invoice.cgstTotal), totalsValX, y, { width: 55, align: 'right' });
        y += 14;
        doc.text(`SGST:`, totalsX, y, { width: 80 });
        doc.text(this.formatAmount(invoice.sgstTotal), totalsValX, y, { width: 55, align: 'right' });
        y += 14;
      } else {
        doc.text(`IGST:`, totalsX, y, { width: 80 });
        doc.text(this.formatAmount(invoice.igstTotal), totalsValX, y, { width: 55, align: 'right' });
        y += 14;
      }

      if (invoice.shippingTotal > 0) {
        doc.text('Shipping:', totalsX, y, { width: 80 });
        doc.text(this.formatAmount(invoice.shippingTotal), totalsValX, y, { width: 55, align: 'right' });
        y += 14;
      }
      if (invoice.discountTotal > 0) {
        doc.text('Discount:', totalsX, y, { width: 80 });
        doc.text(`-${this.formatAmount(invoice.discountTotal)}`, totalsValX, y, { width: 55, align: 'right' });
        y += 14;
      }

      // Grand total
      y += 4;
      doc.moveTo(totalsX, y).lineTo(leftCol + pageWidth, y)
        .strokeColor('#1a1614').lineWidth(1).stroke();
      y += 6;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('GRAND TOTAL:', totalsX, y, { width: 80 });
      doc.text(`₹${this.formatAmount(invoice.grandTotal)}`, totalsValX, y, { width: 55, align: 'right' });

      // ── Footer ─────────────────────────────────────────────
      y += 40;
      if (y < 720) {
        doc.fontSize(7).font('Helvetica').fillColor('#8a8278');
        doc.text('This is a computer-generated invoice and does not require a physical signature.', leftCol, y, { align: 'center', width: pageWidth });
        doc.moveDown(0.5);
        doc.text(`Amount in words: ${this.amountToWords(invoice.grandTotal, invoice.currency)}`, { align: 'center', width: pageWidth });
      }

      doc.end();
    });
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, y: number, isInterState: boolean): void {
    const leftCol = 40;
    const pageWidth = doc.page.width - 80;

    // Header background
    doc.rect(leftCol, y - 2, pageWidth, 16).fill('#1a1614');
    doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');

    doc.text('Item', leftCol + 2, y, { width: 150 });
    doc.text('SKU', 195, y, { width: 55 });
    doc.text('Qty', 255, y, { width: 25, align: 'center' });
    doc.text('Unit Price', 282, y, { width: 55, align: 'right' });
    doc.text('Taxable', 340, y, { width: 55, align: 'right' });

    if (isInterState) {
      doc.text('IGST %', 400, y, { width: 35, align: 'center' });
      doc.text('IGST Amt', 438, y, { width: 50, align: 'right' });
    } else {
      doc.text('CGST%', 400, y, { width: 28, align: 'center' });
      doc.text('CGST Amt', 430, y, { width: 42, align: 'right' });
      doc.text('SGST%', 475, y, { width: 28, align: 'center' });
      doc.text('SGST Amt', 505, y, { width: 42, align: 'right' });
    }

    doc.text('Total', pageWidth - 15, y, { width: 55, align: 'right' });
    doc.fillColor('#000000');
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const prefix = `INV-${year}${month}`;
    const lastInvoice = await this.invoiceModel
      .findOne({ invoiceNumber: { $regex: `^${prefix}` } })
      .sort({ invoiceNumber: -1 })
      .exec();

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0', 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(5, '0')}`;
  }

  private formatAmount(amountInPaise: number): string {
    return (amountInPaise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private amountToWords(amountInPaise: number, currency: string): string {
    const amount = Math.floor(amountInPaise / 100);
    const paise = amountInPaise % 100;
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
      if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred ${convert(n % 100)}`.trim();
      if (n < 100000) return `${convert(Math.floor(n / 1000))} Thousand ${convert(n % 1000)}`.trim();
      if (n < 10000000) return `${convert(Math.floor(n / 100000))} Lakh ${convert(n % 100000)}`.trim();
      return `${convert(Math.floor(n / 10000000))} Crore ${convert(n % 10000000)}`.trim();
    };

    const currencyName = currency === 'INR' ? 'Rupees' : currency;
    let result = `${currencyName} ${convert(amount)}`;
    if (paise > 0) result += ` and ${convert(paise)} Paise`;
    result += ' Only';
    return result;
  }
}
