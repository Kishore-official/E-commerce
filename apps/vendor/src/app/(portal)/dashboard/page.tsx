'use client';

import Link from 'next/link';
import {
  useAuth,
  useApiList,
} from '@ecommerce/ui-kit';
import {
  Package, Tag, ShoppingCart,
  Plus, Truck, Star,
} from 'lucide-react';
import type { PaginatedResult } from '@ecommerce/shared-types';
import s from '../portal.module.css';

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const { data: draftProducts } = useApiList<unknown>('/vendor/products?limit=1&status=draft');
  const { data: draftOffers }   = useApiList<unknown>('/vendor/offers?limit=1&status=draft');
  const { data: pendingOrders } = useApiList<unknown>('/vendor/orders?limit=1&status=confirmed');

  const draftProductCount = (draftProducts as PaginatedResult<unknown>)?.meta?.totalItems ?? 0;
  const draftOfferCount = (draftOffers as PaginatedResult<unknown>)?.meta?.totalItems ?? 0;
  const pendingOrderCount = (pendingOrders as PaginatedResult<unknown>)?.meta?.totalItems ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* ── Welcome banner ─────────────────────────────────── */}
      <div className={s.welcomeBanner}>
        <p className={s.welcomeGreeting}>{greeting}</p>
        <h1 className={s.welcomeTitle}>
          {user?.firstName
            ? `${user.firstName} ${user.lastName}`
            : 'Welcome back'}
        </h1>
        <p className={s.welcomeSub}>
          Here&apos;s an overview of your store — review pending items and manage your catalog.
        </p>
        <div className={s.welcomeStats}>
          <div className={s.welcomeStat}>
            <span className={s.welcomeStatNum}>{draftProductCount}</span>
            <span className={s.welcomeStatLabel}>Draft Products</span>
          </div>
          <div className={s.welcomeStat}>
            <span className={s.welcomeStatNum}>{draftOfferCount}</span>
            <span className={s.welcomeStatLabel}>Draft Offers</span>
          </div>
          <div className={s.welcomeStat}>
            <span className={s.welcomeStatNum}>{pendingOrderCount}</span>
            <span className={s.welcomeStatLabel}>Pending Orders</span>
          </div>
        </div>
      </div>

      {/* ── Store overview ───────────────────────────────── */}
      <p className={s.dashSectionLabel}>Store Overview</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>

        <Link href="/products?status=draft" className={s.metricCard}>
          <div className={s.metricCardIcon} style={{ background: 'rgba(196, 147, 63, 0.1)' }}>
            <Package size={20} strokeWidth={1.5} color="#c4933f" />
          </div>
          <div className={s.metricCardBody}>
            <p className={s.metricCardLabel}>Draft Products</p>
            <p className={s.metricCardValue}>{draftProductCount}</p>
            <p className={s.metricCardSub}>Awaiting submission</p>
          </div>
        </Link>

        <Link href="/offers?status=draft" className={s.metricCard}>
          <div className={s.metricCardIcon} style={{ background: 'rgba(196, 147, 63, 0.07)' }}>
            <Tag size={20} strokeWidth={1.5} color="#b8832c" />
          </div>
          <div className={s.metricCardBody}>
            <p className={s.metricCardLabel}>Draft Offers</p>
            <p className={s.metricCardValue}>{draftOfferCount}</p>
            <p className={s.metricCardSub}>Not yet submitted for review</p>
          </div>
        </Link>

        <Link href="/orders?status=confirmed" className={s.metricCard}>
          <div className={s.metricCardIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <ShoppingCart size={20} strokeWidth={1.5} color="#f59e0b" />
          </div>
          <div className={s.metricCardBody}>
            <p className={s.metricCardLabel}>Orders to Confirm</p>
            <p className={s.metricCardValue}>{pendingOrderCount}</p>
            <p className={s.metricCardSub}>Awaiting your action</p>
          </div>
        </Link>
      </div>

      {/* ── Quick actions ────────────────────────────────── */}
      <p className={s.dashSectionLabel}>Quick Actions</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

        <Link href="/products/new" className={s.actionCard}>
          <div className={s.actionCardIcon} style={{ background: 'rgba(196, 147, 63, 0.1)', color: '#c4933f' }}>
            <Plus size={18} strokeWidth={2} />
          </div>
          <span className={s.actionCardLabel}>New Product</span>
        </Link>

        <Link href="/offers/new" className={s.actionCard}>
          <div className={s.actionCardIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Tag size={18} strokeWidth={1.8} />
          </div>
          <span className={s.actionCardLabel}>New Offer</span>
        </Link>

        <Link href="/orders" className={s.actionCard}>
          <div className={s.actionCardIcon} style={{ background: 'rgba(196, 147, 63, 0.07)', color: '#b8832c' }}>
            <ShoppingCart size={18} strokeWidth={1.8} />
          </div>
          <span className={s.actionCardLabel}>View Orders</span>
        </Link>

        <Link href="/shipments" className={s.actionCard}>
          <div className={s.actionCardIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Truck size={18} strokeWidth={1.8} />
          </div>
          <span className={s.actionCardLabel}>Shipments</span>
        </Link>
      </div>
    </div>
  );
}
