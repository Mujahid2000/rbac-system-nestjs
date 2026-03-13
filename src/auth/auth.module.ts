import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../database/schemas/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import {
  RefreshTokenBlacklist,
  RefreshTokenBlacklistSchema,
} from './schemas/refresh-token-blacklist.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      {
        name: RefreshTokenBlacklist.name,
        schema: RefreshTokenBlacklistSchema,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LoginRateLimiterService],
  exports: [AuthService],
})
export class AuthModule {}
