'use client';

import { useState } from 'react';
import { Button, Input, FormField, Card, CardContent, CardHeader, CardTitle } from './index';
import { apiClient, setTokens } from '../lib/api-client';
import { AUTH_URLS, buildCallbackUrl, getTargetOriginForRole, getDefaultLandingPath } from '../lib/auth-urls';
import { UserRole } from '@ecommerce/shared-types';

export type PortalType = 'storefront' | 'vendor' | 'admin';

export interface UnifiedLoginFormProps {
  returnUrl?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    vendorId?: string;
  };
}

export function UnifiedLoginForm({ returnUrl }: UnifiedLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'vendor' | 'admin'>('customer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post<{ data: LoginResponse }>('/auth/login', {
        email,
        password,
      });

      // Handle both response formats: { success: true, data: {...} } or direct {...}
      const loginData = response.data.data || (response.data as unknown as LoginResponse);
      const { accessToken, refreshToken, user } = loginData;
      const role = user.role;

      // Determine redirect target
      let targetOrigin: string | null = null;
      let returnPath: string | undefined;

      if (returnUrl) {
        // returnUrl was passed (e.g., from admin/vendor app redirect)
        // Parse to extract origin and path
        try {
          const parsed = new URL(returnUrl);
          targetOrigin = parsed.origin;
          returnPath = parsed.pathname + parsed.search;

          // If returnUrl points to the same origin (storefront), treat as local
          if (targetOrigin === window.location.origin) {
            targetOrigin = null;
            // For customers staying on storefront, use the returnUrl path
          }
        } catch {
          // Invalid URL — treat as relative path on same origin
          targetOrigin = null;
          returnPath = returnUrl;
        }
      }

      // Validate targetOrigin against allowed origins to prevent token exfiltration
      if (targetOrigin) {
        const ALLOWED_ORIGINS = [
          AUTH_URLS.storefront(),
          AUTH_URLS.vendor(),
          AUTH_URLS.admin(),
        ];
        if (!ALLOWED_ORIGINS.includes(targetOrigin)) {
          targetOrigin = getTargetOriginForRole(role);
          returnPath = undefined;
        }
      }

      if (!targetOrigin) {
        // No explicit cross-origin target — use role-based default.
        // Only redirect cross-origin; if the role's app is the current origin, stay local.
        const roleTarget = getTargetOriginForRole(role);
        if (roleTarget && roleTarget !== window.location.origin) {
          targetOrigin = roleTarget;
        }
      }

      if (targetOrigin) {
        // Cross-origin: redirect to target app's callback page with tokens in hash
        const callbackUrl = buildCallbackUrl(
          targetOrigin,
          accessToken,
          refreshToken,
          returnPath || getDefaultLandingPath(role),
        );
        window.location.href = callbackUrl;
      } else {
        // Same origin (customer on storefront): store tokens and redirect locally
        setTokens(accessToken, refreshToken);
        window.location.href = returnPath || getDefaultLandingPath(role);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Invalid email or password')
          : 'Invalid email or password';
      setError(message);
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'customer' as const, label: 'Customer' },
    { key: 'vendor' as const, label: 'Vendor' },
    { key: 'admin' as const, label: 'Admin' },
  ];

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <div className="mt-4 flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <FormField label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                activeTab === 'admin'
                  ? 'admin@example.com'
                  : activeTab === 'vendor'
                    ? 'vendor@example.com'
                    : 'customer@example.com'
              }
              required
            />
          </FormField>
          <FormField label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormField>
          <Button type="submit" className="w-full" loading={loading}>
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
