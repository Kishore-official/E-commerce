import { registerAs } from '@nestjs/config';

export default registerAs('sms', () => ({
  provider: process.env.SMS_PROVIDER || 'mock',
  msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
  msg91SenderId: process.env.MSG91_SENDER_ID || 'MRDIAN',
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID || '',
}));
