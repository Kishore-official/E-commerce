import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (isProduction) {
    if (!accessKeyId) {
      throw new Error('S3_ACCESS_KEY_ID environment variable is required in production');
    }
    if (!secretAccessKey) {
      throw new Error('S3_SECRET_ACCESS_KEY environment variable is required in production');
    }
  }

  // Warn if using default minioadmin credentials in non-production
  if (!isProduction && (!accessKeyId || accessKeyId === 'minioadmin')) {
    console.warn(
      '⚠️  Using default S3 credentials (minioadmin). Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in production.',
    );
  }

  return {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKeyId: accessKeyId || 'minioadmin',
    secretAccessKey: secretAccessKey || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'ecommerce',
    region: process.env.S3_REGION || 'us-east-1',
  };
});
