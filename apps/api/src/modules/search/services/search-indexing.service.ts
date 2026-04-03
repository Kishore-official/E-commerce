import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OfferStatus, ProductStatus } from '@ecommerce/shared-types';
import { Offer, OfferDocument } from '@modules/offers/schemas/offer.schema';
import { Product, ProductDocument } from '@modules/catalog/schemas/product.schema';
import { Variant, VariantDocument } from '@modules/catalog/schemas/variant.schema';
import { Category, CategoryDocument } from '@modules/catalog/schemas/category.schema';
import { Brand, BrandDocument } from '@modules/catalog/schemas/brand.schema';
import { ProductImage, ProductImageDocument } from '@modules/catalog/schemas/product-image.schema';
import { ProductAttribute, ProductAttributeDocument } from '@modules/catalog/schemas/product-attribute.schema';
import { OfferSearchDocument } from '../interfaces/search-document.interface';
import { OpenSearchService } from './opensearch.service';

@Injectable()
export class SearchIndexingService {
  private readonly logger = new Logger(SearchIndexingService.name);

  constructor(
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Brand.name)
    private readonly brandModel: Model<BrandDocument>,
    @InjectModel(ProductImage.name)
    private readonly imageModel: Model<ProductImageDocument>,
    @InjectModel(ProductAttribute.name)
    private readonly attrModel: Model<ProductAttributeDocument>,
    private readonly opensearch: OpenSearchService,
  ) {}

  async indexOffer(offerId: string): Promise<void> {
    if (!this.opensearch.isAvailable()) return;

    const offer = await this.offerModel.findOne({ id: offerId }).exec();
    if (!offer || offer.status !== OfferStatus.ACTIVE) {
      await this.opensearch.deleteDocument(offerId);
      return;
    }

    const product = await this.productModel.findOne({
      id: offer.productId,
      status: ProductStatus.APPROVED,
    }).exec();
    if (!product) {
      await this.opensearch.deleteDocument(offerId);
      return;
    }

    const doc = await this.buildDocument(offer, product);
    await this.opensearch.indexDocument(doc);
    this.logger.debug(`Indexed offer ${offerId}`);
  }

  async removeOffer(offerId: string): Promise<void> {
    if (!this.opensearch.isAvailable()) return;
    await this.opensearch.deleteDocument(offerId);
    this.logger.debug(`Removed offer ${offerId} from index`);
  }

  async indexAllOffersForProduct(productId: string): Promise<void> {
    if (!this.opensearch.isAvailable()) return;

    const offers = await this.offerModel.find({
      productId,
      status: OfferStatus.ACTIVE,
    }).exec();

    for (const offer of offers) {
      await this.indexOffer(offer.id);
    }
  }

  async removeAllOffersForProduct(productId: string): Promise<void> {
    if (!this.opensearch.isAvailable()) return;

    const offers = await this.offerModel.find({ productId }).exec();
    for (const offer of offers) {
      await this.opensearch.deleteDocument(offer.id);
    }
  }

  async buildDocument(
    offer: Offer,
    product: Product,
  ): Promise<OfferSearchDocument> {
    const [variant, category, brand, primaryImage, attributes] =
      await Promise.all([
        this.variantModel.findOne({ id: offer.variantId }).exec(),
        product.categoryId
          ? this.categoryModel.findOne({ id: product.categoryId }).exec()
          : Promise.resolve(null),
        product.brandId
          ? this.brandModel.findOne({ id: product.brandId }).exec()
          : Promise.resolve(null),
        this.imageModel
          .findOne({ productId: product.id, isPrimary: true })
          .sort({ sortOrder: 1 })
          .exec(),
        this.attrModel.find({ productId: product.id }).exec(),
      ]);

    return {
      offer_id: offer.id,
      offer_type: offer.offerType,
      offer_status: offer.status,
      country_code: offer.countryCode,
      price_amount: offer.priceAmount,
      price_currency: offer.priceCurrency,
      compare_at_price: offer.compareAtPrice,
      stock_quantity: offer.stockQuantity,
      in_stock: offer.offerType === 'affiliate' || offer.stockQuantity > 0,
      is_featured: offer.isFeatured,
      fulfillment_type: offer.fulfillmentType,
      vendor_id: offer.vendorId,

      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      description: product.description,
      short_description: product.shortDescription,
      country_of_origin: product.countryOfOrigin,

      category_id: category?.id ?? null,
      category_name: category?.name ?? null,
      category_slug: category?.slug ?? null,

      brand_id: brand?.id ?? null,
      brand_name: brand?.name ?? null,
      brand_slug: brand?.slug ?? null,

      variant_id: offer.variantId,
      variant_name: variant?.name ?? '',
      sku: variant?.sku ?? '',

      image_url: primaryImage?.url ?? null,

      attributes: attributes.map((a) => ({
        name: a.attributeName,
        value: a.attributeValue,
      })),

      indexed_at: new Date().toISOString(),
      created_at: offer.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async *loadAllIndexableOffers(
    batchSize = 100,
  ): AsyncGenerator<OfferSearchDocument[]> {
    let offset = 0;

    while (true) {
      const offers = await this.offerModel
        .find({ status: OfferStatus.ACTIVE })
        .sort({ createdAt: 1 })
        .skip(offset)
        .limit(batchSize)
        .exec();

      if (offers.length === 0) break;

      const docs: OfferSearchDocument[] = [];
      for (const offer of offers) {
        const product = await this.productModel.findOne({
          id: offer.productId,
          status: ProductStatus.APPROVED,
        }).exec();
        if (product) {
          docs.push(await this.buildDocument(offer, product));
        }
      }

      if (docs.length > 0) {
        yield docs;
      }

      offset += batchSize;
    }
  }
}
