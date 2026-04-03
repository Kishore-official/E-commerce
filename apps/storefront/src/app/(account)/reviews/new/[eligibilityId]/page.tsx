'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  FormField,
  Spinner,
  useApiGet,
  useToast,
  apiPost,
} from '@ecommerce/ui-kit';

interface Eligibility {
  id: string;
  status: string;
  productName: string;
  variantName: string;
  productSlug: string;
  eligibleUntil: string;
}

export default function WriteReviewPage() {
  const { eligibilityId } = useParams<{ eligibilityId: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rating: 5,
    title: '',
    body: '',
  });

  const { data: eligibility, isLoading: eligibilityLoading } = useApiGet<Eligibility>(
    `/reviews/eligibilities/${eligibilityId}`,
  );

  // Redirect if already submitted
  useEffect(() => {
    if (!eligibilityLoading && eligibility && eligibility.status === 'review_submitted') {
      addToast('info', 'You have already reviewed this product');
      router.replace('/reviews');
    }
  }, [eligibility, eligibilityLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/reviews', {
        reviewEligibilityId: eligibilityId,
        rating: form.rating,
        title: form.title || undefined,
        body: form.body || undefined,
      });
      addToast('success', 'Review submitted!');
      router.push('/reviews');
    } catch {
      addToast('error', 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (eligibilityLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!eligibility) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Eligibility not found.</p>
        <Link href="/reviews" className="mt-4 text-blue-600 hover:underline text-sm">
          Back to Reviews
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Write a Review"
        breadcrumbs={[
          { label: 'Reviews', href: '/reviews' },
          { label: 'Write Review' },
        ]}
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>
            Reviewing:{' '}
            <Link href={`/products/${eligibility.productSlug}`} className="text-blue-600 hover:underline">
              {eligibility.productName}
            </Link>
            {eligibility.variantName && (
              <span className="text-base font-normal text-gray-500"> — {eligibility.variantName}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Rating" htmlFor="rating" required>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm({ ...form, rating: star })}
                    className={`text-2xl ${
                      star <= form.rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    &#9733;
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Title" htmlFor="title">
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={255}
                placeholder="Brief summary"
              />
            </FormField>
            <FormField label="Review" htmlFor="body">
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={5}
                maxLength={5000}
                placeholder="Share your experience..."
              />
            </FormField>
            <div className="flex gap-3">
              <Button type="submit" loading={loading}>
                Submit Review
              </Button>
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
