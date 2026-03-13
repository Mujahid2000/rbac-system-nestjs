import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { AuthenticatedRequest } from '../authorization/types/authenticated-request.type';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { PermissionsService } from './permissions.service';

@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('permissions')
  @RequirePermission('manage:permissions')
  @ResponseMessage('Permissions fetched successfully.')
  async listPermissions(): Promise<
    Array<{ atomKey: string; description: string | null }>
  > {
    return this.permissionsService.listPermissions();
  }

  @Get('me/permissions')
  @ResponseMessage('Current user permissions fetched successfully.')
  async getMyResolvedPermissions(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ permissions: string[] }> {
    const actorUserId = request.auth?.userId;
    if (!actorUserId) {
      throw new ForbiddenException(
        'User context unavailable for permission lookup.',
      );
    }

    const permissions =
      await this.permissionsService.getMyResolvedPermissions(actorUserId);
    return { permissions };
  }

  @Get('users/:id/permissions')
  @RequirePermission('manage:permissions')
  @ResponseMessage('User permissions fetched successfully.')
  async getUserResolvedPermissions(
    @Req() request: AuthenticatedRequest,
    @Param('id') userId: string,
  ): Promise<{ permissions: string[] }> {
    const actorUserId = request.auth?.userId;
    if (!actorUserId) {
      throw new ForbiddenException(
        'User context unavailable for permission lookup.',
      );
    }

    const permissions = await this.permissionsService.getResolvedPermissions(
      actorUserId,
      userId,
    );
    return { permissions };
  }

  @Put('users/:id/permissions')
  @RequirePermission('manage:permissions')
  @ResponseMessage('User permissions updated successfully.')
  async setUserPermissionOverrides(
    @Param('id') userId: string,
    @Body() body: SetUserPermissionsDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ permissions: string[] }> {
    const actorUserId = request.auth?.userId;
    if (!actorUserId) {
      throw new ForbiddenException(
        'User context unavailable for permission update.',
      );
    }

    const permissions =
      await this.permissionsService.setUserPermissionOverrides(
        actorUserId,
        userId,
        body.overrides,
      );

    return { permissions };
  }
}
