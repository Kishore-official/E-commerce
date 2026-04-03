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
  Input,
  FormField,
  Spinner,
  useApiGet,
  useToast,
  apiPatch,
  apiPost,
  formatDate,
} from '@ecommerce/ui-kit';
import type { OrderStatus, OrderItemStatus, Address } from '@ecommerce/shared-types';

interface OrderItem {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  status: OrderItemStatus;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  createdAt: string;
  shippingAddress: Address;
  items: OrderItem[];
}

export default function VendorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: order, isLoading, mutate } = useApiGet<VendorOrder>(`/vendor/orders/${id}`);

  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [shipping, setShipping] = useState(false);

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

  const pendingItems = order.items.filter((i) => i.status === 'pending');
  const confirmedItems = order.items.filter((i) => i.status === 'confirmed');

  const handleConfirm = async () => {
    try {
      await apiPatch(`/vendor/orders/${id}/confirm`, {});
      addToast('success', 'Order items confirmed');
      mutate();
    } catch {
      addToast('error', 'Failed to confirm order items');
    }
  };

  const handleCreateShipment = async () => {
    if (!trackingNumber.trim()) return;
    setShipping(true);
    try {
      await apiPost('/vendor/shipments', {
        orderId: id,
        items: confirmedItems.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
        trackingNumber,
        carrier: carrier || undefined,
      });
      addToast('success', 'Shipment created');
      router.push('/shipments');
    } catch {
      addToast('error', 'Failed to create shipment');
    } finally {
      setShipping(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        breadcrumbs={[
          { label: 'Orders', href: '/orders' },
          { label: order.orderNumber },
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
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Ship to</span>
              <span className="text-sm text-right">
                {order.shippingAddress.line1}, {order.shippingAddress.city},{' '}
                {order.shippingAddress.countryCode}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items ({order.items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-gray-500">
                      {item.variantName} · SKU: {item.sku}
                    </p>
                  </div>
                  <StatusBadge status={item.status} type="orderItem" />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Qty: {item.quantity}</span>
                  <PriceDisplay amount={item.totalPrice} size="sm" />
                </div>
              </div>
            ))}
            {pendingItems.length > 0 && order.status === 'pending_payment' && (
              <p className="text-center text-xs text-gray-400">
                Items can be confirmed after payment is processed
              </p>
            )}
            {pendingItems.length > 0 && order.status !== 'pending_payment' && (
              <Button className="w-full" onClick={handleConfirm}>
                Confirm {pendingItems.length} Item{pendingItems.length !== 1 ? 's' : ''}
              </Button>
            )}
          </CardContent>
        </Card>

        {confirmedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Create Shipment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Tracking Number" htmlFor="tracking" required>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </FormField>
              <FormField label="Carrier" htmlFor="carrier">
                <Input
                  id="carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g., SMSA, Aramex"
                />
              </FormField>
              <Button
                onClick={handleCreateShipment}
                loading={shipping}
                disabled={!trackingNumber.trim()}
              >
                Ship {confirmedItems.length} Item{confirmedItems.length !== 1 ? 's' : ''}
              </Button>
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
