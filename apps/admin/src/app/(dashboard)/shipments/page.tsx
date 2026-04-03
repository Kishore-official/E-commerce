'use client';

import {
  DataTable,
  StatusBadge,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { ShipmentStatus } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

interface ShipmentRow {
  id: string;
  orderId: string;
  vendorId: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: ShipmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export default function ShipmentsPage() {
  const { page, limit, setPage } = usePagination();
  const qs = buildQueryString({ page, limit });
  const { data, isLoading } = useApiList<ShipmentRow>(`/admin/shipments${qs}`);

  const columns: Column<ShipmentRow>[] = [
    {
      key: 'id',
      header: 'Shipment ID',
      render: (s) => <span className="font-mono text-xs">{s.id.slice(0, 8)}</span>,
    },
    {
      key: 'orderId',
      header: 'Order ID',
      render: (s) => <span className="font-mono text-xs">{s.orderId.slice(0, 8)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.status} type="shipment" />,
    },
    {
      key: 'carrier',
      header: 'Carrier',
      render: (s) => s.carrier || '-',
    },
    {
      key: 'trackingNumber',
      header: 'Tracking #',
      render: (s) => s.trackingNumber || '-',
    },
    {
      key: 'shippedAt',
      header: 'Shipped',
      render: (s) => (s.shippedAt ? formatDate(s.shippedAt) : '-'),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (s) => formatDate(s.createdAt),
    },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Shipments</h1>
          <p className={s.pageDesc}>Monitor all shipments</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
        emptyTitle="No shipments found"
        emptyDescription="Shipments are created when vendors fulfill orders"
      />
    </div>
  );
}
