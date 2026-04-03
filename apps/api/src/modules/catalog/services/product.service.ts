import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ProductStatus } from '@ecommerce/shared-types';
import { PaginatedResult } from '@ecommerce/shared-types';
import { Product, ProductDocument } from '../schemas/product.schema';
import { ProductImage, ProductImageDocument } from '../schemas/product-image.schema';
import { ProductAttribute, ProductAttributeDocument } from '../schemas/product-attribute.schema';
import { Variant, VariantDocument } from '../schemas/variant.schema';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, AddProductImageDto } from '../dto';
import { generateSlug } from '@common/utils/slug.util';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { EventBusService } from '@common/events/event-bus.service';
import { StorageService } from '@common/services/storage.service';
import { assertProductTransition } from '../state-machines/product-status.machine';
import {
  ProductSubmittedForReviewEvent,
  ProductApprovedEvent,
  ProductRejectedEvent,
  ProductArchivedEvent,
} from '../events/catalog.events';

const EDITABLE_STATUSES = [ProductStatus.DRAFT, ProductStatus.REJECTED];
const MINOR_FIELDS = ['description', 'shortDescription', 'metaTitle', 'metaDescription'];

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductImage.name)
    private readonly imageModel: Model<ProductImageDocument>,
    @InjectModel(ProductAttribute.name)
    private readonly attrModel: Model<ProductAttributeDocument>,
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    private readonly eventBus: EventBusService,
    private readonly storageService: StorageService,
  ) {}

  // ── Vendor methods ──

  async create(vendorId: string, dto: CreateProductDto): Promise<Product> {
    const slug = await this.ensureUniqueSlug(generateSlug(dto.name));

    const { images, attributes, ...productData } = dto;

    const product = await this.productModel.create({
      id: uuidv4(),
      ...productData,
      vendorId,
      slug,
      status: ProductStatus.DRAFT,
    });

    if (images?.length) {
      const imageDocs = images.map((img) => ({
        id: uuidv4(),
        ...img,
        productId: product.id,
      }));
      await this.imageModel.insertMany(imageDocs);
      product.images = await this.imageModel.find({ productId: product.id }).sort({ sortOrder: 1 }).exec();
    }

    if (attributes?.length) {
      const attrDocs = attributes.map((attr) => ({
        id: uuidv4(),
        ...attr,
        productId: product.id,
      }));
      await this.attrModel.insertMany(attrDocs);
      product.attributes = await this.attrModel.find({ productId: product.id }).exec();
    }

    return product;
  }

  async findByVendor(
    vendorId: string,
    query: ProductQueryDto,
  ): Promise<PaginatedResult<Product>> {
    const filter: Record<string, unknown> = { vendorId };
    this.applyFiltersToMongo(filter, query);

    const [data, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    // Load images for paginated products
    // Use .aggregate() to bypass Mongoose String type casting on productId,
    // since bulk-uploaded images store productId as ObjectId
    if (data.length > 0) {
      const productIds = data.map((p) => p.id);
      const productObjectIds = data.map((p) => (p as any)._id).filter(Boolean);
      const imageMatchStage = productObjectIds.length > 0
        ? { $match: { $or: [
              { productId: { $in: productIds } },
              { productId: { $in: productObjectIds } },
            ] } }
        : { $match: { productId: { $in: productIds } } };
      const images = await this.imageModel.aggregate([imageMatchStage, { $sort: { sortOrder: 1 } }]).exec();
      const imagesByProduct = new Map<string, any[]>();
      images.forEach((img: any) => {
        const imgPid = img.productId;
        let matchedId: string | undefined = productIds.find((pid) => pid === imgPid);
        if (!matchedId) {
          const imgIdStr = imgPid?.toString();
          const match = data.find((p) => (p as any)._id?.toString() === imgIdStr || p.id === imgIdStr);
          matchedId = match?.id;
        }
        if (matchedId) {
          const list = imagesByProduct.get(matchedId) || [];
          list.push(img);
          imagesByProduct.set(matchedId, list);
        }
      });
      data.forEach((p) => {
        (p as any).images = imagesByProduct.get(p.id) || [];
      });
    }

    return buildPaginatedResult(data, totalItems, query.page, query.limit);
  }

  async findOneByVendor(productId: string, vendorId: string): Promise<Product> {
    const doc = await this.productModel.findOne({ id: productId, vendorId }).exec();
    if (!doc) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    // Load related data
    // Use .aggregate() for images to bypass Mongoose String type casting
    const productOid = (doc as any)._id;
    const imageMatch = productOid
      ? { $match: { $or: [{ productId }, { productId: productOid }] } }
      : { $match: { productId } };
    const [variants, images, attributes] = await Promise.all([
      this.variantModel.find({ productId }).lean().exec(),
      this.imageModel.aggregate([imageMatch, { $sort: { sortOrder: 1 } }]).exec(),
      this.attrModel.find({ productId }).lean().exec(),
    ]);

    // Convert to plain object so TransformInterceptor doesn't strip virtual fields
    const product = doc.toJSON() as any;
    product.variants = variants;
    product.images = images;
    product.attributes = attributes;

    return product;
  }

  async update(
    productId: string,
    vendorId: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOneByVendor(productId, vendorId);

    // For APPROVED products, only allow minor field edits
    if (product.status === ProductStatus.APPROVED) {
      const majorFields = ['name', 'categoryId', 'brandId', 'countryOfOrigin'];
      const attemptedMajorFields = majorFields.filter((field) => dto[field] !== undefined);
      if (attemptedMajorFields.length > 0) {
        throw new BadRequestException(
          `Cannot edit major fields (${attemptedMajorFields.join(', ')}) on an approved product. Only minor fields (description, shortDescription, metaTitle, metaDescription) can be edited.`,
        );
      }
      // Only apply minor fields
      const minorDto: Partial<UpdateProductDto> = {};
      MINOR_FIELDS.forEach((field) => {
        if (dto[field] !== undefined) {
          minorDto[field] = dto[field];
        }
      });
      const updated = await this.productModel.findOneAndUpdate(
        { id: productId },
        { $set: minorDto },
        { new: true }
      ).exec();
      if (!updated) throw new NotFoundException(`Product '${productId}' not found`);
      return updated;
    }

    // For DRAFT and REJECTED, allow all edits
    if (!EDITABLE_STATUSES.includes(product.status)) {
      throw new BadRequestException(
        `Cannot edit a product in '${product.status}' status`,
      );
    }

    const updateData: Partial<Product> = { ...dto };
    if (dto.name && dto.name !== product.name) {
      updateData.slug = await this.ensureUniqueSlug(generateSlug(dto.name), product.id);
    }

    const updated = await this.productModel.findOneAndUpdate(
      { id: productId },
      { $set: updateData },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Product '${productId}' not found`);
    return updated;
  }

  async submitForReview(productId: string, vendorId: string): Promise<Product> {
    const product = await this.findOneByVendor(productId, vendorId);
    assertProductTransition(product.status, ProductStatus.PENDING_REVIEW);

    // Must have at least one variant
    const variantCount = await this.variantModel.countDocuments({ productId }).exec();
    if (variantCount === 0) {
      throw new BadRequestException(
        'Product must have at least one variant before submitting for review',
      );
    }

    const updated = await this.productModel.findOneAndUpdate(
      { id: productId },
      { $set: { status: ProductStatus.PENDING_REVIEW } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Product '${productId}' not found`);
    
    this.eventBus.emit(new ProductSubmittedForReviewEvent(productId, vendorId));
    return updated;
  }

  async archive(productId: string, vendorId: string): Promise<Product> {
    const product = await this.findOneByVendor(productId, vendorId);
    assertProductTransition(product.status, ProductStatus.ARCHIVED);

    const updated = await this.productModel.findOneAndUpdate(
      { id: productId },
      { $set: { status: ProductStatus.ARCHIVED } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Product '${productId}' not found`);

    this.eventBus.emit(new ProductArchivedEvent(productId, vendorId));

    return updated;
  }

  async addImage(
    productId: string,
    vendorId: string,
    dto: AddProductImageDto,
  ): Promise<ProductImage> {
    const product = await this.findOneByVendor(productId, vendorId);

    if (dto.isPrimary) {
      await this.imageModel.updateMany(
        { productId: product.id },
        { $set: { isPrimary: false } }
      ).exec();
    }

    const imageId = uuidv4();
    await this.imageModel.create({
      id: imageId,
      ...dto,
      productId: product.id,
    });
    // Re-fetch without imageData (select: false) to avoid returning binary in response
    const image = await this.imageModel.findOne({ id: imageId }).exec();
    return image!;
  }

  async updateImageUrl(imageId: string, url: string): Promise<void> {
    await this.imageModel.updateOne({ id: imageId }, { $set: { url } }).exec();
  }

  async removeImage(
    productId: string,
    imageId: string,
    vendorId: string,
  ): Promise<void> {
    await this.findOneByVendor(productId, vendorId);

    const image = await this.imageModel.findOne({ id: imageId, productId }).exec();
    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found`);
    }

    const key = this.storageService.extractKeyFromUrl(image.url);
    if (key) {
      try {
        await this.storageService.deleteFile(key);
      } catch (error) {
        this.logger.warn(`Failed to delete file for image ${imageId}: ${error}`);
      }
    }

    await this.imageModel.deleteOne({ id: imageId }).exec();
  }

  async addAttribute(
    productId: string,
    vendorId: string,
    dto: { attributeName: string; attributeValue: string; variantId?: string },
  ): Promise<ProductAttribute> {
    const product = await this.findOneByVendor(productId, vendorId);

    const attribute = await this.attrModel.create({
      id: uuidv4(),
      ...dto,
      productId: product.id,
    });
    return attribute;
  }

  async updateAttribute(
    attributeId: string,
    vendorId: string,
    dto: { attributeName?: string; attributeValue?: string },
  ): Promise<ProductAttribute> {
    const attribute = await this.attrModel.findOne({ id: attributeId }).exec();
    if (!attribute) {
      throw new NotFoundException(`Attribute '${attributeId}' not found`);
    }
    
    const product = await this.productModel.findOne({ id: attribute.productId }).exec();
    if (!product || product.vendorId !== vendorId) {
      throw new NotFoundException(`Attribute '${attributeId}' not found`);
    }

    const updated = await this.attrModel.findOneAndUpdate(
      { id: attributeId },
      { $set: dto },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Attribute '${attributeId}' not found`);
    return updated;
  }

  async removeAttribute(
    attributeId: string,
    vendorId: string,
  ): Promise<void> {
    const attribute = await this.attrModel.findOne({ id: attributeId }).exec();
    if (!attribute) {
      throw new NotFoundException(`Attribute '${attributeId}' not found`);
    }
    
    const product = await this.productModel.findOne({ id: attribute.productId }).exec();
    if (!product || product.vendorId !== vendorId) {
      throw new NotFoundException(`Attribute '${attributeId}' not found`);
    }

    await this.attrModel.deleteOne({ id: attributeId }).exec();
  }

  // ── Admin methods ──

  async findAll(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const filter: Record<string, unknown> = {};
    this.applyFiltersToMongo(filter, query);

    const [data, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    // Load images for paginated products
    // Use .aggregate() to bypass Mongoose String type casting on productId,
    // since bulk-uploaded images store productId as ObjectId
    if (data.length > 0) {
      const productIds = data.map((p) => p.id);
      const productObjectIds = data.map((p) => (p as any)._id).filter(Boolean);
      const imageMatchStage = productObjectIds.length > 0
        ? { $match: { $or: [
              { productId: { $in: productIds } },
              { productId: { $in: productObjectIds } },
            ] } }
        : { $match: { productId: { $in: productIds } } };
      const images = await this.imageModel.aggregate([imageMatchStage, { $sort: { sortOrder: 1 } }]).exec();
      const imagesByProduct = new Map<string, any[]>();
      images.forEach((img: any) => {
        const imgPid = img.productId;
        let matchedId: string | undefined = productIds.find((pid) => pid === imgPid);
        if (!matchedId) {
          const imgIdStr = imgPid?.toString();
          const match = data.find((p) => (p as any)._id?.toString() === imgIdStr || p.id === imgIdStr);
          matchedId = match?.id;
        }
        if (matchedId) {
          const list = imagesByProduct.get(matchedId) || [];
          list.push(img);
          imagesByProduct.set(matchedId, list);
        }
      });
      data.forEach((p) => {
        (p as any).images = imagesByProduct.get(p.id) || [];
      });
    }

    return buildPaginatedResult(data, totalItems, query.page, query.limit);
  }

  async findById(productId: string): Promise<Product> {
    const product = await this.productModel.findOne({ id: productId }).exec();
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }
    
    // Load related data
    // Use .aggregate() for images to bypass Mongoose String type casting
    const productOid = (product as any)._id;
    const imageMatch = productOid
      ? { $match: { $or: [{ productId }, { productId: productOid }] } }
      : { $match: { productId } };
    const [variants, images, attributes] = await Promise.all([
      this.variantModel.find({ productId }).exec(),
      this.imageModel.aggregate([imageMatch, { $sort: { sortOrder: 1 } }]).exec(),
      this.attrModel.find({ productId }).exec(),
    ]);

    (product as any).variants = variants;
    (product as any).images = images;
    (product as any).attributes = attributes;
    
    return product;
  }

  async approve(productId: string, adminUserId: string): Promise<Product> {
    const product = await this.productModel.findOne({ id: productId }).exec();
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    assertProductTransition(product.status, ProductStatus.APPROVED);
    const updated = await this.productModel.findOneAndUpdate(
      { id: productId },
      { $set: { status: ProductStatus.APPROVED } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Product '${productId}' not found`);
    
    this.eventBus.emit(new ProductApprovedEvent(productId, adminUserId));
    return updated;
  }

  async reject(
    productId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<Product> {
    const product = await this.productModel.findOne({ id: productId }).exec();
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    assertProductTransition(product.status, ProductStatus.REJECTED);
    const updated = await this.productModel.findOneAndUpdate(
      { id: productId },
      { $set: { status: ProductStatus.REJECTED, rejectionReason: reason || null } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Product '${productId}' not found`);
    
    this.eventBus.emit(new ProductRejectedEvent(productId, adminUserId, reason));
    return updated;
  }

  // ── Public methods ──

  async findBySlug(slug: string): Promise<Product> {
    const doc = await this.productModel.findOne({ slug, status: ProductStatus.APPROVED }).exec();
    if (!doc) {
      throw new NotFoundException(`Product with slug '${slug}' not found`);
    }

    // Load related data — use .aggregate() for images to bypass Mongoose String casting
    const productOid = (doc as any)._id;
    const imageMatch = productOid
      ? { $match: { $or: [{ productId: doc.id }, { productId: productOid }] } }
      : { $match: { productId: doc.id } };
    const [variants, images, attributes] = await Promise.all([
      this.variantModel.find({ productId: doc.id, isActive: true }).sort({ sortOrder: 1 }).lean().exec(),
      this.imageModel.aggregate([imageMatch, { $sort: { sortOrder: 1 } }]).exec(),
      this.attrModel.find({ productId: doc.id }).lean().exec(),
    ]);

    // Convert to plain object so TransformInterceptor doesn't strip virtual fields
    const product = doc.toJSON() as any;
    product.variants = variants;
    product.images = images;
    product.attributes = attributes;

    return product;
  }

  async findVariantsByProductId(productId: string): Promise<Variant[]> {
    const product = await this.productModel.findOne({ id: productId, status: ProductStatus.APPROVED }).exec();
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    return this.variantModel
      .find({ productId, isActive: true })
      .sort({ sortOrder: 1 })
      .exec();
  }

  // ── Private helpers ──

  private applyFiltersToMongo(filter: Record<string, unknown>, query: ProductQueryDto): void {
    if (query.status) {
      filter.status = query.status;
    }
    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }
    if (query.brandId) {
      filter.brandId = query.brandId;
    }
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }
  }

  private async ensureUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<string> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter.id = { $ne: excludeId };
    }

    const existing = await this.productModel.findOne(filter).exec();
    if (!existing) return slug;

    const suffix = Math.random().toString(36).substring(2, 8);
    return `${slug}-${suffix}`;
  }

}
