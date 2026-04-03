'use client';

import { useRouter } from 'next/navigation';
import {
  Store,
  Package,
  BarChart2,
  Star,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { useApiGet } from '@ecommerce/ui-kit';
import type { PaginatedResult } from '@ecommerce/shared-types';
import { VendorStatus } from '@ecommerce/shared-types';
import { OfferStatus } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { data: products } = useApiGet<PaginatedResult<unknown>>('/admin/catalog/products?limit=1&status=pending_review');
  const { data: vendors } = useApiGet<PaginatedResult<unknown>>(`/admin/identity/vendors?limit=1&status=${VendorStatus.PENDING}`);
  const { data: offers } = useApiGet<PaginatedResult<unknown>>(`/admin/offers?limit=1&status=${OfferStatus.PENDING_REVIEW}`);
  const { data: reviews } = useApiGet<PaginatedResult<unknown>>('/admin/reviews?limit=1&status=pending_moderation');
  const { data: orders } = useApiGet<PaginatedResult<unknown>>('/admin/orders?limit=1');
  const { data: users } = useApiGet<PaginatedResult<unknown>>('/admin/users?limit=1');

  const pendingVendors = vendors?.meta?.totalItems ?? 0;
  const pendingProducts = products?.meta?.totalItems ?? 0;
  const pendingOffers = offers?.meta?.totalItems ?? 0;
  const pendingReviews = reviews?.meta?.totalItems ?? 0;
  const totalOrders = orders?.meta?.totalItems ?? '-';
  const totalUsers = users?.meta?.totalItems ?? '-';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* ── Welcome banner ─────────────────────────────────── */}
      <div className={s.welcomeBanner}>
        <p className={s.welcomeGreeting}>{greeting}</p>
        <h1 className={s.welcomeTitle}>Meridian Admin Console</h1>
        <p className={s.welcomeSub}>
          Platform operations dashboard — review pending items and monitor key metrics.
        </p>
        <div className={s.welcomeStats}>
          <div className={s.welcomeStat}>
            <span className={s.welcomeStatNum}>{totalOrders}</span>
            <span className={s.welcomeStatLabel}>Total Orders</span>
          </div>
          <div className={s.welcomeStat}>
            <span className={s.welcomeStatNum}>{totalUsers}</span>
            <span className={s.welcomeStatLabel}>Registered Users</span>
          </div>
          <div className={s.welcomeStat}>
            <span className={s.welcomeStatNum}>
              {pendingVendors + pendingProducts + pendingOffers + pendingReviews}
            </span>
            <span className={s.welcomeStatLabel}>Pending Actions</span>
          </div>
        </div>
      </div>

      {/* ── Needs attention ────────────────────────────────── */}
      <p className={s.dashSectionLabel}>Needs Attention</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>

        <div
          className={`${s.actionCard} ${pendingVendors === 0 ? s.actionCardGreen : ''}`}
          onClick={() => router.push('/vendors?status=pending')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/vendors?status=pending')}
        >
          <div className={s.actionCardIcon}><Store size={16} strokeWidth={1.75} /></div>
          <p className={s.actionCardTitle}>Pending Vendors</p>
          <p className={s.actionCardValue}>{pendingVendors}</p>
          <p className={s.actionCardDesc}>{pendingVendors === 0 ? 'All vendors reviewed' : 'Awaiting approval'}</p>
        </div>

        <div
          className={`${s.actionCard} ${pendingProducts === 0 ? s.actionCardGreen : ''}`}
          onClick={() => router.push('/products?status=pending_review')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/products?status=pending_review')}
        >
          <div className={s.actionCardIcon}><Package size={16} strokeWidth={1.75} /></div>
          <p className={s.actionCardTitle}>Pending Products</p>
          <p className={s.actionCardValue}>{pendingProducts}</p>
          <p className={s.actionCardDesc}>{pendingProducts === 0 ? 'All products reviewed' : 'Awaiting review'}</p>
        </div>

        <div
          className={`${s.actionCard} ${pendingOffers === 0 ? s.actionCardGreen : ''}`}
          onClick={() => router.push('/offers?status=pending_review')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/offers?status=pending_review')}
        >
          <div className={s.actionCardIcon}><BarChart2 size={16} strokeWidth={1.75} /></div>
          <p className={s.actionCardTitle}>Pending Offers</p>
          <p className={s.actionCardValue}>{pendingOffers}</p>
          <p className={s.actionCardDesc}>{pendingOffers === 0 ? 'All offers reviewed' : 'Awaiting review'}</p>
        </div>

        <div
          className={`${s.actionCard} ${pendingReviews === 0 ? s.actionCardGreen : ''}`}
          onClick={() => router.push('/reviews?status=pending_moderation')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/reviews?status=pending_moderation')}
        >
          <div className={s.actionCardIcon}><Star size={16} strokeWidth={1.75} /></div>
          <p className={s.actionCardTitle}>Pending Reviews</p>
          <p className={s.actionCardValue}>{pendingReviews}</p>
          <p className={s.actionCardDesc}>{pendingReviews === 0 ? 'All reviews moderated' : 'Awaiting moderation'}</p>
        </div>
      </div>

      {/* ── Platform overview ──────────────────────────────── */}
      <p className={s.dashSectionLabel}>Platform Overview</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

        <div className={s.metricCard}>
          <div className={s.metricCardIcon} style={{ background: 'rgba(196, 147, 63, 0.1)' }}>
            <ShoppingCart size={20} strokeWidth={1.5} color="#c4933f" />
          </div>
          <div className={s.metricCardBody}>
            <p className={s.metricCardLabel}>Total Orders</p>
            <p className={s.metricCardValue}>{totalOrders}</p>
            <p className={s.metricCardSub}>All time platform orders</p>
          </div>
        </div>

        <div className={s.metricCard}>
          <div className={s.metricCardIcon} style={{ background: 'rgba(196, 147, 63, 0.07)' }}>
            <Users size={20} strokeWidth={1.5} color="#b8832c" />
          </div>
          <div className={s.metricCardBody}>
            <p className={s.metricCardLabel}>Registered Users</p>
            <p className={s.metricCardValue}>{totalUsers}</p>
            <p className={s.metricCardSub}>Customers, vendors &amp; staff</p>
          </div>
        </div>
      </div>
    </div>
  );
}
