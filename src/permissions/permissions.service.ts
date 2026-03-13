import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PermissionResolverService } from '../authorization/permission-resolver.service';
import { Permission } from '../database/schemas/permission.schema';
import { Role, RoleName } from '../database/schemas/role.schema';
import { UserPermission } from '../database/schemas/user-permission.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { PermissionOverrideDto } from './dto/set-user-permissions.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<Permission>,
    @InjectModel(UserPermission.name)
    private readonly userPermissionModel: Model<UserPermission>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    private readonly permissionResolverService: PermissionResolverService,
  ) {}

  async listPermissions(): Promise<
    Array<{ atomKey: string; description: string | null }>
  > {
    const permissions = await this.permissionModel
      .find({}, { atomKey: 1, description: 1, _id: 0 })
      .sort({ atomKey: 1 })
      .lean()
      .exec();

    return permissions;
  }

  async getResolvedPermissions(
    actorUserId: string,
    targetUserId: string,
  ): Promise<string[]> {
    await this.assertActorCanManageTarget(actorUserId, targetUserId);
    return this.permissionResolverService.resolveForUser(targetUserId);
  }

  async setUserPermissionOverrides(
    actorUserId: string,
    targetUserId: string,
    overrides: PermissionOverrideDto[],
  ): Promise<string[]> {
    await this.assertActorCanManageTarget(actorUserId, targetUserId);

    const actorPermissions =
      await this.permissionResolverService.resolveForUser(actorUserId);
    const actorPermissionSet = new Set(actorPermissions);

    const overrideAtomKeys = Array.from(
      new Set(overrides.map((override) => override.atomKey.trim())),
    );

    const permissions = await this.permissionModel
      .find({ atomKey: { $in: overrideAtomKeys } })
      .lean()
      .exec();

    if (permissions.length !== overrideAtomKeys.length) {
      const found = new Set(
        permissions.map((permission) => permission.atomKey),
      );
      const unknown = overrideAtomKeys.filter((atomKey) => !found.has(atomKey));
      throw new BadRequestException(
        `Unknown permission atom(s): ${unknown.join(', ')}`,
      );
    }

    const grantedAtoms = overrides
      .filter((override) => override.granted)
      .map((override) => override.atomKey.trim());

    const ceilingViolations = grantedAtoms.filter(
      (atomKey) => !actorPermissionSet.has(atomKey),
    );

    if (ceilingViolations.length > 0) {
      throw new ForbiddenException(
        `Grant ceiling violation for atom(s): ${Array.from(new Set(ceilingViolations)).join(', ')}`,
      );
    }

    const permissionIdByAtom = new Map(
      permissions.map((permission) => [
        permission.atomKey,
        permission._id.toString(),
      ]),
    );

    for (const override of overrides) {
      const atomKey = override.atomKey.trim();
      const permissionId = permissionIdByAtom.get(atomKey);

      if (!permissionId) {
        continue;
      }

      await this.userPermissionModel
        .updateOne(
          {
            userId: new Types.ObjectId(targetUserId),
            permissionId: new Types.ObjectId(permissionId),
          },
          {
            $set: {
              granted: override.granted,
              grantedBy: new Types.ObjectId(actorUserId),
              grantedAt: new Date(),
            },
          },
          { upsert: true },
        )
        .exec();
    }

    return this.permissionResolverService.resolveForUser(targetUserId);
  }

  private async assertActorCanManageTarget(
    actorUserId: string,
    targetUserId: string,
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(actorUserId) ||
      !Types.ObjectId.isValid(targetUserId)
    ) {
      throw new BadRequestException('Invalid user id.');
    }

    const actor = await this.userModel.findById(actorUserId).exec();
    if (!actor) {
      throw new NotFoundException('Actor user not found.');
    }

    const target = await this.userModel.findById(targetUserId).exec();
    if (!target) {
      throw new NotFoundException('Target user not found.');
    }

    const actorRole = await this.roleModel.findById(actor.roleId).lean().exec();
    if (!actorRole) {
      throw new NotFoundException('Actor role not found.');
    }

    if (![RoleName.ADMIN, RoleName.MANAGER].includes(actorRole.name)) {
      throw new ForbiddenException(
        'Only admin or manager can manage permissions.',
      );
    }

    if (actorRole.name === RoleName.ADMIN) {
      return;
    }

    const actorObjectId = new Types.ObjectId(actorUserId);
    const isSelf = target._id.equals(actorObjectId);
    const isManagedByActor = target.managerId?.equals(actorObjectId) ?? false;

    if (!isSelf && !isManagedByActor) {
      throw new ForbiddenException('Target user is out of your scope.');
    }
  }
}
