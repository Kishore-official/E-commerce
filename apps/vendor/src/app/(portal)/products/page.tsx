'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  Button,
  Select,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { ProductStatus } from '@ecommerce/shared-types';

interface ProductRow {
  id: string;
  name: string;
  status: ProductStatus;
  createdAt: string;
}

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Draft', value: ProductStatus.DRAFT },
  { label: 'Pending Review', value: ProductStatus.PENDING_REVIEW },
  { label: 'Approved', value: ProductStatus.APPROVED },
  { label: 'Rejected', value: ProductStatus.REJECTED },
];

export default function VendorProductsPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();
  const [status, setStatus] = useState('');

  const qs = buildQueryString({ page, limit, status });
  const { data, isLoading } = useApiList<ProductRow>(`/vendor/products${qs}`);

  const columns: Column<ProductRow>[] = [
    { key: 'name', header: 'Product Name' },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge status={p.status} type="product" />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (p) => formatDate(p.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your products"
        actions={
          <Button onClick={() => router.push('/products/new')}>
            New Product
          </Button>
        }
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
        onRowClick={(p) => router.push(`/products/${p.id}`)}
        emptyTitle="No products yet"
        emptyDescription="Create your first product to get started"
      />
    </div>
  );
}
