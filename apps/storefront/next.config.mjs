/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ecommerce/shared-types', '@ecommerce/ui-kit'],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    // Skip rewrites if using a placeholder (Docker build) or if behind nginx (production)
    if (!apiUrl || apiUrl.includes('__') || apiUrl.startsWith('/')) {
      return [];
    }
    // Dev mode: proxy /api/* to the API server (e.g., http://localhost:3000)
    const apiOrigin = apiUrl.replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
