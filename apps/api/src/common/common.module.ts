import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventBusService } from './events/event-bus.service';
import { StorageService } from './services/storage.service';
import { FilesController } from './controllers/files.controller';
import { Vendor, VendorSchema } from '../modules/identity/schemas/vendor.schema';
import { User, UserSchema } from '../modules/identity/schemas/user.schema';
import { Order, OrderSchema } from '../modules/orders/schemas/order.schema';
import { EMAIL_SERVICE_PORT } from './services/email/email.port';
import { MockEmailAdapter } from './services/email/mock-email.adapter';
import { ResendEmailAdapter } from './services/email/resend-email.adapter';
import { EmailTemplateService } from './services/email/email-template.service';
import { SMS_SERVICE_PORT } from './services/sms/sms.port';
import { MockSmsAdapter } from './services/sms/mock-sms.adapter';
import { Msg91SmsAdapter } from './services/sms/msg91-sms.adapter';
import { EmailNotificationListener } from './listeners/email-notification.listener';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [FilesController],
  providers: [
    EventBusService,
    StorageService,
    EmailTemplateService,
    EmailNotificationListener,
    {
      provide: EMAIL_SERVICE_PORT,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('email.provider', 'mock');
        if (provider === 'resend') {
          return new ResendEmailAdapter(configService);
        }
        return new MockEmailAdapter();
      },
      inject: [ConfigService],
    },
    {
      provide: SMS_SERVICE_PORT,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('sms.provider', 'mock');
        if (provider === 'msg91') {
          return new Msg91SmsAdapter(configService);
        }
        return new MockSmsAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    EventBusService,
    StorageService,
    EMAIL_SERVICE_PORT,
    SMS_SERVICE_PORT,
    EmailTemplateService,
    MongooseModule,
  ],
})
export class CommonModule {}
