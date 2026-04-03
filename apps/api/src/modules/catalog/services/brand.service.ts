import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Brand, BrandDocument } from '../schemas/brand.schema';
import { CreateBrandDto, UpdateBrandDto } from '../dto';
import { generateSlug } from '@common/utils/slug.util';

@Injectable()
export class BrandService {
  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<BrandDocument>,
  ) {}

  async findActive(): Promise<Brand[]> {
    return this.brandModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const baseSlug = dto.slug ? dto.slug : generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const brand = await this.brandModel.create({
      id: uuidv4(),
      ...dto,
      slug,
    });

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.brandModel.findOne({ id }).exec();
    if (!brand) {
      throw new NotFoundException(`Brand '${id}' not found`);
    }

    const updateData: Partial<Brand> = { ...dto };
    if (dto.name && dto.name !== brand.name) {
      updateData.slug = await this.ensureUniqueSlug(generateSlug(dto.name), id);
    }

    const updated = await this.brandModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException(`Brand '${id}' not found`);
    }

    return updated;
  }

  private async ensureUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<string> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter.id = { $ne: excludeId };
    }

    const existing = await this.brandModel.findOne(filter).exec();
    if (!existing) return slug;

    const suffix = Math.random().toString(36).substring(2, 8);
    return `${slug}-${suffix}`;
  }
}
