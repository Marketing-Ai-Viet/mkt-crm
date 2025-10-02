# Permission Decorator Design - SIMPLIFIED CRUD Mode

## 🎯 Mục Tiêu

Thiết kế `@Permission()` decorator đơn giản, dễ sử dụng cho hệ thống **CRUD-only RBAC (6-step validation)**

---

## 📋 Permission Decorator Interface

### 1. **Basic Usage (Minimal)**

```typescript
@Permission({
  resource: 'ORDERS',     // Tên module/resource
  action: 'READ'          // CRUD action
})
```

### 2. **Complete Interface**

```typescript
interface PermissionOptions {
  // ========== REQUIRED ==========
  resource: string;                    // Module/Resource name (e.g., 'ORDERS', 'CUSTOMERS')
  action: PermissionAction;            // CRUD action: READ | CREATE | UPDATE | DELETE

  // ========== OPTIONAL ==========
  // Resource identification
  recordIdParam?: string;              // Tên param chứa recordId (default: 'id')
  recordIdPath?: string;               // Path đến recordId trong input object (e.g., 'input.id')

  // Performance optimization
  enableCache?: boolean;               // Enable caching (default: true trong SIMPLIFIED mode)
  cacheTTL?: number;                   // Cache TTL override (ms)

  // Error handling
  errorMessage?: string;               // Custom error message
  allowAnonymous?: boolean;            // Allow anonymous access (default: false)

  // Advanced (optional - for future)
  requiredFields?: string[];           // Required fields in resource
  conditions?: PermissionCondition[];  // Dynamic conditions (future feature)
}
```

---

## 💡 Usage Examples

### Example 1: Class-level Permission (Default cho tất cả methods)

```typescript
@Resolver(() => MktOrderOutput)
@UseGuards(UserAuthGuard, EnterpriseRbacGuard)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.READ  // Default READ cho queries
})
export class MktOrderResolver {

  // Kế thừa READ từ class-level
  @Query(() => MktOrderOutput)
  async getOrder(@Args('id') id: string) {
    return this.orderService.findOne(id);
  }
}
```

### Example 2: Method-level Override (Ghi đè class-level)

```typescript
@Resolver(() => MktOrderOutput)
@UseGuards(UserAuthGuard, EnterpriseRbacGuard)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.READ  // Default
})
export class MktOrderResolver {

  // Override: Require CREATE permission
  @Mutation(() => MktOrderOutput)
  @Permission({
    resource: 'ORDERS',
    action: PermissionAction.CREATE
  })
  async createOrder(@Args('input') input: CreateOrderInput) {
    return this.orderService.create(input);
  }

  // Override: Require UPDATE permission với recordId
  @Mutation(() => MktOrderOutput)
  @Permission({
    resource: 'ORDERS',
    action: PermissionAction.UPDATE,
    recordIdParam: 'id'  // Lấy từ @Args('id')
  })
  async updateOrder(
    @Args('id') id: string,
    @Args('input') input: UpdateOrderInput
  ) {
    return this.orderService.update(id, input);
  }
}
```

### Example 3: RecordId từ Input Object

```typescript
@Mutation(() => MktOrderOutput)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdPath: 'input.id'  // Lấy từ input object
})
async updateOrder(@Args('input') input: UpdateOrderInput) {
  // input.id sẽ được extract tự động
  return this.orderService.update(input);
}
```

### Example 4: Custom Error Message

```typescript
@Permission({
  resource: 'CUSTOMERS',
  action: PermissionAction.DELETE,
  errorMessage: 'Bạn không có quyền xóa khách hàng'
})
async deleteCustomer(@Args('id') id: string) {
  return this.customerService.delete(id);
}
```

### Example 5: Disable Cache cho Sensitive Data

```typescript
@Query(() => SalaryOutput)
@Permission({
  resource: 'SALARY_DATA',
  action: PermissionAction.READ,
  enableCache: false  // Không cache sensitive data
})
async getSalary(@Args('userId') userId: string) {
  return this.salaryService.findByUser(userId);
}
```

### Example 6: Allow Anonymous (Public endpoint)

```typescript
@Query(() => ProductOutput)
@Permission({
  resource: 'PRODUCTS',
  action: PermissionAction.READ,
  allowAnonymous: true  // Cho phép truy cập không cần auth
})
async getPublicProduct(@Args('id') id: string) {
  return this.productService.findPublic(id);
}
```

---

## 🔧 Implementation Details

### 1. **Decorator Implementation**

```typescript
// permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface PermissionMetadata {
  resource: string;
  action: PermissionAction;
  recordIdParam?: string;
  recordIdPath?: string;
  enableCache?: boolean;
  cacheTTL?: number;
  errorMessage?: string;
  allowAnonymous?: boolean;
}

export const Permission = (options: PermissionMetadata) => {
  return SetMetadata(PERMISSION_KEY, options);
};
```

### 2. **Guard Extract Permission Metadata**

```typescript
// enterprise-rbac.guard.ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  // 1. Get permission metadata from decorator
  const permissionMeta = this.reflector.getAllAndOverride<PermissionMetadata>(
    PERMISSION_KEY,
    [context.getHandler(), context.getClass()]
  );

  if (!permissionMeta) {
    throw new ForbiddenException('No permission metadata found');
  }

  // 2. Extract recordId if specified
  let recordId: string | undefined;

  if (permissionMeta.recordIdParam) {
    // From @Args('id')
    const args = context.getArgs();
    recordId = args[permissionMeta.recordIdParam];
  } else if (permissionMeta.recordIdPath) {
    // From input object (e.g., 'input.id')
    const args = context.getArgs();
    recordId = this.extractValueByPath(args, permissionMeta.recordIdPath);
  }

  // 3. Build permission context
  const permissionContext: EnhancedPermissionContext = {
    userContext: await this.getUserContext(request),
    resourceContext: {
      resourceType: permissionMeta.resource,
      resourceCategory: 'BUSINESS_DATA',
      recordId,
    },
    action: permissionMeta.action,
    cacheContext: {
      enableCache: permissionMeta.enableCache ?? true,
      cacheTTL: permissionMeta.cacheTTL,
    },
    // ...
  };

  // 4. Execute validation
  const result = await this.validationOrchestrator.executeValidation(
    permissionContext
  );

  // 5. Handle result
  if (result.result === CheckResult.PASS) {
    return true;
  }

  throw new ForbiddenException(
    permissionMeta.errorMessage || result.reason
  );
}
```

---

## 📊 Comparison: Current vs Proposed

### **Current Implementation**
```typescript
@Permission({
  action: PermissionAction.READ,
  objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
})
```

**Issues:**
- ❌ `objectName` không rõ ràng (nên dùng `resource`)
- ❌ Không hỗ trợ recordId extraction
- ❌ Không có cache control
- ❌ Không có custom error message

### **Proposed Implementation**
```typescript
@Permission({
  resource: 'ORDERS',              // Rõ ràng hơn
  action: PermissionAction.READ,
  recordIdParam: 'id',             // Auto extract recordId
  enableCache: true,               // Cache control
  errorMessage: 'Custom message'   // Better UX
})
```

**Benefits:**
- ✅ Rõ ràng, dễ hiểu
- ✅ Auto extract recordId
- ✅ Cache optimization
- ✅ Better error handling
- ✅ Extensible cho future features

---

## 🎨 Best Practices

### 1. **Class-level cho Default Permission**
```typescript
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.READ  // Default READ
})
export class MktOrderResolver {
  // All methods default to READ unless overridden
}
```

### 2. **Method-level Override cho Specific Actions**
```typescript
@Mutation(() => Order)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.CREATE  // Override
})
async createOrder() { }
```

### 3. **Always Specify recordId cho UPDATE/DELETE**
```typescript
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdParam: 'id'  // Required!
})
async updateOrder(@Args('id') id: string) { }
```

### 4. **Disable Cache cho Sensitive Operations**
```typescript
@Permission({
  resource: 'FINANCIAL_REPORTS',
  action: PermissionAction.READ,
  enableCache: false  // Real-time data
})
```

### 5. **Custom Error Messages cho Better UX**
```typescript
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.DELETE,
  errorMessage: 'Bạn không có quyền xóa đơn hàng này'
})
```

---

## 🚀 Migration Guide

### Step 1: Update Existing Decorators

**Before:**
```typescript
@Permission({
  action: PermissionAction.READ,
  objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
})
```

**After:**
```typescript
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.READ,
})
```

### Step 2: Add recordId Extraction

**Before:**
```typescript
@Mutation(() => Order)
@Permission({
  action: PermissionAction.UPDATE,
  objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
})
async updateOrder(@Args('id') id: string) { }
```

**After:**
```typescript
@Mutation(() => Order)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdParam: 'id'  // Auto extract
})
async updateOrder(@Args('id') id: string) { }
```

### Step 3: Optimize with Cache Control

```typescript
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.READ,
  enableCache: true,       // Default
  cacheTTL: 5 * 60 * 1000  // 5 minutes
})
```

---

## 📝 Summary

### **Minimal Decorator (CRUD-only)**
```typescript
@Permission({
  resource: 'RESOURCE_NAME',
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'
})
```

### **Complete Decorator (All Options)**
```typescript
@Permission({
  resource: 'RESOURCE_NAME',
  action: PermissionAction.UPDATE,
  recordIdParam: 'id',
  recordIdPath: 'input.id',
  enableCache: true,
  cacheTTL: 600000,
  errorMessage: 'Custom error',
  allowAnonymous: false
})
```

### **Common Patterns**

| Use Case | Configuration |
|----------|--------------|
| **Query (Read)** | `{ resource: 'X', action: 'READ' }` |
| **Create** | `{ resource: 'X', action: 'CREATE' }` |
| **Update** | `{ resource: 'X', action: 'UPDATE', recordIdParam: 'id' }` |
| **Delete** | `{ resource: 'X', action: 'DELETE', recordIdParam: 'id' }` |
| **Public API** | `{ resource: 'X', action: 'READ', allowAnonymous: true }` |
| **Sensitive** | `{ resource: 'X', action: 'READ', enableCache: false }` |

---

## ✅ Recommended Decorator Structure

```typescript
export interface PermissionOptions {
  // Core (Required)
  resource: string;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';

  // Record identification (Optional)
  recordIdParam?: string;
  recordIdPath?: string;

  // Performance (Optional)
  enableCache?: boolean;
  cacheTTL?: number;

  // UX (Optional)
  errorMessage?: string;
  allowAnonymous?: boolean;
}
```

**Đơn giản, rõ ràng, đủ dùng cho CRUD-only RBAC! 🎯**
