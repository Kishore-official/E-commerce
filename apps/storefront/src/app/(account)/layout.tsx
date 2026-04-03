'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Search, LogOut, Star, User, Package, Menu, X } from 'lucide-react';
import { useAuth, Spinner } from '@ecommerce/ui-kit';
import s from '../store.module.css';

const navItems = [
  { label: 'My Orders', href: '/orders', icon: Package },
  { label: 'My Reviews', href: '/reviews', icon: Star },
  { label: 'Profile', href: '/profile', icon: User },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/account';
    router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

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
            <span className={s.headerUserName} style={{ marginLeft: '8px', marginRight: '4px' }}>
              {user.firstName}
            </span>
            <button className={s.logoutBtn} onClick={handleLogout} title="Sign Out">
              <LogOut size={13} strokeWidth={1.5} />
            </button>

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
          <Link href="/orders" className={s.mobileMenuLink} onClick={() => setMobileMenuOpen(false)}>
            <Package size={16} strokeWidth={1.5} /> My Orders
          </Link>
          <Link href="/reviews" className={s.mobileMenuLink} onClick={() => setMobileMenuOpen(false)}>
            <Star size={16} strokeWidth={1.5} /> My Reviews
          </Link>
          <Link href="/profile" className={s.mobileMenuLink} onClick={() => setMobileMenuOpen(false)}>
            <User size={16} strokeWidth={1.5} /> Profile
          </Link>
          <div className={s.mobileMenuDivider} />
          <button
            className={s.mobileMenuLink}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
          >
            <LogOut size={16} strokeWidth={1.5} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Account body */}
      <div className={s.mainContent}>
        <div className={s.acctLayoutGrid} style={{ alignItems: 'start' }}>

          {/* Sidebar */}
          <aside className={s.acctSidebar}>
            <div className={s.acctUserBlock}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(196,147,63,0.12)',
                  border: '1px solid rgba(196,147,63,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#c4933f',
                }}
              >
                {user.firstName[0]}{user.lastName?.[0] ?? ''}
              </div>
              <p className={s.acctUserName}>{user.firstName} {user.lastName}</p>
              <p className={s.acctUserEmail}>{user.email}</p>
            </div>

            <nav>
              {navItems.map(({ label, href, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`${s.acctNavLink} ${isActive ? s.acctNavLinkActive : ''}`}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <button className={s.acctLogoutLink} onClick={handleLogout}>
              <LogOut size={14} strokeWidth={1.5} />
              Sign Out
            </button>
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
