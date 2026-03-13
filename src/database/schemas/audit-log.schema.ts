import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { USER_COLLECTION } from './user.schema';

export const AUDIT_LOG_COLLECTION = 'audit_logs';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: AUDIT_LOG_COLLECTION, timestamps: false })
export class AuditLog {
  @Prop({
    type: Types.ObjectId,
    ref: USER_COLLECTION,
    required: true,
    index: true,
  })
  actorId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, index: true })
  action!: string;

  @Prop({ type: Types.ObjectId, required: false, default: null, index: true })
  targetId!: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.Mixed, required: true, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
