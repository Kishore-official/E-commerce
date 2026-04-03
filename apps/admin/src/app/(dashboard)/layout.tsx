'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Tag,
  Award,
  BarChart2,
  Users,
  Store,
  ShoppingCart,
  Truck,
  Star,
  FileText,
  LogOut,
} from 'lucide-react';
import {
  useAuth,
  Spinner,
  NotificationDropdown,
} from '@ecommerce/ui-kit';
import { UserRole } from '@ecommerce/shared-types';
import s from '../admin.module.css';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR, UserRole.OPS];

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Categories', href: '/categories', icon: Tag },
      { label: 'Brands', href: '/brands', icon: Award },
      { label: 'Offers', href: '/offers', icon: BarChart2 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Vendors', href: '/vendors', icon: Store },
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Orders', href: '/orders', icon: ShoppingCart },
      { label: 'Shipments', href: '/shipments', icon: Truck },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { label: 'Reviews', href: '/reviews', icon: Star },
      { label: 'Audit Logs', href: '/audit-logs', icon: FileText },
    ],
  },
];

function getPageSection(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] === 'dashboard') return 'Overview';
  const label = segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, ' ');
  return label;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !ADMIN_ROLES.includes(user.role)) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
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
          <div className={s.brandMark}>MA</div>
          <div className={s.brandText}>
            <span className={s.brandName}>Meridian</span>
            <span className={s.brandSub}>Admin Console</span>
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
              <p className={s.userRole}>{user.role}</p>
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
            <span className={s.topBarSection}>Admin</span>
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
