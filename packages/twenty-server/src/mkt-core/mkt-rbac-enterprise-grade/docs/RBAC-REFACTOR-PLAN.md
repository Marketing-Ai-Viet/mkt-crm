# RBAC Refactor Plan

> Tài liệu kế hoạch refactor hệ thống RBAC để tuân theo thiết kế đúng với PermissionContext (Template Layer) và DataAccessPolicy (Override Layer)

## Mục lục

1. [Vấn đề hiện tại](#1-vấn-đề-hiện-tại)
2. [Thiết kế đúng](#2-thiết-kế-đúng)
3. [Kế hoạch Refactor](#3-kế-hoạch-refactor)
4. [Chi tiết triển khai](#4-chi-tiết-triển-khai)
5. [Migration Strategy](#5-migration-strategy)
6. [Testing Plan](#6-testing-plan)

---

## 1. Vấn đề hiện tại

### 1.1. Phân tích hiện trạng

| Component | Trạng thái | Vấn đề |
|-----------|------------|--------|
| `MktPermissionContextWorkspaceEntity` | ✅ Có | Entity đã tạo |
| `MktPermissionContextRepository` | ✅ Có | Repository đã tạo |
| `PermissionContextService` | ❌ THIẾU | Không có service |
| `mktPermissionContext` table | ⚠️ TRỐNG | 0 records |
| `MktDataAccessPolicyWorkspaceEntity` | ✅ Có | Đang hoạt động |
| `DataAccessPolicyService` | ✅ Có | Đang hoạt động |
| `mktDataAccessPolicy` table | ✅ Có | 8 records |

### 1.2. Flow hiện tại (SAI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLOW HIỆN TẠI (SAI)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Request                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────┐                                        │
│  │ RbacContextService              │                                        │
│  │ resolveContext()                │                                        │
│  │                                 │                                        │
│  │ → Lấy UserContext               │                                        │
│  │ → dataAccessScope từ OrgLevel   │                                        │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ RbacEnforcerService             │                                        │
│  │ buildDataFilter()               │                                        │
│  │                                 │                                        │
│  │ → Switch dataAccessScope        │  ← HARD-CODED LOGIC (thay thế         │
│  │ → Tạo filter conditions         │    PermissionContext)                  │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ DataAccessPolicyRepository      │                                        │
│  │ findForMemberAndObject()        │                                        │
│  │                                 │                                        │
│  │ → Lấy policies (đã có filter    │  ← DataAccessPolicy đang làm          │
│  │   conditions resolved)          │    cả 2 vai trò                        │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ Merged Filter Conditions        │                                        │
│  │ (OR logic)                      │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                             │
│  ❌ THIẾU: PermissionContext không được sử dụng                             │
│  ❌ THIẾU: Không có template variable resolution                            │
│  ❌ SAI: DataAccessPolicy chứa cả template logic                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3. Vấn đề cụ thể

1. **Hard-coded filter logic** trong `RbacEnforcerService.buildDataFilter()`:
   ```typescript
   // Line 415-486 - Logic switch theo dataAccessScope
   switch (userContext.dataAccessScope) {
     case DATA_ACCESS_SCOPE.OWN_RECORDS:
       conditions.push({
         field: 'createdByWorkspaceMemberId',
         operator: '=',
         value: userContext.workspaceMemberId,  // ← Hard-coded
       });
   }
   ```

2. **DataAccessPolicy chứa business logic phức tạp** thay vì chỉ là override:
   ```json
   // mktDataAccessPolicy hiện tại
   {
     "hierarchicalAccess": {
       "rules": [...],           // ← Đây nên là PermissionContext
       "peerRestriction": {...}  // ← Đây nên là PermissionContext
     }
   }
   ```

3. **Không có PermissionContextService** để:
   - Seed default contexts
   - Resolve template variables
   - Link với TemplateResourcePermission

---

## 2. Thiết kế đúng

### 2.1. Flow đúng theo tài liệu

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLOW ĐÚNG (TARGET)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Request                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────┐                                        │
│  │ BƯỚC 1: Resolve User Context    │                                        │
│  │ RbacContextService              │                                        │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ BƯỚC 2: Check DataAccessPolicy  │  ← Override Layer (check trước)       │
│  │ DataAccessPolicyService         │                                        │
│  │                                 │                                        │
│  │ Có policy match?                │                                        │
│  │ ├─ YES → Dùng filterConditions  │  (đã resolved, sẵn sàng query)        │
│  │ └─ NO  → Tiếp tục bước 3        │                                        │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ BƯỚC 3: Get Permission Template │                                        │
│  │ TemplateResourcePermission      │                                        │
│  │                                 │                                        │
│  │ → Lấy contextId từ template     │                                        │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ BƯỚC 4: Get PermissionContext   │  ← Template Layer                     │
│  │ PermissionContextService        │                                        │
│  │                                 │                                        │
│  │ → Lấy filterExpression          │  (chứa $user.*, $context.*)           │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ BƯỚC 5: Resolve Template Vars   │  ← NEW SERVICE                        │
│  │ FilterExpressionResolver        │                                        │
│  │                                 │                                        │
│  │ $user.workspaceMemberId         │                                        │
│  │   → "member-uuid-123"           │                                        │
│  │ $user.departmentDescendantIds   │                                        │
│  │   → ["dept-1", "dept-2"]        │                                        │
│  └─────────────┬───────────────────┘                                        │
│                │                                                            │
│                ▼                                                            │
│  ┌─────────────────────────────────┐                                        │
│  │ BƯỚC 6: Apply to Query          │                                        │
│  │ ResolvedFilterConditions        │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Phân chia trách nhiệm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION CONTEXT (Template Layer)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Mục đích: Định nghĩa QUY TẮC CHUNG với template variables                  │
│  Khi tạo: Setup hệ thống (1 lần, seed data)                                 │
│  Ai tạo: Admin/System                                                       │
│  Số lượng: Ít (~10-20 loại)                                                 │
│                                                                             │
│  Ví dụ contexts:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ contextKey: "own"                                                    │   │
│  │ contextType: "OWN_RECORDS"                                          │   │
│  │ filterExpression: {                                                  │   │
│  │   "createdById": "$user.workspaceMemberId"                          │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ contextKey: "team"                                                   │   │
│  │ contextType: "TEAM_RECORDS"                                         │   │
│  │ filterExpression: {                                                  │   │
│  │   "createdById": { "$in": "$user.teamMemberIds" }                   │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ contextKey: "department"                                             │   │
│  │ contextType: "DEPARTMENT_RECORDS"                                   │   │
│  │ filterExpression: {                                                  │   │
│  │   "departmentId": { "$in": "$user.departmentDescendantIds" }        │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ contextKey: "all"                                                    │   │
│  │ contextType: "ALL_RECORDS"                                          │   │
│  │ filterExpression: {}                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ contextKey: "hierarchical"                                           │   │
│  │ contextType: "HIERARCHICAL_RECORDS"                                 │   │
│  │ filterExpression: {                                                  │   │
│  │   "$or": [                                                           │   │
│  │     { "createdById": "$user.workspaceMemberId" },                   │   │
│  │     { "createdById": { "$in": "$user.subordinateMemberIds" } }      │   │
│  │   ]                                                                  │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                                    │
                                    │ Có thể bị OVERRIDE bởi
                                    ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS POLICY (Override Layer)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Mục đích: Định nghĩa NGOẠI LỆ với giá trị đã resolve                       │
│  Khi tạo: Khi cần override quy tắc chung                                    │
│  Ai tạo: Admin tạo manual                                                   │
│  Số lượng: Theo nhu cầu business                                            │
│                                                                             │
│  Ví dụ policies:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ name: "HCM Full Access Override"                                     │   │
│  │ objectName: "mktOrder"                                               │   │
│  │ departmentId: "dept-hcm-uuid"                                       │   │
│  │ filterConditions: {}  ← Không filter = xem tất cả                   │   │
│  │ priority: 100                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ name: "Manager Nguyen Van A - Temporary Full Access"                 │   │
│  │ objectName: "mktCustomer"                                            │   │
│  │ specificMemberId: "member-A-uuid"                                   │   │
│  │ filterConditions: {}                                                 │   │
│  │ priority: 200                                                        │   │
│  │ expiresAt: "2025-03-01"  ← Temporary override                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Kế hoạch Refactor

### 3.1. Tổng quan phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REFACTOR PHASES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: Tạo PermissionContextService & Seed Data                          │
│  ├─ Task 1.1: Tạo PermissionContextService                                  │
│  ├─ Task 1.2: Tạo FilterExpressionResolverService                           │
│  ├─ Task 1.3: Tạo seed data cho PermissionContext                           │
│  └─ Task 1.4: Update exports trong index.ts                                 │
│                                                                             │
│  Phase 2: Refactor RbacEnforcerService                                      │
│  ├─ Task 2.1: Inject PermissionContextService                               │
│  ├─ Task 2.2: Refactor buildDataFilter() để dùng PermissionContext          │
│  ├─ Task 2.3: Implement override logic với DataAccessPolicy                 │
│  └─ Task 2.4: Xóa hard-coded switch logic                                   │
│                                                                             │
│  Phase 3: Migration DataAccessPolicy hiện có                                │
│  ├─ Task 3.1: Phân tích 8 policies hiện có                                  │
│  ├─ Task 3.2: Extract template logic → PermissionContext                    │
│  ├─ Task 3.3: Giữ lại override logic trong DataAccessPolicy                 │
│  └─ Task 3.4: Tạo migration script                                          │
│                                                                             │
│  Phase 4: Testing & Documentation                                           │
│  ├─ Task 4.1: Unit tests cho các services mới                               │
│  ├─ Task 4.2: Integration tests cho flow mới                                │
│  ├─ Task 4.3: Update documentation                                          │
│  └─ Task 4.4: Performance testing                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Dependencies

```
Phase 1 ──────────────────┐
                          │
                          ▼
Phase 2 ◄─────────────────┤
                          │
                          ▼
Phase 3 ◄─────────────────┤
                          │
                          ▼
Phase 4 ◄─────────────────┘
```

---

## 4. Chi tiết triển khai

### 4.1. Phase 1: Tạo Services mới

#### Task 1.1: PermissionContextService

**File:** `services/bases/permission-context.service.ts`

```typescript
/**
 * PermissionContextService - Business logic for Permission Context
 *
 * Manages permission context definitions (template layer).
 * Provides methods to get context by key/type and resolve filter expressions.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MktPermissionContextRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionContextWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import { ContextType } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

// Types
export type CreateContextInput = {
  contextKey: string;
  contextType: ContextType;
  name: string;
  description?: string;
  filterExpression: Record<string, unknown>;
  priority?: number;
  isSystemDefault?: boolean;
};

export type ContextQueryOptions = {
  includeInactive?: boolean;
  includeRelations?: boolean;
};

@Injectable()
export class PermissionContextService {
  private readonly logger = new Logger(PermissionContextService.name);

  constructor(
    private readonly contextRepository: MktPermissionContextRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  // ============================================
  // READ OPERATIONS
  // ============================================

  async getByContextKey(
    workspaceId: string,
    contextKey: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    // Check cache first
    const cached = await this.cacheService.getContext(workspaceId, contextKey);
    if (cached) return cached;

    const context = await this.contextRepository.findByContextKey(contextKey);

    if (context) {
      await this.cacheService.setContext(workspaceId, contextKey, context);
    }

    return context;
  }

  async getByContextKeyOrThrow(
    workspaceId: string,
    contextKey: string,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    const context = await this.getByContextKey(workspaceId, contextKey);

    if (!context) {
      throw new NotFoundException(`Permission context not found: ${contextKey}`);
    }

    return context;
  }

  async getByContextType(
    workspaceId: string,
    contextType: ContextType,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    return this.contextRepository.findByContextType(workspaceId, contextType);
  }

  async getSystemDefaults(
    workspaceId: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    return this.contextRepository.findSystemDefaults(workspaceId);
  }

  async getAllActive(
    workspaceId: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    return this.contextRepository.findActive(workspaceId);
  }

  // ============================================
  // CONTEXT MAPPING
  // ============================================

  /**
   * Get context key for data access scope
   * Maps OrganizationLevel.dataAccessScope → PermissionContext.contextKey
   */
  getContextKeyForDataAccessScope(dataAccessScope: string): string {
    const scopeToContextMap: Record<string, string> = {
      'ALL_DEPARTMENTS': 'all',
      'OWN_AND_CHILD_DEPARTMENTS': 'department',
      'OWN_DEPARTMENT_AND_TEAM': 'team',
      'OWN_RECORDS': 'own',
    };

    return scopeToContextMap[dataAccessScope] ?? 'own';
  }

  // ============================================
  // CREATE OPERATIONS (for seeding)
  // ============================================

  async createContext(
    workspaceId: string,
    input: CreateContextInput,
  ): Promise<MktPermissionContextWorkspaceEntity> {
    const context = await this.contextRepository.create({
      contextKey: input.contextKey,
      contextType: input.contextType,
      name: input.name,
      description: input.description,
      filterExpression: input.filterExpression,
      priority: input.priority ?? 0,
      isSystemDefault: input.isSystemDefault ?? false,
      isActive: true,
    });

    this.logger.log(`Created permission context: ${input.contextKey}`);

    return context;
  }

  async createSystemDefaults(workspaceId: string): Promise<void> {
    const defaults = this.getSystemDefaultContexts();

    for (const def of defaults) {
      const existing = await this.getByContextKey(workspaceId, def.contextKey);

      if (!existing) {
        await this.createContext(workspaceId, def);
      }
    }

    this.logger.log('System default contexts created');
  }

  // ============================================
  // SYSTEM DEFAULTS
  // ============================================

  private getSystemDefaultContexts(): CreateContextInput[] {
    return [
      {
        contextKey: 'own',
        contextType: 'OWN_RECORDS' as ContextType,
        name: 'Own Records Only',
        description: 'User can only access records they created or are assigned to',
        filterExpression: {
          $or: [
            { createdById: '$user.workspaceMemberId' },
            { accountOwnerId: '$user.workspaceMemberId' },
          ],
        },
        priority: 0,
        isSystemDefault: true,
      },
      {
        contextKey: 'team',
        contextType: 'TEAM_RECORDS' as ContextType,
        name: 'Team Records',
        description: 'User can access records of their team members',
        filterExpression: {
          $or: [
            { createdById: '$user.workspaceMemberId' },
            { createdById: { $in: '$user.teamMemberIds' } },
            { accountOwnerId: { $in: '$user.teamMemberIds' } },
          ],
        },
        priority: 10,
        isSystemDefault: true,
      },
      {
        contextKey: 'department',
        contextType: 'DEPARTMENT_RECORDS' as ContextType,
        name: 'Department Records',
        description: 'User can access records from their department and child departments',
        filterExpression: {
          $or: [
            { departmentId: '$user.departmentId' },
            { departmentId: { $in: '$user.departmentDescendantIds' } },
          ],
        },
        priority: 20,
        isSystemDefault: true,
      },
      {
        contextKey: 'hierarchical',
        contextType: 'HIERARCHICAL_RECORDS' as ContextType,
        name: 'Hierarchical Records',
        description: 'User can access records based on organizational hierarchy',
        filterExpression: {
          $or: [
            { createdById: '$user.workspaceMemberId' },
            { createdById: { $in: '$user.subordinateMemberIds' } },
          ],
        },
        priority: 15,
        isSystemDefault: true,
      },
      {
        contextKey: 'all',
        contextType: 'ALL_RECORDS' as ContextType,
        name: 'All Records',
        description: 'User can access all records without restriction',
        filterExpression: {},
        priority: 100,
        isSystemDefault: true,
      },
    ];
  }
}
```

#### Task 1.2: FilterExpressionResolverService

**File:** `services/filter-expression-resolver.service.ts`

```typescript
/**
 * FilterExpressionResolverService - Resolves template variables in filter expressions
 *
 * Converts PermissionContext.filterExpression (with $user.* variables)
 * to resolved filter conditions (with actual values).
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  TemplateFilterExpression,
  ResolvedFilterConditions,
  FilterResolutionContext,
  FilterResolutionResult,
  TEMPLATE_VARIABLES,
  isTemplateVariable,
  hasTemplateVariables,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/filter-expression.types';
import { RBACUserContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/rbac-context.types';

@Injectable()
export class FilterExpressionResolverService {
  private readonly logger = new Logger(FilterExpressionResolverService.name);

  /**
   * Resolve template filter expression to actual values
   */
  resolveFilterExpression(
    templateFilter: TemplateFilterExpression,
    userContext: RBACUserContext,
    additionalContext?: Record<string, unknown>,
  ): FilterResolutionResult {
    const unresolvedVariables: string[] = [];
    const errors: string[] = [];

    try {
      // Build resolution context
      const resolutionContext: FilterResolutionContext = {
        user: {
          userId: userContext.userId,
          workspaceMemberId: userContext.workspaceMemberId,
          workspaceId: userContext.workspaceId,
          departmentId: userContext.departmentId,
          departmentAncestorIds: userContext.departmentAncestorIds,
          departmentDescendantIds: userContext.departmentDescendantIds,
          teamMemberIds: userContext.teamMemberIds,
          subordinateMemberIds: userContext.subordinateMemberIds,
          supportingMemberIds: userContext.supportingMemberIds,
          hierarchyLevel: userContext.hierarchyLevel,
          organizationLevelId: userContext.organizationLevelId,
        },
        context: additionalContext,
      };

      // Resolve the filter
      const resolvedFilter = this.resolveObject(
        templateFilter,
        resolutionContext,
        unresolvedVariables,
      );

      // Check for empty filter (ALL_RECORDS case)
      if (Object.keys(resolvedFilter).length === 0) {
        return {
          success: true,
          resolvedFilter: null, // null means no filter (all access)
          unresolvedVariables: [],
          errors: [],
        };
      }

      return {
        success: unresolvedVariables.length === 0,
        resolvedFilter: resolvedFilter as ResolvedFilterConditions,
        unresolvedVariables,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Filter resolution failed: ${errorMessage}`);

      return {
        success: false,
        resolvedFilter: null,
        unresolvedVariables,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Check if expression needs resolution
   */
  needsResolution(filter: unknown): boolean {
    return hasTemplateVariables(filter);
  }

  // ============================================
  // PRIVATE RESOLUTION METHODS
  // ============================================

  private resolveObject(
    obj: Record<string, unknown>,
    context: FilterResolutionContext,
    unresolvedVars: string[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.resolveValue(value, context, unresolvedVars);
    }

    return result;
  }

  private resolveValue(
    value: unknown,
    context: FilterResolutionContext,
    unresolvedVars: string[],
  ): unknown {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle template variable string
    if (typeof value === 'string') {
      if (isTemplateVariable(value)) {
        return this.resolveTemplateVariable(value, context, unresolvedVars);
      }
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.resolveValue(item, context, unresolvedVars));
    }

    // Handle objects (including operators like $in, $or, etc.)
    if (typeof value === 'object') {
      return this.resolveObject(
        value as Record<string, unknown>,
        context,
        unresolvedVars,
      );
    }

    // Return primitives as-is
    return value;
  }

  private resolveTemplateVariable(
    variable: string,
    context: FilterResolutionContext,
    unresolvedVars: string[],
  ): unknown {
    // Parse variable path: "$user.workspaceMemberId" → ["user", "workspaceMemberId"]
    const parts = variable.replace('$', '').split('.');
    const root = parts[0]; // "user" or "context"
    const path = parts.slice(1); // ["workspaceMemberId"]

    let current: unknown;

    // Get root object
    if (root === 'user') {
      current = context.user;
    } else if (root === 'context') {
      current = context.context;
    } else {
      unresolvedVars.push(variable);
      return variable;
    }

    // Navigate path
    for (const key of path) {
      if (current === null || current === undefined) {
        unresolvedVars.push(variable);
        return variable;
      }

      if (typeof current === 'object' && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        unresolvedVars.push(variable);
        return variable;
      }
    }

    return current;
  }
}
```

#### Task 1.3: Seed Data Command ✅ ĐÃ TRIỂN KHAI

**Files đã tạo:**

```
seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/
├── mkt-permission-context-data-seeds.constants.ts  ← Seed data definitions
├── prefill-mkt-permission-contexts.ts               ← Prefill function
├── mkt-permission-context-all.view.ts               ← View definition
├── mkt-permission-context-data-seed-dev-workspace.command.ts  ← Command
└── index.ts                                         ← Barrel exports
```

**Command:** `workspace:seed:permission-context-module`

**Sử dụng:**

```bash
# Seed cho tất cả workspaces
npx nx command twenty-server -- workspace:seed:permission-context-module

# Seed cho workspace cụ thể
npx nx command twenty-server -- workspace:seed:permission-context-module -w <workspace-id>
```

**System Default Contexts (6 contexts):**

| contextKey | contextType | Priority | Description |
|------------|-------------|----------|-------------|
| `own` | OWN_RECORDS | 0 | User chỉ xem record của mình |
| `own_and_supporting` | OWN_RECORDS | 5 | Xem record mình + supporting members |
| `team` | TEAM_RECORDS | 10 | Xem record của team members |
| `hierarchical` | TEAM_RECORDS | 15 | Xem record theo chuỗi báo cáo |
| `department` | DEPARTMENT_RECORDS | 20 | Xem record của department + children |
| `all` | ALL_RECORDS | 100 | Xem tất cả (không filter) |

**Đăng ký trong:**
- `mkt-database-command.module.ts` - Command registration
- `mkt-dev-seeder-data.config.ts` - Data seed config
- `mkt-prefill-views.ts` - View registration
- `mkt-objects-prefill-data.ts` - Prefill registration

### 4.2. Phase 2: Refactor RbacEnforcerService

**File:** `services/rbac-enforcer.service.ts` (updated)

```typescript
// Thêm imports mới
import { PermissionContextService } from './bases/permission-context.service';
import { FilterExpressionResolverService } from './filter-expression-resolver.service';
import { DataAccessPolicyService } from './bases/data-access-policy.service';

@Injectable()
export class RbacEnforcerService {
  constructor(
    private readonly casbinEnforcerService: CasbinEnforcerService,
    private readonly rbacContextService: RbacContextService,
    private readonly dataAccessPolicyRepository: MktDataAccessPolicyRepository,
    // NEW: Thêm services mới
    private readonly permissionContextService: PermissionContextService,
    private readonly filterExpressionResolver: FilterExpressionResolverService,
    private readonly dataAccessPolicyService: DataAccessPolicyService,
  ) {}

  /**
   * Build data filter - REFACTORED VERSION
   *
   * Flow mới:
   * 1. Check DataAccessPolicy (override layer) trước
   * 2. Nếu không có override → dùng PermissionContext (template layer)
   * 3. Resolve template variables thành actual values
   */
  private async buildDataFilter(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
  ): Promise<FilterCondition | null> {
    // Users with full access (level 1-3) have no filter
    if (userContext.hasFullAccess) {
      return null;
    }

    // ============================================
    // STEP 1: Check DataAccessPolicy (Override Layer)
    // ============================================
    const overridePolicies = await this.dataAccessPolicyService.findMatchingPolicies(
      workspaceId,
      userContext.workspaceMemberId,
      resource,
      userContext.departmentId,
      userContext.organizationLevelId,
    );

    // If override exists with higher priority, use it directly
    if (overridePolicies.length > 0) {
      const highestPriorityPolicy = overridePolicies[0]; // Already sorted by priority

      this.logger.debug(
        `Using DataAccessPolicy override: ${highestPriorityPolicy.name}`,
      );

      // DataAccessPolicy.filterConditions đã là resolved values
      return this.convertPolicyToFilterCondition(highestPriorityPolicy);
    }

    // ============================================
    // STEP 2: Get PermissionContext (Template Layer)
    // ============================================
    const contextKey = this.permissionContextService.getContextKeyForDataAccessScope(
      userContext.dataAccessScope,
    );

    const permissionContext = await this.permissionContextService.getByContextKey(
      workspaceId,
      contextKey,
    );

    if (!permissionContext) {
      this.logger.warn(`Permission context not found: ${contextKey}`);
      // Fallback to OWN_RECORDS
      return this.buildOwnRecordsFilter(userContext);
    }

    // ============================================
    // STEP 3: Resolve Template Variables
    // ============================================
    const rbacUserContext = await this.rbacContextService.resolveFullContext(
      userContext.userId,
      workspaceId,
    );

    const resolutionResult = this.filterExpressionResolver.resolveFilterExpression(
      permissionContext.filterExpression as TemplateFilterExpression,
      rbacUserContext,
    );

    if (!resolutionResult.success) {
      this.logger.warn(
        `Filter resolution incomplete. Unresolved: ${resolutionResult.unresolvedVariables.join(', ')}`,
      );
    }

    // null resolvedFilter means ALL_RECORDS (no filter)
    if (resolutionResult.resolvedFilter === null) {
      return null;
    }

    // ============================================
    // STEP 4: Convert to FilterCondition format
    // ============================================
    return this.convertResolvedFilterToCondition(resolutionResult.resolvedFilter);
  }

  /**
   * Convert DataAccessPolicy to FilterCondition
   */
  private convertPolicyToFilterCondition(
    policy: MktDataAccessPolicyWorkspaceEntity,
  ): FilterCondition {
    const conditions: FilterConditionItem[] = [];
    const filterConditions = policy.filterConditions as Record<string, unknown>;

    // Handle ownership filter
    if (filterConditions.ownership?.enabled) {
      conditions.push({
        field: filterConditions.ownership.field as string,
        operator: '=',
        value: '${user.workspaceMemberId}', // Will be resolved later
        description: 'Ownership filter',
      });
    }

    // Handle status filter
    if (filterConditions.status) {
      if (filterConditions.status.allowedValues) {
        conditions.push({
          field: 'status',
          operator: 'IN',
          value: filterConditions.status.allowedValues,
          description: 'Allowed status values',
        });
      }
      if (filterConditions.status.deniedValues) {
        conditions.push({
          field: 'status',
          operator: 'NOT_IN',
          value: filterConditions.status.deniedValues,
          description: 'Denied status values',
        });
      }
    }

    // Handle explicit conditions array
    if (filterConditions.conditions && Array.isArray(filterConditions.conditions)) {
      for (const cond of filterConditions.conditions) {
        conditions.push({
          field: cond.field,
          operator: cond.operator,
          value: cond.value,
          description: cond.description,
        });
      }
    }

    return {
      type: 'AND',
      conditions,
    };
  }

  /**
   * Convert resolved filter to FilterCondition format
   */
  private convertResolvedFilterToCondition(
    resolvedFilter: ResolvedFilterConditions,
  ): FilterCondition {
    const conditions: FilterConditionItem[] = [];

    // Handle $or operator
    if (resolvedFilter.$or && Array.isArray(resolvedFilter.$or)) {
      for (const orCondition of resolvedFilter.$or) {
        const subConditions = this.flattenFilterObject(orCondition as Record<string, unknown>);
        conditions.push(...subConditions);
      }

      return {
        type: 'OR',
        conditions,
      };
    }

    // Handle $and operator
    if (resolvedFilter.$and && Array.isArray(resolvedFilter.$and)) {
      for (const andCondition of resolvedFilter.$and) {
        const subConditions = this.flattenFilterObject(andCondition as Record<string, unknown>);
        conditions.push(...subConditions);
      }

      return {
        type: 'AND',
        conditions,
      };
    }

    // Handle flat conditions
    const flatConditions = this.flattenFilterObject(resolvedFilter);

    return {
      type: 'AND',
      conditions: flatConditions,
    };
  }

  /**
   * Flatten filter object to array of conditions
   */
  private flattenFilterObject(
    obj: Record<string, unknown>,
  ): FilterConditionItem[] {
    const conditions: FilterConditionItem[] = [];

    for (const [field, value] of Object.entries(obj)) {
      // Skip special operators at root level
      if (field.startsWith('$')) continue;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Handle operator objects like { $in: [...] }
        const operatorObj = value as Record<string, unknown>;

        for (const [op, opValue] of Object.entries(operatorObj)) {
          conditions.push({
            field,
            operator: this.mapOperator(op),
            value: opValue,
          });
        }
      } else {
        // Direct value = equality
        conditions.push({
          field,
          operator: '=',
          value,
        });
      }
    }

    return conditions;
  }

  /**
   * Map filter expression operator to FilterCondition operator
   */
  private mapOperator(op: string): FilterOperator {
    const operatorMap: Record<string, FilterOperator> = {
      '$eq': '=',
      '$ne': '!=',
      '$gt': '>',
      '$gte': '>=',
      '$lt': '<',
      '$lte': '<=',
      '$in': 'IN',
      '$nin': 'NOT_IN',
      '$like': 'LIKE',
      '$isNull': 'IS_NULL',
      '$exists': 'IS_NOT_NULL',
    };

    return operatorMap[op] ?? '=';
  }

  /**
   * Fallback filter for OWN_RECORDS
   */
  private buildOwnRecordsFilter(userContext: UserContext): FilterCondition {
    return {
      type: 'OR',
      conditions: [
        {
          field: 'createdByWorkspaceMemberId',
          operator: '=',
          value: userContext.workspaceMemberId,
          description: 'Own records',
        },
        {
          field: 'accountOwnerId',
          operator: '=',
          value: userContext.workspaceMemberId,
          description: 'Assigned to user',
        },
      ],
    };
  }
}
```

### 4.3. Phase 3: Migration DataAccessPolicy

#### Phân tích 8 policies hiện có

| Policy | Object | Phân loại | Action |
|--------|--------|-----------|--------|
| Sales Order Hierarchy Access Policy | mktOrder | **MIX** | Extract hierarchicalAccess → PermissionContext |
| Sales Customer Ownership Policy | mktCustomer | **OVERRIDE** | Giữ nguyên |
| Support Recent Access Policy | mktCustomer | **OVERRIDE** | Giữ nguyên |
| Accounting Invoice Access Policy | mktInvoice | **OVERRIDE** | Giữ nguyên |
| Tech System Administration Policy | mktKpi | **OVERRIDE** | Giữ nguyên |
| HR Confidential Data Policy | workspaceMember | **OVERRIDE** | Giữ nguyên |
| Department Head Override Policy | mktContract | **OVERRIDE** | Giữ nguyên |
| Team Manager View Policy | mktProduct | **OVERRIDE** | Giữ nguyên |

#### Migration Script

**File:** `migrations/rbac-migration-v2.ts`

```typescript
/**
 * Migration: Extract template logic from DataAccessPolicy to PermissionContext
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RbacMigrationV2 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo PermissionContext cho hierarchical access
    await queryRunner.query(`
      INSERT INTO "mktPermissionContext" (
        "id", "contextKey", "contextType", "name", "description",
        "filterExpression", "priority", "isSystemDefault", "isActive"
      ) VALUES
      (
        gen_random_uuid(),
        'hierarchical_staff',
        'HIERARCHICAL_RECORDS',
        'Staff Hierarchical Access',
        'Staff (level 8-11) can only see records they created',
        '{"createdById": "$user.workspaceMemberId"}',
        0,
        true,
        true
      ),
      (
        gen_random_uuid(),
        'hierarchical_manager',
        'HIERARCHICAL_RECORDS',
        'Manager Hierarchical Access',
        'Manager (level 7) can see records of direct subordinates',
        '{"$or": [{"createdById": "$user.workspaceMemberId"}, {"createdById": {"$in": "$user.subordinateMemberIds"}}]}',
        10,
        true,
        true
      ),
      (
        gen_random_uuid(),
        'hierarchical_upper_management',
        'HIERARCHICAL_RECORDS',
        'Upper Management Hierarchical Access',
        'Upper management (level 1-6) can see entire reporting chain',
        '{"$or": [{"createdById": "$user.workspaceMemberId"}, {"createdById": {"$in": "$user.subordinateMemberIds"}}, {"createdById": {"$in": "$user.teamMemberIds"}}]}',
        20,
        true,
        true
      )
      ON CONFLICT ("contextKey") DO NOTHING
    `);

    // 2. Cập nhật Sales Order Hierarchy Access Policy
    // Giữ lại chỉ override logic (departmentScope, status), xóa hierarchicalAccess
    await queryRunner.query(`
      UPDATE "mktDataAccessPolicy"
      SET "filterConditions" = jsonb_set(
        "filterConditions"::jsonb - 'hierarchicalAccess',
        '{note}',
        '"Hierarchical access moved to PermissionContext"'
      )
      WHERE "name" = 'Sales Order Hierarchy Access Policy'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Xóa các contexts đã tạo
    await queryRunner.query(`
      DELETE FROM "mktPermissionContext"
      WHERE "contextKey" IN (
        'hierarchical_staff',
        'hierarchical_manager',
        'hierarchical_upper_management'
      )
    `);
  }
}
```

---

## 5. Migration Strategy

### 5.1. Backward Compatibility

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKWARD COMPATIBILITY STRATEGY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1-2: Parallel Running                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  - Giữ nguyên code cũ (hard-coded logic)                                    │
│  - Thêm feature flag: RBAC_USE_PERMISSION_CONTEXT                           │
│  - Nếu flag = false: Dùng logic cũ                                          │
│  - Nếu flag = true: Dùng logic mới với PermissionContext                    │
│                                                                             │
│  if (env.RBAC_USE_PERMISSION_CONTEXT) {                                     │
│    return this.buildDataFilterNew(workspaceId, userContext, resource);      │
│  }                                                                          │
│  return this.buildDataFilterLegacy(workspaceId, userContext, resource);     │
│                                                                             │
│  Phase 3: Full Migration                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  - Migrate tất cả workspace sang logic mới                                  │
│  - Remove feature flag                                                      │
│  - Remove legacy code                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Environment Variables

```bash
# .env
RBAC_USE_PERMISSION_CONTEXT=false  # Phase 1-2: false, Phase 3: true/remove
RBAC_FALLBACK_ON_ERROR=true        # Fallback to legacy if new logic fails
RBAC_DEBUG_FILTER_RESOLUTION=false # Log filter resolution details
```

---

## 6. Testing Plan

### 6.1. Unit Tests

```typescript
// tests/permission-context.service.spec.ts
describe('PermissionContextService', () => {
  describe('getByContextKey', () => {
    it('should return context for valid key', async () => {});
    it('should return null for invalid key', async () => {});
    it('should use cache on second call', async () => {});
  });

  describe('getContextKeyForDataAccessScope', () => {
    it('should map ALL_DEPARTMENTS to "all"', () => {});
    it('should map OWN_RECORDS to "own"', () => {});
    it('should default to "own" for unknown scope', () => {});
  });
});

// tests/filter-expression-resolver.service.spec.ts
describe('FilterExpressionResolverService', () => {
  describe('resolveFilterExpression', () => {
    it('should resolve $user.workspaceMemberId', () => {});
    it('should resolve $user.teamMemberIds array', () => {});
    it('should handle $or operator', () => {});
    it('should handle $in operator with variable', () => {});
    it('should return null for empty filter (ALL_RECORDS)', () => {});
    it('should track unresolved variables', () => {});
  });
});
```

### 6.2. Integration Tests

```typescript
// tests/rbac-flow.integration.spec.ts
describe('RBAC Flow Integration', () => {
  describe('Staff user (level 9)', () => {
    it('should only see own records', async () => {
      // 1. Create user with level 9
      // 2. Create records by different users
      // 3. Check filter only includes own records
    });
  });

  describe('Manager user (level 7)', () => {
    it('should see own and subordinate records', async () => {});
  });

  describe('Override with DataAccessPolicy', () => {
    it('should use policy filter when override exists', async () => {});
    it('should fallback to PermissionContext when no override', async () => {});
  });
});
```

### 6.3. Performance Tests

```typescript
describe('RBAC Performance', () => {
  it('should resolve filter under 50ms', async () => {
    const start = Date.now();
    await rbacEnforcerService.buildDataFilter(workspaceId, userContext, resource);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('should use cache effectively', async () => {
    // First call
    await rbacEnforcerService.buildDataFilter(workspaceId, userContext, resource);
    // Second call should be faster
    const start = Date.now();
    await rbacEnforcerService.buildDataFilter(workspaceId, userContext, resource);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5); // Cache hit
  });
});
```

---

## 7. Checklist

### Phase 1 Checklist

- [ ] Tạo `PermissionContextService`
- [ ] Tạo `FilterExpressionResolverService`
- [x] Tạo seed data constants (`mkt-permission-context-data-seeds.constants.ts`)
- [x] Tạo prefill function (`prefill-mkt-permission-contexts.ts`)
- [x] Tạo view definition (`mkt-permission-context-all.view.ts`)
- [x] Tạo seed command (`workspace:seed:permission-context-module`)
- [x] Đăng ký command trong `mkt-database-command.module.ts`
- [x] Đăng ký data seed trong `mkt-dev-seeder-data.config.ts`
- [x] Đăng ký view trong `mkt-prefill-views.ts`
- [x] Đăng ký prefill trong `mkt-objects-prefill-data.ts`
- [ ] Chạy seed command tạo default contexts
- [ ] Verify: `mktPermissionContext` table có 6 records

### Phase 2 Checklist

- [ ] Thêm feature flag `RBAC_USE_PERMISSION_CONTEXT`
- [ ] Inject services mới vào `RbacEnforcerService`
- [ ] Implement `buildDataFilterNew()` method
- [ ] Test với feature flag = true
- [ ] Verify filter resolution đúng

### Phase 3 Checklist

- [ ] Phân tích 8 policies hiện có
- [ ] Tạo migration script
- [ ] Chạy migration trên dev
- [ ] Verify policies vẫn hoạt động
- [ ] Update documentation

### Phase 4 Checklist

- [ ] Unit tests cho services mới
- [ ] Integration tests cho flow mới
- [ ] Performance tests
- [ ] Update RBAC-BUSINESS-GUIDE.md
- [ ] Review và merge

---

## 8. Files cần tạo/sửa

### Đã tạo (Phase 1 - Seed Data) ✅

```
mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/
├── mkt-permission-context-data-seeds.constants.ts  ✅ Seed data definitions
├── prefill-mkt-permission-contexts.ts              ✅ Prefill function
├── mkt-permission-context-all.view.ts              ✅ View definition
├── mkt-permission-context-data-seed-dev-workspace.command.ts  ✅ Command
└── index.ts                                        ✅ Barrel exports

mkt-core/workspace-config/
├── mkt-database-command.module.ts  ✅ UPDATED: Add SeedMktPermissionContextCommand
├── mkt-dev-seeder-data.config.ts   ✅ UPDATED: Add permission context seed config
├── mkt-prefill-views.ts            ✅ UPDATED: Add mktPermissionContextsAllView
└── mkt-objects-prefill-data.ts     ✅ UPDATED: Add prefillMktPermissionContexts
```

### Cần tạo (Phase 1 - Services)

```
mkt-rbac-enterprise-grade/
├── services/
│   ├── bases/
│   │   └── permission-context.service.ts        ← NEW
│   └── filter-expression-resolver.service.ts    ← NEW
└── types/
    └── filter-expression.types.ts               ← NEW (nếu chưa có)
```

### Cần sửa (Phase 2)

```
mkt-rbac-enterprise-grade/
├── services/
│   ├── index.ts                    ← UPDATE: Add exports
│   └── rbac-enforcer.service.ts    ← REFACTOR: Use new services
├── mkt-rbac-enterprise-grade.module.ts  ← UPDATE: Add providers
└── constants/
    └── index.ts                    ← UPDATE: Add CONTEXT_TYPE enum (if needed)
```

### Migrations (Phase 3)

```
mkt-core/migrations/
└── rbac-migration-v2.ts            ← NEW: Extract template logic
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-01-15 | Phase 1 Seed Data: Tạo seed constants, prefill, view, command cho PermissionContext |
| 1.0 | 2025-01 | Initial document |

---

*Tạo ngày: 2025-01*
*Cập nhật: 2025-01-15*
*Phiên bản: 1.1*
