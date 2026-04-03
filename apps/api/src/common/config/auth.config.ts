import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    throw new Error(
      'JWT_SECRET environment variable is required. Please set it in your .env file.',
    );
  }

  return {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  };
});
