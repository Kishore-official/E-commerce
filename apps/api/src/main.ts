import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  console.log('[Bootstrap] Starting NestJS application...');
  console.log('[Bootstrap] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Bootstrap] API_PORT:', process.env.API_PORT);
  console.log('[Bootstrap] MONGODB_URI:', process.env.MONGODB_URI ? '***set***' : 'NOT SET');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  console.log('[Bootstrap] NestJS app created successfully');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');

  // Logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
      },
    },
  }));
  app.use(compression());

  // CORS — allow all origins when URLs are set to '*' (all-in-one container)
  const storefrontUrl = configService.get<string>('app.storefrontUrl', 'http://localhost:3001');
  const vendorUrl = configService.get<string>('app.vendorUrl', 'http://localhost:3002');
  const adminUrl = configService.get<string>('app.adminUrl', 'http://localhost:3003');
  const allowAllOrigins = [storefrontUrl, vendorUrl, adminUrl].includes('*');
  app.enableCors({
    origin: allowAllOrigins ? true : [storefrontUrl, vendorUrl, adminUrl],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Static file serving for uploads (existing images on disk)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Global interceptors and filters
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-commerce Platform API')
    .setDescription('Global e-commerce affiliate + marketplace platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error during startup:', err.message || err);
  process.exit(1);
});
