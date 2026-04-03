import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  OfferStatus,
  OfferType,
  ProductStatus,
  PaginatedResult,
} from '@ecommerce/shared-types';
import { Offer, OfferDocument } from '../schemas/offer.schema';
import { Product, ProductDocument } from '../../catalog/schemas/product.schema';
import { Variant, VariantDocument } from '../../catalog/schemas/variant.schema';
import { CreateOfferDto, UpdateOfferDto, UpdateStockDto, OfferQueryDto } from '../dto';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { EventBusService } from '@common/events/event-bus.service';
import { assertOfferTransition } from '../state-machines/offer-status.machine';
import {
  OfferActivatedEvent,
  OfferStockDepletedEvent,
  OfferPausedEvent,
  OfferArchivedEvent,
  OfferSubmittedForReviewEvent,
  OfferApprovedEvent,
  OfferRejectedEvent,
} from '../events/offer.events';

@Injectable()
export class OfferService {
  constructor(
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Vendor methods ──

  async create(vendorId: string, dto: CreateOfferDto): Promise<Offer> {
    // Verify product exists and belongs to vendor
    const product = await this.productModel.findOne({ id: dto.productId }).exec();
    if (!product || product.vendorId !== vendorId) {
      throw new NotFoundException(`Product '${dto.productId}' not found`);
    }
    if (product.status !== ProductStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot create offer for a product in '${product.status}' status. The product must be approved first.`,
      );
    }

    // Verify variant exists and belongs to product
    const variant = await this.variantModel.findOne({ id: dto.variantId, productId: dto.productId }).exec();
    if (!variant) {
      throw new NotFoundException(
        `Variant '${dto.variantId}' not found for product '${dto.productId}'`,
      );
    }

    // Check for existing offer (unique constraint)
    const existing = await this.offerModel.findOne({
      variantId: dto.variantId,
      vendorId,
      countryCode: dto.countryCode || 'IN',
    }).exec();
    if (existing) {
      throw new ConflictException(
        'An offer already exists for this variant, vendor, and country combination',
      );
    }

    // Validate compareAtPrice > priceAmount
    if (dto.compareAtPrice !== undefined && dto.compareAtPrice <= dto.priceAmount) {
      throw new BadRequestException(
        'compareAtPrice must be greater than priceAmount',
      );
    }

    const offer = await this.offerModel.create({
      id: uuidv4(),
      ...dto,
      vendorId,
      status: OfferStatus.DRAFT,
    });

    return offer;
  }

  async findByVendor(
    vendorId: string,
    query: OfferQueryDto,
  ): Promise<PaginatedResult<Offer>> {
    const filter: Record<string, unknown> = { vendorId, deletedAt: null };
    this.applyFiltersToMongo(filter, query);

    const [data, totalItems] = await Promise.all([
      this.offerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean()
        .exec(),
      this.offerModel.countDocuments(filter).exec(),
    ]);

    // Batch-load product and variant names
    const productIds = [...new Set(data.map((o) => o.productId))];
    const variantIds = [...new Set(data.map((o) => o.variantId))];
    const [products, variants] = await Promise.all([
      productIds.length ? this.productModel.find({ id: { $in: productIds } }).exec() : [],
      variantIds.length ? this.variantModel.find({ id: { $in: variantIds } }).exec() : [],
    ]);
    const productMap = new Map(products.map((p) => [p.id, p.name] as [string, string]));
    const variantMap = new Map(variants.map((v) => [v.id, v.name] as [string, string]));
    const enriched = data.map((offer) =>
      Object.assign(offer, {
        productName: productMap.get(offer.productId) ?? null,
        variantName: variantMap.get(offer.variantId) ?? null,
      }),
    );

    return buildPaginatedResult(enriched, totalItems, query.page, query.limit);
  }

  async update(
    offerId: string,
    vendorId: string,
    dto: UpdateOfferDto,
  ): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);

    if (
      offer.status !== OfferStatus.DRAFT &&
      offer.status !== OfferStatus.PAUSED &&
      offer.status !== OfferStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot edit an offer in '${offer.status}' status. Pause the offer first or resubmit after rejection.`,
      );
    }

    // Validate compareAtPrice > priceAmount
    const effectivePrice = dto.priceAmount ?? offer.priceAmount;
    const effectiveCompareAt = dto.compareAtPrice ?? offer.compareAtPrice;
    if (effectiveCompareAt !== undefined && effectiveCompareAt !== null && effectiveCompareAt <= effectivePrice) {
      throw new BadRequestException(
        'compareAtPrice must be greater than priceAmount',
      );
    }

    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: dto },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    return updated;
  }

  async submitForReview(offerId: string, vendorId: string): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);
    assertOfferTransition(offer.status, OfferStatus.PENDING_REVIEW);

    // Product must be approved
    const product = await this.productModel.findOne({ id: offer.productId }).exec();
    if (!product || product.status !== ProductStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot submit offer for review: the associated product must be approved',
      );
    }

    // Marketplace offers need stock > 0
    if (
      offer.offerType === OfferType.MARKETPLACE &&
      offer.stockQuantity <= 0
    ) {
      throw new BadRequestException(
        'Cannot submit marketplace offer with zero stock',
      );
    }

    // Affiliate offers need affiliateUrl
    if (
      offer.offerType === OfferType.AFFILIATE &&
      !offer.affiliateUrl
    ) {
      throw new BadRequestException(
        'Cannot submit affiliate offer without affiliate URL',
      );
    }

    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.PENDING_REVIEW } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    
    this.eventBus.emit(new OfferSubmittedForReviewEvent(offerId, vendorId));
    return updated;
  }

  async activate(offerId: string, vendorId: string): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);
    assertOfferTransition(offer.status, OfferStatus.ACTIVE);

    // Prevent reactivating an out-of-stock offer with zero stock
    if (offer.offerType === OfferType.MARKETPLACE && offer.stockQuantity <= 0) {
      throw new BadRequestException('Cannot activate an offer with zero stock');
    }

    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.ACTIVE } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    
    this.eventBus.emit(new OfferActivatedEvent(offerId, vendorId));
    return updated;
  }

  async pause(offerId: string, vendorId: string): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);
    assertOfferTransition(offer.status, OfferStatus.PAUSED);

    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.PAUSED } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    
    this.eventBus.emit(new OfferPausedEvent(offerId, vendorId));
    return updated;
  }

  async updateStock(
    offerId: string,
    vendorId: string,
    dto: UpdateStockDto,
  ): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);

    if (offer.offerType !== OfferType.MARKETPLACE) {
      throw new BadRequestException(
        'Stock management is only available for marketplace offers',
      );
    }

    // Auto-transition: ACTIVE → OUT_OF_STOCK when stock hits 0
    if (dto.stockQuantity === 0 && offer.status === OfferStatus.ACTIVE) {
      assertOfferTransition(offer.status, OfferStatus.OUT_OF_STOCK);
      const updated = await this.offerModel.findOneAndUpdate(
        { id: offerId },
        { $set: { stockQuantity: dto.stockQuantity, status: OfferStatus.OUT_OF_STOCK } },
        { new: true }
      ).exec();
      if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
      this.eventBus.emit(new OfferStockDepletedEvent(offerId, vendorId));
      return updated;
    }

    // Auto-transition: OUT_OF_STOCK → ACTIVE when restocked
    if (dto.stockQuantity > 0 && offer.status === OfferStatus.OUT_OF_STOCK) {
      assertOfferTransition(offer.status, OfferStatus.ACTIVE);
      const updated = await this.offerModel.findOneAndUpdate(
        { id: offerId },
        { $set: { stockQuantity: dto.stockQuantity, status: OfferStatus.ACTIVE } },
        { new: true }
      ).exec();
      if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
      this.eventBus.emit(new OfferActivatedEvent(offerId, vendorId));
      return updated;
    }

    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { stockQuantity: dto.stockQuantity } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    return updated;
  }

  // ── Admin methods ──

  async findAll(query: OfferQueryDto): Promise<PaginatedResult<Offer>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    this.applyFiltersToMongo(filter, query);

    const [data, totalItems] = await Promise.all([
      this.offerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean()
        .exec(),
      this.offerModel.countDocuments(filter).exec(),
    ]);

    // Enrich with product and variant names for admin display
    const productIds = [...new Set(data.map((o) => o.productId))];
    const variantIds = [...new Set(data.map((o) => o.variantId))];
    const [products, variants] = await Promise.all([
      productIds.length ? this.productModel.find({ id: { $in: productIds } }).exec() : [],
      variantIds.length ? this.variantModel.find({ id: { $in: variantIds } }).exec() : [],
    ]);
    const productMap = new Map(products.map((p) => [p.id, p.name] as [string, string]));
    const variantMap = new Map(variants.map((v) => [v.id, v.name] as [string, string]));
    const enriched = data.map((offer) =>
      Object.assign(offer, {
        productName: productMap.get(offer.productId) ?? null,
        variantName: variantMap.get(offer.variantId) ?? null,
      }),
    );

    return buildPaginatedResult(enriched, totalItems, query.page, query.limit);
  }

  async approve(offerId: string, adminUserId: string): Promise<Offer> {
    const offer = await this.offerModel.findOne({ id: offerId }).exec();
    if (!offer) {
      throw new NotFoundException(`Offer '${offerId}' not found`);
    }

    assertOfferTransition(offer.status, OfferStatus.ACTIVE);
    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.ACTIVE } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    
    this.eventBus.emit(new OfferApprovedEvent(offerId, offer.vendorId, adminUserId));
    return updated;
  }

  async reject(
    offerId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<Offer> {
    const offer = await this.offerModel.findOne({ id: offerId }).exec();
    if (!offer) {
      throw new NotFoundException(`Offer '${offerId}' not found`);
    }

    assertOfferTransition(offer.status, OfferStatus.REJECTED);
    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.REJECTED, rejectionReason: reason || null } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    
    this.eventBus.emit(new OfferRejectedEvent(offerId, offer.vendorId, adminUserId, reason));
    return updated;
  }

  async archive(offerId: string): Promise<Offer> {
    const offer = await this.offerModel.findOne({ id: offerId }).exec();
    if (!offer) {
      throw new NotFoundException(`Offer '${offerId}' not found`);
    }

    assertOfferTransition(offer.status, OfferStatus.ARCHIVED);
    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.ARCHIVED } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    
    this.eventBus.emit(new OfferArchivedEvent(offerId, offer.vendorId));
    return updated;
  }

  async archiveByVendor(offerId: string, vendorId: string): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);
    assertOfferTransition(offer.status, OfferStatus.ARCHIVED);
    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.ARCHIVED } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    
    this.eventBus.emit(new OfferArchivedEvent(offerId, vendorId));
    return updated;
  }

  async unarchiveByVendor(offerId: string, vendorId: string): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);
    assertOfferTransition(offer.status, OfferStatus.DRAFT);
    const updated = await this.offerModel.findOneAndUpdate(
      { id: offerId },
      { $set: { status: OfferStatus.DRAFT, deletedAt: null } },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException(`Offer '${offerId}' not found`);
    return updated;
  }

  async findOneByVendor(offerId: string, vendorId: string): Promise<Offer> {
    const offer = await this.findOwnOffer(offerId, vendorId);
    const [product, variant] = await Promise.all([
      this.productModel.findOne({ id: offer.productId }).exec(),
      this.variantModel.findOne({ id: offer.variantId }).exec(),
    ]);
    return Object.assign(offer, {
      productName: product?.name ?? null,
      variantName: variant?.name ?? null,
    });
  }

  async findOne(offerId: string): Promise<Offer> {
    const offer = await this.offerModel.findOne({ id: offerId }).exec();
    if (!offer) {
      throw new NotFoundException(`Offer '${offerId}' not found`);
    }
    const [product, variant] = await Promise.all([
      this.productModel.findOne({ id: offer.productId }).exec(),
      this.variantModel.findOne({ id: offer.variantId }).exec(),
    ]);
    return Object.assign(offer.toObject(), {
      productName: product?.name ?? null,
      variantName: variant?.name ?? null,
    });
  }

  // ── Public methods ──

  async findActive(query: OfferQueryDto): Promise<PaginatedResult<Offer>> {
    const filter: Record<string, unknown> = { status: OfferStatus.ACTIVE };
    
    if (query.productId) {
      filter.productId = query.productId;
    }
    if (query.countryCode) {
      filter.countryCode = query.countryCode;
    }
    if (query.offerType) {
      filter.offerType = query.offerType;
    }
    if (query.variantId) {
      filter.variantId = query.variantId;
    }
    if (query.isFeatured !== undefined) {
      filter.isFeatured = query.isFeatured;
    }

    const [data, totalItems] = await Promise.all([
      this.offerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.offerModel.countDocuments(filter).exec(),
    ]);
    return buildPaginatedResult(data, totalItems, query.page, query.limit);
  }

  async findById(offerId: string): Promise<Offer> {
    const offer = await this.offerModel.findOne({
      id: offerId,
      status: OfferStatus.ACTIVE,
    }).exec();
    if (!offer) {
      throw new NotFoundException(`Offer '${offerId}' not found`);
    }
    return offer;
  }

  // ── Private helpers ──

  private async findOwnOffer(offerId: string, vendorId: string): Promise<Offer> {
    const offer = await this.offerModel.findOne({
      id: offerId,
      vendorId,
    }).exec();
    if (!offer) {
      throw new NotFoundException(`Offer '${offerId}' not found`);
    }
    return offer;
  }

  private applyFilters(qb: any, query: OfferQueryDto): void {
    // Legacy method - kept for compatibility
  }

  private applyFiltersToMongo(filter: Record<string, unknown>, query: OfferQueryDto): void {
    if (query.productId) {
      filter.productId = query.productId;
    }
    if (query.countryCode) {
      filter.countryCode = query.countryCode;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.offerType) {
      filter.offerType = query.offerType;
    }
    if (query.variantId) {
      filter.variantId = query.variantId;
    }
    if (query.isFeatured !== undefined) {
      filter.isFeatured = query.isFeatured;
    }
  }

}
