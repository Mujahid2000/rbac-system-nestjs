import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import {
  RolePermission,
  RolePermissionSchema,
} from './schemas/role-permission.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { Task, TaskSchema } from './schemas/task.schema';
import {
  UserPermission,
  UserPermissionSchema,
} from './schemas/user-permission.schema';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: User.name, schema: UserSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Task.name, schema: TaskSchema },
      { name: RolePermission.name, schema: RolePermissionSchema },
      { name: UserPermission.name, schema: UserPermissionSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
