import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  provider: process.env.EMAIL_PROVIDER || 'mock',
  from: process.env.EMAIL_FROM || 'MERIDIAN <noreply@meridian.com>',
  resendApiKey: process.env.RESEND_API_KEY || '',
}));
