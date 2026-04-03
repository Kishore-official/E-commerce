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
  PriceDisplay,
  Button,
  Spinner,
  useApiGet,
  useToast,
  formatDate,
  apiPost,
} from '@ecommerce/ui-kit';
import type { OrderStatus, OrderItemStatus } from '@ecommerce/shared-types';

interface OrderItem {
  id: string;
  status: OrderItemStatus;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName?: string;
  variantName?: string;
  sku?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  totalAmount?: number;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: Record<string, string>;
}

const CANCELLABLE_STATUSES: OrderStatus[] = ['pending_payment' as OrderStatus, 'confirmed' as OrderStatus];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: order, isLoading, mutate } = useApiGet<Order>(`/orders/${id}`);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiPost(`/orders/${id}/cancel`, {});
      await mutate();
      addToast('success', 'Order cancelled');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
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

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Order Number</span>
              <span className="text-sm font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={order.status} type="order" />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm">{formatDate(order.createdAt)}</span>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <PriceDisplay amount={order.subtotal} size="sm" />
              </div>
              {order.shippingTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <PriceDisplay amount={order.shippingTotal} size="sm" />
                </div>
              )}
              {order.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VAT</span>
                  <PriceDisplay amount={order.taxTotal} size="sm" />
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Total</span>
                <PriceDisplay amount={order.grandTotal ?? order.totalAmount ?? 0} />
              </div>
            </div>
          </CardContent>
        </Card>

        {order.shippingAddress && Object.keys(order.shippingAddress).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-1">
              {order.shippingAddress.name && <p className="font-medium">{order.shippingAddress.name}</p>}
              {order.shippingAddress.line1 && <p>{order.shippingAddress.line1}</p>}
              {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
              {(order.shippingAddress.city || order.shippingAddress.postalCode) && (
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.postalCode && `, ${order.shippingAddress.postalCode}`}
                </p>
              )}
              {order.shippingAddress.phone && <p>{order.shippingAddress.phone}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.items?.map((item: OrderItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.productName || 'Product'}</p>
                    {item.variantName && item.variantName !== 'Default' && (
                      <p className="text-xs text-gray-500">{item.variantName}</p>
                    )}
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    <StatusBadge status={item.status} type="orderItem" />
                  </div>
                  <PriceDisplay amount={item.totalPrice} size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        {CANCELLABLE_STATUSES.includes(order.status) && (
          <Button
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleCancel}
            loading={cancelling}
            disabled={cancelling}
          >
            Cancel Order
          </Button>
        )}
      </div>
    </div>
  );
}
