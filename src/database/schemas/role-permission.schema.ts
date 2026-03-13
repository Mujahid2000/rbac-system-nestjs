import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PERMISSION_COLLECTION } from './permission.schema';
import { ROLE_COLLECTION } from './role.schema';

export const ROLE_PERMISSION_COLLECTION = 'role_permissions';

export type RolePermissionDocument = HydratedDocument<RolePermission>;

@Schema({ collection: ROLE_PERMISSION_COLLECTION, timestamps: true })
export class RolePermission {
  @Prop({
    type: Types.ObjectId,
    ref: ROLE_COLLECTION,
    required: true,
    index: true,
  })
  roleId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: PERMISSION_COLLECTION,
    required: true,
    index: true,
  })
  permissionId!: Types.ObjectId;
}

export const RolePermissionSchema =
  SchemaFactory.createForClass(RolePermission);
RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
