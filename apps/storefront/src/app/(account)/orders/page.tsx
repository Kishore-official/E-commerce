'use client';

import { useRouter } from 'next/navigation';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  PriceDisplay,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import type { OrderStatus } from '@ecommerce/shared-types';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  totalAmount?: number;
  createdAt: string;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();

  const qs = buildQueryString({ page, limit });
  const { data, isLoading } = useApiList<OrderRow>(`/orders${qs}`);

  const columns: Column<OrderRow>[] = [
    { key: 'orderNumber', header: 'Order #', render: (o) => o.orderNumber || o.id?.slice(0, 8) || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} type="order" />,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (o) => <PriceDisplay amount={o.grandTotal ?? o.totalAmount ?? 0} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader title="My Orders" />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        emptyTitle="No orders yet"
        emptyDescription="Start shopping to see your orders here"
      />
    </div>
  );
}
