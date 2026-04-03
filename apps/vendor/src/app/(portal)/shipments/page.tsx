'use client';

import { useRouter } from 'next/navigation';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import type { ShipmentStatus } from '@ecommerce/shared-types';

interface ShipmentRow {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: ShipmentStatus;
  createdAt: string;
}

export default function VendorShipmentsPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();

  const qs = buildQueryString({ page, limit });
  const { data, isLoading } = useApiList<ShipmentRow>(`/vendor/shipments${qs}`);

  const columns: Column<ShipmentRow>[] = [
    { key: 'trackingNumber', header: 'Tracking #' },
    { key: 'carrier', header: 'Carrier', render: (s) => s.carrier || '-' },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.status} type="shipment" />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (s) => formatDate(s.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader title="Shipments" description="Track your shipments" />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(s) => router.push(`/shipments/${s.id}`)}
        emptyTitle="No shipments yet"
      />
    </div>
  );
}
