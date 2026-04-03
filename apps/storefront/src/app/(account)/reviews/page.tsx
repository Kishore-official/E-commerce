'use client';

import Link from 'next/link';
import {
  PageHeader,
  Card,
  CardContent,
  Badge,
  Button,
  Spinner,
  StatusBadge,
  useApiGet,
  useApiList,
  formatDate,
} from '@ecommerce/ui-kit';

interface Eligibility {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  productSlug: string;
  status: string;
  eligibleUntil: string;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  createdAt: string;
}

export default function MyReviewsPage() {
  const { data: eligibilities, isLoading: loadingE } = useApiList<Eligibility>('/reviews/eligibilities');
  const { data: reviews, isLoading: loadingR } = useApiList<Review>('/reviews/my');

  const eligList = eligibilities?.data ?? [];
  const reviewList = reviews?.data ?? [];

  if (loadingE || loadingR) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Reviews" />

      {eligList.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Eligible for Review ({eligList.length})
          </h2>
          <div className="space-y-2">
            {eligList.map((e: Eligibility) => (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/products/${e.productSlug}`}
                      className="text-sm font-medium text-gray-900 hover:underline"
                    >
                      {e.productName}
                    </Link>
                    {e.variantName && (
                      <p className="text-xs text-gray-500">{e.variantName}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Eligible until: {formatDate(e.eligibleUntil)}
                    </p>
                  </div>
                  <Link href={`/reviews/new/${e.id}`}>
                    <Button size="sm">Write Review</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        Your Reviews ({reviewList.length})
      </h2>
      {reviewList.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviewList.map((r: Review) => (
            <Card key={r.id}>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="yellow">{r.rating}/5</Badge>
                  <StatusBadge status={r.status} type="review" />
                </div>
                {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm text-gray-600">{r.body}</p>}
                <p className="mt-1 text-xs text-gray-400">{formatDate(r.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
