import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CartItemDocument = CartItem & Document;

@Schema({ collection: 'cart_items', timestamps: true })
export class CartItem {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  cartId: string;

  @Prop({ type: String, required: true })
  offerId: string;

  @Prop({ type: Number, default: 1 })
  quantity: number;

  @Prop({ type: Number, required: true })
  priceSnapshot: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

CartItemSchema.index({ cartId: 1, offerId: 1 }, { unique: true });
CartItemSchema.index({ cartId: 1 });

