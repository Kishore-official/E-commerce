'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  Badge,
  Button,
  FormField,
  Textarea,
  Spinner,
  useApiGet,
  useToast,
  apiPatch,
  formatDate,
} from '@ecommerce/ui-kit';
import { ReviewStatus } from '@ecommerce/shared-types';

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  userId: string;
  productId: string;
  variantId: string;
  moderatedBy: string | null;
  moderatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: review, isLoading, mutate } = useApiGet<Review>(`/admin/reviews/${id}`);

  const [rejectionReason, setRejectionReason] = useState('');
  const [moderating, setModerating] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!review) {
    return <div className="py-12 text-center text-gray-500">Review not found</div>;
  }

  const handleModerate = async (action: 'approved' | 'rejected') => {
    setModerating(true);
    try {
      await apiPatch(`/admin/reviews/${id}/moderate`, {
        status: action,
        rejectionReason: action === 'rejected' ? rejectionReason : undefined,
      });
      addToast('success', `Review ${action}`);
      mutate();
    } catch {
      addToast('error', 'Failed to moderate review');
    } finally {
      setModerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Review Detail"
        breadcrumbs={[
          { label: 'Reviews', href: '/reviews' },
          { label: review.id.slice(0, 8) },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Review Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="blue">{review.rating}/5</Badge>
              <StatusBadge status={review.status} type="review" />
            </div>
            {review.title && <p className="font-medium">{review.title}</p>}
            {review.body && <p className="text-sm text-gray-600">{review.body}</p>}
            <p className="text-xs text-gray-400">Submitted: {formatDate(review.createdAt)}</p>
            {review.rejectionReason && (
              <div className="rounded bg-red-50 p-2 text-sm text-red-700">
                Rejection reason: {review.rejectionReason}
              </div>
            )}
          </CardContent>
        </Card>

        {review.status === ReviewStatus.PENDING_MODERATION && (
          <Card>
            <CardHeader>
              <CardTitle>Moderate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Rejection Reason (required if rejecting)">
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                />
              </FormField>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleModerate('approved')}
                  loading={moderating}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleModerate('rejected')}
                  loading={moderating}
                  disabled={!rejectionReason.trim()}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}
