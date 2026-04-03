'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
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

interface VendorOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  createdAt: string;
  items: { id: string; quantity: number; productName?: string }[];
}

const statusOptions = [
  { label: 'All Orders', value: '' },
  { label: 'Confirmed', value: OrderStatus.CONFIRMED },
  { label: 'Processing', value: OrderStatus.PROCESSING },
  { label: 'Partially Shipped', value: OrderStatus.PARTIALLY_SHIPPED },
  { label: 'Shipped', value: OrderStatus.SHIPPED },
  { label: 'Delivered', value: OrderStatus.DELIVERED },
  { label: 'Completed', value: OrderStatus.COMPLETED },
  { label: 'Cancelled', value: OrderStatus.CANCELLED },
];

export default function VendorOrdersPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();
  const [status, setStatus] = useState('');

  const qs = buildQueryString({ page, limit, status });
  const { data, isLoading } = useApiList<VendorOrderRow>(`/vendor/orders${qs}`);

  const columns: Column<VendorOrderRow>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (o) => o.orderNumber || o.id.slice(0, 8),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} type="order" />,
    },
    {
      key: 'items',
      header: 'Qty',
      render: (o) => o.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ?? 0,
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
      <PageHeader title="Orders" description="Incoming orders to fulfill" />

      <div className="mb-4">
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-52"
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
        emptyTitle="No orders yet"
      />
    </div>
  );
}
