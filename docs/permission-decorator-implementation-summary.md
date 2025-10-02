# Permission Decorator Implementation Summary

## ✅ Đã Triển Khai

### 1. **Enhanced Permission Decorator**

File: `/packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/decorators/permission.decorator.ts`

#### Interface mới:
```typescript
interface PermissionMetadata {
  // CORE (Required)
  resource: string;          // Tên module/resource
  action: PermissionAction;  // READ | CREATE | UPDATE | DELETE

  // RECORD IDENTIFICATION (Optional)
  recordIdParam?: string;    // Extract từ @Args('id')
  recordIdPath?: string;     // Extract từ input object 'input.id'

  // PERFORMANCE (Optional)
  enableCache?: boolean;     // Default: true
  cacheTTL?: number;        // Override TTL (ms)

  // ERROR HANDLING (Optional)
  errorMessage?: string;     // Custom error message
  allowAnonymous?: boolean;  // Allow public access

  // ADVANCED (Optional - for FULL mode)
  requireOwnership?: boolean;
  minimumLevel?: number;
  skipValidation?: boolean;
  // ...
}
```

### 2. **Enhanced Guard Logic**

File: `/packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/guards/enterprise-rbac.guard.ts`

#### New Features:

##### A. **RecordId Extraction**
```typescript
// 1. From parameter name
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdParam: 'id'  // Extracts from @Args('id')
})

// 2. From input object path
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdPath: 'input.id'  // Extracts from input.id
})
```

**Implementation:**
- `extractRecordIdFromMetadata()` - Main extraction method
- `extractValueByPath()` - Nested path extraction

##### B. **Cache Control**
```typescript
@Permission({
  resource: 'SALARY_DATA',
  action: PermissionAction.READ,
  enableCache: false,  // Disable cache
  cacheTTL: 60000     // 1 minute override
})
```

**Implementation:**
```typescript
cacheContext: {
  enableCache: metadata.enableCache ?? true,
  cacheTTL: metadata.cacheTTL,
  forceRefresh: false,
}
```

##### C. **Anonymous Access**
```typescript
@Permission({
  resource: 'PRODUCTS',
  action: PermissionAction.READ,
  allowAnonymous: true  // Public endpoint
})
```

**Implementation:**
```typescript
if (permissionMetadata.allowAnonymous) {
  this.logger.debug('Anonymous access allowed');
  return true;
}
```

##### D. **Custom Error Messages**
```typescript
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.DELETE,
  errorMessage: 'Bạn không có quyền xóa đơn hàng'
})
```

**Implementation:**
```typescript
const errorMessage =
  customErrorMessage ||
  result.reason ||
  'Access denied by permission validation';

throw new ForbiddenException(errorMessage);
```

### 3. **Fluent API Builder**

```typescript
// Option 1: Traditional decorator
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdParam: 'id'
})

// Option 2: Fluent builder API
@PermissionFor('ORDERS')
  .withAction(PermissionAction.UPDATE)
  .withRecordIdParam('id')
  .withErrorMessage('Cannot update order')
  .build()
```

---

## 📝 Usage Examples

### Example 1: Basic CRUD Operations

```typescript
@Resolver(() => OrderOutput)
@UseGuards(UserAuthGuard, EnterpriseRbacGuard)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.READ  // Default READ for queries
})
export class OrderResolver {

  // READ - kế thừa từ class-level
  @Query(() => OrderOutput)
  async getOrder(@Args('id') id: string) {
    return this.orderService.findOne(id);
  }

  // CREATE - override
  @Mutation(() => OrderOutput)
  @Permission({
    resource: 'ORDERS',
    action: PermissionAction.CREATE
  })
  async createOrder(@Args('input') input: CreateOrderInput) {
    return this.orderService.create(input);
  }

  // UPDATE - with recordId
  @Mutation(() => OrderOutput)
  @Permission({
    resource: 'ORDERS',
    action: PermissionAction.UPDATE,
    recordIdParam: 'id'  // Auto extract from @Args('id')
  })
  async updateOrder(
    @Args('id') id: string,
    @Args('input') input: UpdateOrderInput
  ) {
    return this.orderService.update(id, input);
  }

  // DELETE - with custom error
  @Mutation(() => Boolean)
  @Permission({
    resource: 'ORDERS',
    action: PermissionAction.DELETE,
    recordIdParam: 'id',
    errorMessage: 'Bạn không có quyền xóa đơn hàng này'
  })
  async deleteOrder(@Args('id') id: string) {
    await this.orderService.delete(id);
    return true;
  }
}
```

### Example 2: RecordId from Input Object

```typescript
@Mutation(() => OrderOutput)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdPath: 'input.id'  // Extract từ input.id
})
async updateOrderV2(@Args('input') input: UpdateOrderInput) {
  // input.id sẽ được extract tự động
  return this.orderService.update(input);
}
```

### Example 3: Sensitive Data (No Cache)

```typescript
@Query(() => SalaryOutput)
@Permission({
  resource: 'SALARY_DATA',
  action: PermissionAction.READ,
  enableCache: false,  // Real-time permission check
  errorMessage: 'Bạn không có quyền xem thông tin lương'
})
async getSalary(@Args('userId') userId: string) {
  return this.salaryService.findByUser(userId);
}
```

### Example 4: Public Endpoint

```typescript
@Query(() => [ProductOutput])
@Permission({
  resource: 'PRODUCTS',
  action: PermissionAction.READ,
  allowAnonymous: true  // No authentication required
})
async getPublicProducts() {
  return this.productService.findPublic();
}
```

### Example 5: Nested Path Extraction

```typescript
@Mutation(() => OrderOutput)
@Permission({
  resource: 'ORDERS',
  action: PermissionAction.UPDATE,
  recordIdPath: 'input.data.orderId'  // Nested path
})
async complexUpdate(@Args('input') input: ComplexUpdateInput) {
  // Extracts from input.data.orderId
  return this.orderService.complexUpdate(input);
}
```

---

## 🔄 Migration Guide

### Before (Old Format):
```typescript
@Permission({
  action: PermissionAction.READ,
  objectName: PERMISSION_RESOURCE_KEYS.ORDERS,
})
```

### After (New Format):
```typescript
@Permission({
  resource: 'ORDERS',              // Clearer
  action: PermissionAction.READ,
  recordIdParam: 'id',             // Auto extract
  enableCache: true,               // Cache control
  errorMessage: 'Custom message'   // Better UX
})
```

### Backward Compatibility:
- ✅ `objectName` still works (converted to `resource` internally)
- ✅ Old decorators continue to function
- ✅ No breaking changes

---

## 🎯 Key Benefits

### 1. **Developer Experience**
- ✅ Simple, intuitive API
- ✅ Auto recordId extraction
- ✅ Type-safe with TypeScript
- ✅ Rich IDE autocomplete

### 2. **Performance**
- ✅ Built-in cache control
- ✅ TTL override per endpoint
- ✅ Optimized for SIMPLIFIED mode

### 3. **Security**
- ✅ Fine-grained permission control
- ✅ Record-level security
- ✅ Custom validation rules

### 4. **User Experience**
- ✅ Custom error messages
- ✅ Localized errors
- ✅ Better error context

### 5. **Flexibility**
- ✅ Works with both SIMPLIFIED & FULL modes
- ✅ Extensible for future features
- ✅ Backward compatible

---

## 📊 Comparison Table

| Feature | Old Decorator | New Decorator |
|---------|--------------|---------------|
| Resource Name | `objectName` | `resource` ✅ |
| RecordId Extraction | Manual | Auto (param/path) ✅ |
| Cache Control | No | Yes ✅ |
| Custom Errors | No | Yes ✅ |
| Anonymous Access | No | Yes ✅ |
| Fluent API | No | Yes ✅ |
| Backward Compatible | - | Yes ✅ |

---

## 🔧 Implementation Files

1. **Decorator**: `decorators/permission.decorator.ts`
   - `PermissionMetadata` interface
   - `Permission()` decorator
   - `PermissionBuilder` class
   - `PermissionFor()` fluent API

2. **Guard**: `guards/enterprise-rbac.guard.ts`
   - `extractRecordIdFromMetadata()` - RecordId extraction
   - `extractValueByPath()` - Nested path support
   - `handleValidationResult()` - Custom error messages
   - Anonymous access logic
   - Cache control integration

3. **Documentation**: `docs/permission-decorator-design.md`
   - Complete design spec
   - Usage examples
   - Best practices

---

## ✅ Testing Checklist

- [x] Basic CRUD permissions work
- [x] RecordId extraction from param (`recordIdParam`)
- [x] RecordId extraction from path (`recordIdPath`)
- [x] Cache control (`enableCache`, `cacheTTL`)
- [x] Custom error messages (`errorMessage`)
- [x] Anonymous access (`allowAnonymous`)
- [x] Backward compatibility (`objectName`)
- [x] Fluent API builder works
- [x] Integration with SIMPLIFIED mode
- [x] Integration with FULL mode

---

## 🚀 Next Steps (Optional)

1. **Field-level Permissions**
   - Use `requiredFields` for field access control

2. **Condition Builder**
   - Dynamic permission conditions
   - Time-based, location-based rules

3. **Batch Permissions**
   - Bulk operation permissions
   - Transaction-level control

4. **Metrics Dashboard**
   - Track permission denials
   - Performance analytics

---

## 📚 Related Documentation

- [RBAC Caching Guide](./rbac-caching-guide.md)
- [Permission Decorator Design](./permission-decorator-design.md)
- [Cache Invalidation Usage](../examples/cache-invalidation-usage.example.ts)
- [15-Step Validation Guide](./rbac-15-step-validation-complete-guide.md)

---

**Status**: ✅ **COMPLETE** - Ready for production use!
