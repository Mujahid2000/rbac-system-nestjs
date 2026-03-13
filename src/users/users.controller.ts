import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthenticatedRequest } from '../authorization/types/authenticated-request.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('view:users')
  @ResponseMessage('Users fetched successfully.')
  async listUsers(@Req() request: AuthenticatedRequest) {
    return this.usersService.listUsers(this.requireActorUserId(request));
  }

  @Post()
  @RequirePermission('manage:users')
  @ResponseMessage('User created successfully.')
  async createUser(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateUserDto,
  ) {
    return this.usersService.createUser(this.requireActorUserId(request), body);
  }

  @Get(':id')
  @RequirePermission('view:users')
  @ResponseMessage('User details fetched successfully.')
  async getUserById(
    @Req() request: AuthenticatedRequest,
    @Param('id') userId: string,
  ) {
    return this.usersService.getUserById(
      this.requireActorUserId(request),
      userId,
    );
  }

  @Patch(':id')
  @RequirePermission('manage:users')
  @ResponseMessage('User updated successfully.')
  async updateUser(
    @Req() request: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateUser(
      this.requireActorUserId(request),
      userId,
      body,
    );
  }

  @Delete(':id')
  @RequirePermission('manage:users')
  @ResponseMessage('User deleted successfully.')
  async softDeleteUser(
    @Req() request: AuthenticatedRequest,
    @Param('id') userId: string,
  ) {
    return this.usersService.softDeleteUser(
      this.requireActorUserId(request),
      userId,
    );
  }

  @Patch(':id/status')
  @RequirePermission('manage:users')
  @ResponseMessage('User status updated successfully.')
  async updateUserStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(
      this.requireActorUserId(request),
      userId,
      body,
    );
  }

  private requireActorUserId(request: AuthenticatedRequest): string {
    const userId = request.auth?.userId;
    if (!userId) {
      throw new ForbiddenException('User context unavailable.');
    }

    return userId;
  }
}
