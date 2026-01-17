# Hierarchical Data Access Policy - Implementation Guide

## Tổng quan

Hướng dẫn này mô tả cách áp dụng **Hierarchical Data Access Policy** tự động cho các business resource resolvers trong Twenty CRM.

### Mục tiêu

- Tự động filter dữ liệu dựa trên hierarchy level của user
- Áp dụng thống nhất cho tất cả business resources
- Hỗ trợ cả WorkspaceQuery hooks và Custom Resolvers

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GraphQL Request                                                         │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────┐                                                │
│  │   Authentication    │  (JwtAuthGuard - existing)                     │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │   HIERARCHICAL ACCESS LAYER                              │            │
│  │                                                          │            │
│  │  ┌───────────────────┐    ┌───────────────────────┐     │            │
│  │  │ @DataScope        │ OR │ WorkspaceQueryHook    │     │            │
│  │  │ Decorator         │    │ (Pre-Query)           │     │            │
│  │  └────────┬──────────┘    └────────┬──────────────┘     │            │
│  │           │                        │                     │            │
│  │           └──────────┬─────────────┘                     │            │
│  │                      ▼                                   │            │
│  │          ┌────────────────────────┐                      │            │
│  │          │ RbacContextService     │                      │            │
│  │          │ - resolveContext()     │                      │            │
│  │          │ - getAccessibleIds()   │                      │            │
│  │          └───────────┬────────────┘                      │            │
│  │                      │                                   │            │
│  │                      ▼                                   │            │
│  │          ┌────────────────────────────────┐             │            │
│  │          │ HierarchicalAccessEvaluator    │             │            │
│  │          │ - getDefaultAccessScope()      │             │            │
│  │          │ - evaluateAccess()             │             │            │
│  │          └────────────┬───────────────────┘             │            │
│  │                       │                                  │            │
│  └───────────────────────┼──────────────────────────────────┘            │
│                          │                                               │
│                          ▼                                               │
│               ┌────────────────────────┐                                │
│               │   Filter Applied       │                                │
│               │   createdById IN [...]  │                               │
│               └──────────┬─────────────┘                                │
│                          │                                               │
│                          ▼                                               │
│                    Query Executed                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phương pháp 1: Sử dụng @DataScope Decorator (Custom Resolvers)

### Tổng quan

Phương pháp này dành cho **Custom GraphQL Resolvers** - nơi bạn viết resolver thủ công thay vì sử dụng auto-generated resolvers của Twenty.

### Khi nào sử dụng

- Custom GraphQL resolvers (không phải auto-generated)
- Cần kiểm soát chi tiết hơn về filtering
- Cần thêm custom conditions
- Cần tắt/bật endpoint theo feature flag

---

### 1. Imports cần thiết

```typescript
// Core NestJS
import { UseGuards, UseFilters, UsePipes } from '@nestjs/common';
import { Query, Mutation, Resolver, Args, Context } from '@nestjs/graphql';

// Guards
import { JwtAuthGuard } from 'src/engine/guards/jwt.auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { FeatureFlagGuard, RequireFeatureFlag } from 'src/engine/guards/feature-flag.guard';

// Feature Flags
import { FeatureFlagKey } from 'src/engine/core-modules/feature-flag/enums/feature-flag-key.enum';

// Data Scope (Hierarchical Access)
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import {
  DataScopeContext,
  DataScopedRequest,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { filterToTypeOrmWhere } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

// Auth Decorators
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
```

---

### 2. Guards - Bảo vệ Endpoint

#### 2.1. Authentication Guards

| Guard | Mô tả | Sử dụng khi |
|-------|-------|-------------|
| `JwtAuthGuard` | Verify JWT token | Mọi authenticated endpoint |
| `WorkspaceAuthGuard` | Verify workspace context | Cần workspace ID |
| `UserAuthGuard` | Verify user context | Cần user info |

```typescript
// Cấp Resolver - apply cho tất cả methods
@Resolver(() => MktOrderWorkspaceEntity)
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class MktOrderResolver { }

// Cấp Method - apply cho method cụ thể
@Query(() => [MktOrderWorkspaceEntity])
@UseGuards(JwtAuthGuard)
async findOrders() { }
```

#### 2.2. Feature Flag Guard - Tắt/Bật Endpoint

Sử dụng `@RequireFeatureFlag` để tắt endpoint khi feature flag bị disabled:

```typescript
import { RequireFeatureFlag } from 'src/engine/guards/feature-flag.guard';
import { FeatureFlagKey } from 'src/engine/core-modules/feature-flag/enums/feature-flag-key.enum';

@Resolver(() => MktOrderWorkspaceEntity)
@UseGuards(WorkspaceAuthGuard)
export class MktOrderResolver {
  /**
   * Endpoint chỉ hoạt động khi IS_AI_ENABLED = true
   */
  @Query(() => AiOrderSuggestion)
  @RequireFeatureFlag(FeatureFlagKey.IS_AI_ENABLED)
  async getAiOrderSuggestion(): Promise<AiOrderSuggestion> {
    // Chỉ chạy khi feature flag enabled
  }
}
```

**Các Feature Flags có sẵn:**

```typescript
enum FeatureFlagKey {
  IS_AIRTABLE_INTEGRATION_ENABLED = 'IS_AIRTABLE_INTEGRATION_ENABLED',
  IS_POSTGRESQL_INTEGRATION_ENABLED = 'IS_POSTGRESQL_INTEGRATION_ENABLED',
  IS_STRIPE_INTEGRATION_ENABLED = 'IS_STRIPE_INTEGRATION_ENABLED',
  IS_AI_ENABLED = 'IS_AI_ENABLED',
  IS_IMAP_SMTP_CALDAV_ENABLED = 'IS_IMAP_SMTP_CALDAV_ENABLED',
  IS_TWO_FACTOR_AUTHENTICATION_ENABLED = 'IS_TWO_FACTOR_AUTHENTICATION_ENABLED',
  // ... thêm custom flags trong enum
}
```

**Thêm Custom Feature Flag:**

```typescript
// File: src/engine/core-modules/feature-flag/enums/feature-flag-key.enum.ts

export enum FeatureFlagKey {
  // ...existing flags
  IS_MKT_ADVANCED_REPORTING_ENABLED = 'IS_MKT_ADVANCED_REPORTING_ENABLED',
  IS_MKT_RESELLER_MODULE_ENABLED = 'IS_MKT_RESELLER_MODULE_ENABLED',
}
```

---

### 3. @DataScope Decorator - Hierarchical Access Filter

#### 3.1. Cách sử dụng cơ bản

```typescript
@Query(() => [MktOrderWorkspaceEntity])
@DataScope({ resource: 'mktOrder' })
async findOrders(@Context() ctx: GraphQLContext) {
  const dataScope = ctx.req.dataScope;

  // Nếu không có filter (full access), query tất cả
  if (!dataScope?.filter || dataScope.hasFullAccess) {
    return this.orderService.findAll();
  }

  // Áp dụng filter từ hierarchical access
  return this.orderService.findWithFilter(dataScope.filter);
}
```

#### 3.2. Tất cả Options của @DataScope

```typescript
@DataScope({
  // ========================
  // [REQUIRED] Resource Name
  // ========================
  resource: 'mktOrder',

  // ========================
  // [OPTIONAL] Filter Mode
  // ========================
  // - 'AUTO': Tự động attach filter (default)
  // - 'MANUAL': Attach filter nhưng không tự apply
  // - 'SKIP': Bỏ qua filtering hoàn toàn
  mode: 'AUTO',

  // ========================
  // [OPTIONAL] Caching
  // ========================
  enableCache: true,           // Enable caching (default: true)
  cacheTTL: 300000,            // Cache TTL in ms (default: 5 phút)

  // ========================
  // [OPTIONAL] Audit & Logging
  // ========================
  auditLevel: 'medium',        // 'low' | 'medium' | 'high'

  // ========================
  // [OPTIONAL] Error Handling
  // ========================
  errorMessage: 'Bạn không có quyền truy cập dữ liệu này',
  allowUnscoped: false,        // Cho phép access nếu không resolve được user

  // ========================
  // [OPTIONAL] Field Exclusions
  // ========================
  excludeFields: ['internalNote', 'costPrice'],

  // ========================
  // [OPTIONAL] Additional Conditions
  // ========================
  // Conditions này LUÔN được apply, kết hợp với hierarchical filter
  additionalConditions: [
    { field: 'status', operator: '!=', value: 'DELETED' },
    { field: 'isActive', operator: '=', value: true },
  ],
})
```

#### 3.3. Filter Operators

```typescript
type FilterOperator =
  | '='        // Equal
  | '!='       // Not equal
  | '>'        // Greater than
  | '>='       // Greater than or equal
  | '<'        // Less than
  | '<='       // Less than or equal
  | 'in'       // In array
  | 'not_in'   // Not in array
  | 'like'     // LIKE pattern
  | 'is_null'  // IS NULL
  | 'is_not_null'; // IS NOT NULL
```

---

### 4. Auth Decorators - Lấy Context

```typescript
@Resolver(() => MktOrderWorkspaceEntity)
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class MktOrderResolver {
  @Query(() => [MktOrderWorkspaceEntity])
  async findOrders(
    // Lấy workspace từ auth context
    @AuthWorkspace() workspace: Workspace,

    // Lấy workspace member ID
    @AuthWorkspaceMemberId() workspaceMemberId: string,

    // Lấy full GraphQL context
    @Context() ctx: GraphQLContext,
  ) {
    // workspace.id - Workspace ID
    // workspaceMemberId - Current user's workspace member ID
    // ctx.req.dataScope - Hierarchical access filter (nếu có @DataScope)
  }
}
```

---

### 5. @WorkspaceGate - Tắt Entity theo Feature Flag

**Lưu ý:** `@WorkspaceGate` dùng cho **WorkspaceEntity** (không phải resolver method).

```typescript
import { WorkspaceGate } from 'src/engine/twenty-orm/decorators/workspace-gate.decorator';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktAdvancedReport,
  namePlural: 'mktAdvancedReports',
  labelSingular: 'Advanced Report',
  icon: 'IconChartBar'
})
@WorkspaceGate({
  // Feature flag kiểm soát entity này
  featureFlag: 'IS_MKT_ADVANCED_REPORTING_ENABLED',

  // Exclude từ database schema khi flag disabled (default: true)
  excludeFromDatabase: true,

  // Exclude từ GraphQL API khi flag disabled (default: true)
  excludeFromWorkspaceApi: true,
})
export class MktAdvancedReportWorkspaceEntity extends BaseWorkspaceEntity {
  // Entity chỉ tồn tại khi feature flag enabled
}
```

---

### 6. @WorkspaceDisableOperations - Tắt Operations nguy hiểm

**Mục đích**: Declarative disable các bulk/dangerous operations trên entity level mà không cần viết hook code.

#### 6.1. Các Operations có thể disable

| Operation | Loại | Rủi ro | Khuyến nghị |
|-----------|------|--------|-------------|
| `createMany` | Mutation | Bypass validation, bulk insert | ❌ Nên disable |
| `updateMany` | Mutation | Mass data modification | ❌ Nên disable |
| `deleteMany` | Mutation | Mass soft delete | ⚠️ Cân nhắc |
| `destroyOne` | Mutation | Permanent delete | ❌ Nên disable |
| `destroyMany` | Mutation | Mass permanent delete | ❌ Nên disable |
| `restoreMany` | Mutation | Mass restore deleted | ⚠️ Cân nhắc |

#### 6.2. Cú pháp sử dụng

```typescript
import {
  WorkspaceEntity,
  WorkspaceDisableOperations,
} from 'src/engine/twenty-orm/decorators';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: 'mktOrders',
  labelSingular: msg('Order'),
  labelPlural: msg('Orders'),
  icon: 'IconShoppingCart',
})
@WorkspaceDisableOperations([
  'createMany',   // Block bulk creation
  'updateMany',   // Block bulk update
  'deleteMany',   // Block bulk soft delete
  'destroyOne',   // Block permanent delete single
  'destroyMany',  // Block permanent delete bulk
  'restoreMany',  // Block bulk restore
])
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {
  // ... fields ...
}
```

#### 6.3. Presets có sẵn

```typescript
import {
  WorkspaceDisableOperations,
  BLOCK_BULK_OPERATIONS,
  BLOCK_DESTROY_OPERATIONS,
  BLOCK_ALL_BULK,
} from 'src/engine/twenty-orm/decorators/workspace-disable-operations.decorator';

// Preset 1: Block tất cả bulk operations
@WorkspaceDisableOperations(BLOCK_BULK_OPERATIONS)
// → ['createMany', 'updateMany', 'deleteMany', 'destroyMany', 'restoreMany']

// Preset 2: Block destroy operations only (soft delete only)
@WorkspaceDisableOperations(BLOCK_DESTROY_OPERATIONS)
// → ['destroyOne', 'destroyMany']

// Preset 3: Block tất cả bulk mutations
@WorkspaceDisableOperations(BLOCK_ALL_BULK)
// → ['createMany', 'updateMany', 'deleteMany', 'destroyMany', 'restoreMany']
```

#### 6.4. Kết hợp với @WorkspaceGate

```typescript
@WorkspaceEntity({...})
@WorkspaceGate({
  featureFlag: 'IS_MKT_ORDER_ENABLED',
  excludeFromDatabase: false,
  excludeFromWorkspaceApi: false,  // Không ẩn toàn bộ
})
@WorkspaceDisableOperations(['createMany', 'destroyMany'])  // Chỉ disable một số
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {...}
```

#### 6.5. Khi nào dùng @WorkspaceDisableOperations vs WorkspaceQueryHook?

| Use Case | @WorkspaceDisableOperations | WorkspaceQueryHook |
|----------|----------------------------|-------------------|
| Static disable operations | ✅ Tối ưu | ❌ Overkill |
| Disable theo feature flag | ❌ | ✅ |
| Disable theo role/permission | ❌ | ✅ |
| Disable theo environment | ❌ | ✅ |
| Ẩn operations khỏi GraphQL schema | ✅ | ❌ (chỉ runtime block) |

---

### 7. Template Resolver Hoàn Chỉnh

```typescript
import { UseGuards, UseFilters, UsePipes } from '@nestjs/common';
import { Query, Mutation, Resolver, Args, Context } from '@nestjs/graphql';

import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { RequireFeatureFlag } from 'src/engine/guards/feature-flag.guard';
import { FeatureFlagKey } from 'src/engine/core-modules/feature-flag/enums/feature-flag-key.enum';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';

import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { filterToTypeOrmWhere } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

import { MktOrderWorkspaceEntity } from './entities/mkt-order.workspace-entity';
import { MktOrderRepository } from './repositories/mkt-order.repository';
import { MktOrderService } from './services/mkt-order.service';

/**
 * MktOrder Custom Resolver
 *
 * Endpoints:
 * - mktOrders: List orders với hierarchical access filter
 * - mktOrderById: Get single order với access check
 * - adminMktOrders: Admin endpoint (skip filtering)
 * - createMktOrder: Create order
 * - aiOrderSuggestion: AI-powered suggestion (feature flagged)
 */
@Resolver(() => MktOrderWorkspaceEntity)
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class MktOrderResolver {
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderService: MktOrderService,
  ) {}

  // ============================================
  // QUERIES - với Hierarchical Access Filter
  // ============================================

  /**
   * List orders với hierarchical access filtering
   *
   * Access rules (tự động apply):
   * - Staff (level 8-11): Chỉ xem orders do mình tạo
   * - Manager (level 7): Xem orders của team trực tiếp
   * - Upper Mgmt (level 4-6): Xem orders trong reporting chain
   * - Executive (level 1-3): Xem tất cả
   */
  @Query(() => [MktOrderWorkspaceEntity], {
    name: 'mktOrders',
    description: 'List orders với hierarchical access filtering',
  })
  @DataScope({
    resource: 'mktOrder',
    mode: 'AUTO',
    auditLevel: 'medium',
    additionalConditions: [
      { field: 'deletedAt', operator: 'is_null', value: true },
    ],
  })
  async findOrders(
    @Context() ctx: GraphQLContext,
    @AuthWorkspace() workspace: Workspace,
    @Args('status', { nullable: true }) status?: string,
    @Args('limit', { nullable: true, defaultValue: 50 }) limit?: number,
  ): Promise<MktOrderWorkspaceEntity[]> {
    const dataScope = ctx.req.dataScope;
    const where: Record<string, unknown> = {};

    // User-provided filter
    if (status) {
      where.status = status;
    }

    // Apply hierarchical access filter
    if (dataScope?.filter && !dataScope.hasFullAccess) {
      const hierarchicalWhere = filterToTypeOrmWhere(dataScope.filter);

      Object.assign(where, hierarchicalWhere);
    }

    return this.orderRepository.findMany({
      where,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get single order by ID với access check
   */
  @Query(() => MktOrderWorkspaceEntity, {
    name: 'mktOrderById',
    nullable: true,
  })
  @DataScope({
    resource: 'mktOrder',
    mode: 'AUTO',
    auditLevel: 'high',  // High audit cho single record access
  })
  async findOrderById(
    @Context() ctx: GraphQLContext,
    @Args('id') id: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    const dataScope = ctx.req.dataScope;

    // Build filter với ID + hierarchical access
    const where: Record<string, unknown> = { id };

    if (dataScope?.filter && !dataScope.hasFullAccess) {
      const hierarchicalWhere = filterToTypeOrmWhere(dataScope.filter);

      Object.assign(where, hierarchicalWhere);
    }

    return this.orderRepository.findOne({ where });
  }

  // ============================================
  // ADMIN QUERIES - Skip Hierarchical Access
  // ============================================

  /**
   * Admin endpoint - xem tất cả orders (bỏ qua hierarchical filter)
   *
   * Yêu cầu: User phải có quyền admin trên mktOrder
   */
  @Query(() => [MktOrderWorkspaceEntity], { name: 'adminMktOrders' })
  @DataScope({
    resource: 'mktOrder',
    mode: 'SKIP',  // Bỏ qua filtering
    auditLevel: 'high',  // Log admin access
  })
  async adminFindAllOrders(
    @AuthWorkspace() workspace: Workspace,
    @Args('includeDeleted', { nullable: true, defaultValue: false })
    includeDeleted: boolean,
  ): Promise<MktOrderWorkspaceEntity[]> {
    const where: Record<string, unknown> = {};

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return this.orderRepository.findMany({ where });
  }

  // ============================================
  // FEATURE FLAGGED ENDPOINTS
  // ============================================

  /**
   * AI-powered order suggestion
   *
   * Endpoint này chỉ hoạt động khi IS_AI_ENABLED = true
   */
  @Query(() => String, {
    name: 'aiOrderSuggestion',
    description: 'Get AI suggestion for order (requires AI feature flag)',
  })
  @RequireFeatureFlag(FeatureFlagKey.IS_AI_ENABLED)
  @DataScope({ resource: 'mktOrder', mode: 'SKIP' })
  async getAiOrderSuggestion(
    @AuthWorkspace() workspace: Workspace,
    @Args('customerId') customerId: string,
  ): Promise<string> {
    // Chỉ chạy khi IS_AI_ENABLED = true trong workspace
    return this.orderService.generateAiSuggestion(customerId);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create new order
   *
   * Không cần hierarchical filter cho mutations (user tạo record của mình)
   */
  @Mutation(() => MktOrderWorkspaceEntity)
  async createMktOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('input') input: CreateMktOrderInput,
  ): Promise<MktOrderWorkspaceEntity> {
    return this.orderService.createOrder({
      ...input,
      workspaceId: workspace.id,
      createdById: workspaceMemberId,  // Set owner
    });
  }

  /**
   * Update order - với ownership check
   */
  @Mutation(() => MktOrderWorkspaceEntity)
  @DataScope({
    resource: 'mktOrder',
    mode: 'AUTO',  // Check hierarchical access
    auditLevel: 'high',
  })
  async updateMktOrder(
    @Context() ctx: GraphQLContext,
    @Args('id') id: string,
    @Args('input') input: UpdateMktOrderInput,
  ): Promise<MktOrderWorkspaceEntity> {
    const dataScope = ctx.req.dataScope;

    // Verify access trước khi update
    const existing = await this.orderRepository.findOne({
      where: {
        id,
        ...(dataScope?.filter && !dataScope.hasFullAccess
          ? filterToTypeOrmWhere(dataScope.filter)
          : {}),
      },
    });

    if (!existing) {
      throw new Error('Order not found or access denied');
    }

    return this.orderService.updateOrder(id, input);
  }
}
```

---

### 8. Register Resolver trong Module

```typescript
// File: mkt-order.module.ts

import { Module } from '@nestjs/common';

import { MktRbacEnterpriseGradeModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module';

import { MktOrderResolver } from './resolvers/mkt-order.resolver';
import { MktOrderService } from './services/mkt-order.service';
import { MktOrderRepository } from './repositories/mkt-order.repository';

@Module({
  imports: [
    MktRbacEnterpriseGradeModule,  // Cần import để sử dụng @DataScope
  ],
  providers: [
    MktOrderResolver,
    MktOrderService,
    MktOrderRepository,
  ],
  exports: [MktOrderService],
})
export class MktOrderModule {}
```

---

### 9. Tổng hợp Decorators

| Decorator | Scope | Mục đích |
|-----------|-------|----------|
| `@UseGuards(WorkspaceAuthGuard)` | Class/Method | Verify workspace |
| `@UseGuards(UserAuthGuard)` | Class/Method | Verify user |
| `@RequireFeatureFlag(key)` | Method | Tắt endpoint theo feature flag |
| `@DataScope({ resource })` | Method | Apply hierarchical access filter |
| `@AuthWorkspace()` | Parameter | Lấy workspace từ context |
| `@AuthWorkspaceMemberId()` | Parameter | Lấy member ID |
| `@WorkspaceGate({ featureFlag })` | Entity Class | Tắt entity theo feature flag |
| `@WorkspaceDisableOperations([...])` | Entity Class | Tắt specific operations (ẩn khỏi schema) |

---

## Phương pháp 2: WorkspaceQueryHooks (Auto-Generated Resolvers)

### Khi nào sử dụng

- Auto-generated GraphQL resolvers từ Twenty engine
- findMany, findOne operations
- Không cần thay đổi resolver code

### Cấu trúc Hooks

```
packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/hooks/
├── hierarchical-access.pre-query.hook.ts    # Filter hooks cho các resources
├── block-operations.pre-query.hook.ts       # Block dangerous operations
└── index.ts                                 # Barrel export
```

### Cách tạo Hook mới cho resource

#### 1. Định nghĩa hook class

```typescript
// File: hierarchical-access.pre-query.hook.ts

import { Injectable } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { FindManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { HierarchicalAccessFilterService } from './hierarchical-access-filter.service';

/**
 * Hook để filter mktContract findMany theo hierarchy
 */
@Injectable()
@WorkspaceQueryHook('mktContract.findMany')  // Format: {objectName}.{operation}
export class MktContractHierarchicalAccessFindManyHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>> {
    // Build hierarchical filter
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    // Merge với existing filter
    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

/**
 * Hook để filter mktContract findOne theo hierarchy
 */
@Injectable()
@WorkspaceQueryHook('mktContract.findOne')
export class MktContractHierarchicalAccessFindOneHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindOneResolverArgs<HierarchicalFilter>,
  ): Promise<FindOneResolverArgs<HierarchicalFilter>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}
```

#### 2. Thêm resource vào HIERARCHICAL_ACCESS_RESOURCES

```typescript
// File: hierarchical-access.pre-query.hook.ts

/**
 * Resources that hierarchical access policy applies to
 * These are resources with createdById field
 */
export const HIERARCHICAL_ACCESS_RESOURCES = [
  'mktOrder',
  'mktInvoice',
  'mktLicense',
  'mktCustomer',
  'mktPayment',
  'mktContract',    // <-- Thêm resource mới
  'task',
  'note',
  'opportunity',
] as const;
```

#### 3. Export hooks từ index.ts

```typescript
// File: hooks/index.ts

export * from './hierarchical-access.pre-query.hook';

// Thêm vào array HIERARCHICAL_ACCESS_HOOKS
export const HIERARCHICAL_ACCESS_HOOKS = [
  HierarchicalAccessFilterService,
  // ...existing hooks...
  // mktContract
  MktContractHierarchicalAccessFindManyHook,
  MktContractHierarchicalAccessFindOneHook,
];
```

#### 4. Register trong module

Hooks đã được register tự động trong `mkt-rbac-enterprise-grade.module.ts`:

```typescript
// File: mkt-rbac-enterprise-grade.module.ts

@Module({
  providers: [
    // Pre-Query Hooks for Hierarchical Access Policy
    ...HIERARCHICAL_ACCESS_HOOKS,  // <-- Hooks được register ở đây
  ],
})
export class MktRbacEnterpriseGradeModule {}
```

---

## Thêm Resource Mới - Checklist

### Bước 1: Xác định resource cần áp dụng

Kiểm tra entity có field `createdById`:

```typescript
@WorkspaceEntity({ ... })
export class MktContractWorkspaceEntity extends BaseWorkspaceEntity {
  // ✅ Có field này → có thể áp dụng hierarchical access
  @WorkspaceField({ ... })
  createdById: string;
}
```

### Bước 2: Chọn phương pháp áp dụng

| Tiêu chí | @DataScope Decorator | WorkspaceQueryHook |
|----------|---------------------|-------------------|
| Auto-generated resolver | ❌ | ✅ |
| Custom resolver | ✅ | ❌ |
| findMany/findOne chỉ | ❌ | ✅ |
| Custom operations | ✅ | ❌ |
| Cần thêm conditions | ✅ (dễ hơn) | ⚠️ (phải code) |

### Bước 3: Implement theo phương pháp đã chọn

#### Nếu dùng WorkspaceQueryHook:

```typescript
// 1. Thêm vào HIERARCHICAL_ACCESS_RESOURCES
export const HIERARCHICAL_ACCESS_RESOURCES = [
  // ...existing
  'newResource',
] as const;

// 2. Tạo 2 hook classes (findMany + findOne)
@Injectable()
@WorkspaceQueryHook('newResource.findMany')
export class NewResourceFindManyHook implements WorkspacePreQueryHookInstance {
  // ... implementation
}

@Injectable()
@WorkspaceQueryHook('newResource.findOne')
export class NewResourceFindOneHook implements WorkspacePreQueryHookInstance {
  // ... implementation
}

// 3. Export trong HIERARCHICAL_ACCESS_HOOKS
export const HIERARCHICAL_ACCESS_HOOKS = [
  // ...existing
  NewResourceFindManyHook,
  NewResourceFindOneHook,
];
```

#### Nếu dùng @DataScope:

```typescript
@Query(() => [NewResource])
@DataScope({ resource: 'newResource' })
async findNewResources(@Context() ctx: GraphQLContext) {
  const filter = ctx.req.dataScope?.filter;
  // Apply filter...
}
```

### Bước 4: Test

```typescript
// Test script
describe('NewResource Hierarchical Access', () => {
  it('Staff (level 9) should only see own records', async () => {
    // Login as staff user
    // Query records
    // Assert only see own records
  });

  it('Manager (level 7) should see subordinate records', async () => {
    // Login as manager
    // Query records
    // Assert see subordinate records
  });

  it('Executive (level 1-3) should see all records', async () => {
    // Login as executive
    // Query records
    // Assert see all records
  });
});
```

---

## Access Scope Reference

### Access Scope theo Hierarchy Level

| Hierarchy Level | Role | Access Scope | Xem được dữ liệu của |
|-----------------|------|--------------|---------------------|
| 1 | CEO | ALL | Tất cả |
| 2 | C_LEVEL | ALL | Tất cả |
| 3 | VP | ALL | Tất cả |
| 4 | SENIOR_DIRECTOR | REPORTING_CHAIN | Chuỗi báo cáo |
| 5 | DIRECTOR | REPORTING_CHAIN | Chuỗi báo cáo |
| 6 | SENIOR_MANAGER | REPORTING_CHAIN | Chuỗi báo cáo |
| 7 | MANAGER | DIRECT_SUBORDINATES | Cấp dưới trực tiếp |
| 8 | TEAM_LEAD | SELF | Chỉ mình |
| 9 | SENIOR | SELF | Chỉ mình |
| 10 | STAFF | SELF | Chỉ mình |
| 11 | INTERN | SELF | Chỉ mình |

### Filter Logic theo Access Scope

```typescript
switch (accessScope) {
  case 'ALL':
    // Không apply filter
    return null;

  case 'REPORTING_CHAIN':
    // Filter: createdById IN [self, subordinates, team members]
    return {
      createdById: {
        in: [userId, ...subordinateIds, ...teamMemberIds],
      },
    };

  case 'DIRECT_SUBORDINATES':
    // Filter: createdById IN [self, direct subordinates]
    return {
      createdById: {
        in: [userId, ...directSubordinateIds],
      },
    };

  case 'SELF':
    // Filter: createdById = self
    return {
      createdById: {
        eq: userId,
      },
    };
}
```

---

## Resources đang được hỗ trợ

| Resource | Hook | @DataScope | Status |
|----------|------|------------|--------|
| mktOrder | ✅ | ✅ | Active |
| mktInvoice | ✅ | ✅ | Active |
| mktLicense | ✅ | ✅ | Active |
| mktCustomer | ✅ | ✅ | Active |
| mktPayment | ✅ | ✅ | Active |
| mktContract | ✅ | ✅ | Active |
| task | 🔲 | ✅ | Planned |
| note | 🔲 | ✅ | Planned |
| opportunity | 🔲 | ✅ | Planned |

---

## Troubleshooting

### 1. Filter không được apply

**Nguyên nhân**: User context không được resolve

**Giải pháp**:
```typescript
// Check user có organizationLevelId không
const member = await workspaceMemberRepository.findById(userId);
console.log('organizationLevelId:', member.organizationLevelId);

// Nếu null → assign organization level cho user
```

### 2. User level cao vẫn bị filter

**Nguyên nhân**: hierarchyLevel được set sai

**Giải pháp**:
```typescript
// Check hierarchy level trong mktOrganizationLevel
const level = await orgLevelRepository.findById(member.organizationLevelId);
console.log('hierarchyLevel:', level.hierarchyLevel);

// Phải là 1-3 để có ALL access
```

### 3. Manager không thấy subordinate records

**Nguyên nhân**: subordinateMemberIds không được resolve

**Giải pháp**:
```typescript
// Check department hierarchy
const context = await rbacContextService.resolveContext(userId, workspaceId);
console.log('subordinateMemberIds:', context.subordinateMemberIds);

// Nếu empty → check department.managerId hoặc departmentSubManager
```

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | System | Initial implementation guide |
