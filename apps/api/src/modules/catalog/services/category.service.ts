import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';
import { generateSlug } from '@common/utils/slug.util';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async findActiveTree(): Promise<Category[]> {
    const roots = await this.categoryModel
      .find({ isActive: true, parentId: null, slug: { $not: /^qa-test-/ } })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();

    // Load children for each root
    for (const root of roots) {
      const children = await this.categoryModel
        .find({ parentId: root.id, isActive: true, slug: { $not: /^qa-test-/ } })
        .sort({ sortOrder: 1, name: 1 })
        .lean()
        .exec();
      (root as any).children = children;
    }

    return roots;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryModel.findOne({ slug, isActive: true }).lean().exec();
    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    // Load children
    const children = await this.categoryModel
      .find({ parentId: category.id, isActive: true })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
    (category as any).children = children;

    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      const parent = await this.categoryModel.findOne({ id: dto.parentId }).exec();
      if (!parent) {
        throw new NotFoundException(`Parent category '${dto.parentId}' not found`);
      }
    }

    const baseSlug = dto.slug ? dto.slug : generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const category = await this.categoryModel.create({
      id: uuidv4(),
      ...dto,
      slug,
    });

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryModel.findOne({ id }).exec();
    if (!category) {
      throw new NotFoundException(`Category '${id}' not found`);
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId && dto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent');
      }
      if (dto.parentId) {
        const parent = await this.categoryModel.findOne({ id: dto.parentId }).exec();
        if (!parent) {
          throw new NotFoundException(`Parent category '${dto.parentId}' not found`);
        }
      }
    }

    const updateData: Partial<Category> = { ...dto };
    if (dto.name && dto.name !== category.name) {
      updateData.slug = await this.ensureUniqueSlug(generateSlug(dto.name), id);
    }

    const updated = await this.categoryModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException(`Category '${id}' not found`);
    }

    return updated;
  }

  async findAllWithImageCounts(): Promise<Array<Category & { imageCount: number; sampleImageUrl?: string }>> {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Get all active categories
    const allCategories = await this.categoryModel
      .find({ isActive: true, slug: { $not: /^qa-test-/ } })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();

    // Get image counts per category - handle both ObjectId and string productIds
    const imageCountsObjectId = await db.collection('product_images').aggregate([
      {
        $match: { productId: { $type: 'objectId' } }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: { path: '$product', preserveNullAndEmptyArrays: true }
      },
      {
        $match: {
          'product.categoryId': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$product.categoryId',
          totalImages: { $sum: 1 },
          sampleImageUrl: { $first: '$url' }
        }
      }
    ]).toArray();

    const imageCountsString = await db.collection('product_images').aggregate([
      {
        $match: { productId: { $type: 'string' } }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: 'id',
          as: 'product'
        }
      },
      {
        $unwind: { path: '$product', preserveNullAndEmptyArrays: true }
      },
      {
        $match: {
          'product.categoryId': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$product.categoryId',
          totalImages: { $sum: 1 },
          sampleImageUrl: { $first: '$url' }
        }
      }
    ]).toArray();

    // Merge both results
    const imageCountMap = new Map<string, { count: number; sampleImage?: string }>();
    
    [...imageCountsObjectId, ...imageCountsString].forEach((item) => {
      const existing = imageCountMap.get(item._id);
      if (existing) {
        existing.count += item.totalImages;
        if (!existing.sampleImage && item.sampleImageUrl) {
          existing.sampleImage = item.sampleImageUrl;
        }
      } else {
        imageCountMap.set(item._id, {
          count: item.totalImages,
          sampleImage: item.sampleImageUrl
        });
      }
    });

    // Combine categories with image counts
    return allCategories.map((cat) => {
      const imageData = imageCountMap.get(cat.id) || { count: 0 };
      return {
        ...cat,
        imageCount: imageData.count,
        sampleImageUrl: imageData.sampleImage || cat.imageUrl
      };
    });
  }

  private async ensureUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<string> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter.id = { $ne: excludeId };
    }

    const existing = await this.categoryModel.findOne(filter).exec();
    if (!existing) return slug;

    const suffix = Math.random().toString(36).substring(2, 8);
    return `${slug}-${suffix}`;
  }
}
