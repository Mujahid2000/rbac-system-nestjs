import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Permission } from '../schemas/permission.schema';
import { RolePermission } from '../schemas/role-permission.schema';
import { Role, RoleName } from '../schemas/role.schema';
import { User, UserStatus } from '../schemas/user.schema';

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

type SeedUserDefinition = {
  email: string;
  roleName: RoleName;
  status?: UserStatus;
};

const DEFAULT_SEED_PASSWORD = 'Password@123';

const SEED_USERS: SeedUserDefinition[] = [
  // Admins (5)
  { email: 'admin1@rbac.local', roleName: RoleName.ADMIN },
  { email: 'admin2@rbac.local', roleName: RoleName.ADMIN },
  { email: 'admin3@rbac.local', roleName: RoleName.ADMIN },
  { email: 'admin4@rbac.local', roleName: RoleName.ADMIN },
  { email: 'admin5@rbac.local', roleName: RoleName.ADMIN },

  // Managers (5)
  { email: 'manager1@rbac.local', roleName: RoleName.MANAGER },
  { email: 'manager2@rbac.local', roleName: RoleName.MANAGER },
  { email: 'manager3@rbac.local', roleName: RoleName.MANAGER },
  { email: 'manager4@rbac.local', roleName: RoleName.MANAGER },
  { email: 'manager5@rbac.local', roleName: RoleName.MANAGER },

  // Agents (5)
  { email: 'agent1@rbac.local', roleName: RoleName.AGENT },
  { email: 'agent2@rbac.local', roleName: RoleName.AGENT },
  { email: 'agent3@rbac.local', roleName: RoleName.AGENT },
  { email: 'agent4@rbac.local', roleName: RoleName.AGENT },
  { email: 'agent5@rbac.local', roleName: RoleName.AGENT },

  // Customers (5)
  { email: 'customer1@rbac.local', roleName: RoleName.CUSTOMER },
  { email: 'customer2@rbac.local', roleName: RoleName.CUSTOMER },
  { email: 'customer3@rbac.local', roleName: RoleName.CUSTOMER },
  { email: 'customer4@rbac.local', roleName: RoleName.CUSTOMER },
  { email: 'customer5@rbac.local', roleName: RoleName.CUSTOMER },
];

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

    const allowedPermissionIds = atoms
      .map((atomKey) => permissionIds.get(atomKey))
      .filter((id): id is string => Boolean(id));

    await rolePermissionModel
      .deleteMany({
        roleId,
        permissionId: { $nin: allowedPermissionIds },
      })
      .exec();
  }

  return attemptedUpserts;
}

async function seedUsers(
  userModel: Model<User>,
  roleIds: Map<RoleName, string>,
): Promise<Map<RoleName, number>> {
  const usersPerRole = new Map<RoleName, number>([
    [RoleName.ADMIN, 0],
    [RoleName.MANAGER, 0],
    [RoleName.AGENT, 0],
    [RoleName.CUSTOMER, 0],
  ]);

  const bcryptRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, bcryptRounds);

  const managerSeeds = SEED_USERS.filter(
    (user) => user.roleName === RoleName.MANAGER,
  );
  const managerIds = new Map<string, string>();

  // Seed admins and managers first so we can attach manager links afterwards.
  const primaryUsers = SEED_USERS.filter(
    (user) =>
      user.roleName === RoleName.ADMIN || user.roleName === RoleName.MANAGER,
  );

  for (const seedUser of primaryUsers) {
    const roleId = roleIds.get(seedUser.roleName);
    if (!roleId) {
      throw new Error(`Role id missing for ${seedUser.roleName}`);
    }

    const user = await userModel
      .findOneAndUpdate(
        { email: seedUser.email },
        {
          $set: {
            email: seedUser.email,
            passwordHash,
            roleId,
            managerId: null,
            status: seedUser.status ?? UserStatus.ACTIVE,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    usersPerRole.set(
      seedUser.roleName,
      (usersPerRole.get(seedUser.roleName) ?? 0) + 1,
    );

    if (seedUser.roleName === RoleName.MANAGER) {
      managerIds.set(seedUser.email, user._id.toString());
    }
  }

  // Seed agents and customers with assigned managers in a round-robin pattern.
  const managerIdList = managerSeeds
    .map((manager) => managerIds.get(manager.email))
    .filter((id): id is string => Boolean(id));

  if (!managerIdList.length) {
    throw new Error('No manager users available to assign managerId links.');
  }

  const subordinateUsers = SEED_USERS.filter(
    (user) =>
      user.roleName === RoleName.AGENT || user.roleName === RoleName.CUSTOMER,
  );

  for (const [index, seedUser] of subordinateUsers.entries()) {
    const roleId = roleIds.get(seedUser.roleName);
    if (!roleId) {
      throw new Error(`Role id missing for ${seedUser.roleName}`);
    }

    const managerId = managerIdList[index % managerIdList.length];

    await userModel
      .findOneAndUpdate(
        { email: seedUser.email },
        {
          $set: {
            email: seedUser.email,
            passwordHash,
            roleId,
            managerId,
            status: seedUser.status ?? UserStatus.ACTIVE,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    usersPerRole.set(
      seedUser.roleName,
      (usersPerRole.get(seedUser.roleName) ?? 0) + 1,
    );
  }

  return usersPerRole;
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
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    const roleIds = await seedRoles(roleModel);
    const permissionIds = await seedPermissions(permissionModel);
    const rolePermissionLinks = await seedRolePermissions(
      rolePermissionModel,
      roleIds,
      permissionIds,
    );
    const usersPerRole = await seedUsers(userModel, roleIds);

    const totalUsers = Array.from(usersPerRole.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    console.log(
      [
        'RBAC seed complete.',
        `roles=${roleIds.size}`,
        `permissions=${permissionIds.size}`,
        `rolePermissionLinksProcessed=${rolePermissionLinks}`,
        `usersSeeded=${totalUsers}`,
        `admins=${usersPerRole.get(RoleName.ADMIN) ?? 0}`,
        `managers=${usersPerRole.get(RoleName.MANAGER) ?? 0}`,
        `agents=${usersPerRole.get(RoleName.AGENT) ?? 0}`,
        `customers=${usersPerRole.get(RoleName.CUSTOMER) ?? 0}`,
        `defaultPassword=${DEFAULT_SEED_PASSWORD}`,
      ].join(' '),
    );
  } finally {
    await app.close();
  }
}

void runSeed();
