'use client';

import { useState, useEffect } from 'react';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useAuth,
  FormField,
  Input,
  Textarea,
  Button,
  useApiGet,
  useToast,
  apiPatch,
} from '@ecommerce/ui-kit';

interface VendorProfile {
  id: string;
  businessName: string;
  businessEmail: string;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  status: string;
}

export default function VendorSettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { data: vendor, mutate } = useApiGet<VendorProfile>('/vendors/me');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    businessEmail: '',
    phone: '',
    description: '',
    logoUrl: '',
  });

  // Update form when vendor data loads
  useEffect(() => {
    if (vendor && !editing) {
      setForm({
        businessName: vendor.businessName || '',
        businessEmail: vendor.businessEmail || '',
        phone: vendor.phone || '',
        description: vendor.description || '',
        logoUrl: vendor.logoUrl || '',
      });
    }
  }, [vendor, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch('/vendors/me', {
        businessName: form.businessName,
        businessEmail: form.businessEmail,
        phone: form.phone || undefined,
        description: form.description || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      addToast('success', 'Profile updated successfully');
      setEditing(false);
      mutate();
    } catch {
      addToast('error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      businessName: vendor?.businessName || '',
      businessEmail: vendor?.businessEmail || '',
      phone: vendor?.phone || '',
      description: vendor?.description || '',
      logoUrl: vendor?.logoUrl || '',
    });
    setEditing(false);
  };

  return (
    <div>
      <PageHeader title="Settings" description="Vendor account settings" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm text-gray-200">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm text-gray-200">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-sm text-gray-200 capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Vendor ID</span>
              <span className="text-sm text-gray-200">{user?.vendorId || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Business Profile</CardTitle>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <FormField label="Business Name" htmlFor="businessName" required>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Business Email" htmlFor="businessEmail" required>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={form.businessEmail}
                    onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Phone" htmlFor="phone">
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </FormField>
                <FormField label="Description" htmlFor="description">
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                  />
                </FormField>
                <FormField label="Logo URL" htmlFor="logoUrl">
                  <Input
                    id="logoUrl"
                    type="url"
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.jpg"
                  />
                </FormField>
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} loading={saving}>
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-sm text-gray-500">Business Name</span>
                  <p className="text-sm font-medium">{vendor?.businessName || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Business Email</span>
                  <p className="text-sm font-medium">{vendor?.businessEmail || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone</span>
                  <p className="text-sm font-medium">{vendor?.phone || '-'}</p>
                </div>
                {vendor?.description && (
                  <div>
                    <span className="text-sm text-gray-500">Description</span>
                    <p className="text-sm">{vendor.description}</p>
                  </div>
                )}
                {vendor?.logoUrl && (
                  <div>
                    <span className="text-sm text-gray-500">Logo</span>
                    <img
                      src={vendor.logoUrl}
                      alt="Business logo"
                      className="mt-1 h-16 w-16 rounded object-cover"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
