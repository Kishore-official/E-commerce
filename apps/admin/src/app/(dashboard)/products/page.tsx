'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DataTable,
  StatusBadge,
  Button,
  Modal,
  FormField,
  Textarea,
  Select,
  SearchInput,
  useApiList,
  useToast,
  usePagination,
  useDebounce,
  buildQueryString,
  apiPatch,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { ProductStatus } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

interface ProductRow {
  id: string;
  name: string;
  status: ProductStatus;
  vendorId: string;
  createdAt: string;
}

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending Review', value: ProductStatus.PENDING_REVIEW },
  { label: 'Approved', value: ProductStatus.APPROVED },
  { label: 'Rejected', value: ProductStatus.REJECTED },
  { label: 'Draft', value: ProductStatus.DRAFT },
];

export default function ProductsPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);
  const { addToast } = useToast();
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const qs = buildQueryString({ page, limit, search: debouncedSearch, status });
  const { data, mutate, isLoading } = useApiList<ProductRow>(`/admin/catalog/products${qs}`);

  const handleApprove = async (id: string) => {
    try {
      await apiPatch(`/admin/catalog/products/${id}/approve`, {});
      addToast('success', 'Product approved');
      mutate();
    } catch {
      addToast('error', 'Failed to approve product');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await apiPatch(`/admin/catalog/products/${rejectTarget.id}/reject`, { reason: rejectReason });
      addToast('success', 'Product rejected');
      mutate();
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      addToast('error', 'Failed to reject product');
    } finally {
      setRejecting(false);
    }
  };

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
    {
      key: 'actions',
      header: '',
      render: (p) =>
        p.status === ProductStatus.PENDING_REVIEW ? (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(p.id);
              }}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setRejectTarget({ id: p.id, name: p.name });
                setRejectReason('');
              }}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Products</h1>
          <p className={s.pageDesc}>Moderate and manage products</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search products..."
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
        onRowClick={(p) => router.push(`/products/${p.id}`)}
        emptyTitle="No products found"
      />

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Product"
        size="md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Rejecting: <strong>{rejectTarget?.name}</strong>
          </p>
          <FormField label="Rejection Reason" htmlFor="reject-reason" required>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this product is being rejected..."
              rows={4}
              required
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              loading={rejecting}
              disabled={!rejectReason.trim()}
            >
              Reject Product
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
