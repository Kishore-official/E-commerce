'use client';

import { useState } from 'react';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  Select,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { ReviewStatus } from '@ecommerce/shared-types';

interface ReviewRow {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  moderatedAt: string | null;
  createdAt: string;
}

const statusOptions = [
  { label: 'All Reviews', value: '' },
  { label: 'Pending Moderation', value: ReviewStatus.PENDING_MODERATION },
  { label: 'Approved', value: ReviewStatus.APPROVED },
  { label: 'Rejected', value: ReviewStatus.REJECTED },
];

const ratingOptions = [
  { label: 'All Ratings', value: '' },
  { label: '5 Stars', value: '5' },
  { label: '4 Stars', value: '4' },
  { label: '3 Stars', value: '3' },
  { label: '2 Stars', value: '2' },
  { label: '1 Star', value: '1' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-amber-500">
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export default function VendorReviewsPage() {
  const { page, limit, setPage } = usePagination();
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState('');

  const qs = buildQueryString({ page, limit, status, rating });
  const { data, isLoading } = useApiList<ReviewRow>(`/vendor/reviews${qs}`);

  const columns: Column<ReviewRow>[] = [
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => <StarRating rating={r.rating} />,
    },
    {
      key: 'title',
      header: 'Review',
      render: (r) => (
        <div>
          {r.title && <p className="text-sm font-medium">{r.title}</p>}
          {r.body && (
            <p className="max-w-xs truncate text-xs text-gray-500">{r.body}</p>
          )}
          {!r.title && !r.body && <span className="text-xs text-gray-400">No text</span>}
        </div>
      ),
    },
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
      <PageHeader
        title="Reviews"
        description="Customer reviews on your products (read-only)"
      />

      <div className="mb-4 flex gap-3">
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-52"
        />
        <Select
          options={ratingOptions}
          value={rating}
          onChange={(e) => { setRating(e.target.value); setPage(1); }}
          className="w-36"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
        emptyTitle="No reviews yet"
        emptyDescription="Customer reviews on your products will appear here once submitted"
      />
    </div>
  );
}
