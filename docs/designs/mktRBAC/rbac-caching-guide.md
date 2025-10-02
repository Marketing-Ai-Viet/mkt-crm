# RBAC Caching và Cache Invalidation Guide

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Cấu Hình Caching](#cấu-hình-caching)
3. [Cache Invalidation](#cache-invalidation)
4. [Sử Dụng Trong Code](#sử-dụng-trong-code)
5. [Performance Tuning](#performance-tuning)
6. [Troubleshooting](#troubleshooting)

---

## Tổng Quan

Hệ thống RBAC caching được thiết kế để tối ưu hóa performance cho cả 2 chế độ validation:

### 🎯 **SIMPLIFIED Mode (6-step)**
- Cache TTL: 10 phút (mặc định)
- Invalidation: Tức thì (immediate)
- Phù hợp: CRUD đơn giản, hiệu năng cao

### 🎯 **FULL Mode (15-step)**
- Cache TTL: 30 phút (mặc định)
- Invalidation: Batched (1 giây delay)
- Phù hợp: Enterprise-grade với audit đầy đủ

---

## Cấu Hình Caching

### 1. Environment Variables

```bash
# .env
RBAC_VALIDATION_MODE=SIMPLIFIED  # hoặc FULL
```

### 2. Cache Keys Structure

```typescript
// Full validation result
rbac:simplified:validation:{workspaceId}:{workspaceMemberId}:{resourceType}:{action}:{recordId}

// Individual step results
rbac:step:result:{stepNumber}:{workspaceId}:{workspaceMemberId}:{resourceType}:{action}

// User context
rbac:user:context:{workspaceMemberId}

// Template permissions
rbac:template:permissions:{templateId}

// Resource metadata
rbac:resource:metadata:{resourceType}:{recordId}

// Action validation
rbac:action:validation:{action}:{resourceType}:{templateIds}
```

### 3. Cache TTL Configuration

| Cache Type | TTL | Mô Tả |
|-----------|-----|-------|
| `SIMPLIFIED_RESULT` | 10 phút | Kết quả validation 6-step |
| `STEP_RESULT` | 15 phút | Kết quả từng step riêng lẻ |
| `RESOURCE_META` | 30 phút | Metadata resource (ổn định) |
| `ACTION_CHECK` | 20 phút | Validation action |
| `USER_CONTEXT` | 2 giờ | Context user (ít thay đổi) |
| `TEMPLATE_PERMISSIONS` | 24 giờ | Template permissions (rất ổn định) |

---

## Cache Invalidation

### 1. Auto-Invalidation Events

Hệ thống tự động invalidate cache khi các sự kiện sau xảy ra:

#### 📌 **User Events**
```typescript
USER_CREATED          // Tạo user mới
USER_UPDATED          // Update user info
USER_DELETED          // Xóa user
USER_DEPARTMENT_CHANGED  // Đổi department
USER_ROLE_CHANGED     // Đổi role
```

#### 📌 **Permission Template Events**
```typescript
TEMPLATE_CREATED      // Tạo template mới
TEMPLATE_UPDATED      // Update template (HIGH PRIORITY)
TEMPLATE_DELETED      // Xóa template
TEMPLATE_ASSIGNED     // Gán template cho user (HIGH PRIORITY)
TEMPLATE_UNASSIGNED   // Gỡ template khỏi user
```

#### 📌 **Policy Events**
```typescript
POLICY_CREATED        // Tạo policy
POLICY_UPDATED        // Update policy (HIGH PRIORITY)
POLICY_DELETED        // Xóa policy
POLICY_ACTIVATED      // Kích hoạt policy
POLICY_DEACTIVATED    // Vô hiệu hóa policy
```

#### 📌 **Department Events**
```typescript
DEPARTMENT_CREATED    // Tạo department
DEPARTMENT_UPDATED    // Update department
DEPARTMENT_DELETED    // Xóa department
HIERARCHY_CHANGED     // Thay đổi phân cấp
```

#### 📌 **Resource Events**
```typescript
RESOURCE_CREATED      // Tạo resource
RESOURCE_UPDATED      // Update resource
RESOURCE_DELETED      // Xóa resource
RESOURCE_OWNERSHIP_CHANGED  // Đổi owner
```

### 2. Invalidation Priority

```typescript
enum InvalidationPriority {
  CRITICAL = 3,  // Immediate, không batch
  HIGH = 2,      // Immediate nếu SIMPLIFIED mode
  MEDIUM = 1,    // Batched
  LOW = 0,       // Batched với delay
}
```

### 3. Invalidation Patterns

Khi event xảy ra, các cache patterns sau sẽ bị invalidate:

```typescript
// Example: TEMPLATE_UPDATED
[
  'rbac:template:permissions:{templateId}*',
  'rbac:simplified:validation:*',
  'rbac:permission:result:*',
  'rbac:step:result:4:*',  // Step 4: Template Check
  'rbac:action:validation:*'
]
```

---

## Sử Dụng Trong Code

### 1. **Khi Tạo/Update Permission Template**

```typescript
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { PermissionTemplateCacheSubscriber } from '../subscribers/permission-template-cache.subscriber';

@Injectable()
export class PermissionTemplateService {
  constructor(
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly templateCacheSubscriber: PermissionTemplateCacheSubscriber,
  ) {}

  async updateTemplate(templateId: string, updates: any): Promise<void> {
    // 1. Update database
    await this.repository.update(templateId, updates);

    // 2. Invalidate cache (automatic, immediate)
    await this.templateCacheSubscriber.afterTemplateUpdate(templateId);
  }

  async assignTemplateToUser(
    workspaceMemberId: string,
    templateId: string,
  ): Promise<void> {
    // 1. Create assignment
    await this.createAssignment(workspaceMemberId, templateId);

    // 2. Invalidate both user & template cache
    await this.templateCacheSubscriber.afterTemplateAssigned(
      workspaceMemberId,
      templateId,
    );
  }
}
```

### 2. **Khi Update User Info**

```typescript
async updateUserDepartment(
  workspaceMemberId: string,
  newDepartmentId: string,
): Promise<void> {
  // 1. Update database
  await this.repository.update(workspaceMemberId, {
    departmentId: newDepartmentId,
  });

  // 2. Invalidate user cache
  await this.cacheInvalidation.invalidateUserCache(workspaceMemberId);
}
```

### 3. **Khi Update Policy**

```typescript
async updatePolicy(policyId: string, updates: any): Promise<void> {
  // 1. Update database
  await this.repository.update(policyId, updates);

  // 2. Invalidate policy cache (HIGH priority)
  await this.cacheInvalidation.invalidatePolicyCache(policyId);
}
```

### 4. **Batch Operations**

```typescript
async batchUpdateTemplates(templateIds: string[]): Promise<void> {
  // 1. Update all templates
  for (const templateId of templateIds) {
    await this.repository.update(templateId, updates);

    // Cache invalidation được batch tự động
    await this.cacheInvalidation.invalidateTemplateCache(templateId);
  }

  // 2. (Optional) Force flush để invalidate ngay lập tức
  await this.cacheInvalidation.flush();
}
```

### 5. **Manual Invalidation (Troubleshooting)**

```typescript
// Clear toàn bộ RBAC cache (chỉ dùng khi debug)
await this.cacheInvalidation.manualInvalidation();

// Force flush pending invalidations
await this.cacheInvalidation.flush();
```

---

## Performance Tuning

### 1. **Cache Hit Rate Monitoring**

```typescript
import { RbacCacheManagerService } from '../services/rbac-cache-manager.service';

const metrics = this.cacheManager.getPerformanceMetrics();

console.log({
  hitRate: metrics.hitRate,           // % cache hits
  totalRequests: metrics.totalRequests,
  avgResponseTime: metrics.avgResponseTime,
  hotKeys: metrics.hotKeys,           // Top accessed keys
});
```

### 2. **Optimization Strategies**

#### Conservative (Low TTL, ít cache)
```typescript
cacheManager.updateOptimizationStrategy(
  CacheOptimizationStrategy.CONSERVATIVE
);
// TTL: 5 phút, MaxSize: 5000
```

#### Balanced (Mặc định)
```typescript
// TTL: 30 phút, MaxSize: 10000
```

#### Aggressive (High TTL, nhiều cache)
```typescript
cacheManager.updateOptimizationStrategy(
  CacheOptimizationStrategy.AGGRESSIVE
);
// TTL: 2 giờ, MaxSize: 20000, Enable prefetch
```

#### Adaptive (Tự động điều chỉnh)
```typescript
cacheManager.updateOptimizationStrategy(
  CacheOptimizationStrategy.ADAPTIVE
);
// Điều chỉnh TTL dựa trên hit rate
```

### 3. **Cache Health Check**

```typescript
const health = this.cacheManager.getCacheHealthStatus();

if (!health.healthy) {
  console.warn('Cache issues detected:', {
    issues: health.issues,
    recommendations: health.recommendations,
  });
}

// Example output:
// {
//   healthy: false,
//   issues: ['Low cache hit rate', 'High response time'],
//   recommendations: [
//     'Consider increasing cache TTL',
//     'Check Redis server performance'
//   ]
// }
```

---

## Troubleshooting

### 1. **Cache Không Invalidate**

**Triệu chứng**: Dữ liệu cũ vẫn được trả về sau khi update

**Giải pháp**:
```typescript
// 1. Check xem invalidation có được gọi không
await this.cacheInvalidation.invalidateUserCache(workspaceMemberId);

// 2. Force flush nếu dùng batched invalidation
await this.cacheInvalidation.flush();

// 3. Manual invalidation (last resort)
await this.cacheInvalidation.manualInvalidation();
```

### 2. **Cache Hit Rate Thấp**

**Nguyên nhân**: TTL quá ngắn, cache keys không consistent

**Giải pháp**:
```typescript
// 1. Tăng TTL
cacheManager.updateOptimizationStrategy(
  CacheOptimizationStrategy.AGGRESSIVE
);

// 2. Check hot keys để tối ưu
const metrics = cacheManager.getPerformanceMetrics();
console.log('Hot keys:', metrics.hotKeys);
```

### 3. **Memory Usage Cao**

**Nguyên nhân**: Quá nhiều cache keys, không cleanup

**Giải pháp**:
```typescript
// 1. Giảm max cache size
cacheManager.updateOptimizationStrategy(
  CacheOptimizationStrategy.CONSERVATIVE
);

// 2. Invalidate cache cũ
await this.cacheInvalidation.manualInvalidation();

// 3. Giảm TTL
// Chỉnh trong constants hoặc config
```

### 4. **Stale Cache (Cache Cũ)**

**Triệu chứng**: Permissions không cập nhật ngay

**Debug**:
```typescript
// 1. Check validation mode
console.log(ENTERPRISE_RBAC_CONFIG.VALIDATION_MODE);

// 2. Force refresh cache
const context = {
  ...permissionContext,
  cacheContext: { forceRefresh: true }
};

// 3. Check TTL còn lại
// (cần implement thêm method trong cache manager)
```

---

## Best Practices

### ✅ **DO's**

1. **Luôn invalidate cache SAU KHI database operation thành công**
   ```typescript
   await this.repository.update(id, data);  // Database first
   await this.cacheInvalidation.invalidate(...);  // Then invalidate
   ```

2. **Sử dụng priority phù hợp**
   ```typescript
   // Permission changes → HIGH priority
   await this.cacheInvalidation.invalidateTemplateCache(templateId);

   // Metadata changes → LOW priority
   await this.cacheInvalidation.invalidateResourceCache(type, id);
   ```

3. **Batch operations → flush()**
   ```typescript
   for (const id of ids) {
     await this.update(id);
     await this.cacheInvalidation.invalidate(...);
   }
   await this.cacheInvalidation.flush();  // Force immediate
   ```

4. **Monitor cache performance**
   ```typescript
   const metrics = this.cacheManager.getPerformanceMetrics();
   if (metrics.hitRate < 70) {
     // Investigate and optimize
   }
   ```

### ❌ **DON'Ts**

1. **Không invalidate TRƯỚC database operation**
   ```typescript
   // ❌ Wrong
   await this.cacheInvalidation.invalidate(...);
   await this.repository.update(id, data);
   ```

2. **Không over-invalidate**
   ```typescript
   // ❌ Wrong - invalidate toàn bộ
   await this.cacheInvalidation.manualInvalidation();

   // ✅ Right - invalidate specific
   await this.cacheInvalidation.invalidateUserCache(workspaceMemberId);
   ```

3. **Không bỏ qua error handling**
   ```typescript
   try {
     await this.cacheInvalidation.invalidate(...);
   } catch (error) {
     // Log nhưng không fail main operation
     this.logger.error('Cache invalidation failed', error);
   }
   ```

4. **Không cache sensitive data quá lâu**
   ```typescript
   // Sensitive data → shorter TTL
   // Permission templates → longer TTL OK
   ```

---

## Summary

### Cache Flow (SIMPLIFIED Mode)

```
1. Request → Check cache
   ├─ HIT → Return cached result (fast ~1-5ms)
   └─ MISS → Execute 6-step validation (~50-150ms)
              ├─ Step 1: Pre-validation
              ├─ Step 2: User Context (cached 2h)
              ├─ Step 3: Resource ID (cached 30min)
              ├─ Step 4: Template Check (cached 24h)
              ├─ Step 5: Action Validation (cached 20min)
              └─ Step 6: Final Decision
              → Cache result (10min TTL)

2. Data Change → Auto invalidation
   ├─ Template updated → Invalidate template + validation cache
   ├─ User updated → Invalidate user + validation cache
   └─ Policy updated → Invalidate policy + validation cache
```

### Key Metrics

- **Target Hit Rate**: > 80%
- **Avg Response Time** (cached): < 5ms
- **Avg Response Time** (uncached): < 150ms (SIMPLIFIED), < 300ms (FULL)
- **Cache Size**: < 10,000 keys (default)
- **Invalidation Delay**: 0ms (SIMPLIFIED), 1000ms (FULL)

---

## Additional Resources

- **Source Code**: `/packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/`
- **Constants**: `constants/cache-invalidation.constants.ts`
- **Services**:
  - `services/rbac-cache-manager.service.ts`
  - `services/cache-invalidation.service.ts`
- **Examples**: `examples/cache-invalidation-usage.example.ts`
- **Subscribers**: `subscribers/permission-template-cache.subscriber.ts`
