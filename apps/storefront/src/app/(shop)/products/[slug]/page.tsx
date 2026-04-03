'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Package, ChevronRight, Minus, Plus, Truck, Zap } from 'lucide-react';
import {
  Spinner,
  PriceDisplay,
  useApiGet,
  useToast,
  apiPost,
  formatDate,
  resolveImageUrl,
} from '@ecommerce/ui-kit';
import s from '../../../store.module.css';

interface StorefrontOffer {
  id: string;
  priceAmount: number;
  priceCurrency: string;
  compareAtPrice: number | null;
  stockQuantity: number;
  offerType: string;
  fulfillmentType: string;
  vendorId: string;
  isFeatured: boolean;
}

interface StorefrontVariant {
  id: string;
  name: string;
  sku: string;
  offers: StorefrontOffer[];
}

interface StorefrontProductImage {
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface StorefrontProductAttribute {
  attributeName: string;
  attributeValue: string;
}

interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  brandName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  countryOfOrigin: string | null;
  images: StorefrontProductImage[];
  attributes: StorefrontProductAttribute[];
}

interface StorefrontProductDetail {
  product: StorefrontProduct;
  variants: StorefrontVariant[];
}

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
}

interface RecommendationItem {
  offerId: string;
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string | null;
  brandName: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  variantName: string;
  priceAmount: number;
  priceCurrency: string;
  compareAtPrice: number | null;
  stockQuantity: number;
  offerCount: number;
  isFeatured: boolean;
  countryCode: string;
  hasOffer?: boolean;
  images?: Array<{ url: string; altText: string | null; isPrimary: boolean; sortOrder: number }>;
}

function StarDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < Math.round(rating) ? '#c4933f' : '#ddd5c8', fontSize: '0.9rem' }}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const { data: productDetail, isLoading } = useApiGet<StorefrontProductDetail>(
    `/storefront/listings/${slug}`,
  );
  const { data: summary } = useApiGet<ReviewSummary>(
    productDetail ? `/products/${productDetail.product.id}/reviews/summary` : null,
  );
  const { data: reviews } = useApiGet<Review[]>(
    productDetail ? `/products/${productDetail.product.id}/reviews?limit=5` : null,
  );
  const { data: recommendationsData } = useApiGet<{ recommendations: RecommendationItem[] }>(
    slug ? `/storefront/listings/${slug}/recommendations?limit=8` : null,
  );
  const recommendations = recommendationsData?.recommendations || [];

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariantId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!productDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: '#8a8278' }}>
        Product not found
      </div>
    );
  }

  const { product, variants } = productDetail;
  const reviewList = Array.isArray(reviews) ? reviews : [];

  const activeVariantId = selectedVariantId || (variants.length > 0 ? variants[0].id : null);
  const activeVariant = variants.find((v) => v.id === activeVariantId);
  const bestOffer = activeVariant?.offers[0] || null;

  const handleAddToCart = async (offerId: string, qty: number = 1) => {
    setAddingToCart(true);
    try {
      await apiPost('/cart/items', { offerId, quantity: qty });
      const productName = activeVariant
        ? `${product.name} - ${activeVariant.name}`
        : product.name;
      addToast('success', `${productName} added to cart`);
    } catch {
      addToast('error', 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = (offerId: string, qty: number) => {
    const variant = activeVariant;
    const offer = variant?.offers.find((o) => o.id === offerId);
    if (!offer) return;

    sessionStorage.setItem('buyNowItem', JSON.stringify({
      offerId,
      quantity: qty,
      priceAmount: offer.priceAmount,
      currency: offer.priceCurrency,
      productName: product.name,
      variantName: variant?.name || 'Default',
    }));
    router.push('/checkout?buyNow=true');
  };

  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const activeImageUrl = selectedImageUrl || primaryImage?.url;

  const discountPct = bestOffer?.compareAtPrice && bestOffer.compareAtPrice > bestOffer.priceAmount
    ? Math.round(((bestOffer.compareAtPrice - bestOffer.priceAmount) / bestOffer.compareAtPrice) * 100)
    : null;

  return (
    <div>
      {/* Breadcrumbs */}
      <div className={s.detailBreadcrumb}>
        <Link href="/" className={s.detailBreadcrumbLink}>Home</Link>
        <ChevronRight size={10} strokeWidth={2} color="#c8c0b4" />
        {product.categoryName && product.categorySlug && (
          <>
            <Link href={`/categories/${product.categorySlug}`} className={s.detailBreadcrumbLink}>
              {product.categoryName}
            </Link>
            <ChevronRight size={10} strokeWidth={2} color="#c8c0b4" />
          </>
        )}
        <span className={s.detailBreadcrumbCurrent}>{product.name}</span>
      </div>

      {/* 3-Column Grid */}
      <div className={s.pdpGrid}>

        {/* Column 1: Image Gallery */}
        <div className={s.pdpGallery}>
          {product.images.length > 1 && (
            <div className={s.pdpThumbStrip}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageUrl(img.url)}
                  className={`${s.pdpThumbBtn} ${activeImageUrl === img.url ? s.pdpThumbBtnActive : ''}`}
                >
                  <img
                    src={resolveImageUrl(img.url)}
                    alt={img.altText || product.name}
                    className={s.pdpThumbImg}
                  />
                </button>
              ))}
            </div>
          )}

          <div className={s.pdpMainImageWrap}>
            {activeImageUrl ? (
              <img
                src={resolveImageUrl(activeImageUrl)}
                alt={product.name}
                className={s.pdpMainImg}
              />
            ) : (
              <div className={s.pdpMainImgPlaceholder}>
                <Package size={48} strokeWidth={1} color="#c8c0b4" />
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Product Info */}
        <div className={s.pdpInfo}>
          {product.brandName && (
            <Link
              href={`/search?brand=${encodeURIComponent(product.brandName)}`}
              className={s.pdpBrandLink}
            >
              Visit the {product.brandName} Store
            </Link>
          )}

          <h1 className={s.pdpTitle}>{product.name}</h1>

          {summary && summary.totalReviews > 0 && (
            <div
              className={s.pdpRatingRow}
              onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              <StarDisplay rating={summary.averageRating} />
              <span className={s.pdpRatingCount}>
                {summary.averageRating?.toFixed(1)} ({summary.totalReviews} reviews)
              </span>
            </div>
          )}

          <div className={s.pdpDivider} />

          {/* Price block */}
          {bestOffer && (
            <div style={{ marginBottom: '16px' }}>
              <div className={s.pdpPriceRow}>
                {discountPct && (
                  <span className={s.pdpDiscountBadge}>-{discountPct}%</span>
                )}
                <PriceDisplay amount={bestOffer.priceAmount} size="lg" />
                {bestOffer.compareAtPrice && bestOffer.compareAtPrice > bestOffer.priceAmount && (
                  <span className={s.pdpComparePrice}>
                    <PriceDisplay amount={bestOffer.compareAtPrice} size="sm" />
                  </span>
                )}
              </div>
            </div>
          )}
          {!bestOffer && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              background: '#faf7f2',
              border: '1px solid #e8e2d6',
              borderRadius: '6px',
              color: '#8a8278',
              fontSize: '0.9rem',
            }}>
              Price currently unavailable — this item is not available for purchase
            </div>
          )}

          {product.shortDescription && (
            <p className={s.pdpShortDesc}>{product.shortDescription}</p>
          )}

          {/* Variant selector */}
          {variants.length > 1 && (
            <div style={{ marginBottom: '24px' }}>
              <p className={s.variantsLabel}>Select Variant</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`${s.variantBtn} ${activeVariantId === variant.id ? s.variantBtnActive : ''}`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Specifications */}
          {product.attributes.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p className={s.pdpSpecsHeading}>Specifications</p>
              <div>
                {product.attributes.map((attr, idx) => (
                  <div key={idx} className={s.specsRow}>
                    <span className={s.specsKey}>{attr.attributeName}</span>
                    <span className={s.specsVal}>{attr.attributeValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Long description inline if no short description */}
          {product.description && !product.shortDescription && (
            <p className={s.pdpShortDesc} style={{ marginTop: '24px' }}>{product.description}</p>
          )}
        </div>

        {/* Column 3: Buy Box */}
        <div className={s.buyBox}>
          {bestOffer && (
            <div className={s.buyBoxPrice}>
              <PriceDisplay amount={bestOffer.priceAmount} size="lg" />
            </div>
          )}

          {bestOffer && (
            <div className={s.buyBoxStock}>
              {bestOffer.stockQuantity > 0 ? (
                <>
                  <span className={`${s.buyBoxDot} ${s.buyBoxDotGreen}`} />
                  <span className={s.buyBoxStockInStock}>In Stock</span>
                </>
              ) : (
                <>
                  <span className={`${s.buyBoxDot} ${s.buyBoxDotGray}`} />
                  <span className={s.buyBoxStockOutOfStock}>Out of Stock</span>
                </>
              )}
            </div>
          )}

          <div className={s.buyBoxDivider} />

          {bestOffer && bestOffer.stockQuantity > 0 && (
            <>
              <p className={s.buyBoxQtyLabel}>Quantity</p>
              <div className={s.buyBoxQtyControl}>
                <button
                  className={`${s.buyBoxQtyBtn} ${s.buyBoxQtyBtnLeft}`}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={12} strokeWidth={2} />
                </button>
                <span className={s.buyBoxQtyDisplay}>{quantity}</span>
                <button
                  className={`${s.buyBoxQtyBtn} ${s.buyBoxQtyBtnRight}`}
                  onClick={() => setQuantity(Math.min(bestOffer.stockQuantity, quantity + 1))}
                  disabled={quantity >= bestOffer.stockQuantity}
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>
            </>
          )}

          {bestOffer && bestOffer.stockQuantity > 0 && (
            <button
              className={s.buyBoxAddToCart}
              onClick={() => handleAddToCart(bestOffer.id, quantity)}
              disabled={addingToCart}
            >
              <ShoppingCart size={14} strokeWidth={1.5} />
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>
          )}

          {bestOffer && bestOffer.stockQuantity > 0 && (
            <button
              className={s.buyBoxBuyNow}
              onClick={() => handleBuyNow(bestOffer.id, quantity)}
              disabled={addingToCart}
            >
              <Zap size={14} strokeWidth={1.5} />
              Buy Now
            </button>
          )}

          {!bestOffer && (
            <button
              disabled
              style={{
                width: '100%',
                padding: '14px',
                background: '#e8e2d6',
                color: '#8a8278',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'not-allowed',
                marginBottom: '12px',
              }}
            >
              Currently Unavailable
            </button>
          )}

          {bestOffer && (
            <div className={s.buyBoxFulfillment}>
              <Truck size={13} strokeWidth={1.5} />
              {bestOffer.fulfillmentType === 'PLATFORM' ? (
                <span>
                  <span className={s.buyBoxFulfillmentLabel}>Fulfilled</span> by Meridian
                </span>
              ) : (
                <span>
                  <span className={s.buyBoxFulfillmentLabel}>Shipped</span> by Vendor
                </span>
              )}
            </div>
          )}

          {activeVariant && activeVariant.offers.length > 1 && (
            <button
              className={s.buyBoxCompareSellers}
              onClick={() => {
                document.getElementById('compare-sellers')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Compare {activeVariant.offers.length} sellers
            </button>
          )}
        </div>
      </div>

      {/* Full description */}
      {product.description && product.shortDescription && (
        <div className={s.pdpFullDescription}>
          <p className={s.pdpFullDescHeading}>Product Description</p>
          <p className={s.pdpFullDescBody}>{product.description}</p>
        </div>
      )}

      {/* Compare sellers */}
      {activeVariant && activeVariant.offers.length > 1 && (
        <div id="compare-sellers" style={{ marginTop: '48px' }}>
          <p className={s.sectionSubheading}>Compare sellers</p>
          <h2 className={s.sectionHeading} style={{ fontSize: '1.4rem', marginBottom: '16px' }}>
            All Offers for {activeVariant.name}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeVariant.offers.map((offer) => (
              <div key={offer.id} className={s.offerRow}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <PriceDisplay amount={offer.priceAmount} />
                  {offer.compareAtPrice && offer.compareAtPrice > offer.priceAmount && (
                    <span style={{ fontSize: '0.78rem', color: '#b0a89e', textDecoration: 'line-through' }}>
                      <PriceDisplay amount={offer.compareAtPrice} size="sm" />
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#8a8278' }}>
                    {offer.stockQuantity > 0 ? `${offer.stockQuantity} in stock` : 'Out of stock'}
                  </span>
                  <button
                    className={s.addToCartBtn}
                    style={{ width: 'auto', padding: '9px 20px', fontSize: '0.68rem' }}
                    disabled={offer.stockQuantity === 0 || addingToCart}
                    onClick={() => handleAddToCart(offer.id, 1)}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviewList.length > 0 && (
        <div ref={reviewsRef} style={{ marginTop: '56px' }}>
          <p className={s.sectionSubheading}>What customers say</p>
          <h2 className={s.sectionHeading} style={{ fontSize: '1.6rem', marginBottom: '20px' }}>
            Customer Reviews
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviewList.map((review: Review) => (
              <div key={review.id} className={s.reviewCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <StarDisplay rating={review.rating} />
                  {review.title && (
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1614' }}>
                      {review.title}
                    </span>
                  )}
                </div>
                {review.body && (
                  <p style={{ fontSize: '0.84rem', lineHeight: 1.7, color: '#6a635c' }}>
                    {review.body}
                  </p>
                )}
                <p className={s.reviewDate}>{formatDate(review.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (() => {
        const flatCards = recommendations.flatMap((item) => {
          const imgs = item.images?.length
            ? item.images
            : item.imageUrl
              ? [{ url: item.imageUrl, altText: item.imageAlt, isPrimary: true, sortOrder: 0 }]
              : [];
          const discountPct = item.compareAtPrice && item.compareAtPrice > item.priceAmount
            ? Math.round(((item.compareAtPrice - item.priceAmount) / item.compareAtPrice) * 100)
            : 0;
          if (imgs.length === 0) {
            return [{ item, imageUrl: '', imageAlt: null as string | null, cardKey: item.productId, discountPct }];
          }
          return imgs.map((img, i) => ({
            item,
            imageUrl: img.url,
            imageAlt: img.altText,
            cardKey: `${item.productId}-${i}`,
            discountPct,
          }));
        });
        return (
        <div style={{ marginTop: '56px' }}>
          <p className={s.sectionSubheading}>You may also like</p>
          <h2 className={s.sectionHeading} style={{ fontSize: '1.6rem', marginBottom: '20px' }}>
            Related Products
          </h2>
          <div className={s.productGrid}>
            {flatCards.map((card) => {
              const { item, discountPct } = card;
              return (
              <Link key={card.cardKey} href={`/products/${item.productSlug}`} className={s.productCard}>
                <div className={s.productCardImgWrapper}>
                  {card.imageUrl ? (
                    <img
                      src={resolveImageUrl(card.imageUrl)}
                      alt={card.imageAlt || item.productName}
                      className={s.productCardImg}
                    />
                  ) : (
                    <div className={s.productCardImgPlaceholder}>
                      <Package size={32} strokeWidth={1} color="#c8c0b4" />
                    </div>
                  )}
                  {item.isFeatured && (
                    <span className={s.productCardBadge}>Featured</span>
                  )}
                  {item.hasOffer !== false && item.stockQuantity === 0 && (
                    <span
                      className={s.productCardBadge}
                      style={{ background: '#8a8278', top: 'auto', bottom: '10px', right: '10px', left: 'auto' }}
                    >
                      Sold Out
                    </span>
                  )}
                </div>
                <div className={s.productCardBody}>
                  {item.brandName && (
                    <p className={s.productCardBrand}>{item.brandName}</p>
                  )}
                  <h3 className={s.productCardName}>{item.productName}</h3>
                  <div className={s.productCardPriceRow}>
                    {discountPct > 0 && (
                      <span className={s.productCardDiscountPct}>-{discountPct}%</span>
                    )}
                    <PriceDisplay amount={item.priceAmount} size="sm" />
                    {item.compareAtPrice && item.compareAtPrice > item.priceAmount && (
                      <span className={s.productCardStrikePrice}>
                        <PriceDisplay amount={item.compareAtPrice} size="sm" />
                      </span>
                    )}
                  </div>
                  {item.hasOffer !== false && discountPct >= 15 && (
                    <span className={s.productCardLimitedDealPill}>Limited time deal</span>
                  )}
                  {item.hasOffer !== false && discountPct > 0 && discountPct < 15 && (
                    <span className={s.productCardDealPill}>Deal</span>
                  )}
                  {item.hasOffer !== false && discountPct === 0 && item.offerId && (
                    <span className={s.productCardDealPill}>Deal</span>
                  )}
                  {item.offerCount > 1 && (
                    <span className={s.productCardOfferPill}>{item.offerCount} offers</span>
                  )}
                </div>
              </Link>
              );
            })}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
