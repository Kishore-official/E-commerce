'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  PriceDisplay,
  Button,
  Spinner,
  useApiGet,
  formatDate,
} from '@ecommerce/ui-kit';
import type { OrderStatus, OrderItemStatus } from '@ecommerce/shared-types';

interface OrderItem {
  id: string;
  status: OrderItemStatus;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  offerId: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  shippingAddress: Record<string, string>;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useApiGet<Order>(`/admin/orders/${id}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return <div className="py-12 text-center text-gray-500">Order not found</div>;
  }

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber || order.id.slice(0, 8)}`}
        breadcrumbs={[
          { label: 'Orders', href: '/orders' },
          { label: order.orderNumber || order.id.slice(0, 8) },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={order.status} type="order" />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <PriceDisplay amount={order.grandTotal} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm">{formatDate(order.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items ({order.items?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.items?.map((item: OrderItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded border border-gray-100 p-2"
                >
                  <div>
                    <p className="text-sm">Qty: {item.quantity}</p>
                    <StatusBadge status={item.status} type="orderItem" />
                  </div>
                  <PriceDisplay amount={item.totalPrice} size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}
