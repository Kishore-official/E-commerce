import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { BullModule } from '@nestjs/bull';
import { appConfig, databaseConfig, authConfig, opensearchConfig, redisConfig, emailConfig, smsConfig } from './common/config';
import { JobsModule } from './jobs/jobs.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OffersModule } from './modules/offers/offers.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AffiliateModule } from './modules/affiliate/affiliate.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { StorefrontModule } from './modules/storefront/storefront.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, opensearchConfig, redisConfig, emailConfig, smsConfig],
      envFilePath: ['.env', '../../.env'],
    }),

    // Logger
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),

    // Database (MongoDB)
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('database.mongodbUri');
        const dbName = config.get<string>('database.mongodbDbName');
        // Extract database name from URI if not provided separately
        const connectionUri = uri.includes('/?') 
          ? uri.replace('/?', `/${dbName}?`)
          : uri.includes(dbName) 
            ? uri 
            : `${uri}/${dbName}`;
        
        console.log('[MongoDB] Connecting to:', connectionUri.replace(/\/\/[^@]+@/, '//***@'));
        return {
          uri: connectionUri,
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          connectionFactory: (connection: any) => {
            connection.plugin((schema: any) => {
              schema.set('toJSON', {
                virtuals: true,
                versionKey: false,
                transform: (_doc: any, ret: any) => {
                  delete ret._id;
                  delete ret.__v;
                  return ret;
                },
              });
              schema.set('toObject', {
                virtuals: true,
                versionKey: false,
                transform: (_doc: any, ret: any) => {
                  delete ret._id;
                  delete ret.__v;
                  return ret;
                },
              });
            });
            return connection;
          },
        };
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Event emitter for domain events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),

    // BullMQ job queues
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
        },
      }),
    }),
    JobsModule,

    // Common module
    CommonModule,

    // Domain modules
    IdentityModule,
    CatalogModule,
    OffersModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    LogisticsModule,
    ReviewsModule,
    AffiliateModule,
    SearchModule,
    AdminModule,
    CouponsModule,
    InvoicesModule,
    PayoutsModule,
    StorefrontModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
