'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, SlidersHorizontal } from 'lucide-react';
import {
  SearchInput,
  Spinner,
  PriceDisplay,
  Select,
  useApiList,
  useApiGet,
  useDebounce,
  usePagination,
  buildQueryString,
  Pagination,
  resolveImageUrl,
} from '@ecommerce/ui-kit';
import s from '../../store.module.css';

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
  hasOffer?: boolean;
  images?: Array<{ url: string; altText: string | null; isPrimary: boolean; sortOrder: number }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [categoryId, setCategoryId] = useState(() => searchParams.get('category') ?? '');
  const [brandId, setBrandId] = useState(() => searchParams.get('brand') ?? '');
  const [sort, setSort] = useState<'price_asc' | 'price_desc' | 'newest' | 'featured'>(
    () => (searchParams.get('sort') as any) ?? 'newest',
  );
  const debouncedQuery = useDebounce(query, 400);
  const { page, setPage } = usePagination();

  // Sync filter state back to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (categoryId) params.set('category', categoryId);
    if (brandId) params.set('brand', brandId);
    if (sort !== 'newest') params.set('sort', sort);
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [debouncedQuery, categoryId, brandId, sort]);

  const { data: categories } = useApiGet<Category[]>('/catalog/categories');
  const { data: brands } = useApiGet<Brand[]>('/catalog/brands');

  const qs = buildQueryString({
    search: debouncedQuery || undefined,
    categoryId: categoryId || undefined,
    brandId: brandId || undefined,
    sort,
    page,
    limit: 12,
  });
  const { data, isLoading } = useApiList<StorefrontListing>(`/storefront/listings${qs}`);

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: '28px' }}>
        <p className={s.sectionSubheading}>
          {debouncedQuery ? `Results for "${debouncedQuery}"` : 'All Products'}
        </p>
        <h1 className={s.searchTitle}>
          {debouncedQuery ? debouncedQuery : 'Explore Products'}
        </h1>
      </div>

      {/* Filter bar */}
      <div className={s.filterBar}>
        <SlidersHorizontal size={14} strokeWidth={1.5} color="#8a8278" />
        <div className={s.filterSearchWrap}>
          <SearchInput
            placeholder="Search for products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            className="w-full"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className={s.filterSelect}
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
        <Select
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            setPage(1);
          }}
          className={s.filterSelect}
        >
          <option value="">All Brands</option>
          {brands?.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as any);
            setPage(1);
          }}
          className={s.filterSelect}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="featured">Featured</option>
        </Select>
        {!isLoading && data?.meta && (
          <span className={s.resultsCount}>
            {data.meta.totalItems ?? data.data?.length ?? 0} results
          </span>
        )}
      </div>

      {/* Results grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Spinner size="lg" />
        </div>
      ) : (() => {
        // One card per product with primary image
        const flatCards = (data?.data || []).map((listing) => {
          const primaryImg = listing.images?.find(i => i.isPrimary) || listing.images?.[0];
          const imageUrl = primaryImg?.url || listing.imageUrl || '';
          const imageAlt = primaryImg?.altText || listing.imageAlt || null;
          const discountPct = listing.compareAtPrice && listing.compareAtPrice > listing.priceAmount
            ? Math.round(((listing.compareAtPrice - listing.priceAmount) / listing.compareAtPrice) * 100)
            : 0;
          return { listing, imageUrl, imageAlt: imageAlt as string | null, cardKey: listing.productId, discountPct };
        });
        return (
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
                No products found
              </p>
              <p style={{ fontSize: '0.84rem', color: '#8a8278' }}>
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {data?.meta && data.meta.totalPages > 1 && (
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
              <Pagination
                page={page}
                totalPages={data.meta.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
        );
      })()}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Spinner size="lg" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
