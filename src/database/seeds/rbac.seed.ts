import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from '../schemas/permission.schema';
import { RolePermission } from '../schemas/role-permission.schema';
import { Role, RoleName } from '../schemas/role.schema';

loadEnv({ path: '.env' });
loadEnv({ path: '.env.example', override: false });

type PermissionSeed = {
  atomKey: string;
  description: string;
};

const PERMISSION_SEEDS: PermissionSeed[] = [
  { atomKey: 'view:dashboard', description: 'Access the main dashboard' },
  { atomKey: 'view:users', description: 'View user list' },
  { atomKey: 'manage:users', description: 'Create, edit, suspend users' },
  { atomKey: 'view:leads', description: 'View leads module' },
  { atomKey: 'manage:leads', description: 'Create, edit, delete leads' },
  { atomKey: 'view:tasks', description: 'View tasks module' },
  { atomKey: 'manage:tasks', description: 'Create, edit, delete tasks' },
  { atomKey: 'view:reports', description: 'View reports module' },
  { atomKey: 'view:audit_log', description: 'View audit trail' },
  { atomKey: 'view:settings', description: 'View settings page' },
  { atomKey: 'manage:settings', description: 'Edit system settings' },
  {
    atomKey: 'view:customer_portal',
    description: 'Access customer-facing portal',
  },
  {
    atomKey: 'manage:permissions',
    description: 'Grant and revoke permission atoms',
  },
];

const ROLE_DEFAULT_ATOMS: Record<RoleName, string[]> = {
  [RoleName.ADMIN]: PERMISSION_SEEDS.map((permission) => permission.atomKey),
  [RoleName.MANAGER]: [
    'view:dashboard',
    'view:users',
    'manage:users',
    'view:leads',
    'manage:leads',
    'view:tasks',
    'manage:tasks',
    'view:reports',
    'view:audit_log',
    'view:settings',
    'view:customer_portal',
    'manage:permissions',
  ],
  [RoleName.AGENT]: [
    'view:dashboard',
    'view:leads',
    'manage:leads',
    'view:tasks',
    'manage:tasks',
    'view:reports',
  ],
  [RoleName.CUSTOMER]: ['view:customer_portal'],
};

async function seedRoles(
  roleModel: Model<Role>,
): Promise<Map<RoleName, string>> {
  const roleIds = new Map<RoleName, string>();

  for (const roleName of Object.values(RoleName)) {
    const role = await roleModel
      .findOneAndUpdate(
        { name: roleName },
        { $set: { name: roleName } },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    roleIds.set(roleName, role._id.toString());
  }

  return roleIds;
}

async function seedPermissions(
  permissionModel: Model<Permission>,
): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();

  for (const permissionSeed of PERMISSION_SEEDS) {
    const permission = await permissionModel
      .findOneAndUpdate(
        { atomKey: permissionSeed.atomKey },
        {
          $set: {
            atomKey: permissionSeed.atomKey,
            description: permissionSeed.description,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    permissionIds.set(permissionSeed.atomKey, permission._id.toString());
  }

  return permissionIds;
}

async function seedRolePermissions(
  rolePermissionModel: Model<RolePermission>,
  roleIds: Map<RoleName, string>,
  permissionIds: Map<string, string>,
): Promise<number> {
  let attemptedUpserts = 0;

  for (const [roleName, atoms] of Object.entries(ROLE_DEFAULT_ATOMS) as Array<
    [RoleName, string[]]
  >) {
    const roleId = roleIds.get(roleName);
    if (!roleId) {
      throw new Error(`Role not found in seed map: ${roleName}`);
    }

    for (const atomKey of atoms) {
      const permissionId = permissionIds.get(atomKey);
      if (!permissionId) {
        throw new Error(`Permission not found in seed map: ${atomKey}`);
      }

      await rolePermissionModel
        .updateOne(
          { roleId, permissionId },
          { $setOnInsert: { roleId, permissionId } },
          { upsert: true },
        )
        .exec();

      attemptedUpserts += 1;
    }
  }

  return attemptedUpserts;
}

async function runSeed(): Promise<void> {
  const { AppModule } = await import('../../app.module');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const roleModel = app.get<Model<Role>>(getModelToken(Role.name));
    const permissionModel = app.get<Model<Permission>>(
      getModelToken(Permission.name),
    );
    const rolePermissionModel = app.get<Model<RolePermission>>(
      getModelToken(RolePermission.name),
    );

    const roleIds = await seedRoles(roleModel);
    const permissionIds = await seedPermissions(permissionModel);
    const rolePermissionLinks = await seedRolePermissions(
      rolePermissionModel,
      roleIds,
      permissionIds,
    );

    console.log(
      [
        'RBAC seed complete.',
        `roles=${roleIds.size}`,
        `permissions=${permissionIds.size}`,
        `rolePermissionLinksProcessed=${rolePermissionLinks}`,
      ].join(' '),
    );
  } finally {
    await app.close();
  }
}

void runSeed();
