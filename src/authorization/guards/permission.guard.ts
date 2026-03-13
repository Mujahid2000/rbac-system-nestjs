import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionResolverService } from '../permission-resolver.service';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolverService: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = request.auth;

    if (!auth?.userId) {
      throw new ForbiddenException(
        'User context unavailable for permission check.',
      );
    }

    const permissions = await this.permissionResolverService.resolveForUser(
      auth.userId,
    );
    request.auth = {
      ...auth,
      permissions,
    };

    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException('Insufficient permission.');
    }

    return true;
  }
}
