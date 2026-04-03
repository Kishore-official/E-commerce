import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AffiliateLink, AffiliateLinkSchema } from './schemas/affiliate-link.schema';
import { AffiliateClick, AffiliateClickSchema } from './schemas/affiliate-click.schema';
import { AffiliateCommission, AffiliateCommissionSchema } from './schemas/affiliate-commission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AffiliateLink.name, schema: AffiliateLinkSchema },
      { name: AffiliateClick.name, schema: AffiliateClickSchema },
      { name: AffiliateCommission.name, schema: AffiliateCommissionSchema },
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [MongooseModule],
})
export class AffiliateModule {}
