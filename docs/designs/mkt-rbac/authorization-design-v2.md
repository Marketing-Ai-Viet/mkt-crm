# Thiết Kế Hệ Thống Phân Quyền Enterprise RBAC v2.0

## 📋 Mục Lục
- [1. Tổng Quan](#1-tổng-quan)
- [2. Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)
- [3. Authorization Semantics & Precedence](#3-authorization-semantics--precedence)
- [4. Multi-Tenancy & Workspace Isolation](#4-multi-tenancy--workspace-isolation)
- [5. Database Schema](#5-database-schema)
- [6. Validation Pipeline](#6-validation-pipeline)
- [7. Permission Template System](#7-permission-template-system)
- [8. Department Hierarchy Integration](#8-department-hierarchy-integration)
- [9. Data Access Policy & Sensitive Data](#9-data-access-policy--sensitive-data)
- [10. GraphQL Integration](#10-graphql-integration)
- [11. Cache Strategy](#11-cache-strategy)
- [12. Performance & Monitoring](#12-performance--monitoring)
- [13. Migration & Deployment](#13-migration--deployment)
- [14. Testing & Quality Gates](#14-testing--quality-gates)
- [15. Operational Runbooks](#15-operational-runbooks)

---

## 1. Tổng Quan

### 1.1. Objectives

Xây dựng hệ thống phân quyền enterprise-grade cho Twenty CRM với các mục tiêu:

- **Hybrid Authorization**: Kết hợp RBAC (role-based) và ABAC (attribute-based)
- **GraphQL Native**: Tích hợp sâu với GraphQL resolvers, directives và context
- **Field-Level Control**: Phân quyền chi tiết đến từng field trong GraphQL schema
- **Department Hierarchy**: Hỗ trợ phân quyền dựa trên cây phòng ban
- **Performance**: Hỗ trợ 6000+ concurrent users với caching thông minh
- **Flexibility**: Chế độ SIMPLIFIED (5-step) và FULL (15-step) validation

### 1.2. Core Concepts

#### RBAC Layer (Role-Based Access Control)
- Phân quyền theo vai trò (Role)
- Phân quyền theo cấp bậc tổ chức (Hierarchy Level: 1-11)
- Permission Template cho các module (mktOrder, mktCustomer, ...)
- Cache-enabled cho performance cao

#### ABAC Layer (Attribute-Based Access Control)
- Phân quyền dựa trên Department/Team
- Phân quyền dựa trên Data Classification (PUBLIC, INTERNAL, CONFIDENTIAL, ...)
- Dynamic Conditions (time, location, device)
- Row-level và field-level security

#### GraphQL Integration
- Custom directives: `@Permission`, `@RequirePermission`
- Context-based authorization trong resolvers
- Field-level filtering tự động
- Query/Mutation/Subscription protection

### 1.3. Technology Stack

| Component | Technology |
|-----------|------------|
| Authorization Engine | Custom 15-Step Validation Pipeline |
| GraphQL | Apollo Server + NestJS GraphQL |
| Database | PostgreSQL (policy storage) |
| Cache | Redis (permission & result cache) |
| ORM | TypeORM |
| Framework | NestJS |
| Language | TypeScript |

---

## 2. Kiến Trúc Hệ Thống

### 2.1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                          │
│                     (GraphQL Query/Mutation)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APOLLO SERVER / NestJS                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Context Builder                                          │ │
│  │  - Extract JWT & user info                              │ │
│  │  - Load workspace context                               │ │
│  │  - Build authorization context                          │ │
│  └────────────────────────┬──────────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GRAPHQL DIRECTIVES                           │
│  @Permission(resource, action) - Method/Class decorator         │
│  @RequirePermission(resource, action) - GraphQL directive       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              ENTERPRISE RBAC GUARD (NestJS Guard)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Extract permission metadata (@Permission decorator)    │  │
│  │ 2. Build EnhancedPermissionContext                       │  │
│  │ 3. Call ValidationOrchestratorService                    │  │
│  │ 4. Handle validation result (allow/deny)                 │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            VALIDATION ORCHESTRATOR SERVICE                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Mode Selection                                           │  │
│  │ ├─ SIMPLIFIED Mode (5 steps)                            │  │
│  │ │   └─ Basic CRUD permissions only                      │  │
│  │ └─ FULL Mode (15 steps)                                 │  │
│  │     └─ Enterprise features (hierarchy, policy, etc)     │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌─────────────────────┐              ┌──────────────────────┐
│  SIMPLIFIED MODE    │              │    FULL MODE         │
│   (5 Steps)         │              │   (15 Steps)         │
├─────────────────────┤              ├──────────────────────┤
│ 1. Pre-validation   │              │ 1. Pre-validation    │
│ 2. User Context     │              │ 2. User Context      │
│ 3. Resource ID      │              │ 3. Resource ID       │
│ 4. Template Check   │              │ 4. Template Check    │
│ 5. Action Validation│              │ 5. Action Validation │
│                     │              │ 6. Resource Perm     │
│                     │              │ 7. Hierarchy Check   │
│                     │              │ 8. Data Policy       │
│                     │              │ 9. Special Perms     │
│                     │              │ 10. Sensitive Data   │
│                     │              │ 11. Dept Restrict    │
│                     │              │ 12. Dynamic Cond     │
│                     │              │ 13. Cache/Perf       │
│                     │              │ 14. Audit Logging    │
│                     │              │ 15. Final Decision   │
└──────────┬──────────┘              └──────────┬───────────┘
           │                                    │
           └────────────────┬───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION STEPS                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Step 1: Pre-validation Service                          │ │
│  │  Step 2: User Context Resolution Service                 │ │
│  │  Step 3: Resource Identification Service                 │ │
│  │  Step 4: Permission Template Check Service               │ │
│  │  Step 5: Action Permission Validation Service            │ │
│  │  Step 6: Resource Permission Check Service (FULL only)   │ │
│  │  Step 7: Hierarchy Validation Service (FULL only)        │ │
│  │  Step 8: Data Access Policy Check Service (FULL only)    │ │
│  │  Step 9: Special Permissions Service (FULL only)         │ │
│  │  Step 10: Sensitive Data Checks Service (FULL only)      │ │
│  │  Step 11: Department Restrictions Service (FULL only)    │ │
│  │  Step 12: Dynamic Conditions Service (FULL only)         │ │
│  │  Step 13: Cache Performance Service (FULL only)          │ │
│  │  Step 14: Audit Logging Service (FULL only)              │ │
│  │  Step 15: Final Decision Service (FULL only)             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌────────────┐
│  PostgreSQL  │  │   Redis     │  │  TypeORM   │
│  (Policies)  │  │  (Cache)    │  │ (Entities) │
└──────────────┘  └─────────────┘  └────────────┘
```

### 2.2. Component Layers

#### Layer 1: Request Layer
- GraphQL Query/Mutation từ client
- JWT token extraction
- Workspace context resolution

#### Layer 2: Directive & Guard Layer
- `@Permission` decorator (method/class level)
- `EnterpriseRbacGuard` (NestJS guard)
- Permission metadata extraction

#### Layer 3: Orchestration Layer
- `ValidationOrchestratorService`
- Mode selection (SIMPLIFIED vs FULL)
- Execution plan generation
- Parallel/Sequential execution

#### Layer 4: Validation Steps Layer
- 15 independent validation services
- Step dependencies management
- Context enrichment
- Result aggregation

#### Layer 5: Data Layer
- PostgreSQL: Policies, templates, audit logs
- Redis: Permission cache, user context cache
- TypeORM: Entity management

### 2.3. Validation Modes

#### SIMPLIFIED Mode (Default)
**Use case**: Basic CRUD operations, standard modules

**Steps** (5 total):
1. Pre-validation (request validation)
2. User Context Resolution (load user + department)
3. Resource Identification (identify target resource)
4. Permission Template Check (check module permissions)
5. Action Validation (validate CRUD action)

**Performance**: ~50-100ms average
**Cache**: Aggressive caching (5-minute TTL)

#### FULL Mode
**Use case**: Financial data, sensitive operations, complex workflows

**Steps** (15 total): All validation steps enabled

**Performance**: ~200-500ms average
**Cache**: Selective caching with shorter TTL

**Environment Variable**:
```bash
RBAC_VALIDATION_MODE=SIMPLIFIED  # or FULL
```

---

## 3. Authorization Semantics & Precedence

### 3.1. Precedence Order

Khi có nhiều policies và permissions áp dụng cho cùng một request, hệ thống tuân theo thứ tự ưu tiên sau (từ cao xuống thấp):

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRECEDENCE ORDER                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Emergency Access (highest priority)                         │
│     └─ Bypass tất cả các rule, chỉ admin với approval           │
│                                                                 │
│  2. User Permission Override (mktUserPermissionOverride)        │
│     └─ Explicit GRANT hoặc DENY cho user cụ thể                 │
│                                                                 │
│  3. Temporary Permission (mktTemporaryPermission)               │
│     └─ Temporary elevation với thời hạn                         │
│                                                                 │
│  4. Deny Policies (DENY_WINS principle)                         │
│     └─ Bất kỳ DENY nào đều block access                         │
│                                                                 │
│  5. Explicit Template Allow/Deny                                │
│     └─ Permission từ assigned templates                         │
│                                                                 │
│  6. Department Rules                                            │
│     └─ Department-based restrictions                            │
│                                                                 │
│  7. ABAC Conditions                                             │
│     └─ Time, location, device conditions                        │
│                                                                 │
│  8. Default: DENY (lowest priority)                             │
│     └─ Deny-by-default nếu không có explicit allow              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Conflict Resolution Rules

#### Rule 1: DENY Always Wins
```typescript
// Nếu bất kỳ policy nào DENY, kết quả là DENY
const resolveConflict = (policies: PolicyResult[]): 'ALLOW' | 'DENY' => {
  const hasDeny = policies.some(p => p.action === 'DENY')
  if (hasDeny) return 'DENY'

  const hasAllow = policies.some(p => p.action === 'ALLOW')
  return hasAllow ? 'ALLOW' : 'DENY' // Default DENY
}
```

#### Rule 2: Override > Template > Inherited
```typescript
const precedenceOrder = ['OVERRIDE', 'TEMPLATE', 'INHERITED', 'DEFAULT']

const resolveBySource = (permissions: Permission[]): Permission => {
  return permissions.sort((a, b) =>
    precedenceOrder.indexOf(a.source) - precedenceOrder.indexOf(b.source)
  )[0]
}
```

#### Rule 3: Specific > General
```typescript
// Quyền cụ thể hơn có ưu tiên cao hơn
// mktOrder.UPDATE.12345 > mktOrder.UPDATE.* > mktOrder.*.*

const specificityScore = (permission: Permission): number => {
  let score = 0
  if (permission.recordId !== '*') score += 100
  if (permission.action !== '*') score += 10
  if (permission.resource !== '*') score += 1
  return score
}
```

### 3.3. skipValidation Behavior

| Decorator Level | skipValidation=true | Behavior |
|-----------------|---------------------|----------|
| Class | Yes | Skip validation cho TẤT CẢ methods trong class |
| Method | Yes | Skip validation CHỈ cho method đó |
| Method (với Class) | Yes | Method override class setting |

```typescript
// Example: Class-level skip có thể bị override bởi method
@Permission({ resource: 'public', action: 'READ', skipValidation: true })
export class PublicResolver {
  // Kế thừa skipValidation: true
  @Query(() => PublicData)
  getPublicData() { }

  // Override: bắt buộc validate
  @Mutation(() => SecureAction)
  @Permission({ resource: 'secure', action: 'CREATE', skipValidation: false })
  createSecureAction() { }
}
```

---

## 4. Multi-Tenancy & Workspace Isolation

### 4.1. Workspace Scoping Invariant

**Critical Invariant**: Mọi resource access PHẢI được scoped theo workspace hiện tại. Không được phép cross-workspace access trừ khi có explicit system-level permission.

### 4.2. Workspace Validation trong Pipeline

#### Step 1 & 2 Enhancement: Workspace Validation
```typescript
// Thêm validation trong Step 1 (Pre-validation) và Step 2 (User Context)
const validateWorkspaceIsolation = async (
  context: EnhancedPermissionContext
): Promise<ValidationResult> => {
  const { workspaceId } = context.userContext
  const { recordId, objectName } = context.resourceContext

  // 1. Validate user belongs to workspace
  const userWorkspace = await getUserWorkspace(context.userContext.workspaceMemberId)
  if (userWorkspace !== workspaceId) {
    return {
      result: 'FAIL',
      reason: 'User does not belong to active workspace',
      code: 'WORKSPACE_MISMATCH'
    }
  }

  // 2. Validate resource belongs to workspace (if recordId provided)
  if (recordId) {
    const resourceWorkspace = await getResourceWorkspace(objectName, recordId)
    if (resourceWorkspace && resourceWorkspace !== workspaceId) {
      return {
        result: 'FAIL',
        reason: 'Resource does not belong to active workspace',
        code: 'CROSS_WORKSPACE_DENIED'
      }
    }
  }

  return { result: 'PASS', reason: 'Workspace validation passed' }
}
```

### 4.3. Cache Key Scoping

**Tất cả cache keys PHẢI bao gồm workspaceId**:

```typescript
const WORKSPACE_SCOPED_CACHE_KEYS = {
  // Format: rbac:{workspaceId}:permission:{userId}:{action}:{resource}
  permissionResult: (ctx: PermissionContext) =>
    `rbac:${ctx.userContext.workspaceId}:permission:${ctx.userContext.workspaceMemberId}:${ctx.action}:${ctx.resourceContext.objectName}`,

  // Format: rbac:{workspaceId}:user:{userId}
  userContext: (workspaceId: string, userId: string) =>
    `rbac:${workspaceId}:user:${userId}`,

  // Format: rbac:{workspaceId}:template:{userId}
  userTemplates: (workspaceId: string, userId: string) =>
    `rbac:${workspaceId}:template:${userId}`,

  // Format: rbac:{workspaceId}:policy:{objectName}
  dataPolicy: (workspaceId: string, objectName: string) =>
    `rbac:${workspaceId}:policy:${objectName}`
}
```

### 4.4. Database Query Scoping

```typescript
// Tất cả queries PHẢI include workspaceId filter
const getPermissionTemplates = async (
  workspaceId: string,
  userId: string
): Promise<PermissionTemplate[]> => {
  return templateRepository.find({
    where: {
      workspaceId, // REQUIRED filter
      isActive: true,
      // ... other conditions
    }
  })
}

// Audit writes PHẢI include workspace context
const writeAuditLog = async (
  context: EnhancedPermissionContext,
  result: ValidationResult
) => {
  await auditRepository.insert({
    workspaceId: context.userContext.workspaceId, // REQUIRED
    workspaceMemberId: context.userContext.workspaceMemberId,
    // ... other fields
  })
}
```

---

## 5. Database Schema

### 5.1. Core Permission Tables

#### 5.1.1. mktPermissionTemplate
**Mục đích**: Lưu trữ permission template cho từng module

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

#### 5.1.2. mktPermissionAction
**Mục đích**: Định nghĩa các action được phép cho template

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

#### 5.1.3. mktPermissionResource
**Mục đích**: Định nghĩa các resource (module) được phép truy cập

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

#### 5.1.4. mktUserPermissionTemplate
**Mục đích**: Gán template cho user/workspace member

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

### 5.2. Data Access Policy Tables

#### 5.2.1. mktDataAccessPolicy (Existing - Enhanced)
**Mục đích**: Row-level security policies

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

### 5.3. Temporary & Override Tables

#### 5.3.1. mktTemporaryPermission (Existing - Enhanced)
**Mục đích**: Temporary permission elevation

```sql
-- Table đã tồn tại, đã có đầy đủ các field cần thiết
-- Thêm index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_temp_permission_validity
  ON "mktTemporaryPermission"("expiresAt", "isActive")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_temp_permission_grantee_active
  ON "mktTemporaryPermission"("granteeWorkspaceMemberId", "isActive", "expiresAt")
  WHERE "deletedAt" IS NULL AND "revokedAt" IS NULL;
```

#### 5.3.2. mktUserPermissionOverride
**Mục đích**: Override specific permissions for a user

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

### 5.4. Audit & Monitoring Tables

#### 5.4.1. mktPermissionAudit (Existing - Enhanced)
**Mục đích**: Audit log for permission checks

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

## 6. Validation Pipeline

### 6.1. Validation Flow Overview

```
Request → Guard → Orchestrator → [Mode Selection] → Steps → Result
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                   SIMPLIFIED                        FULL
                   (5 steps)                     (15 steps)
                   ~50-100ms                     ~200-500ms
```

### 6.2. Step Descriptions

#### Step 1: Pre-validation Service
**Mục đích**: Validate request cơ bản

**Checks**:
- Request age validation (< 5 minutes)
- Required fields present
- Valid action and resource names
- Request format validation

**Result**: PASS | FAIL | ERROR

**Performance**: ~5-10ms

#### Step 2: User Context Resolution Service
**Mục đích**: Load và enrich user context

**Actions**:
- Load workspaceMember from database
- Load department information
- Load organization level
- Load reporting chain (manager hierarchy)
- Load assigned permission templates
- Cache user context (1-minute TTL)

**Context Enrichment**:
```typescript
{
  workspaceMemberId: string,
  workspaceId: string,
  hierarchyLevel: number, // 1-11
  departmentId: string,
  departmentName: string,
  organizationLevelId: string,
  managerId: string,
  roles: string[],
  permissionTemplateIds: string[],
  isEnriched: true
}
```

**Performance**: ~50-100ms (cache hit: ~5ms)

#### Step 3: Resource Identification Service
**Mục đích**: Identify và classify target resource

**Actions**:
- Extract resource name from context
- Determine resource type (BUSINESS_DATA, FINANCIAL, USER_MGMT, etc.)
- Determine confidentiality level
- Load resource metadata
- Check if sensitive data

**Classification Logic**:
```typescript
const RESOURCE_CLASSIFICATION = {
  sensitivePatterns: ['salary', 'payment', 'personal', 'medical'],
  resourceTypeMapping: {
    'mktOrder': 'FINANCIAL',
    'mktCustomer': 'BUSINESS_DATA',
    'mktDepartment': 'USER_MGMT',
    'mktReport': 'REPORTING'
  }
}
```

**Performance**: ~10-20ms

#### Step 4: Permission Template Check Service
**Mục đích**: Load và evaluate permission templates

**Actions**:
1. Load applicable templates for user
   - Direct templates (mktUserPermissionTemplate)
   - Hierarchy-based templates
   - Department-based templates
   - Role-based templates

2. Filter templates by context
   - Check effectiveFrom/effectiveTo
   - Check hierarchy level match
   - Check department match

3. Resolve template conflicts
   - Apply priority rules
   - Apply resolution strategy (MOST_RESTRICTIVE, MOST_PERMISSIVE, etc.)

4. Build effective permissions
   - Merge all templates
   - Generate permission matrix

**Cache Strategy**:
- Cache key: `rbac:template:{userId}:{hierarchyLevel}`
- TTL: 5 minutes
- Invalidation: On template update

**Performance**: ~100-200ms (cache hit: ~10ms)

#### Step 5: Action Permission Validation Service
**Mục đích**: Validate specific action permission

**Actions**:
1. Get action from context (CREATE, READ, UPDATE, DELETE, etc.)
2. Check if action is allowed in template
3. Validate action constraints
   - Max records (for bulk operations)
   - Max amount (for financial actions)
   - Time windows
   - Prerequisites

4. Check approval requirements
5. Check risk level compliance

**Validation Matrix**:
```typescript
const validation = {
  action: 'UPDATE',
  resource: 'mktOrder',
  constraints: {
    maxAmount: 10000000, // 10M VND
    requiresApproval: true, // if amount > 10M
    requiredLevel: 6 // Manager level or higher
  }
}
```

**Performance**: ~20-50ms

#### Step 6: Resource Permission Check Service (FULL mode only)
**Mục đích**: Validate permission on specific resource instance

**Actions**:
1. Check record ownership
2. Check department/team access
3. Apply row-level security filters
4. Check field-level permissions

**Performance**: ~50-100ms

#### Step 7: Hierarchy Validation Service (FULL mode only)
**Mục đích**: Validate organizational hierarchy rules

**Actions**:
1. Check hierarchy level requirements
2. Validate reporting chain access
3. Check cross-department access
4. Validate level difference rules

**Hierarchy Rules**:
```typescript
const rules = {
  canAccessSubordinates: true, // Manager can access reports
  canAccessSuperiors: false, // Cannot access manager's data
  canAccessPeers: true, // Can access same level
  maxLevelDifference: 2, // Can manage up to 2 levels down
  crossDepartmentAccess: false // No cross-department by default
}
```

**Performance**: ~80-150ms

#### Step 8: Data Access Policy Check Service (FULL mode only)
**Mục đích**: Apply data access policies (row-level security)

**Actions**:
1. Load applicable policies from mktDataAccessPolicy
2. Evaluate filter conditions
3. Apply policy restrictions
4. Handle policy conflicts

**Policy Example**:
```json
{
  "objectName": "mktOrder",
  "filterConditions": {
    "departmentId": "$user.departmentId",
    "status": { "$ne": "DRAFT" },
    "createdAt": { "$gte": "$user.joinDate" }
  },
  "priority": 10
}
```

**Performance**: ~100-200ms

#### Step 9: Special Permissions Service (FULL mode only)
**Mục đích**: Check special permissions (emergency, maintenance, etc.)

**Actions**:
1. Check temporary permissions (mktTemporaryPermission)
2. Check emergency access flags
3. Check system maintenance mode
4. Validate temporary elevation validity

**Performance**: ~30-50ms

#### Step 10: Sensitive Data Checks Service (FULL mode only)
**Mục đích**: Validate access to sensitive data

**Actions**:
1. Check data classification level
2. Validate special clearance requirements
3. Check compliance framework requirements (GDPR, SOX, etc.)
4. Apply additional security measures

**Performance**: ~50-100ms

#### Step 11: Department Restrictions Service (FULL mode only)
**Mục đích**: Apply department-specific restrictions

**Actions**:
1. Check department access rules
2. Validate cross-department access
3. Apply department-level policies
4. Check team membership

**Performance**: ~40-80ms

#### Step 12: Dynamic Conditions Service (FULL mode only)
**Mục đích**: Evaluate dynamic conditions (time, location, device)

**Actions**:
1. Check time-based restrictions (business hours, weekends)
2. Check location-based restrictions (IP, country, VPN)
3. Check device-based restrictions (user agent, device type)
4. Validate session limits

**Performance**: ~60-120ms

#### Step 13: Cache Performance Service (FULL mode only)
**Mục đích**: Cache management and performance tracking

**Actions**:
1. Cache final result
2. Track cache metrics
3. Optimize cache keys
4. Monitor performance

**Performance**: ~10-20ms

#### Step 14: Audit Logging Service (FULL mode only)
**Mục đích**: Log permission check to audit table

**Actions**:
1. Build audit record
2. Write to mktPermissionAudit table
3. Trigger security alerts if needed
4. Track compliance events

**Performance**: ~20-40ms (async)

#### Step 15: Final Decision Service (FULL mode only)
**Mục đích**: Make final authorization decision

**Actions**:
1. Aggregate all step results
2. Apply weighted decision algorithm
3. Calculate confidence score
4. Generate final result with detailed reasoning

**Decision Algorithm**:
```typescript
const weights = {
  TEMPLATE_CHECK: 0.30,      // 30% weight
  ACTION_VALIDATION: 0.25,   // 25% weight
  HIERARCHY: 0.15,           // 15% weight
  DATA_POLICY: 0.15,         // 15% weight
  SENSITIVE_DATA: 0.10,      // 10% weight
  DYNAMIC_CONDITIONS: 0.05   // 5% weight
}

const confidence = calculateWeightedScore(stepResults, weights)
const result = confidence >= 70 ? 'ALLOW' : 'DENY'
```

**Performance**: ~10-30ms

### 6.3. Parallel Execution

**Execution Groups** (steps that can run in parallel):

**Group 1** (Sequential):
- Step 1: Pre-validation

**Group 2** (Parallel):
- Step 2: User Context Resolution
- Step 3: Resource Identification

**Group 3** (Parallel):
- Step 4: Permission Template Check
- Step 5: Action Permission Validation
- Step 6: Resource Permission Check

**Group 4** (Parallel):
- Step 7: Hierarchy Validation
- Step 8: Data Access Policy Check

**Group 5** (Parallel):
- Step 9: Special Permissions
- Step 10: Sensitive Data Checks
- Step 11: Department Restrictions
- Step 12: Dynamic Conditions

**Group 6** (Sequential):
- Step 13: Cache Performance

**Group 7** (Sequential):
- Step 14: Audit Logging
- Step 15: Final Decision

**Performance Gain**: ~40-50% faster với parallel execution

---

## 7. Permission Template System

### 7.1. Template Structure

```typescript
type PermissionTemplate = {
  id: string
  name: string
  templateKey: string // 'MANAGER_ORDERS', 'DIRECTOR_ALL', etc.
  templateType: 'ROLE_BASED' | 'HIERARCHY_BASED' | 'DEPARTMENT_BASED' | 'CUSTOM'

  // Applicability
  hierarchyLevel?: number // 1-11
  departmentType?: string
  organizationLevelId?: string

  // Priority
  priority: number
  resolutionStrategy: 'PRIORITY_BASED' | 'MOST_RESTRICTIVE' | 'MOST_PERMISSIVE'

  // Permissions
  actions: PermissionAction[]
  resources: PermissionResource[]

  // Status
  isActive: boolean
  effectiveFrom?: Date
  effectiveTo?: Date
}
```

### 7.2. Template Examples

#### Example 1: Manager Template
```json
{
  "name": "Manager - All Modules",
  "templateKey": "MANAGER_ALL_MODULES",
  "templateType": "HIERARCHY_BASED",
  "hierarchyLevel": 7,
  "priority": 100,
  "actions": [
    {
      "actionKey": "READ",
      "actionCategory": "BASIC_CRUD",
      "riskLevel": "LOW"
    },
    {
      "actionKey": "CREATE",
      "actionCategory": "BASIC_CRUD",
      "riskLevel": "MEDIUM",
      "conditions": {
        "maxAmount": 50000000
      }
    },
    {
      "actionKey": "UPDATE",
      "actionCategory": "BASIC_CRUD",
      "riskLevel": "MEDIUM"
    },
    {
      "actionKey": "APPROVE",
      "actionCategory": "APPROVAL",
      "riskLevel": "HIGH",
      "requiresApproval": false
    }
  ],
  "resources": [
    {
      "resourceKey": "ORDERS",
      "resourceType": "FINANCIAL",
      "confidentialityLevel": "INTERNAL",
      "filterConditions": {
        "departmentId": "$user.departmentId"
      }
    },
    {
      "resourceKey": "CUSTOMERS",
      "resourceType": "BUSINESS_DATA",
      "confidentialityLevel": "INTERNAL"
    }
  ]
}
```

#### Example 2: Director Template
```json
{
  "name": "Director - Full Access",
  "templateKey": "DIRECTOR_FULL_ACCESS",
  "templateType": "HIERARCHY_BASED",
  "hierarchyLevel": 5,
  "priority": 200,
  "actions": [
    {
      "actionKey": "READ",
      "actionCategory": "BASIC_CRUD",
      "riskLevel": "LOW"
    },
    {
      "actionKey": "CREATE",
      "actionCategory": "BASIC_CRUD",
      "riskLevel": "MEDIUM"
    },
    {
      "actionKey": "UPDATE",
      "actionCategory": "BASIC_CRUD",
      "riskLevel": "MEDIUM"
    },
    {
      "actionKey": "DELETE",
      "actionCategory": "BASIC_CRUD",
      "riskLevel": "HIGH",
      "requiresApproval": true
    },
    {
      "actionKey": "APPROVE",
      "actionCategory": "APPROVAL",
      "riskLevel": "HIGH"
    },
    {
      "actionKey": "EXPORT",
      "actionCategory": "ADVANCED",
      "riskLevel": "MEDIUM"
    }
  ],
  "resources": [
    {
      "resourceKey": "ORDERS",
      "resourceType": "FINANCIAL",
      "confidentialityLevel": "CONFIDENTIAL",
      "filterConditions": null
    },
    {
      "resourceKey": "CUSTOMERS",
      "resourceType": "BUSINESS_DATA",
      "confidentialityLevel": "CONFIDENTIAL"
    },
    {
      "resourceKey": "REPORTS",
      "resourceType": "REPORTING",
      "confidentialityLevel": "INTERNAL"
    },
    {
      "resourceKey": "DEPARTMENTS",
      "resourceType": "USER_MGMT",
      "confidentialityLevel": "INTERNAL"
    }
  ]
}
```

### 7.3. Template Assignment

#### Automatic Assignment (Hierarchy-based)
```typescript
// Tự động gán template dựa trên hierarchy level
const assignTemplateByHierarchy = async (
  workspaceMemberId: string,
  hierarchyLevel: number
) => {
  const templates = await permissionTemplateRepository.find({
    where: {
      hierarchyLevel: hierarchyLevel,
      isActive: true,
      templateType: 'HIERARCHY_BASED'
    }
  })

  for (const template of templates) {
    await userPermissionTemplateRepository.create({
      workspaceMemberId,
      permissionTemplateId: template.id,
      assignmentType: 'INHERITED',
      effectiveFrom: new Date()
    })
  }
}
```

#### Manual Assignment
```typescript
// Gán template thủ công bởi admin
const assignTemplateManually = async (
  workspaceMemberId: string,
  permissionTemplateId: string,
  assignedBy: string,
  reason: string
) => {
  await userPermissionTemplateRepository.create({
    workspaceMemberId,
    permissionTemplateId,
    assignedBy,
    assignmentReason: reason,
    assignmentType: 'DIRECT',
    effectiveFrom: new Date()
  })
}
```

### 7.4. Template Conflict Resolution

**Conflict Scenarios**:
1. Cùng action nhưng khác constraints
2. Template ALLOW vs DENY
3. Khác priority levels

**Resolution Strategies**:

#### 1. PRIORITY_BASED (Default)
```typescript
// Template có priority cao hơn sẽ thắng
const resolveByPriority = (templates: Template[]) => {
  return templates.sort((a, b) => b.priority - a.priority)[0]
}
```

#### 2. MOST_RESTRICTIVE
```typescript
// Chọn template hạn chế nhất (secure by default)
const resolveByMostRestrictive = (templates: Template[]) => {
  // DENY > ALLOW
  // Constraints thấp hơn > Constraints cao hơn
  return templates.reduce((most, current) => {
    if (current.isDeny) return current
    if (most.isDeny) return most
    return current.constraints < most.constraints ? current : most
  })
}
```

#### 3. MOST_PERMISSIVE
```typescript
// Chọn template ít hạn chế nhất
const resolveByMostPermissive = (templates: Template[]) => {
  // ALLOW > DENY
  // Constraints cao hơn > Constraints thấp hơn
  return templates.reduce((most, current) => {
    if (current.isAllow && !most.isAllow) return current
    if (most.isAllow && !current.isAllow) return most
    return current.constraints > most.constraints ? current : most
  })
}
```

---

## 8. Department Hierarchy Integration

### 8.1. Department Tree Structure

**Existing Tables**:
- `mktDepartment`: Department entity
- `mktDepartmentHierarchy`: Parent-child relationships

**Tree Example**:
```
CEO Office (Level 1)
├── Executive Team (Level 2)
│   ├── Finance Department (Level 3)
│   │   ├── Accounting Team (Level 4)
│   │   └── Treasury Team (Level 4)
│   └── Operations Department (Level 3)
│       ├── IT Team (Level 4)
│       └── HR Team (Level 4)
└── Business Units (Level 2)
    ├── Sales Department (Level 3)
    └── Marketing Department (Level 3)
```

### 8.2. Hierarchy-based Access Rules

#### Rule 1: Downward Access (Manager → Subordinates)
```typescript
const canAccessSubordinate = async (
  managerId: string,
  targetUserId: string
): Promise<boolean> => {
  // Check if targetUser is in manager's reporting chain
  const reportingChain = await getReportingChain(targetUserId)
  return reportingChain.includes(managerId)
}
```

#### Rule 2: Cross-Department Access
```typescript
const canAccessCrossDepartment = async (
  userId: string,
  targetDepartmentId: string
): Promise<boolean> => {
  const user = await getUserWithDepartment(userId)

  // Check department setting
  const targetDept = await departmentRepository.findOne({
    where: { id: targetDepartmentId }
  })

  if (targetDept.allowsCrossDepartmentAccess) {
    return true
  }

  // Check if user has special cross-department permission
  const hasPermission = await checkCrossDepartmentPermission(userId)
  return hasPermission
}
```

#### Rule 3: Level-based Access
```typescript
const canAccessByLevel = (
  userLevel: number,
  targetLevel: number,
  maxLevelDifference: number = 2
): boolean => {
  // User ở cấp cao hơn (số nhỏ hơn) có thể access cấp thấp hơn
  if (userLevel < targetLevel) {
    return (targetLevel - userLevel) <= maxLevelDifference
  }

  // User không thể access cấp cao hơn mình
  return false
}
```

### 8.3. Department Policy Integration

```typescript
type DepartmentAccessPolicy = {
  departmentId: string

  // Access rules
  allowsCrossDepartmentAccess: boolean
  requiresKpiTracking: boolean

  // Hierarchy rules
  maxDownwardLevels: number // Quản lý tối đa bao nhiêu cấp xuống
  allowsSkipLevel: boolean // Có cho phép bỏ qua cấp không

  // Data access
  restrictDataAccessToDepartment: boolean
  shareResourcesWithSiblings: boolean
}

// Apply department policy trong Step 11
const applyDepartmentPolicy = async (
  context: EnhancedPermissionContext
): Promise<StepValidationResult> => {
  const userDept = await getDepartment(context.userContext.departmentId)
  const targetDept = context.resourceContext.departmentId
    ? await getDepartment(context.resourceContext.departmentId)
    : null

  // Check cross-department access
  if (targetDept && targetDept.id !== userDept.id) {
    if (!userDept.allowsCrossDepartmentAccess &&
        !targetDept.allowsCrossDepartmentAccess) {
      return {
        result: 'FAIL',
        reason: 'Cross-department access not allowed',
        continue: false
      }
    }
  }

  // Check hierarchy levels
  const levelDiff = Math.abs(
    context.userContext.hierarchyLevel -
    context.resourceContext.hierarchyLevel
  )

  if (levelDiff > userDept.maxDownwardLevels) {
    return {
      result: 'FAIL',
      reason: `Hierarchy level difference exceeds limit (${userDept.maxDownwardLevels})`,
      continue: false
    }
  }

  return {
    result: 'PASS',
    reason: 'Department policy checks passed',
    continue: true
  }
}
```

---

## 9. Data Access Policy & Sensitive Data

### 9.1. Policy Types

#### Row-Level Security (RLS)
**Mục đích**: Filter records dựa trên conditions

**Example**: Chỉ xem orders của department mình
```json
{
  "objectName": "mktOrder",
  "policyType": "ROW_LEVEL",
  "filterConditions": {
    "departmentId": "$user.departmentId"
  }
}
```

#### Field-Level Security (FLS)
**Mục đích**: Hide/show specific fields

**Example**: Ẩn salary field với non-manager
```json
{
  "objectName": "workspaceMember",
  "policyType": "FIELD_LEVEL",
  "deniedFields": ["salary", "compensationDetails"],
  "conditions": {
    "userHierarchyLevel": { "$gt": 7 }
  }
}
```

#### Time-Based Policy
**Mục đích**: Restrict access based on time

**Example**: Chỉ cho phép truy cập trong giờ làm việc
```json
{
  "policyType": "TIME_BASED",
  "conditions": {
    "allowedHours": [
      { "start": 8, "end": 18 }
    ],
    "allowedDays": [1, 2, 3, 4, 5],
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

### 9.2. Policy Evaluation

#### Evaluation Flow
```
Load Policies → Filter Applicable → Sort by Priority → Evaluate Conditions → Apply Actions
```

#### Evaluation Service
```typescript
class DataAccessPolicyService {
  async evaluatePolicies(
    context: EnhancedPermissionContext
  ): Promise<PolicyEvaluationResult> {
    // 1. Load applicable policies
    const policies = await this.loadApplicablePolicies(
      context.resourceContext.objectName,
      context.userContext.workspaceId
    )

    // 2. Sort by priority (highest first)
    const sortedPolicies = policies.sort((a, b) => b.priority - a.priority)

    // 3. Evaluate each policy
    const results: PolicyResult[] = []

    for (const policy of sortedPolicies) {
      const result = await this.evaluatePolicy(policy, context)
      results.push(result)

      // Early exit on DENY if conflict resolution is DENY_WINS
      if (result.action === 'DENY' &&
          policy.conflictResolution === 'DENY_WINS') {
        break
      }
    }

    // 4. Resolve conflicts
    const finalResult = this.resolveConflicts(results, sortedPolicies)

    return finalResult
  }

  private async evaluatePolicy(
    policy: DataAccessPolicy,
    context: EnhancedPermissionContext
  ): Promise<PolicyResult> {
    // Evaluate filter conditions
    const conditionsMet = await this.evaluateConditions(
      policy.filterConditions,
      context
    )

    if (!conditionsMet) {
      return {
        policyId: policy.id,
        action: 'SKIP',
        reason: 'Conditions not met'
      }
    }

    // Apply policy
    return {
      policyId: policy.id,
      action: 'ALLOW',
      reason: 'Policy conditions satisfied',
      filters: policy.filterConditions
    }
  }
}
```

### 9.3. Condition Evaluation

#### Supported Operators
```typescript
type ConditionOperator =
  | 'eq'            // Equal
  | 'ne'            // Not equal
  | 'gt'            // Greater than
  | 'gte'           // Greater than or equal
  | 'lt'            // Less than
  | 'lte'           // Less than or equal
  | 'in'            // In array
  | 'nin'           // Not in array
  | 'contains'      // String contains
  | 'starts_with'   // String starts with
  | 'ends_with'     // String ends with
  | 'regex'         // Regex match
  | 'exists'        // Field exists
  | 'is_null'       // Field is null
```

#### Variable Substitution
```typescript
const VARIABLE_PATTERNS = {
  '$user.id': () => context.userContext.id,
  '$user.departmentId': () => context.userContext.departmentId,
  '$user.hierarchyLevel': () => context.userContext.hierarchyLevel,
  '$user.managerId': () => context.userContext.managerId,
  '$user.joinDate': () => context.userContext.createdAt,
  '$workspace.id': () => context.userContext.workspaceId,
  '$now': () => new Date(),
  '$today': () => DateTimeUtils.startOfDay(DateTimeUtils.now())
}
```

#### Example Conditions
```json
{
  "filterConditions": {
    "departmentId": "$user.departmentId",
    "status": { "$in": ["ACTIVE", "PENDING"] },
    "createdAt": { "$gte": "$user.joinDate" },
    "amount": { "$lte": 10000000 },
    "ownerId": { "$eq": "$user.id" }
  }
}
```

### 9.4. Sensitive Data Handling

#### 9.4.1. Data Classification Source

**Classification Enum** (source of truth):
```typescript
enum DataClassification {
  PUBLIC = 'PUBLIC',           // Publicly accessible
  INTERNAL = 'INTERNAL',       // Internal use only
  CONFIDENTIAL = 'CONFIDENTIAL', // Restricted access
  RESTRICTED = 'RESTRICTED',   // Highly restricted
  TOP_SECRET = 'TOP_SECRET'    // Maximum restriction
}

// Classification owner định nghĩa tại entity level
@WorkspaceEntity({
  classification: DataClassification.CONFIDENTIAL,
  classificationOwner: 'SECURITY_TEAM' // Team responsible
})
export class MktPaymentWorkspaceEntity { }
```

#### 9.4.2. Classification Propagation

```
┌─────────────────────────────────────────────────────────────────┐
│              CLASSIFICATION PROPAGATION FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Entity Definition (Source of Truth)                         │
│     └─ @WorkspaceEntity({ classification: CONFIDENTIAL })       │
│                           │                                     │
│  2. Resolver Layer                                              │
│     └─ @Permission({ requireClassification: true })             │
│                           │                                     │
│  3. Service Layer                                               │
│     └─ classificationContext.validate(entity)                   │
│                           │                                     │
│  4. Repository Layer                                            │
│     └─ applyClassificationFilter(query, userClearance)          │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.4.3. Masking & Redaction Patterns

```typescript
// Masking service cho sensitive fields
class SensitiveDataMaskingService {
  // Áp dụng khi user không có ACCESS_SENSITIVE_DATA permission
  maskField(value: any, fieldType: SensitiveFieldType): any {
    switch (fieldType) {
      case 'PHONE':
        return value.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      case 'EMAIL':
        return value.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      case 'BANK_ACCOUNT':
        return '****' + value.slice(-4)
      case 'AMOUNT':
        return '[REDACTED]'
      case 'SSN':
        return '***-**-' + value.slice(-4)
      default:
        return '[CLASSIFIED]'
    }
  }

  // Check và mask trong field resolver
  async resolveSensitiveField(
    parent: any,
    fieldName: string,
    context: EnhancedPermissionContext
  ): Promise<any> {
    const hasAccess = await this.checkSensitiveDataPermission(context, fieldName)

    if (!hasAccess) {
      const fieldType = this.getFieldType(parent, fieldName)
      return this.maskField(parent[fieldName], fieldType)
    }

    return parent[fieldName]
  }
}
```

#### 9.4.4. Sensitive Data Audit Tagging

```typescript
// Tag audit logs khi access classified data
const logClassifiedAccess = async (
  context: EnhancedPermissionContext,
  classification: DataClassification
) => {
  await auditService.log({
    ...context,
    eventType: 'CLASSIFIED_DATA_ACCESS',
    classification,
    tags: ['SENSITIVE', 'COMPLIANCE_RELEVANT'],
    requiresReview: classification >= DataClassification.RESTRICTED
  })
}
```

#### 9.4.5. Deny-by-Default for Unknown Classification

```typescript
// Nếu không xác định được classification → DENY
const getEffectiveClassification = (
  entity: any,
  field?: string
): DataClassification => {
  // 1. Check field-level classification
  if (field) {
    const fieldClassification = getFieldClassification(entity, field)
    if (fieldClassification) return fieldClassification
  }

  // 2. Check entity-level classification
  const entityClassification = getEntityClassification(entity)
  if (entityClassification) return entityClassification

  // 3. Default: DENY (treat as RESTRICTED)
  console.warn(`Unknown classification for ${entity.constructor.name}`)
  return DataClassification.RESTRICTED
}
```

---

## 10. GraphQL Integration

### 10.1. Permission Decorator

#### Decorator Definition
```typescript
// @Permission decorator
type PermissionMetadata = {
  resource: string          // Resource name (e.g., 'mktOrder')
  action: PermissionAction  // Action (CREATE, READ, UPDATE, DELETE, etc.)
  objectName?: string       // GraphQL object name (fallback)

  // Record ID extraction
  recordIdParam?: string    // Parameter name (e.g., 'id', 'orderId')
  recordIdPath?: string     // Path in input (e.g., 'input.id', 'data.orderId')

  // Behavior
  skipValidation?: boolean  // Skip permission check
  allowAnonymous?: boolean  // Allow anonymous access

  // Cache control
  enableCache?: boolean     // Enable result caching (default: true)
  cacheTTL?: number        // Cache TTL in seconds

  // Error handling
  errorMessage?: string     // Custom error message
}

// Usage
@Permission({
  resource: 'mktOrder',
  action: PermissionAction.CREATE,
  recordIdPath: 'input.orderId',
  enableCache: true,
  cacheTTL: 300
})
```

#### Decorator Usage Examples

**Example 1: Resolver Method**
```typescript
@Resolver(() => MktOrder)
export class MktOrderResolver {

  @Query(() => MktOrder)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.READ,
    recordIdParam: 'id'
  })
  async getMktOrder(
    @Args('id') id: string
  ): Promise<MktOrder> {
    return this.orderService.findOne(id)
  }

  @Mutation(() => MktOrder)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.CREATE,
    enableCache: false // Don't cache mutations
  })
  async createMktOrder(
    @Args('input') input: CreateOrderInput
  ): Promise<MktOrder> {
    return this.orderService.create(input)
  }

  @Mutation(() => MktOrder)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.UPDATE,
    recordIdPath: 'input.id',
    errorMessage: 'You do not have permission to update this order'
  })
  async updateMktOrder(
    @Args('input') input: UpdateOrderInput
  ): Promise<MktOrder> {
    return this.orderService.update(input)
  }

  @Mutation(() => Boolean)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.DELETE,
    recordIdParam: 'id'
  })
  async deleteMktOrder(
    @Args('id') id: string
  ): Promise<boolean> {
    await this.orderService.delete(id)
    return true
  }
}
```

**Example 2: Class-Level Permission**
```typescript
@Resolver(() => MktReport)
@Permission({
  resource: 'mktReport',
  action: PermissionAction.READ // Default for all methods
})
export class MktReportResolver {

  // Inherits READ permission from class
  @Query(() => [MktReport])
  async getMktReports(): Promise<MktReport[]> {
    return this.reportService.findAll()
  }

  // Override with method-level permission
  @Mutation(() => MktReport)
  @Permission({
    resource: 'mktReport',
    action: PermissionAction.CREATE
  })
  async createMktReport(
    @Args('input') input: CreateReportInput
  ): Promise<MktReport> {
    return this.reportService.create(input)
  }
}
```

**Example 3: Skip Validation**
```typescript
@Resolver(() => PublicData)
export class PublicDataResolver {

  @Query(() => [PublicData])
  @Permission({
    resource: 'publicData',
    action: PermissionAction.READ,
    skipValidation: true // No permission check
  })
  async getPublicData(): Promise<PublicData[]> {
    return this.publicService.findAll()
  }

  @Query(() => HealthCheck)
  @Permission({
    resource: 'health',
    action: PermissionAction.READ,
    allowAnonymous: true // Allow anonymous users
  })
  async healthCheck(): Promise<HealthCheck> {
    return { status: 'OK' }
  }
}
```

### 10.2. Guard Integration

#### Guard Flow
```
GraphQL Request → @Permission Decorator → EnterpriseRbacGuard → Validation → Resolver
```

#### Guard Implementation
```typescript
@Injectable()
export class EnterpriseRbacGuard implements CanActivate {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get permission metadata
    const metadata = this.getPermissionMetadata(context)

    if (!metadata || metadata.skipValidation) {
      return true
    }

    // 2. Build permission context
    const permissionContext = await this.buildPermissionContext(
      context,
      metadata
    )

    // 3. Execute validation
    const result = await this.validationOrchestrator.executeValidation(
      permissionContext
    )

    // 4. Handle result
    if (result.result === CheckResult.PASS) {
      return true
    }

    throw new ForbiddenException(
      metadata.errorMessage || result.reason
    )
  }

  private async buildPermissionContext(
    context: ExecutionContext,
    metadata: PermissionMetadata
  ): Promise<EnhancedPermissionContext> {
    const { request, gqlContext } = this.extractRequestInfo(context)

    return {
      action: metadata.action,
      operationType: this.getOperationType(gqlContext),
      operationName: this.getOperationName(gqlContext),

      userContext: {
        workspaceMemberId: request.workspaceMemberId,
        workspaceId: request.workspaceId,
        ...request.user
      },

      resourceContext: {
        objectName: metadata.resource,
        recordId: this.extractRecordId(request, gqlContext, metadata),
        resourceType: this.determineResourceType(metadata.resource)
      },

      cacheContext: {
        enabled: metadata.enableCache ?? true,
        ttl: metadata.cacheTTL
      },

      request,
      gqlContext
    }
  }
}
```

### 10.3. Field Resolver Protection

**Field-level permissions** trong GraphQL:

```typescript
@Resolver(() => MktOrder)
export class MktOrderResolver {

  @ResolveField(() => Number)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.READ,
    errorMessage: 'You cannot view order amounts'
  })
  async totalAmount(
    @Parent() order: MktOrder
  ): Promise<number> {
    // Only users with READ permission can see amount
    return order.totalAmount
  }

  @ResolveField(() => String)
  @Permission({
    resource: 'mktOrder',
    action: PermissionAction.ACCESS_SENSITIVE_DATA
  })
  async customerSensitiveData(
    @Parent() order: MktOrder
  ): Promise<string> {
    // Only users with special permission can see sensitive data
    return order.customerSensitiveData
  }
}
```

---

## 11. Cache Strategy

### 11.1. Cache Layers

```
┌─────────────────────────────────────────────┐
│         CACHE ARCHITECTURE                  │
├─────────────────────────────────────────────┤
│  Layer 1: In-Memory Cache (Node.js)         │
│  - User context (1 min TTL)                 │
│  - Template metadata (5 min TTL)            │
│  - Ultra-fast access (~1ms)                 │
├─────────────────────────────────────────────┤
│  Layer 2: Redis Cache (Distributed)         │
│  - Permission results (5 min TTL)           │
│  - User templates (5 min TTL)               │
│  - Policy results (3 min TTL)               │
│  - Fast access (~5-10ms)                    │
├─────────────────────────────────────────────┤
│  Layer 3: PostgreSQL (Persistent)           │
│  - Permission templates                     │
│  - Data access policies                     │
│  - Audit logs                               │
│  - Slower but authoritative (~50-100ms)     │
└─────────────────────────────────────────────┘
```

### 11.2. Cache Keys

**Permission Result Cache**:
```typescript
const CACHE_KEYS = {
  // Format: rbac:permission:{userId}:{action}:{resource}:{recordId}
  permissionResult: (ctx: PermissionContext) =>
    `rbac:permission:${ctx.userContext.workspaceMemberId}:${ctx.action}:${ctx.resourceContext.objectName}:${ctx.resourceContext.recordId || 'all'}`,

  // Format: rbac:user:{userId}
  userContext: (userId: string) =>
    `rbac:user:${userId}`,

  // Format: rbac:template:{userId}:{hierarchyLevel}
  userTemplates: (userId: string, level: number) =>
    `rbac:template:${userId}:${level}`,

  // Format: rbac:policy:{objectName}:{departmentId}
  dataPolicy: (objectName: string, deptId: string) =>
    `rbac:policy:${objectName}:${deptId}`
}
```

### 11.3. Cache Invalidation

#### Invalidation Triggers

**Template Changes**:
```typescript
// When template is updated/deleted
await cacheManager.invalidatePattern('rbac:template:*')
await cacheManager.invalidatePattern('rbac:permission:*')
```

**User Changes**:
```typescript
// When user department/level changes
await cacheManager.delete(`rbac:user:${userId}`)
await cacheManager.invalidatePattern(`rbac:template:${userId}:*`)
await cacheManager.invalidatePattern(`rbac:permission:${userId}:*`)
```

**Policy Changes**:
```typescript
// When data access policy is updated
await cacheManager.invalidatePattern(`rbac:policy:${objectName}:*`)
```

#### Cache Warming
```typescript
// Pre-populate cache for active users
const warmCache = async () => {
  const activeUsers = await getActiveUsers() // Last 15 minutes

  for (const user of activeUsers) {
    // Warm user context
    await userContextService.resolveUserContext(user.id)

    // Warm permission templates
    await templateService.loadUserTemplates(user.id, user.hierarchyLevel)
  }
}

// Run every 5 minutes
cron.schedule('*/5 * * * *', warmCache)
```

### 11.4. Cache Monitoring

**Metrics to Track**:
- Cache hit rate (target: > 85%)
- Cache miss rate
- Average response time (cache hit vs miss)
- Cache size and memory usage
- Eviction rate

**Alerting**:
- Alert if hit rate < 70%
- Alert if cache memory > 500MB
- Alert if average latency > 100ms

### 11.5. Cache Safety & Consistency

#### 11.5.1. Stampede Protection (Single-Flight)

```typescript
// Prevent cache stampede với single-flight pattern
class CacheWithStampedeProtection {
  private inFlight: Map<string, Promise<any>> = new Map()

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // 1. Check cache first
    const cached = await this.cache.get(key)
    if (cached) return cached

    // 2. Check if request is in-flight
    const existing = this.inFlight.get(key)
    if (existing) return existing

    // 3. Create new request and track it
    const promise = fetcher()
      .then(async (result) => {
        await this.cache.set(key, result, ttl)
        this.inFlight.delete(key)
        return result
      })
      .catch((error) => {
        this.inFlight.delete(key)
        throw error
      })

    this.inFlight.set(key, promise)
    return promise
  }
}
```

#### 11.5.2. Negative Cache TTL

```typescript
// Cache negative results (DENY) với shorter TTL
const CACHE_TTL = {
  ALLOW_RESULT: 300,      // 5 minutes for ALLOW
  DENY_RESULT: 60,        // 1 minute for DENY (shorter)
  USER_CONTEXT: 60,       // 1 minute
  TEMPLATE: 300,          // 5 minutes
  NOT_FOUND: 30           // 30 seconds for missing resources
}

const cacheResult = async (key: string, result: ValidationResult) => {
  const ttl = result.result === 'DENY'
    ? CACHE_TTL.DENY_RESULT
    : CACHE_TTL.ALLOW_RESULT

  await cache.set(key, result, ttl)
}
```

#### 11.5.3. Idempotent Invalidation Hooks

```typescript
// Invalidation hooks được trigger khi template/policy thay đổi
@OnEvent('permission.template.updated')
@OnEvent('permission.policy.updated')
async handleInvalidation(event: PermissionChangeEvent) {
  const { workspaceId, affectedUsers, changeType } = event

  // Idempotent: có thể gọi nhiều lần mà không gây side effects
  await this.cacheService.invalidateWithLock(
    `rbac:${workspaceId}:*`,
    {
      lockKey: `invalidation:${event.id}`,
      lockTTL: 30, // Prevent duplicate invalidations
    }
  )

  // Log invalidation for debugging
  this.logger.info('Cache invalidated', {
    workspaceId,
    affectedUsers: affectedUsers.length,
    changeType
  })
}
```

#### 11.5.4. Rollback Triggers

```typescript
// Tự động rollback khi metrics vượt ngưỡng
const ROLLBACK_THRESHOLDS = {
  cacheHitRate: { min: 0.50, action: 'INCREASE_TTL' },
  p95Latency: { max: 2000, action: 'SIMPLIFY_MODE' },
  errorRate: { max: 0.05, action: 'DISABLE_STEPS' }
}

class CacheHealthMonitor {
  @Cron('*/30 * * * * *') // Check every 30 seconds
  async checkHealth() {
    const metrics = await this.collectMetrics()

    if (metrics.cacheHitRate < ROLLBACK_THRESHOLDS.cacheHitRate.min) {
      await this.triggerRollback('LOW_HIT_RATE', {
        current: metrics.cacheHitRate,
        threshold: ROLLBACK_THRESHOLDS.cacheHitRate.min
      })
    }

    if (metrics.p95Latency > ROLLBACK_THRESHOLDS.p95Latency.max) {
      await this.triggerRollback('HIGH_LATENCY', {
        current: metrics.p95Latency,
        threshold: ROLLBACK_THRESHOLDS.p95Latency.max
      })
    }
  }

  private async triggerRollback(reason: string, data: any) {
    // 1. Alert on-call
    await this.alertService.critical('RBAC_ROLLBACK_TRIGGERED', { reason, ...data })

    // 2. Switch to safe mode
    await this.configService.set('RBAC_VALIDATION_MODE', 'SIMPLIFIED')

    // 3. Increase cache TTL
    await this.configService.set('RBAC_CACHE_TTL_MULTIPLIER', 2)
  }
}
```

---

## 12. Performance & Monitoring

### 12.1. Performance Targets

| Metric | SIMPLIFIED Mode | FULL Mode |
|--------|----------------|-----------|
| Average Latency | 50-100ms | 200-500ms |
| P95 Latency | 150ms | 800ms |
| P99 Latency | 300ms | 1500ms |
| Throughput | 1000 req/s | 500 req/s |
| Cache Hit Rate | > 85% | > 75% |
| Concurrent Users | 6000+ | 3000+ |

### 12.2. Performance Optimization Techniques

#### 1. Parallel Execution
- Execute independent steps in parallel
- Use execution groups
- 40-50% performance improvement

#### 2. Early Exit
- Stop validation on first DENY (for strict mode)
- Skip optional steps
- 20-30% improvement for denied requests

#### 3. Aggressive Caching
- Cache user context (1 min)
- Cache templates (5 min)
- Cache results (5 min)
- 80-90% requests served from cache

#### 4. Database Optimization
- Indexed queries on all foreign keys
- Denormalized data for fast access
- Connection pooling
- Query result caching

#### 5. Step Optimization
- Skip steps not needed for simple operations
- Use SIMPLIFIED mode by default
- Lazy-load context data

### 12.3. Monitoring & Alerts

#### Key Metrics

**Permission Checks**:
- `rbac_permission_checks_total` - Total permission checks
- `rbac_permission_check_duration_seconds` - Check duration histogram
- `rbac_permission_denials_total` - Total denials by resource/action
- `rbac_cache_hit_rate` - Cache hit rate percentage

**Performance**:
- `rbac_step_execution_time_seconds` - Per-step execution time
- `rbac_validation_mode` - Count by mode (SIMPLIFIED/FULL)
- `rbac_error_rate` - Error rate percentage
- `rbac_timeout_rate` - Timeout rate percentage

**Security**:
- `rbac_security_alerts_total` - Security alerts by type
- `rbac_sensitive_data_access_total` - Sensitive data access count
- `rbac_emergency_access_total` - Emergency access usage

#### Alerting Rules

```yaml
# High denial rate
- alert: HighPermissionDenialRate
  expr: rate(rbac_permission_denials_total[5m]) > 0.3
  for: 5m
  annotations:
    summary: High permission denial rate (> 30%)

# Low cache hit rate
- alert: LowCacheHitRate
  expr: rbac_cache_hit_rate < 0.70
  for: 10m
  annotations:
    summary: Cache hit rate below 70%

# High latency
- alert: HighValidationLatency
  expr: histogram_quantile(0.95, rbac_permission_check_duration_seconds) > 1.0
  for: 5m
  annotations:
    summary: P95 validation latency > 1 second

# Security alert
- alert: SuspiciousActivity
  expr: increase(rbac_security_alerts_total[15m]) > 10
  for: 1m
  annotations:
    summary: Multiple security alerts detected
    severity: critical
```

### 12.4. Audit & Compliance

#### Audit Requirements

**What to Audit**:
- All DENY decisions
- All access to CONFIDENTIAL/RESTRICTED data
- All emergency access usage
- All permission changes (template, policy)
- All cross-department access

**Audit Data**:
```typescript
{
  timestamp: Date,
  userId: string,
  action: string,
  resource: string,
  recordId: string,
  result: 'ALLOW' | 'DENY',
  reason: string,
  validationMode: 'SIMPLIFIED' | 'FULL',
  stepResults: StepResult[],
  executionTime: number,
  cacheHit: boolean,
  ipAddress: string,
  userAgent: string
}
```

#### Retention Policy
- Standard audit logs: 90 days
- Financial data access: 7 years (SOX compliance)
- Sensitive data access: 3 years (GDPR compliance)
- Security incidents: 5 years

#### Retention Enforcement

```typescript
// Automated retention enforcement job
@Cron('0 2 * * *') // Daily at 2 AM
async enforceAuditRetention() {
  const retentionPolicies = [
    { type: 'STANDARD', days: 90 },
    { type: 'FINANCIAL', days: 2555 },  // 7 years
    { type: 'SENSITIVE', days: 1095 },  // 3 years
    { type: 'SECURITY_INCIDENT', days: 1825 }  // 5 years
  ]

  for (const policy of retentionPolicies) {
    const cutoffDate = DateTimeUtils.subtract(DateTimeUtils.now(), { days: policy.days })

    // Archive before delete (for compliance)
    await this.archiveOldAuditLogs(policy.type, cutoffDate)

    // Delete after archival
    const deleted = await this.auditRepository.delete({
      auditType: policy.type,
      createdAt: LessThan(cutoffDate),
      archived: true
    })

    this.logger.info(`Retention enforcement: deleted ${deleted.affected} ${policy.type} logs`)
  }
}
```

#### PII Minimization

```typescript
// Hash PII trong audit logs khi không cần plaintext
const minimizePII = (auditData: AuditRecord): AuditRecord => {
  return {
    ...auditData,
    // Hash identifiers
    userIdHash: hashSHA256(auditData.userId),
    ipAddressHash: hashSHA256(auditData.ipAddress),

    // Redact sensitive fields
    requestBody: redactSensitiveFields(auditData.requestBody),

    // Keep original for security incidents only
    _originalUserId: auditData.auditType === 'SECURITY_INCIDENT'
      ? auditData.userId
      : undefined
  }
}
```

#### Audit Access Controls

```typescript
// Access to audit data requires special permission
@Permission({
  resource: 'mktPermissionAudit',
  action: PermissionAction.READ,
  requireClearance: DataClassification.CONFIDENTIAL
})
async getAuditLogs(filters: AuditFilters): Promise<AuditLog[]> { }

// Alert on audit write failures
@OnEvent('audit.write.failed')
async handleAuditWriteFailure(event: AuditWriteFailedEvent) {
  await this.alertService.critical('AUDIT_WRITE_FAILED', {
    message: 'Failed to write audit log - compliance risk',
    error: event.error,
    auditData: event.data
  })

  // Fallback: write to backup storage
  await this.backupAuditStorage.write(event.data)
}
```

#### Anomaly Detection

```typescript
// Detect anomalies in permission patterns
@Cron('*/15 * * * *')
async detectAnomalies() {
  const anomalies = await this.analyzePermissionPatterns({
    emergencyAccessSpike: await this.checkEmergencyAccessSpike(),
    overrideUsageSpike: await this.checkOverrideUsageSpike(),
    unusualDenialPattern: await this.checkUnusualDenials(),
    crossDepartmentAccessSpike: await this.checkCrossDepartmentAccess()
  })

  for (const anomaly of anomalies) {
    if (anomaly.severity === 'HIGH') {
      await this.alertService.warn('RBAC_ANOMALY_DETECTED', anomaly)
    }
  }
}
```

#### Compliance Reports

**Weekly Reports**:
- Permission denial summary by user/resource
- Cache performance metrics
- Top denied actions/resources

**Monthly Reports**:
- Security incidents summary
- Sensitive data access patterns
- Template usage statistics
- Performance trends

**Quarterly Reports**:
- Compliance framework adherence (GDPR, SOX, etc.)
- Security posture assessment
- Access pattern analysis
- Recommendations for policy improvements

---

## 13. Migration & Deployment

### 13.1. Current State Analysis

#### ✅ Entities đã tồn tại và hoạt động

| Entity | Location | DB Table | Status |
|--------|----------|----------|--------|
| `MktPermissionTemplateWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | 🟡 Cần thêm fields |
| `MktPermissionActionWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktPermissionResourceWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktUserPermissionTemplateWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktUserPermissionOverrideWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktTemplateResourcePermissionWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktTemplateSystemActionWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktTemplateAccessLimitationWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktPermissionContextWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktPermissionPriorityConfigWorkspaceEntity` | `mkt-permission-template/entities/` | ✅ | ✅ Complete |
| `MktDataAccessPolicyWorkspaceEntity` | `mkt-data-access-policy/` | ✅ | 🟡 Cần thêm fields |
| `MktPermissionAuditWorkspaceEntity` | `mkt-permission-audit/` | ✅ | 🟡 Cần thêm fields |

#### 🔴 Table tồn tại NHƯNG thiếu workspace entity

| Table Name | Columns | Issue | Priority |
|------------|---------|-------|----------|
| `mktTemporaryPermission` | 18 columns (objectName, recordId, canRead, canUpdate, canDelete, expiresAt, reason, purpose, isActive, revokedAt, revokeReason, granterWorkspaceMemberId, granteeWorkspaceMemberId, revokedById, ...) | ❌ Không có workspace entity file | 🔴 HIGH |

**Chi tiết vấn đề**:
- Table đã tồn tại trong database workspace schema
- Foreign keys đã được tạo (granterWorkspaceMemberId, granteeWorkspaceMemberId, revokedById)
- Indexes đã tồn tại
- **THIẾU**: File workspace entity để TypeORM/Twenty ORM quản lý

#### 🟡 Entities cần bổ sung fields

**1. MktPermissionTemplateWorkspaceEntity**

Cần thêm 7 fields mới:
```typescript
// Existing fields: templateKey, templateName, description, hierarchyLevel, applicableToLevels, version, isSystemTemplate, priority, ...

// MISSING FIELDS:
templateType: string;              // SELECT: ROLE_BASED | HIERARCHY_BASED | DEPARTMENT_BASED | CUSTOM
departmentType?: string;           // TEXT: EXECUTIVE, ENGINEERING, SALES, etc.
organizationLevelId?: string;      // UUID FK → mktOrganizationLevel
resolutionStrategy: string;        // SELECT: PRIORITY_BASED | MOST_RESTRICTIVE | MOST_PERMISSIVE
effectiveFrom?: Date;              // TIMESTAMPTZ
effectiveTo?: Date;                // TIMESTAMPTZ
metadata?: object;                 // JSONB
```

**2. MktDataAccessPolicyWorkspaceEntity**

Cần thêm 5 fields mới:
```typescript
// Existing fields: name, description, departmentId, specificMemberId, objectName, filterConditions, priority, isActive, ...

// MISSING FIELDS:
policyType: string;                // SELECT: ROW_LEVEL | FIELD_LEVEL | COLUMN_LEVEL
evaluationMode: string;            // SELECT: STRICT | PERMISSIVE | BALANCED
riskLevel: string;                 // SELECT: LOW | MEDIUM | HIGH | CRITICAL
conflictResolution: string;        // SELECT: DENY_WINS | ALLOW_WINS | HIGHEST_PRIORITY
permissionTemplateId?: string;     // UUID FK → mktPermissionTemplate

// MISSING INDEXES:
@WorkspaceIndex(['policyType', 'isActive'])
@WorkspaceIndex(['objectName', 'priority'])
```

**3. MktPermissionAuditWorkspaceEntity**

Cần thêm 4 fields mới:
```typescript
// Existing fields: workspaceMemberId, userId, action, objectName, recordId, permissionSource, checkResult, denialReason, requestContext, ipAddress, userAgent, checkDurationMs, ...

// MISSING FIELDS:
validationMode?: string;           // SELECT: SIMPLIFIED | FULL
stepResults?: object;              // JSONB: step-by-step validation results
cacheHit?: boolean;                // BOOLEAN: was result from cache?
executionPath?: string;            // TEXT: execution path taken

// MISSING INDEXES:
@WorkspaceIndex(['checkResult', 'createdAt'])
@WorkspaceIndex(['workspaceMemberId', 'action', 'createdAt'])
@WorkspaceIndex(['checkResult', 'denialReason'], { where: 'checkResult = FAIL' })
```

### 13.2. Migration Strategy (6 Phases)

#### 📋 Phase 1: Tạo mktTemporaryPermission Entity (Week 1, Days 1-2)

**Mục tiêu**: Tạo workspace entity file cho table `mktTemporaryPermission` đã tồn tại

**Step 1.1: Tạo thư mục và file**
```bash
# Tạo folder workspace-entities trong mkt-rbac-enterprise-grade
mkdir -p packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities

# Tạo entity file
touch packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities/mkt-temporary-permission.workspace-entity.ts
```

**Step 1.2: Update constants - Add object ID**
```typescript
// File: packages/twenty-server/src/mkt-core/constants/mkt-object-ids.ts

export const MKT_OBJECT_IDS = {
  // ... existing IDs
  mktTemporaryPermission: '20000000-0000-4000-8000-000000000030',
};
```

**Step 1.3: Update constants - Add field IDs**
```typescript
// File: packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts

export const MKT_TEMPORARY_PERMISSION_FIELD_IDS = {
  objectName: '20000000-3001-4000-8000-000000000001',
  recordId: '20000000-3001-4000-8000-000000000002',
  canRead: '20000000-3001-4000-8000-000000000003',
  canUpdate: '20000000-3001-4000-8000-000000000004',
  canDelete: '20000000-3001-4000-8000-000000000005',
  expiresAt: '20000000-3001-4000-8000-000000000006',
  reason: '20000000-3001-4000-8000-000000000007',
  purpose: '20000000-3001-4000-8000-000000000008',
  isActive: '20000000-3001-4000-8000-000000000009',
  revokedAt: '20000000-3001-4000-8000-000000000010',
  revokeReason: '20000000-3001-4000-8000-000000000011',
  granter: '20000000-3001-4000-8000-000000000012',
  grantee: '20000000-3001-4000-8000-000000000013',
  revokedBy: '20000000-3001-4000-8000-000000000014',
};
```

**Step 1.4: Implement entity** (See database-schema.md for full implementation)

**Step 1.5: Sync metadata**
```bash
# Sync metadata để Twenty nhận diện entity mới
npx nx command twenty-server -- workspace:sync-metadata -f

# Check kết quả
# Entity sẽ được sync với existing table, không tạo table mới
```

**Step 1.6: Verify**
```bash
# Run typecheck
npx nx typecheck twenty-server

# Test entity
npx nx test twenty-server -- --testPathPattern=mkt-temporary-permission
```

**Expected Result**: ✅ Entity file created, metadata synced, no new migrations needed (table already exists)

---

#### 📋 Phase 2: Bổ sung Fields cho Entities (Week 1, Days 3-5)

**Mục tiêu**: Thêm các fields mới vào 3 entities: MktPermissionTemplate, MktDataAccessPolicy, MktPermissionAudit

**Step 2.1: Update MktPermissionTemplateWorkspaceEntity**

Refer to Section 3.1 in database-schema.md for detailed field definitions and code.

Key additions:
- `templateType` (SELECT field with 4 options)
- `departmentType` (TEXT field)
- `organizationLevel` (MANY_TO_ONE relation)
- `resolutionStrategy` (SELECT field with 3 options)
- `effectiveFrom`, `effectiveTo` (DATE_TIME fields)
- `metadata` (RAW_JSON field)

**Step 2.2: Update MktDataAccessPolicyWorkspaceEntity**

Key additions:
- `policyType` (SELECT: ROW_LEVEL, FIELD_LEVEL, COLUMN_LEVEL)
- `evaluationMode` (SELECT: STRICT, PERMISSIVE, BALANCED)
- `riskLevel` (SELECT: LOW, MEDIUM, HIGH, CRITICAL)
- `conflictResolution` (SELECT: DENY_WINS, ALLOW_WINS, HIGHEST_PRIORITY)
- `permissionTemplate` (MANY_TO_ONE relation)
- 2 new indexes

**Step 2.3: Update MktPermissionAuditWorkspaceEntity**

Key additions:
- `validationMode` (SELECT: SIMPLIFIED, FULL)
- `stepResults` (RAW_JSON)
- `cacheHit` (BOOLEAN)
- `executionPath` (TEXT)
- 3 new indexes

**Step 2.4: Update field ID constants**

Add field IDs for all new fields (see database-schema.md section 8.4)

**Step 2.5: Sync and migrate**
```bash
# Sync metadata
npx nx command twenty-server -- workspace:sync-metadata -f

# Generate migration
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/workspace/migrations/add-rbac-v2-enhanced-fields -d src/database/typeorm/workspace/workspace.datasource

# Review migration SQL
cat packages/twenty-server/src/database/typeorm/workspace/migrations/*-add-rbac-v2-enhanced-fields.ts

# Run migration
npx nx run twenty-server:database:migrate:prod
```

**Step 2.6: Verify**
```bash
# Type check
npx nx typecheck twenty-server

# Test database
npx nx run twenty-server:test:integration:with-db-reset -- --testPathPattern=permission
```

**Expected Result**: ✅ All new fields added, migrations run successfully, tests pass

---

#### 📋 Phase 3: Setup Cache & Environment (Week 2, Days 1-2)

**Step 3.1: Configure Redis namespaces**
```typescript
// packages/twenty-server/src/engine/cache-storage/cache-storage.module.ts
export enum CacheStorageNamespace {
  // ... existing
  RbacPermission = 'rbac:permission',
  RbacUser = 'rbac:user',
  RbacTemplate = 'rbac:template',
  RbacPolicy = 'rbac:policy',
}
```

**Step 3.2: Environment variables**
```bash
# Add to .env
RBAC_VALIDATION_MODE=SIMPLIFIED  # SIMPLIFIED | FULL
RBAC_CACHE_ENABLED=true
RBAC_CACHE_TTL=300  # 5 minutes default
RBAC_BYPASS_VALIDATION=false  # Emergency bypass
```

**Step 3.3: Test Redis**
```bash
# Start Redis
docker-compose up -d redis

# Test connectivity
redis-cli ping  # Should return PONG

# Test cache write/read
redis-cli SET test:key "test-value"
redis-cli GET test:key
```

---

#### 📋 Phase 4: Deploy Validation Services (Week 2, Days 3-5)

**Step 4.1: Verify services exist**
```bash
ls packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/

# Expected files:
# - validation-orchestrator.service.ts
# - pre-validation.service.ts
# - user-context-resolution.service.ts
# - resource-identification.service.ts
# - permission-template-check.service.ts
# - action-permission-validation.service.ts
# - ... (15 validation step services)
```

**Step 4.2: Update module imports**
```typescript
// packages/twenty-server/src/mkt-core/mkt-core.module.ts
import { EnterpriseRbacModule } from './mkt-rbac-enterprise-grade/enterprise-rbac.module';

@Module({
  imports: [
    // ... existing
    EnterpriseRbacModule,
  ],
})
export class MktCoreModule {}
```

**Step 4.3: Build and test**
```bash
# Build
npx nx build twenty-server

# Run unit tests
npx nx test twenty-server -- --testPathPattern=rbac

# Run integration tests
npx nx run twenty-server:test:integration:with-db-reset
```

---

#### 📋 Phase 5: Data Seeding & Template Creation (Week 3)

**Step 5.1: Create seeder command**
```bash
touch packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/commands/mkt-rbac-data-seed-dev-workspace.command.ts
```

**Step 5.2: Seed hierarchy templates**
```bash
# Run seeder
npx nx command twenty-server -- mkt-rbac-data-seed-dev-workspace

# Verify templates created
# Check in database or via GraphQL
```

**Step 5.3: Assign templates to users**
```typescript
// Auto-assign based on hierarchy level
// Script to assign templates to existing users
```

---

#### 📋 Phase 6: Gradual Rollout & Monitoring (Week 4-6)

See original section 13.3 for detailed feature flags, shadow mode, and dual-evaluate strategies

**Timeline**:
- Week 4: SIMPLIFIED mode + shadow mode
- Week 5: SIMPLIFIED mode + enforce mode
- Week 6: FULL mode for sensitive resources (phased rollout)

### 13.2. Rollback Plan

**Rollback Triggers**:
- Cache hit rate < 50%
- P95 latency > 2 seconds
- Error rate > 5%
- Critical security issue

**Rollback Steps**:
1. Set `RBAC_VALIDATION_MODE=SIMPLIFIED`
2. Disable optional validation steps
3. Increase cache TTL
4. Scale up Redis instances
5. Review and fix issues
6. Gradual re-enable features

### 13.3. Feature Flags & Safe Rollout

#### 13.3.1. Feature Flags per Resource/Action

```typescript
// Feature flags cho gradual rollout
const RBAC_FEATURE_FLAGS = {
  // Per-resource enablement
  'rbac.v2.mktOrder': true,
  'rbac.v2.mktCustomer': true,
  'rbac.v2.mktPayment': false,  // Not yet enabled

  // Per-action enablement
  'rbac.v2.DELETE.enabled': false,  // Disable DELETE checks initially
  'rbac.v2.APPROVE.enabled': true,

  // Step-level flags
  'rbac.step.hierarchy': true,
  'rbac.step.dynamicConditions': false,  // Disable complex step
  'rbac.step.sensitiveData': true
}

// Check feature flag before validation
const shouldValidate = (resource: string, action: string): boolean => {
  const resourceFlag = `rbac.v2.${resource}`
  const actionFlag = `rbac.v2.${action}.enabled`

  return featureFlags.isEnabled(resourceFlag) &&
         featureFlags.isEnabled(actionFlag, true) // default true
}
```

#### 13.3.2. Shadow Mode (Log-Only)

```typescript
// Shadow mode: evaluate nhưng không block
enum EnforcementMode {
  SHADOW = 'SHADOW',     // Log only, don't block
  ENFORCE = 'ENFORCE'    // Actually block on DENY
}

class ValidationOrchestratorService {
  async executeValidation(
    context: EnhancedPermissionContext
  ): Promise<ValidationResult> {
    const result = await this.runValidationPipeline(context)
    const mode = this.getEnforcementMode(context.resourceContext.objectName)

    if (mode === EnforcementMode.SHADOW) {
      // Log the result but don't block
      await this.auditService.logShadowResult({
        ...result,
        enforcementMode: 'SHADOW',
        wouldHaveBlocked: result.result === 'DENY'
      })

      // Always return PASS in shadow mode
      return {
        ...result,
        result: 'PASS',
        shadowResult: result.result  // Original result for analysis
      }
    }

    return result
  }
}
```

#### 13.3.3. Dual-Evaluate Mode (Compare Legacy vs New)

```typescript
// So sánh kết quả giữa legacy và new system
class DualEvaluateService {
  async evaluate(context: EnhancedPermissionContext): Promise<ValidationResult> {
    // Run both systems in parallel
    const [legacyResult, newResult] = await Promise.all([
      this.legacyAuthService.check(context),
      this.newValidationService.validate(context)
    ])

    // Log diff if results don't match
    if (legacyResult.result !== newResult.result) {
      await this.logResultDiff({
        context,
        legacy: legacyResult,
        new: newResult,
        timestamp: DateTimeUtils.now()
      })

      // Alert if critical mismatch
      if (newResult.result === 'DENY' && legacyResult.result === 'ALLOW') {
        await this.alertService.warn('RBAC_RESULT_MISMATCH', {
          message: 'New system would DENY where legacy ALLOWs',
          ...context
        })
      }
    }

    // Return legacy result during transition
    return this.shouldUseNewSystem()
      ? newResult
      : legacyResult
  }
}
```

#### 13.3.4. Data Backfill Verification

```typescript
// Verify template assignments after migration
class MigrationVerificationService {
  async verifyTemplateAssignments(): Promise<VerificationReport> {
    const allUsers = await this.workspaceMemberRepository.findAll()
    const issues: VerificationIssue[] = []

    for (const user of allUsers) {
      // Check user has at least one template
      const templates = await this.templateService.getUserTemplates(user.id)
      if (templates.length === 0) {
        issues.push({
          type: 'NO_TEMPLATE',
          userId: user.id,
          severity: 'HIGH'
        })
      }

      // Check template matches hierarchy level
      const expectedTemplate = await this.templateService.getExpectedTemplate(
        user.hierarchyLevel,
        user.departmentId
      )
      const hasExpected = templates.some(t => t.id === expectedTemplate?.id)
      if (!hasExpected) {
        issues.push({
          type: 'TEMPLATE_MISMATCH',
          userId: user.id,
          expected: expectedTemplate?.id,
          actual: templates.map(t => t.id),
          severity: 'MEDIUM'
        })
      }
    }

    return { totalUsers: allUsers.length, issues }
  }
}
```

---

## 14. Testing & Quality Gates

### 14.1. Test Matrix

| Test Type | Coverage | Tool | Frequency |
|-----------|----------|------|-----------|
| Unit Tests | All 15 validation steps | Jest | Every commit |
| Contract Tests | Decorators, Guards | Jest + Supertest | Every PR |
| Fixture Tests | Policy resolution scenarios | Jest | Every PR |
| Integration Tests | End-to-end permission flows | Jest + DB | Daily |
| Load Tests | P95/P99 targets | k6/Artillery | Weekly |
| Chaos Tests | Cache/DB degradation | Custom | Weekly |
| Regression Tests | DENY-first behavior | Jest | Every release |

### 14.2. Unit Test Requirements

```typescript
// Mỗi step PHẢI có unit tests cho các scenarios
describe('Step4: PermissionTemplateCheckService', () => {
  describe('loadApplicableTemplates', () => {
    it('should load direct templates for user', async () => { })
    it('should load hierarchy-based templates', async () => { })
    it('should filter by effectiveFrom/effectiveTo', async () => { })
    it('should return empty array if no templates', async () => { })
  })

  describe('resolveTemplateConflicts', () => {
    it('should resolve by priority (highest wins)', async () => { })
    it('should apply MOST_RESTRICTIVE strategy', async () => { })
    it('should apply DENY_WINS when conflicts', async () => { })
  })

  describe('caching', () => {
    it('should cache template results', async () => { })
    it('should invalidate cache on template update', async () => { })
  })
})
```

### 14.3. Load Test Scenarios

```yaml
# k6 load test configuration
scenarios:
  simplified_mode:
    executor: constant-vus
    vus: 100
    duration: 5m
    env:
      RBAC_MODE: SIMPLIFIED
    thresholds:
      http_req_duration: ['p(95)<150', 'p(99)<300']
      http_req_failed: ['rate<0.01']

  full_mode:
    executor: constant-vus
    vus: 50
    duration: 5m
    env:
      RBAC_MODE: FULL
    thresholds:
      http_req_duration: ['p(95)<800', 'p(99)<1500']
      http_req_failed: ['rate<0.01']

  cache_cold:
    executor: shared-iterations
    iterations: 1000
    vus: 20
    env:
      FLUSH_CACHE: true
    thresholds:
      http_req_duration: ['p(95)<500']
```

### 14.4. Chaos Test Scenarios

```typescript
// Chaos tests for resilience
describe('Chaos Tests', () => {
  describe('Redis unavailable', () => {
    beforeEach(() => killRedis())
    afterEach(() => startRedis())

    it('should fallback to database with degraded performance', async () => {
      const result = await validationService.validate(context)
      expect(result.result).toBeDefined() // Should not throw
      expect(result.cacheHit).toBe(false)
    })
  })

  describe('Database slow response', () => {
    beforeEach(() => injectLatency('postgres', 2000))
    afterEach(() => removeLatency('postgres'))

    it('should timeout and return DENY for safety', async () => {
      const result = await validationService.validate(context)
      expect(result.result).toBe('DENY')
      expect(result.reason).toContain('timeout')
    })
  })
})
```

### 14.5. Quality Gates

```yaml
# CI/CD quality gates - phải pass trước khi deploy
quality_gates:
  unit_tests:
    coverage: 80%
    pass_rate: 100%

  integration_tests:
    pass_rate: 100%

  load_tests:
    simplified_p95: 150ms
    full_p95: 800ms
    error_rate: 1%

  security_scan:
    critical_vulnerabilities: 0
    high_vulnerabilities: 0

  code_review:
    required_approvals: 2
    security_team_review: true  # For permission-related changes
```

---

## 15. Operational Runbooks

### 15.1. Incident Response Playbooks

#### High Denial Rate Alert

**Trigger**: `rbac_permission_denials_rate > 30%` for 5 minutes

**Steps**:
1. **Verify alert is real** - Check dashboard for denial rate trend
2. **Identify pattern** - Which resources/actions are being denied?
   ```sql
   SELECT resource, action, count(*) as denial_count
   FROM mkt_permission_audit
   WHERE check_result = 'FAIL'
     AND created_at > NOW() - INTERVAL '15 minutes'
   GROUP BY resource, action
   ORDER BY denial_count DESC;
   ```
3. **Check recent changes** - Were templates/policies updated recently?
4. **Immediate mitigation**:
   - If legitimate: Communicate to affected users
   - If misconfiguration: Rollback template changes
   - If unclear: Switch to SHADOW mode temporarily

**Resolution**:
- Fix template/policy configuration
- Re-enable enforcement mode
- Post-incident review

#### Low Cache Hit Rate Alert

**Trigger**: `rbac_cache_hit_rate < 70%` for 10 minutes

**Steps**:
1. **Check Redis health** - Is Redis responding?
   ```bash
   redis-cli ping
   redis-cli info memory
   ```
2. **Check cache invalidation logs** - Are we invalidating too often?
3. **Check for cache stampede** - High concurrent misses?
4. **Immediate mitigation**:
   ```bash
   # Increase cache TTL temporarily
   SET RBAC_CACHE_TTL_MULTIPLIER 2

   # If Redis down, scale up
   kubectl scale deployment redis --replicas=3
   ```

**Resolution**:
- Fix invalidation logic if over-invalidating
- Scale Redis if capacity issue
- Review cache key patterns

#### High Latency Alert

**Trigger**: `rbac_p95_latency > 1000ms` for 5 minutes

**Steps**:
1. **Identify slow steps** - Which validation steps are slow?
   ```sql
   SELECT step_name, avg(execution_time_ms)
   FROM rbac_step_metrics
   WHERE timestamp > NOW() - INTERVAL '15 minutes'
   GROUP BY step_name
   ORDER BY avg(execution_time_ms) DESC;
   ```
2. **Check database health** - Slow queries? Connection pool exhausted?
3. **Check parallel execution** - Are steps running in parallel?
4. **Immediate mitigation**:
   ```bash
   # Switch to SIMPLIFIED mode
   SET RBAC_VALIDATION_MODE SIMPLIFIED

   # Disable expensive steps
   SET RBAC_SKIP_STEPS "dynamicConditions,hierarchyValidation"
   ```

**Resolution**:
- Optimize slow steps
- Add missing indexes
- Re-enable full mode gradually

### 15.2. Safe Toggle Operations

```bash
# Safe mode switches via environment/config

# 1. Switch validation mode
export RBAC_VALIDATION_MODE=SIMPLIFIED
# or
kubectl set env deployment/twenty-server RBAC_VALIDATION_MODE=SIMPLIFIED

# 2. Disable specific steps (comma-separated)
export RBAC_SKIP_STEPS="step12,step11"

# 3. Enable shadow mode for specific resource
export RBAC_SHADOW_RESOURCES="mktPayment,mktInvoice"

# 4. Increase cache TTL
export RBAC_CACHE_TTL_MULTIPLIER=2

# 5. Emergency bypass (use with extreme caution)
export RBAC_EMERGENCY_BYPASS=true
export RBAC_EMERGENCY_BYPASS_REASON="Database migration in progress"
```

### 15.3. Observability Dashboard Panels

#### Panel 1: Permission Check Overview
- Requests/second (by mode: SIMPLIFIED/FULL)
- Allow/Deny ratio
- Cache hit rate
- Average latency

#### Panel 2: Step Execution
- Execution time per step (heatmap)
- Step skip rate
- Step failure rate

#### Panel 3: Security Alerts
- Emergency access count
- Override usage
- Cross-department access
- Sensitive data access

#### Panel 4: Cache Health
- Hit rate over time
- Memory usage
- Eviction rate
- Invalidation count

### 15.4. SLO/SLA Error Budgets

| Metric | SLO Target | Error Budget (Monthly) |
|--------|------------|------------------------|
| Availability | 99.9% | 43 minutes downtime |
| P95 Latency (SIMPLIFIED) | 150ms | 5% requests > 150ms |
| P95 Latency (FULL) | 800ms | 5% requests > 800ms |
| False Positive Rate | < 0.1% | 0.1% incorrect DENYs |
| False Negative Rate | 0% | 0 incorrect ALLOWs (security critical) |

### 15.5. On-Call Checklist

```markdown
## Daily Checks
- [ ] Permission denial rate within normal range (< 15%)
- [ ] Cache hit rate > 80%
- [ ] No security alerts in last 24h
- [ ] Audit logs writing successfully

## Weekly Checks
- [ ] Review emergency access usage
- [ ] Review override grants/revokes
- [ ] Check template assignment completeness
- [ ] Validate retention enforcement ran successfully

## Monthly Checks
- [ ] Generate compliance reports
- [ ] Review permission patterns for anomalies
- [ ] Audit template definitions
- [ ] Performance trend analysis
```

---

*Document version: 2.1*
*Last updated: 2026-01-08*
*Author: CRM Engineering Team*
