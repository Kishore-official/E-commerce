'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag, Search, User, LogOut, ArrowRight, ShieldCheck, BadgeCheck, CreditCard, RotateCcw, Menu, X } from 'lucide-react';
import { useApiGet, useApiList, useAuth, PriceDisplay, Spinner, resolveImageUrl } from '@ecommerce/ui-kit';
import type { PaginatedResult } from '@ecommerce/shared-types';
import s from './store.module.css';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
  imageCount?: number;
  sampleImageUrl?: string;
  imageUrl?: string;
  parentId?: string;
}

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

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { data: allCategories, isLoading: categoriesLoading } = useApiGet<Category[]>('/catalog/categories/all-with-images');
  const { data: featuredListings, isLoading: listingsLoading } = useApiList<StorefrontListing>(
    '/storefront/listings?isFeatured=true&limit=8',
  );
  const hasFeatured = !listingsLoading && (featuredListings?.data?.length ?? 0) > 0;
  const { data: newestListings, isLoading: newestLoading } = useApiList<StorefrontListing>(
    !listingsLoading && !hasFeatured ? '/storefront/listings?sort=newest&limit=8' : null,
  );
  const displayListings = hasFeatured ? featuredListings : newestListings;
  const sectionTitle = hasFeatured ? 'Featured Products' : 'New Arrivals';
  const displayLoading = listingsLoading || (!hasFeatured && newestLoading);

  // Show only categories with images, sorted by image count descending
  const categoriesToShow = (allCategories || [])
    .filter((c) => c.imageCount && c.imageCount > 0)
    .sort((a, b) => (b.imageCount || 0) - (a.imageCount || 0));

  return (
    <div style={{ minHeight: '100vh', background: '#faf7f2' }}>

      {/* Announcement bar */}
      <div className={s.announcementBar}>
        Free shipping on orders over{' '}
        <span className={s.announcementGold}>₹11,100</span>
        {'  ·  '}
        <span className={s.announcementGold}>New Arrivals</span> weekly
      </div>

      {/* Header */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>
            Meridian<span className={s.logoDot}>.</span>
          </Link>

          <nav className={s.navDesktop}>
            <Link href="/search" className={s.navLink}>Explore</Link>
            <Link href="/search?sort=newest" className={s.navLink}>New Arrivals</Link>
          </nav>

          <div className={s.headerActions}>
            <Link href="/search" className={s.iconBtn} title="Search">
              <Search size={16} strokeWidth={1.5} />
            </Link>
            <Link href="/cart" className={s.iconBtn} title="Cart">
              <ShoppingBag size={16} strokeWidth={1.5} />
            </Link>

            {isAuthenticated && user ? (
              <>
                <Link href="/orders" className={s.iconBtn} title="My Account" style={{ marginLeft: '4px' }}>
                  <User size={16} strokeWidth={1.5} />
                </Link>
                <span className={s.headerUserName} style={{ marginLeft: '6px', marginRight: '4px' }}>
                  {user.firstName}
                </span>
                <button className={s.logoutBtn} onClick={logout} title="Sign Out">
                  <LogOut size={13} strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <Link href="/login" className={s.signInLink} style={{ marginLeft: '8px' }}>
                Sign In
              </Link>
            )}

            <button className={s.hamburgerBtn} onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`${s.mobileMenuOverlay} ${mobileMenuOpen ? s.mobileMenuOverlayOpen : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <nav className={`${s.mobileMenu} ${mobileMenuOpen ? s.mobileMenuOpen : ''}`}>
        <div className={s.mobileMenuHeader}>
          <span className={s.logo} style={{ fontSize: '1.1rem' }}>Meridian<span className={s.logoDot}>.</span></span>
          <button className={s.mobileMenuClose} onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        <div className={s.mobileMenuNav}>
          <Link href="/search" className={s.mobileMenuLink} onClick={() => setMobileMenuOpen(false)}>
            <Search size={16} strokeWidth={1.5} /> Explore
          </Link>
          <Link href="/search?sort=newest" className={s.mobileMenuLink} onClick={() => setMobileMenuOpen(false)}>
            <ShoppingBag size={16} strokeWidth={1.5} /> New Arrivals
          </Link>
          <div className={s.mobileMenuDivider} />
          {isAuthenticated && user ? (
            <>
              <Link href="/orders" className={s.mobileMenuLink} onClick={() => setMobileMenuOpen(false)}>
                <User size={16} strokeWidth={1.5} /> My Account
              </Link>
              <button
                className={s.mobileMenuLink}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}
                onClick={() => { logout(); setMobileMenuOpen(false); }}
              >
                <LogOut size={16} strokeWidth={1.5} /> Sign Out
              </button>
            </>
          ) : (
            <Link href="/login" className={s.mobileMenuLink} onClick={() => setMobileMenuOpen(false)}>
              <User size={16} strokeWidth={1.5} /> Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className={s.heroSection}>
        <div className={`${s.heroDecoBall} ${s.heroDecoBall1}`} />
        <div className={`${s.heroDecoBall} ${s.heroDecoBall2}`} />

        <div className={s.heroGrid}>
          <div>
            <p
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#c4933f',
                marginBottom: '16px',
              }}
            >
              Curated Marketplace · India
            </p>
            <h1 className={s.heroTagline}>
              Discover the{' '}
              <span className={s.heroTaglineAccent}>art</span>
              <br />of fine shopping
            </h1>
            <p className={s.heroSubtext}>
              Premium products from verified vendors — thoughtfully curated for
              quality, authenticity, and style.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/search" className={s.heroCta}>
                Browse Collection <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
              <Link
                href="/search?sort=newest"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  background: 'transparent',
                  color: '#8a8278',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  border: '1px solid #e8e2d6',
                }}
              >
                New Arrivals
              </Link>
            </div>
            <div className={s.heroStatBlock}>
              <div className={s.heroStat}>
                <span className={s.heroStatNum}>50K+</span>
                <span className={s.heroStatLabel}>Products</span>
              </div>
              <div className={s.heroStat}>
                <span className={s.heroStatNum}>500+</span>
                <span className={s.heroStatLabel}>Vendors</span>
              </div>
              <div className={s.heroStat}>
                <span className={s.heroStatNum}>10K+</span>
                <span className={s.heroStatLabel}>Customers</span>
              </div>
            </div>
          </div>

          {/* Decorative trust panel */}
          <div className={s.trustPanel}>
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                left: '-10px',
                width: '100%',
                height: '100%',
                border: '1px solid rgba(196,147,63,0.2)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ textAlign: 'center', padding: '28px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(196,147,63,0.1)',
                  border: '1px solid rgba(196,147,63,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                }}
              >
                <ShieldCheck size={24} strokeWidth={1.2} color="#c4933f" />
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: '1.2rem',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: '#1a1614',
                  lineHeight: 1.4,
                  marginBottom: '14px',
                }}
              >
                Quality you can trust
              </p>
              <p style={{ fontSize: '0.75rem', color: '#8a8278', lineHeight: 1.7 }}>
                Every vendor verified. Every product reviewed.
              </p>
              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '14px',
                  borderTop: '1px solid #e8e2d6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {[
                  { label: 'Verified Vendors', icon: BadgeCheck },
                  { label: 'Secure Payments', icon: CreditCard },
                  { label: 'Easy Returns', icon: RotateCcw },
                ].map((f) => (
                  <div
                    key={f.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.72rem',
                      color: '#8a8278',
                    }}
                  >
                    <f.icon size={14} strokeWidth={1.5} color="#c4933f" style={{ flexShrink: 0 }} />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured / New Arrivals */}
      {(displayListings?.data?.length ?? 0) > 0 || displayLoading ? (
        <section className={s.homeSection}>
          <div className={s.homeSectionInner}>
            <div className={s.homeSectionHeader}>

              <div>
                <p className={s.sectionSubheading}>Handpicked for you</p>
                <h2 className={s.sectionHeading}>{sectionTitle}</h2>
              </div>
              <Link href="/search" className={s.sectionViewAll}>
                View all
              </Link>
            </div>

            {displayLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <Spinner size="lg" />
              </div>
            ) : (() => {
              const flatCards = (displayListings?.data || []).map((listing) => {
                const primaryImg = listing.images?.find(i => i.isPrimary) || listing.images?.[0];
                const imageUrl = primaryImg?.url || listing.imageUrl || '';
                const imageAlt = primaryImg?.altText || listing.imageAlt || null;
                const discountPct = listing.compareAtPrice && listing.compareAtPrice > listing.priceAmount
                  ? Math.round(((listing.compareAtPrice - listing.priceAmount) / listing.compareAtPrice) * 100)
                  : 0;
                return { listing, imageUrl, imageAlt: imageAlt as string | null, cardKey: listing.productId, discountPct };
              });
              return (
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
                          <ShoppingBag size={32} strokeWidth={1} color="#c8c0b4" />
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
              );
            })()}
          </div>
        </section>
      ) : null}

      {/* Categories */}
      <section className={s.homeCategorySection}>
        <div className={s.homeSectionInner}>
          <div style={{ marginBottom: '32px' }}>
            <p className={s.sectionSubheading}>Browse by category</p>
            <h2 className={s.sectionHeading}>Shop by Category</h2>
          </div>

          {categoriesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Spinner size="lg" />
            </div>
          ) : categoriesToShow.length > 0 ? (
            <div className={s.categoryGrid}>
              {categoriesToShow.map((cat) => (
                <Link key={cat.id} href={`/categories/${cat.slug}`} className={s.categoryCard}>
                  <span className={s.categoryCardName}>{cat.name}</span>
                  <span className={s.categoryCardCount}>
                    {(cat.imageCount || 0).toLocaleString()} products · Shop Now
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#8a8278', fontSize: '0.875rem' }}>
              No categories available
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
            <div className={s.footerGrid}>
              <div>
                <span className={s.footerLogoText}>Meridian</span>
                <p className={s.footerTagline}>
                  Curated products from verified vendors across India.
                  Quality you can trust, delivered to your door.
                </p>
              </div>
              <div>
                <p className={s.footerColHeading}>Shop</p>
                <Link href="/search" className={s.footerLink}>All Products</Link>
                <Link href="/search?sort=newest" className={s.footerLink}>New Arrivals</Link>
                <Link href="/cart" className={s.footerLink}>My Cart</Link>
              </div>
              <div>
                <p className={s.footerColHeading}>Account</p>
                <Link href="/orders" className={s.footerLink}>My Orders</Link>
                <Link href="/reviews" className={s.footerLink}>My Reviews</Link>
                <Link href="/profile" className={s.footerLink}>Profile</Link>
                <Link href="/login" className={s.footerLink}>Sign In</Link>
              </div>
              <div>
                <p className={s.footerColHeading}>Company</p>
                <span className={s.footerLink}>About Meridian</span>
                <span className={s.footerLink}>Vendor Portal</span>
                <span className={s.footerLink}>Privacy Policy</span>
                <span className={s.footerLink}>Terms of Service</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
          <div className={s.footerBottom}>
            <span className={s.footerCopy}>© 2026 Meridian Commerce. All rights reserved.</span>
            <div className={s.footerGoldBar} />
          </div>
        </div>
      </footer>
    </div>
  );
}
