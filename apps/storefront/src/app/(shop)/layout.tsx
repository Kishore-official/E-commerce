'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Search, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth, Avatar } from '@ecommerce/ui-kit';
import s from '../store.module.css';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

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
          {/* Logo */}
          <Link href="/" className={s.logo}>
            Meridian<span className={s.logoDot}>.</span>
          </Link>

          {/* Center Nav */}
          <nav className={s.navDesktop}>
            <Link
              href="/search"
              className={`${s.navLink} ${pathname === '/search' ? s.navLinkActive : ''}`}
            >
              Explore
            </Link>
            <Link
              href="/search?sort=newest"
              className={`${s.navLink} ${pathname.startsWith('/categories') ? s.navLinkActive : ''}`}
            >
              New Arrivals
            </Link>
          </nav>

          {/* Right Zone */}
          <div className={s.headerActions}>
            <Link href="/search" className={s.iconBtn} title="Search">
              <Search size={16} strokeWidth={1.5} />
            </Link>
            <Link href="/cart" className={s.iconBtn} title="Cart">
              <ShoppingBag size={16} strokeWidth={1.5} />
            </Link>

            {isAuthenticated && user ? (
              <>
                <Link
                  href="/orders"
                  className={s.iconBtn}
                  title={`${user.firstName}'s Account`}
                  style={{ marginLeft: '4px' }}
                >
                  <User size={16} strokeWidth={1.5} />
                </Link>
                <span
                  className={s.headerUserName}
                  style={{ marginLeft: '6px', marginRight: '4px' }}
                >
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

      {/* Page Content */}
      <main className={s.mainContent}>
        {children}
      </main>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
            <div className={s.footerGrid}>
              {/* Brand */}
              <div>
                <span className={s.footerLogoText}>Meridian</span>
                <p className={s.footerTagline}>
                  Curated products from verified vendors across India.
                  Quality you can trust, delivered to your door.
                </p>
              </div>

              {/* Shop */}
              <div>
                <p className={s.footerColHeading}>Shop</p>
                <Link href="/search" className={s.footerLink}>All Products</Link>
                <Link href="/search?sort=newest" className={s.footerLink}>New Arrivals</Link>
                <Link href="/search?isFeatured=true" className={s.footerLink}>Featured</Link>
                <Link href="/cart" className={s.footerLink}>My Cart</Link>
              </div>

              {/* Account */}
              <div>
                <p className={s.footerColHeading}>Account</p>
                <Link href="/orders" className={s.footerLink}>My Orders</Link>
                <Link href="/reviews" className={s.footerLink}>My Reviews</Link>
                <Link href="/profile" className={s.footerLink}>Profile</Link>
                <Link href="/login" className={s.footerLink}>Sign In</Link>
              </div>

              {/* Info */}
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
            <span className={s.footerCopy}>
              © 2026 Meridian Commerce. All rights reserved.
            </span>
            <div className={s.footerGoldBar} />
          </div>
        </div>
      </footer>
    </div>
  );
}
