'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  useAuth, Spinner, getStorefrontLoginUrl, NotificationDropdown,
} from '@ecommerce/ui-kit';
import { UserRole } from '@ecommerce/shared-types';
import {
  LayoutDashboard, Package, Tag, ShoppingCart,
  Truck, Star, Settings, LogOut,
} from 'lucide-react';
import s from './portal.module.css';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Offers', href: '/offers', icon: Tag },
    ],
  },
  {
    label: 'Orders',
    items: [
      { label: 'Orders', href: '/orders', icon: ShoppingCart },
      { label: 'Shipments', href: '/shipments', icon: Truck },
    ],
  },
  {
    label: 'Other',
    items: [
      { label: 'Reviews', href: '/reviews', icon: Star },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

function getPageSection(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] === 'dashboard') return 'Overview';
  const label = segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, ' ');
  return label;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#faf9f6' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user || ![UserRole.VENDOR, UserRole.VENDOR_STAFF].includes(user.role)) {
    if (typeof window !== 'undefined') {
      window.location.href = getStorefrontLoginUrl();
    }
    return null;
  }

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`;
  const section = getPageSection(pathname);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#faf9f6' }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={s.sidebar}>
        {/* Brand */}
        <div className={s.sidebarHeader}>
          <div className={s.brandMark}>MV</div>
          <div className={s.brandText}>
            <span className={s.brandName}>Meridian</span>
            <span className={s.brandSub}>Vendor Portal</span>
          </div>
        </div>

        {/* Nav */}
        <div className={s.sidebarScroll}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={s.navGroup}>
              <p className={s.navGroupLabel}>{group.label}</p>
              {group.items.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${s.navLink} ${isActive ? s.navLinkActive : ''}`}
                  >
                    <Icon size={15} strokeWidth={1.75} className={s.navIcon} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className={s.sidebarFooter}>
          <div className={s.userCard}>
            <div className={s.userAvatar}>{initials}</div>
            <div className={s.userInfo}>
              <p className={s.userName}>{fullName}</p>
              <p className={s.userRole}>{user.role?.replace('_', ' ')}</p>
            </div>
            <button
              className={s.logoutBtn}
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────── */}
      <div style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header className={s.topBar}>
          <div className={s.topBarBreadcrumb}>
            <span className={s.topBarSection}>Vendor</span>
            <span style={{ color: '#c0bdb7' }}>/</span>
            <span style={{ color: '#1a1614' }}>{section}</span>
          </div>
          <div className={s.topBarRight}>
            <NotificationDropdown />
            <div className={s.topBarUserChip}>
              <div className={s.topBarAvatar}>{initials}</div>
              <span className={s.topBarName}>{fullName}</span>
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
