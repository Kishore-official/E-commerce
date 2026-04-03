import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformSettingDocument = PlatformSetting & Document;

@Schema({ collection: 'platform_settings', timestamps: true })
export class PlatformSetting {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: unknown;

  @Prop({ type: String, required: false })
  countryCode?: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const PlatformSettingSchema = SchemaFactory.createForClass(PlatformSetting);

PlatformSettingSchema.index({ key: 1, countryCode: 1 }, { unique: true });

