import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from './schemas/offer.schema';
import { CatalogModule } from '../catalog/catalog.module';
import { OfferService } from './services/offer.service';
import { PublicOfferController } from './controllers/public-offer.controller';
import { VendorOfferController } from './controllers/vendor-offer.controller';
import { AdminOfferController } from './controllers/admin-offer.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Offer.name, schema: OfferSchema }]),
    CatalogModule,
  ],
  controllers: [PublicOfferController, VendorOfferController, AdminOfferController],
  providers: [OfferService],
  exports: [MongooseModule, OfferService],
})
export class OffersModule {}
