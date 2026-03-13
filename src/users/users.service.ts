import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument, RoleName } from '../database/schemas/role.schema';
import {
  User,
  UserDocument,
  UserStatus,
} from '../database/schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type SafeUser = {
  id: string;
  email: string;
  roleId: string;
  managerId: string | null;
  status: UserStatus;
};

type ActorContext = {
  user: UserDocument;
  roleName: RoleName;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    private readonly configService: ConfigService,
  ) {}

  async listUsers(actorUserId: string): Promise<SafeUser[]> {
    const actor = await this.getActorContext(actorUserId);

    const query =
      actor.roleName === RoleName.ADMIN
        ? {}
        : {
            $or: [
              { _id: new Types.ObjectId(actorUserId) },
              { managerId: new Types.ObjectId(actorUserId) },
            ],
          };

    const users = await this.userModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    return users.map((user) => this.toSafeUser(user));
  }

  async createUser(actorUserId: string, dto: CreateUserDto): Promise<SafeUser> {
    const actor = await this.getActorContext(actorUserId);
    const role = await this.findRoleByName(dto.roleName);

    let managerId: Types.ObjectId | null = null;

    if (actor.roleName === RoleName.MANAGER) {
      if (![RoleName.AGENT, RoleName.CUSTOMER].includes(dto.roleName)) {
        throw new ForbiddenException(
          'Managers can only create agent or customer users.',
        );
      }
      managerId = new Types.ObjectId(actorUserId);
    } else if (dto.managerId) {
      managerId = new Types.ObjectId(dto.managerId);
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.configService.getOrThrow<number>('BCRYPT_SALT_ROUNDS'),
    );

    try {
      const created = await this.userModel.create({
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        roleId: role._id,
        managerId,
        status: UserStatus.ACTIVE,
      });

      return this.toSafeUser(created);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email already exists.');
      }
      throw error;
    }
  }

  async getUserById(
    actorUserId: string,
    targetUserId: string,
  ): Promise<SafeUser> {
    const actor = await this.getActorContext(actorUserId);
    const target = await this.findUserByIdOrThrow(targetUserId);

    this.assertWithinScope(actor, actorUserId, target);

    return this.toSafeUser(target);
  }

  async updateUser(
    actorUserId: string,
    targetUserId: string,
    dto: UpdateUserDto,
  ): Promise<SafeUser> {
    const actor = await this.getActorContext(actorUserId);
    const target = await this.findUserByIdOrThrow(targetUserId);

    this.assertWithinScope(actor, actorUserId, target);

    if (actor.roleName === RoleName.MANAGER && dto.roleName) {
      if (![RoleName.AGENT, RoleName.CUSTOMER].includes(dto.roleName)) {
        throw new ForbiddenException(
          'Managers can only assign agent or customer roles.',
        );
      }
    }

    if (
      actor.roleName === RoleName.MANAGER &&
      dto.managerId &&
      dto.managerId !== actorUserId
    ) {
      throw new ForbiddenException(
        'Managers cannot reassign manager ownership.',
      );
    }

    if (dto.email) {
      target.email = dto.email.toLowerCase().trim();
    }

    if (dto.password) {
      target.passwordHash = await bcrypt.hash(
        dto.password,
        this.configService.getOrThrow<number>('BCRYPT_SALT_ROUNDS'),
      );
    }

    if (dto.roleName) {
      const role = await this.findRoleByName(dto.roleName);
      target.roleId = role._id;
    }

    if (dto.managerId !== undefined) {
      target.managerId = dto.managerId
        ? new Types.ObjectId(dto.managerId)
        : null;
    }

    try {
      const saved = await target.save();
      return this.toSafeUser(saved);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email already exists.');
      }
      throw error;
    }
  }

  async softDeleteUser(
    actorUserId: string,
    targetUserId: string,
  ): Promise<SafeUser> {
    return this.updateUserStatus(actorUserId, targetUserId, {
      status: UserStatus.BANNED,
    });
  }

  async updateUserStatus(
    actorUserId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ): Promise<SafeUser> {
    const actor = await this.getActorContext(actorUserId);
    const target = await this.findUserByIdOrThrow(targetUserId);

    this.assertWithinScope(actor, actorUserId, target);

    target.status = dto.status;
    const saved = await target.save();
    return this.toSafeUser(saved);
  }

  private async getActorContext(actorUserId: string): Promise<ActorContext> {
    const user = await this.findUserByIdOrThrow(actorUserId);

    const role = await this.roleModel.findById(user.roleId).lean().exec();
    if (!role) {
      throw new NotFoundException('Actor role not found.');
    }

    return { user, roleName: role.name };
  }

  private async findRoleByName(roleName: RoleName): Promise<RoleDocument> {
    const role = await this.roleModel.findOne({ name: roleName }).exec();
    if (!role) {
      throw new BadRequestException(`Role not found: ${roleName}`);
    }

    return role;
  }

  private async findUserByIdOrThrow(userId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id.');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private assertWithinScope(
    actor: ActorContext,
    actorUserId: string,
    target: UserDocument,
  ): void {
    if (actor.roleName === RoleName.ADMIN) {
      return;
    }

    const actorObjectId = new Types.ObjectId(actorUserId);
    const isSelf = target._id.equals(actorObjectId);
    const isManagedByActor = target.managerId?.equals(actorObjectId) ?? false;

    if (!isSelf && !isManagedByActor) {
      throw new ForbiddenException('Target user is out of your scope.');
    }
  }

  private toSafeUser(user: UserDocument): SafeUser {
    return {
      id: user._id.toString(),
      email: user.email,
      roleId: user.roleId.toString(),
      managerId: user.managerId ? user.managerId.toString() : null,
      status: user.status,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return 'code' in error && (error as { code?: number }).code === 11000;
  }
}
