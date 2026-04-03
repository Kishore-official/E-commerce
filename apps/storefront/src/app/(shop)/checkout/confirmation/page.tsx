'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button, useApiGet, Spinner } from '@ecommerce/ui-kit';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { data: order, isLoading } = useApiGet<Order>(orderId ? `/orders/${orderId}` : null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="mt-2 text-gray-600">
            {order
              ? `Order #${order.orderNumber || order.id.slice(0, 8)} has been placed successfully.`
              : 'Your order has been placed successfully.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/orders">
              <Button>View Orders</Button>
            </Link>
            <Link href="/search">
              <Button variant="secondary">Continue Shopping</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
