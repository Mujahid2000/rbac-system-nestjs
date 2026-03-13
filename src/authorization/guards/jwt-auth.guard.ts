import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

type AccessTokenPayload = {
  sub: string;
  email: string;
  type: 'access';
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format.');
    }

    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
      token,
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      },
    );

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token type.');
    }

    request.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    return true;
  }
}
