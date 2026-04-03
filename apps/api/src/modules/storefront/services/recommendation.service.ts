import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OfferStatus, ProductStatus, ReviewStatus } from '@ecommerce/shared-types';
import { Product, ProductDocument } from '../../catalog/schemas/product.schema';
import { Offer, OfferDocument } from '../../offers/schemas/offer.schema';
import { Variant, VariantDocument } from '../../catalog/schemas/variant.schema';
import { ProductImage, ProductImageDocument } from '../../catalog/schemas/product-image.schema';
import { ProductAttribute, ProductAttributeDocument } from '../../catalog/schemas/product-attribute.schema';
import { Category, CategoryDocument } from '../../catalog/schemas/category.schema';
import { Brand, BrandDocument } from '../../catalog/schemas/brand.schema';
import { Review, ReviewDocument } from '../../reviews/schemas/review.schema';
import { StorefrontListingDto } from '../dto/storefront-listing.dto';

// Scoring weights
const SCORE_EXACT_CATEGORY = 40;
const SCORE_SIBLING_SUBCATEGORY = 25;
const SCORE_PARENT_CATEGORY = 20;
const SCORE_SAME_BRAND = 15;
const SCORE_PRICE_PROXIMITY = 10;
const SCORE_ATTRIBUTE_MATCH = 5;
const MAX_ATTRIBUTE_MATCHES = 3;
const SCORE_FEATURED_BOOST = 5;
const SCORE_POPULARITY_BOOST = 5;
const POPULARITY_RATING_THRESHOLD = 4.0;
const PRICE_RANGE_FACTOR = 0.4; // ±40%
const CANDIDATE_POOL_LIMIT = 50;
const PRELIMINARY_TOP_N = 16;

interface CandidateScore {
  productId: string;
  product: any;
  cheapestOffer: any;
  hasFeaturedOffer: boolean;
  score: number;
}

@Injectable()
export class RecommendationService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
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
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  async getRecommendations(
    slug: string,
    limit: number = 8,
    countryCode: string = 'SA',
  ): Promise<StorefrontListingDto[]> {
    // Step 1: Load source product
    const sourceProduct = await this.productModel
      .findOne({ slug, status: ProductStatus.APPROVED })
      .exec();

    if (!sourceProduct) {
      throw new NotFoundException(`Product with slug '${slug}' not found`);
    }

    // Step 2: Load source context in parallel
    const [sourceCategory, sourceAttributes, sourceOffers] = await Promise.all([
      sourceProduct.categoryId
        ? this.categoryModel.findOne({ id: sourceProduct.categoryId }).exec()
        : Promise.resolve(null),
      this.attrModel.find({ productId: sourceProduct.id }).exec(),
      this.offerModel
        .find({
          productId: sourceProduct.id,
          status: OfferStatus.ACTIVE,
          countryCode,
          stockQuantity: { $gt: 0 },
        })
        .sort({ priceAmount: 1 })
        .exec(),
    ]);

    const sourcePrice = sourceOffers.length > 0 ? sourceOffers[0].priceAmount : null;
    const sourceAttrSet = new Set(
      sourceAttributes.map((a) => `${a.attributeName}::${a.attributeValue}`),
    );

    // Step 3: Build related category IDs
    const relatedCategoryIds = new Set<string>();
    if (sourceProduct.categoryId) {
      relatedCategoryIds.add(sourceProduct.categoryId);
    }

    let siblingCategoryIds = new Set<string>();
    let parentCategoryId: string | null = null;
    let childCategoryIds = new Set<string>();

    if (sourceCategory) {
      if (sourceCategory.parentId) {
        // Source is a subcategory — find siblings with same parent
        parentCategoryId = sourceCategory.parentId;
        relatedCategoryIds.add(parentCategoryId);
        const siblings = await this.categoryModel
          .find({ parentId: sourceCategory.parentId, isActive: true })
          .exec();
        for (const sib of siblings) {
          if (sib.id !== sourceProduct.categoryId) {
            siblingCategoryIds.add(sib.id);
            relatedCategoryIds.add(sib.id);
          }
        }
      } else {
        // Source is a top-level category — find children
        const children = await this.categoryModel
          .find({ parentId: sourceCategory.id, isActive: true })
          .exec();
        for (const child of children) {
          childCategoryIds.add(child.id);
          relatedCategoryIds.add(child.id);
        }
      }
    }

    // Step 4: Query candidate products
    const candidateFilter: Record<string, unknown> = {
      status: ProductStatus.APPROVED,
      id: { $ne: sourceProduct.id },
      $or: [] as any[],
    };

    // Filter out soft-deleted products
    candidateFilter['deletedAt'] = { $in: [null, undefined] };

    const orConditions: any[] = [];
    if (relatedCategoryIds.size > 0) {
      orConditions.push({ categoryId: { $in: [...relatedCategoryIds] } });
    }
    if (sourceProduct.brandId) {
      orConditions.push({ brandId: sourceProduct.brandId });
    }

    let candidateProducts: any[];
    if (orConditions.length > 0) {
      candidateFilter['$or'] = orConditions;
      candidateProducts = await this.productModel
        .find(candidateFilter)
        .limit(CANDIDATE_POOL_LIMIT)
        .exec();
    } else {
      // Orphan product: no category, no brand — fall back to newest approved
      delete candidateFilter['$or'];
      candidateProducts = await this.productModel
        .find({
          status: ProductStatus.APPROVED,
          id: { $ne: sourceProduct.id },
          deletedAt: { $in: [null, undefined] },
        })
        .sort({ createdAt: -1 })
        .limit(CANDIDATE_POOL_LIMIT)
        .exec();
    }

    if (candidateProducts.length === 0) {
      return [];
    }

    const candidateProductIds = candidateProducts.map((p) => p.id);

    // Step 5: Load active in-stock offers for candidates
    const candidateOffers = await this.offerModel
      .find({
        productId: { $in: candidateProductIds },
        status: OfferStatus.ACTIVE,
        countryCode,
        stockQuantity: { $gt: 0 },
      })
      .exec();

    // Group offers by product, keep cheapest and track featured
    const productOfferMap = new Map<
      string,
      { cheapest: any; hasFeatured: boolean; offerCount: number }
    >();
    for (const offer of candidateOffers) {
      const existing = productOfferMap.get(offer.productId);
      if (!existing) {
        productOfferMap.set(offer.productId, {
          cheapest: offer,
          hasFeatured: offer.isFeatured,
          offerCount: 1,
        });
      } else {
        existing.offerCount++;
        if (offer.priceAmount < existing.cheapest.priceAmount) {
          existing.cheapest = offer;
        }
        if (offer.isFeatured) {
          existing.hasFeatured = true;
        }
      }
    }

    // Filter candidates: only those with qualifying offers
    const scoredCandidates: CandidateScore[] = [];
    for (const product of candidateProducts) {
      const offerInfo = productOfferMap.get(product.id);
      if (!offerInfo) continue; // No active in-stock offers

      let score = 0;

      // Category scoring
      if (sourceProduct.categoryId && product.categoryId === sourceProduct.categoryId) {
        score += SCORE_EXACT_CATEGORY;
      } else if (product.categoryId && siblingCategoryIds.has(product.categoryId)) {
        score += SCORE_SIBLING_SUBCATEGORY;
      } else if (product.categoryId && parentCategoryId && product.categoryId === parentCategoryId) {
        score += SCORE_PARENT_CATEGORY;
      } else if (product.categoryId && childCategoryIds.has(product.categoryId)) {
        score += SCORE_SIBLING_SUBCATEGORY; // Children treated same as siblings
      }

      // Brand scoring
      if (sourceProduct.brandId && product.brandId === sourceProduct.brandId) {
        score += SCORE_SAME_BRAND;
      }

      // Price proximity scoring
      if (sourcePrice !== null) {
        const lowerBound = Math.floor(sourcePrice * (1 - PRICE_RANGE_FACTOR));
        const upperBound = Math.ceil(sourcePrice * (1 + PRICE_RANGE_FACTOR));
        if (
          offerInfo.cheapest.priceAmount >= lowerBound &&
          offerInfo.cheapest.priceAmount <= upperBound
        ) {
          score += SCORE_PRICE_PROXIMITY;
        }
      }

      // Featured boost
      if (offerInfo.hasFeatured) {
        score += SCORE_FEATURED_BOOST;
      }

      scoredCandidates.push({
        productId: product.id,
        product,
        cheapestOffer: offerInfo.cheapest,
        hasFeaturedOffer: offerInfo.hasFeatured,
        score,
      });
    }

    if (scoredCandidates.length === 0) {
      return [];
    }

    // Step 6: Preliminary sort and take top N for attribute + review scoring
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.cheapestOffer.priceAmount - b.cheapestOffer.priceAmount;
    });

    const topCandidates = scoredCandidates.slice(0, PRELIMINARY_TOP_N);
    const topCandidateIds = topCandidates.map((c) => c.productId);

    // Step 7: Load attributes for top candidates and compute overlap
    const [candidateAttributes, reviewAggregation] = await Promise.all([
      this.attrModel.find({ productId: { $in: topCandidateIds } }).exec(),
      this.reviewModel
        .aggregate([
          {
            $match: {
              productId: { $in: topCandidateIds },
              status: ReviewStatus.APPROVED,
            },
          },
          {
            $group: {
              _id: '$productId',
              avgRating: { $avg: '$rating' },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    // Group candidate attributes by productId
    const candidateAttrMap = new Map<string, Set<string>>();
    for (const attr of candidateAttributes) {
      if (!candidateAttrMap.has(attr.productId)) {
        candidateAttrMap.set(attr.productId, new Set());
      }
      candidateAttrMap.get(attr.productId)!.add(`${attr.attributeName}::${attr.attributeValue}`);
    }

    // Build review rating map
    const reviewRatingMap = new Map<string, number>();
    for (const agg of reviewAggregation) {
      reviewRatingMap.set(agg._id, agg.avgRating);
    }

    // Apply attribute overlap and popularity scores
    for (const candidate of topCandidates) {
      const candidateAttrs = candidateAttrMap.get(candidate.productId);
      if (candidateAttrs && sourceAttrSet.size > 0) {
        let matchCount = 0;
        for (const attr of candidateAttrs) {
          if (sourceAttrSet.has(attr)) {
            matchCount++;
            if (matchCount >= MAX_ATTRIBUTE_MATCHES) break;
          }
        }
        candidate.score += matchCount * SCORE_ATTRIBUTE_MATCH;
      }

      const avgRating = reviewRatingMap.get(candidate.productId);
      if (avgRating !== undefined && avgRating >= POPULARITY_RATING_THRESHOLD) {
        candidate.score += SCORE_POPULARITY_BOOST;
      }
    }

    // Step 8: Final sort and take top `limit`
    topCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.cheapestOffer.priceAmount - b.cheapestOffer.priceAmount;
    });

    const winners = topCandidates.slice(0, limit);
    const winnerProductIds = winners.map((w) => w.productId);

    // Step 9: Enrich winners with listing data
    const categoryIdsNeeded = [
      ...new Set(winners.map((w) => w.product.categoryId).filter(Boolean)),
    ] as string[];
    const brandIdsNeeded = [
      ...new Set(winners.map((w) => w.product.brandId).filter(Boolean)),
    ] as string[];

    const winnerVariantIds = [
      ...new Set(winners.map((w) => w.cheapestOffer.variantId).filter(Boolean)),
    ] as string[];

    // Use .aggregate() to bypass Mongoose's String type casting on productId field,
    // since bulk-uploaded images store productId as ObjectId (not UUID string)
    const winnerObjectIds = winners.map((w) => (w.product as any)._id).filter(Boolean);
    const imageMatchStage = winnerObjectIds.length > 0
      ? { $match: { $or: [
            { productId: { $in: winnerProductIds } },
            { productId: { $in: winnerObjectIds } },
          ] } }
      : { $match: { productId: { $in: winnerProductIds } } };

    const [categories, brands, primaryImages, variants] = await Promise.all([
      categoryIdsNeeded.length > 0
        ? this.categoryModel.find({ id: { $in: categoryIdsNeeded } }).exec()
        : Promise.resolve([]),
      brandIdsNeeded.length > 0
        ? this.brandModel.find({ id: { $in: brandIdsNeeded } }).exec()
        : Promise.resolve([]),
      this.imageModel.aggregate([imageMatchStage, { $sort: { sortOrder: 1 } }]).exec(),
      winnerVariantIds.length > 0
        ? this.variantModel.find({ id: { $in: winnerVariantIds } }).exec()
        : Promise.resolve([]),
    ]);

    const catMap = new Map(categories.map((c: any) => [c.id, c]));
    const brdMap = new Map(brands.map((b: any) => [b.id, b]));
    const varMap = new Map(variants.map((v: any) => [v.id, v]));

    // Group all images by productId, handling both UUID and ObjectId formats
    const allImagesMap = new Map<string, typeof primaryImages>();
    for (const img of primaryImages) {
      const imgProductId = (img as any).productId;
      // Try UUID string match first
      let matchedId: string | undefined = winnerProductIds.find((pid) => pid === imgProductId);
      // If not found, try ObjectId match
      if (!matchedId) {
        const imgIdStr = imgProductId?.toString();
        const matchedWinner = winners.find((w) => {
          const oid = (w.product as any)._id?.toString();
          return oid === imgIdStr || w.productId === imgIdStr;
        });
        matchedId = matchedWinner?.productId;
      }
      if (matchedId) {
        if (!allImagesMap.has(matchedId)) {
          allImagesMap.set(matchedId, []);
        }
        allImagesMap.get(matchedId)!.push(img);
      }
    }

    // Step 10: Map to StorefrontListingDto
    return winners.map((w) => {
      const product = w.product;
      const offer = w.cheapestOffer;
      const cat = product.categoryId ? catMap.get(product.categoryId) : null;
      const brand = product.brandId ? brdMap.get(product.brandId) : null;
      const productImages = allImagesMap.get(product.id) || [];
      const primaryImg = productImages.find((i: any) => i.isPrimary) || productImages[0];
      const variant = offer.variantId ? varMap.get(offer.variantId) : null;
      const offerInfo = productOfferMap.get(product.id)!;

      const dto: StorefrontListingDto = {
        offerId: offer.id,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categoryName: (cat as any)?.name || null,
        brandName: (brand as any)?.name || null,
        imageUrl: (primaryImg as any)?.url || null,
        imageAlt: (primaryImg as any)?.altText || null,
        variantName: (variant as any)?.name || '',
        priceAmount: offer.priceAmount,
        priceCurrency: offer.priceCurrency,
        compareAtPrice: offer.compareAtPrice || null,
        stockQuantity: offer.stockQuantity,
        offerCount: offerInfo.offerCount,
        isFeatured: w.hasFeaturedOffer,
        countryCode: offer.countryCode,
        hasOffer: true,
        images: productImages.map((i: any) => ({
          url: i.url,
          altText: i.altText || null,
          isPrimary: i.isPrimary,
          sortOrder: i.sortOrder,
        })),
      };

      return dto;
    });
  }
}
