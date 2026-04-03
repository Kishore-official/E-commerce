'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  StatusBadge,
  PriceDisplay,
  Select,
  SearchInput,
  useApiList,
  usePagination,
  useDebounce,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { OfferStatus } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

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
  variantId: string;
  vendorId: string;
  createdAt: string;
}

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending Review', value: OfferStatus.PENDING_REVIEW },
  { label: 'Draft', value: OfferStatus.DRAFT },
  { label: 'Active', value: OfferStatus.ACTIVE },
  { label: 'Paused', value: OfferStatus.PAUSED },
  { label: 'Out of Stock', value: OfferStatus.OUT_OF_STOCK },
  { label: 'Rejected', value: OfferStatus.REJECTED },
  { label: 'Archived', value: OfferStatus.ARCHIVED },
];

function OffersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { page, limit, setPage } = usePagination();
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const qs = buildQueryString({ page, limit, status, search: debouncedSearch });
  const { data, isLoading } = useApiList<OfferRow>(`/admin/offers${qs}`);

  const columns: Column<OfferRow>[] = [
    {
      key: 'productName',
      header: 'Product',
      render: (o) => (
        <div>
          <p className="text-sm font-medium">{o.productName ?? o.id.slice(0, 8)}</p>
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
      key: 'vendorId',
      header: 'Vendor',
      render: (o) => <span className="text-sm">{o.vendorId.slice(0, 8)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Offers</h1>
          <p className={s.pageDesc}>Monitor and approve vendor offers</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search offers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          className="w-64"
        />
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
        emptyTitle="No offers found"
      />
    </div>
  );
}

export default function OffersPage() {
  return (
    <Suspense>
      <OffersPageContent />
    </Suspense>
  );
}
