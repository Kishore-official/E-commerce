'use client';

import { useEffect, useRef } from 'react';
import { Spinner, setTokens } from '@ecommerce/ui-kit';

export default function AuthCallbackPage() {
  const processed = useRef(false);

  useEffect(() => {
    // Prevent double-processing in React strict mode
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash.substring(1);
    if (!hash) {
      window.location.href = '/login';
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access');
    const refreshToken = params.get('refresh');
    const returnPath = params.get('returnPath') || '/dashboard';

    if (!accessToken || !refreshToken) {
      window.location.href = '/login';
      return;
    }

    // Store tokens in this origin's localStorage
    setTokens(accessToken, refreshToken);

    // Clear hash from URL (security: remove tokens from browser history)
    window.history.replaceState(null, '', window.location.pathname);

    // Redirect to the intended destination
    window.location.href = returnPath;
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <Spinner size="lg" />
      <p className="ml-3 text-gray-600">Authenticating...</p>
    </main>
  );
}
