import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const PERMISSION_COLLECTION = 'permissions';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({ collection: PERMISSION_COLLECTION, timestamps: true })
export class Permission {
  @Prop({ type: String, required: true, unique: true, trim: true })
  atomKey!: string;

  @Prop({ type: String, default: null })
  description!: string | null;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
