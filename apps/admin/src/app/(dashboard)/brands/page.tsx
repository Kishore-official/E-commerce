'use client';

import { useState } from 'react';
import {
  DataTable,
  Button,
  Modal,
  FormField,
  Input,
  Textarea,
  useApiGet,
  useToast,
  apiPost,
  apiPatch,
  type Column,
} from '@ecommerce/ui-kit';
import s from '../../admin.module.css';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  isActive: boolean;
}

export default function BrandsPage() {
  const { data, mutate, isLoading } = useApiGet<Brand[]>('/catalog/brands');
  const { addToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);

  const brands = Array.isArray(data) ? data : [];

  const columns: Column<Brand>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'isActive',
      header: 'Status',
      render: (b) => (
        <span className={b.isActive ? 'text-green-600' : 'text-gray-400'}>
          {b.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditId(b.id);
            setForm({ name: b.name, slug: b.slug, description: b.description || '' });
            setShowModal(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await apiPatch(`/admin/catalog/brands/${editId}`, form);
        addToast('success', 'Brand updated');
      } else {
        await apiPost('/admin/catalog/brands', form);
        addToast('success', 'Brand created');
      }
      mutate();
      setShowModal(false);
      setEditId(null);
      setForm({ name: '', slug: '', description: '' });
    } catch {
      addToast('error', `Failed to ${editId ? 'update' : 'create'} brand`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Brands</h1>
          <p className={s.pageDesc}>Manage product brands</p>
        </div>
        <Button
          onClick={() => {
            setEditId(null);
            setForm({ name: '', slug: '', description: '' });
            setShowModal(true);
          }}
        >
          Add Brand
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={brands}
        isLoading={isLoading}
        emptyTitle="No brands yet"
        emptyDescription="Create your first brand to get started"
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Brand' : 'New Brand'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" htmlFor="brand-name" required>
            <Input
              id="brand-name"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: editId ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, '-'),
                })
              }
              required
            />
          </FormField>
          <FormField label="Slug" htmlFor="brand-slug" required>
            <Input
              id="brand-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Description" htmlFor="brand-desc">
            <Textarea
              id="brand-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
