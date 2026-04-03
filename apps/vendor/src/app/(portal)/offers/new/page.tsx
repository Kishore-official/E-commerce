'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  FormField,
  useToast,
  useApiGet,
  useApiList,
  apiPost,
  Spinner,
} from '@ecommerce/ui-kit';
import { ProductStatus } from '@ecommerce/shared-types';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  variants?: Variant[];
}

interface Variant {
  id: string;
  sku: string;
  name: string;
  isActive: boolean;
}

export default function NewOfferPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    variantId: '',
    offerType: 'marketplace',
    priceAmount: '',
    compareAtPrice: '',
    costPrice: '',
    stockQuantity: '',
    affiliateUrl: '',
    affiliateCommissionPct: '',
    countryCode: 'SA',
    isFeatured: false,
  });

  // Fetch approved products only
  const { data: productsData, isLoading: productsLoading } = useApiList<Product>(
    `/vendor/products?status=${ProductStatus.APPROVED}&limit=100`,
  );
  const products = productsData?.data || [];

  // Fetch variants for selected product
  const { data: product, isLoading: productLoading } = useApiGet<Product>(
    form.productId ? `/vendor/products/${form.productId}` : null,
  );
  const variants = product?.variants?.filter((v) => v.isActive) || [];

  // Reset variant when product changes
  useEffect(() => {
    if (form.productId && form.variantId) {
      const variantExists = variants.some((v) => v.id === form.variantId);
      if (!variantExists) {
        setForm((f) => ({ ...f, variantId: '' }));
      }
    }
  }, [form.productId, form.variantId, variants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        productId: form.productId,
        variantId: form.variantId,
        offerType: form.offerType,
        priceAmount: Math.round(parseFloat(form.priceAmount) * 100), // Convert to minor currency units (paise/halalah)
        countryCode: form.countryCode,
        isFeatured: form.isFeatured,
      };

      if (form.compareAtPrice) {
        payload.compareAtPrice = Math.round(parseFloat(form.compareAtPrice) * 100);
      }
      if (form.costPrice) {
        payload.costPrice = Math.round(parseFloat(form.costPrice) * 100);
      }

      if (form.offerType === 'marketplace') {
        payload.stockQuantity = parseInt(form.stockQuantity, 10) || 0;
      } else if (form.offerType === 'affiliate') {
        if (form.affiliateUrl) {
          payload.affiliateUrl = form.affiliateUrl;
        }
        if (form.affiliateCommissionPct) {
          payload.affiliateCommissionPct = parseFloat(form.affiliateCommissionPct);
        }
      }

      const offer = await apiPost<{ id: string }>('/vendor/offers', payload);

      // Auto-submit for review so it appears in admin pending queue
      try {
        await apiPost(`/vendor/offers/${offer.id}/submit`, {});
        addToast('success', 'Offer created and submitted for review');
      } catch {
        addToast('success', 'Offer created as draft — submit it for review from the offer detail page');
      }

      router.push('/offers');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to create offer');
    } finally {
      setSaving(false);
    }
  };

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New Offer"
        breadcrumbs={[
          { label: 'Offers', href: '/offers' },
          { label: 'New' },
        ]}
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Offer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Product" htmlFor="productId" required>
              <Select
                id="productId"
                options={[
                  { label: 'Select a product', value: '' },
                  ...products.map((p) => ({ label: p.name, value: p.id })),
                ]}
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value, variantId: '' })}
                required
              />
            </FormField>

            <FormField
              label="Variant"
              htmlFor="variantId"
              required
              description={productLoading ? 'Loading variants...' : undefined}
            >
              <Select
                id="variantId"
                options={[
                  { label: 'Select a variant', value: '' },
                  ...variants.map((v) => ({
                    label: `${v.name} (${v.sku})`,
                    value: v.id,
                  })),
                ]}
                value={form.variantId}
                onChange={(e) => setForm({ ...form, variantId: e.target.value })}
                required
                disabled={!form.productId || productLoading || variants.length === 0}
              />
            </FormField>

            <FormField label="Offer Type" htmlFor="offerType" required>
              <Select
                id="offerType"
                options={[
                  { label: 'Marketplace', value: 'marketplace' },
                  { label: 'Affiliate', value: 'affiliate' },
                ]}
                value={form.offerType}
                onChange={(e) => setForm({ ...form, offerType: e.target.value })}
                required
              />
            </FormField>

            <FormField
              label="Price"
              htmlFor="priceAmount"
              required
              description="Enter the selling price (e.g., 149.99)"
            >
              <Input
                id="priceAmount"
                type="number"
                step="0.01"
                min="0"
                value={form.priceAmount}
                onChange={(e) => setForm({ ...form, priceAmount: e.target.value })}
                required
              />
            </FormField>

            <FormField
              label="Compare At Price"
              htmlFor="compareAtPrice"
              description="Original price for showing discounts (optional)"
            >
              <Input
                id="compareAtPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.compareAtPrice}
                onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
              />
            </FormField>

            <FormField
              label="Cost Price"
              htmlFor="costPrice"
              description="Your cost price (optional, not shown to customers)"
            >
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </FormField>

            {form.offerType === 'marketplace' && (
              <FormField label="Stock Quantity" htmlFor="stockQuantity" required>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  required
                />
              </FormField>
            )}

            {form.offerType === 'affiliate' && (
              <>
                <FormField
                  label="Affiliate URL"
                  htmlFor="affiliateUrl"
                  required
                  description="URL to redirect customers to"
                >
                  <Input
                    id="affiliateUrl"
                    type="url"
                    value={form.affiliateUrl}
                    onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
                    required
                  />
                </FormField>
                <FormField
                  label="Commission Percentage"
                  htmlFor="affiliateCommissionPct"
                  description="Commission rate (optional)"
                >
                  <Input
                    id="affiliateCommissionPct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.affiliateCommissionPct}
                    onChange={(e) => setForm({ ...form, affiliateCommissionPct: e.target.value })}
                  />
                </FormField>
              </>
            )}

            <FormField label="Country" htmlFor="countryCode" required>
              <Select
                id="countryCode"
                options={[
                  { label: 'Saudi Arabia', value: 'SA' },
                  { label: 'United Arab Emirates', value: 'AE' },
                  { label: 'India', value: 'IN' },
                  { label: 'United States', value: 'US' },
                  { label: 'United Kingdom', value: 'GB' },
                  { label: 'Germany', value: 'DE' },
                  { label: 'France', value: 'FR' },
                  { label: 'Turkey', value: 'TR' },
                  { label: 'Egypt', value: 'EG' },
                  { label: 'Pakistan', value: 'PK' },
                  { label: 'Kuwait', value: 'KW' },
                  { label: 'Qatar', value: 'QA' },
                  { label: 'Bahrain', value: 'BH' },
                  { label: 'Oman', value: 'OM' },
                  { label: 'Jordan', value: 'JO' },
                ]}
                value={form.countryCode}
                onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                required
              />
            </FormField>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isFeatured" className="text-sm text-gray-700">
                Feature this offer
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" loading={saving}>
                Create Offer
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
