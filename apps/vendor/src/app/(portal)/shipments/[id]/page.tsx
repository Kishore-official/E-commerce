'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  Button,
  Input,
  FormField,
  Spinner,
  useApiGet,
  useToast,
  apiPatch,
  formatDate,
} from '@ecommerce/ui-kit';
import { ShipmentStatus } from '@ecommerce/shared-types';
import { useState } from 'react';

interface Shipment {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: ShipmentStatus;
  orderId: string;
  createdAt: string;
}

export default function VendorShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: shipment, isLoading, mutate } = useApiGet<Shipment>(`/vendor/shipments/${id}`);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipping, setShipping] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!shipment) {
    return <div className="py-12 text-center text-gray-500">Shipment not found</div>;
  }

  const handleMarkShipped = async () => {
    setShipping(true);
    try {
      await apiPatch(`/vendor/shipments/${id}/ship`, {
        trackingNumber: trackingNumber || shipment.trackingNumber,
      });
      addToast('success', 'Shipment marked as shipped');
      mutate();
    } catch {
      addToast('error', 'Failed to mark as shipped');
    } finally {
      setShipping(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Shipment ${shipment.trackingNumber}`}
        breadcrumbs={[
          { label: 'Shipments', href: '/shipments' },
          { label: shipment.trackingNumber },
        ]}
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Shipment Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <StatusBadge status={shipment.status} type="shipment" />
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Tracking #</span>
            <span className="text-sm">{shipment.trackingNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Carrier</span>
            <span className="text-sm">{shipment.carrier || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Created</span>
            <span className="text-sm">{formatDate(shipment.createdAt)}</span>
          </div>

          {[ShipmentStatus.PENDING, ShipmentStatus.PICKING, ShipmentStatus.PACKED].includes(shipment.status) && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <FormField label="Update Tracking Number">
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={shipment.trackingNumber}
                />
              </FormField>
              <Button onClick={handleMarkShipped} loading={shipping}>
                Mark as Shipped
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}
