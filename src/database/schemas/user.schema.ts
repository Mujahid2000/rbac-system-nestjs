import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ROLE_COLLECTION } from './role.schema';

export const USER_COLLECTION = 'users';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: USER_COLLECTION, timestamps: true })
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  email!: string;

  @Prop({ type: String, required: true })
  passwordHash!: string;

  @Prop({
    type: Types.ObjectId,
    ref: ROLE_COLLECTION,
    required: true,
    index: true,
  })
  roleId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: USER_COLLECTION,
    default: null,
    index: true,
  })
  managerId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    index: true,
  })
  status!: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User);
