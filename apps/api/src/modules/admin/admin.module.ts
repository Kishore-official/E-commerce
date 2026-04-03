import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { PlatformSetting, PlatformSettingSchema } from './schemas/platform-setting.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { IdentityModule } from '../identity/identity.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OffersModule } from '../offers/offers.module';
import { AuditService } from './services/audit.service';
import { ApprovalQueueService } from './services/approval-queue.service';
import { NotificationService } from './services/notification.service';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { NotificationController } from './controllers/notification.controller';
import { AuditEventListener } from './listeners/audit-event.listener';
import { NotificationListener } from './listeners/notification.listener';
import { Vendor, VendorSchema } from '../identity/schemas/vendor.schema';
import { Product, ProductSchema } from '../catalog/schemas/product.schema';
import { Offer, OfferSchema } from '../offers/schemas/offer.schema';
import { User, UserSchema } from '../identity/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: PlatformSetting.name, schema: PlatformSettingSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: User.name, schema: UserSchema },
    ]),
    IdentityModule,
    CatalogModule,
    OffersModule,
  ],
  controllers: [AdminAuditController, NotificationController],
  providers: [
    AuditService,
    ApprovalQueueService,
    NotificationService,
    AuditEventListener,
    NotificationListener,
  ],
  exports: [MongooseModule, AuditService, NotificationService],
})
export class AdminModule {}
