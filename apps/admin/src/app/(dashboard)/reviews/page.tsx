'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DataTable,
  StatusBadge,
  Badge,
  Select,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { ReviewStatus } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

interface ReviewRow {
  id: string;
  rating: number;
  title: string;
  status: ReviewStatus;
  userId: string;
  productId: string;
  createdAt: string;
}

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending Moderation', value: ReviewStatus.PENDING_MODERATION },
  { label: 'Approved', value: ReviewStatus.APPROVED },
  { label: 'Rejected', value: ReviewStatus.REJECTED },
];

export default function ReviewsPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();
  const [status, setStatus] = useState('');

  const qs = buildQueryString({ page, limit, status });
  const { data, isLoading } = useApiList<ReviewRow>(`/admin/reviews${qs}`);

  const columns: Column<ReviewRow>[] = [
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => <Badge variant="blue">{r.rating}/5</Badge>,
    },
    { key: 'title', header: 'Title', render: (r) => r.title || '-' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} type="review" />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (r) => formatDate(r.createdAt),
    },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Reviews</h1>
          <p className={s.pageDesc}>Moderate customer reviews</p>
        </div>
      </div>

      <div className="mb-4">
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
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
        onRowClick={(r) => router.push(`/reviews/${r.id}`)}
        emptyTitle="No reviews found"
      />
    </div>
  );
}
