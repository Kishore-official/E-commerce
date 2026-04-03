'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  PriceDisplay,
  Button,
  Select,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { OfferStatus } from '@ecommerce/shared-types';

interface OfferRow {
  id: string;
  status: OfferStatus;
  productName: string | null;
  variantName: string | null;
  priceAmount: number;
  priceCurrency: string;
  stockQuantity: number;
  countryCode: string;
  offerType: string;
  createdAt: string;
}

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Draft', value: OfferStatus.DRAFT },
  { label: 'Pending Review', value: OfferStatus.PENDING_REVIEW },
  { label: 'Active', value: OfferStatus.ACTIVE },
  { label: 'Paused', value: OfferStatus.PAUSED },
  { label: 'Out of Stock', value: OfferStatus.OUT_OF_STOCK },
  { label: 'Rejected', value: OfferStatus.REJECTED },
  { label: 'Archived', value: OfferStatus.ARCHIVED },
];

export default function VendorOffersPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();
  const [status, setStatus] = useState('');

  const qs = buildQueryString({ page, limit, status });
  const { data, isLoading } = useApiList<OfferRow>(`/vendor/offers${qs}`);

  const columns: Column<OfferRow>[] = [
    {
      key: 'productName',
      header: 'Product',
      render: (o) => (
        <div>
          <p className="text-sm font-medium">{o.productName ?? '—'}</p>
          {o.variantName && <p className="text-xs text-gray-500">{o.variantName}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} type="offer" />,
    },
    {
      key: 'priceAmount',
      header: 'Price',
      render: (o) => <PriceDisplay amount={o.priceAmount} currency={o.priceCurrency} />,
    },
    { key: 'stockQuantity', header: 'Stock' },
    { key: 'countryCode', header: 'Country' },
    {
      key: 'offerType',
      header: 'Type',
      render: (o) => <span className="capitalize">{o.offerType}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Offers"
        description="Manage your offers"
        actions={<Button onClick={() => router.push('/offers/new')}>New Offer</Button>}
      />

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
        onRowClick={(o) => router.push(`/offers/${o.id}`)}
        emptyTitle="No offers yet"
        emptyDescription="Create your first offer to get started"
      />
    </div>
  );
}
