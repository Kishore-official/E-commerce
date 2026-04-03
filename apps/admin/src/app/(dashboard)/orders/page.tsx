'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DataTable,
  StatusBadge,
  PriceDisplay,
  Select,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { OrderStatus } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  userId: string;
  createdAt: string;
}

const statusOptions = [
  { label: 'All Statuses', value: '' },
  ...Object.values(OrderStatus).map((s) => ({
    label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: s,
  })),
];

export default function OrdersPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();
  const [status, setStatus] = useState('');

  const qs = buildQueryString({ page, limit, status });
  const { data, isLoading } = useApiList<OrderRow>(`/admin/orders${qs}`);

  const columns: Column<OrderRow>[] = [
    { key: 'orderNumber', header: 'Order #', render: (o) => o.orderNumber || o.id.slice(0, 8) },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} type="order" />,
    },
    {
      key: 'grandTotal',
      header: 'Total',
      render: (o) => <PriceDisplay amount={o.grandTotal} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Orders</h1>
          <p className={s.pageDesc}>Manage all orders</p>
        </div>
      </div>

      <div className="mb-4">
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-48"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        emptyTitle="No orders found"
      />
    </div>
  );
}
