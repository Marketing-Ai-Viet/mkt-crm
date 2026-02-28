# RBAC Decorators Guide

> Tài liệu hướng dẫn sử dụng các decorator trong module `mkt-rbac-enterprise-grade`.
>
> **Module path:** `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/decorators/`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [@DataScope — Row-Level Security](#2-datascope--row-level-security)
3. [@RequireDepartment — Department Authorization](#3-requiredepartment--department-authorization)
4. [@Permission — Permission Check](#4-permission--permission-check)
5. [Kết hợp Decorators](#5-kết-hợp-decorators)
6. [Đọc DataScope trong Resolver](#6-đọc-datascope-trong-resolver)
7. [Preset Constants](#7-preset-constants)
8. [Filter Utilities](#8-filter-utilities)
9. [DataScopeBuilder (Fluent API)](#9-datascopebuilder-fluent-api)
10. [Bảng tra cứu nhanh](#10-bảng-tra-cứu-nhanh)

---

## 1. Tổng quan

Hệ thống RBAC cung cấp **3 decorator** cho phân quyền:

| Decorator | File | Mục đích | Trigger |
|-----------|------|----------|---------|
| `@DataScope` | `decorators/data-scope.decorator.ts` | Row-level data filtering | `DataScopeInterceptor` (APP_INTERCEPTOR) |
| `@RequireDepartment` | `decorators/require-department.decorator.ts` | Department/hierarchy authorization | `DepartmentAuthorizationGuard` (APP_GUARD) |
| `@Permission` | `decorators/permission.decorator.ts` | CRUD permission check | Permission Guard |

### Luồng xử lý

```
Request
  │
  ├── Auth Guards (WorkspaceAuthGuard, UserAuthGuard)
  │
  ├── @RequireDepartment  →  DepartmentAuthorizationGuard
  │     Kiểm tra department + hierarchy → allow/deny
  │
  ├── @DataScope  →  DataScopeInterceptor
  │     Resolve filter → attach req.dataScope
  │
  └── Handler (Resolver/Controller)
        Đọc req.dataScope để filter data
```

### Import

```typescript
import {
  DataScope,
  DataScopeBuilder,
  DataScopeFor,
  RequireDepartment,
  RequireSalesDepartment,
  RequireAccountingDepartment,
  RequireSalesOrManager,
  RequireManager,
  RequireExecutive,
  Permission,
  PermissionBuilder,
  PermissionFor,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
```

---

## 2. @DataScope — Row-Level Security

Kích hoạt `DataScopeInterceptor` (global APP_INTERCEPTOR). Tự động tính toán filter dựa trên user context và attach vào `req.dataScope`.

**Nếu method không có `@DataScope` → interceptor bỏ qua, không filter.**

### 2.1 Cơ bản

```typescript
@Query(() => [MktOrder])
@DataScope({ resource: 'mktOrder' })
async getOrders(): Promise<MktOrder[]> {
  // req.dataScope.filter sẽ chứa filter conditions tương ứng hierarchy level
  return this.orderService.findAll();
}
```

### 2.2 Filter Mode

| Mode | Mô tả | Khi nào dùng |
|------|--------|-------------|
| `'AUTO'` (default) | Tự động apply filter theo user context | Hầu hết queries |
| `'MANUAL'` | Attach filter nhưng không tự apply | Khi cần custom logic |
| `'SKIP'` | Bỏ qua filtering | Create mutations, aggregation |

```typescript
// AUTO (default) — Tự động filter
@DataScope({ resource: 'mktOrder', mode: 'AUTO' })

// MANUAL — Attach filter, resolver tự apply
@DataScope({ resource: 'mktCustomer', mode: 'MANUAL' })
async getCustomers(@Context() ctx: GraphQLContext) {
  const filter = ctx.req.dataScope?.filter;
  // Apply filter thủ công
  return this.customerService.findWithFilter(filter);
}

// SKIP — Bỏ qua (cho create hoặc aggregation)
@DataScope({ resource: 'mktOrder', mode: 'SKIP' })
async createOrder(@Args('input') input: CreateOrderInput) {
  return this.orderService.create(input);
}
```

### 2.3 Audit Level

| Level | Mô tả | Khi nào dùng |
|-------|--------|-------------|
| `'low'` (default) | Logging tối thiểu | Bulk queries, list |
| `'medium'` | Log truy cập từng record | Single record queries |
| `'high'` | Log đầy đủ | Mutations, sensitive data |

```typescript
// Bulk query — low audit
@DataScope({ resource: 'mktOrder', auditLevel: 'low' })
async getOrders() {}

// Single record — medium audit
@DataScope({ resource: 'mktOrder', auditLevel: 'medium' })
async getOrderById(@Args('id') id: string) {}

// Mutation — high audit
@DataScope({ resource: 'mktOrder', auditLevel: 'high' })
async updateOrderStatus(@Args('input') input: UpdateStatusInput) {}
```

### 2.4 Additional Conditions

Thêm điều kiện static ngoài filter tự động:

```typescript
@DataScope({
  resource: 'mktOrder',
  additionalConditions: [
    { field: 'status', operator: '!=', value: 'DELETED' },
    { field: 'isArchived', operator: '=', value: false },
  ],
})
async getActiveOrders() {}
```

### 2.5 Các options khác

```typescript
@DataScope({
  resource: 'mktOrder',

  // Tắt cache (cho dữ liệu nhạy cảm cần real-time check)
  enableCache: false,

  // Custom cache TTL (ms)
  cacheTTL: 60000,  // 1 phút

  // Custom error message
  errorMessage: 'Bạn không có quyền truy cập dữ liệu đơn hàng',

  // Cho phép truy cập khi không resolve được scope
  allowUnscoped: true,

  // Loại trừ fields khỏi filter
  excludeFields: ['summary', 'notes'],
})
async getOrders() {}
```

### 2.6 DataScopeOptions (full interface)

```typescript
type DataScopeOptions = {
  resource: ResourceEntityName;                    // Required: 'mktOrder', 'mktCustomer', ...
  mode?: 'AUTO' | 'MANUAL' | 'SKIP';             // Default: 'AUTO'
  enableCache?: boolean;                           // Default: true
  cacheTTL?: number;                               // Default: 300000 (5 phút)
  auditLevel?: 'low' | 'medium' | 'high';        // Default: 'low'
  errorMessage?: string;                           // Default: 'Access denied: insufficient data access permissions'
  allowUnscoped?: boolean;                         // Default: false
  excludeFields?: string[];                        // Fields to exclude from filter
  additionalConditions?: RbacFilterConditionItem[]; // Static conditions to merge
};
```

### 2.7 Hierarchy Level → Filter Logic

| Hierarchy Level | Chức vụ | DataAccessScope | Filter |
|----------------|---------|-----------------|--------|
| 1-3 | CEO, C-Level, VP | `ALL_DEPARTMENTS` | `null` (không giới hạn) |
| 4-6 | Director, Senior Manager, Dept Head | `OWN_AND_CHILD_DEPARTMENTS` | department + descendants |
| 7 | Manager | `OWN_DEPARTMENT_AND_TEAM` | team members |
| 8-11 | Team Lead, Senior, Staff, Intern | `OWN_RECORDS` | chỉ bản ghi của mình |

---

## 3. @RequireDepartment — Department Authorization

Kích hoạt `DepartmentAuthorizationGuard` (global APP_GUARD). Kiểm tra user có thuộc department/hierarchy phù hợp hay không.

**Nếu method/class không có `@RequireDepartment` → guard bỏ qua, cho phép.**

### 3.1 Cơ bản

```typescript
// Chỉ cho phép department SALES
@RequireDepartment({ allowedDepartments: ['SALES'] })
async createOrder() {}

// Chỉ cho phép department ACCOUNTING
@RequireDepartment({ allowedDepartments: ['ACCOUNTING'] })
async confirmPayment() {}

// Nhiều departments
@RequireDepartment({ allowedDepartments: ['SALES', 'ACCOUNTING'] })
async updateOrderStatus() {}
```

### 3.2 Cho phép Managers

```typescript
// SALES department HOẶC managers (level <= 7) từ bất kỳ department
@RequireDepartment({
  allowedDepartments: ['SALES'],
  allowManagers: true,
})
async viewOrders() {}
```

### 3.3 Tắt Executive Bypass

Mặc định executives (level <= 3) luôn được phép. Để tắt:

```typescript
// Chỉ ACCOUNTING, kể cả executive cũng phải thuộc ACCOUNTING
@RequireDepartment({
  allowedDepartments: ['ACCOUNTING'],
  allowExecutives: false,
})
async sensitiveAudit() {}
```

### 3.4 Template Priority

```typescript
// Cho phép user có template priority >= 700 (MANAGER level)
@RequireDepartment({
  allowedDepartments: ['SALES'],
  allowHighPriorityTemplates: true,  // default: true
  minTemplatePriority: 700,           // default: 700
})
```

### 3.5 Custom Error Message

```typescript
@RequireDepartment({
  allowedDepartments: ['ACCOUNTING'],
  deniedMessage: 'Chỉ phòng kế toán mới có quyền hoàn tiền',
})
async refundOrder() {}
```

### 3.6 DepartmentAuthOptions (full interface)

```typescript
type DepartmentAuthOptions = {
  allowedDepartments?: string[];      // Department codes được phép
  allowManagers?: boolean;            // Default: false — cho phép managers (level <= 7)
  allowExecutives?: boolean;          // Default: true — cho phép executives (level <= 3)
  allowHighPriorityTemplates?: boolean; // Default: true — cho phép high-priority templates
  minTemplatePriority?: number;       // Default: 700 — minimum template priority
  deniedMessage?: string;             // Custom error message
};
```

### 3.7 Authorization Chain (theo priority giảm dần)

```
checkAuthorization(authContext, options)
  │
  ├── Priority 1: checkHighPriorityTemplates()
  │     Templates có priority >= minTemplatePriority
  │     Sort by priority descending, lấy highest qualifying
  │
  ├── Priority 2: checkExecutiveAccess()
  │     hierarchyLevel <= 3 (CEO=1, C_LEVEL=2, VP=3)
  │     Chỉ khi allowExecutives !== false
  │
  ├── Priority 3: checkManagerAccess()
  │     hierarchyLevel <= 7 (MANAGER level)
  │     Chỉ khi allowManagers === true
  │
  └── Priority 4: checkDepartmentAccess()
        ├── checkDirectDepartment()
        │     departmentCode ∈ allowedDepartments
        └── checkAncestorDepartments()
              departmentAncestorCodes ∩ allowedDepartments
```

### 3.8 Shorthand Decorators

| Decorator | Tương đương | Mô tả |
|-----------|-------------|-------|
| `@RequireExecutive()` | `allowExecutives: true, allowManagers: false` | Chỉ Level <= 3 (CEO, C-Level, VP) |
| `@RequireManager()` | `allowManagers: true` | Level <= 7 + executives |
| `@RequireSalesDepartment()` | `allowedDepartments: ['SALES']` | SALES dept + executives |
| `@RequireAccountingDepartment()` | `allowedDepartments: ['ACCOUNTING']` | ACCOUNTING dept + executives |
| `@RequireSalesOrManager()` | `allowedDepartments: ['SALES'], allowManagers: true` | SALES hoặc manager + executives |

```typescript
// Chỉ executives
@RequireExecutive()
async viewDashboard() {}

// Managers trở lên
@RequireManager()
async approveLeave() {}

// SALES department
@RequireSalesDepartment()
async createOrder() {}

// ACCOUNTING department
@RequireAccountingDepartment()
async confirmPayment() {}

// SALES hoặc managers
@RequireSalesOrManager()
async viewOrders() {}
```

Shorthand decorators chấp nhận options bổ sung:

```typescript
// SALES + custom error
@RequireSalesDepartment({ deniedMessage: 'Chỉ sales mới tạo được đơn hàng' })

// Executive + tắt template bypass
@RequireExecutive({ allowHighPriorityTemplates: false })
```

---

## 4. @Permission — Permission Check

Kiểm tra quyền CRUD trên resource cụ thể. Hỗ trợ cả class-level và method-level.

### 4.1 Cơ bản

```typescript
import { RbacAction } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

// Class-level: Default READ cho tất cả methods
@Permission({ resource: 'ORDERS', action: RbacAction.READ })
export class OrderQueryResolver {}

// Method-level: CREATE permission
@Mutation(() => Order)
@Permission({ resource: 'ORDERS', action: RbacAction.CREATE })
async createOrder(@Args('input') input: CreateOrderInput) {}

// DELETE với custom error
@Mutation(() => Boolean)
@Permission({
  resource: 'ORDERS',
  action: RbacAction.DELETE,
  errorMessage: 'Bạn không có quyền xóa đơn hàng này',
})
async deleteOrder(@Args('id') id: string) {}
```

### 4.2 Record ID Extraction

```typescript
// Từ @Args parameter
@Permission({
  resource: 'ORDERS',
  action: RbacAction.UPDATE,
  recordIdParam: 'id',  // Extract từ @Args('id')
})
async updateOrder(@Args('id') id: string, @Args('input') input: UpdateInput) {}

// Từ input object path
@Permission({
  resource: 'ORDERS',
  action: RbacAction.UPDATE,
  recordIdPath: 'input.id',  // Extract từ input.id
})
async updateOrder(@Args('input') input: UpdateInput) {}
```

### 4.3 Public Endpoint

```typescript
@Permission({
  resource: 'PRODUCTS',
  action: RbacAction.READ,
  allowAnonymous: true,
})
async getPublicProduct(@Args('id') id: string) {}
```

### 4.4 Ownership + Hierarchy

```typescript
@Permission({
  resource: 'ORDERS',
  action: RbacAction.UPDATE,
  recordIdParam: 'id',
  requireOwnership: true,  // Chỉ owner mới update được
  minimumLevel: 7,         // Minimum level: Manager
})
async updateOrder(@Args('id') id: string) {}
```

### 4.5 Tắt Cache

```typescript
@Permission({
  resource: 'SALARY_DATA',
  action: RbacAction.READ,
  enableCache: false,  // Real-time permission check
})
async getSalary() {}
```

### 4.6 PermissionMetadata (full interface)

```typescript
type PermissionMetadata = {
  resource?: string;            // Resource name (optional at method-level if class has it)
  action: RbacAction;           // Required: READ | CREATE | UPDATE | DELETE
  recordIdParam?: string;       // @Args parameter name chứa record ID
  recordIdPath?: string;        // Path tới record ID trong input object
  enableCache?: boolean;        // Default: true
  cacheTTL?: number;            // Cache TTL override (ms)
  errorMessage?: string;        // Custom error message
  allowAnonymous?: boolean;     // Default: false
  skipValidation?: boolean;     // Default: false — skip permission check
  requireOwnership?: boolean;   // Default: false
  minimumLevel?: number;        // 1=CEO ... 11=Intern
  requiredFields?: string[];    // Field-level permission (future)
};
```

---

## 5. Kết hợp Decorators

### 5.1 Query với department + data scope

```typescript
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class OrderQueryResolver {

  // Chỉ SALES, filter theo hierarchy
  @RequireSalesDepartment({ allowManagers: true })
  @DataScope(ORDER_DATA_SCOPE.QUERY_LIST)
  async getOrders() {}

  // Chỉ executives, không filter (dashboard)
  @RequireExecutive()
  @DataScope({ resource: 'mktOrder', mode: 'SKIP' })
  async getOrderStats() {}
}
```

### 5.2 Mutation với department + permission + data scope

```typescript
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class OrderMutationResolver {

  // SALES tạo đơn hàng
  @RequireSalesDepartment()
  @Permission({ resource: 'ORDERS', action: RbacAction.CREATE })
  @DataScope(ORDER_DATA_SCOPE.MUTATION_CREATE)
  async createOrder(@Args('input') input: CreateOrderInput) {}

  // ACCOUNTING xác nhận thanh toán
  @RequireAccountingDepartment()
  @Permission({ resource: 'ORDERS', action: RbacAction.UPDATE })
  @DataScope(ORDER_DATA_SCOPE.MUTATION_CONFIRM_PAYMENT)
  async confirmPayment(@Args('orderId') orderId: string) {}
}
```

### 5.3 Thứ tự thực thi

```
1. Auth Guards (WorkspaceAuthGuard → UserAuthGuard)
2. @RequireDepartment → DepartmentAuthorizationGuard (APP_GUARD)
3. @Permission → Permission Guard
4. @DataScope → DataScopeInterceptor (APP_INTERCEPTOR)
5. Handler (Resolver method)
```

Nếu bất kỳ bước nào thất bại → `ForbiddenException` và pipeline dừng lại.

---

## 6. Đọc DataScope trong Resolver

### 6.1 Khai báo GraphQLContext type

```typescript
import { DataScopeContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';

type GraphQLContext = {
  req: {
    dataScope?: DataScopeContext;
  };
};
```

### 6.2 Đọc dataScope

```typescript
@DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)
async getOrderById(
  @Args('orderId') orderId: string,
  @Context() ctx: GraphQLContext,
  @AuthWorkspace() workspace: Workspace,
): Promise<OrderOutput | null> {
  const dataScope = ctx.req.dataScope;

  // Kiểm tra full access
  if (dataScope?.hasFullAccess) {
    // Level 1-3: không có filter, truy cập toàn bộ
  }

  // Kiểm tra filter
  if (dataScope?.filter) {
    // filter.type = 'AND' | 'OR'
    // filter.conditions = [{ field, operator, value }]
  }

  // Kiểm tra skipped
  if (dataScope?.skipped) {
    // mode: 'SKIP' → không filter
  }
}
```

### 6.3 DataScopeContext (cấu trúc)

```typescript
type DataScopeContext = {
  resource: string;                    // 'mktOrder', 'mktCustomer', ...
  filter: RbacFilterCondition | null;  // Row-level filter conditions
  userContext: UserContext | null;      // Full user context
  hasFullAccess: boolean;              // Level 1-3 → true
  skipped: boolean;                    // mode: 'SKIP' → true
  reason?: string;                     // Lý do skip hoặc null filter
  resolvedAt: string;                  // Timestamp
  latencyMs: number;                   // Thời gian resolve (ms)
};
```

### 6.4 Ví dụ thực tế (từ OrderQueryResolver)

```typescript
@RequireOrderReadAccess()
@DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)
async getOrderById(
  @Args('orderId', { type: () => String }) orderId: string,
  @Context() ctx: GraphQLContext,
  @AuthWorkspace() workspace: Workspace,
): Promise<OrderOutput | null> {
  // buildWhereClause sẽ đọc ctx.req.dataScope.filter và merge với base conditions
  const whereClause = this.orderQueryService.buildWhereClause(
    { id: orderId },
    ctx,
  );

  const order = await this.orderRepository.findOneWithDetailsWorkspace(
    workspace.id,
    whereClause,
  );

  if (!order) {
    return null;
  }

  return this.orderQueryService.mapOrderToOutput(order);
}
```

---

## 7. Preset Constants

Mỗi module có preset constants cho `@DataScope` để tránh lặp lại configuration.

### 7.1 Order

**File:** `order/constants/order-data-scope.constants.ts`

```typescript
import { ORDER_DATA_SCOPE } from 'src/mkt-core/order/constants';

// Query presets
@DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)           // AUTO + medium audit
@DataScope(ORDER_DATA_SCOPE.QUERY_LIST)              // AUTO + low audit
@DataScope(ORDER_DATA_SCOPE.QUERY_BY_CUSTOMER)       // AUTO + medium audit
@DataScope(ORDER_DATA_SCOPE.QUERY_PAYMENT_SUMMARY)   // AUTO + medium audit
@DataScope(ORDER_DATA_SCOPE.QUERY_AGGREGATION)       // SKIP + low audit

// Mutation presets
@DataScope(ORDER_DATA_SCOPE.MUTATION_CREATE)          // SKIP + high audit
@DataScope(ORDER_DATA_SCOPE.MUTATION_UPDATE_STATUS)   // AUTO + high audit
@DataScope(ORDER_DATA_SCOPE.MUTATION_CONFIRM)         // AUTO + high audit
@DataScope(ORDER_DATA_SCOPE.MUTATION_CONFIRM_PAYMENT) // AUTO + high audit
@DataScope(ORDER_DATA_SCOPE.MUTATION_REFUND)          // AUTO + high audit
@DataScope(ORDER_DATA_SCOPE.MUTATION_UNLOCK)          // AUTO + high audit
```

### 7.2 Customer

**File:** `customer/constants/customer-data-scope.constants.ts`

```typescript
import { CUSTOMER_DATA_SCOPE } from 'src/mkt-core/customer/constants';

// Query presets
@DataScope(CUSTOMER_DATA_SCOPE.QUERY_SINGLE)           // AUTO + medium audit
@DataScope(CUSTOMER_DATA_SCOPE.QUERY_LIST)              // AUTO + low audit
@DataScope(CUSTOMER_DATA_SCOPE.QUERY_AGGREGATION)       // SKIP + low audit
@DataScope(CUSTOMER_DATA_SCOPE.QUERY_EXPORT)            // AUTO + high audit
@DataScope(CUSTOMER_DATA_SCOPE.QUERY_PURCHASE_HISTORY)  // AUTO + medium audit

// Mutation presets
@DataScope(CUSTOMER_DATA_SCOPE.MUTATION_CREATE)    // SKIP + high audit
@DataScope(CUSTOMER_DATA_SCOPE.MUTATION_UPDATE)    // AUTO + high audit
@DataScope(CUSTOMER_DATA_SCOPE.MUTATION_DELETE)    // AUTO + high audit
@DataScope(CUSTOMER_DATA_SCOPE.MUTATION_RESTORE)   // AUTO + high audit
```

### 7.3 Payment

**File:** `payment/constants/payment-data-scope.constants.ts`

```typescript
import { PAYMENT_DATA_SCOPE } from 'src/mkt-core/payment/constants';
```

### 7.4 License

**File:** `mkt-license-integration/constants/license-data-scope.constants.ts`

```typescript
import { LICENSE_DATA_SCOPE } from 'src/mkt-core/mkt-license-integration/constants';
```

### 7.5 Tạo Preset Constants mới

Pattern để tạo preset cho module mới:

```typescript
import { DataScopeOptions } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { ResourceEntityName } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import {
  DATA_SCOPE_MODE,
  DATA_SCOPE_AUDIT_LEVEL,
} from 'src/mkt-core/contract/constants/contract-data-scope.constants';

const MY_RESOURCE: ResourceEntityName = 'mktMyEntity';

const BASE = { resource: MY_RESOURCE } as const;

export const MY_ENTITY_DATA_SCOPE = {
  QUERY_SINGLE: {
    ...BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  QUERY_LIST: {
    ...BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  MUTATION_CREATE: {
    ...BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  MUTATION_UPDATE: {
    ...BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,
} as const;
```

---

## 8. Filter Utilities

**File:** `interceptors/utils/filter-to-where.utils.ts`

Tiện ích chuyển đổi `RbacFilterCondition` sang TypeORM WHERE clauses.

### 8.1 filterToWhere — Chuyển đổi sang TypeORM

```typescript
import { filterToWhere } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

const filter: RbacFilterCondition = {
  type: 'OR',
  conditions: [
    { field: 'departmentId', operator: 'IN', value: ['dept1', 'dept2'] },
    { field: 'createdById', operator: '=', value: 'member1' },
  ],
};

const where = filterToWhere(filter);
// Result: [{ departmentId: In(['dept1', 'dept2']) }, { createdById: 'member1' }]

// Dùng trong TypeORM:
repository.find({ where });
```

### 8.2 filterToSql — Chuyển đổi sang raw SQL

```typescript
import { filterToSql } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

const { sql, parameters } = filterToSql(filter, 'order');
// sql: "(order.departmentId IN (:...param0) OR order.createdById = :param1)"
// parameters: { param0: ['dept1', 'dept2'], param1: 'member1' }
```

### 8.3 applyFilterToQueryBuilder — Apply vào QueryBuilder

```typescript
import { applyFilterToQueryBuilder } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

const qb = repository.createQueryBuilder('order');
applyFilterToQueryBuilder(qb, filter, 'order');
const orders = await qb.getMany();
```

### 8.4 mergeFilters — Gộp nhiều filters

```typescript
import { mergeFilters } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';

const filter1: RbacFilterCondition = { type: 'AND', conditions: [...] };
const filter2: RbacFilterCondition = { type: 'OR', conditions: [...] };
const merged = mergeFilters([filter1, filter2], 'AND');
```

### 8.5 Các hàm tiện ích khác

```typescript
import {
  hasEffectiveConditions,  // Kiểm tra filter có conditions thực tế
  describeFilter,          // Mô tả filter dạng text (cho logging)
  conditionItemToWhere,    // Chuyển 1 condition sang TypeORM
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';
```

### 8.6 Supported Operators

| Operator | TypeORM | SQL | Mô tả |
|----------|---------|-----|-------|
| `=` | value | `=` | Bằng |
| `!=` | `Not(value)` | `!=` | Khác |
| `>` | `MoreThan(value)` | `>` | Lớn hơn |
| `>=` | `MoreThanOrEqual(value)` | `>=` | Lớn hơn hoặc bằng |
| `<` | `LessThan(value)` | `<` | Nhỏ hơn |
| `<=` | `LessThanOrEqual(value)` | `<=` | Nhỏ hơn hoặc bằng |
| `IN` | `In(value[])` | `IN` | Nằm trong danh sách |
| `NOT_IN` | `Not(In(value[]))` | `NOT IN` | Không nằm trong danh sách |
| `LIKE` | `Like('%value%')` | `LIKE` | Tìm kiếm pattern |
| `IS_NULL` | `IsNull()` | `IS NULL` | Là null |
| `IS_NOT_NULL` | `Not(IsNull())` | `IS NOT NULL` | Không null |
| `ALL` | skip | `TRUE` | Không filter |

---

## 9. DataScopeBuilder (Fluent API)

Sử dụng fluent builder thay vì truyền object:

### 9.1 DataScopeBuilder

```typescript
import { DataScopeFor } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

@DataScopeFor('mktOrder')
  .withMode('AUTO')
  .withAuditLevel('medium')
  .withAdditionalCondition({ field: 'status', operator: '!=', value: 'DELETED' })
  .build()
async getActiveOrders() {}
```

### 9.2 PermissionBuilder

```typescript
import { PermissionFor } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { RbacAction } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

@PermissionFor('ORDERS')
  .withAction(RbacAction.UPDATE)
  .withRecordIdParam('id')
  .withErrorMessage('Không thể cập nhật đơn hàng')
  .build()
async updateOrder(@Args('id') id: string) {}
```

---

## 10. Bảng tra cứu nhanh

### Chọn Decorator nào?

| Yêu cầu | Decorator | Ví dụ |
|----------|-----------|-------|
| Giới hạn theo department | `@RequireDepartment` | Chỉ SALES tạo đơn |
| Giới hạn theo hierarchy | `@RequireExecutive` / `@RequireManager` | Dashboard chỉ executives |
| Filter dữ liệu theo user | `@DataScope` | Staff chỉ thấy đơn của mình |
| Kiểm tra CRUD permission | `@Permission` | Kiểm tra quyền DELETE |
| Kết hợp | Dùng cả 3 | Department + permission + filter |

### Chọn Mode nào cho @DataScope?

| Scenario | Mode | Lý do |
|----------|------|-------|
| Query list/single record | `AUTO` | Tự động filter theo hierarchy |
| Create mutation | `SKIP` | Record chưa tồn tại, không cần filter |
| Update/Delete mutation | `AUTO` | Đảm bảo user có quyền trên record |
| Aggregation/Statistics | `SKIP` | Trả về số liệu tổng hợp, không expose record |
| Custom filter logic | `MANUAL` | Resolver tự handle filter |

### Chọn Audit Level nào?

| Scenario | Level | Lý do |
|----------|-------|-------|
| List queries (bulk) | `low` | Giảm logging cho operations thường xuyên |
| Single record queries | `medium` | Track truy cập từng record |
| All mutations | `high` | Log đầy đủ mọi thay đổi |
| Sensitive data (salary, report) | `high` | Audit compliance |
| Export operations | `high` | Bulk data exposure cần tracking |
