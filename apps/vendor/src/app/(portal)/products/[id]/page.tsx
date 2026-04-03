'use client';

import { useState, useEffect } from 'react';
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
  apiPost,
  apiPatch,
  apiDelete,
  apiUploadFile,
  formatDate,
  ImageUpload,
  FormField,
  Input,
  Textarea,
  Modal,
  Select,
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
  sortOrder: number;
}

interface ProductImage {
  id: string;
  url: string;
  altText?: string;
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
  categoryId: string | null;
  brandId: string | null;
  countryOfOrigin: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
  variants: Variant[];
  images?: ProductImage[];
  attributes?: ProductAttribute[];
}

export default function VendorProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: product, isLoading, mutate } = useApiGet<Product>(id ? `/vendor/products/${id}` : null);

  const [editingProduct, setEditingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    description: '',
    shortDescription: '',
    metaTitle: '',
    metaDescription: '',
  });

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantForm, setVariantForm] = useState({
    sku: '',
    name: '',
    barcode: '',
    weightGrams: '',
    length: '',
    width: '',
    height: '',
    isActive: true,
  });

  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);
  const [attributeForm, setAttributeForm] = useState({
    attributeName: '',
    attributeValue: '',
  });

  const [saving, setSaving] = useState(false);

  // Initialize forms when product loads
  useEffect(() => {
    if (product && productForm.description === '') {
      setProductForm({
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
      });
    }
  }, [product]);

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

  const canEdit = product.status === ProductStatus.DRAFT || product.status === ProductStatus.REJECTED;
  const canEditMinor = product.status === ProductStatus.APPROVED;
  const canAddVariants = canEdit;

  const handleSubmitForReview = async () => {
    try {
      await apiPost(`/vendor/products/${id}/submit`, {});
      addToast('success', 'Product submitted for review');
      mutate();
    } catch {
      addToast('error', 'Failed to submit for review');
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this product?')) return;
    try {
      await apiPatch(`/vendor/products/${id}/archive`, {});
      addToast('success', 'Product archived');
      mutate();
    } catch {
      addToast('error', 'Failed to archive product');
    }
  };

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      await apiPatch(`/vendor/products/${id}`, productForm);
      addToast('success', 'Product updated');
      setEditingProduct(false);
      mutate();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenVariantModal = (variant?: Variant) => {
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({
        sku: variant.sku,
        name: variant.name,
        barcode: variant.barcode || '',
        weightGrams: variant.weightGrams?.toString() || '',
        length: variant.dimensionsCm?.length?.toString() || '',
        width: variant.dimensionsCm?.width?.toString() || '',
        height: variant.dimensionsCm?.height?.toString() || '',
        isActive: variant.isActive,
      });
    } else {
      setEditingVariant(null);
      setVariantForm({
        sku: '',
        name: '',
        barcode: '',
        weightGrams: '',
        length: '',
        width: '',
        height: '',
        isActive: true,
      });
    }
    setShowVariantModal(true);
  };

  const handleSaveVariant = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: variantForm.name,
        barcode: variantForm.barcode || undefined,
        weightGrams: variantForm.weightGrams ? parseInt(variantForm.weightGrams) : undefined,
        isActive: variantForm.isActive,
      };
      if (variantForm.length && variantForm.width && variantForm.height) {
        payload.dimensionsCm = {
          length: parseFloat(variantForm.length),
          width: parseFloat(variantForm.width),
          height: parseFloat(variantForm.height),
        };
      }

      if (editingVariant) {
        await apiPatch(`/vendor/variants/${editingVariant.id}`, payload);
        addToast('success', 'Variant updated');
      } else {
        payload.sku = variantForm.sku;
        await apiPost(`/vendor/products/${id}/variants`, payload);
        addToast('success', 'Variant created');
      }
      setShowVariantModal(false);
      mutate();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to save variant');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    try {
      await apiDelete(`/vendor/variants/${variantId}`);
      addToast('success', 'Variant deleted');
      mutate();
    } catch {
      addToast('error', 'Failed to delete variant');
    }
  };

  const handleToggleVariantActive = async (variant: Variant) => {
    try {
      await apiPatch(`/vendor/variants/${variant.id}`, { isActive: !variant.isActive });
      addToast('success', `Variant ${!variant.isActive ? 'activated' : 'deactivated'}`);
      mutate();
    } catch {
      addToast('error', 'Failed to update variant');
    }
  };

  const handleOpenAttributeModal = (attr?: ProductAttribute) => {
    if (attr) {
      setEditingAttribute(attr);
      setAttributeForm({
        attributeName: attr.attributeName,
        attributeValue: attr.attributeValue,
      });
    } else {
      setEditingAttribute(null);
      setAttributeForm({ attributeName: '', attributeValue: '' });
    }
    setShowAttributeModal(true);
  };

  const handleSaveAttribute = async () => {
    setSaving(true);
    try {
      if (editingAttribute) {
        await apiPatch(`/vendor/attributes/${editingAttribute.id}`, attributeForm);
        addToast('success', 'Attribute updated');
      } else {
        await apiPost(`/vendor/products/${id}/attributes`, attributeForm);
        addToast('success', 'Attribute added');
      }
      setShowAttributeModal(false);
      mutate();
    } catch {
      addToast('error', 'Failed to save attribute');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttribute = async (attrId: string) => {
    if (!confirm('Are you sure you want to delete this attribute?')) return;
    try {
      await apiDelete(`/vendor/attributes/${attrId}`);
      addToast('success', 'Attribute deleted');
      mutate();
    } catch {
      addToast('error', 'Failed to delete attribute');
    }
  };

  const handleImageUpload = async (file: File) => {
    const image = await apiUploadFile<ProductImage>(
      `/vendor/products/${id}/images`,
      file,
      {
        isPrimary: product.images?.length === 0 ? 'true' : 'false',
      },
    );
    mutate();
    return { url: image.url, id: image.id };
  };

  const handleImageDelete = async (imageId: string) => {
    await apiDelete(`/vendor/products/${id}/images/${imageId}`);
    mutate();
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
          <div className="flex gap-2">
            {product.status === ProductStatus.DRAFT && (
              <Button onClick={handleSubmitForReview}>Submit for Review</Button>
            )}
            {product.status === ProductStatus.APPROVED && (
              <Button variant="secondary" onClick={handleArchive}>
                Archive
              </Button>
            )}
            {product.status === ProductStatus.REJECTED && (
              <Button onClick={handleSubmitForReview}>Edit and Resubmit</Button>
            )}
          </div>
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
            <div className="flex items-center justify-between">
              <CardTitle>Product Details</CardTitle>
              {(canEdit || canEditMinor) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (editingProduct) {
                      setProductForm({
                        description: product.description || '',
                        shortDescription: product.shortDescription || '',
                        metaTitle: product.metaTitle || '',
                        metaDescription: product.metaDescription || '',
                      });
                    }
                    setEditingProduct(!editingProduct);
                  }}
                >
                  {editingProduct ? 'Cancel' : 'Edit'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={product.status} type="product" />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created</span>
              <span className="text-sm text-gray-200">{formatDate(product.createdAt)}</span>
            </div>
            {editingProduct ? (
              <>
                <FormField label="Description" htmlFor="description">
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={4}
                  />
                </FormField>
                <FormField label="Short Description" htmlFor="shortDescription">
                  <Textarea
                    id="shortDescription"
                    value={productForm.shortDescription}
                    onChange={(e) =>
                      setProductForm({ ...productForm, shortDescription: e.target.value })
                    }
                    rows={2}
                  />
                </FormField>
                <FormField label="Meta Title (SEO)" htmlFor="metaTitle">
                  <Input
                    id="metaTitle"
                    value={productForm.metaTitle}
                    onChange={(e) => setProductForm({ ...productForm, metaTitle: e.target.value })}
                  />
                </FormField>
                <FormField label="Meta Description (SEO)" htmlFor="metaDescription">
                  <Textarea
                    id="metaDescription"
                    value={productForm.metaDescription}
                    onChange={(e) =>
                      setProductForm({ ...productForm, metaDescription: e.target.value })
                    }
                    rows={2}
                  />
                </FormField>
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setEditingProduct(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProduct} loading={saving}>
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                {product.description && (
                  <div>
                    <span className="text-sm text-gray-500">Description</span>
                    <p className="mt-1 text-sm text-gray-200">{product.description}</p>
                  </div>
                )}
                {product.shortDescription && (
                  <div>
                    <span className="text-sm text-gray-500">Short Description</span>
                    <p className="mt-1 text-sm text-gray-200">{product.shortDescription}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Variants ({product.variants?.length ?? 0})</CardTitle>
              {canAddVariants && (
                <Button variant="ghost" size="sm" onClick={() => handleOpenVariantModal()}>
                  Add Variant
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {product.variants?.map((v: Variant) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded border border-gray-100 p-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{v.name || v.sku}</p>
                    <p className="text-xs text-gray-500">SKU: {v.sku}</p>
                    {v.barcode && <p className="text-xs text-gray-500">Barcode: {v.barcode}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {canEditMinor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleVariantActive(v)}
                      >
                        {v.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
                    {canEditMinor && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenVariantModal(v)}>
                        Edit
                      </Button>
                    )}
                    {canAddVariants && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVariant(v.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(!product.variants || product.variants.length === 0) && (
                <p className="text-sm text-gray-500">No variants yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attributes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => handleOpenAttributeModal()}>
              Add Attribute
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {product.attributes?.map((attr) => (
              <div
                key={attr.id}
                className="flex items-center justify-between rounded border border-gray-100 p-2"
              >
                <div>
                  <span className="text-sm font-medium text-gray-200">{attr.attributeName}:</span>{' '}
                  <span className="text-sm text-gray-400">{attr.attributeValue}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenAttributeModal(attr)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttribute(attr.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {(!product.attributes || product.attributes.length === 0) && (
              <p className="text-sm text-gray-500">No attributes yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            existingImages={product.images || []}
          />
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {/* Variant Modal */}
      <Modal
        open={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        title={editingVariant ? 'Edit Variant' : 'Add Variant'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveVariant();
          }}
          className="space-y-4"
        >
          {!editingVariant && (
            <FormField label="SKU" htmlFor="sku" required>
              <Input
                id="sku"
                value={variantForm.sku}
                onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                required
              />
            </FormField>
          )}
          <FormField label="Variant Name" htmlFor="variantName" required>
            <Input
              id="variantName"
              value={variantForm.name}
              onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Barcode" htmlFor="barcode">
            <Input
              id="barcode"
              value={variantForm.barcode}
              onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })}
            />
          </FormField>
          <FormField label="Weight (grams)" htmlFor="weightGrams">
            <Input
              id="weightGrams"
              type="number"
              value={variantForm.weightGrams}
              onChange={(e) => setVariantForm({ ...variantForm, weightGrams: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Length (cm)" htmlFor="length">
              <Input
                id="length"
                type="number"
                step="0.1"
                value={variantForm.length}
                onChange={(e) => setVariantForm({ ...variantForm, length: e.target.value })}
              />
            </FormField>
            <FormField label="Width (cm)" htmlFor="width">
              <Input
                id="width"
                type="number"
                step="0.1"
                value={variantForm.width}
                onChange={(e) => setVariantForm({ ...variantForm, width: e.target.value })}
              />
            </FormField>
            <FormField label="Height (cm)" htmlFor="height">
              <Input
                id="height"
                type="number"
                step="0.1"
                value={variantForm.height}
                onChange={(e) => setVariantForm({ ...variantForm, height: e.target.value })}
              />
            </FormField>
          </div>
          {canEditMinor && (
            <FormField label="Active" htmlFor="isActive">
              <Select
                id="isActive"
                options={[
                  { label: 'Active', value: 'true' },
                  { label: 'Inactive', value: 'false' },
                ]}
                value={variantForm.isActive.toString()}
                onChange={(e) => setVariantForm({ ...variantForm, isActive: e.target.value === 'true' })}
              />
            </FormField>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowVariantModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingVariant ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attribute Modal */}
      <Modal
        open={showAttributeModal}
        onClose={() => setShowAttributeModal(false)}
        title={editingAttribute ? 'Edit Attribute' : 'Add Attribute'}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveAttribute();
          }}
          className="space-y-4"
        >
          <FormField label="Attribute Name" htmlFor="attrName" required>
            <Input
              id="attrName"
              value={attributeForm.attributeName}
              onChange={(e) =>
                setAttributeForm({ ...attributeForm, attributeName: e.target.value })
              }
              required
            />
          </FormField>
          <FormField label="Attribute Value" htmlFor="attrValue" required>
            <Input
              id="attrValue"
              value={attributeForm.attributeValue}
              onChange={(e) =>
                setAttributeForm({ ...attributeForm, attributeValue: e.target.value })
              }
              required
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowAttributeModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingAttribute ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
