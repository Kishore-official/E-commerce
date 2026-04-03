import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const mongodbUri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!mongodbUri) {
    if (isProduction) {
      throw new Error('MONGODB_URI environment variable is required in production');
    }
    throw new Error(
      'MONGODB_URI environment variable is required. Please set it in your .env file.',
    );
  }

  return {
    mongodbUri,
    mongodbDbName: process.env.MONGODB_DB_NAME || 'E-commerce',
  };
});
