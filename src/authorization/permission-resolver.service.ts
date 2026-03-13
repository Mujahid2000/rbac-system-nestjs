import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Permission } from '../database/schemas/permission.schema';
import { RolePermission } from '../database/schemas/role-permission.schema';
import { UserPermission } from '../database/schemas/user-permission.schema';
import { User } from '../database/schemas/user.schema';

@Injectable()
export class PermissionResolverService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(RolePermission.name)
    private readonly rolePermissionModel: Model<RolePermission>,
    @InjectModel(UserPermission.name)
    private readonly userPermissionModel: Model<UserPermission>,
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<Permission>,
  ) {}

  async resolveForUser(userId: string): Promise<string[]> {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      return [];
    }

    const roleLinks = await this.rolePermissionModel
      .find({ roleId: user.roleId })
      .lean()
      .exec();

    const userOverrides = await this.userPermissionModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    const permissionIds = new Set<string>();
    for (const link of roleLinks) {
      permissionIds.add(link.permissionId.toString());
    }

    for (const override of userOverrides) {
      const permissionId = override.permissionId.toString();
      if (override.granted) {
        permissionIds.add(permissionId);
      } else {
        permissionIds.delete(permissionId);
      }
    }

    if (permissionIds.size === 0) {
      return [];
    }

    const permissions = await this.permissionModel
      .find({
        _id: { $in: Array.from(permissionIds, (id) => new Types.ObjectId(id)) },
      })
      .lean()
      .exec();

    return permissions.map((permission) => permission.atomKey);
  }
}
