import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OfferStatus, ProductStatus, PaginatedResult } from '@ecommerce/shared-types';
import { Offer, OfferDocument } from '../../offers/schemas/offer.schema';
import { Product, ProductDocument } from '../../catalog/schemas/product.schema';
import { Variant, VariantDocument } from '../../catalog/schemas/variant.schema';
import { ProductImage, ProductImageDocument } from '../../catalog/schemas/product-image.schema';
import { ProductAttribute, ProductAttributeDocument } from '../../catalog/schemas/product-attribute.schema';
import { Category, CategoryDocument } from '../../catalog/schemas/category.schema';
import { Brand, BrandDocument } from '../../catalog/schemas/brand.schema';
import { StorefrontQueryDto, StorefrontListingDto, StorefrontProductDetailDto } from '../dto';
import { buildPaginatedResult } from '@common/utils/pagination.util';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
    @InjectModel(ProductImage.name)
    private readonly imageModel: Model<ProductImageDocument>,
    @InjectModel(ProductAttribute.name)
    private readonly attrModel: Model<ProductAttributeDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Brand.name)
    private readonly brandModel: Model<BrandDocument>,
  ) {}

  async findListings(query: StorefrontQueryDto): Promise<PaginatedResult<StorefrontListingDto>> {
    const countryCode = query.countryCode || null;

    // Step 1: Build offer filter
    const offerFilter: Record<string, unknown> = {
      status: OfferStatus.ACTIVE,
    };
    if (countryCode) {
      offerFilter['countryCode'] = countryCode;
    }

    if (query.minPrice !== undefined) {
      offerFilter['priceAmount'] = { ...(offerFilter['priceAmount'] as object || {}), $gte: query.minPrice };
    }
    if (query.maxPrice !== undefined) {
      offerFilter['priceAmount'] = { ...(offerFilter['priceAmount'] as object || {}), $lte: query.maxPrice };
    }
    if (query.isFeatured !== undefined) {
      offerFilter['isFeatured'] = query.isFeatured;
    }
    if (query.offerType) {
      offerFilter['offerType'] = query.offerType;
    }

    // Step 2: Resolve category filter
    let categoryIds: string[] | undefined;
    if (query.categoryId) {
      const children = await this.categoryModel.find({ parentId: query.categoryId, isActive: true }).exec();
      categoryIds = [query.categoryId, ...children.map((c) => c.id)];
    } else if (query.categorySlug) {
      const category = await this.categoryModel.findOne({ slug: query.categorySlug, isActive: true }).exec();
      if (category) {
        const children = await this.categoryModel.find({ parentId: category.id, isActive: true }).exec();
        categoryIds = [category.id, ...children.map((c) => c.id)];
      } else {
        return buildPaginatedResult([], 0, query.page, query.limit);
      }
    }

    // Step 3: Build product filter
    const productFilter: Record<string, unknown> = {
      status: ProductStatus.APPROVED,
      name: { $not: /^QA Test/i },
    };
    if (categoryIds) {
      productFilter['categoryId'] = { $in: categoryIds };
    }
    if (query.brandId) {
      productFilter['brandId'] = query.brandId;
    }
    if (query.search) {
      productFilter['name'] = { $not: /^QA Test/i, $regex: query.search, $options: 'i' };
    }

    // Step 4: Get qualifying products
    const products = await this.productModel.find(productFilter).exec();
    const productIds = products.map((p) => p.id);
    const productMap = new Map(products.map((p) => [p.id, p]));

    if (productIds.length === 0) {
      return buildPaginatedResult([], 0, query.page, query.limit);
    }

    // Step 5: Get qualifying variants (active ones for qualifying products)
    const variants = await this.variantModel.find({ productId: { $in: productIds }, isActive: true }).exec();
    const variantIds = variants.map((v) => v.id);
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Note: even if no variants/offers exist, we still show approved products

    // Step 6: Fetch matching offers (only for qualifying products and variants)
    offerFilter['productId'] = { $in: productIds };
    offerFilter['variantId'] = { $in: variantIds };

    const offers = await this.offerModel.find(offerFilter).exec();

    // Step 7: Fetch categories, brands, and all images for qualifying products
    const categoryIdsNeeded = [...new Set(products.map((p) => p.categoryId).filter(Boolean))] as string[];
    const brandIdsNeeded = [...new Set(products.map((p) => p.brandId).filter(Boolean))] as string[];

    // Query for all images, handling both UUID string and ObjectId productId formats
    // Use .aggregate() to bypass Mongoose's String type casting on productId field,
    // since bulk-uploaded images store productId as ObjectId (not UUID string)
    const productObjectIds = products.map((p) => (p as any)._id).filter(Boolean);
    const imageMatchStage = productObjectIds.length > 0
      ? { $match: { $or: [
            { productId: { $in: productIds } },
            { productId: { $in: productObjectIds } },
          ] } }
      : { $match: { productId: { $in: productIds } } };

    const [categories, brands, allImages] = await Promise.all([
      categoryIdsNeeded.length > 0
        ? this.categoryModel.find({ id: { $in: categoryIdsNeeded } }).exec()
        : Promise.resolve([]),
      brandIdsNeeded.length > 0
        ? this.brandModel.find({ id: { $in: brandIdsNeeded } }).exec()
        : Promise.resolve([]),
      this.imageModel.aggregate([imageMatchStage, { $sort: { sortOrder: 1 } }]).exec(),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const brdMap = new Map(brands.map((b) => [b.id, b]));

    // Group all images by productId, handling both UUID and ObjectId formats
    const allImagesMap = new Map<string, typeof allImages>();
    for (const img of allImages) {
      const imgProductId = img.productId;
      // Try to match by UUID string first
      let matchingProductId: string | undefined = productIds.find((pid) => pid === imgProductId);
      
      // If not found, try matching by ObjectId
      if (!matchingProductId) {
        const imgProductIdStr = imgProductId?.toString();
        const matchingProduct = products.find((p) => {
          const pIdStr = (p as any)._id?.toString();
          return pIdStr === imgProductIdStr || p.id === imgProductIdStr;
        });
        matchingProductId = matchingProduct?.id;
      }
      
      if (matchingProductId) {
        if (!allImagesMap.has(matchingProductId)) {
          allImagesMap.set(matchingProductId, []);
        }
        allImagesMap.get(matchingProductId)!.push(img);
      }
    }

    // Step 8: Group by product and pick cheapest offer per product
    const productBestOffer = new Map<string, any>();
    const productOfferCounts = new Map<string, number>();

    for (const offer of offers) {
      const pid = offer.productId;
      const product = productMap.get(pid);
      if (!product) continue;
      const variant = variantMap.get(offer.variantId);
      if (!variant) continue;

      productOfferCounts.set(pid, (productOfferCounts.get(pid) || 0) + 1);

      const cat = product.categoryId ? catMap.get(product.categoryId) : null;
      const brand = product.brandId ? brdMap.get(product.brandId) : null;
      const productImages = allImagesMap.get(pid) || [];
      const primaryImg = productImages.find((i) => i.isPrimary) || productImages[0];

      const row = {
        offer_id: offer.id,
        offer_product_id: pid,
        offer_price_amount: offer.priceAmount,
        offer_price_currency: offer.priceCurrency,
        offer_compare_at_price: offer.compareAtPrice,
        offer_stock_quantity: offer.stockQuantity,
        offer_is_featured: offer.isFeatured,
        offer_country_code: offer.countryCode,
        offer_created_at: offer.createdAt,
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
        category_name: cat?.name || null,
        brand_name: brand?.name || null,
        image_url: primaryImg?.url || null,
        image_alt_text: primaryImg?.altText || null,
        images: productImages.map((i) => ({
          url: i.url,
          altText: i.altText || null,
          isPrimary: i.isPrimary,
          sortOrder: i.sortOrder,
        })),
        variant_id: variant.id,
        variant_name: variant.name,
      };

      if (!productBestOffer.has(pid)) {
        productBestOffer.set(pid, row);
      } else {
        const existing = productBestOffer.get(pid);
        if (offer.priceAmount < existing.offer_price_amount) {
          productBestOffer.set(pid, row);
        }
      }
    }

    // Step 9: Include products without offers (approved but no active offers)
    // Skip this when filtering by featured — only products with featured offers should appear
    for (const product of (query.isFeatured ? [] : products)) {
      if (!productBestOffer.has(product.id)) {
        const cat = product.categoryId ? catMap.get(product.categoryId) : null;
        const brand = product.brandId ? brdMap.get(product.brandId) : null;
        const productImages = allImagesMap.get(product.id) || [];
        const primaryImg = productImages.find((i) => i.isPrimary) || productImages[0];

        const firstVariant = variants.find((v) => v.productId === product.id);
        
        productBestOffer.set(product.id, {
          offer_id: null,
          offer_product_id: product.id,
          offer_price_amount: 0,
          offer_price_currency: 'SAR',
          offer_compare_at_price: null,
          offer_stock_quantity: 0,
          offer_is_featured: false,
          offer_country_code: countryCode || 'SA',
          offer_created_at: product.createdAt,
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          category_name: cat?.name || null,
          brand_name: brand?.name || null,
          image_url: primaryImg?.url || null,
          image_alt_text: primaryImg?.altText || null,
          images: productImages.map((i) => ({
            url: i.url,
            altText: i.altText || null,
            isPrimary: i.isPrimary,
            sortOrder: i.sortOrder,
          })),
          variant_id: firstVariant?.id || null,
          variant_name: firstVariant?.name || '',
        });
        productOfferCounts.set(product.id, 0);
      }
    }

    // Convert to array and apply sorting
    let listings = Array.from(productBestOffer.values()).map((row) => {
      const hasActiveOffer = row.offer_id !== null;
      const productImages = row.images || allImagesMap.get(row.product_id) || [];
      
      return {
        offerId: row.offer_id,
        productId: row.product_id,
        productName: row.product_name,
        productSlug: row.product_slug,
        categoryName: row.category_name || null,
        brandName: row.brand_name || null,
        imageUrl: row.image_url || null,
        imageAlt: row.image_alt_text || null,
        variantName: row.variant_name,
        priceAmount: row.offer_price_amount,
        priceCurrency: row.offer_price_currency,
        compareAtPrice: row.offer_compare_at_price || null,
        stockQuantity: row.offer_stock_quantity,
        offerCount: productOfferCounts.get(row.product_id) || 0,
        isFeatured: Boolean(row.offer_is_featured),
        countryCode: row.offer_country_code,
        hasOffer: hasActiveOffer,
        images: productImages.map((img: any) => ({
          url: img.url,
          altText: img.altText || null,
          isPrimary: img.isPrimary || false,
          sortOrder: img.sortOrder || 0,
        })),
        imageCount: productImages.length,
        createdAt: row.offer_created_at,
      };
    });

    // Apply sorting — products with offers rank before products without offers
    const offerFirst = (a: typeof listings[0], b: typeof listings[0]) => {
      if (a.hasOffer && !b.hasOffer) return -1;
      if (!a.hasOffer && b.hasOffer) return 1;
      return 0;
    };

    switch (query.sort) {
      case 'price_asc':
        listings.sort((a, b) => {
          const of_ = offerFirst(a, b);
          if (of_ !== 0) return of_;
          // Products without offers (priceAmount: 0) go to the end
          if (a.priceAmount === 0 && b.priceAmount > 0) return 1;
          if (b.priceAmount === 0 && a.priceAmount > 0) return -1;
          return a.priceAmount - b.priceAmount;
        });
        break;
      case 'price_desc':
        listings.sort((a, b) => {
          const of_ = offerFirst(a, b);
          if (of_ !== 0) return of_;
          // Products without offers (priceAmount: 0) go to the end
          if (a.priceAmount === 0 && b.priceAmount > 0) return 1;
          if (b.priceAmount === 0 && a.priceAmount > 0) return -1;
          return b.priceAmount - a.priceAmount;
        });
        break;
      case 'newest':
        listings.sort((a, b) => offerFirst(a, b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'featured':
        listings.sort((a, b) => {
          const of_ = offerFirst(a, b);
          if (of_ !== 0) return of_;
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return a.priceAmount - b.priceAmount;
        });
        break;
      default:
        listings.sort((a, b) => offerFirst(a, b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Apply pagination
    const totalItems = listings.length;
    const start = query.skip;
    const end = start + query.limit;
    const paginatedListings = listings.slice(start, end);

    // Remove createdAt from final DTOs
    const data: StorefrontListingDto[] = paginatedListings.map(({ createdAt, ...rest }) => rest);

    return buildPaginatedResult(data, totalItems, query.page, query.limit);
  }

  async findProductDetail(slug: string): Promise<StorefrontProductDetailDto> {
    // Load product
    const product = await this.productModel.findOne({
      slug,
      status: ProductStatus.APPROVED,
    }).exec();

    if (!product) {
      throw new NotFoundException(`Product with slug '${slug}' not found`);
    }

    // Load related data in parallel
    // Note: Images may have productId as either product.id (UUID string) or product._id (ObjectId)
    // Use .aggregate() to bypass Mongoose's String type casting on productId field,
    // since bulk-uploaded images store productId as ObjectId (not UUID string)
    const productIdMatchStage = {
      $match: {
        $or: [
          { productId: product.id },
          { productId: (product as any)._id },
        ],
      },
    };

    const [category, brand, images, attributes, variants] = await Promise.all([
      product.categoryId
        ? this.categoryModel.findOne({ id: product.categoryId }).exec()
        : Promise.resolve(null),
      product.brandId
        ? this.brandModel.findOne({ id: product.brandId }).exec()
        : Promise.resolve(null),
      this.imageModel.aggregate([productIdMatchStage, { $sort: { sortOrder: 1 } }]).exec(),
      this.attrModel.find({ productId: product.id }).exec(),
      this.variantModel.find({ productId: product.id, isActive: true }).sort({ sortOrder: 1 }).exec(),
    ]);

    // Load all active offers for this product
    const offers = await this.offerModel.find({
      productId: product.id,
      status: OfferStatus.ACTIVE,
    }).sort({ priceAmount: 1 }).exec();

    // Group offers by variant
    const variantOffersMap = new Map<string, typeof offers>();
    for (const offer of offers) {
      if (!variantOffersMap.has(offer.variantId)) {
        variantOffersMap.set(offer.variantId, []);
      }
      variantOffersMap.get(offer.variantId)!.push(offer);
    }

    // Build variant DTOs (only include variants that have active offers)
    const variantDtos = variants
      .filter((variant) => variantOffersMap.has(variant.id))
      .map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        offers: variantOffersMap.get(variant.id)!.map((offer) => ({
          id: offer.id,
          priceAmount: offer.priceAmount,
          priceCurrency: offer.priceCurrency,
          compareAtPrice: offer.compareAtPrice,
          stockQuantity: offer.stockQuantity,
          offerType: offer.offerType,
          fulfillmentType: offer.fulfillmentType,
          vendorId: offer.vendorId,
          isFeatured: offer.isFeatured,
        })),
      }));

    // Build product DTO
    const productDto = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      categoryName: category?.name || null,
      categorySlug: category?.slug || null,
      brandName: brand?.name || null,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      countryOfOrigin: product.countryOfOrigin,
      images: (images || [])
        .map((img) => ({
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        })),
      attributes: (attributes || []).map((attr: any) => ({
        attributeName: attr.attributeName,
        attributeValue: attr.attributeValue,
      })),
    };

    return {
      product: productDto,
      variants: variantDtos,
    };
  }
}
