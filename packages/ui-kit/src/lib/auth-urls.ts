import { UserRole } from '@ecommerce/shared-types';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR, UserRole.OPS];
const VENDOR_ROLES = [UserRole.VENDOR, UserRole.VENDOR_STAFF];

export const AUTH_URLS = {
  storefront: () => process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001',
  vendor: () => process.env.NEXT_PUBLIC_VENDOR_URL || 'http://localhost:3002',
  admin: () => process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003',
} as const;

/**
 * Extract the base path from an app URL when it shares the same origin as the current page.
 * e.g., "https://cloud-run.app/vendor" on "https://cloud-run.app" → "/vendor"
 * e.g., "http://localhost:3002" on "http://localhost:3001" → "" (different origin)
 */
function getAppBasePath(appUrl: string): string {
  try {
    const parsed = new URL(appUrl);
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return parsed.pathname.replace(/\/$/, '');
    }
  } catch {
    // not a valid URL
  }
  return '';
}

/**
 * Check if the target app URL is on the same origin as the current page.
 */
function isSameOrigin(appUrl: string): boolean {
  try {
    const parsed = new URL(appUrl);
    return typeof window !== 'undefined' && parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Build the storefront login URL with an optional returnUrl parameter.
 */
export function getStorefrontLoginUrl(returnUrl?: string): string {
  const storefrontUrl = AUTH_URLS.storefront();
  const basePath = getAppBasePath(storefrontUrl);
  // If same origin, use relative path; otherwise use full URL
  const base = isSameOrigin(storefrontUrl)
    ? `${basePath}/login`
    : `${storefrontUrl}/login`;
  if (returnUrl) {
    return `${base}?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  return base;
}

/**
 * Build the auth callback URL for a target app.
 * Tokens are passed via hash fragment (never sent to the server).
 */
export function buildCallbackUrl(
  targetOrigin: string,
  accessToken: string,
  refreshToken: string,
  returnPath?: string,
): string {
  const hashParams = new URLSearchParams();
  hashParams.set('access', accessToken);
  hashParams.set('refresh', refreshToken);
  if (returnPath) {
    hashParams.set('returnPath', returnPath);
  }
  return `${targetOrigin}/auth/callback#${hashParams.toString()}`;
}

/**
 * Determine the target app origin for a given user role.
 * Returns null when the target app is on the same origin (tokens already in localStorage).
 */
export function getTargetOriginForRole(role: UserRole): string | null {
  if (ADMIN_ROLES.includes(role)) {
    const url = AUTH_URLS.admin();
    return isSameOrigin(url) ? null : url;
  }
  if (VENDOR_ROLES.includes(role)) {
    const url = AUTH_URLS.vendor();
    return isSameOrigin(url) ? null : url;
  }
  return null;
}

/**
 * Determine the default landing path for a given user role.
 * Includes the basePath prefix when the target app is on the same origin.
 */
export function getDefaultLandingPath(role: UserRole): string {
  if (ADMIN_ROLES.includes(role)) {
    const basePath = getAppBasePath(AUTH_URLS.admin());
    return `${basePath}/dashboard`;
  }
  if (VENDOR_ROLES.includes(role)) {
    const basePath = getAppBasePath(AUTH_URLS.vendor());
    return `${basePath}/dashboard`;
  }
  return '/';
}
