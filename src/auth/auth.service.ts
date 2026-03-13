import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import { User, UserStatus } from '../database/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import { RefreshTokenBlacklist } from './schemas/refresh-token-blacklist.schema';

type DurationUnit = 's' | 'm' | 'h' | 'd';
type DurationString = `${number}${DurationUnit}`;

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
};

type RefreshTokenPayload = {
  sub: string;
  type: 'refresh';
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(RefreshTokenBlacklist.name)
    private readonly refreshTokenBlacklistModel: Model<RefreshTokenBlacklist>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginRateLimiterService: LoginRateLimiterService,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string): Promise<TokenPair> {
    this.loginRateLimiterService.assertAllowed(ipAddress);

    const user = await this.userModel
      .findOne({ email: loginDto.email.toLowerCase().trim() })
      .exec();

    if (!user) {
      this.loginRateLimiterService.registerFailure(ipAddress);
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches: boolean = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      this.loginRateLimiterService.registerFailure(ipAddress);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('User account is banned.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('User account is suspended.');
    }

    this.loginRateLimiterService.registerSuccess(ipAddress);

    return this.issueTokenPair(user._id.toString(), user.email);
  }

  async refresh(rawRefreshToken: string | undefined): Promise<TokenPair> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token.');
    }

    const payload = await this.verifyRefreshToken(rawRefreshToken);

    const blacklistedToken = await this.refreshTokenBlacklistModel
      .findOne({ tokenHash: this.hashToken(rawRefreshToken) })
      .lean()
      .exec();

    if (blacklistedToken) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    const user = await this.userModel.findById(payload.sub).exec();
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not active.');
    }

    await this.blacklistToken(rawRefreshToken, payload.sub);

    return this.issueTokenPair(user._id.toString(), user.email);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(rawRefreshToken);
      await this.blacklistToken(rawRefreshToken, payload.sub);
    } catch {
      // Do not leak token validation reasons during logout.
    }
  }

  getRefreshCookieName(): string {
    return this.configService.getOrThrow<string>('REFRESH_COOKIE_NAME');
  }

  getCookieSecure(): boolean {
    const nodeEnv = this.configService.getOrThrow<string>('NODE_ENV');
    return nodeEnv === 'production';
  }

  getBcryptRounds(): number {
    return this.configService.getOrThrow<number>('BCRYPT_SALT_ROUNDS');
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.getBcryptRounds());
  }

  private async issueTokenPair(
    userId: string,
    email: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, type: 'access' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.getDurationConfig('ACCESS_TOKEN_TTL'),
      },
    );

    const refreshTokenTtl = this.getDurationConfig('REFRESH_TOKEN_TTL');

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenTtl,
      },
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenMaxAgeMs: this.parseDurationToMs(refreshTokenTtl),
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      token,
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      },
    );

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type.');
    }

    return payload;
  }

  private async blacklistToken(token: string, userId: string): Promise<void> {
    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    if (!decoded?.exp) {
      return;
    }

    const expiresAt = new Date(decoded.exp * 1000);
    if (expiresAt.getTime() <= Date.now()) {
      return;
    }

    const tokenHash = this.hashToken(token);

    await this.refreshTokenBlacklistModel
      .updateOne(
        { tokenHash },
        {
          $setOnInsert: {
            tokenHash,
            userId: new Types.ObjectId(userId),
            expiresAt,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationToMs(duration: string): number {
    const durationRegex = /^(\d+)([smhd])$/;
    const parsed = durationRegex.exec(duration.trim());

    if (!parsed) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const amount = Number(parsed[1]);
    const unit = parsed[2];

    const unitToMs: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return amount * unitToMs[unit];
  }

  private getDurationConfig(
    key: 'ACCESS_TOKEN_TTL' | 'REFRESH_TOKEN_TTL',
  ): DurationString {
    return this.configService.getOrThrow<string>(key) as DurationString;
  }
}
