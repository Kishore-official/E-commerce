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

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function CategoriesPage() {
  const { data, mutate, isLoading } = useApiGet<Category[]>('/catalog/categories');
  const { addToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);

  const categories = Array.isArray(data) ? data : [];

  const columns: Column<Category>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'isActive',
      header: 'Status',
      render: (c) => (
        <span className={c.isActive ? 'text-green-600' : 'text-gray-400'}>
          {c.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'sortOrder', header: 'Order' },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditId(c.id);
            setForm({ name: c.name, slug: c.slug, description: c.description || '' });
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
        await apiPatch(`/admin/catalog/categories/${editId}`, form);
        addToast('success', 'Category updated');
      } else {
        await apiPost('/admin/catalog/categories', form);
        addToast('success', 'Category created');
      }
      mutate();
      setShowModal(false);
      setEditId(null);
      setForm({ name: '', slug: '', description: '' });
    } catch {
      addToast('error', `Failed to ${editId ? 'update' : 'create'} category`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Categories</h1>
          <p className={s.pageDesc}>Manage product categories</p>
        </div>
        <Button
          onClick={() => {
            setEditId(null);
            setForm({ name: '', slug: '', description: '' });
            setShowModal(true);
          }}
        >
          Add Category
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        emptyTitle="No categories yet"
        emptyDescription="Create your first category to get started"
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Category' : 'New Category'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" htmlFor="cat-name" required>
            <Input
              id="cat-name"
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
          <FormField label="Slug" htmlFor="cat-slug" required>
            <Input
              id="cat-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Description" htmlFor="cat-desc">
            <Textarea
              id="cat-desc"
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
