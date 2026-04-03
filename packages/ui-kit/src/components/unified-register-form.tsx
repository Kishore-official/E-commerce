'use client';

import { useState, useEffect } from 'react';
import { Button, Input, FormField, Card, CardContent, CardHeader, CardTitle } from './index';
import { useAuth } from '../hooks/use-auth';
import { useToast } from '../hooks/use-toast';
import type { User } from '../providers/auth-provider';

export interface UnifiedRegisterFormProps {
  defaultTab?: 'customer' | 'vendor';
  onSuccess?: (user: User) => void;
}

export function UnifiedRegisterForm({ defaultTab = 'customer', onSuccess }: UnifiedRegisterFormProps) {
  const { register, user: authUser } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>(defaultTab);
  const [pendingSuccess, setPendingSuccess] = useState(false);

  useEffect(() => {
    if (pendingSuccess && authUser && onSuccess) {
      onSuccess(authUser);
      setPendingSuccess(false);
    }
  }, [pendingSuccess, authUser, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      addToast(
        'success',
        activeTab === 'vendor'
          ? 'Account created. Contact the admin team to request vendor access.'
          : 'Account created!',
      );
      if (onSuccess) {
        setPendingSuccess(true);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Registration failed. Email may already be in use.')
          : 'Registration failed. Email may already be in use.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <div className="mt-4 flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'customer'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendor')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'vendor'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vendor
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          {activeTab === 'vendor' && (
            <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
              You will be registered as a customer. Contact the admin team to request vendor access.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
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
          <FormField label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
          </FormField>
          <Button type="submit" className="w-full" loading={loading}>
            Register
          </Button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:underline">
              Sign in
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

