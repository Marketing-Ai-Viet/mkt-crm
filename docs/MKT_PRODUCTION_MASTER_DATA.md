# MKT Production Master Data Guide

> Hướng dẫn thêm master data (dữ liệu khởi tạo) cho production trong mkt-core module

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [So sánh Dev Seeding vs Production Prefill](#2-so-sánh-dev-seeding-vs-production-prefill)
3. [Cơ chế MKT_PREFILLS](#3-cơ-chế-mkt_prefills)
4. [Hướng dẫn thêm Master Data mới](#4-hướng-dẫn-thêm-master-data-mới)
5. [Ví dụ thực tế](#5-ví-dụ-thực-tế)
6. [Seed Profiles - Tùy chọn Data khác nhau](#6-seed-profiles---tùy-chọn-data-khác-nhau)
7. [Best Practices](#7-best-practices)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Tổng quan

Trong mkt-core có **hai cơ chế** để seed dữ liệu:

| Cơ chế | Mục đích | Khi nào chạy |
|--------|----------|--------------|
| **Dev Seeding** | Dữ liệu demo cho development | Chỉ khi `npx nx database:reset twenty-server` |
| **Production Prefill** | Master data thực cho production | Khi workspace được activate |

**Master data** là dữ liệu cần thiết để hệ thống hoạt động, ví dụ:
- Organization levels (Director, Manager, Staff...)
- Payment methods (Bank transfer, Cash, Card...)
- Employment statuses (Active, Probation, Resigned...)
- Default templates, options, i18n...

---

## 2. So sánh Dev Seeding vs Production Prefill

### 2.1 Dev Seeding

```
npx nx database:reset twenty-server
    │
    └──▶ workspace:seed:dev
            │
            └──▶ DevSeederDataService.seed()
                    │
                    └──▶ Insert demo data (Companies, People, Opportunities...)
```

**File locations:**
```
packages/twenty-server/src/engine/workspace-manager/dev-seeder/
├── data/
│   └── services/
│       └── dev-seeder-data.service.ts    ← Orchestrator
└── core/
    └── utils/
        └── seed-*.util.ts                 ← Seed functions
```

**Đặc điểm:**
- Chỉ chạy trong development
- Tạo dữ liệu demo (fake data)
- Có thể bỏ qua bằng `--configuration=no-seed`

### 2.2 Production Prefill (MKT_PREFILLS)

```
Workspace Activation
    │
    └──▶ WorkspaceManagerService.init()
            │
            └──▶ prefillWorkspaceWithCustomObjects()
                    │
                    └──▶ MKT_PREFILLS.forEach(prefillFn => prefillFn(entityManager, schema))
```

**File location:**
```
packages/twenty-server/src/mkt-core/workspace-config/mkt-objects-prefill-data.ts
```

**Đặc điểm:**
- Chạy khi workspace được activate (production)
- Tạo master data thực (không phải demo)
- Luôn chạy cho mọi workspace mới

---

## 3. Cơ chế MKT_PREFILLS

### 3.1 Entry Point

**File:** `packages/twenty-server/src/mkt-core/workspace-config/mkt-objects-prefill-data.ts`

```typescript
export const MKT_PREFILLS = [
  // core prefills
  prefillMktOptions,
  prefillMktEmails,
  // report prefills
  prefillMktReports,
  // i18n prefills
  prefillMktI18n,
  // customer prefills
  prefillMktCustomers,
  prefillMktTags,
  prefillMktCustomerTags,
  // generic combo prefills
  prefillMktGenericCombos,
  prefillMktGenericComboItems,
  // order prefills
  prefillMktOrders,
  prefillMktOrderItems,
  prefillMktOrderHistories,
  // promotion prefills
  prefillMktPromotions,
  prefillMktPromotionRules,
  prefillMktCoupons,
  prefillMktPromotionUsages,
  prefillMktPromotionAudits,
  // template prefills
  prefillMktTemplates,
  // contract prefills
  prefillMktContracts,
  // invoice prefills
  prefillMktSInvoiceAuths,
  prefillMktSInvoices,
  prefillMktSInvoicePayments,
  prefillMktSInvoiceItems,
  prefillMktSInvoiceTaxBreakdowns,
  prefillMktSInvoiceMetadata,
  // payment prefills
  prefillMktPaymentMethods,
  prefillMktPayments,
  prefillMktPaymentHistories,
  // organization level prefills
  prefillMktOrganizationLevels,
  prefillMktEmploymentStatuses,
  prefillMktDepartments,
  prefillMktStaffStatusHistories,
  prefillMktKpis,
  prefillMktKpiTemplates,
  // permission prefills (last)
  prefillMktTemporaryPermissions,
  prefillMktDepartmentHierarchies,
  prefillMktDataAccessPolicies,
  prefillMktPermissionAudits,
];
```

### 3.2 Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workspace Activation Flow                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  WorkspaceManagerService.init()                                  │
│  File: src/engine/workspace-manager/workspace-manager.service.ts │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  prefillWorkspaceWithCustomObjects(entityManager, schemaName)    │
│  File: src/engine/workspace-manager/workspace-manager.service.ts │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  for (const prefill of MKT_PREFILLS) {                          │
│    await prefill(entityManager, schemaName);                     │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐      ┌──────────────┐
│prefillMkt    │     │prefillMkt    │      │prefillMkt    │
│Options       │     │Organization  │      │PaymentMethods│
│              │     │Levels        │      │              │
└──────────────┘     └──────────────┘      └──────────────┘
```

### 3.3 Prefill Function Signature

```typescript
type PrefillFunction = (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => Promise<void>;
```

---

## 4. Hướng dẫn thêm Master Data mới

### 4.1 Cấu trúc thư mục

```
packages/twenty-server/src/mkt-core/seeder/
├── constants/                              ← Data definitions
│   ├── mkt-organization-level-data-seeds.constants.ts
│   ├── mkt-payment-method-data-seeds.constants.ts
│   └── mkt-your-entity-data-seeds.constants.ts   ← TẠO MỚI
├── prefill-data/                           ← Prefill functions
│   ├── prefill-mkt-organization-levels.ts
│   ├── prefill-mkt-payment-methods.ts
│   └── prefill-mkt-your-entity.ts          ← TẠO MỚI
└── ...
```

### 4.2 Bước 1: Tạo file constants (Data definition)

**File:** `src/mkt-core/seeder/constants/mkt-product-category-data-seeds.constants.ts`

```typescript
// 1. Define type cho data
type MktProductCategoryDataSeed = {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  parentId?: string | null;
  displayOrder: number;
  isActive: boolean;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

// 2. Define columns array (phải match với type)
export const MKT_PRODUCT_CATEGORY_DATA_SEED_COLUMNS: (keyof MktProductCategoryDataSeed)[] = [
  'id',
  'code',
  'name',
  'nameEn',
  'description',
  'parentId',
  'displayOrder',
  'isActive',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

// 3. Define fixed IDs (để reference được trong các entity khác)
export const MKT_PRODUCT_CATEGORY_DATA_SEEDS_IDS = {
  SOFTWARE: 'a1b2c3d4-1111-2222-3333-444455556666',
  LICENSE: 'a1b2c3d4-1111-2222-3333-444455557777',
  SERVICE: 'a1b2c3d4-1111-2222-3333-444455558888',
  HARDWARE: 'a1b2c3d4-1111-2222-3333-444455559999',
};

// 4. Define data array
export const MKT_PRODUCT_CATEGORY_DATA_SEEDS: MktProductCategoryDataSeed[] = [
  {
    id: MKT_PRODUCT_CATEGORY_DATA_SEEDS_IDS.SOFTWARE,
    code: 'SOFTWARE',
    name: 'Phần mềm',
    nameEn: 'Software',
    description: 'Các sản phẩm phần mềm',
    parentId: null,
    displayOrder: 1,
    isActive: true,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_PRODUCT_CATEGORY_DATA_SEEDS_IDS.LICENSE,
    code: 'LICENSE',
    name: 'Giấy phép',
    nameEn: 'License',
    description: 'Các loại license và subscription',
    parentId: MKT_PRODUCT_CATEGORY_DATA_SEEDS_IDS.SOFTWARE, // Parent = SOFTWARE
    displayOrder: 2,
    isActive: true,
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_PRODUCT_CATEGORY_DATA_SEEDS_IDS.SERVICE,
    code: 'SERVICE',
    name: 'Dịch vụ',
    nameEn: 'Service',
    description: 'Các dịch vụ hỗ trợ và tư vấn',
    parentId: null,
    displayOrder: 3,
    isActive: true,
    position: 3,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_PRODUCT_CATEGORY_DATA_SEEDS_IDS.HARDWARE,
    code: 'HARDWARE',
    name: 'Phần cứng',
    nameEn: 'Hardware',
    description: 'Các thiết bị phần cứng',
    parentId: null,
    displayOrder: 4,
    isActive: true,
    position: 4,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];
```

### 4.3 Bước 2: Tạo file prefill function

**File:** `src/mkt-core/seeder/prefill-data/prefill-mkt-product-categories.ts`

```typescript
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PRODUCT_CATEGORY_DATA_SEED_COLUMNS,
  MKT_PRODUCT_CATEGORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-product-category-data-seeds.constants';

export const prefillMktProductCategories = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  // Skip nếu không có data
  if (MKT_PRODUCT_CATEGORY_DATA_SEEDS.length === 0) {
    return;
  }

  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true, // Bypass RBAC khi seeding
    })
    .insert()
    .into(
      `${schemaName}.mktProductCategory`, // Table name (camelCase của entity)
      MKT_PRODUCT_CATEGORY_DATA_SEED_COLUMNS,
    )
    .values(MKT_PRODUCT_CATEGORY_DATA_SEEDS)
    .execute();
};
```

### 4.4 Bước 3: Đăng ký vào MKT_PREFILLS

**File:** `src/mkt-core/workspace-config/mkt-objects-prefill-data.ts`

```typescript
// 1. Import prefill function
import { prefillMktProductCategories } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-product-categories';

export const MKT_PREFILLS = [
  // core prefills
  prefillMktOptions,
  prefillMktEmails,
  // ...existing prefills...

  // product prefills (thêm vào đây)
  prefillMktProductCategories,  // ← THÊM MỚI

  // permission prefills (should be last)
  prefillMktTemporaryPermissions,
  prefillMktDepartmentHierarchies,
  prefillMktDataAccessPolicies,
  prefillMktPermissionAudits,
];
```

### 4.5 Bước 4: Verify WorkspaceEntity

Đảm bảo WorkspaceEntity đã tồn tại với table name chính xác:

**File:** `src/mkt-core/product/workspace-entities/mkt-product-category.workspace-entity.ts`

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktProductCategory,
  namePlural: 'mktProductCategories',
  labelSingular: 'Product Category',
  labelPlural: 'Product Categories',
  icon: 'IconCategory',
})
export class MktProductCategoryWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktProductCategory.code,
    type: FieldMetadataType.TEXT,
    label: 'Code',
    icon: 'IconHash',
  })
  code: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktProductCategory.name,
    type: FieldMetadataType.TEXT,
    label: 'Name',
    icon: 'IconTag',
  })
  name: string;

  // ... other fields
}
```

---

## 5. Ví dụ thực tế

### 5.1 Organization Levels

**Constants:** `mkt-organization-level-data-seeds.constants.ts`

```typescript
export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS = {
  DIRECTOR: '0835587e-9dc0-47db-857d-da6caae06c83',
  MANAGER: '9c0a6ee6-4f5b-4f41-b1b5-32fe7a84ab59',
  TEAM_LEAD: 'a401d801-f3d8-4973-91f2-89537e743daa',
  SENIOR_STAFF: 'f915d505-807d-4025-91ca-4874bd6ea384',
  JUNIOR_STAFF: '80d70621-831b-468b-86b7-18110808b4a6',
};

export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS = [
  {
    id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
    levelCode: 'DIRECTOR',
    levelName: 'Giám đốc',
    levelNameEn: 'Director',
    description: 'Cấp quản lý cao nhất',
    hierarchyLevel: 1,
    parentLevelId: null,
    defaultPermissions: PERMISSION_TEMPLATES.DIRECTOR.defaultPermissions,
    accessLimitations: PERMISSION_TEMPLATES.DIRECTOR.accessLimitations,
    displayOrder: 1,
    isActive: true,
    position: 1,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },
  // ... more levels
];
```

**Prefill:** `prefill-mkt-organization-levels.ts`

```typescript
export const prefillMktOrganizationLevels = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktOrganizationLevel`,
      MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
    )
    .values(MKT_ORGANIZATION_LEVEL_DATA_SEEDS)
    .execute();
};
```

### 5.2 Payment Methods

**Constants:** `mkt-payment-method-data-seeds.constants.ts`

```typescript
export const MKT_PAYMENT_METHOD_DATA_SEEDS_IDS = {
  BANK_TRANSFER: '11111111-2222-3333-4444-555566667777',
  CASH: '11111111-2222-3333-4444-555566668888',
  CARD: '11111111-2222-3333-4444-555566669999',
};

export const MKT_PAYMENT_METHOD_DATA_SEEDS = [
  {
    id: MKT_PAYMENT_METHOD_DATA_SEEDS_IDS.BANK_TRANSFER,
    code: 'BANK_TRANSFER',
    name: 'Chuyển khoản ngân hàng',
    nameEn: 'Bank Transfer',
    isActive: true,
    // ...
  },
  // ...
];
```

---

## 6. Seed Profiles - Tùy chọn Data khác nhau

### 6.1 Vấn đề

Hiện tại tất cả workspaces đều nhận **cùng một bộ data**. Trong thực tế, bạn cần:

| Môi trường | Nhu cầu |
|------------|---------|
| **Development** | Demo data đầy đủ để test |
| **Staging** | Data giống production nhưng ít hơn |
| **Production** | Chỉ master data tối thiểu |
| **Demo** | Data showcase cho khách hàng |

### 6.2 Giải pháp: Seed Profile Pattern

#### Bước 1: Tạo enum SeedProfile

**File:** `src/mkt-core/seeder/types/seed-profile.types.ts`

```typescript
/**
 * Seed profile determines which data set to use
 */
export enum SeedProfile {
  /** Minimal master data only (organization levels, payment methods, etc.) */
  PRODUCTION = 'production',

  /** Master data + sample demo data */
  DEVELOPMENT = 'development',

  /** Master data + realistic demo data for staging */
  STAGING = 'staging',

  /** Master data + showcase data for demos */
  DEMO = 'demo',

  /** No data seeding */
  EMPTY = 'empty',
}

export type SeedProfileConfig = {
  profile: SeedProfile;
  /** Override specific entities */
  overrides?: {
    [entityName: string]: 'skip' | 'minimal' | 'full';
  };
};
```

#### Bước 2: Tạo Data Factory cho mỗi entity

**File:** `src/mkt-core/seeder/factories/mkt-organization-level.factory.ts`

```typescript
import { SeedProfile } from '../types/seed-profile.types';
import {
  MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
  MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
  MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS,
} from '../constants/mkt-organization-level-data-seeds.constants';

// Minimal data for production
const PRODUCTION_DATA = [
  {
    id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
    levelCode: 'DIRECTOR',
    levelName: 'Giám đốc',
    levelNameEn: 'Director',
    hierarchyLevel: 1,
    parentLevelId: null,
    isActive: true,
    // ... minimal fields
  },
  {
    id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
    levelCode: 'MANAGER',
    levelName: 'Quản lý',
    levelNameEn: 'Manager',
    hierarchyLevel: 2,
    parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
    isActive: true,
  },
  {
    id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.STAFF,
    levelCode: 'STAFF',
    levelName: 'Nhân viên',
    levelNameEn: 'Staff',
    hierarchyLevel: 3,
    parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
    isActive: true,
  },
];

// Full data for development (existing data)
const DEVELOPMENT_DATA = MKT_ORGANIZATION_LEVEL_DATA_SEEDS;

// Demo data with more levels
const DEMO_DATA = [
  ...PRODUCTION_DATA,
  // Add more levels for demo purposes
  {
    id: '...',
    levelCode: 'VP',
    levelName: 'Phó Giám đốc',
    levelNameEn: 'Vice President',
    hierarchyLevel: 1,
    parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
    isActive: true,
  },
];

/**
 * Factory function to get data based on profile
 */
export const getOrganizationLevelData = (profile: SeedProfile) => {
  switch (profile) {
    case SeedProfile.EMPTY:
      return { columns: [], data: [] };

    case SeedProfile.PRODUCTION:
      return {
        columns: MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
        data: PRODUCTION_DATA,
      };

    case SeedProfile.STAGING:
      return {
        columns: MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
        data: PRODUCTION_DATA, // Same as production for staging
      };

    case SeedProfile.DEMO:
      return {
        columns: MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
        data: DEMO_DATA,
      };

    case SeedProfile.DEVELOPMENT:
    default:
      return {
        columns: MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
        data: DEVELOPMENT_DATA,
      };
  }
};
```

#### Bước 3: Tạo Profile-aware Prefill Function

**File:** `src/mkt-core/seeder/prefill-data/prefill-mkt-organization-levels.ts`

```typescript
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { SeedProfile } from '../types/seed-profile.types';
import { getOrganizationLevelData } from '../factories/mkt-organization-level.factory';

export const prefillMktOrganizationLevels = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
  profile: SeedProfile = SeedProfile.DEVELOPMENT, // Default profile
) => {
  const { columns, data } = getOrganizationLevelData(profile);

  // Skip if empty profile or no data
  if (data.length === 0) {
    return;
  }

  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktOrganizationLevel`, columns)
    .values(data)
    .orIgnore()
    .execute();
};
```

#### Bước 4: Cập nhật MKT_PREFILLS để nhận Profile

**File:** `src/mkt-core/workspace-config/mkt-objects-prefill-data.ts`

```typescript
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { SeedProfile } from 'src/mkt-core/seeder/types/seed-profile.types';

// Import profile-aware prefill functions
import { prefillMktOrganizationLevels } from '../seeder/prefill-data/prefill-mkt-organization-levels';
import { prefillMktPaymentMethods } from '../seeder/prefill-data/prefill-mkt-payment-methods';
// ... other imports

/**
 * Type for profile-aware prefill function
 */
type PrefillFunction = (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
  profile: SeedProfile,
) => Promise<void>;

/**
 * Get prefills array based on profile
 */
export const getMktPrefills = (profile: SeedProfile): PrefillFunction[] => {
  // Base prefills that always run (master data)
  const basePrefills: PrefillFunction[] = [
    prefillMktOptions,
    prefillMktOrganizationLevels,
    prefillMktPaymentMethods,
    prefillMktEmploymentStatuses,
  ];

  // Skip demo data for production
  if (profile === SeedProfile.PRODUCTION || profile === SeedProfile.EMPTY) {
    return basePrefills;
  }

  // Add demo data prefills for dev/staging/demo
  const demoPrefills: PrefillFunction[] = [
    prefillMktCustomers,
    prefillMktOrders,
    prefillMktPayments,
    // ... other demo data
  ];

  return [...basePrefills, ...demoPrefills];
};

/**
 * Legacy export for backward compatibility
 * Uses DEVELOPMENT profile by default
 */
export const MKT_PREFILLS = getMktPrefills(SeedProfile.DEVELOPMENT);
```

#### Bước 5: Cập nhật WorkspaceManagerService

**File:** `src/engine/workspace-manager/workspace-manager.service.ts`

```typescript
import { SeedProfile } from 'src/mkt-core/seeder/types/seed-profile.types';
import { getMktPrefills } from 'src/mkt-core/workspace-config/mkt-objects-prefill-data';

@Injectable()
export class WorkspaceManagerService {
  async init(params: {
    workspaceId: string;
    userId: string;
    seedProfile?: SeedProfile; // Add optional profile parameter
  }) {
    const profile = params.seedProfile ?? this.getDefaultProfile();

    // ... existing init logic ...

    // Prefill with profile
    await this.prefillWorkspaceWithCustomObjects(
      entityManager,
      schemaName,
      profile,
    );
  }

  private getDefaultProfile(): SeedProfile {
    // Determine profile from environment
    const env = process.env.NODE_ENV || 'development';
    const profileOverride = process.env.MKT_SEED_PROFILE;

    if (profileOverride) {
      return profileOverride as SeedProfile;
    }

    switch (env) {
      case 'production':
        return SeedProfile.PRODUCTION;
      case 'staging':
        return SeedProfile.STAGING;
      default:
        return SeedProfile.DEVELOPMENT;
    }
  }

  private async prefillWorkspaceWithCustomObjects(
    entityManager: WorkspaceEntityManager,
    schemaName: string,
    profile: SeedProfile,
  ) {
    const prefills = getMktPrefills(profile);

    for (const prefill of prefills) {
      await prefill(entityManager, schemaName, profile);
    }
  }
}
```

### 6.3 Cách sử dụng

#### Option 1: Environment Variable

```bash
# .env.production
MKT_SEED_PROFILE=production

# .env.development
MKT_SEED_PROFILE=development

# .env.staging
MKT_SEED_PROFILE=staging
```

#### Option 2: Command Line

```bash
# Development với full demo data
npx nx database:reset twenty-server

# Production với minimal master data
MKT_SEED_PROFILE=production npx nx database:reset twenty-server

# Empty (chỉ tables, không data)
MKT_SEED_PROFILE=empty npx nx database:reset twenty-server
```

#### Option 3: Programmatic

```typescript
// Tạo workspace với profile cụ thể
await workspaceManagerService.init({
  workspaceId: 'xxx',
  userId: 'yyy',
  seedProfile: SeedProfile.DEMO,
});
```

### 6.4 Cấu trúc thư mục đề xuất

```
src/mkt-core/seeder/
├── types/
│   └── seed-profile.types.ts          ← Profile enum & types
├── constants/                          ← Raw data definitions
│   ├── mkt-organization-level-data-seeds.constants.ts
│   └── ...
├── factories/                          ← Profile-aware data factories
│   ├── mkt-organization-level.factory.ts
│   ├── mkt-payment-method.factory.ts
│   └── ...
├── prefill-data/                       ← Prefill functions (use factories)
│   ├── prefill-mkt-organization-levels.ts
│   └── ...
└── profiles/                           ← Profile configurations
    ├── production.profile.ts
    ├── development.profile.ts
    ├── staging.profile.ts
    └── demo.profile.ts
```

### 6.5 Advanced: Profile Configuration File

**File:** `src/mkt-core/seeder/profiles/production.profile.ts`

```typescript
import { SeedProfileConfig } from '../types/seed-profile.types';

export const PRODUCTION_PROFILE: SeedProfileConfig = {
  profile: SeedProfile.PRODUCTION,
  entities: {
    // Master data - always seed
    mktOrganizationLevel: { mode: 'minimal', required: true },
    mktPaymentMethod: { mode: 'minimal', required: true },
    mktEmploymentStatus: { mode: 'minimal', required: true },

    // Business data - skip for production
    mktCustomer: { mode: 'skip' },
    mktOrder: { mode: 'skip' },
    mktPayment: { mode: 'skip' },

    // Optional master data
    mktTemplate: { mode: 'minimal', required: false },
  },
};
```

**File:** `src/mkt-core/seeder/profiles/development.profile.ts`

```typescript
export const DEVELOPMENT_PROFILE: SeedProfileConfig = {
  profile: SeedProfile.DEVELOPMENT,
  entities: {
    // Master data - full
    mktOrganizationLevel: { mode: 'full', required: true },
    mktPaymentMethod: { mode: 'full', required: true },

    // Demo data - full
    mktCustomer: { mode: 'full' },
    mktOrder: { mode: 'full' },
    mktPayment: { mode: 'full' },
  },
};
```

### 6.6 Migration từ cấu trúc hiện tại

```typescript
// TRƯỚC: Hardcoded data
export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS = [
  { id: '...', levelCode: 'DIRECTOR', ... },
  { id: '...', levelCode: 'MANAGER', ... },
  // ... tất cả data trong một array
];

// SAU: Factory pattern
export const getOrganizationLevelData = (profile: SeedProfile) => {
  const BASE_DATA = [
    { id: '...', levelCode: 'DIRECTOR', ... },
    { id: '...', levelCode: 'MANAGER', ... },
  ];

  const DEMO_DATA = [
    { id: '...', levelCode: 'INTERN', ... },
    // ... thêm data cho demo
  ];

  switch (profile) {
    case SeedProfile.PRODUCTION:
      return BASE_DATA;
    case SeedProfile.DEVELOPMENT:
      return [...BASE_DATA, ...DEMO_DATA];
    default:
      return BASE_DATA;
  }
};
```

---

## 7. Best Practices

### 7.1 ID Management

```typescript
// ✅ ĐÚNG: Sử dụng fixed UUID
export const MKT_CATEGORY_IDS = {
  SOFTWARE: 'a1b2c3d4-1111-2222-3333-444455556666',
  HARDWARE: 'a1b2c3d4-1111-2222-3333-444455557777',
};

// ❌ SAI: Generate random UUID
export const MKT_CATEGORY_IDS = {
  SOFTWARE: uuidv4(), // Mỗi lần seed sẽ khác nhau!
};
```

**Lý do:**
- Fixed UUID cho phép reference giữa các entity
- Consistent across all workspaces
- Dễ debug và maintain

### 7.2 Dependency Order

```typescript
export const MKT_PREFILLS = [
  // 1. Core/Config (không dependencies)
  prefillMktOptions,
  prefillMktI18n,

  // 2. Independent entities
  prefillMktTags,
  prefillMktPaymentMethods,

  // 3. Entities có FK đến entities trước đó
  prefillMktCustomers,        // Có thể reference Tags
  prefillMktOrders,           // Reference Customers
  prefillMktPayments,         // Reference Orders, PaymentMethods

  // 4. Audit/History (luôn cuối cùng)
  prefillMktPermissionAudits,
];
```

### 7.3 Idempotency

```typescript
// Option 1: Check exists trước khi insert
export const prefillMktProductCategories = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  // Check if already seeded
  const existing = await entityManager.query(
    `SELECT COUNT(*) FROM "${schemaName}"."mktProductCategory"`
  );

  if (parseInt(existing[0].count) > 0) {
    return; // Already seeded
  }

  await entityManager
    .createQueryBuilder(...)
    .insert()
    .values(MKT_PRODUCT_CATEGORY_DATA_SEEDS)
    .execute();
};

// Option 2: Sử dụng ON CONFLICT (PostgreSQL)
export const prefillMktProductCategories = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(...)
    .insert()
    .values(MKT_PRODUCT_CATEGORY_DATA_SEEDS)
    .orIgnore() // Skip nếu id đã tồn tại
    .execute();
};
```

### 7.4 Localization

```typescript
export const MKT_CATEGORY_DATA_SEEDS = [
  {
    id: '...',
    name: 'Phần mềm',        // Vietnamese (default)
    nameEn: 'Software',      // English
    nameJa: 'ソフトウェア',   // Japanese (nếu cần)
    // ...
  },
];
```

### 7.5 Audit Fields

```typescript
{
  // ...business fields...

  // Audit fields (required)
  createdBySource: 'SYSTEM',           // 'SYSTEM', 'MANUAL', 'IMPORT'
  createdByWorkspaceMemberId: null,    // null for system seed
  createdByName: 'System',             // Display name
}
```

---

## 8. Troubleshooting

### 8.1 Lỗi: "Column does not exist"

**Nguyên nhân:** Column trong data không match với WorkspaceEntity

**Giải pháp:**
```typescript
// 1. Check WorkspaceEntity có field đó không
@WorkspaceField({
  standardId: MKT_FIELD_IDS.xxx.columnName,
  type: FieldMetadataType.TEXT,
  label: 'Column Name',
})
columnName: string;

// 2. Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f
```

### 8.2 Lỗi: "Duplicate key value"

**Nguyên nhân:** Data đã được seed trước đó

**Giải pháp:**
```typescript
// Option 1: Xóa data cũ
DELETE FROM workspace_xxx."mktProductCategory";

// Option 2: Sử dụng orIgnore()
.orIgnore()

// Option 3: Check before insert
const count = await entityManager.query('SELECT COUNT(*)...');
if (count > 0) return;
```

### 8.3 Lỗi: "Foreign key violation"

**Nguyên nhân:** Parent entity chưa được seed

**Giải pháp:**
```typescript
// Đảm bảo thứ tự trong MKT_PREFILLS đúng
export const MKT_PREFILLS = [
  prefillMktProductCategories,  // Parent trước
  prefillMktProducts,           // Child sau (FK đến Category)
];
```

### 8.4 Lỗi: "Permission denied"

**Nguyên nhân:** Không bypass permission checks

**Giải pháp:**
```typescript
await entityManager
  .createQueryBuilder(undefined, undefined, undefined, {
    shouldBypassPermissionChecks: true,  // ← Thêm option này
  })
  .insert()
  // ...
```

### 8.5 Testing Prefill

```bash
# 1. Reset database
npx nx database:reset twenty-server --configuration=no-seed

# 2. Tạo workspace mới qua API hoặc UI
# (Khi activate, MKT_PREFILLS sẽ chạy)

# 3. Verify data
psql -c "SELECT * FROM workspace_xxx.\"mktProductCategory\""
```

---

## Tham khảo

| File | Mô tả |
|------|-------|
| `src/mkt-core/workspace-config/mkt-objects-prefill-data.ts` | MKT_PREFILLS array |
| `src/mkt-core/workspace-config/mkt-dev-seeder-data.config.ts` | Dev seeder configuration |
| `src/mkt-core/seeder/constants/` | Data seed definitions |
| `src/mkt-core/seeder/prefill-data/` | Prefill functions |
| `src/mkt-core/seeder/types/` | Seed profile types (đề xuất) |
| `src/mkt-core/seeder/factories/` | Data factories (đề xuất) |
| `src/engine/workspace-manager/workspace-manager.service.ts` | Workspace init flow |
| `src/engine/workspace-manager/dev-seeder/data/services/dev-seeder-data.service.ts` | Dev seeder service |

---

*Tài liệu được tạo: 2025-12-21*
