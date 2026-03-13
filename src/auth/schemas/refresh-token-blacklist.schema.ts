import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { USER_COLLECTION } from '../../database/schemas/user.schema';

export const AUTH_REFRESH_TOKEN_BLACKLIST_COLLECTION =
  'refresh_token_blacklist';

export type RefreshTokenBlacklistDocument =
  HydratedDocument<RefreshTokenBlacklist>;

@Schema({
  collection: AUTH_REFRESH_TOKEN_BLACKLIST_COLLECTION,
  timestamps: true,
})
export class RefreshTokenBlacklist {
  @Prop({ type: String, required: true, unique: true, index: true })
  tokenHash?: string;

  @Prop({
    type: Types.ObjectId,
    ref: USER_COLLECTION,
    required: true,
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  expiresAt?: Date;
}

export const RefreshTokenBlacklistSchema = SchemaFactory.createForClass(
  RefreshTokenBlacklist,
);
RefreshTokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
