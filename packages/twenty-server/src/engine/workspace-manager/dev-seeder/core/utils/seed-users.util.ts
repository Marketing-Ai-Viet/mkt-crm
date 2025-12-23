import { DataSource } from 'typeorm';

import { SeedUserConfig } from 'src/mkt-core/seeder/services/seed-config.service';

const tableName = 'user';

// Legacy user IDs for backward compatibility
export const USER_DATA_SEED_IDS = {
  JANE: '20202020-e6b5-4680-8a32-b8209737156b',
  TIM: '20202020-9e3b-46d4-a556-88b9ddc2b034',
  JONY: '20202020-3957-4908-9c36-2929a23f8357',
  PHIL: '20202020-7169-42cf-bc47-1cfef15264b8',
};

/**
 * Legacy users data for backward compatibility
 */
const LEGACY_USERS = [
  {
    id: USER_DATA_SEED_IDS.TIM,
    firstName: 'Tim',
    lastName: 'Apple',
    email: 'tim@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
    canImpersonate: true,
    canAccessFullAdminPanel: true,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.JONY,
    firstName: 'Jony',
    lastName: 'Ive',
    email: 'jony.ive@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
    canImpersonate: true,
    canAccessFullAdminPanel: true,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.PHIL,
    firstName: 'Phil',
    lastName: 'Schiler',
    email: 'phil.schiler@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
    canImpersonate: true,
    canAccessFullAdminPanel: true,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.JANE,
    firstName: 'Jane',
    lastName: 'Austen',
    email: 'jane.austen@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
    canImpersonate: true,
    canAccessFullAdminPanel: true,
    isEmailVerified: true,
  },
];

export type SeedUsersArgs = {
  dataSource: DataSource;
  schemaName: string;
  /** Optional user config from environment variables */
  userConfig?: SeedUserConfig;
  /** Whether to include legacy demo users (default: false) */
  includeLegacyUsers?: boolean;
};

/**
 * Seed users to the database
 *
 * @param args - Seed arguments
 * @param args.dataSource - TypeORM data source
 * @param args.schemaName - Database schema name
 * @param args.userConfig - Optional user config from environment (MKT_SEED_USER_*)
 * @param args.includeLegacyUsers - Whether to include legacy demo users
 */
export const seedUsers = async ({
  dataSource,
  schemaName,
  userConfig,
  includeLegacyUsers = false,
}: SeedUsersArgs) => {
  const users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    canImpersonate: boolean;
    canAccessFullAdminPanel: boolean;
    isEmailVerified: boolean;
  }> = [];

  // Add user from environment config if provided
  if (userConfig) {
    users.push({
      id: userConfig.id,
      firstName: userConfig.firstName,
      lastName: userConfig.lastName,
      email: userConfig.email,
      passwordHash: userConfig.passwordHash,
      canImpersonate: true,
      canAccessFullAdminPanel: true,
      isEmailVerified: true,
    });
  }

  // Add legacy users if requested (for backward compatibility or development)
  if (includeLegacyUsers) {
    users.push(...LEGACY_USERS);
  }

  // If no users configured and no legacy users, fall back to legacy for backward compatibility
  if (users.length === 0) {
    users.push(...LEGACY_USERS);
  }

  await dataSource
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.${tableName}`, [
      'id',
      'firstName',
      'lastName',
      'email',
      'passwordHash',
      'canImpersonate',
      'canAccessFullAdminPanel',
      'isEmailVerified',
    ])
    .orIgnore()
    .values(users)
    .execute();
};
