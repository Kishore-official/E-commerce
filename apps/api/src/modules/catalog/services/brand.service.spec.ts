import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { BrandService } from './brand.service';
import { Brand } from '../schemas/brand.schema';

describe('BrandService', () => {
  let service: BrandService;
  let brandModel: any;

  // Helper to create chainable find mock
  function createFindChain(resolvedValue: any = []) {
    return {
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
  }

  beforeEach(async () => {
    const mockBrandModel = {
      find: jest.fn().mockReturnValue(createFindChain()),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandService,
        {
          provide: getModelToken(Brand.name),
          useValue: mockBrandModel,
        },
      ],
    }).compile();

    service = module.get<BrandService>(BrandService);
    brandModel = module.get(getModelToken(Brand.name));
  });

  describe('findActive', () => {
    it('should return active brands sorted by name', async () => {
      brandModel.find.mockReturnValue(
        createFindChain([
          { id: '1', name: 'Apple', isActive: true },
          { id: '2', name: 'Samsung', isActive: true },
        ]),
      );

      const result = await service.findActive();
      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should generate slug and save', async () => {
      // ensureUniqueSlug: findOne returns null (slug is unique)
      brandModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      brandModel.create.mockResolvedValue({
        id: 'brand-1',
        name: 'Samsung',
        slug: 'samsung',
      });

      const result = await service.create({ name: 'Samsung' });

      expect(result.slug).toBe('samsung');
      expect(brandModel.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update fields', async () => {
      brandModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'brand-1',
          name: 'Samsung',
          slug: 'samsung',
        }),
      });
      brandModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'brand-1',
          name: 'Samsung',
          slug: 'samsung',
          logoUrl: 'https://new-logo.png',
        }),
      });

      const result = await service.update('brand-1', {
        logoUrl: 'https://new-logo.png',
      });

      expect(result.logoUrl).toBe('https://new-logo.png');
    });

    it('should throw NotFoundException for non-existent brand', async () => {
      brandModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
