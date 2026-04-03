import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from '../schemas/category.schema';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryModel: any;

  // Helper to create chainable find mock
  function createFindChain(resolvedValue: any = []) {
    return {
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };
  }

  beforeEach(async () => {
    const mockCategoryModel = {
      find: jest.fn().mockReturnValue(createFindChain()),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryModel = module.get(getModelToken(Category.name));
  });

  describe('findActiveTree', () => {
    it('should return only active root categories with children', async () => {
      const rootCategory = {
        id: 'root-1',
        name: 'Electronics',
        isActive: true,
        parentId: null,
        sortOrder: 0,
      };

      // First find() call: root categories
      categoryModel.find
        .mockReturnValueOnce(createFindChain([rootCategory]))
        // Second find() call: children of root-1
        .mockReturnValueOnce(
          createFindChain([
            { id: 'child-1', name: 'Phones', isActive: true, sortOrder: 0 },
          ]),
        );

      const result = await service.findActiveTree();

      expect(result).toHaveLength(1);
      expect((result[0] as any).children).toHaveLength(1);
      expect((result[0] as any).children[0].name).toBe('Phones');
    });
  });

  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      const category = {
        id: 'cat-1',
        slug: 'electronics',
        isActive: true,
      };

      categoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(category),
      });
      // Children find
      categoryModel.find.mockReturnValue(createFindChain([]));

      const result = await service.findBySlug('electronics');
      expect(result.slug).toBe('electronics');
    });

    it('should throw for inactive or non-existent category', async () => {
      categoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should generate slug and save', async () => {
      // ensureUniqueSlug: findOne returns null (slug is unique)
      categoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      categoryModel.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Smartphones',
        slug: 'smartphones',
      });

      const result = await service.create({ name: 'Smartphones' });

      expect(result.slug).toBe('smartphones');
      expect(categoryModel.create).toHaveBeenCalled();
    });

    it('should verify parent exists when parentId provided', async () => {
      // First findOne for parent check - returns null (parent not found)
      categoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.create({ name: 'Sub', parentId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update fields and regenerate slug if name changes', async () => {
      // First findOne call: find category to update
      categoryModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({
            id: 'cat-1',
            name: 'Old Name',
            slug: 'old-name',
          }),
        })
        // Second findOne call: ensureUniqueSlug check
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(null),
        });

      categoryModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'cat-1',
          name: 'New Name',
          slug: 'new-name',
        }),
      });

      const result = await service.update('cat-1', { name: 'New Name' });

      expect(result.slug).toBe('new-name');
      expect(result.name).toBe('New Name');
    });
  });
});
