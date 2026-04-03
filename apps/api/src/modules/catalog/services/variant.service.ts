import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ProductStatus } from '@ecommerce/shared-types';
import { Variant, VariantDocument } from '../schemas/variant.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { CreateVariantDto, UpdateVariantDto } from '../dto';

const EDITABLE_STATUSES = [ProductStatus.DRAFT, ProductStatus.REJECTED];

@Injectable()
export class VariantService {
  constructor(
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(
    productId: string,
    vendorId: string,
    dto: CreateVariantDto,
  ): Promise<Variant> {
    const product = await this.productModel.findOne({ id: productId }).exec();
    if (!product || product.vendorId !== vendorId) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    if (!EDITABLE_STATUSES.includes(product.status)) {
      throw new BadRequestException(
        `Cannot add variants to a product in '${product.status}' status`,
      );
    }

    // Check SKU uniqueness
    const existingSku = await this.variantModel.findOne({ sku: dto.sku }).exec();
    if (existingSku) {
      throw new ConflictException(`SKU '${dto.sku}' is already in use`);
    }

    const variant = await this.variantModel.create({
      id: uuidv4(),
      ...dto,
      productId,
    });

    return variant;
  }

  async update(
    variantId: string,
    vendorId: string,
    dto: UpdateVariantDto,
  ): Promise<Variant> {
    const variant = await this.variantModel.findOne({ id: variantId }).exec();
    if (!variant) {
      throw new NotFoundException(`Variant '${variantId}' not found`);
    }
    
    const product = await this.productModel.findOne({ id: variant.productId }).exec();
    if (!product || product.vendorId !== vendorId) {
      throw new NotFoundException(`Variant '${variantId}' not found`);
    }

    // For APPROVED products, only allow minor field edits
    if (product.status === ProductStatus.APPROVED) {
      const majorFields = ['sku', 'name'];
      const attemptedMajorFields = majorFields.filter((field) => dto[field] !== undefined);
      if (attemptedMajorFields.length > 0) {
        throw new BadRequestException(
          `Cannot edit major fields (${attemptedMajorFields.join(', ')}) on variants of an approved product. Only minor fields (isActive, barcode, weightGrams, dimensionsCm) can be edited.`,
        );
      }
      // Only apply minor fields
      const minorFields = ['isActive', 'barcode', 'weightGrams', 'dimensionsCm'];
      const minorDto: Partial<UpdateVariantDto> = {};
      minorFields.forEach((field) => {
        if (dto[field] !== undefined) {
          minorDto[field] = dto[field];
        }
      });
      const updated = await this.variantModel.findOneAndUpdate(
        { id: variantId },
        { $set: minorDto },
        { new: true }
      ).exec();
      if (!updated) throw new NotFoundException(`Variant '${variantId}' not found`);
      return updated;
    }

    // For DRAFT and REJECTED, allow all edits
    if (!EDITABLE_STATUSES.includes(product.status)) {
      throw new BadRequestException(
        `Cannot update variants of a product in '${product.status}' status`,
      );
    }

    const updated = await this.variantModel.findOneAndUpdate(
      { id: variantId },
      { $set: dto },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Variant '${variantId}' not found`);
    return updated;
  }

  async delete(variantId: string, vendorId: string): Promise<void> {
    const variant = await this.variantModel.findOne({ id: variantId }).exec();
    if (!variant) {
      throw new NotFoundException(`Variant '${variantId}' not found`);
    }
    
    const product = await this.productModel.findOne({ id: variant.productId }).exec();
    if (!product || product.vendorId !== vendorId) {
      throw new NotFoundException(`Variant '${variantId}' not found`);
    }

    if (!EDITABLE_STATUSES.includes(product.status)) {
      throw new BadRequestException(
        `Cannot delete variants of a product in '${product.status}' status. Only variants of DRAFT or REJECTED products can be deleted.`,
      );
    }

    await this.variantModel.deleteOne({ id: variantId }).exec();
  }
}
