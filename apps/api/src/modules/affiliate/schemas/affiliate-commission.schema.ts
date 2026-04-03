import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CommissionStatus } from '@ecommerce/shared-types';

export type AffiliateCommissionDocument = AffiliateCommission & Document;

@Schema({ collection: 'affiliate_commissions', timestamps: true })
export class AffiliateCommission {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  affiliateLinkId: string;

  @Prop({ type: String, required: false })
  orderId?: string;

  @Prop({ type: String, required: false })
  clickId?: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, enum: CommissionStatus, default: CommissionStatus.PENDING })
  status: CommissionStatus;

  @Prop({ type: String, required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: Date, required: false })
  confirmedAt?: Date;

  @Prop({ type: Date, required: false })
  paidAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AffiliateCommissionSchema = SchemaFactory.createForClass(AffiliateCommission);

AffiliateCommissionSchema.index({ affiliateLinkId: 1 });
AffiliateCommissionSchema.index({ orderId: 1 });
AffiliateCommissionSchema.index({ status: 1 });

