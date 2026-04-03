import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  PayoutStatus,
  OrderStatus,
  PaymentStatus,
  PaginatedResult,
} from '@ecommerce/shared-types';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { PaginationDto } from '@common/dto/pagination.dto';
import { Order, OrderDocument } from '@modules/orders/schemas/order.schema';
import { OrderItem, OrderItemDocument } from '@modules/orders/schemas/order-item.schema';
import { Payment, PaymentDocument } from '@modules/payments/schemas/payment.schema';
import { Vendor, VendorDocument } from '@modules/identity/schemas/vendor.schema';
import { Payout, PayoutDocument } from '../schemas/payout.schema';
import { VendorLedger, VendorLedgerDocument } from '../schemas/vendor-ledger.schema';

export interface VendorBalanceSummary {
  vendorId: string;
  businessName: string;
  totalEarnings: number;
  totalCommission: number;
  totalPaidOut: number;
  pendingBalance: number;
  currency: string;
  orderCount: number;
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    @InjectModel(Payout.name)
    private readonly payoutModel: Model<PayoutDocument>,
    @InjectModel(VendorLedger.name)
    private readonly ledgerModel: Model<VendorLedgerDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
  ) {}

  // ── Ledger — Record vendor earnings on payment success ─────

  async recordOrderEarnings(orderId: string): Promise<void> {
    const order = await this.orderModel.findOne({ id: orderId }).exec();
    if (!order) return;

    const orderItems = await this.orderItemModel.find({ orderId }).exec();
    if (orderItems.length === 0) return;

    // Group items by vendor
    const vendorItems = new Map<string, typeof orderItems>();
    for (const item of orderItems) {
      const items = vendorItems.get(item.vendorId) || [];
      items.push(item);
      vendorItems.set(item.vendorId, items);
    }

    for (const [vendorId, items] of vendorItems) {
      // Skip if already recorded
      const existing = await this.ledgerModel.findOne({ orderId, vendorId }).exec();
      if (existing) continue;

      const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
      const commissionRate = vendor?.commissionRate || 10;

      const orderItemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const commissionAmount = Math.round(orderItemsTotal * (commissionRate / 100));
      const netPayable = orderItemsTotal - commissionAmount;

      await this.ledgerModel.create({
        id: uuidv4(),
        vendorId,
        orderId,
        orderNumber: order.orderNumber,
        orderItemsTotal,
        commissionRate,
        commissionAmount,
        netPayable,
        currency: order.currency,
      });

      this.logger.log(
        `Ledger entry: vendor ${vendorId} earns ${netPayable} from order ${order.orderNumber} (commission: ${commissionRate}%)`,
      );
    }
  }

  // ── Balance Summary ────────────────────────────────────────

  async getVendorBalance(vendorId: string): Promise<VendorBalanceSummary> {
    const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
    if (!vendor) throw new NotFoundException('Vendor not found');

    const ledgerEntries = await this.ledgerModel.find({ vendorId }).exec();

    const totalEarnings = ledgerEntries.reduce((sum, e) => sum + e.orderItemsTotal, 0);
    const totalCommission = ledgerEntries.reduce((sum, e) => sum + e.commissionAmount, 0);

    const completedPayouts = await this.payoutModel.find({
      vendorId,
      status: PayoutStatus.COMPLETED,
    }).exec();
    const totalPaidOut = completedPayouts.reduce((sum, p) => sum + p.amount, 0);

    const netPayableTotal = ledgerEntries.reduce((sum, e) => sum + e.netPayable, 0);
    const pendingBalance = netPayableTotal - totalPaidOut;

    return {
      vendorId,
      businessName: vendor.businessName,
      totalEarnings,
      totalCommission,
      totalPaidOut,
      pendingBalance,
      currency: 'INR',
      orderCount: ledgerEntries.length,
    };
  }

  async getAllVendorBalances(query: PaginationDto): Promise<PaginatedResult<VendorBalanceSummary>> {
    const [vendors, total] = await Promise.all([
      this.vendorModel
        .find({ status: 'approved' })
        .sort({ businessName: 1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.vendorModel.countDocuments({ status: 'approved' }).exec(),
    ]);

    const balances: VendorBalanceSummary[] = [];
    for (const vendor of vendors) {
      const balance = await this.getVendorBalance(vendor.id);
      balances.push(balance);
    }

    return buildPaginatedResult(balances, total, query.page, query.limit);
  }

  // ── Vendor Ledger ──────────────────────────────────────────

  async getVendorLedger(
    vendorId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<VendorLedger>> {
    const [data, total] = await Promise.all([
      this.ledgerModel
        .find({ vendorId })
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.ledgerModel.countDocuments({ vendorId }).exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  // ── Payout Management ──────────────────────────────────────

  async createPayout(
    vendorId: string,
    adminUserId: string,
    notes?: string,
  ): Promise<Payout> {
    const balance = await this.getVendorBalance(vendorId);
    if (balance.pendingBalance <= 0) {
      throw new BadRequestException('No pending balance to pay out');
    }

    // Get unpaid ledger entries
    const unpaidEntries = await this.ledgerModel.find({
      vendorId,
      payoutId: { $exists: false },
    }).exec();

    if (unpaidEntries.length === 0) {
      throw new BadRequestException('No unpaid orders to settle');
    }

    const amount = unpaidEntries.reduce((sum, e) => sum + e.netPayable, 0);
    const dates = unpaidEntries.map((e) => e.createdAt);
    const periodFrom = new Date(Math.min(...dates.map((d) => d.getTime())));
    const periodTo = new Date(Math.max(...dates.map((d) => d.getTime())));

    const payoutNumber = await this.generatePayoutNumber();

    const payout = await this.payoutModel.create({
      id: uuidv4(),
      payoutNumber,
      vendorId,
      amount,
      orderCount: unpaidEntries.length,
      currency: 'INR',
      status: PayoutStatus.PENDING,
      periodFrom,
      periodTo,
      notes,
      processedBy: adminUserId,
    });

    // Link ledger entries to this payout
    const entryIds = unpaidEntries.map((e) => e.id);
    await this.ledgerModel.updateMany(
      { id: { $in: entryIds } },
      { $set: { payoutId: payout.id } },
    ).exec();

    this.logger.log(
      `Payout ${payoutNumber} created for vendor ${vendorId}: ₹${(amount / 100).toFixed(2)} (${unpaidEntries.length} orders)`,
    );

    return payout;
  }

  async markPayoutCompleted(
    payoutId: string,
    transactionRef: string,
    adminUserId: string,
  ): Promise<Payout> {
    const payout = await this.payoutModel.findOne({ id: payoutId }).exec();
    if (!payout) throw new NotFoundException('Payout not found');

    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.PROCESSING) {
      throw new BadRequestException(`Cannot complete payout in status: ${payout.status}`);
    }

    const updated = await this.payoutModel.findOneAndUpdate(
      { id: payoutId },
      {
        $set: {
          status: PayoutStatus.COMPLETED,
          transactionRef,
          processedBy: adminUserId,
          processedAt: new Date(),
        },
      },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundException('Payout not found');

    this.logger.log(`Payout ${payout.payoutNumber} completed. Ref: ${transactionRef}`);
    return updated;
  }

  async markPayoutProcessing(payoutId: string): Promise<Payout> {
    const updated = await this.payoutModel.findOneAndUpdate(
      { id: payoutId, status: PayoutStatus.PENDING },
      { $set: { status: PayoutStatus.PROCESSING } },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundException('Payout not found or not in pending status');
    return updated;
  }

  async getPayoutById(payoutId: string): Promise<Payout> {
    const payout = await this.payoutModel.findOne({ id: payoutId }).exec();
    if (!payout) throw new NotFoundException('Payout not found');
    return payout;
  }

  async findPayoutsByVendor(
    vendorId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<Payout>> {
    const [data, total] = await Promise.all([
      this.payoutModel
        .find({ vendorId })
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.payoutModel.countDocuments({ vendorId }).exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async findAllPayouts(query: PaginationDto): Promise<PaginatedResult<Payout>> {
    const [data, total] = await Promise.all([
      this.payoutModel
        .find()
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.payoutModel.countDocuments().exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async generatePayoutNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PAY-${year}${month}`;

    const last = await this.payoutModel
      .findOne({ payoutNumber: { $regex: `^${prefix}` } })
      .sort({ payoutNumber: -1 })
      .exec();

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.payoutNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }
}
