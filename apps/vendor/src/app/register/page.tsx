'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  FormField,
  Input,
  Textarea,
  useAuth,
  apiPost,
} from '@ecommerce/ui-kit';

interface VendorRegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
  businessEmail: string;
  phone: string;
  description: string;
}

const emptyForm: VendorRegisterForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  businessName: '',
  businessEmail: '',
  phone: '',
  description: '',
};

export default function VendorRegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState<VendorRegisterForm>(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Step 1: Create auth account (stores access token in memory)
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });

      // Step 2: Create vendor profile using the stored token
      await apiPost('/vendors/register', {
        businessName: form.businessName,
        businessEmail: form.businessEmail,
        phone: form.phone || undefined,
        description: form.description || undefined,
      });

      router.push('/pending');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Registration failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Become a Vendor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create your account and register your business
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border border-gray-100 bg-gray-50 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Account Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" htmlFor="firstName">
                <Input
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
                />
              </FormField>
              <FormField label="Last Name" htmlFor="lastName">
                <Input
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  autoComplete="family-name"
                />
              </FormField>
            </div>
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </FormField>
            <FormField label="Password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>
          </div>

          <div className="rounded-md border border-gray-100 bg-gray-50 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Business Details</h2>
            <FormField label="Business Name" htmlFor="businessName">
              <Input
                id="businessName"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                required
              />
            </FormField>
            <FormField label="Business Email" htmlFor="businessEmail">
              <Input
                id="businessEmail"
                name="businessEmail"
                type="email"
                value={form.businessEmail}
                onChange={handleChange}
                required
              />
            </FormField>
            <FormField label="Phone" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
              />
            </FormField>
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of your business..."
              />
            </FormField>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" loading={submitting}>
            Create Vendor Account
          </Button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
