import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

export interface InvoiceLineItem {
  orderItemId: string;
  productName: string;
  variantName: string;
  sku: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

export interface InvoiceAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
}

export interface SellerDetails {
  vendorId: string;
  businessName: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  address?: InvoiceAddress;
}

@Schema({ collection: 'invoices', timestamps: true })
export class Invoice {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true, unique: true })
  invoiceNumber: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String, required: true })
  customerEmail: string;

  @Prop({ type: Object, required: true })
  billingAddress: InvoiceAddress;

  @Prop({ type: Object, required: true })
  shippingAddress: InvoiceAddress;

  @Prop({ type: Object, required: true })
  seller: SellerDetails;

  @Prop({ type: [Object], required: true })
  lineItems: InvoiceLineItem[];

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  cgstTotal: number;

  @Prop({ type: Number, default: 0 })
  sgstTotal: number;

  @Prop({ type: Number, default: 0 })
  igstTotal: number;

  @Prop({ type: Number, default: 0 })
  shippingTotal: number;

  @Prop({ type: Number, default: 0 })
  discountTotal: number;

  @Prop({ type: Number, required: true })
  grandTotal: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: false })
  paymentMethod?: string;

  @Prop({ type: Date, required: false })
  paidAt?: Date;

  @Prop({ type: String, required: false })
  pdfUrl?: string;

  @Prop({ type: String, required: true })
  placeOfSupply: string;

  @Prop({ type: Boolean, default: false })
  isInterState: boolean;

  @Prop({ type: Date, default: Date.now })
  invoiceDate: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ orderId: 1 });
InvoiceSchema.index({ userId: 1, createdAt: -1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
