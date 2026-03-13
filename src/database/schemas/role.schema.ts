import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const ROLE_COLLECTION = 'roles';

export enum RoleName {
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  CUSTOMER = 'customer',
}

export type RoleDocument = HydratedDocument<Role>;

@Schema({ collection: ROLE_COLLECTION, timestamps: true })
export class Role {
  @Prop({ type: String, enum: RoleName, required: true, unique: true })
  name!: RoleName;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
