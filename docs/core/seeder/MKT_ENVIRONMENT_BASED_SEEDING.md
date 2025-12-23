# MKT Environment-Based Data Seeding

> Tài liệu triển khai hệ thống seed dữ liệu theo môi trường (Development/Production)

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hiện tại](#2-kiến-trúc-hiện-tại)
3. [Thiết kế giải pháp](#3-thiết-kế-giải-pháp)
4. [Biến môi trường](#4-biến-môi-trường)
5. [Implementation Guide](#5-implementation-guide)
6. [Sử dụng](#6-sử-dụng)
7. [Testing & Verification](#7-testing--verification)
8. [Migration từ hệ thống cũ](#8-migration-từ-hệ-thống-cũ)

---

## 1. Tổng quan

### 1.1 Vấn đề cần giải quyết

Hiện tại khi chạy `npx nx database:reset twenty-server`, hệ thống luôn seed cùng một bộ dữ liệu demo cho development. Cần có cơ chế:

- **Development**: Seed đầy đủ demo data để test
- **Production**: Seed chỉ master data tối thiểu (không có demo data)
- **Workspace credentials**: Sử dụng biến môi trường cho email, password, workspace ID

### 1.2 Yêu cầu

| Yêu cầu | Mô tả |
|---------|-------|
| Environment-based seeding | Chọn data seed dựa trên biến môi trường `MKT_SEED_PROFILE` |
| Configurable workspace | Workspace ID từ biến môi trường `MKT_SEED_WORKSPACE_ID` |
| Configurable credentials | Email/Password từ biến môi trường |
| Backward compatible | Mặc định vẫn hoạt động như cũ (development) |

---

## 2. Kiến trúc hiện tại

### 2.1 Flow hiện tại

```
npx nx database:reset twenty-server
    │
    ├──▶ truncate-db.ts                  # Xóa toàn bộ data
    ├──▶ setup-db.ts                     # Tạo database nếu chưa có
    ├──▶ database:migrate                # Chạy migrations
    ├──▶ cache:flush                     # Xóa cache
    └──▶ workspace:seed:dev              # (nếu configuration=seed)
            │
            └──▶ DevSeederService.seedDev(workspaceId)
                    │
                    ├──▶ seedCoreSchema()         # Seed core: users, workspaces
                    ├──▶ createWorkspaceDBSchema()
                    ├──▶ synchronize()            # Sync metadata
                    ├──▶ devSeederMetadataService.seed()
                    ├──▶ devSeederPermissionsService.initPermissions()
                    └──▶ devSeederDataService.seed()  # Seed business data
```

### 2.2 Files liên quan

| File | Mô tả |
|------|-------|
| `packages/twenty-server/project.json` | Định nghĩa `database:reset` target |
| `src/database/commands/data-seed-dev-workspace.command.ts` | Command `workspace:seed:dev` |
| `src/engine/workspace-manager/dev-seeder/services/dev-seeder.service.ts` | Orchestrator service |
| `src/engine/workspace-manager/dev-seeder/core/utils/seed-workspaces.util.ts` | Seed workspace data |
| `src/engine/workspace-manager/dev-seeder/core/utils/seed-users.util.ts` | Seed users data |
| `src/engine/workspace-manager/dev-seeder/data/services/dev-seeder-data.service.ts` | Seed business data |
| `src/mkt-core/workspace-config/mkt-dev-seeder-data.config.ts` | MKT seed configs |

### 2.3 Hardcoded Values hiện tại

```typescript
// seed-workspaces.util.ts
export const SEED_APPLE_WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

// seed-users.util.ts
export const USER_DATA_SEED_IDS = {
  TIM: '20202020-9e3b-46d4-a556-88b9ddc2b034',
  // ...
};

// Hardcoded credentials
{
  email: 'tim@apple.dev',
  passwordHash: '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC', // 1Tim@appledev
}
```

---

## 3. Thiết kế giải pháp

### 3.1 Sơ đồ kiến trúc mới

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Environment Variables                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  MKT_SEED_PROFILE=development|production|staging|demo|empty                 │
│  MKT_SEED_WORKSPACE_ID=<uuid>                                               │
│  MKT_SEED_WORKSPACE_NAME=<string>                                           │
│  MKT_SEED_WORKSPACE_SUBDOMAIN=<string>                                      │
│  MKT_SEED_USER_EMAIL=<email>                                                │
│  MKT_SEED_USER_PASSWORD=<password>                                          │
│  MKT_SEED_USER_FIRST_NAME=<string>                                          │
│  MKT_SEED_USER_LAST_NAME=<string>                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SeedConfigService                                     │
│  - Đọc và validate biến môi trường                                          │
│  - Cung cấp config cho các service khác                                     │
│  - Hash password nếu cần                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DevSeederService                                      │
│  seedDev(workspaceId, profile)                                              │
│    ├── seedCoreSchema(config)     ← Sử dụng config từ env                   │
│    └── devSeederDataService.seed(profile)  ← Chọn data theo profile         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │ DEVELOPMENT Data  │           │ PRODUCTION Data   │
        │ - Full demo data  │           │ - Master data only│
        │ - Fake customers  │           │ - Org levels      │
        │ - Sample orders   │           │ - Payment methods │
        │ - Test invoices   │           │ - Statuses        │
        └───────────────────┘           └───────────────────┘
```

### 3.2 Seed Profile Enum

```typescript
// src/mkt-core/seeder/types/seed-profile.types.ts

export enum SeedProfile {
  /** Minimal master data only */
  PRODUCTION = 'production',

  /** Full demo data for development */
  DEVELOPMENT = 'development',

  /** Master data + limited demo for staging */
  STAGING = 'staging',

  /** Showcase data for demos */
  DEMO = 'demo',

  /** No business data seeding */
  EMPTY = 'empty',
}
```

### 3.3 Data Categories

| Category | Production | Development | Staging | Demo |
|----------|------------|-------------|---------|------|
| **Organization Levels** | ✅ Minimal | ✅ Full | ✅ Minimal | ✅ Full |
| **Employment Statuses** | ✅ Minimal | ✅ Full | ✅ Minimal | ✅ Full |
| **Payment Methods** | ✅ Minimal | ✅ Full | ✅ Minimal | ✅ Full |
| **Departments** | ✅ Minimal | ✅ Full | ✅ Minimal | ✅ Full |
| **Options/Settings** | ✅ | ✅ | ✅ | ✅ |
| **I18N** | ✅ | ✅ | ✅ | ✅ |
| **Customers** | ❌ | ✅ | ❌ | ✅ Showcase |
| **Orders** | ❌ | ✅ | ❌ | ✅ Showcase |
| **Invoices** | ❌ | ✅ | ❌ | ✅ Showcase |
| **Payments** | ❌ | ✅ | ❌ | ✅ Showcase |
| **Promotions** | ❌ | ✅ | ❌ | ✅ |
| **KPIs** | ❌ | ✅ | ❌ | ✅ |

---

## 4. Biến môi trường

### 4.1 Danh sách biến môi trường

```bash
# =====================================================
# MKT Seed Configuration
# =====================================================

# Profile: development | production | staging | demo | empty
# Default: development
MKT_SEED_PROFILE=development

# =====================================================
# Workspace Configuration
# =====================================================

# Workspace ID (UUID format)
# Default: 20202020-1c25-4d02-bf25-6aeccf7ea419
MKT_SEED_WORKSPACE_ID=20202020-1c25-4d02-bf25-6aeccf7ea419

# Workspace display name
# Default: MKT CRM
MKT_SEED_WORKSPACE_NAME="MKT CRM"

# Workspace subdomain (used for multi-tenant)
# Default: mkt
MKT_SEED_WORKSPACE_SUBDOMAIN=mkt

# =====================================================
# Admin User Configuration
# =====================================================

# Admin user ID (UUID format)
# Default: auto-generated from workspace ID
MKT_SEED_USER_ID=

# Admin email
# Default: admin@mkt.dev
MKT_SEED_USER_EMAIL=admin@mkt.dev

# Admin password (plain text, will be hashed)
# Default: Admin@123456
MKT_SEED_USER_PASSWORD=Admin@123456

# Admin first name
# Default: Admin
MKT_SEED_USER_FIRST_NAME=Admin

# Admin last name
# Default: User
MKT_SEED_USER_LAST_NAME=User
```

### 4.2 File .env mẫu

#### Development (.env.development)

```bash
# Seed Profile
MKT_SEED_PROFILE=development

# Workspace
MKT_SEED_WORKSPACE_ID=20202020-1c25-4d02-bf25-6aeccf7ea419
MKT_SEED_WORKSPACE_NAME="MKT CRM Dev"
MKT_SEED_WORKSPACE_SUBDOMAIN=mkt-dev

# Admin User
MKT_SEED_USER_EMAIL=admin@mkt.dev
MKT_SEED_USER_PASSWORD=Admin@123456
MKT_SEED_USER_FIRST_NAME=Admin
MKT_SEED_USER_LAST_NAME=Dev
```

#### Production (.env.production)

```bash
# Seed Profile
MKT_SEED_PROFILE=production

# Workspace
MKT_SEED_WORKSPACE_ID=<your-production-uuid>
MKT_SEED_WORKSPACE_NAME="MKT CRM"
MKT_SEED_WORKSPACE_SUBDOMAIN=mkt

# Admin User - USE STRONG PASSWORD!
MKT_SEED_USER_EMAIL=admin@yourcompany.com
MKT_SEED_USER_PASSWORD=<strong-password-here>
MKT_SEED_USER_FIRST_NAME=System
MKT_SEED_USER_LAST_NAME=Admin
```

---

## 5. Implementation Guide

### 5.1 Bước 1: Tạo Seed Profile Types

**File:** `src/mkt-core/seeder/types/seed-profile.types.ts`

```typescript
/**
 * Seed profile determines which data set to use during database seeding
 */
export enum SeedProfile {
  /** Minimal master data only (organization levels, payment methods, etc.) */
  PRODUCTION = 'production',

  /** Master data + full demo data for development */
  DEVELOPMENT = 'development',

  /** Master data + limited demo data for staging */
  STAGING = 'staging',

  /** Master data + showcase data for customer demos */
  DEMO = 'demo',

  /** No business data seeding - only schema */
  EMPTY = 'empty',
}

export const DEFAULT_SEED_PROFILE = SeedProfile.DEVELOPMENT;

/**
 * Validate seed profile from string
 */
export const parseSeedProfile = (value: string | undefined): SeedProfile => {
  if (!value) {
    return DEFAULT_SEED_PROFILE;
  }

  const normalized = value.toLowerCase().trim();

  if (Object.values(SeedProfile).includes(normalized as SeedProfile)) {
    return normalized as SeedProfile;
  }

  console.warn(
    `Invalid MKT_SEED_PROFILE: "${value}". Using default: ${DEFAULT_SEED_PROFILE}`,
  );

  return DEFAULT_SEED_PROFILE;
};
```

### 5.2 Bước 2: Tạo Seed Config Service

**File:** `src/mkt-core/seeder/services/seed-config.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v5 as uuidv5 } from 'uuid';

import {
  SeedProfile,
  parseSeedProfile,
} from 'src/mkt-core/seeder/types/seed-profile.types';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace
const DEFAULT_PASSWORD_SALT_ROUNDS = 10;

export interface SeedWorkspaceConfig {
  id: string;
  displayName: string;
  subdomain: string;
  inviteHash: string;
}

export interface SeedUserConfig {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface SeedConfig {
  profile: SeedProfile;
  workspace: SeedWorkspaceConfig;
  user: SeedUserConfig;
}

@Injectable()
export class SeedConfigService {
  private config: SeedConfig | null = null;

  /**
   * Get seed configuration from environment variables
   */
  async getConfig(): Promise<SeedConfig> {
    if (this.config) {
      return this.config;
    }

    const profile = parseSeedProfile(process.env.MKT_SEED_PROFILE);

    const workspaceId =
      process.env.MKT_SEED_WORKSPACE_ID ||
      '20202020-1c25-4d02-bf25-6aeccf7ea419';

    const userEmail = process.env.MKT_SEED_USER_EMAIL || 'admin@mkt.dev';
    const userId =
      process.env.MKT_SEED_USER_ID || this.generateUserId(workspaceId);

    const password = process.env.MKT_SEED_USER_PASSWORD || 'Admin@123456';
    const passwordHash = await this.hashPassword(password);

    this.config = {
      profile,
      workspace: {
        id: workspaceId,
        displayName: process.env.MKT_SEED_WORKSPACE_NAME || 'MKT CRM',
        subdomain: process.env.MKT_SEED_WORKSPACE_SUBDOMAIN || 'mkt',
        inviteHash: `${process.env.MKT_SEED_WORKSPACE_SUBDOMAIN || 'mkt'}-invite-hash`,
      },
      user: {
        id: userId,
        email: userEmail,
        passwordHash,
        firstName: process.env.MKT_SEED_USER_FIRST_NAME || 'Admin',
        lastName: process.env.MKT_SEED_USER_LAST_NAME || 'User',
      },
    };

    return this.config;
  }

  /**
   * Get seed profile
   */
  getProfile(): SeedProfile {
    return parseSeedProfile(process.env.MKT_SEED_PROFILE);
  }

  /**
   * Check if should seed demo data
   */
  shouldSeedDemoData(): boolean {
    const profile = this.getProfile();

    return [SeedProfile.DEVELOPMENT, SeedProfile.DEMO].includes(profile);
  }

  /**
   * Check if should seed any business data
   */
  shouldSeedBusinessData(): boolean {
    const profile = this.getProfile();

    return profile !== SeedProfile.EMPTY;
  }

  /**
   * Generate deterministic user ID from workspace ID
   */
  private generateUserId(workspaceId: string): string {
    return uuidv5(`user-${workspaceId}`, UUID_NAMESPACE);
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, DEFAULT_PASSWORD_SALT_ROUNDS);
  }
}
```

### 5.3 Bước 3: Tạo Data Factories

**File:** `src/mkt-core/seeder/factories/seed-data.factory.ts`

```typescript
import { SeedProfile } from 'src/mkt-core/seeder/types/seed-profile.types';

// Import all seed data
import {
  MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
  MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import {
  MKT_CUSTOMER_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-data-seeds.constants';
// ... other imports

export type RecordSeedConfig = {
  tableName: string;
  pgColumns: string[];
  recordSeeds: Record<string, unknown>[];
};

/**
 * Get master data seeds - always included
 */
export const getMasterDataSeeds = (): RecordSeedConfig[] => [
  {
    tableName: 'mktOrganizationLevel',
    pgColumns: MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
  },
  {
    tableName: 'mktEmploymentStatus',
    pgColumns: MKT_EMPLOYMENT_STATUS_DATA_SEED_COLUMNS,
    recordSeeds: MKT_EMPLOYMENT_STATUS_DATA_SEEDS,
  },
  {
    tableName: 'mktDepartment',
    pgColumns: MKT_DEPARTMENT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DEPARTMENT_DATA_SEEDS,
  },
  {
    tableName: 'mktPaymentMethod',
    pgColumns: MKT_PAYMENT_METHOD_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PAYMENT_METHOD_DATA_SEEDS,
  },
  {
    tableName: 'mktOption',
    pgColumns: MKT_OPTION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_OPTION_DATA_SEEDS,
  },
  {
    tableName: 'mktI18N',
    pgColumns: MKT_I18N_DATA_SEED_COLUMNS,
    recordSeeds: MKT_I18N_DATA_SEEDS,
  },
];

/**
 * Get demo data seeds - only for development/demo profiles
 */
export const getDemoDataSeeds = (): RecordSeedConfig[] => [
  {
    tableName: 'mktCustomer',
    pgColumns: MKT_CUSTOMER_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CUSTOMER_DATA_SEEDS,
  },
  {
    tableName: 'mktTag',
    pgColumns: MKT_TAG_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TAG_DATA_SEEDS,
  },
  {
    tableName: 'mktCustomerTag',
    pgColumns: MKT_CUSTOMER_TAG_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CUSTOMER_TAG_DATA_SEEDS,
  },
  {
    tableName: 'mktOrder',
    pgColumns: MKT_ORDER_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORDER_DATA_SEEDS,
  },
  {
    tableName: 'mktOrderItem',
    pgColumns: MKT_ORDER_ITEM_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORDER_ITEM_DATA_SEEDS,
  },
  // ... other demo data
];

/**
 * Get seeds based on profile
 */
export const getSeedsByProfile = (profile: SeedProfile): RecordSeedConfig[] => {
  switch (profile) {
    case SeedProfile.EMPTY:
      return [];

    case SeedProfile.PRODUCTION:
    case SeedProfile.STAGING:
      return getMasterDataSeeds();

    case SeedProfile.DEMO:
    case SeedProfile.DEVELOPMENT:
    default:
      return [...getMasterDataSeeds(), ...getDemoDataSeeds()];
  }
};
```

### 5.4 Bước 4: Cập nhật seed-workspaces.util.ts

**File:** `src/engine/workspace-manager/dev-seeder/core/utils/seed-workspaces.util.ts`

```typescript
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { DataSource } from 'typeorm';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { SeedWorkspaceConfig } from 'src/mkt-core/seeder/services/seed-config.service';
import { extractVersionMajorMinorPatch } from 'src/utils/version/extract-version-major-minor-patch';

const tableName = 'workspace';

// Legacy constants for backward compatibility
export const SEED_APPLE_WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
export const SEED_YCOMBINATOR_WORKSPACE_ID =
  '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

export type SeedWorkspaceArgs = {
  dataSource: DataSource;
  schemaName: string;
  workspaceId: string;
  appVersion: string | undefined;
  workspaceConfig?: SeedWorkspaceConfig; // NEW: Optional config from env
};

const workspaceSeederFields = [
  'id',
  'displayName',
  'subdomain',
  'inviteHash',
  'logo',
  'activationStatus',
  'version',
  'isTwoFactorAuthenticationEnforced',
] as const satisfies (keyof Workspace)[];

type WorkspaceSeederFields = Pick<
  Workspace,
  (typeof workspaceSeederFields)[number]
>;

// Legacy workspaces for backward compatibility
const LEGACY_WORKSPACES: Record<string, Partial<WorkspaceSeederFields>> = {
  [SEED_APPLE_WORKSPACE_ID]: {
    displayName: 'Apple',
    subdomain: 'apple',
    inviteHash: 'apple.dev-invite-hash',
    logo: 'https://twentyhq.github.io/placeholder-images/workspaces/apple-logo.png',
  },
  [SEED_YCOMBINATOR_WORKSPACE_ID]: {
    displayName: 'YCombinator',
    subdomain: 'yc',
    inviteHash: 'yc.dev-invite-hash',
    logo: 'https://twentyhq.github.io/placeholder-images/workspaces/ycombinator-logo.png',
  },
};

export const seedWorkspaces = async ({
  schemaName,
  dataSource,
  workspaceId,
  appVersion,
  workspaceConfig,
}: SeedWorkspaceArgs) => {
  const version = extractVersionMajorMinorPatch(appVersion);

  // Use config from env if provided, otherwise fall back to legacy
  const legacyConfig = LEGACY_WORKSPACES[workspaceId];
  const config = workspaceConfig || legacyConfig;

  if (!config) {
    throw new Error(
      `No workspace config found for workspaceId: ${workspaceId}. ` +
        `Please set MKT_SEED_WORKSPACE_* environment variables.`,
    );
  }

  const workspaceData: WorkspaceSeederFields = {
    id: workspaceId,
    displayName: config.displayName || 'MKT CRM',
    subdomain: config.subdomain || 'mkt',
    inviteHash: config.inviteHash || `${config.subdomain}-invite-hash`,
    logo: (config as any).logo || null,
    activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    version: version,
    isTwoFactorAuthenticationEnforced: false,
  };

  await dataSource
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.${tableName}`, workspaceSeederFields)
    .orIgnore()
    .values(workspaceData)
    .execute();
};
```

### 5.5 Bước 5: Cập nhật seed-users.util.ts

**File:** `src/engine/workspace-manager/dev-seeder/core/utils/seed-users.util.ts`

```typescript
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

// Legacy users for backward compatibility
const LEGACY_USERS = [
  {
    id: USER_DATA_SEED_IDS.TIM,
    firstName: 'Tim',
    lastName: 'Apple',
    email: 'tim@apple.dev',
    passwordHash:
      '$2a$10$WdsF1UMb6uYho4byxbIkMeYaiFJT.k2ofqb7UTSrR/55AEeGxUWsC',
    canImpersonate: true,
    canAccessFullAdminPanel: true,
    isEmailVerified: true,
  },
  // ... other legacy users
];

export type SeedUsersArgs = {
  dataSource: DataSource;
  schemaName: string;
  userConfig?: SeedUserConfig; // NEW: Optional config from env
  useLegacyUsers?: boolean; // NEW: Flag to include legacy users
};

export const seedUsers = async ({
  dataSource,
  schemaName,
  userConfig,
  useLegacyUsers = false,
}: SeedUsersArgs) => {
  const users: any[] = [];

  // Add user from config if provided
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

  // Add legacy users if requested (for backward compatibility)
  if (useLegacyUsers) {
    users.push(...LEGACY_USERS);
  }

  // If no users to seed, use legacy by default
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
```

### 5.6 Bước 6: Cập nhật DevSeederService

**File:** `src/engine/workspace-manager/dev-seeder/services/dev-seeder.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { SeedConfigService } from 'src/mkt-core/seeder/services/seed-config.service';
// ... other imports

@Injectable()
export class DevSeederService {
  private readonly logger = new Logger(DevSeederService.name);

  constructor(
    private readonly typeORMService: TypeORMService,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly dataSourceService: DataSourceService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly workspaceSyncMetadataService: WorkspaceSyncMetadataService,
    private readonly devSeederMetadataService: DevSeederMetadataService,
    private readonly devSeederPermissionsService: DevSeederPermissionsService,
    private readonly devSeederDataService: DevSeederDataService,
    private readonly seedConfigService: SeedConfigService, // NEW
  ) {}

  public async seedDev(workspaceId?: string): Promise<void> {
    const mainDataSource = this.typeORMService.getMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to workspace data source');
    }

    // Get config from environment
    const config = await this.seedConfigService.getConfig();
    const effectiveWorkspaceId = workspaceId || config.workspace.id;

    this.logger.log(`Seeding with profile: ${config.profile}`);
    this.logger.log(`Workspace ID: ${effectiveWorkspaceId}`);
    this.logger.log(`User email: ${config.user.email}`);

    const isBillingEnabled = this.twentyConfigService.get('IS_BILLING_ENABLED');
    const appVersion = this.twentyConfigService.get('APP_VERSION');

    await seedCoreSchema({
      dataSource: mainDataSource,
      workspaceId: effectiveWorkspaceId,
      seedBilling: isBillingEnabled,
      appVersion,
      workspaceConfig: config.workspace, // NEW
      userConfig: config.user, // NEW
    });

    // ... rest of the method

    await this.devSeederDataService.seed({
      schemaName: dataSourceMetadata.schema,
      workspaceId: effectiveWorkspaceId,
      profile: config.profile, // NEW
    });

    // ...
  }
}
```

### 5.7 Bước 7: Cập nhật DevSeederDataService

**File:** `src/engine/workspace-manager/dev-seeder/data/services/dev-seeder-data.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

import {
  SeedProfile,
  DEFAULT_SEED_PROFILE,
} from 'src/mkt-core/seeder/types/seed-profile.types';
import { getSeedsByProfile } from 'src/mkt-core/seeder/factories/seed-data.factory';
// ... other imports

@Injectable()
export class DevSeederDataService {
  constructor(
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly timelineActivitySeederService: TimelineActivitySeederService,
  ) {}

  public async seed({
    schemaName,
    workspaceId,
    profile = DEFAULT_SEED_PROFILE, // NEW parameter
  }: {
    schemaName: string;
    workspaceId: string;
    profile?: SeedProfile;
  }) {
    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    // Get seeds based on profile
    const mktRecordSeeds = getSeedsByProfile(profile);

    // Combine with standard Twenty seeds (always include)
    const standardSeeds = this.getStandardRecordSeeds();
    const allRecordSeeds = [...standardSeeds, ...mktRecordSeeds];

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        for (const recordSeedsConfig of allRecordSeeds) {
          const objectMetadata = objectMetadataItems.find(
            (item) =>
              computeTableName(item.nameSingular, item.isCustom) ===
              recordSeedsConfig.tableName,
          );

          if (!objectMetadata) {
            continue;
          }

          await this.seedRecords({
            entityManager,
            schemaName,
            tableName: recordSeedsConfig.tableName,
            pgColumns: recordSeedsConfig.pgColumns,
            recordSeeds: recordSeedsConfig.recordSeeds,
          });
        }

        // Timeline activities only for demo profiles
        if (
          profile === SeedProfile.DEVELOPMENT ||
          profile === SeedProfile.DEMO
        ) {
          await this.timelineActivitySeederService.seedTimelineActivities({
            entityManager,
            schemaName,
            workspaceId,
          });
        }

        // Views and favorites
        const viewDefinitionsWithId = await prefillViews(
          entityManager,
          schemaName,
          objectMetadataItems.filter((item) => !item.isCustom),
        );

        await prefillWorkspaceFavorites(
          viewDefinitionsWithId
            .filter(
              (view) =>
                view.key === 'INDEX' &&
                shouldSeedWorkspaceFavorite(
                  view.objectMetadataId,
                  objectMetadataItems,
                ),
            )
            .map((view) => view.id),
          entityManager,
          schemaName,
        );
      },
    );
  }

  private getStandardRecordSeeds() {
    // Return standard Twenty CRM seeds (workspaceMember, company, person, etc.)
    return [
      {
        tableName: 'workspaceMember',
        pgColumns: WORKSPACE_MEMBER_DATA_SEED_COLUMNS,
        recordSeeds: WORKSPACE_MEMBER_DATA_SEEDS,
      },
      // ... other standard seeds
    ];
  }

  // ... rest of methods
}
```

### 5.8 Bước 8: Cập nhật project.json

**File:** `packages/twenty-server/project.json`

```json
{
  "database:reset": {
    "executor": "nx:run-commands",
    "dependsOn": ["build"],
    "configurations": {
      "no-seed": {
        "cwd": "packages/twenty-server",
        "commands": [
          "nx ts-node-no-deps-transpile-only -- ./scripts/truncate-db.ts",
          "nx ts-node-no-deps-transpile-only -- ./scripts/setup-db.ts",
          "nx database:migrate",
          "nx command-no-deps -- cache:flush"
        ],
        "parallel": false
      },
      "seed": {
        "cwd": "packages/twenty-server",
        "commands": [
          "nx ts-node-no-deps-transpile-only -- ./scripts/truncate-db.ts",
          "nx ts-node-no-deps-transpile-only -- ./scripts/setup-db.ts",
          "nx database:migrate",
          "nx command-no-deps -- cache:flush",
          "nx command-no-deps -- workspace:seed:dev"
        ],
        "parallel": false
      },
      "production": {
        "cwd": "packages/twenty-server",
        "env": {
          "MKT_SEED_PROFILE": "production"
        },
        "commands": [
          "nx ts-node-no-deps-transpile-only -- ./scripts/truncate-db.ts",
          "nx ts-node-no-deps-transpile-only -- ./scripts/setup-db.ts",
          "nx database:migrate",
          "nx command-no-deps -- cache:flush",
          "nx command-no-deps -- workspace:seed:dev"
        ],
        "parallel": false
      }
    },
    "defaultConfiguration": "seed"
  }
}
```

---

## 6. Sử dụng

### 6.1 Development (mặc định)

```bash
# Sử dụng cấu hình mặc định - full demo data
npx nx database:reset twenty-server

# Hoặc explicit
MKT_SEED_PROFILE=development npx nx database:reset twenty-server
```

### 6.2 Production (minimal master data)

```bash
# Option 1: Sử dụng configuration
npx nx database:reset twenty-server --configuration=production

# Option 2: Sử dụng biến môi trường
MKT_SEED_PROFILE=production \
MKT_SEED_WORKSPACE_ID=<your-uuid> \
MKT_SEED_WORKSPACE_NAME="Your Company CRM" \
MKT_SEED_USER_EMAIL=admin@yourcompany.com \
MKT_SEED_USER_PASSWORD=<strong-password> \
npx nx database:reset twenty-server
```

### 6.3 No seed (chỉ schema)

```bash
# Không seed bất kỳ data nào
npx nx database:reset twenty-server --configuration=no-seed

# Hoặc
MKT_SEED_PROFILE=empty npx nx database:reset twenty-server
```

### 6.4 Custom workspace và user

```bash
# Full custom configuration
export MKT_SEED_PROFILE=production
export MKT_SEED_WORKSPACE_ID="12345678-1234-1234-1234-123456789abc"
export MKT_SEED_WORKSPACE_NAME="Acme Corp CRM"
export MKT_SEED_WORKSPACE_SUBDOMAIN="acme"
export MKT_SEED_USER_EMAIL="admin@acme.com"
export MKT_SEED_USER_PASSWORD="SecureP@ssw0rd!"
export MKT_SEED_USER_FIRST_NAME="John"
export MKT_SEED_USER_LAST_NAME="Doe"

npx nx database:reset twenty-server
```

---

## 7. Testing & Verification

### 7.1 Verify Seed Profile

```bash
# Check which profile was used
psql -c "SELECT COUNT(*) as customer_count FROM workspace_xxx.\"mktCustomer\""

# Production: customer_count = 0
# Development: customer_count > 0
```

### 7.2 Verify User Credentials

```bash
# Check user was created with correct email
psql -c "SELECT email, \"firstName\", \"lastName\" FROM core.\"user\""
```

### 7.3 Verify Workspace

```bash
# Check workspace was created with correct name
psql -c "SELECT id, \"displayName\", subdomain FROM core.workspace"
```

### 7.4 Test Login

```bash
# Test login với credentials đã cấu hình
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(email: \"admin@mkt.dev\", password: \"Admin@123456\") { accessToken } }"
  }'
```

---

## 8. Migration từ hệ thống cũ

### 8.1 Backward Compatibility

Hệ thống mới hoàn toàn backward compatible:

- Nếu không set biến môi trường → sử dụng cấu hình cũ (tim@apple.dev)
- Nếu `MKT_SEED_PROFILE` không được set → mặc định là `development`
- Commands cũ vẫn hoạt động bình thường

### 8.2 Migration Steps

1. **Phase 1**: Deploy code mới (không ảnh hưởng existing behavior)
2. **Phase 2**: Update .env files với biến mới
3. **Phase 3**: Test với `MKT_SEED_PROFILE=production`
4. **Phase 4**: Rollout to production

### 8.3 Checklist

- [ ] Tạo file `src/mkt-core/seeder/types/seed-profile.types.ts`
- [ ] Tạo file `src/mkt-core/seeder/services/seed-config.service.ts`
- [ ] Tạo file `src/mkt-core/seeder/factories/seed-data.factory.ts`
- [ ] Cập nhật `seed-workspaces.util.ts`
- [ ] Cập nhật `seed-users.util.ts`
- [ ] Cập nhật `dev-seeder.service.ts`
- [ ] Cập nhật `dev-seeder-data.service.ts`
- [ ] Cập nhật `project.json`
- [ ] Thêm `SeedConfigService` vào `DevSeederModule`
- [ ] Cập nhật .env.example
- [ ] Test với các profiles khác nhau
- [ ] Update documentation

---

## Tham khảo

| File | Mô tả |
|------|-------|
| `docs/MKT_PRODUCTION_MASTER_DATA.md` | Hướng dẫn thêm master data |
| `src/mkt-core/seeder/types/seed-profile.types.ts` | Seed profile types |
| `src/mkt-core/seeder/services/seed-config.service.ts` | Config service |
| `src/mkt-core/seeder/factories/seed-data.factory.ts` | Data factory |
| `packages/twenty-server/project.json` | NX target definitions |

---

*Tài liệu được tạo: 2025-12-23*
