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
import { ProductStatus } from '@ecommerce/shared-types';

interface Variant {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  weightGrams: number | null;
  dimensionsCm: { length: number; width: number; height: number } | null;
  isActive: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface ProductAttribute {
  id: string;
  attributeName: string;
  attributeValue: string;
  variantId: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  status: ProductStatus;
  rejectionReason: string | null;
  vendorId: string;
  categoryId: string | null;
  brandId: string | null;
  countryOfOrigin: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
  variants?: Variant[];
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: product, isLoading, mutate } = useApiGet<Product>(`/admin/catalog/products/${id}`);

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

  if (!product) {
    return <div className="py-12 text-center text-gray-500">Product not found</div>;
  }

  const handleApprove = async () => {
    setSaving(true);
    try {
      await apiPatch(`/admin/catalog/products/${id}/approve`, {});
      addToast('success', 'Product approved');
      mutate();
    } catch {
      addToast('error', 'Failed to approve product');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await apiPatch(`/admin/catalog/products/${id}/reject`, {
        reason: rejectReason || undefined,
      });
      addToast('success', 'Product rejected');
      setShowRejectModal(false);
      setRejectReason('');
      mutate();
    } catch {
      addToast('error', 'Failed to reject product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={product.name}
        breadcrumbs={[
          { label: 'Products', href: '/products' },
          { label: product.name },
        ]}
        actions={
          product.status === ProductStatus.PENDING_REVIEW ? (
            <div className="flex gap-2">
              <Button onClick={handleApprove} loading={saving}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => setShowRejectModal(true)}>
                Reject
              </Button>
            </div>
          ) : undefined
        }
      />

      {product.status === ProductStatus.REJECTED && product.rejectionReason && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
            <p className="mt-1 text-sm text-red-700">{product.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={product.status} type="product" />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Vendor ID</span>
              <span className="text-sm">{product.vendorId}</span>
            </div>
            {product.category && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm">{product.category.name}</span>
              </div>
            )}
            {product.brand && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Brand</span>
                <span className="text-sm">{product.brand.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created</span>
              <span className="text-sm">{formatDate(product.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Updated</span>
              <span className="text-sm">{formatDate(product.updatedAt)}</span>
            </div>
            {product.description && (
              <div>
                <span className="text-sm text-gray-500">Description</span>
                <p className="mt-1 text-sm">{product.description}</p>
              </div>
            )}
            {product.shortDescription && (
              <div>
                <span className="text-sm text-gray-500">Short Description</span>
                <p className="mt-1 text-sm">{product.shortDescription}</p>
              </div>
            )}
            {product.countryOfOrigin && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Country of Origin</span>
                <span className="text-sm">{product.countryOfOrigin}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variants ({product.variants?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {product.variants && product.variants.length > 0 ? (
              <div className="space-y-2">
                {product.variants.map((v: Variant) => (
                  <div
                    key={v.id}
                    className="rounded border border-gray-100 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{v.name || v.sku}</p>
                        <p className="text-xs text-gray-500">SKU: {v.sku}</p>
                        {v.barcode && (
                          <p className="text-xs text-gray-500">Barcode: {v.barcode}</p>
                        )}
                        {v.weightGrams && (
                          <p className="text-xs text-gray-500">Weight: {v.weightGrams}g</p>
                        )}
                        {v.dimensionsCm && (
                          <p className="text-xs text-gray-500">
                            Dimensions: {v.dimensionsCm.length} × {v.dimensionsCm.width} ×{' '}
                            {v.dimensionsCm.height} cm
                          </p>
                        )}
                      </div>
                      <StatusBadge
                        status={v.isActive ? 'active' : 'inactive'}
                        type="product"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No variants</p>
            )}
          </CardContent>
        </Card>
      </div>

      {product.attributes && product.attributes.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Attributes ({product.attributes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {product.attributes.map((attr) => (
                <div
                  key={attr.id}
                  className="flex items-center justify-between rounded border border-gray-100 p-2"
                >
                  <div>
                    <span className="text-sm font-medium">{attr.attributeName}:</span>{' '}
                    <span className="text-sm text-gray-600">{attr.attributeValue}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {product.images && product.images.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Images ({product.images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {product.images
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((img) => (
                  <div key={img.id} className="relative">
                    <img
                      src={img.url}
                      alt={img.altText || product.name}
                      className="h-32 w-full rounded object-cover"
                    />
                    {img.isPrimary && (
                      <span className="absolute top-1 right-1 rounded bg-blue-500 px-2 py-1 text-xs text-white">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {/* Reject Modal */}
      <Modal
        open={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="Reject Product"
        size="sm"
      >
        <FormField label="Reason (optional)" htmlFor="rejectReason">
          <Textarea
            id="rejectReason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Provide a reason for rejection..."
            rows={3}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowRejectModal(false);
              setRejectReason('');
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReject} loading={saving}>
            Reject
          </Button>
        </div>
      </Modal>
    </div>
  );
}
