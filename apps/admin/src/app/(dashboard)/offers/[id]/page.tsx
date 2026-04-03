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
  apiPatch,
  formatDate,
  Modal,
  FormField,
  Textarea,
} from '@ecommerce/ui-kit';
import { OfferStatus } from '@ecommerce/shared-types';

interface Offer {
  id: string;
  status: OfferStatus;
  productName: string | null;
  variantName: string | null;
  priceAmount: number;
  priceCurrency: string;
  compareAtPrice: number | null;
  costPrice: number | null;
  stockQuantity: number;
  stockReserved: number;
  countryCode: string;
  offerType: string;
  variantId: string;
  productId: string;
  vendorId: string;
  affiliateUrl: string | null;
  affiliateCommissionPct: number | null;
  isFeatured: boolean;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: offer, isLoading, mutate } = useApiGet<Offer>(`/admin/offers/${id}`);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!offer) {
    return <div className="py-12 text-center text-gray-500">Offer not found</div>;
  }

  const handleApprove = async () => {
    setSaving(true);
    try {
      await apiPatch(`/admin/offers/${id}/approve`, {});
      addToast('success', 'Offer approved');
      mutate();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to approve offer');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await apiPatch(`/admin/offers/${id}/reject`, { reason: rejectReason });
      addToast('success', 'Offer rejected');
      setShowRejectModal(false);
      setRejectReason('');
      mutate();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to reject offer');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this offer?')) return;
    setSaving(true);
    try {
      await apiPatch(`/admin/offers/${id}/archive`, {});
      addToast('success', 'Offer archived');
      mutate();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to archive offer');
    } finally {
      setSaving(false);
    }
  };

  const availableStock = offer.stockQuantity - offer.stockReserved;

  return (
    <div>
      <PageHeader
        title={offer.productName ?? `Offer ${offer.id.slice(0, 8)}`}
        description={offer.variantName ?? undefined}
        breadcrumbs={[
          { label: 'Offers', href: '/offers' },
          { label: offer.productName ?? offer.id.slice(0, 8) },
        ]}
        actions={
          <div className="flex gap-2">
            {offer.status === OfferStatus.PENDING_REVIEW && (
              <>
                <Button onClick={handleApprove} loading={saving}>
                  Approve
                </Button>
                <Button variant="secondary" onClick={() => setShowRejectModal(true)}>
                  Reject
                </Button>
              </>
            )}
            {offer.status !== OfferStatus.ARCHIVED && (
              <Button variant="secondary" onClick={handleArchive} loading={saving}>
                Archive
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Offer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={offer.status} type="offer" />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Vendor ID</span>
              <span className="text-sm">{offer.vendorId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Product</span>
              <span className="text-sm font-medium">{offer.productName ?? offer.productId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Variant</span>
              <span className="text-sm">{offer.variantName ?? offer.variantId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Price</span>
              <PriceDisplay amount={offer.priceAmount} currency={offer.priceCurrency} />
            </div>
            {offer.compareAtPrice && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Compare At Price</span>
                <PriceDisplay amount={offer.compareAtPrice} currency={offer.priceCurrency} />
              </div>
            )}
            {offer.costPrice && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cost Price</span>
                <PriceDisplay amount={offer.costPrice} currency={offer.priceCurrency} />
              </div>
            )}
            {offer.offerType === 'marketplace' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Stock Quantity</span>
                  <span className="text-sm">{offer.stockQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Stock Reserved</span>
                  <span className="text-sm">{offer.stockReserved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Available Stock</span>
                  <span className="text-sm font-medium">{availableStock}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Country</span>
              <span className="text-sm">{offer.countryCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm capitalize">{offer.offerType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Featured</span>
              <span className="text-sm">{offer.isFeatured ? 'Yes' : 'No'}</span>
            </div>
            {offer.affiliateUrl && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Affiliate URL</span>
                <a
                  href={offer.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </a>
              </div>
            )}
            {offer.affiliateCommissionPct && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Commission</span>
                <span className="text-sm">{offer.affiliateCommissionPct}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created</span>
              <span className="text-sm">{formatDate(offer.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Updated</span>
              <span className="text-sm">{formatDate(offer.updatedAt)}</span>
            </div>
            {offer.rejectionReason && (
              <div className="mt-4 rounded-md bg-red-50 p-3">
                <div className="text-sm font-medium text-red-800">Rejection Reason</div>
                <div className="mt-1 text-sm text-red-700">{offer.rejectionReason}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Modal
        open={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="Reject Offer"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleReject();
          }}
          className="space-y-4"
        >
          <FormField
            label="Rejection Reason"
            htmlFor="rejectReason"
            description="Required: Provide a reason for rejection."
          >
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g., Pricing is too high, product images are unclear..."
              required
            />
          </FormField>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" loading={saving} disabled={!rejectReason.trim()}>
              Reject Offer
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

