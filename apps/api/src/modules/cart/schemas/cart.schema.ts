import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CartStatus } from '@ecommerce/shared-types';

export type CartDocument = Cart & Document;

@Schema({ collection: 'carts', timestamps: true })
export class Cart {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: false })
  sessionId?: string;

  @Prop({ type: String, default: 'SA' })
  countryCode: string;

  @Prop({ type: String, default: CartStatus.ACTIVE })
  status: CartStatus;

  @Prop({ type: String, required: false })
  appliedCouponCode?: string;

  // Virtual property for relations (not stored in DB)
  items?: any[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ userId: 1 });
CartSchema.index({ sessionId: 1 });
CartSchema.index({ status: 1 });

