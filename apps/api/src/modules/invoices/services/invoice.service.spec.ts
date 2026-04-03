import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@ecommerce/shared-types';
import { InvoiceService } from './invoice.service';
import { Invoice } from '../schemas/invoice.schema';
import { Order } from '@modules/orders/schemas/order.schema';
import { OrderItem } from '@modules/orders/schemas/order-item.schema';
import { User } from '@modules/identity/schemas/user.schema';
import { Vendor } from '@modules/identity/schemas/vendor.schema';
import { Payment } from '@modules/payments/schemas/payment.schema';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceModel: any;
  let orderModel: any;
  let orderItemModel: any;
  let userModel: any;
  let vendorModel: any;
  let paymentModel: any;

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'MRD-2026-00001',
    userId: 'user-1',
    countryCode: 'IN',
    status: OrderStatus.CONFIRMED,
    subtotal: 12999900,
    shippingTotal: 0,
    taxTotal: 2339982,
    discountTotal: 0,
    grandTotal: 15339882,
    currency: 'INR',
    shippingAddress: {
      name: 'Deepa Nair',
      line1: '42 MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560038',
      countryCode: 'IN',
      phone: '+91-9876543210',
    },
  };

  const mockOrderItems = [
    {
      id: 'item-1',
      orderId: 'order-1',
      offerId: 'offer-1',
      vendorId: 'vendor-1',
      productName: 'iPhone 15 Pro',
      variantName: '128GB Black',
      sku: 'IPH15P-128-BLK',
      quantity: 1,
      unitPrice: 12999900,
      totalPrice: 12999900,
      currency: 'INR',
      offerType: 'marketplace',
      status: 'confirmed',
    },
  ];

  const mockUser = {
    id: 'user-1',
    email: 'deepa@test.com',
    firstName: 'Deepa',
    lastName: 'Nair',
  };

  const mockVendor = {
    id: 'vendor-1',
    businessName: 'TechWorld Electronics',
    legalName: 'TechWorld Electronics Pvt. Ltd.',
    gstin: '29AABCT1234F1Z5',
    pan: 'AABCT1234F',
    businessAddress: {
      line1: '100 Electronic City',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560100',
      countryCode: 'IN',
    },
  };

  const mockPayment = {
    id: 'pay-1',
    orderId: 'order-1',
    status: PaymentStatus.SUCCEEDED,
    paymentMethod: 'upi',
    paidAt: new Date(),
  };

  beforeEach(async () => {
    const mockInvoiceModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        exec: jest.fn().mockResolvedValue(null),
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        {
          provide: getModelToken(Order.name),
          useValue: { findOne: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
        {
          provide: getModelToken(OrderItem.name),
          useValue: { find: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
        {
          provide: getModelToken(User.name),
          useValue: { findOne: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
        {
          provide: getModelToken(Vendor.name),
          useValue: { findOne: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
        {
          provide: getModelToken(Payment.name),
          useValue: { findOne: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
      ],
    }).compile();

    service = module.get(InvoiceService);
    invoiceModel = module.get(getModelToken(Invoice.name));
    orderModel = module.get(getModelToken(Order.name));
    orderItemModel = module.get(getModelToken(OrderItem.name));
    userModel = module.get(getModelToken(User.name));
    vendorModel = module.get(getModelToken(Vendor.name));
    paymentModel = module.get(getModelToken(Payment.name));
  });

  describe('generateInvoice', () => {
    it('should return existing invoice if already generated', async () => {
      const existingInvoice = { id: 'inv-1', orderId: 'order-1', invoiceNumber: 'INV-202604-00001' };
      invoiceModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existingInvoice) });

      const result = await service.generateInvoice('order-1');
      expect(result).toEqual(existingInvoice);
    });

    it('should throw if order not found', async () => {
      invoiceModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      orderModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.generateInvoice('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw if order is not in invoiceable status', async () => {
      invoiceModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      orderModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING_PAYMENT }),
      });

      await expect(service.generateInvoice('order-1')).rejects.toThrow(BadRequestException);
    });

    it('should generate intra-state invoice with CGST + SGST', async () => {
      invoiceModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) }) // No existing invoice
        .mockReturnValueOnce({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) }); // Invoice number seq

      orderModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockOrder) });
      orderItemModel.find.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockOrderItems) });
      userModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockUser) });
      paymentModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockPayment) });
      vendorModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockVendor) });

      const createdInvoice = {
        id: 'inv-new',
        invoiceNumber: 'INV-202604-00001',
        orderId: 'order-1',
        isInterState: false,
      };
      invoiceModel.create.mockResolvedValueOnce(createdInvoice);

      const result = await service.generateInvoice('order-1');

      expect(invoiceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'MRD-2026-00001',
          isInterState: false,
          currency: 'INR',
        }),
      );
      expect(result).toEqual(createdInvoice);
    });

    it('should generate inter-state invoice with IGST when states differ', async () => {
      const interStateOrder = {
        ...mockOrder,
        shippingAddress: {
          ...mockOrder.shippingAddress,
          state: 'Tamil Nadu', // Different from vendor's Karnataka
        },
      };

      invoiceModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) });

      orderModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(interStateOrder) });
      orderItemModel.find.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockOrderItems) });
      userModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockUser) });
      paymentModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockPayment) });
      vendorModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockVendor) });

      invoiceModel.create.mockResolvedValueOnce({ id: 'inv-2', isInterState: true });

      await service.generateInvoice('order-1');

      expect(invoiceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ isInterState: true }),
      );
    });
  });

  describe('getInvoiceByOrderId', () => {
    it('should return invoice for order', async () => {
      const invoice = { id: 'inv-1', orderId: 'order-1' };
      invoiceModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(invoice) });

      const result = await service.getInvoiceByOrderId('order-1');
      expect(result).toEqual(invoice);
    });

    it('should throw if no invoice found', async () => {
      invoiceModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.getInvoiceByOrderId('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generatePdf', () => {
    it('should generate PDF buffer', async () => {
      const mockInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-202604-00001',
        orderNumber: 'MRD-2026-00001',
        invoiceDate: new Date(),
        paymentMethod: 'upi',
        seller: {
          businessName: 'TechWorld',
          legalName: 'TechWorld Pvt Ltd',
          gstin: '29AABCT1234F1Z5',
          pan: 'AABCT1234F',
          address: { name: 'TechWorld', line1: '100 EC', city: 'Bangalore', state: 'Karnataka', postalCode: '560100' },
        },
        billingAddress: { name: 'Deepa', line1: '42 MG Road', city: 'Bangalore', state: 'Karnataka', postalCode: '560038' },
        shippingAddress: { name: 'Deepa', line1: '42 MG Road', city: 'Bangalore', state: 'Karnataka', postalCode: '560038' },
        placeOfSupply: 'Karnataka',
        isInterState: false,
        lineItems: [{
          productName: 'iPhone 15 Pro',
          variantName: '128GB',
          sku: 'IPH15-128',
          quantity: 1,
          unitPrice: 12999900,
          taxableAmount: 12999900,
          cgstRate: 9,
          cgstAmount: 1169991,
          sgstRate: 9,
          sgstAmount: 1169991,
          igstRate: 0,
          igstAmount: 0,
          totalAmount: 15339882,
        }],
        subtotal: 12999900,
        cgstTotal: 1169991,
        sgstTotal: 1169991,
        igstTotal: 0,
        shippingTotal: 0,
        discountTotal: 0,
        grandTotal: 15339882,
        currency: 'INR',
      };

      invoiceModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockInvoice) });

      const pdfBuffer = await service.generatePdf('inv-1');

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // PDF starts with %PDF
      expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
    });
  });
});
