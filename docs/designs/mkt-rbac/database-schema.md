# RBAC Database Schema Design v2.0

## 📋 Mục Lục
- [1. Tổng Quan](#1-tổng-quan)
- [2. Entity Analysis - Hiện Trạng vs Thiết Kế](#2-entity-analysis---hiện-trạng-vs-thiết-kế)
- [3. Core Permission Tables](#3-core-permission-tables)
- [4. Data Access Policy Tables](#4-data-access-policy-tables)
- [5. Temporary & Override Tables](#5-temporary--override-tables)
- [6. Audit & Monitoring Tables](#6-audit--monitoring-tables)
- [7. Refactoring Plan](#7-refactoring-plan)
- [8. Entity Migration Checklist](#8-entity-migration-checklist)

---

## 1. Tổng Quan

### 1.1. Mục đích
Tài liệu này mô tả chi tiết database schema cho hệ thống Enterprise RBAC v2.0, bao gồm:
- Phân tích hiện trạng các entities đã có
- So sánh với thiết kế trong authorization-design-v2.md
- Đề xuất các thay đổi cần thiết
- Hướng dẫn di chuyển entities về module RBAC

### 1.2. Database hiện tại

**Tables đang tồn tại trong workspace schema:**

| Table | Status | Location |
|-------|--------|----------|
| `mktDataAccessPolicy` | ✅ Exists | `mkt-data-access-policy/` |
| `mktPermissionAudit` | ✅ Exists | `mkt-permission-audit/` |
| `mktTemporaryPermission` | ✅ Exists (DB only) | No workspace entity file |
| `mktPermissionTemplate` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktPermissionAction` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktPermissionResource` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktUserPermissionTemplate` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktUserPermissionOverride` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktTemplateResourcePermission` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktTemplateSystemAction` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktTemplateAccessLimitation` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktPermissionContext` | ✅ Exists | `mkt-permission-template/entities/` |
| `mktPermissionPriorityConfig` | ✅ Exists | `mkt-permission-template/entities/` |

---

## 2. Entity Analysis - Hiện Trạng vs Thiết Kế

### 2.1. mktPermissionTemplate

**Hiện trạng:**
```typescript
// Đã có các fields:
- templateKey: string
- templateName: string
- description?: string
- hierarchyLevel: number
- applicableToLevels: number[]
- version: string
- isSystemTemplate: boolean
- isActive: boolean
- priority: number
- createdBySource: string
- lastModifiedBy?: string
- lastModifiedAt?: Date
- position?: number

// Relationships:
- resourcePermissions: MktTemplateResourcePermissionWorkspaceEntity[]
- systemActions: MktTemplateSystemActionWorkspaceEntity[]
- accessLimitations: MktTemplateAccessLimitationWorkspaceEntity[]
- dataAccessPolicies: MktDataAccessPolicyWorkspaceEntity[]
- userAssignments: MktUserPermissionTemplateWorkspaceEntity[]
```

**Thiết kế yêu cầu (theo authorization-design-v2.md):**
```sql
-- Cần thêm các fields:
- templateType TEXT -- ROLE_BASED | HIERARCHY_BASED | DEPARTMENT_BASED | CUSTOM
- departmentType TEXT -- EXECUTIVE, ENGINEERING, SALES, etc.
- organizationLevelId UUID REFERENCES "mktOrganizationLevel"(id)
- resolutionStrategy TEXT DEFAULT 'PRIORITY_BASED' -- PRIORITY_BASED | MOST_RESTRICTIVE | MOST_PERMISSIVE
- effectiveFrom TIMESTAMPTZ
- effectiveTo TIMESTAMPTZ
- metadata JSONB
- createdById UUID REFERENCES "workspaceMember"(id)
```

**Đánh giá:** 🟡 Cần bổ sung fields

---

### 2.2. mktPermissionAction

**Hiện trạng:** Kiểm tra entity hiện tại

**Thiết kế yêu cầu:**
```sql
- permissionTemplateId UUID NOT NULL REFERENCES "mktPermissionTemplate"(id)
- actionKey TEXT NOT NULL -- CREATE | READ | UPDATE | DELETE | APPROVE | EXPORT
- actionCategory TEXT NOT NULL -- BASIC_CRUD | ADVANCED | APPROVAL | SYSTEM | BULK_OPERATIONS
- riskLevel TEXT DEFAULT 'LOW' -- LOW | MEDIUM | HIGH | CRITICAL
- maxRecords INTEGER -- For bulk operations
- maxAmount NUMERIC(15,2) -- For financial actions
- requiresApproval BOOLEAN DEFAULT false
- requiresJustification BOOLEAN DEFAULT false
- conditions JSONB
- isActive BOOLEAN DEFAULT true
```

---

### 2.3. mktPermissionResource

**Hiện trạng:** Kiểm tra entity hiện tại

**Thiết kế yêu cầu:**
```sql
- permissionTemplateId UUID NOT NULL REFERENCES "mktPermissionTemplate"(id)
- resourceKey TEXT NOT NULL -- ORDERS | CUSTOMERS | USERS | DEPARTMENTS
- resourceType TEXT NOT NULL -- BUSINESS_DATA | FINANCIAL | USER_MGMT | SYSTEM_CONFIG | REPORTING
- resourceCategory TEXT
- allowedFields TEXT[] -- Specific fields allowed (NULL = all)
- deniedFields TEXT[] -- Specific fields denied
- filterConditions JSONB -- Row-level security conditions
- confidentialityLevel TEXT DEFAULT 'INTERNAL' -- PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED | TOP_SECRET
- requiresSpecialClearance BOOLEAN DEFAULT false
- isActive BOOLEAN DEFAULT true
```

---

### 2.4. mktDataAccessPolicy

**Hiện trạng:**
```typescript
// Đã có các fields:
- name: string
- description?: string
- department?: MktDepartmentWorkspaceEntity (relation)
- departmentId?: string
- specificMember?: WorkspaceMemberWorkspaceEntity (relation)
- specificMemberId?: string
- objectName: string
- filterConditions: object
- priority?: number
- isActive?: boolean
- position: number
```

**Thiết kế yêu cầu (enhancements):**
```sql
-- Cần thêm các fields:
- policyType TEXT DEFAULT 'ROW_LEVEL' -- ROW_LEVEL | FIELD_LEVEL | COLUMN_LEVEL
- evaluationMode TEXT DEFAULT 'STRICT' -- STRICT | PERMISSIVE | BALANCED
- riskLevel TEXT DEFAULT 'LOW' -- LOW | MEDIUM | HIGH | CRITICAL
- conflictResolution TEXT DEFAULT 'DENY_WINS' -- DENY_WINS | ALLOW_WINS | HIGHEST_PRIORITY

-- Cần thêm relation với mktPermissionTemplate:
- permissionTemplateId UUID REFERENCES "mktPermissionTemplate"(id)
```

**Đánh giá:** 🟡 Cần bổ sung fields và relation

---

### 2.5. mktTemporaryPermission

**Hiện trạng:**
```sql
-- Đã có trong database:
- objectName TEXT NOT NULL
- recordId UUID
- canRead BOOLEAN DEFAULT false
- canUpdate BOOLEAN DEFAULT false
- canDelete BOOLEAN DEFAULT false
- expiresAt TIMESTAMPTZ NOT NULL
- reason TEXT NOT NULL
- purpose TEXT
- isActive BOOLEAN DEFAULT true
- revokedAt TIMESTAMPTZ
- revokeReason TEXT
- granterWorkspaceMemberId UUID
- granteeWorkspaceMemberId UUID
- revokedById UUID
```

**⚠️ Vấn đề:** Không có workspace entity file!

**Cần tạo:** `mkt-temporary-permission/mkt-temporary-permission.workspace-entity.ts`

---

### 2.6. mktUserPermissionOverride

**Hiện trạng:**
```typescript
// Đã có các fields:
- workspaceMember: WorkspaceMemberWorkspaceEntity (relation)
- workspaceMemberId: string
- resource: MktPermissionResourceWorkspaceEntity (relation)
- resourceId: string
- action: MktPermissionActionWorkspaceEntity (relation)
- actionId: string
- isAllowed: boolean
- contextFilter?: object
- expiresAt?: Date
- reason: string (SELECT)
- reasonDescription?: string
- approvedBy?: WorkspaceMemberWorkspaceEntity (relation)
- approvedById?: string
- approvedAt?: Date
- isActive: boolean
- position?: number
```

**Thiết kế yêu cầu (enhancements):**
```sql
-- Cần thêm các fields:
- resourceKey TEXT NOT NULL -- Direct key reference
- actionKey TEXT NOT NULL -- Direct key reference
- overrideType TEXT NOT NULL -- GRANT | DENY (thay thế isAllowed)
- effectiveFrom TIMESTAMPTZ DEFAULT NOW()
- effectiveTo TIMESTAMPTZ -- thay thế expiresAt
- conditions JSONB -- thay thế contextFilter
- approvalDate TIMESTAMPTZ -- thay thế approvedAt
```

**Đánh giá:** 🟡 Cần điều chỉnh field names để match với design

---

### 2.7. mktPermissionAudit

**Hiện trạng:**
```typescript
// Đã có các fields:
- workspaceMember: WorkspaceMemberWorkspaceEntity (relation)
- workspaceMemberId: string
- userId?: string
- action: PermissionAction (SELECT)
- objectName: string
- recordId?: string
- permissionSource?: PermissionSource (SELECT)
- checkResult: CheckResult (SELECT)
- denialReason?: string
- requestContext?: object
- ipAddress?: string
- userAgent?: string
- checkDurationMs?: number
- position: number
```

**Thiết kế yêu cầu (enhancements):**
```sql
-- Cần thêm các fields:
- validationMode TEXT -- SIMPLIFIED | FULL
- stepResults JSONB -- Step-by-step results
- cacheHit BOOLEAN
- executionPath TEXT

-- Cần thêm indexes:
- CREATE INDEX idx_permission_audit_result_time ON "mktPermissionAudit"("checkResult", "createdAt");
- CREATE INDEX idx_permission_audit_user_action ON "mktPermissionAudit"("workspaceMemberId", "action", "createdAt");
- CREATE INDEX idx_permission_audit_denial ON "mktPermissionAudit"("checkResult", "denialReason") WHERE "checkResult" = 'FAIL';
```

**Đánh giá:** 🟡 Cần bổ sung fields và indexes

---

## 3. Core Permission Tables

### 3.1. mktPermissionTemplate

```sql
CREATE TABLE "mktPermissionTemplate" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template identification
  "name" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "templateType" TEXT NOT NULL, -- ROLE_BASED | HIERARCHY_BASED | DEPARTMENT_BASED | CUSTOM

  -- Applicability
  "hierarchyLevel" INTEGER, -- 1-11 (NULL = all levels)
  "departmentType" TEXT, -- EXECUTIVE, ENGINEERING, SALES, etc.
  "organizationLevelId" UUID REFERENCES "mktOrganizationLevel"(id),

  -- Priority & resolution
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
  "resolutionStrategy" TEXT DEFAULT 'PRIORITY_BASED', -- PRIORITY_BASED | MOST_RESTRICTIVE | MOST_PERMISSIVE

  -- Status
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMPTZ,
  "effectiveTo" TIMESTAMPTZ,

  -- Metadata
  "version" TEXT DEFAULT '1.0.0',
  "metadata" JSONB,

  -- Audit fields
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ,
  "createdById" UUID REFERENCES "workspaceMember"(id)
);

-- Indexes
CREATE INDEX idx_permission_template_key ON "mktPermissionTemplate"("templateKey", "deletedAt");
CREATE INDEX idx_permission_template_hierarchy ON "mktPermissionTemplate"("hierarchyLevel", "isActive");
CREATE INDEX idx_permission_template_department ON "mktPermissionTemplate"("departmentType", "isActive");
```

### 3.2. mktPermissionAction

```sql
CREATE TABLE "mktPermissionAction" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template reference
  "permissionTemplateId" UUID NOT NULL REFERENCES "mktPermissionTemplate"(id) ON DELETE CASCADE,

  -- Action definition
  "actionKey" TEXT NOT NULL, -- CREATE | READ | UPDATE | DELETE | APPROVE | EXPORT, etc.
  "actionCategory" TEXT NOT NULL, -- BASIC_CRUD | ADVANCED | APPROVAL | SYSTEM | BULK_OPERATIONS
  "riskLevel" TEXT NOT NULL DEFAULT 'LOW', -- LOW | MEDIUM | HIGH | CRITICAL

  -- Constraints
  "maxRecords" INTEGER, -- For bulk operations
  "maxAmount" NUMERIC(15,2), -- For financial actions
  "requiresApproval" BOOLEAN DEFAULT false,
  "requiresJustification" BOOLEAN DEFAULT false,

  -- Conditions
  "conditions" JSONB, -- Dynamic conditions for this action

  -- Status
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_permission_action_template ON "mktPermissionAction"("permissionTemplateId", "deletedAt");
CREATE INDEX idx_permission_action_key ON "mktPermissionAction"("actionKey", "isActive");
```

### 3.3. mktPermissionResource

```sql
CREATE TABLE "mktPermissionResource" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template reference
  "permissionTemplateId" UUID NOT NULL REFERENCES "mktPermissionTemplate"(id) ON DELETE CASCADE,

  -- Resource definition
  "resourceKey" TEXT NOT NULL, -- ORDERS | CUSTOMERS | USERS | DEPARTMENTS, etc.
  "resourceType" TEXT NOT NULL, -- BUSINESS_DATA | FINANCIAL | USER_MGMT | SYSTEM_CONFIG | REPORTING
  "resourceCategory" TEXT, -- BUSINESS_DATA | FINANCIAL_DATA | SYSTEM_DATA, etc.

  -- Access control
  "allowedFields" TEXT[], -- Specific fields allowed (NULL = all fields)
  "deniedFields" TEXT[], -- Specific fields denied
  "filterConditions" JSONB, -- Row-level security conditions

  -- Classification
  "confidentialityLevel" TEXT DEFAULT 'INTERNAL', -- PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED | TOP_SECRET
  "requiresSpecialClearance" BOOLEAN DEFAULT false,

  -- Status
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_permission_resource_template ON "mktPermissionResource"("permissionTemplateId", "deletedAt");
CREATE INDEX idx_permission_resource_key ON "mktPermissionResource"("resourceKey", "isActive");
CREATE INDEX idx_permission_resource_type ON "mktPermissionResource"("resourceType", "confidentialityLevel");
```

### 3.4. mktUserPermissionTemplate

```sql
CREATE TABLE "mktUserPermissionTemplate" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User & Template
  "workspaceMemberId" UUID NOT NULL REFERENCES "workspaceMember"(id) ON DELETE CASCADE,
  "permissionTemplateId" UUID NOT NULL REFERENCES "mktPermissionTemplate"(id) ON DELETE CASCADE,

  -- Assignment context
  "assignedBy" UUID REFERENCES "workspaceMember"(id),
  "assignmentReason" TEXT,
  "assignmentType" TEXT DEFAULT 'DIRECT', -- DIRECT | INHERITED | TEMPORARY

  -- Validity
  "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "effectiveTo" TIMESTAMPTZ, -- NULL = permanent

  -- Override
  "overrideTemplateSettings" BOOLEAN DEFAULT false,
  "customPermissions" JSONB, -- Override specific permissions

  -- Status
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ,

  -- Constraints
  UNIQUE("workspaceMemberId", "permissionTemplateId", "deletedAt")
);

-- Indexes
CREATE INDEX idx_user_permission_template_member ON "mktUserPermissionTemplate"("workspaceMemberId", "isActive");
CREATE INDEX idx_user_permission_template_template ON "mktUserPermissionTemplate"("permissionTemplateId", "isActive");
CREATE INDEX idx_user_permission_template_validity ON "mktUserPermissionTemplate"("effectiveFrom", "effectiveTo");
```

---

## 4. Data Access Policy Tables

### 4.1. mktDataAccessPolicy (Enhanced)

```sql
-- Table đã tồn tại, thêm các column mới
ALTER TABLE "mktDataAccessPolicy"
  ADD COLUMN IF NOT EXISTS "policyType" TEXT DEFAULT 'ROW_LEVEL', -- ROW_LEVEL | FIELD_LEVEL | COLUMN_LEVEL
  ADD COLUMN IF NOT EXISTS "evaluationMode" TEXT DEFAULT 'STRICT', -- STRICT | PERMISSIVE | BALANCED
  ADD COLUMN IF NOT EXISTS "riskLevel" TEXT DEFAULT 'LOW', -- LOW | MEDIUM | HIGH | CRITICAL
  ADD COLUMN IF NOT EXISTS "conflictResolution" TEXT DEFAULT 'DENY_WINS'; -- DENY_WINS | ALLOW_WINS | HIGHEST_PRIORITY

-- Enhanced indexes
CREATE INDEX IF NOT EXISTS idx_data_access_policy_type ON "mktDataAccessPolicy"("policyType", "isActive");
CREATE INDEX IF NOT EXISTS idx_data_access_policy_object ON "mktDataAccessPolicy"("objectName", "priority");
```

---

## 5. Temporary & Override Tables

### 5.1. mktTemporaryPermission (Enhanced Indexes)

```sql
-- Table đã tồn tại, thêm indexes để tối ưu query
CREATE INDEX IF NOT EXISTS idx_temp_permission_validity
  ON "mktTemporaryPermission"("expiresAt", "isActive")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_temp_permission_grantee_active
  ON "mktTemporaryPermission"("granteeWorkspaceMemberId", "isActive", "expiresAt")
  WHERE "deletedAt" IS NULL AND "revokedAt" IS NULL;
```

### 5.2. mktUserPermissionOverride

```sql
CREATE TABLE "mktUserPermissionOverride" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User reference
  "workspaceMemberId" UUID NOT NULL REFERENCES "workspaceMember"(id) ON DELETE CASCADE,

  -- Override target
  "resourceKey" TEXT NOT NULL, -- Which resource to override
  "actionKey" TEXT NOT NULL, -- Which action to override
  "overrideType" TEXT NOT NULL, -- GRANT | DENY

  -- Override context
  "reason" TEXT NOT NULL,
  "approvedBy" UUID REFERENCES "workspaceMember"(id),
  "approvalDate" TIMESTAMPTZ,

  -- Validity
  "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "effectiveTo" TIMESTAMPTZ, -- NULL = permanent

  -- Conditions
  "conditions" JSONB, -- Additional conditions for this override

  -- Status
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_user_override_member ON "mktUserPermissionOverride"("workspaceMemberId", "isActive");
CREATE INDEX idx_user_override_resource_action ON "mktUserPermissionOverride"("resourceKey", "actionKey", "isActive");
CREATE INDEX idx_user_override_validity ON "mktUserPermissionOverride"("effectiveFrom", "effectiveTo");
```

---

## 6. Audit & Monitoring Tables

### 6.1. mktPermissionAudit (Enhanced)

```sql
-- Table đã tồn tại, thêm các column mới
ALTER TABLE "mktPermissionAudit"
  ADD COLUMN IF NOT EXISTS "validationMode" TEXT, -- SIMPLIFIED | FULL
  ADD COLUMN IF NOT EXISTS "stepResults" JSONB, -- Step-by-step results
  ADD COLUMN IF NOT EXISTS "cacheHit" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "executionPath" TEXT;

-- Enhanced indexes
CREATE INDEX IF NOT EXISTS idx_permission_audit_result_time
  ON "mktPermissionAudit"("checkResult", "createdAt");

CREATE INDEX IF NOT EXISTS idx_permission_audit_user_action
  ON "mktPermissionAudit"("workspaceMemberId", "action", "createdAt");

CREATE INDEX IF NOT EXISTS idx_permission_audit_denial
  ON "mktPermissionAudit"("checkResult", "denialReason")
  WHERE "checkResult" = 'FAIL';
```

---

## 7. Refactoring Plan

### 7.1. Modules Structure Đề Xuất

```
packages/twenty-server/src/mkt-core/
├── mkt-rbac-enterprise-grade/         # RBAC Core Module
│   ├── constants/
│   ├── decorators/
│   ├── guards/
│   ├── services/
│   ├── validators/
│   └── workspace-entities/            # 👈 DI CHUYỂN TẤT CẢ ENTITIES VÀO ĐÂY
│       ├── mkt-permission-template.workspace-entity.ts
│       ├── mkt-permission-action.workspace-entity.ts
│       ├── mkt-permission-resource.workspace-entity.ts
│       ├── mkt-user-permission-template.workspace-entity.ts
│       ├── mkt-user-permission-override.workspace-entity.ts
│       ├── mkt-template-resource-permission.workspace-entity.ts
│       ├── mkt-template-system-action.workspace-entity.ts
│       ├── mkt-template-access-limitation.workspace-entity.ts
│       ├── mkt-permission-context.workspace-entity.ts
│       ├── mkt-permission-priority-config.workspace-entity.ts
│       ├── mkt-data-access-policy.workspace-entity.ts
│       ├── mkt-temporary-permission.workspace-entity.ts  # 👈 TẠO MỚI
│       ├── mkt-permission-audit.workspace-entity.ts
│       └── index.ts
│
├── mkt-permission-template/           # 👈 DEPRECATED - Move to mkt-rbac-enterprise-grade
│   ├── entities/                      # Move to workspace-entities above
│   ├── constants/                     # Move to mkt-rbac-enterprise-grade/constants
│   └── types/                         # Move to mkt-rbac-enterprise-grade/types
│
├── mkt-data-access-policy/            # 👈 DEPRECATED - Move entity only
│   └── mkt-data-access-policy.workspace-entity.ts  # Move to workspace-entities above
│
├── mkt-permission-audit/              # 👈 DEPRECATED - Move entity only
│   └── mkt-permission-audit.workspace-entity.ts    # Move to workspace-entities above
```

### 7.2. Migration Steps

#### Phase 1: Tạo mkt-temporary-permission workspace entity
```bash
# Tạo file mới
touch packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/mkt-temporary-permission.workspace-entity.ts
```

#### Phase 2: Di chuyển entities
1. Tạo folder `workspace-entities` trong `mkt-rbac-enterprise-grade`
2. Copy từng entity file
3. Update imports
4. Update index.ts exports
5. Test compilation

#### Phase 3: Update entity fields
1. Thêm các fields mới theo thiết kế
2. Thêm các constants (SELECT options)
3. Thêm indexes với `@WorkspaceIndex`
4. Run `npx nx typecheck twenty-server`

#### Phase 4: Database migration
1. Generate migration: `npx nx run twenty-server:typeorm migration:generate`
2. Review migration file
3. Run migration: `npx nx run twenty-server:database:migrate:prod`

---

## 8. Entity Migration Checklist

### 8.1. Entities cần TẠO MỚI

| Entity | File Path | Priority |
|--------|-----------|----------|
| `MktTemporaryPermissionWorkspaceEntity` | `workspace-entities/mkt-temporary-permission.workspace-entity.ts` | 🔴 HIGH |

### 8.2. Entities cần CẬP NHẬT

| Entity | Changes Needed | Priority |
|--------|----------------|----------|
| `MktPermissionTemplateWorkspaceEntity` | Add: templateType, departmentType, organizationLevelId, resolutionStrategy, effectiveFrom, effectiveTo, metadata, createdById | 🟡 MEDIUM |
| `MktDataAccessPolicyWorkspaceEntity` | Add: policyType, evaluationMode, riskLevel, conflictResolution, permissionTemplateId (relation) | 🟡 MEDIUM |
| `MktPermissionAuditWorkspaceEntity` | Add: validationMode, stepResults, cacheHit, executionPath | 🟢 LOW |
| `MktUserPermissionOverrideWorkspaceEntity` | Rename fields để match với design (optional) | 🟢 LOW |

### 8.3. Entities cần DI CHUYỂN

| Entity | From | To |
|--------|------|-----|
| All permission template entities | `mkt-permission-template/entities/` | `mkt-rbac-enterprise-grade/workspace-entities/` |
| `MktDataAccessPolicyWorkspaceEntity` | `mkt-data-access-policy/` | `mkt-rbac-enterprise-grade/workspace-entities/` |
| `MktPermissionAuditWorkspaceEntity` | `mkt-permission-audit/` | `mkt-rbac-enterprise-grade/workspace-entities/` |

### 8.4. Indexes cần THÊM

```typescript
// Trong mkt-data-access-policy.workspace-entity.ts
@WorkspaceIndex(['policyType', 'isActive'], { indexWhereClause: '"deletedAt" IS NULL' })
@WorkspaceIndex(['objectName', 'priority'], { indexWhereClause: '"deletedAt" IS NULL' })

// Trong mkt-temporary-permission.workspace-entity.ts
@WorkspaceIndex(['expiresAt', 'isActive'], { indexWhereClause: '"deletedAt" IS NULL' })
@WorkspaceIndex(['granteeWorkspaceMemberId', 'isActive', 'expiresAt'], { 
  indexWhereClause: '"deletedAt" IS NULL AND "revokedAt" IS NULL' 
})

// Trong mkt-permission-audit.workspace-entity.ts
@WorkspaceIndex(['checkResult', 'createdAt'], { indexWhereClause: '"deletedAt" IS NULL' })
@WorkspaceIndex(['workspaceMemberId', 'action', 'createdAt'], { indexWhereClause: '"deletedAt" IS NULL' })
```

---

## Constants & Enums

### Permission Template Types
```typescript
export enum PermissionTemplateType {
  ROLE_BASED = 'ROLE_BASED',
  HIERARCHY_BASED = 'HIERARCHY_BASED',
  DEPARTMENT_BASED = 'DEPARTMENT_BASED',
  CUSTOM = 'CUSTOM',
}
```

### Resolution Strategies
```typescript
export enum ResolutionStrategy {
  PRIORITY_BASED = 'PRIORITY_BASED',
  MOST_RESTRICTIVE = 'MOST_RESTRICTIVE',
  MOST_PERMISSIVE = 'MOST_PERMISSIVE',
}
```

### Data Access Policy Types
```typescript
export enum PolicyType {
  ROW_LEVEL = 'ROW_LEVEL',
  FIELD_LEVEL = 'FIELD_LEVEL',
  COLUMN_LEVEL = 'COLUMN_LEVEL',
}

export enum EvaluationMode {
  STRICT = 'STRICT',
  PERMISSIVE = 'PERMISSIVE',
  BALANCED = 'BALANCED',
}

export enum ConflictResolution {
  DENY_WINS = 'DENY_WINS',
  ALLOW_WINS = 'ALLOW_WINS',
  HIGHEST_PRIORITY = 'HIGHEST_PRIORITY',
}
```

### Confidentiality Levels
```typescript
export enum ConfidentialityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}
```

### Risk Levels
```typescript
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
```

### Action Categories
```typescript
export enum ActionCategory {
  BASIC_CRUD = 'BASIC_CRUD',
  ADVANCED = 'ADVANCED',
  APPROVAL = 'APPROVAL',
  SYSTEM = 'SYSTEM',
  BULK_OPERATIONS = 'BULK_OPERATIONS',
}
```

### Override Types
```typescript
export enum OverrideType {
  GRANT = 'GRANT',
  DENY = 'DENY',
}
```

### Assignment Types
```typescript
export enum AssignmentType {
  DIRECT = 'DIRECT',
  INHERITED = 'INHERITED',
  TEMPORARY = 'TEMPORARY',
}
```

### Validation Modes
```typescript
export enum ValidationMode {
  SIMPLIFIED = 'SIMPLIFIED',
  FULL = 'FULL',
}
```

---

*Document version: 1.0*
*Last updated: 2026-01-08*
*Extracted from: authorization-design-v2.md Section 5*
