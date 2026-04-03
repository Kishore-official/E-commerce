import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProductStatus } from '@ecommerce/shared-types';
import { VariantService } from './variant.service';
import { Variant } from '../schemas/variant.schema';
import { Product } from '../schemas/product.schema';

describe('VariantService', () => {
  let service: VariantService;
  let variantModel: any;
  let productModel: any;

  beforeEach(async () => {
    const mockVariantModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
    };

    const mockProductModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantService,
        {
          provide: getModelToken(Variant.name),
          useValue: mockVariantModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<VariantService>(VariantService);
    variantModel = module.get(getModelToken(Variant.name));
    productModel = module.get(getModelToken(Product.name));
  });

  describe('create', () => {
    it('should create variant for a DRAFT product', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.DRAFT,
        }),
      });
      // SKU uniqueness check: no existing variant with this SKU
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      variantModel.create.mockResolvedValue({
        id: 'var-1',
        sku: 'SKU-001',
        name: '128GB Black',
        productId: 'prod-1',
      });

      const result = await service.create('prod-1', 'vendor-1', {
        sku: 'SKU-001',
        name: '128GB Black',
      });

      expect(result.sku).toBe('SKU-001');
      expect(result.productId).toBe('prod-1');
    });

    it('should throw when product is APPROVED', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.APPROVED,
        }),
      });

      await expect(
        service.create('prod-1', 'vendor-1', {
          sku: 'SKU-001',
          name: '128GB',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.DRAFT,
        }),
      });
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'existing', sku: 'SKU-001' }),
      });

      await expect(
        service.create('prod-1', 'vendor-1', {
          sku: 'SKU-001',
          name: '128GB',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when product doesn't belong to vendor", async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'other-vendor',
          status: ProductStatus.DRAFT,
        }),
      });

      await expect(
        service.create('prod-1', 'vendor-1', {
          sku: 'SKU-001',
          name: '128GB',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update variant fields', async () => {
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          name: 'Old Name',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.DRAFT,
        }),
      });
      variantModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          name: 'New Name',
          productId: 'prod-1',
        }),
      });

      const result = await service.update('var-1', 'vendor-1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
    });

    it('should allow minor field edits on variants of APPROVED products', async () => {
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          name: 'Old Name',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.APPROVED,
        }),
      });
      variantModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          name: 'Old Name',
          isActive: false,
          barcode: '123456',
          productId: 'prod-1',
        }),
      });

      const result = await service.update('var-1', 'vendor-1', {
        isActive: false,
        barcode: '123456',
      });

      expect(result.isActive).toBe(false);
      expect(result.barcode).toBe('123456');
    });

    it('should reject major field edits on variants of APPROVED products', async () => {
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.APPROVED,
        }),
      });

      await expect(
        service.update('var-1', 'vendor-1', { name: 'New Name' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject updates to PENDING_REVIEW products variants', async () => {
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.PENDING_REVIEW,
        }),
      });

      await expect(
        service.update('var-1', 'vendor-1', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a variant from a DRAFT product', async () => {
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.DRAFT,
        }),
      });
      variantModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      await service.delete('var-1', 'vendor-1');

      expect(variantModel.deleteOne).toHaveBeenCalled();
    });

    it('should delete a variant from a REJECTED product', async () => {
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.REJECTED,
        }),
      });
      variantModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      await service.delete('var-1', 'vendor-1');

      expect(variantModel.deleteOne).toHaveBeenCalled();
    });

    it('should reject deletion from APPROVED product', async () => {
      variantModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'var-1',
          productId: 'prod-1',
        }),
      });
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'prod-1',
          vendorId: 'vendor-1',
          status: ProductStatus.APPROVED,
        }),
      });

      await expect(service.delete('var-1', 'vendor-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
