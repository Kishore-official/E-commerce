'use client';

import { useState } from 'react';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  FormField,
  useAuth,
  useToast,
  apiPatch,
} from '@ecommerce/ui-kit';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: (user as any)?.phone ?? '',
  });

  const handleEdit = () => {
    setForm({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: (user as any)?.phone ?? '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch('/auth/me', form);
      await refreshUser();
      addToast('success', 'Profile updated');
      setIsEditing(false);
    } catch {
      addToast('error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profile" />

      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account Info</CardTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" htmlFor="firstName" required>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Last Name" htmlFor="lastName" required>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </FormField>
              </div>
              <FormField label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </FormField>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} loading={saving} disabled={saving}>
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Role</span>
                <span className="text-sm capitalize">{user?.role}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
