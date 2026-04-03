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
  Textarea,
  FormField,
  Select,
  useToast,
  useApiGet,
  apiPost,
} from '@ecommerce/ui-kit';

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

interface Brand {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    categoryId: '',
    brandId: '',
    countryOfOrigin: '',
    metaTitle: '',
    metaDescription: '',
  });

  const { data: categories } = useApiGet<Category[]>('/catalog/categories');
  const { data: brands } = useApiGet<Brand[]>('/catalog/brands');

  // Flatten category tree for dropdown
  const flattenCategories = (cats: Category[] | undefined, level = 0): { id: string; name: string }[] => {
    if (!cats) return [];
    const result: { id: string; name: string }[] = [];
    cats.forEach((cat) => {
      result.push({ id: cat.id, name: '  '.repeat(level) + cat.name });
      if (cat.children) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  const categoryOptions = [
    { label: 'Select a category', value: '' },
    ...flattenCategories(categories).map((c) => ({ label: c.name, value: c.id })),
  ];

  const brandOptions = [
    { label: 'Select a brand', value: '' },
    ...(brands || []).map((b) => ({ label: b.name, value: b.id })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
      };
      if (form.description) payload.description = form.description;
      if (form.shortDescription) payload.shortDescription = form.shortDescription;
      if (form.categoryId) payload.categoryId = form.categoryId;
      if (form.brandId) payload.brandId = form.brandId;
      if (form.countryOfOrigin) payload.countryOfOrigin = form.countryOfOrigin;
      if (form.metaTitle) payload.metaTitle = form.metaTitle;
      if (form.metaDescription) payload.metaDescription = form.metaDescription;

      const product = await apiPost<{ id: string }>('/vendor/products', payload);
      addToast('success', 'Product created. Add variants and submit for review.');
      router.push(`/products/${product.id}`);
    } catch {
      addToast('error', 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Product"
        breadcrumbs={[
          { label: 'Products', href: '/products' },
          { label: 'New' },
        ]}
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Product Name" htmlFor="name" required>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category" htmlFor="categoryId">
                <Select
                  id="categoryId"
                  options={categoryOptions}
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                />
              </FormField>
              <FormField label="Brand" htmlFor="brandId">
                <Select
                  id="brandId"
                  options={brandOptions}
                  value={form.brandId}
                  onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </FormField>
            <FormField label="Short Description" htmlFor="shortDescription">
              <Textarea
                id="shortDescription"
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                rows={2}
              />
            </FormField>
            <FormField label="Country of Origin" htmlFor="countryOfOrigin" description="ISO 2-letter code (e.g., SA, US)">
              <Input
                id="countryOfOrigin"
                value={form.countryOfOrigin}
                onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value.toUpperCase() })}
                maxLength={2}
                placeholder="SA"
              />
            </FormField>
            <FormField label="Meta Title (SEO)" htmlFor="metaTitle">
              <Input
                id="metaTitle"
                value={form.metaTitle}
                onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
              />
            </FormField>
            <FormField label="Meta Description (SEO)" htmlFor="metaDescription">
              <Textarea
                id="metaDescription"
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                rows={2}
              />
            </FormField>
            <div className="flex gap-3">
              <Button type="submit" loading={saving}>
                Create Product
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
