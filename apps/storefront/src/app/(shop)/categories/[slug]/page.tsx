'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Package } from 'lucide-react';
import {
  Spinner,
  PriceDisplay,
  useApiList,
  useApiGet,
  usePagination,
  buildQueryString,
  Pagination,
  resolveImageUrl,
} from '@ecommerce/ui-kit';
import s from '../../../store.module.css';

interface StorefrontListing {
  offerId: string | null;
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
  hasOffer: boolean;
  images?: Array<{ url: string; altText: string | null; isPrimary: boolean; sortOrder: number }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FlatCard {
  listing: StorefrontListing;
  imageUrl: string;
  imageAlt: string | null;
  cardKey: string;
  discountPct: number;
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { page, setPage } = usePagination();

  const { data: category } = useApiGet<Category>(`/catalog/categories/${slug}`);
  const qs = buildQueryString({ categorySlug: slug, page, limit: 12 });
  const { data, isLoading } = useApiList<StorefrontListing>(`/storefront/listings${qs}`);

  const categoryName = category?.name || slug.charAt(0).toUpperCase() + slug.slice(1);

  // One card per product with primary image
  const flatCards: FlatCard[] = (data?.data || []).map((listing: StorefrontListing) => {
    const primaryImg = listing.images?.find(i => i.isPrimary) || listing.images?.[0];
    const imageUrl = primaryImg?.url || listing.imageUrl || '';
    const imageAlt = primaryImg?.altText || listing.imageAlt || null;
    const discountPct = listing.compareAtPrice && listing.compareAtPrice > listing.priceAmount
      ? Math.round(((listing.compareAtPrice - listing.priceAmount) / listing.compareAtPrice) * 100)
      : 0;
    return { listing, imageUrl, imageAlt, cardKey: listing.productId, discountPct };
  });

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <p className={s.sectionSubheading}>
          <Link href="/" style={{ color: '#8a8278', textDecoration: 'none' }}>Home</Link>
          {' / '}
          {categoryName}
        </p>
        <h1 className={s.searchTitle}>{categoryName}</h1>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {flatCards.length > 0 ? (
            <div className={s.productGrid}>
              {flatCards.map((card) => {
                const { listing, discountPct } = card;
                return (
                <Link key={card.cardKey} href={`/products/${listing.productSlug}`} className={s.productCard}>
                  <div className={s.productCardImgWrapper}>
                    {card.imageUrl ? (
                      <img
                        src={resolveImageUrl(card.imageUrl)}
                        alt={card.imageAlt || listing.productName}
                        className={s.productCardImg}
                      />
                    ) : (
                      <div className={s.productCardImgPlaceholder}>
                        <Package size={32} strokeWidth={1} color="#c8c0b4" />
                      </div>
                    )}
                    {listing.isFeatured && (
                      <span className={s.productCardBadge}>Featured</span>
                    )}
                    {listing.hasOffer !== false && listing.stockQuantity === 0 && (
                      <span
                        className={s.productCardBadge}
                        style={{ background: '#8a8278', top: 'auto', bottom: '10px', right: '10px', left: 'auto' }}
                      >
                        Sold Out
                      </span>
                    )}
                  </div>
                  <div className={s.productCardBody}>
                    {listing.brandName && (
                      <p className={s.productCardBrand}>{listing.brandName}</p>
                    )}
                    <h3 className={s.productCardName}>{listing.productName}</h3>
                    <div className={s.productCardPriceRow}>
                      {discountPct > 0 && (
                        <span className={s.productCardDiscountPct}>-{discountPct}%</span>
                      )}
                      <PriceDisplay amount={listing.priceAmount} size="sm" />
                      {listing.compareAtPrice && listing.compareAtPrice > listing.priceAmount && (
                        <span className={s.productCardStrikePrice}>
                          <PriceDisplay amount={listing.compareAtPrice} size="sm" />
                        </span>
                      )}
                    </div>
                    {listing.hasOffer !== false && discountPct >= 15 && (
                      <span className={s.productCardLimitedDealPill}>Limited time deal</span>
                    )}
                    {listing.hasOffer !== false && discountPct > 0 && discountPct < 15 && (
                      <span className={s.productCardDealPill}>Deal</span>
                    )}
                    {listing.hasOffer !== false && discountPct === 0 && listing.offerId && (
                      <span className={s.productCardDealPill}>Deal</span>
                    )}
                    {listing.offerCount > 1 && (
                      <span className={s.productCardOfferPill}>{listing.offerCount} offers</span>
                    )}
                  </div>
                </Link>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                border: '1px solid #e8e2d6',
                background: '#fff',
              }}
            >
              <Package size={36} strokeWidth={1} color="#c8c0b4" style={{ margin: '0 auto 16px' }} />
              <p
                style={{
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: '1.5rem',
                  fontWeight: 400,
                  color: '#1a1614',
                  marginBottom: '8px',
                }}
              >
                No products in this category
              </p>
              <p style={{ fontSize: '0.84rem', color: '#8a8278' }}>
                Check back soon for new arrivals
              </p>
            </div>
          )}

          {data?.meta && data.meta.totalPages > 1 && (
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
              <Pagination page={page} totalPages={data.meta.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
