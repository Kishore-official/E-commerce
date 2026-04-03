'use client';

import { useEffect, useRef } from 'react';
import { useAuth, Spinner, getStorefrontLoginUrl } from '@ecommerce/ui-kit';
import { UserRole } from '@ecommerce/shared-types';

const VENDOR_ROLES = [UserRole.VENDOR, UserRole.VENDOR_STAFF];

export default function VendorLoginPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (isLoading || redirected.current) return;

    if (isAuthenticated && user && VENDOR_ROLES.includes(user.role)) {
      redirected.current = true;
      window.location.href = '/dashboard';
      return;
    }

    if (!isAuthenticated) {
      redirected.current = true;
      window.location.href = getStorefrontLoginUrl();
    }
  }, [isAuthenticated, user, isLoading]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <Spinner size="lg" />
      <p className="ml-3 text-gray-600">Redirecting to login...</p>
    </main>
  );
}
