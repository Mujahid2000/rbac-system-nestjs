import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PERMISSION_COLLECTION } from './permission.schema';
import { USER_COLLECTION } from './user.schema';

export const USER_PERMISSION_COLLECTION = 'user_permissions';

export type UserPermissionDocument = HydratedDocument<UserPermission>;

@Schema({ collection: USER_PERMISSION_COLLECTION, timestamps: false })
export class UserPermission {
  @Prop({
    type: Types.ObjectId,
    ref: USER_COLLECTION,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: PERMISSION_COLLECTION,
    required: true,
    index: true,
  })
  permissionId!: Types.ObjectId;

  @Prop({ type: Boolean, required: true, default: true })
  granted!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: USER_COLLECTION,
    required: true,
    index: true,
  })
  grantedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  grantedAt!: Date;
}

export const UserPermissionSchema =
  SchemaFactory.createForClass(UserPermission);
UserPermissionSchema.index({ userId: 1, permissionId: 1 }, { unique: true });
