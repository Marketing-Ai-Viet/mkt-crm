# Hướng dẫn Apply Hierarchical Data Access Policy cho Resource Business

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Vấn đề với Auto-Generated Endpoints](#2-vấn-đề-với-auto-generated-endpoints)
3. [Chiến lược Kiểm soát Truy cập](#3-chiến-lược-kiểm-soát-truy-cập)
4. [Quy trình Apply cho Resource mới](#4-quy-trình-apply-cho-resource-mới)
5. [Chi tiết Implementation](#5-chi-tiết-implementation)
6. [Custom Resolver với RBAC](#6-custom-resolver-với-rbac)
7. [Testing & Verification](#7-testing--verification)
8. [Appendix](#appendix)

---

## 1. Tổng quan

### 1.1. Hierarchical Data Access Policy

Policy quy định quyền truy cập dữ liệu dựa trên **cấu trúc phân cấp tổ chức**:

| Cấp bậc | Hierarchy Level | Access Scope | Mô tả |
|---------|-----------------|--------------|-------|
| Executive (CEO, C-Level, VP) | 1-3 | `ALL` | Toàn bộ dữ liệu |
| Upper Management (Director, Senior Manager) | 4-6 | `REPORTING_CHAIN` | Dữ liệu trong chuỗi báo cáo |
| Manager | 7 | `DIRECT_SUBORDINATES` | Dữ liệu của cấp dưới trực tiếp |
| Staff (Specialist, Associate, Junior, Intern) | 8-11 | `SELF` | Chỉ dữ liệu do mình tạo |

### 1.2. Business Resources cần bảo vệ

```typescript
const PROTECTED_BUSINESS_RESOURCES = [
  'mktOrder',
  'mktInvoice',
  'mktLicense',
  'mktCustomer',
  'mktPayment',
  'mktContract',
] as const;
```

---

## 2. Vấn đề với Auto-Generated Endpoints

### 2.1. Twenty CRM Auto-Generation

Twenty CRM **tự động sinh 13 GraphQL operations** cho mỗi entity:

| Loại | Operations | Rủi ro |
|------|------------|--------|
| **Queries (3)** | `findMany`, `findOne`, `findDuplicates` | Data leak nếu không filter |
| **Mutations (10)** | `createOne`, `createMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `destroyOne`, `destroyMany`, `restoreOne`, `restoreMany` | Bypass business rules |

### 2.2. Tại sao Auto-Generated Endpoints khó kiểm soát?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VẤN ĐỀ VỚI AUTO-GENERATED ENDPOINTS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. KHÔNG CÓ RBAC DECORATORS                                                │
│     - Resolvers được generate động, không có @RequirePermission             │
│     - Không thể inject custom authorization logic                           │
│                                                                             │
│  2. BYPASS BUSINESS RULES                                                   │
│     - createMany có thể tạo bulk data không validate                        │
│     - destroyMany có thể xóa vĩnh viễn sensitive data                       │
│     - updateMany có thể update hàng loạt không kiểm soát                    │
│                                                                             │
│  3. KHÓ AUDIT                                                               │
│     - Không có audit logging built-in cho từng operation                    │
│     - Không biết ai làm gì khi nào                                          │
│                                                                             │
│  4. DATA LEAK                                                               │
│     - findMany trả về tất cả records nếu không có filter đúng               │
│     - User cấp thấp có thể xem data của người khác                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3. Pre-Query Hooks - Không đủ bảo vệ

Pre-Query Hooks **chỉ filter data**, không kiểm soát được:
- Action-level permissions (ai được CREATE, ai chỉ READ)
- Business rules (validate trước khi create/update)
- Audit logging đầy đủ

---

## 3. Chiến lược Kiểm soát Truy cập

### 3.1. Layered Security Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYERED SECURITY APPROACH                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: ĐÓNG AUTO-GENERATED DANGEROUS OPERATIONS                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  - Block: createMany, destroyOne, destroyMany, updateMany              │ │
│  │  - Giữ: findMany, findOne với Pre-Query Hooks filter                   │ │
│  │  - Tool: Pre-Query Hooks throw ForbiddenException                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  LAYER 2: CUSTOM RESOLVERS VỚI RBAC                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  - Tạo custom mutations: createMktOrder, updateMktOrder                │ │
│  │  - Apply @RequirePermission decorator                                  │ │
│  │  - Inject business rules và validation                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  LAYER 3: HIERARCHICAL ACCESS FILTER                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  - Apply trong custom resolvers                                        │ │
│  │  - Filter data theo hierarchy level                                    │ │
│  │  - Inject vào service layer                                            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  LAYER 4: AUDIT LOGGING                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  - Log mọi action với user context                                     │ │
│  │  - Track changes cho compliance                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Operations Matrix

| Operation | Auto-Generated | Custom Resolver | Hierarchical Filter |
|-----------|----------------|-----------------|---------------------|
| `findMany` | ✅ Giữ + Hook Filter | Optional | ✅ Apply |
| `findOne` | ✅ Giữ + Hook Filter | Optional | ✅ Apply |
| `createOne` | ❌ Block | ✅ Required | N/A (set createdById) |
| `createMany` | ❌ Block | ❌ Không cung cấp | N/A |
| `updateOne` | ❌ Block | ✅ Required | ✅ Check ownership |
| `updateMany` | ❌ Block | ❌ Không cung cấp | N/A |
| `deleteOne` | ✅ Giữ + Hook | Optional override | ✅ Check ownership |
| `deleteMany` | ❌ Block | ❌ Không cung cấp | N/A |
| `destroyOne` | ❌ Block | ❌ Không cung cấp | N/A |
| `destroyMany` | ❌ Block | ❌ Không cung cấp | N/A |
| `restoreOne` | ✅ Giữ | Optional | ✅ Check ownership |
| `restoreMany` | ❌ Block | ❌ Không cung cấp | N/A |

---

## 4. Quy trình Apply cho Resource mới

### 4.1. Checklist

```
□ Bước 1: Tạo Pre-Query Hooks để BLOCK dangerous operations
□ Bước 2: Tạo Pre-Query Hooks để FILTER findMany/findOne (hierarchical access)
□ Bước 3: Tạo Custom Resolver với @RequirePermission
□ Bước 4: Implement HierarchicalAccessService trong resolver
□ Bước 5: Register hooks và resolvers trong Module
□ Bước 6: Test với các hierarchy levels khác nhau
□ Bước 7: Update documentation
```

### 4.2. File Structure

```
packages/twenty-server/src/mkt-core/{resource}/
├── {resource}.module.ts                 # Module definition
├── hooks/
│   ├── index.ts                         # Export barrel
│   ├── {resource}-block-operations.hook.ts    # Block dangerous ops
│   └── {resource}-hierarchical-filter.hook.ts # Filter findMany/findOne
├── resolvers/
│   ├── index.ts
│   └── {resource}.resolver.ts           # Custom resolver với RBAC
├── services/
│   ├── index.ts
│   └── {resource}.service.ts            # Business logic
└── dto/
    ├── index.ts
    ├── create-{resource}.input.ts
    └── update-{resource}.input.ts
```

---

## 5. Chi tiết Implementation

### 5.1. Bước 1: Block Dangerous Operations

**File:** `{resource}/hooks/{resource}-block-operations.hook.ts`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

const BLOCKED_OPERATIONS_MESSAGE = {
  createMany: 'Bulk creation is disabled. Use createMktOrder for individual records.',
  updateMany: 'Bulk update is disabled. Use updateMktOrder for individual records.',
  deleteMany: 'Bulk delete is disabled. Use deleteMktOrder for individual records.',
  destroyOne: 'Permanent deletion is disabled. Use soft delete instead.',
  destroyMany: 'Bulk permanent deletion is disabled.',
  restoreMany: 'Bulk restore is disabled. Use restoreMktOrder for individual records.',
} as const;

// Block createMany
@Injectable()
@WorkspaceQueryHook('mktOrder.createMany')
export class MktOrderBlockCreateManyHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException(BLOCKED_OPERATIONS_MESSAGE.createMany);
  }
}

// Block updateMany
@Injectable()
@WorkspaceQueryHook('mktOrder.updateMany')
export class MktOrderBlockUpdateManyHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException(BLOCKED_OPERATIONS_MESSAGE.updateMany);
  }
}

// Block deleteMany
@Injectable()
@WorkspaceQueryHook('mktOrder.deleteMany')
export class MktOrderBlockDeleteManyHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException(BLOCKED_OPERATIONS_MESSAGE.deleteMany);
  }
}

// Block destroyOne
@Injectable()
@WorkspaceQueryHook('mktOrder.destroyOne')
export class MktOrderBlockDestroyOneHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException(BLOCKED_OPERATIONS_MESSAGE.destroyOne);
  }
}

// Block destroyMany
@Injectable()
@WorkspaceQueryHook('mktOrder.destroyMany')
export class MktOrderBlockDestroyManyHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException(BLOCKED_OPERATIONS_MESSAGE.destroyMany);
  }
}

// Block restoreMany
@Injectable()
@WorkspaceQueryHook('mktOrder.restoreMany')
export class MktOrderBlockRestoreManyHook implements WorkspacePreQueryHookInstance {
  async execute(): Promise<void> {
    throw new ForbiddenException(BLOCKED_OPERATIONS_MESSAGE.restoreMany);
  }
}

// Export all block hooks
export const MKT_ORDER_BLOCK_HOOKS = [
  MktOrderBlockCreateManyHook,
  MktOrderBlockUpdateManyHook,
  MktOrderBlockDeleteManyHook,
  MktOrderBlockDestroyOneHook,
  MktOrderBlockDestroyManyHook,
  MktOrderBlockRestoreManyHook,
];
```

### 5.2. Bước 2: Hierarchical Filter cho findMany/findOne

**File:** `{resource}/hooks/{resource}-hierarchical-filter.hook.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { FindManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';

import { HierarchicalAccessEvaluatorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/hierarchical-access-evaluator.service';
import { RbacContextService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';
import { ACCESS_SCOPE } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/policy.constants';

type HierarchicalFilter = {
  createdById?: { in?: string[]; eq?: string };
  and?: HierarchicalFilter[];
};

@Injectable()
export class MktOrderHierarchicalFilterService {
  private readonly logger = new Logger('RBAC:MktOrderFilter');

  constructor(
    private readonly hierarchicalAccessEvaluator: HierarchicalAccessEvaluatorService,
    private readonly rbacContextService: RbacContextService,
  ) {}

  async buildFilter(authContext: AuthContext): Promise<HierarchicalFilter | null> {
    if (!authContext.workspace?.id || !authContext.workspaceMemberId) {
      return null;
    }

    const userContext = await this.rbacContextService.resolveContext(
      authContext.workspaceMemberId,
      authContext.workspace.id,
    );

    if (!userContext) {
      return null;
    }

    const accessScope = this.hierarchicalAccessEvaluator.getDefaultAccessScope(
      userContext.hierarchyLevel,
    );

    this.logger.debug(
      `User ${authContext.workspaceMemberId}: scope=${accessScope}, level=${userContext.hierarchyLevel}`,
    );

    switch (accessScope) {
      case ACCESS_SCOPE.ALL:
        return null; // No filter

      case ACCESS_SCOPE.REPORTING_CHAIN:
        return {
          createdById: {
            in: [
              authContext.workspaceMemberId,
              ...userContext.subordinateMemberIds,
              ...userContext.teamMemberIds,
            ],
          },
        };

      case ACCESS_SCOPE.DIRECT_SUBORDINATES:
        return {
          createdById: {
            in: [authContext.workspaceMemberId, ...userContext.subordinateMemberIds],
          },
        };

      case ACCESS_SCOPE.SELF:
      default:
        return {
          createdById: { eq: authContext.workspaceMemberId },
        };
    }
  }

  mergeFilters<T extends HierarchicalFilter>(
    existing: T | undefined,
    hierarchical: HierarchicalFilter | null,
  ): T | undefined {
    if (!hierarchical) return existing;
    if (!existing) return hierarchical as T;
    return { and: [existing, hierarchical] } as T;
  }
}

@Injectable()
@WorkspaceQueryHook('mktOrder.findMany')
export class MktOrderFindManyFilterHook implements WorkspacePreQueryHookInstance {
  constructor(private readonly filterService: MktOrderHierarchicalFilterService) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter>> {
    const filter = await this.filterService.buildFilter(authContext);
    payload.filter = this.filterService.mergeFilters(payload.filter, filter);
    return payload;
  }
}

@Injectable()
@WorkspaceQueryHook('mktOrder.findOne')
export class MktOrderFindOneFilterHook implements WorkspacePreQueryHookInstance {
  constructor(private readonly filterService: MktOrderHierarchicalFilterService) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: { filter?: HierarchicalFilter },
  ): Promise<{ filter?: HierarchicalFilter }> {
    const filter = await this.filterService.buildFilter(authContext);
    payload.filter = this.filterService.mergeFilters(payload.filter, filter);
    return payload;
  }
}

export const MKT_ORDER_FILTER_HOOKS = [
  MktOrderHierarchicalFilterService,
  MktOrderFindManyFilterHook,
  MktOrderFindOneFilterHook,
];
```

### 5.3. Bước 3: Custom Resolver với RBAC

**File:** `{resource}/resolvers/{resource}.resolver.ts`

```typescript
import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';

import { RequirePermission } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/decorators/require-permission.decorator';
import { RBAC_RESOURCE_KEY, RBAC_ACTION } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

import { MktOrderService } from '../services/mkt-order.service';
import { CreateMktOrderInput } from '../dto/create-mkt-order.input';
import { UpdateMktOrderInput } from '../dto/update-mkt-order.input';
import { MktOrderWorkspaceEntity } from '../standard-objects/mkt-order.workspace-entity';

@Resolver(() => MktOrderWorkspaceEntity)
@UseGuards(JwtAuthGuard)
export class MktOrderResolver {
  constructor(private readonly mktOrderService: MktOrderService) {}

  /**
   * Create new order
   * - Requires CREATE permission on ORDER resource
   * - Automatically sets createdById = current user
   */
  @Mutation(() => MktOrderWorkspaceEntity, { name: 'createMktOrderSecure' })
  @RequirePermission(RBAC_RESOURCE_KEY.ORDER, RBAC_ACTION.CREATE, {
    auditLevel: 'high',
  })
  async createOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('data') data: CreateMktOrderInput,
  ): Promise<MktOrderWorkspaceEntity> {
    return this.mktOrderService.create(workspace.id, workspaceMemberId, data);
  }

  /**
   * Update order
   * - Requires UPDATE permission on ORDER resource
   * - Checks ownership based on hierarchy level
   */
  @Mutation(() => MktOrderWorkspaceEntity, { name: 'updateMktOrderSecure' })
  @RequirePermission(RBAC_RESOURCE_KEY.ORDER, RBAC_ACTION.UPDATE, {
    checkOwnership: true,
    auditLevel: 'high',
  })
  async updateOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('id') id: string,
    @Args('data') data: UpdateMktOrderInput,
  ): Promise<MktOrderWorkspaceEntity> {
    return this.mktOrderService.update(workspace.id, workspaceMemberId, id, data);
  }

  /**
   * Approve order (workflow action)
   * - Requires APPROVE permission
   * - Only managers and above can approve
   */
  @Mutation(() => MktOrderWorkspaceEntity, { name: 'approveMktOrder' })
  @RequirePermission(RBAC_RESOURCE_KEY.ORDER, RBAC_ACTION.APPROVE, {
    auditLevel: 'high',
  })
  async approveOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('id') id: string,
  ): Promise<MktOrderWorkspaceEntity> {
    return this.mktOrderService.approve(workspace.id, workspaceMemberId, id);
  }
}
```

### 5.4. Bước 4: Service với Hierarchical Access

**File:** `{resource}/services/{resource}.service.ts`

```typescript
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { HierarchicalAccessEvaluatorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/hierarchical-access-evaluator.service';
import { RbacContextService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';

import { MktOrderWorkspaceEntity } from '../standard-objects/mkt-order.workspace-entity';
import { CreateMktOrderInput } from '../dto/create-mkt-order.input';
import { UpdateMktOrderInput } from '../dto/update-mkt-order.input';

@Injectable()
export class MktOrderService {
  constructor(
    private readonly twentyORMManager: TwentyORMManager,
    private readonly rbacContextService: RbacContextService,
    private readonly hierarchicalAccessEvaluator: HierarchicalAccessEvaluatorService,
  ) {}

  async create(
    workspaceId: string,
    workspaceMemberId: string,
    data: CreateMktOrderInput,
  ): Promise<MktOrderWorkspaceEntity> {
    const repository = await this.twentyORMManager.getRepository<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
    );

    const order = repository.create({
      ...data,
      createdById: workspaceMemberId, // Auto-set owner
    });

    return repository.save(order);
  }

  async update(
    workspaceId: string,
    workspaceMemberId: string,
    id: string,
    data: UpdateMktOrderInput,
  ): Promise<MktOrderWorkspaceEntity> {
    const repository = await this.twentyORMManager.getRepository<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
    );

    const order = await repository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Check hierarchical access
    await this.checkUpdatePermission(workspaceId, workspaceMemberId, order);

    return repository.save({ ...order, ...data });
  }

  private async checkUpdatePermission(
    workspaceId: string,
    workspaceMemberId: string,
    order: MktOrderWorkspaceEntity,
  ): Promise<void> {
    const userContext = await this.rbacContextService.resolveContext(
      workspaceMemberId,
      workspaceId,
    );

    if (!userContext) {
      throw new ForbiddenException('User context not found');
    }

    const result = this.hierarchicalAccessEvaluator.evaluateAccess(
      userContext,
      { createdById: order.createdById },
    );

    if (!result.allowed) {
      throw new ForbiddenException(
        `Access denied: ${result.reason}. You can only modify orders within your access scope.`,
      );
    }
  }

  async approve(
    workspaceId: string,
    workspaceMemberId: string,
    id: string,
  ): Promise<MktOrderWorkspaceEntity> {
    // Approve logic with hierarchy check
    const userContext = await this.rbacContextService.resolveContext(
      workspaceMemberId,
      workspaceId,
    );

    if (!userContext || userContext.hierarchyLevel > 7) {
      throw new ForbiddenException('Only managers and above can approve orders');
    }

    const repository = await this.twentyORMManager.getRepository<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
    );

    const order = await repository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return repository.save({
      ...order,
      status: 'APPROVED',
      approvedById: workspaceMemberId,
      approvedAt: new Date(),
    });
  }
}
```

### 5.5. Bước 5: Module Registration

**File:** `{resource}/{resource}.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { MKT_ORDER_BLOCK_HOOKS } from './hooks/mkt-order-block-operations.hook';
import { MKT_ORDER_FILTER_HOOKS } from './hooks/mkt-order-hierarchical-filter.hook';
import { MktOrderResolver } from './resolvers/mkt-order.resolver';
import { MktOrderService } from './services/mkt-order.service';

@Module({
  providers: [
    // Layer 1: Block dangerous operations
    ...MKT_ORDER_BLOCK_HOOKS,

    // Layer 2: Hierarchical filter for findMany/findOne
    ...MKT_ORDER_FILTER_HOOKS,

    // Layer 3: Custom resolver with RBAC
    MktOrderResolver,

    // Service layer
    MktOrderService,
  ],
  exports: [MktOrderService],
})
export class MktOrderModule {}
```

---

## 6. Custom Resolver với RBAC

### 6.1. Available Decorators

```typescript
// Single permission check
@RequirePermission(resource, action, options?)

// OR logic - user needs ANY of the permissions
@RequireAnyPermission([
  { resource: 'ORDER', action: 'UPDATE' },
  { resource: 'ORDER', action: 'ADMIN' },
])

// AND logic - user needs ALL permissions
@RequireAllPermissions([
  { resource: 'ORDER', action: 'READ' },
  { resource: 'SENSITIVE_DATA', action: 'VIEW' },
])
```

### 6.2. Permission Options

```typescript
type PermissionOptions = {
  checkOwnership?: boolean;  // Verify user owns/can access the record
  auditLevel?: 'low' | 'medium' | 'high';  // Audit logging detail
};
```

### 6.3. Resource Keys và Actions

**Resources:** Xem `RBAC_RESOURCE_KEY` trong `enterprise-rbac.constants.ts`

**Actions:**
| Action | Mô tả |
|--------|-------|
| `READ` | Xem data |
| `CREATE` | Tạo mới |
| `UPDATE` | Cập nhật |
| `DELETE` | Soft delete |
| `APPROVE` | Phê duyệt workflow |
| `EXPORT` | Export data |
| `MANAGE` | Full control |

---

## 7. Testing & Verification

### 7.1. Test Scenarios

```typescript
describe('MktOrder Hierarchical Access', () => {
  describe('Auto-Generated Endpoints', () => {
    it('findMany should filter by hierarchy', async () => {
      // Staff (L9) should only see own orders
    });

    it('createMany should be blocked', async () => {
      const result = await gqlRequest(`
        mutation { createMktOrders(data: [...]) { id } }
      `);
      expect(result.errors[0].message).toContain('Bulk creation is disabled');
    });

    it('destroyOne should be blocked', async () => {
      const result = await gqlRequest(`
        mutation { destroyMktOrder(id: "...") { id } }
      `);
      expect(result.errors[0].message).toContain('Permanent deletion is disabled');
    });
  });

  describe('Custom Resolver', () => {
    it('createMktOrderSecure requires CREATE permission', async () => {
      // Test với user không có permission
    });

    it('updateMktOrderSecure checks ownership', async () => {
      // Staff không thể update order của người khác
    });

    it('approveMktOrder requires Manager level', async () => {
      // Staff không thể approve
    });
  });
});
```

### 7.2. Manual Verification Checklist

```
□ Login as Staff (L9):
  □ findMany: Chỉ thấy orders do mình tạo
  □ createMktOrderSecure: Tạo được order mới
  □ updateMktOrderSecure: Chỉ update được order của mình
  □ approveMktOrder: Bị từ chối (không đủ level)
  □ createMany/destroyMany: Bị block

□ Login as Manager (L7):
  □ findMany: Thấy orders của subordinates
  □ updateMktOrderSecure: Update được order của subordinates
  □ approveMktOrder: Approve được

□ Login as CEO (L1):
  □ findMany: Thấy tất cả orders
  □ Tất cả operations đều hoạt động
```

---

## Appendix

### A. Hook Key Patterns

| Operation | Hook Key Pattern |
|-----------|-----------------|
| findMany | `{objectName}.findMany` |
| findOne | `{objectName}.findOne` |
| createOne | `{objectName}.createOne` |
| createMany | `{objectName}.createMany` |
| updateOne | `{objectName}.updateOne` |
| updateMany | `{objectName}.updateMany` |
| deleteOne | `{objectName}.deleteOne` |
| deleteMany | `{objectName}.deleteMany` |
| destroyOne | `{objectName}.destroyOne` |
| destroyMany | `{objectName}.destroyMany` |
| restoreOne | `{objectName}.restoreOne` |
| restoreMany | `{objectName}.restoreMany` |

### B. Related Files

| File | Purpose |
|------|---------|
| `graphql-auto-generation.md` | How Twenty auto-generates GraphQL |
| `graphql-resolver-access-control.md` | Access control methods |
| `HIERARCHICAL_DATA_ACCESS_POLICY.md` | Policy specification |
| `enterprise-rbac.constants.ts` | Resource keys và actions |
| `require-permission.decorator.ts` | RBAC decorators |
| `casbin-authz.guard.ts` | Authorization guard |

### C. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | System | Initial documentation |
| 2.0 | 2026-01-15 | System | Rewrite với approach đóng auto-endpoints |

---

*Tài liệu này dựa trên:*
- *`/docs/graphql-auto-generation.md`*
- *`/docs/graphql-resolver-access-control.md`*
- *`packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/`*
