import { DataSource } from 'typeorm';

import { SeedUserConfig } from 'src/mkt-core/seeder/services/seed-config.service';

const tableName = 'user';

// Legacy user IDs for backward compatibility
export const USER_DATA_SEED_IDS = {
  JANE: '20202020-e6b5-4680-8a32-b8209737156b',
  TIM: '20202020-9e3b-46d4-a556-88b9ddc2b034',
  JONY: '20202020-3957-4908-9c36-2929a23f8357',
  PHIL: '20202020-7169-42cf-bc47-1cfef15264b8',
  // Level 4-6 test users for OWN_AND_CHILD_DEPARTMENTS scope
  SARAH: '9723c7ce-b336-4402-94c9-8f068024f544',
  MICHAEL: '8d2d1726-5cb1-4064-8b49-c367e8f13748',
  EMILY: '44f08176-716c-4c8b-b1ba-e7bf20ba9126',
  // Extended test users covering all org levels and departments
  CRAIG: '208f9d15-0a5a-4966-9778-421aed88028a',
  ANGELA: 'b8648a05-87c9-41cd-986f-ee10904a0a5a',
  DAN: 'ac4eae13-a7ba-43e9-895e-a1741f1f4aa6',
  EDDY: 'b6cdc1f7-252c-4f1f-9c2d-cc5ebbaaff9e',
  DEIRDRE: '61f5da49-1404-4a5d-be7a-6310e40f3974',
  LISA: 'ea7bf678-eac9-4d7a-b8db-7bc8f826c011',
  JOHN_T: '39df7020-c965-4fc6-948d-b39efc8b0928',
  GREG: '44bb724f-a5e7-4bbd-96c7-5414d2732879',
  LUCA: '6c73f548-5ad2-4cf5-a7ab-8fb73c8b4c71',
  JEFF: '27874417-161c-4cc8-b6ea-2aaef9727ea0',
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
  // Level 4-6 test users for OWN_AND_CHILD_DEPARTMENTS scope
  {
    id: USER_DATA_SEED_IDS.SARAH,
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.MICHAEL,
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.EMILY,
    firstName: 'Emily',
    lastName: 'Wilson',
    email: 'emily.wilson@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  // Extended test users covering all org levels and departments
  {
    id: USER_DATA_SEED_IDS.CRAIG,
    firstName: 'Craig',
    lastName: 'Federighi',
    email: 'craig.federighi@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.ANGELA,
    firstName: 'Angela',
    lastName: 'Ahrendts',
    email: 'angela.ahrendts@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.DAN,
    firstName: 'Dan',
    lastName: 'Riccio',
    email: 'dan.riccio@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.EDDY,
    firstName: 'Eddy',
    lastName: 'Cue',
    email: 'eddy.cue@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.DEIRDRE,
    firstName: 'Deirdre',
    lastName: "O'Brien",
    email: 'deirdre.obrien@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.LISA,
    firstName: 'Lisa',
    lastName: 'Jackson',
    email: 'lisa.jackson@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.JOHN_T,
    firstName: 'John',
    lastName: 'Ternus',
    email: 'john.ternus@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.GREG,
    firstName: 'Greg',
    lastName: 'Joswiak',
    email: 'greg.joswiak@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.LUCA,
    firstName: 'Luca',
    lastName: 'Maestri',
    email: 'luca.maestri@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
    isEmailVerified: true,
  },
  {
    id: USER_DATA_SEED_IDS.JEFF,
    firstName: 'Jeff',
    lastName: 'Williams',
    email: 'jeff.williams@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: false,
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
