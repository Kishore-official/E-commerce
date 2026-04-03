import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: String, required: true })
  entityId: string;

  @Prop({ type: Object, required: false })
  changes?: Record<string, { old: unknown; new: unknown }>;

  @Prop({ type: String, required: false })
  ipAddress?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

