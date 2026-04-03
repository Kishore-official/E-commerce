import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  storefrontUrl: process.env.STOREFRONT_URL || 'http://localhost:3001',
  vendorUrl: process.env.VENDOR_URL || 'http://localhost:3002',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3003',
}));
