# MKT RBAC Enterprise Grade - Refactor Plan

## Tổng quan

Tài liệu này mô tả kế hoạch refactor module `mkt-rbac-enterprise-grade` để tuân thủ chuẩn kiến trúc của dự án, dựa trên pattern từ module `mkt-promotion`.

### Mục tiêu

1. **Chuẩn hóa cấu trúc**: Tuân theo pattern chuẩn của dự án (mkt-promotion làm reference)
2. **Tách biệt concerns**: Domain/Application/Infrastructure layers rõ ràng
3. **Tăng maintainability**: Dễ bảo trì, mở rộng và test
4. **Consistency**: Đồng nhất với các modules khác trong mkt-core

### Reference Module

Module `mkt-promotion` được sử dụng làm reference vì:
- Cấu trúc chuẩn với phân tách layers rõ ràng
- Sử dụng đầy đủ các best practices (Zod config, centralized messages, hooks, jobs)
- Documentation đầy đủ

---

## Redis Infrastructure

Module sử dụng **Redis Infrastructure** đã được thiết lập sẵn tại:
```
packages/twenty-server/src/mkt-core/infrastructure/redis/
```

**Services có sẵn**:
- `RedisCacheService` - Two-tier caching với LRU fallback
- `RedisLockService` - Distributed locking
- `RedisInvalidationService` - Tag-based cache invalidation
- `RedisCircuitBreakerService` - Circuit breaker pattern
- `RedisRateLimiterService` - Rate limiting

**Constants có sẵn**:
- `CACHE_TTL` - Centralized TTL configuration (SHORT, MEDIUM, LONG, VERY_LONG, DAY)
- Cache key prefixes - Centralized cache key management (⚠️ RBAC prefix chưa có)
- Cache tags - Tag-based invalidation

**Utils có sẵn**:
- `CacheKeyBuilder` - Build cache keys
- `CacheTagBuilder` - Build cache tags
- `CacheTTLGetter` - Get TTL for cache key
- `CacheTTLJitter` - Add jitter to TTL

**⚠️ QUAN TRỌNG**:
- **KHÔNG tự implement** Redis cache services
- **SỬ DỤNG** `RedisInfrastructureModule` và các services đã có
- **THÊM** cache key prefixes vào `/mkt-core/infrastructure/redis/constants/cache-keys.constant.ts`
- **THÊM** TTL config vào `/mkt-core/infrastructure/redis/constants/cache-ttl.constant.ts`

---

## So sánh cấu trúc

### Cấu trúc hiện tại (mkt-rbac-enterprise-grade)

```
mkt-rbac-enterprise-grade/
├── constants/                       # ✅ CÓ - Nhưng cần tổ chức lại
│   ├── cache-invalidation.constants.ts
│   ├── enterprise-rbac.constants.ts
│   ├── hierarchy.constants.ts
│   ├── index.ts                    # ✅ Có index exports
│   ├── messages.ts                 # ⚠️ Có nhưng không dùng createModuleMessages
│   ├── policy.constants.ts
│   └── rbac-cache.constants.ts
├── decorators/                      # ✅ CÓ
│   └── permission.decorator.ts
├── guards/                          # ✅ CÓ
│   └── enterprise-rbac.guard.ts
├── helpers/                         # ⚠️ CÓ - Empty folder
├── interceptors/                    # ✅ CÓ
│   └── audit-logging.interceptor.ts
├── interfaces/                      # ⚠️ Nên merge vào types/
│   └── validation-step.interface.ts
├── services/                        # ⚠️ CHƯA CHUẨN - Thiếu phân chia layers
│   ├── step1-pre-validation.service.ts
│   ├── step2-user-context-resolution.service.ts
│   ├── step3-resource-identification.service.ts
│   ├── step4-permission-template-check.service.ts
│   ├── step5-action-permission-validation.service.ts
│   ├── step6-resource-permission-check.service.ts
│   ├── step7-hierarchy-validation.service.ts
│   ├── step8-data-access-policy-check.service.ts
│   ├── step9-special-permissions.service.ts
│   ├── step10-sensitive-data-checks.service.ts
│   ├── step11-department-restrictions.service.ts
│   ├── step12-dynamic-conditions.service.ts
│   ├── step13-cache-performance.service.ts
│   ├── step14-audit-logging.service.ts
│   ├── step15-final-decision.service.ts
│   ├── cache-invalidation.service.ts
│   ├── hierarchy-level.service.ts
│   ├── rbac-cache-manager.service.ts
│   └── validation-orchestrator.service.ts
├── subscribers/                     # ✅ CÓ
│   └── permission-template-cache.subscriber.ts
├── types/                           # ✅ CÓ với index.ts
│   ├── index.ts
│   ├── audit.types.ts
│   ├── enhanced-permission-context.type.ts
│   ├── hierarchy-context.type.ts
│   ├── hierarchy.types.ts
│   ├── policy-context.type.ts
│   ├── policy.types.ts
│   ├── resource-identification.types.ts
│   ├── service.types.ts
│   └── validation-step.types.ts
├── utils/                           # ⚠️ CÓ - Empty folder
├── validators/                      # ⚠️ CÓ - Empty folder
├── workspace-entities/              # ✅ CÓ - 13 entities (QUAN TRỌNG!)
│   ├── constants/
│   │   ├── index.ts
│   │   ├── permission-audit-options.constants.ts
│   │   ├── rbac-v2-options.constants.ts
│   │   └── temporary-permission-options.constants.ts
│   ├── index.ts
│   ├── mkt-data-access-policy.workspace-entity.ts
│   ├── mkt-permission-action.workspace-entity.ts
│   ├── mkt-permission-audit.workspace-entity.ts
│   ├── mkt-permission-context.workspace-entity.ts
│   ├── mkt-permission-priority-config.workspace-entity.ts
│   ├── mkt-permission-resource.workspace-entity.ts
│   ├── mkt-permission-template.workspace-entity.ts
│   ├── mkt-template-access-limitation.workspace-entity.ts
│   ├── mkt-template-resource-permission.workspace-entity.ts
│   ├── mkt-template-system-action.workspace-entity.ts
│   ├── mkt-temporary-permission.workspace-entity.ts
│   ├── mkt-user-permission-override.workspace-entity.ts
│   └── mkt-user-permission-template.workspace-entity.ts
└── mkt-rbac-enterprise-grade.module.ts

❌ THIẾU (cần tạo mới):
├── errors/                          # Custom error classes
├── dto/                             # GraphQL inputs/outputs
│   ├── inputs/
│   └── outputs/
├── configs/                         # Zod-validated configuration
├── message/                         # Centralized messages (thay thế constants/messages.ts)
├── events/                          # Event definitions
├── listeners/                       # Event listeners
├── hooks/                           # Pre/Post query hooks cho workspace entities
├── repositories/                    # Data access layer cho 13 workspace entities
├── jobs/                            # Background jobs
└── resolvers/                       # GraphQL resolvers
```

### Cấu trúc mới (theo chuẩn mkt-promotion)

```
mkt-rbac-enterprise-grade/
├── errors/                          # 🆕 TẠO MỚI - Custom error classes
│   ├── index.ts
│   └── rbac.errors.ts
├── constants/                       # ♻️ REFACTOR - Giữ structure, thêm index exports
│   ├── index.ts                    # ✅ Đã có - Cần thêm export messages
│   ├── cache-invalidation.constants.ts
│   ├── enterprise-rbac.constants.ts
│   ├── hierarchy.constants.ts
│   ├── messages.ts                 # ♻️ Giữ nguyên hoặc migrate sang message/
│   ├── policy.constants.ts
│   └── rbac-cache.constants.ts
├── dto/                            # 🆕 TẠO MỚI - GraphQL DTOs
│   ├── index.ts
│   ├── inputs/
│   │   ├── index.ts
│   │   ├── check-permission.input.ts
│   │   ├── validate-action.input.ts
│   │   └── query-audit-log.input.ts
│   └── outputs/
│       ├── index.ts
│       ├── permission-result.output.ts
│       ├── validation-result.output.ts
│       └── paginated-audit-log.output.ts
├── configs/                        # 🆕 TẠO MỚI - Zod-validated configuration
│   ├── index.ts
│   └── mkt-rbac.config.ts
├── message/                        # 🆕 TẠO MỚI - Centralized messages
│   └── index.ts                    # Dùng createModuleMessages pattern
├── events/                         # 🆕 TẠO MỚI - Event definitions
│   ├── index.ts
│   └── rbac.events.ts
├── listeners/                      # 🆕 TẠO MỚI - Event listeners
│   ├── index.ts
│   ├── permission-template.listener.ts
│   └── user-role.listener.ts
├── hooks/                          # 🆕 TẠO MỚI - Query hooks cho 13 entities
│   ├── index.ts
│   ├── permission-template-pre-query.hook.ts
│   ├── permission-template-post-query.hook.ts
│   ├── permission-audit-pre-query.hook.ts
│   └── ...
├── repositories/                   # 🆕 TẠO MỚI - Data access layer cho 13 entities
│   ├── index.ts
│   ├── mkt-permission-template.repository.ts
│   ├── mkt-permission-audit.repository.ts
│   ├── mkt-data-access-policy.repository.ts
│   ├── mkt-permission-action.repository.ts
│   ├── mkt-permission-resource.repository.ts
│   ├── mkt-user-permission-template.repository.ts
│   ├── mkt-user-permission-override.repository.ts
│   ├── mkt-template-resource-permission.repository.ts
│   ├── mkt-template-system-action.repository.ts
│   ├── mkt-template-access-limitation.repository.ts
│   ├── mkt-permission-context.repository.ts
│   ├── mkt-permission-priority-config.repository.ts
│   └── mkt-temporary-permission.repository.ts
├── jobs/                           # 🆕 TẠO MỚI - Background jobs
│   ├── index.ts
│   ├── cache-warmup.job.ts
│   ├── audit-log-cleanup.job.ts
│   ├── temporary-permission-cleanup.job.ts
│   └── permission-sync.job.ts
├── resolvers/                      # 🆕 TẠO MỚI - GraphQL resolvers
│   ├── index.ts
│   ├── permission.resolver.ts
│   ├── permission-template.resolver.ts
│   └── audit-log.resolver.ts
├── helpers/                        # ♻️ POPULATE - Hiện đang empty
│   ├── index.ts
│   └── permission.helper.ts
├── utils/                          # ♻️ POPULATE - Hiện đang empty
│   ├── index.ts
│   ├── permission-mapper.utils.ts
│   └── policy-evaluator.utils.ts
├── validators/                     # ♻️ POPULATE - Hiện đang empty
│   ├── index.ts
│   └── permission-input.validator.ts
├── types/                          # ♻️ REFACTOR - Merge interfaces/
│   ├── index.ts                    # ✅ Đã có
│   ├── audit.types.ts
│   ├── enhanced-permission-context.type.ts
│   ├── hierarchy-context.type.ts
│   ├── hierarchy.types.ts
│   ├── policy-context.type.ts
│   ├── policy.types.ts
│   ├── resource-identification.types.ts
│   ├── service.types.ts
│   ├── validation-step.types.ts
│   └── validation-step.interface.ts # 🔀 MERGE từ interfaces/
├── services/                       # ♻️ REFACTOR - Phân chia layers
│   ├── index.ts
│   ├── domain/                     # Business logic
│   │   ├── index.ts
│   │   ├── permission-validation.service.ts
│   │   ├── policy-evaluation.service.ts
│   │   ├── hierarchy-resolution.service.ts
│   │   └── rule-engine.service.ts
│   ├── application/                # Orchestration
│   │   ├── index.ts
│   │   ├── validation-orchestrator.service.ts # 🔀 Di chuyển từ root services/
│   │   ├── permission-check.service.ts
│   │   └── audit-application.service.ts
│   └── infrastructure/             # Infrastructure (Wrapper cho Redis)
│       ├── index.ts
│       └── rbac-cache.service.ts   # 🆕 Wrapper cho RedisCacheService
├── validation-steps/               # ♻️ REFACTOR - Tách riêng từ services/
│   ├── index.ts
│   ├── step01-pre-validation.service.ts
│   ├── step02-user-context-resolution.service.ts
│   ├── step03-resource-identification.service.ts
│   ├── step04-permission-template-check.service.ts
│   ├── step05-action-permission-validation.service.ts
│   ├── step06-resource-permission-check.service.ts
│   ├── step07-hierarchy-validation.service.ts
│   ├── step08-data-access-policy-check.service.ts
│   ├── step09-special-permissions.service.ts
│   ├── step10-sensitive-data-checks.service.ts
│   ├── step11-department-restrictions.service.ts
│   ├── step12-dynamic-conditions.service.ts
│   ├── step13-cache-performance.service.ts
│   ├── step14-audit-logging.service.ts
│   └── step15-final-decision.service.ts
├── workspace-entities/             # ✅ ĐÃ CÓ - 13 entities (GIỮ NGUYÊN)
│   ├── constants/                  # ✅ ĐÃ CÓ
│   │   ├── index.ts
│   │   ├── permission-audit-options.constants.ts
│   │   ├── rbac-v2-options.constants.ts
│   │   └── temporary-permission-options.constants.ts
│   ├── index.ts                    # ✅ ĐÃ CÓ
│   ├── mkt-data-access-policy.workspace-entity.ts
│   ├── mkt-permission-action.workspace-entity.ts
│   ├── mkt-permission-audit.workspace-entity.ts
│   ├── mkt-permission-context.workspace-entity.ts
│   ├── mkt-permission-priority-config.workspace-entity.ts
│   ├── mkt-permission-resource.workspace-entity.ts
│   ├── mkt-permission-template.workspace-entity.ts
│   ├── mkt-template-access-limitation.workspace-entity.ts
│   ├── mkt-template-resource-permission.workspace-entity.ts
│   ├── mkt-template-system-action.workspace-entity.ts
│   ├── mkt-temporary-permission.workspace-entity.ts
│   ├── mkt-user-permission-override.workspace-entity.ts
│   └── mkt-user-permission-template.workspace-entity.ts
├── decorators/                     # ✅ GIỮ NGUYÊN
│   └── permission.decorator.ts
├── guards/                         # ✅ GIỮ NGUYÊN
│   └── enterprise-rbac.guard.ts
├── interceptors/                   # ✅ GIỮ NGUYÊN
│   └── audit-logging.interceptor.ts
├── interfaces/                     # ❌ XÓA - Merge vào types/
│   └── validation-step.interface.ts
├── subscribers/                    # ✅ GIỮ NGUYÊN
│   └── permission-template-cache.subscriber.ts
└── mkt-rbac-enterprise-grade.module.ts # ♻️ UPDATE - Cập nhật imports

Legend:
🆕 = Tạo mới
♻️ = Refactor/Di chuyển
🔀 = Merge/Move
✅ = Giữ nguyên
❌ = Xóa
```

---

## Chi tiết Refactor

### 1. errors/ - Custom Error Classes

**Tạo mới**: `errors/rbac.errors.ts`

```typescript
import { CustomException } from 'src/mkt-core/common/exceptions/custom.exception';

// Permission errors
export class PermissionDeniedError extends CustomException {
  constructor(action: string, resource: string) {
    super(`Permission denied for action "${action}" on resource "${resource}"`);
  }
}

export class PermissionTemplateNotFoundError extends CustomException {
  constructor(templateId: string) {
    super(`Permission template not found: ${templateId}`);
  }
}

export class InvalidPermissionContextError extends CustomException {
  constructor(message: string) {
    super(`Invalid permission context: ${message}`);
  }
}

// Hierarchy errors
export class HierarchyValidationError extends CustomException {
  constructor(message: string) {
    super(`Hierarchy validation failed: ${message}`);
  }
}

// Policy errors
export class PolicyEvaluationError extends CustomException {
  constructor(policyId: string, reason: string) {
    super(`Policy evaluation failed for ${policyId}: ${reason}`);
  }
}

export class InvalidPolicyConditionError extends CustomException {
  constructor(condition: string) {
    super(`Invalid policy condition: ${condition}`);
  }
}

// Validation errors
export class ValidationStepError extends CustomException {
  constructor(stepNumber: number, stepName: string, reason: string) {
    super(`Step ${stepNumber} (${stepName}) failed: ${reason}`);
  }
}

// Cache errors
export class CacheOperationError extends CustomException {
  constructor(operation: string, key: string) {
    super(`Cache operation "${operation}" failed for key: ${key}`);
  }
}
```

**Tạo mới**: `errors/index.ts`

```typescript
export * from './rbac.errors';
```

---

### 2. constants/ - Reorganize

**Refactor**: Tổ chức lại constants theo pattern chuẩn

**File**: `constants/mkt-rbac.constants.ts`

```typescript
// Di chuyển các constants chính từ enterprise-rbac.constants.ts
export const VALIDATION_STEPS = { ... } as const;
export const PERMISSION_SOURCE = { ... } as const;
export const CHECK_RESULT = { ... } as const;
// ... các constants khác
```

**File**: `constants/mkt-rbac-cache.constants.ts`

```typescript
/**
 * RBAC Cache Constants
 *
 * ⚠️ QUAN TRỌNG:
 * - Cache key prefixes và TTL phải được thêm vào infrastructure Redis
 * - File: /mkt-core/infrastructure/redis/constants/cache-keys.constant.ts
 * - File: /mkt-core/infrastructure/redis/constants/cache-ttl.constant.ts
 */

// Re-export từ infrastructure
export { CACHE_TTL } from 'src/mkt-core/infrastructure/redis';

/**
 * RBAC Cache Key Builders
 *
 * Sử dụng prefix đã define trong infrastructure:
 * - RBAC_CACHE_PREFIX.PERMISSION_TEMPLATE = 'mkt:rbac:permission-template'
 * - RBAC_CACHE_PREFIX.USER_PERMISSIONS = 'mkt:rbac:user-permissions'
 * - RBAC_CACHE_PREFIX.POLICY = 'mkt:rbac:policy'
 * - RBAC_CACHE_PREFIX.HIERARCHY = 'mkt:rbac:hierarchy'
 * - RBAC_CACHE_PREFIX.VALIDATION = 'mkt:rbac:validation'
 */
export const RBAC_CACHE_KEYS = {
  permissionTemplate: (templateId: string) => `mkt:rbac:permission-template:${templateId}`,
  userPermissions: (userId: string) => `mkt:rbac:user-permissions:${userId}`,
  policy: (policyId: string) => `mkt:rbac:policy:${policyId}`,
  hierarchy: (userId: string) => `mkt:rbac:hierarchy:${userId}`,
  validationResult: (userId: string, action: string, resource: string) =>
    `mkt:rbac:validation:${userId}:${action}:${resource}`,
  auditLog: (logId: string) => `mkt:rbac:audit-log:${logId}`,
} as const;

/**
 * RBAC Cache Tags for invalidation
 */
export const RBAC_CACHE_TAGS = {
  PERMISSION_TEMPLATE: 'rbac:permission-template',
  USER: 'rbac:user',
  POLICY: 'rbac:policy',
  HIERARCHY: 'rbac:hierarchy',
  VALIDATION: 'rbac:validation',
} as const;
```

**⚠️ Action Required**: Thêm vào `/mkt-core/infrastructure/redis/constants/cache-keys.constant.ts`:

```typescript
// ============================================
// RBAC DOMAIN
// ============================================

export const RBAC_CACHE_PREFIX = {
  /** Permission template: mkt:rbac:permission-template:{templateId} */
  PERMISSION_TEMPLATE: 'mkt:rbac:permission-template',

  /** User permissions: mkt:rbac:user-permissions:{userId} */
  USER_PERMISSIONS: 'mkt:rbac:user-permissions',

  /** Policy: mkt:rbac:policy:{policyId} */
  POLICY: 'mkt:rbac:policy',

  /** Hierarchy: mkt:rbac:hierarchy:{userId} */
  HIERARCHY: 'mkt:rbac:hierarchy',

  /** Validation result: mkt:rbac:validation:{userId}:{action}:{resource} */
  VALIDATION: 'mkt:rbac:validation',

  /** Audit log: mkt:rbac:audit-log:{logId} */
  AUDIT_LOG: 'mkt:rbac:audit-log',
} as const;
```

**⚠️ Action Required**: Thêm vào `/mkt-core/infrastructure/redis/constants/cache-ttl.constant.ts`:

```typescript
  // ============================================
  // RBAC DOMAIN
  // ============================================
  [RBAC_CACHE_PREFIX.PERMISSION_TEMPLATE]: CACHE_TTL.VERY_LONG, // 1 hour - Permission templates
  [RBAC_CACHE_PREFIX.USER_PERMISSIONS]: CACHE_TTL.LONG,         // 30 min - User permissions
  [RBAC_CACHE_PREFIX.POLICY]: CACHE_TTL.VERY_LONG,              // 1 hour - Policies
  [RBAC_CACHE_PREFIX.HIERARCHY]: CACHE_TTL.VERY_LONG,           // 1 hour - Hierarchy (stable)
  [RBAC_CACHE_PREFIX.VALIDATION]: CACHE_TTL.SHORT,              // 5 min - Validation results
  [RBAC_CACHE_PREFIX.AUDIT_LOG]: CACHE_TTL.DAY,                 // 24 hours - Audit logs
```

**File**: `constants/mkt-rbac-log.constants.ts`

```typescript
// Log contexts
export const RBAC_LOG_CONTEXT = 'MktRbac';
export const VALIDATION_LOG_CONTEXT = 'MktRbacValidation';
export const POLICY_LOG_CONTEXT = 'MktRbacPolicy';
export const HIERARCHY_LOG_CONTEXT = 'MktRbacHierarchy';
export const AUDIT_LOG_CONTEXT = 'MktRbacAudit';
```

**File**: `constants/index.ts`

```typescript
// Export all constants
export * from './mkt-rbac.constants';
export * from './mkt-rbac-cache.constants';
export * from './mkt-rbac-log.constants';
export * from './mkt-rbac-policy.constants';
// Field IDs và Relation IDs (nếu có workspace entities)
// export * from './mkt-rbac-field-ids';
// export * from './mkt-rbac-relation-ids';
```

---

### 3. configs/ - Zod-validated Configuration

**Tạo mới**: `configs/mkt-rbac.config.ts`

```typescript
import { z } from 'zod';
import { CACHE_TTL } from 'src/mkt-core/infrastructure/redis/constants';

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_CACHE_TTL_SECONDS = CACHE_TTL.MEDIUM; // 15 minutes
const DEFAULT_ENABLE_15_STEP_VALIDATION = true;
const DEFAULT_ENABLE_HIERARCHY_VALIDATION = true;
const DEFAULT_ENABLE_POLICY_ENGINE = true;
const DEFAULT_ENABLE_AUDIT_LOGGING = true;
const DEFAULT_ENABLE_CACHING = true;
const DEFAULT_MAX_VALIDATION_STEPS = 15;
const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 90;
const DEFAULT_CACHE_WARMUP_CRON = '0 0 * * * *'; // Every hour

// ============================================
// ZOD SCHEMAS
// ============================================

const booleanEnvSchema = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? defaultValue : val === 'true'));

const positiveIntEnvSchema = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : defaultValue))
    .refine((val) => val > 0, { message: 'Must be a positive integer' });

const cronEnvSchema = (defaultValue: string) =>
  z
    .string()
    .optional()
    .transform((val) => val ?? defaultValue);

/**
 * MKT RBAC Configuration Schema
 *
 * Environment variables:
 * - RBAC_CACHE_TTL_SECONDS: Cache TTL in seconds (default: 900 - 15 minutes)
 * - RBAC_ENABLE_15_STEP_VALIDATION: Enable 15-step validation (default: true)
 * - RBAC_ENABLE_HIERARCHY_VALIDATION: Enable hierarchy validation (default: true)
 * - RBAC_ENABLE_POLICY_ENGINE: Enable policy engine (default: true)
 * - RBAC_ENABLE_AUDIT_LOGGING: Enable audit logging (default: true)
 * - RBAC_ENABLE_CACHING: Enable caching (default: true)
 * - RBAC_MAX_VALIDATION_STEPS: Maximum validation steps (default: 15)
 * - RBAC_AUDIT_LOG_RETENTION_DAYS: Audit log retention days (default: 90)
 * - RBAC_CACHE_WARMUP_CRON: Cache warmup cron expression (default: every hour)
 */
const rbacConfigSchema = z.object({
  RBAC_CACHE_TTL_SECONDS: positiveIntEnvSchema(DEFAULT_CACHE_TTL_SECONDS),
  RBAC_ENABLE_15_STEP_VALIDATION: booleanEnvSchema(DEFAULT_ENABLE_15_STEP_VALIDATION),
  RBAC_ENABLE_HIERARCHY_VALIDATION: booleanEnvSchema(DEFAULT_ENABLE_HIERARCHY_VALIDATION),
  RBAC_ENABLE_POLICY_ENGINE: booleanEnvSchema(DEFAULT_ENABLE_POLICY_ENGINE),
  RBAC_ENABLE_AUDIT_LOGGING: booleanEnvSchema(DEFAULT_ENABLE_AUDIT_LOGGING),
  RBAC_ENABLE_CACHING: booleanEnvSchema(DEFAULT_ENABLE_CACHING),
  RBAC_MAX_VALIDATION_STEPS: positiveIntEnvSchema(DEFAULT_MAX_VALIDATION_STEPS),
  RBAC_AUDIT_LOG_RETENTION_DAYS: positiveIntEnvSchema(DEFAULT_AUDIT_LOG_RETENTION_DAYS),
  RBAC_CACHE_WARMUP_CRON: cronEnvSchema(DEFAULT_CACHE_WARMUP_CRON),
});

// ============================================
// PARSE & VALIDATE
// ============================================

const parsedEnv = rbacConfigSchema.safeParse({
  RBAC_CACHE_TTL_SECONDS: process.env.RBAC_CACHE_TTL_SECONDS,
  RBAC_ENABLE_15_STEP_VALIDATION: process.env.RBAC_ENABLE_15_STEP_VALIDATION,
  RBAC_ENABLE_HIERARCHY_VALIDATION: process.env.RBAC_ENABLE_HIERARCHY_VALIDATION,
  RBAC_ENABLE_POLICY_ENGINE: process.env.RBAC_ENABLE_POLICY_ENGINE,
  RBAC_ENABLE_AUDIT_LOGGING: process.env.RBAC_ENABLE_AUDIT_LOGGING,
  RBAC_ENABLE_CACHING: process.env.RBAC_ENABLE_CACHING,
  RBAC_MAX_VALIDATION_STEPS: process.env.RBAC_MAX_VALIDATION_STEPS,
  RBAC_AUDIT_LOG_RETENTION_DAYS: process.env.RBAC_AUDIT_LOG_RETENTION_DAYS,
  RBAC_CACHE_WARMUP_CRON: process.env.RBAC_CACHE_WARMUP_CRON,
});

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error(
    '[MktRbacConfig] Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors,
  );
}

const validatedEnv = parsedEnv.success
  ? parsedEnv.data
  : rbacConfigSchema.parse({}); // Fallback to defaults

// ============================================
// RBAC CONFIGURATION
// ============================================

export const MKT_RBAC_CONFIG = {
  /** Cache TTL in seconds (default: 15 minutes) */
  CACHE_TTL_SECONDS: validatedEnv.RBAC_CACHE_TTL_SECONDS,

  /** Enable 15-step validation */
  ENABLE_15_STEP_VALIDATION: validatedEnv.RBAC_ENABLE_15_STEP_VALIDATION,

  /** Enable hierarchy validation */
  ENABLE_HIERARCHY_VALIDATION: validatedEnv.RBAC_ENABLE_HIERARCHY_VALIDATION,

  /** Enable policy engine */
  ENABLE_POLICY_ENGINE: validatedEnv.RBAC_ENABLE_POLICY_ENGINE,

  /** Enable audit logging */
  ENABLE_AUDIT_LOGGING: validatedEnv.RBAC_ENABLE_AUDIT_LOGGING,

  /** Enable caching */
  ENABLE_CACHING: validatedEnv.RBAC_ENABLE_CACHING,

  /** Maximum validation steps */
  MAX_VALIDATION_STEPS: validatedEnv.RBAC_MAX_VALIDATION_STEPS,

  /** Audit log retention days */
  AUDIT_LOG_RETENTION_DAYS: validatedEnv.RBAC_AUDIT_LOG_RETENTION_DAYS,

  /** Cache warmup cron expression */
  CACHE_WARMUP_CRON: validatedEnv.RBAC_CACHE_WARMUP_CRON,
} as const;

export type MktRbacConfigType = typeof MKT_RBAC_CONFIG;
```

**Tạo mới**: `configs/index.ts`

```typescript
export * from './mkt-rbac.config';
```

---

### 4. message/ - Centralized Messages

**Tạo mới**: `message/index.ts`

```typescript
import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// PERMISSION MESSAGES
// ============================================

export const PERMISSION_MESSAGES = createModuleMessages({
  entityName: 'Permission',
  entityNamePlural: 'Permissions',
  customSuccess: {
    PERMISSION_GRANTED: 'Permission granted',
    PERMISSION_CHECKED: 'Permission checked successfully',
    TEMPLATE_LOADED: 'Permission template loaded successfully',
    CACHE_HIT: 'Permission cache hit',
  },
  customError: {
    PERMISSION_DENIED: 'Permission denied',
    TEMPLATE_NOT_FOUND: 'Permission template not found',
    INVALID_CONTEXT: 'Invalid permission context',
    VALIDATION_FAILED: 'Permission validation failed',
    CACHE_MISS: 'Permission cache miss',
  },
  customOperation: {
    CHECK_PERMISSION: 'Checking permission',
    LOAD_TEMPLATE: 'Loading permission template',
    VALIDATE_ACTION: 'Validating action permission',
    EVALUATE_POLICY: 'Evaluating permission policy',
  },
});

// ============================================
// VALIDATION MESSAGES
// ============================================

export const VALIDATION_MESSAGES = createModuleMessages({
  entityName: 'Validation',
  entityNamePlural: 'Validations',
  customSuccess: {
    VALIDATION_PASSED: 'Validation passed',
    STEP_COMPLETED: 'Validation step completed',
    ALL_STEPS_COMPLETED: 'All validation steps completed',
  },
  customError: {
    VALIDATION_FAILED: 'Validation failed',
    STEP_FAILED: 'Validation step failed',
    PRE_VALIDATION_FAILED: 'Pre-validation failed',
  },
  customOperation: {
    EXECUTE_VALIDATION: 'Executing validation',
    RUN_STEP: 'Running validation step',
    ORCHESTRATE: 'Orchestrating validation steps',
  },
});

// ============================================
// POLICY MESSAGES
// ============================================

export const POLICY_MESSAGES = createModuleMessages({
  entityName: 'Policy',
  entityNamePlural: 'Policies',
  customSuccess: {
    POLICY_EVALUATED: 'Policy evaluated successfully',
    POLICY_MATCHED: 'Policy matched',
    CONDITION_MET: 'Policy condition met',
  },
  customError: {
    POLICY_NOT_FOUND: 'Policy not found',
    POLICY_EVALUATION_FAILED: 'Policy evaluation failed',
    INVALID_CONDITION: 'Invalid policy condition',
    CONDITION_NOT_MET: 'Policy condition not met',
  },
  customOperation: {
    EVALUATE_POLICY: 'Evaluating policy',
    CHECK_CONDITION: 'Checking policy condition',
    APPLY_POLICY: 'Applying policy',
  },
});

// ============================================
// HIERARCHY MESSAGES
// ============================================

export const HIERARCHY_MESSAGES = createModuleMessages({
  entityName: 'Hierarchy',
  entityNamePlural: 'Hierarchies',
  customSuccess: {
    HIERARCHY_RESOLVED: 'Hierarchy resolved successfully',
    LEVEL_DETERMINED: 'Hierarchy level determined',
  },
  customError: {
    HIERARCHY_NOT_FOUND: 'Hierarchy not found',
    INVALID_HIERARCHY: 'Invalid hierarchy structure',
    LEVEL_MISMATCH: 'Hierarchy level mismatch',
  },
  customOperation: {
    RESOLVE_HIERARCHY: 'Resolving hierarchy',
    CHECK_LEVEL: 'Checking hierarchy level',
    VALIDATE_HIERARCHY: 'Validating hierarchy',
  },
});

// ============================================
// AUDIT MESSAGES
// ============================================

export const AUDIT_MESSAGES = createModuleMessages({
  entityName: 'Audit log',
  entityNamePlural: 'Audit logs',
  customSuccess: {
    LOG_RECORDED: 'Audit log recorded successfully',
    LOG_RETRIEVED: 'Audit log retrieved successfully',
  },
  customError: {
    LOG_NOT_FOUND: 'Audit log not found',
    LOG_RECORDING_FAILED: 'Audit log recording failed',
  },
  customOperation: {
    RECORD_LOG: 'Recording audit log',
    QUERY_LOGS: 'Querying audit logs',
    CLEANUP_LOGS: 'Cleaning up audit logs',
  },
});

// ============================================
// CACHE MESSAGES
// ============================================

export const RBAC_CACHE_MESSAGES = createModuleMessages({
  entityName: 'RBAC cache',
  customSuccess: {
    CACHE_HIT: 'RBAC cache hit',
    CACHE_SET: 'RBAC cache set successfully',
    CACHE_INVALIDATED: 'RBAC cache invalidated successfully',
    CACHE_WARMED: 'RBAC cache warmed up successfully',
  },
  customError: {
    CACHE_OPERATION_FAILED: 'RBAC cache operation failed',
  },
  customInfo: {
    CACHE_MISS: 'RBAC cache miss',
  },
});

// ============================================
// GRAPHQL DESCRIPTIONS
// ============================================

export const RBAC_GRAPHQL_DESCRIPTIONS = {
  // Queries
  CHECK_PERMISSION_QUERY: 'Check if user has permission for action on resource',
  GET_USER_PERMISSIONS_QUERY: 'Get all permissions for user',
  GET_PERMISSION_TEMPLATE_QUERY: 'Get permission template by ID',
  GET_AUDIT_LOGS_QUERY: 'Get paginated audit logs',

  // Mutations
  GRANT_PERMISSION_MUTATION: 'Grant permission to user',
  REVOKE_PERMISSION_MUTATION: 'Revoke permission from user',
  UPDATE_PERMISSION_TEMPLATE_MUTATION: 'Update permission template',
  CLEAR_PERMISSION_CACHE_MUTATION: 'Clear permission cache',
} as const;
```

---

### 5. dto/ - GraphQL Input/Output Types

**Tạo mới**: `dto/inputs/check-permission.input.ts`

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

@InputType()
export class CheckPermissionInput {
  @Field(() => String, { description: 'User ID to check permission for' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @Field(() => String, { description: 'Action to perform (e.g., "read", "write", "delete")' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @Field(() => String, { description: 'Resource type (e.g., "order", "customer")' })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @Field(() => String, { nullable: true, description: 'Resource ID (optional)' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @Field(() => Object, { nullable: true, description: 'Additional context (optional)' })
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}
```

**Tạo mới**: `dto/outputs/permission-result.output.ts`

```typescript
import { Field, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class PermissionResultOutput {
  @Field(() => Boolean, { description: 'Whether permission is granted' })
  granted: boolean;

  @Field(() => String, { description: 'Permission source (ROLE, TEMPLATE, POLICY, etc.)' })
  source: string;

  @Field(() => String, { nullable: true, description: 'Reason for decision' })
  reason?: string;

  @Field(() => [String], { nullable: true, description: 'Required permissions' })
  requiredPermissions?: string[];

  @Field(() => GraphQLJSON, { nullable: true, description: 'Additional metadata' })
  metadata?: Record<string, unknown>;
}
```

**Tạo mới**: `dto/outputs/validation-result.output.ts`

```typescript
import { Field, ObjectType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class ValidationStepResultOutput {
  @Field(() => Int, { description: 'Step number' })
  stepNumber: number;

  @Field(() => String, { description: 'Step name' })
  stepName: string;

  @Field(() => Boolean, { description: 'Whether step passed' })
  passed: boolean;

  @Field(() => String, { nullable: true, description: 'Failure reason' })
  reason?: string;

  @Field(() => Int, { nullable: true, description: 'Execution time in ms' })
  executionTimeMs?: number;
}

@ObjectType()
export class ValidationResultOutput {
  @Field(() => Boolean, { description: 'Whether all validations passed' })
  success: boolean;

  @Field(() => [ValidationStepResultOutput], { description: 'Individual step results' })
  steps: ValidationStepResultOutput[];

  @Field(() => Int, { description: 'Total execution time in ms' })
  totalExecutionTimeMs: number;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Additional metadata' })
  metadata?: Record<string, unknown>;
}
```

---

### 6. services/ - Phân chia Layers

**Cấu trúc mới**:

```
services/
├── domain/                              # Business logic
│   ├── permission-validation.service.ts
│   ├── policy-evaluation.service.ts
│   ├── hierarchy-resolution.service.ts
│   └── rule-engine.service.ts
├── application/                         # Orchestration
│   ├── validation-orchestrator.service.ts
│   ├── permission-check.service.ts
│   └── audit-application.service.ts
└── infrastructure/                      # Infrastructure (WRAPPER cho Redis Infrastructure)
    └── rbac-cache.service.ts            # Wrapper service cho RedisCacheService
```

**⚠️ QUAN TRỌNG - Redis Infrastructure**:

**KHÔNG TỰ IMPLEMENT** cache services. Thay vào đó:

1. **Import RedisInfrastructureModule** vào module:
   ```typescript
   import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis';
   ```

2. **Inject các services có sẵn**:
   ```typescript
   constructor(
     private readonly redisCacheService: RedisCacheService,
     private readonly redisLockService: RedisLockService,
     private readonly redisInvalidationService: RedisInvalidationService,
   ) {}
   ```

3. **Tạo wrapper service** (nếu cần domain-specific logic):

**File**: `services/infrastructure/rbac-cache.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService, RedisInvalidationService } from 'src/mkt-core/infrastructure/redis';
import { RBAC_CACHE_KEYS, RBAC_CACHE_TAGS } from '../../constants';
import { RBAC_LOG_CONTEXT } from '../../constants';

/**
 * RBAC Cache Service
 *
 * Wrapper cho RedisCacheService với RBAC-specific logic
 */
@Injectable()
export class RbacCacheService {
  private readonly logger = new Logger(RBAC_LOG_CONTEXT);

  constructor(
    private readonly redisCacheService: RedisCacheService,
    private readonly invalidationService: RedisInvalidationService,
  ) {}

  // ============================================
  // PERMISSION TEMPLATE CACHE
  // ============================================

  async getPermissionTemplate<T>(templateId: string): Promise<T | null> {
    const key = RBAC_CACHE_KEYS.permissionTemplate(templateId);
    return this.redisCacheService.get<T>(key);
  }

  async setPermissionTemplate<T>(templateId: string, data: T): Promise<void> {
    const key = RBAC_CACHE_KEYS.permissionTemplate(templateId);
    const tags = [RBAC_CACHE_TAGS.PERMISSION_TEMPLATE, `template:${templateId}`];
    await this.redisCacheService.set(key, data, { tags });
  }

  async invalidatePermissionTemplate(templateId: string): Promise<void> {
    await this.invalidationService.invalidateByTags([`template:${templateId}`]);
  }

  // ============================================
  // USER PERMISSIONS CACHE
  // ============================================

  async getUserPermissions<T>(userId: string): Promise<T | null> {
    const key = RBAC_CACHE_KEYS.userPermissions(userId);
    return this.redisCacheService.get<T>(key);
  }

  async setUserPermissions<T>(userId: string, data: T): Promise<void> {
    const key = RBAC_CACHE_KEYS.userPermissions(userId);
    const tags = [RBAC_CACHE_TAGS.USER, `user:${userId}`];
    await this.redisCacheService.set(key, data, { tags });
  }

  async invalidateUserPermissions(userId: string): Promise<void> {
    await this.invalidationService.invalidateByTags([`user:${userId}`]);
  }

  // ============================================
  // VALIDATION RESULT CACHE
  // ============================================

  async getValidationResult<T>(
    userId: string,
    action: string,
    resource: string,
  ): Promise<T | null> {
    const key = RBAC_CACHE_KEYS.validationResult(userId, action, resource);
    return this.redisCacheService.get<T>(key);
  }

  async setValidationResult<T>(
    userId: string,
    action: string,
    resource: string,
    data: T,
  ): Promise<void> {
    const key = RBAC_CACHE_KEYS.validationResult(userId, action, resource);
    const tags = [RBAC_CACHE_TAGS.VALIDATION, `user:${userId}`];
    await this.redisCacheService.set(key, data, { tags });
  }

  // ============================================
  // BULK INVALIDATION
  // ============================================

  async invalidateAll(): Promise<void> {
    await this.invalidationService.invalidateByTags([
      RBAC_CACHE_TAGS.PERMISSION_TEMPLATE,
      RBAC_CACHE_TAGS.USER,
      RBAC_CACHE_TAGS.POLICY,
      RBAC_CACHE_TAGS.HIERARCHY,
      RBAC_CACHE_TAGS.VALIDATION,
    ]);
  }
}
```

**File**: `services/infrastructure/index.ts`

```typescript
export * from './rbac-cache.service';
```

**Migration**:

1. **Domain Services** (Business logic):
   - Tạo `permission-validation.service.ts` - Tổng hợp logic validation từ các steps
   - Tạo `policy-evaluation.service.ts` - Logic đánh giá policies
   - Tạo `hierarchy-resolution.service.ts` - Logic phân giải hierarchy
   - Tạo `rule-engine.service.ts` - Engine đánh giá rules

2. **Application Services** (Orchestration):
   - Di chuyển `validation-orchestrator.service.ts` vào `services/application/`
   - Tạo `permission-check.service.ts` - Service chính cho permission checking
   - Tạo `audit-application.service.ts` - Orchestrate audit operations

3. **Infrastructure Services**:
   - **XÓA** `rbac-cache-manager.service.ts` (thay bằng RbacCacheService wrapper)
   - **XÓA** `cache-invalidation.service.ts` (dùng RedisInvalidationService trực tiếp)
   - **TẠO** `rbac-cache.service.ts` - Wrapper cho Redis Infrastructure services

---

### 7. validation-steps/ - Tách riêng 15 Steps

**Di chuyển** tất cả 15 step services từ `services/` sang `validation-steps/`:

```
validation-steps/
├── index.ts
├── step01-pre-validation.service.ts
├── step02-user-context-resolution.service.ts
├── ...
└── step15-final-decision.service.ts
```

**Lý do**: Tách riêng để dễ quản lý, vì có tới 15 services cho validation steps.

---

### 8. repositories/ - Data Access Layer

**Tạo mới** repositories cho 13 workspace entities đã có:

```typescript
// repositories/mkt-permission-template.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectWorkspaceRepository } from 'src/engine/twenty-orm/decorators/inject-workspace-repository.decorator';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { MktPermissionTemplateWorkspaceEntity } from '../workspace-entities';

@Injectable()
export class MktPermissionTemplateRepository {
  constructor(
    @InjectWorkspaceRepository(MktPermissionTemplateWorkspaceEntity)
    private readonly repository: WorkspaceRepository<MktPermissionTemplateWorkspaceEntity>,
  ) {}

  async findById(id: string): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByRoleId(roleId: string): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    return this.repository.find({ where: { roleId } });
  }

  async findActive(): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    return this.repository.find({ where: { isActive: true } });
  }

  // ... other methods
}
```

**Danh sách repositories cần tạo cho 13 entities**:

| Repository | Entity | Mô tả |
|------------|--------|-------|
| `MktPermissionTemplateRepository` | `MktPermissionTemplateWorkspaceEntity` | Permission templates |
| `MktPermissionActionRepository` | `MktPermissionActionWorkspaceEntity` | Permission actions |
| `MktPermissionResourceRepository` | `MktPermissionResourceWorkspaceEntity` | Permission resources |
| `MktPermissionAuditRepository` | `MktPermissionAuditWorkspaceEntity` | Audit logs |
| `MktDataAccessPolicyRepository` | `MktDataAccessPolicyWorkspaceEntity` | Data access policies |
| `MktUserPermissionTemplateRepository` | `MktUserPermissionTemplateWorkspaceEntity` | User-template assignments |
| `MktUserPermissionOverrideRepository` | `MktUserPermissionOverrideWorkspaceEntity` | Permission overrides |
| `MktTemplateResourcePermissionRepository` | `MktTemplateResourcePermissionWorkspaceEntity` | Resource permissions |
| `MktTemplateSystemActionRepository` | `MktTemplateSystemActionWorkspaceEntity` | System actions |
| `MktTemplateAccessLimitationRepository` | `MktTemplateAccessLimitationWorkspaceEntity` | Access limitations |
| `MktPermissionContextRepository` | `MktPermissionContextWorkspaceEntity` | Permission contexts |
| `MktPermissionPriorityConfigRepository` | `MktPermissionPriorityConfigWorkspaceEntity` | Priority configs |
| `MktTemporaryPermissionRepository` | `MktTemporaryPermissionWorkspaceEntity` | Temporary permissions |

**File**: `repositories/index.ts`

```typescript
export * from './mkt-permission-template.repository';
export * from './mkt-permission-action.repository';
export * from './mkt-permission-resource.repository';
export * from './mkt-permission-audit.repository';
export * from './mkt-data-access-policy.repository';
export * from './mkt-user-permission-template.repository';
export * from './mkt-user-permission-override.repository';
export * from './mkt-template-resource-permission.repository';
export * from './mkt-template-system-action.repository';
export * from './mkt-template-access-limitation.repository';
export * from './mkt-permission-context.repository';
export * from './mkt-permission-priority-config.repository';
export * from './mkt-temporary-permission.repository';
```

---

### 9. jobs/ - Background Jobs

**Tạo mới**:

1. **cache-warmup.job.ts** - Warm up permission cache
2. **audit-log-cleanup.job.ts** - Clean up old audit logs
3. **permission-sync.job.ts** - Sync permissions (nếu cần)

```typescript
// jobs/cache-warmup.job.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MKT_RBAC_CONFIG } from '../configs';
import { RbacCacheManagerService } from '../services/infrastructure';
import { RBAC_LOG_CONTEXT } from '../constants';

@Injectable()
export class RbacCacheWarmupJob {
  private readonly logger = new Logger(RBAC_LOG_CONTEXT);

  constructor(
    private readonly cacheManager: RbacCacheManagerService,
  ) {}

  @Cron(MKT_RBAC_CONFIG.CACHE_WARMUP_CRON)
  async warmupCache(): Promise<void> {
    this.logger.log('Starting RBAC cache warmup...');

    try {
      // Logic to warmup cache
      await this.cacheManager.warmup();

      this.logger.log('RBAC cache warmup completed successfully');
    } catch (error) {
      this.logger.error('RBAC cache warmup failed', error);
    }
  }
}
```

---

### 10. resolvers/ - GraphQL Resolvers

**Tạo mới**:

```typescript
// resolvers/permission.resolver.ts
import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/engine/guards/auth.guard';
import { CheckPermissionInput } from '../dto/inputs';
import { PermissionResultOutput, ValidationResultOutput } from '../dto/outputs';
import { PermissionCheckService } from '../services/application';
import { RBAC_GRAPHQL_DESCRIPTIONS } from '../message';

@Resolver()
@UseGuards(AuthGuard)
export class PermissionResolver {
  constructor(
    private readonly permissionCheckService: PermissionCheckService,
  ) {}

  @Query(() => PermissionResultOutput, {
    description: RBAC_GRAPHQL_DESCRIPTIONS.CHECK_PERMISSION_QUERY,
  })
  async checkPermission(
    @Args('input') input: CheckPermissionInput,
  ): Promise<PermissionResultOutput> {
    return this.permissionCheckService.checkPermission(input);
  }

  @Query(() => ValidationResultOutput, {
    description: 'Get detailed validation result with all steps',
  })
  async validatePermissionDetailed(
    @Args('input') input: CheckPermissionInput,
  ): Promise<ValidationResultOutput> {
    return this.permissionCheckService.validateDetailed(input);
  }

  @Mutation(() => Boolean, {
    description: RBAC_GRAPHQL_DESCRIPTIONS.CLEAR_PERMISSION_CACHE_MUTATION,
  })
  async clearPermissionCache(): Promise<boolean> {
    await this.permissionCheckService.clearCache();
    return true;
  }
}
```

---

### 11. hooks/ - Query Hooks

**Tạo mới** (nếu có workspace entities):

```typescript
// hooks/permission-template-pre-query.hook.ts
import { Injectable } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-pre-query-hook/interfaces/workspace-query-hook.interface';

@Injectable()
export class PermissionTemplateFindOnePreQueryHook implements WorkspaceQueryHook {
  async execute(userId: string, workspaceId: string, payload: any): Promise<void> {
    // Pre-query logic
  }
}
```

---

### 12. listeners/ - Event Listeners

**Tạo mới**:

```typescript
// listeners/permission-template.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RBAC_EVENTS } from '../events';
import { RbacCacheManagerService } from '../services/infrastructure';
import { RBAC_LOG_CONTEXT } from '../constants';

@Injectable()
export class PermissionTemplateListener {
  private readonly logger = new Logger(RBAC_LOG_CONTEXT);

  constructor(
    private readonly cacheManager: RbacCacheManagerService,
  ) {}

  @OnEvent(RBAC_EVENTS.PERMISSION_TEMPLATE_UPDATED)
  async handlePermissionTemplateUpdated(payload: { templateId: string }): Promise<void> {
    this.logger.log(`Permission template updated: ${payload.templateId}`);

    // Invalidate cache
    await this.cacheManager.invalidatePermissionTemplate(payload.templateId);
  }

  @OnEvent(RBAC_EVENTS.PERMISSION_TEMPLATE_DELETED)
  async handlePermissionTemplateDeleted(payload: { templateId: string }): Promise<void> {
    this.logger.log(`Permission template deleted: ${payload.templateId}`);

    // Invalidate cache
    await this.cacheManager.invalidatePermissionTemplate(payload.templateId);
  }
}
```

---

### 13. events/ - Event Definitions

**Tạo mới**:

```typescript
// events/rbac.events.ts
export const RBAC_EVENTS = {
  // Permission template events
  PERMISSION_TEMPLATE_CREATED: 'rbac.permission-template.created',
  PERMISSION_TEMPLATE_UPDATED: 'rbac.permission-template.updated',
  PERMISSION_TEMPLATE_DELETED: 'rbac.permission-template.deleted',

  // User role events
  USER_ROLE_ASSIGNED: 'rbac.user-role.assigned',
  USER_ROLE_REVOKED: 'rbac.user-role.revoked',

  // Policy events
  POLICY_CREATED: 'rbac.policy.created',
  POLICY_UPDATED: 'rbac.policy.updated',
  POLICY_DELETED: 'rbac.policy.deleted',

  // Permission check events
  PERMISSION_GRANTED: 'rbac.permission.granted',
  PERMISSION_DENIED: 'rbac.permission.denied',

  // Cache events
  CACHE_INVALIDATED: 'rbac.cache.invalidated',
  CACHE_WARMED: 'rbac.cache.warmed',
} as const;
```

```typescript
// events/index.ts
export * from './rbac.events';
```

---

### 14. utils/ - Utilities

**Tạo mới**:

```typescript
// utils/permission-mapper.utils.ts
import { PermissionResultOutput } from '../dto/outputs';
import { EnhancedPermissionResult } from '../types';

export class PermissionMapperUtils {
  static toOutput(result: EnhancedPermissionResult): PermissionResultOutput {
    return {
      granted: result.granted,
      source: result.source,
      reason: result.reason,
      requiredPermissions: result.requiredPermissions,
      metadata: result.metadata,
    };
  }
}
```

```typescript
// utils/policy-evaluator.utils.ts
import { PolicyContext, PolicyCondition } from '../types';

export class PolicyEvaluatorUtils {
  static evaluateCondition(
    condition: PolicyCondition,
    context: PolicyContext,
  ): boolean {
    // Logic to evaluate policy condition
    switch (condition.operator) {
      case 'equals':
        return context[condition.field] === condition.value;
      case 'contains':
        return context[condition.field]?.includes(condition.value);
      // ... other operators
      default:
        return false;
    }
  }

  static evaluateConditions(
    conditions: PolicyCondition[],
    context: PolicyContext,
    operator: 'AND' | 'OR' = 'AND',
  ): boolean {
    if (operator === 'AND') {
      return conditions.every((c) => this.evaluateCondition(c, context));
    }
    return conditions.some((c) => this.evaluateCondition(c, context));
  }
}
```

---

### 15. workspace-entities/ - WorkspaceEntity Definitions

**✅ ĐÃ CÓ**: Module đã có 13 workspace entities. **KHÔNG cần tạo mới**.

**Danh sách 13 entities hiện có**:

| Entity | Mô tả |
|--------|-------|
| `MktPermissionTemplateWorkspaceEntity` | Permission templates |
| `MktPermissionActionWorkspaceEntity` | Permission actions |
| `MktPermissionResourceWorkspaceEntity` | Permission resources |
| `MktPermissionAuditWorkspaceEntity` | Audit logs |
| `MktDataAccessPolicyWorkspaceEntity` | Data access policies |
| `MktUserPermissionTemplateWorkspaceEntity` | User-template assignments |
| `MktUserPermissionOverrideWorkspaceEntity` | Permission overrides |
| `MktTemplateResourcePermissionWorkspaceEntity` | Resource permissions per template |
| `MktTemplateSystemActionWorkspaceEntity` | System actions per template |
| `MktTemplateAccessLimitationWorkspaceEntity` | Access limitations per template |
| `MktPermissionContextWorkspaceEntity` | Permission contexts |
| `MktPermissionPriorityConfigWorkspaceEntity` | Priority configurations |
| `MktTemporaryPermissionWorkspaceEntity` | Temporary permissions |

**Cấu trúc hiện có**:

```
workspace-entities/
├── constants/
│   ├── index.ts
│   ├── permission-audit-options.constants.ts
│   ├── rbac-v2-options.constants.ts
│   └── temporary-permission-options.constants.ts
├── index.ts                                    # ✅ Đã export tất cả entities
├── mkt-data-access-policy.workspace-entity.ts
├── mkt-permission-action.workspace-entity.ts
├── mkt-permission-audit.workspace-entity.ts
├── mkt-permission-context.workspace-entity.ts
├── mkt-permission-priority-config.workspace-entity.ts
├── mkt-permission-resource.workspace-entity.ts
├── mkt-permission-template.workspace-entity.ts
├── mkt-template-access-limitation.workspace-entity.ts
├── mkt-template-resource-permission.workspace-entity.ts
├── mkt-template-system-action.workspace-entity.ts
├── mkt-temporary-permission.workspace-entity.ts
├── mkt-user-permission-override.workspace-entity.ts
└── mkt-user-permission-template.workspace-entity.ts
```

**⚠️ LƯU Ý**: Cần tạo repositories, hooks, và jobs tương ứng cho 13 entities này.

---

### 16. types/ - Merge interfaces/

**Refactor**: Merge `interfaces/validation-step.interface.ts` vào `types/`

```typescript
// types/validation.types.ts
// Di chuyển nội dung từ interfaces/validation-step.interface.ts và validation-step.types.ts
export type { ... };
export interface { ... };
```

**Xóa**: `interfaces/` folder sau khi merge xong

---

### 17. Cập nhật Module Definition

**File**: `mkt-rbac-enterprise-grade.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

// Redis Infrastructure
import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis';

// Repositories
import {
  MktPermissionTemplateRepository,
  MktPolicyRepository,
  MktPermissionTemplateRepository,
  MktPermissionActionRepository,
  MktPermissionResourceRepository,
  MktPermissionAuditRepository,
  MktDataAccessPolicyRepository,
  MktUserPermissionTemplateRepository,
  MktUserPermissionOverrideRepository,
  MktTemplateResourcePermissionRepository,
  MktTemplateSystemActionRepository,
  MktTemplateAccessLimitationRepository,
  MktPermissionContextRepository,
  MktPermissionPriorityConfigRepository,
  MktTemporaryPermissionRepository,
} from './repositories';

// Resolvers
import {
  PermissionResolver,
  PermissionTemplateResolver,
  AuditLogResolver,
} from './resolvers';

// Jobs
import {
  RbacCacheWarmupJob,
  AuditLogCleanupJob,
  TemporaryPermissionCleanupJob,
  PermissionSyncJob,
} from './jobs';

// Hooks
import {
  PermissionTemplateFindOnePreQueryHook,
  PermissionTemplateFindManyPreQueryHook,
  PermissionTemplateCreateOnePostQueryHook,
  PermissionTemplateUpdateOnePostQueryHook,
  PermissionTemplateDeleteOnePostQueryHook,
  PermissionAuditFindManyPreQueryHook,
} from './hooks';

// Listeners
import {
  PermissionTemplateListener,
  UserRoleListener,
} from './listeners';

// Services - Domain
import {
  PermissionValidationService,
  PolicyEvaluationService,
  HierarchyResolutionService,
  RuleEngineService,
} from './services/domain';

// Services - Application
import {
  ValidationOrchestratorService,
  PermissionCheckService,
  AuditApplicationService,
} from './services/application';

// Services - Infrastructure (wrapper cho Redis Infrastructure)
import {
  RbacCacheService,
} from './services/infrastructure';

// Validation Steps
import {
  Step1PreValidationService,
  Step2UserContextResolutionService,
  Step3ResourceIdentificationService,
  Step4PermissionTemplateCheckService,
  Step5ActionPermissionValidationService,
  Step6ResourcePermissionCheckService,
  Step7HierarchyValidationService,
  Step8DataAccessPolicyCheckService,
  Step9SpecialPermissionsService,
  Step10SensitiveDataChecksService,
  Step11DepartmentRestrictionsService,
  Step12DynamicConditionsService,
  Step13CachePerformanceService,
  Step14AuditLoggingService,
  Step15FinalDecisionService,
} from './validation-steps';

// Guards & Interceptors
import { EnterpriseRbacGuard } from './guards/enterprise-rbac.guard';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';

// Subscribers
import { PermissionTemplateCacheSubscriber } from './subscribers/permission-template-cache.subscriber';

// Config
import { MKT_RBAC_CONFIG } from './configs';

/**
 * MktRbacEnterpriseGradeModule
 *
 * Module quản lý RBAC (Role-Based Access Control) cấp enterprise
 *
 * Features:
 * - 15-step permission validation process
 * - Hierarchy-based access control
 * - Policy engine for dynamic conditions
 * - Audit logging for compliance
 * - Redis caching for performance
 * - Background jobs for maintenance
 *
 * Architecture:
 * - Repositories: Data access layer (TwentyORM)
 * - Domain Services: Business logic (validation, policy evaluation, hierarchy)
 * - Application Services: Orchestration và workflow
 * - Infrastructure Services: Caching, cache invalidation
 * - Validation Steps: 15-step validation services
 * - Resolvers: GraphQL API
 * - Hooks: Pre/Post query hooks
 * - Jobs: Background jobs (cache warmup, audit cleanup)
 * - Listeners: Event handlers
 *
 * Dependencies:
 * - TwentyORMModule: Database access
 * - WorkspaceCacheStorageModule: Redis caching (fallback)
 * - RedisInfrastructureModule: Redis services (RedisCacheService, RedisLockService, etc.)
 */
@Module({
  imports: [
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    RedisInfrastructureModule, // ⚠️ QUAN TRỌNG: Import Redis Infrastructure
  ],
  providers: [
    // ============================================
    // CONFIGURATION
    // ============================================
    {
      provide: 'MKT_RBAC_CONFIG',
      useValue: MKT_RBAC_CONFIG,
    },

    // ============================================
    // REPOSITORIES (Data Access Layer) - 13 repositories cho 13 entities
    // ============================================
    MktPermissionTemplateRepository,
    MktPermissionActionRepository,
    MktPermissionResourceRepository,
    MktPermissionAuditRepository,
    MktDataAccessPolicyRepository,
    MktUserPermissionTemplateRepository,
    MktUserPermissionOverrideRepository,
    MktTemplateResourcePermissionRepository,
    MktTemplateSystemActionRepository,
    MktTemplateAccessLimitationRepository,
    MktPermissionContextRepository,
    MktPermissionPriorityConfigRepository,
    MktTemporaryPermissionRepository,

    // ============================================
    // DOMAIN SERVICES (Business Logic Layer)
    // ============================================
    PermissionValidationService,
    PolicyEvaluationService,
    HierarchyResolutionService,
    RuleEngineService,

    // ============================================
    // APPLICATION SERVICES (Orchestration Layer)
    // ============================================
    ValidationOrchestratorService,
    PermissionCheckService,
    AuditApplicationService,

    // ============================================
    // INFRASTRUCTURE SERVICES (Wrapper cho Redis Infrastructure)
    // ============================================
    RbacCacheService, // Wrapper cho RedisCacheService + RedisInvalidationService
    // Note: RedisCacheService, RedisLockService được inject từ RedisInfrastructureModule

    // ============================================
    // VALIDATION STEPS
    // ============================================
    Step1PreValidationService,
    Step2UserContextResolutionService,
    Step3ResourceIdentificationService,
    Step4PermissionTemplateCheckService,
    Step5ActionPermissionValidationService,
    Step6ResourcePermissionCheckService,
    Step7HierarchyValidationService,
    Step8DataAccessPolicyCheckService,
    Step9SpecialPermissionsService,
    Step10SensitiveDataChecksService,
    Step11DepartmentRestrictionsService,
    Step12DynamicConditionsService,
    Step13CachePerformanceService,
    Step14AuditLoggingService,
    Step15FinalDecisionService,

    // ============================================
    // RESOLVERS (GraphQL Layer)
    // ============================================
    PermissionResolver,
    PermissionTemplateResolver,
    AuditLogResolver,

    // ============================================
    // BACKGROUND JOBS
    // ============================================
    RbacCacheWarmupJob,
    AuditLogCleanupJob,
    TemporaryPermissionCleanupJob,
    PermissionSyncJob,

    // ============================================
    // PRE-QUERY HOOKS
    // ============================================
    PermissionTemplateFindOnePreQueryHook,
    PermissionTemplateFindManyPreQueryHook,

    // ============================================
    // POST-QUERY HOOKS
    // ============================================
    PermissionTemplateCreateOnePostQueryHook,
    PermissionTemplateUpdateOnePostQueryHook,
    PermissionTemplateDeleteOnePostQueryHook,

    // ============================================
    // AUDIT HOOKS
    // ============================================
    PermissionAuditFindManyPreQueryHook,

    // ============================================
    // EVENT LISTENERS
    // ============================================
    PermissionTemplateListener,
    UserRoleListener,

    // ============================================
    // GUARDS & INTERCEPTORS
    // ============================================
    EnterpriseRbacGuard,
    AuditLoggingInterceptor,

    // ============================================
    // SUBSCRIBERS
    // ============================================
    PermissionTemplateCacheSubscriber,
  ],
  exports: [
    // Public API - Application Services
    PermissionCheckService,
    AuditApplicationService,

    // Domain Services (for external modules)
    PermissionValidationService,
    PolicyEvaluationService,
    HierarchyResolutionService,

    // Infrastructure Services (Wrapper)
    RbacCacheService,

    // Validation Orchestrator
    ValidationOrchestratorService,

    // Guards & Interceptors (for use in other modules)
    EnterpriseRbacGuard,
    AuditLoggingInterceptor,

    // Repositories (for direct access if needed)
    MktPermissionTemplateRepository,
    MktPolicyRepository,
    MktAuditLogRepository,
  ],
})
export class MktRbacEnterpriseGradeModule {}
```

---

## Migration Plan

### Phase 0: Prerequisites - Cập nhật Redis Infrastructure (1 ngày)

**⚠️ QUAN TRỌNG**: Phải hoàn thành trước khi bắt đầu refactor

1. ✅ Thêm RBAC cache prefixes vào `/mkt-core/infrastructure/redis/constants/cache-keys.constant.ts`:

```typescript
// ============================================
// RBAC DOMAIN
// ============================================

export const RBAC_CACHE_PREFIX = {
  /** Permission template: mkt:rbac:permission-template:{templateId} */
  PERMISSION_TEMPLATE: 'mkt:rbac:permission-template',

  /** User permissions: mkt:rbac:user-permissions:{userId} */
  USER_PERMISSIONS: 'mkt:rbac:user-permissions',

  /** Policy: mkt:rbac:policy:{policyId} */
  POLICY: 'mkt:rbac:policy',

  /** Hierarchy: mkt:rbac:hierarchy:{userId} */
  HIERARCHY: 'mkt:rbac:hierarchy',

  /** Validation result: mkt:rbac:validation:{userId}:{action}:{resource} */
  VALIDATION: 'mkt:rbac:validation',

  /** Audit log: mkt:rbac:audit-log:{logId} */
  AUDIT_LOG: 'mkt:rbac:audit-log',
} as const;
```

2. ✅ Thêm RBAC TTL config vào `/mkt-core/infrastructure/redis/constants/cache-ttl.constant.ts`:

```typescript
import { RBAC_CACHE_PREFIX } from './cache-keys.constant';

export const MKT_CACHE_TTL_CONFIG: Record<string, number> = {
  // ... existing configs ...

  // ============================================
  // RBAC DOMAIN
  // ============================================
  [RBAC_CACHE_PREFIX.PERMISSION_TEMPLATE]: CACHE_TTL.VERY_LONG, // 1 hour
  [RBAC_CACHE_PREFIX.USER_PERMISSIONS]: CACHE_TTL.LONG,         // 30 min
  [RBAC_CACHE_PREFIX.POLICY]: CACHE_TTL.VERY_LONG,              // 1 hour
  [RBAC_CACHE_PREFIX.HIERARCHY]: CACHE_TTL.VERY_LONG,           // 1 hour
  [RBAC_CACHE_PREFIX.VALIDATION]: CACHE_TTL.SHORT,              // 5 min
  [RBAC_CACHE_PREFIX.AUDIT_LOG]: CACHE_TTL.DAY,                 // 24 hours
};
```

3. ✅ Export RBAC_CACHE_PREFIX từ `/mkt-core/infrastructure/redis/constants/index.ts`:

```typescript
export * from './cache-keys.constant'; // Đảm bảo export RBAC_CACHE_PREFIX
export * from './cache-ttl.constant';
// ... other exports
```

4. ✅ Test Redis Infrastructure:
```bash
npx nx lint twenty-server
npx nx typecheck twenty-server
```

### Phase 1: Chuẩn bị (1-2 ngày)

1. ✅ Tạo các thư mục mới:
   - `errors/`
   - `dto/inputs/`, `dto/outputs/`
   - `configs/`
   - `message/`
   - `events/`
   - `listeners/`
   - `hooks/`
   - `repositories/`
   - `jobs/`
   - `resolvers/`
   - `validation-steps/`
   - `services/domain/`, `services/application/`, `services/infrastructure/`

2. ⚠️ Các thư mục đã có nhưng empty (cần populate):
   - `utils/` - Đã có, cần thêm utility files
   - `helpers/` - Đã có, cần thêm helper files
   - `validators/` - Đã có, cần thêm validator files

3. ✅ Các thư mục đã có và đầy đủ (GIỮ NGUYÊN):
   - `workspace-entities/` - ĐÃ CÓ 13 entities
   - `constants/` - ĐÃ CÓ với index.ts
   - `types/` - ĐÃ CÓ với index.ts
   - `decorators/`
   - `guards/`
   - `interceptors/`
   - `subscribers/`

4. ✅ Copy files để backup:
   ```bash
   cp -r mkt-rbac-enterprise-grade mkt-rbac-enterprise-grade.backup
   ```

### Phase 2: Tạo mới các components (2-3 ngày)

1. ✅ Tạo `errors/rbac.errors.ts` - Custom error classes
2. ✅ Tạo `configs/mkt-rbac.config.ts` - Zod-validated config
3. ✅ Tạo `message/index.ts` - Centralized messages
4. ✅ Tạo `events/rbac.events.ts` - Event definitions
5. ✅ Refactor `constants/` - Reorganize constants
6. ✅ Tạo `dto/inputs/` và `dto/outputs/` - GraphQL types
7. ✅ Tạo `utils/` - Utility functions

### Phase 3: Refactor Services (3-4 ngày)

1. ✅ Di chuyển validation steps:
   - Move `services/step*.service.ts` → `validation-steps/step*.service.ts`
   - Update imports

2. ✅ Phân chia services theo layers:
   - **Domain**: Tạo mới domain services (validation, policy, hierarchy, rule)
   - **Application**: Move orchestrator, tạo permission-check, audit-application
   - **Infrastructure**: Move cache-manager, cache-invalidation

3. ✅ Update imports trong tất cả files

### Phase 4: Tạo Infrastructure (2-3 ngày)

1. ✅ Tạo `repositories/` cho 13 workspace entities đã có
2. ✅ Tạo `jobs/` - Background jobs
3. ✅ Tạo `resolvers/` - GraphQL resolvers
4. ✅ Tạo `hooks/` - Query hooks cho workspace entities (pre/post query)
5. ✅ Tạo `listeners/` - Event listeners

### Phase 5: Testing & Migration (2-3 ngày)

1. ✅ Update `mkt-rbac-enterprise-grade.module.ts` - Cập nhật imports và exports
2. ✅ Update imports trong các modules sử dụng RBAC
3. ✅ Run linting: `npx nx lint twenty-server --fix`
4. ✅ Run type checking: `npx nx typecheck twenty-server`
5. ✅ Run tests: `npx nx test twenty-server`
6. ✅ Test manually các features RBAC

### Phase 6: Cleanup (1 ngày)

1. ✅ Xóa các files/folders cũ:
   - `interfaces/` (sau khi merge vào types/)
   - Các files không dùng trong `services/`
   - Backup folder (nếu mọi thứ OK)

2. ✅ Update documentation
3. ✅ Commit changes

**Tổng thời gian dự kiến**: 12-17 ngày (bao gồm 1 ngày setup Redis Infrastructure)

---

## Breaking Changes

### 1. Cache Services (⚠️ QUAN TRỌNG)

**Trước**:
```typescript
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache-manager.service';
import { CacheInvalidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/cache-invalidation.service';

constructor(
  private readonly cacheManager: RbacCacheManagerService,
  private readonly invalidation: CacheInvalidationService,
) {}
```

**Sau**:
```typescript
// Option 1: Sử dụng wrapper service (RECOMMENDED)
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/infrastructure';

constructor(
  private readonly rbacCache: RbacCacheService,
) {}

// Option 2: Inject trực tiếp từ Redis Infrastructure
import { RedisCacheService, RedisInvalidationService } from 'src/mkt-core/infrastructure/redis';

constructor(
  private readonly redisCacheService: RedisCacheService,
  private readonly redisInvalidationService: RedisInvalidationService,
) {}
```

**Migration Guide**:
1. Thay `RbacCacheManagerService` bằng `RbacCacheService` hoặc `RedisCacheService`
2. Thay `CacheInvalidationService` bằng `RedisInvalidationService`
3. Update cache key builders (sử dụng `RBAC_CACHE_KEYS` từ constants)
4. Thêm RBAC cache prefixes vào infrastructure Redis constants

### 2. Import Paths

**Trước**:
```typescript
import { ValidationOrchestratorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/validation-orchestrator.service';
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache-manager.service';
import { Step1PreValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step1-pre-validation.service';
```

**Sau**:
```typescript
import { ValidationOrchestratorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/application';
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/infrastructure';
import { Step1PreValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/validation-steps';
```

### 2. Constants

**Trước**:
```typescript
import { VALIDATION_STEPS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
```

**Sau**:
```typescript
import { VALIDATION_STEPS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
// hoặc
import { VALIDATION_STEPS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/mkt-rbac.constants';
```

### 3. Configuration

**Trước**: Hard-coded trong module
```typescript
const DEFAULT_CONFIG = {
  enable15StepValidation: true,
  // ...
} as const;
```

**Sau**: Zod-validated environment variables
```typescript
import { MKT_RBAC_CONFIG } from 'src/mkt-core/mkt-rbac-enterprise-grade/configs';

// Sử dụng
const isEnabled = MKT_RBAC_CONFIG.ENABLE_15_STEP_VALIDATION;
```

### 4. Messages

**Trước**: Hard-coded strings
```typescript
throw new Error('Permission denied');
```

**Sau**: Centralized messages
```typescript
import { PERMISSION_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';

throw new PermissionDeniedError(
  PERMISSION_MESSAGES.error.PERMISSION_DENIED
);
```

---

## Checklist

### Prerequisites (Redis Infrastructure)

- [ ] Thêm `RBAC_CACHE_PREFIX` vào `/mkt-core/infrastructure/redis/constants/cache-keys.constant.ts`
- [ ] Thêm RBAC TTL config vào `/mkt-core/infrastructure/redis/constants/cache-ttl.constant.ts`
- [ ] Export RBAC_CACHE_PREFIX từ `/mkt-core/infrastructure/redis/constants/index.ts`
- [ ] Test infrastructure: lint + typecheck

### Tạo mới

- [ ] `errors/rbac.errors.ts`
- [ ] `configs/mkt-rbac.config.ts`
- [ ] `message/index.ts` (dùng createModuleMessages)
- [ ] `events/rbac.events.ts`
- [ ] `dto/inputs/*.input.ts`
- [ ] `dto/outputs/*.output.ts`
- [ ] `listeners/*.listener.ts`
- [ ] `hooks/*.hook.ts` - Cho 13 workspace entities (pre/post query)
- [ ] `repositories/*.repository.ts` - 13 repositories cho 13 entities
- [ ] `jobs/*.job.ts`
- [ ] `resolvers/*.resolver.ts`
- [ ] `services/domain/*.service.ts`
- [ ] `services/application/*.service.ts`
- [ ] `services/infrastructure/rbac-cache.service.ts`

### Populate (folders đã có nhưng empty)

- [ ] `utils/permission-mapper.utils.ts`
- [ ] `utils/policy-evaluator.utils.ts`
- [ ] `helpers/permission.helper.ts`
- [ ] `validators/permission-input.validator.ts`

### Refactor

- [ ] `constants/index.ts` - Thêm export messages
- [ ] `services/` - Phân chia theo domain/application/infrastructure
- [ ] `validation-steps/` - Di chuyển 15 step services từ services/
- [ ] `types/` - Merge từ interfaces/
- [ ] `mkt-rbac-enterprise-grade.module.ts` - Update imports

### Xóa

- [ ] `interfaces/` folder (sau khi merge vào types/)
- [ ] Các files cũ trong `services/` (sau khi di chuyển sang validation-steps/)
- [ ] `services/rbac-cache-manager.service.ts` (⚠️ thay bằng RbacCacheService wrapper)
- [ ] `services/cache-invalidation.service.ts` (⚠️ dùng RedisInvalidationService)

### Giữ nguyên

- [x] `workspace-entities/` - ĐÃ CÓ 13 entities
- [x] `constants/` - ĐÃ CÓ với index.ts
- [x] `types/` - ĐÃ CÓ với index.ts
- [x] `decorators/permission.decorator.ts`
- [x] `guards/enterprise-rbac.guard.ts`
- [x] `interceptors/audit-logging.interceptor.ts`
- [x] `subscribers/permission-template-cache.subscriber.ts`

### Testing

- [ ] Lint: `npx nx lint twenty-server --fix`
- [ ] Type check: `npx nx typecheck twenty-server`
- [ ] Unit tests: `npx nx test twenty-server`
- [ ] Integration tests
- [ ] Manual testing

### Documentation

- [ ] Update CLAUDE.md (nếu cần)
- [ ] Update README (nếu có)
- [ ] Update inline comments
- [ ] Add JSDoc cho public APIs

---

## Notes

1. **WorkspaceEntities**: Module **ĐÃ CÓ** 13 workspace entities. Cần tạo repositories, hooks, và jobs tương ứng cho tất cả entities.

2. **GraphQL Resolvers**: Tùy vào yêu cầu, có thể expose một số entities qua GraphQL API (ví dụ: PermissionTemplate, AuditLog).

3. **Background Jobs**: Cần các jobs cho:
   - Cache warmup (định kỳ)
   - Audit log cleanup (xóa logs cũ theo retention policy)
   - Temporary permission cleanup (xóa các temporary permissions hết hạn)

4. **Events & Listeners**: Quan trọng cho cache invalidation khi permission templates thay đổi.

5. **Backward Compatibility**: Có thể giữ lại các export cũ trong `index.ts` với `@deprecated` tags để hỗ trợ migration:

```typescript
// index.ts
/**
 * @deprecated Import from 'services/application' instead
 */
export { ValidationOrchestratorService } from './services/application';
```

6. **Incremental Migration**: Có thể thực hiện migration từng phần thay vì refactor toàn bộ cùng lúc.

7. **constants/messages.ts**: File này có cấu trúc riêng (VALIDATION_STEP_NAMES, VALIDATION_STEP_DESCRIPTIONS). Có thể giữ lại hoặc migrate sang message/ với createModuleMessages pattern.

---

## Summary - Key Changes với Redis Infrastructure

### 🔧 Infrastructure Changes

1. **Redis Infrastructure Module**:
   - ✅ SỬ DỤNG `RedisInfrastructureModule` đã có sẵn
   - ✅ Import vào module: `imports: [RedisInfrastructureModule]`
   - ✅ Inject services: `RedisCacheService`, `RedisLockService`, `RedisInvalidationService`

2. **Cache Constants**:
   - ✅ THÊM `RBAC_CACHE_PREFIX` vào `/mkt-core/infrastructure/redis/constants/cache-keys.constant.ts`
   - ✅ THÊM RBAC TTL config vào `/mkt-core/infrastructure/redis/constants/cache-ttl.constant.ts`
   - ✅ SỬ DỤNG `CACHE_TTL` từ infrastructure thay vì hard-code

3. **Services Migration**:
   - ❌ XÓA `RbacCacheManagerService` (tự implement)
   - ❌ XÓA `CacheInvalidationService` (tự implement)
   - ✅ TẠO `RbacCacheService` (wrapper cho Redis Infrastructure)
   - ✅ Inject `RedisCacheService` + `RedisInvalidationService`

4. **Benefits**:
   - ✅ Two-tier caching với LRU fallback (built-in)
   - ✅ Graceful degradation khi Redis unavailable
   - ✅ Tag-based cache invalidation
   - ✅ Distributed locking support
   - ✅ Circuit breaker pattern
   - ✅ Centralized TTL management
   - ✅ Consistent cache key patterns

### 📝 Action Items Summary

**Prerequisites**:
1. Thêm RBAC cache prefixes vào infrastructure/redis/constants/
2. Thêm RBAC TTL config vào infrastructure/redis/constants/
3. Test infrastructure updates

**Implementation**:
1. Import `RedisInfrastructureModule` vào RBAC module
2. Tạo `RbacCacheService` wrapper với RBAC-specific methods
3. Tạo 13 repositories cho 13 workspace entities đã có
4. Tạo hooks (pre/post query) cho các entities quan trọng
5. Di chuyển 15 step services sang `validation-steps/`
6. Phân chia services theo layers (domain/application/infrastructure)
7. Xóa `RbacCacheManagerService` và `CacheInvalidationService` cũ
8. Update imports trong toàn bộ module

---

## References

- **Pattern Reference**: `packages/twenty-server/src/mkt-core/mkt-promotion/`
- **Redis Infrastructure**: `packages/twenty-server/src/mkt-core/infrastructure/redis/`
- **CLAUDE.md**: `/home/phuth/Desktop/CRM/CLAUDE.md`

---

## Workspace Entities Summary

Module đã có **13 workspace entities** với cấu trúc đầy đủ:

| # | Entity | Mô tả |
|---|--------|-------|
| 1 | `MktPermissionTemplateWorkspaceEntity` | Permission templates |
| 2 | `MktPermissionActionWorkspaceEntity` | Permission actions |
| 3 | `MktPermissionResourceWorkspaceEntity` | Permission resources |
| 4 | `MktPermissionAuditWorkspaceEntity` | Audit logs |
| 5 | `MktDataAccessPolicyWorkspaceEntity` | Data access policies |
| 6 | `MktUserPermissionTemplateWorkspaceEntity` | User-template assignments |
| 7 | `MktUserPermissionOverrideWorkspaceEntity` | Permission overrides |
| 8 | `MktTemplateResourcePermissionWorkspaceEntity` | Resource permissions per template |
| 9 | `MktTemplateSystemActionWorkspaceEntity` | System actions per template |
| 10 | `MktTemplateAccessLimitationWorkspaceEntity` | Access limitations per template |
| 11 | `MktPermissionContextWorkspaceEntity` | Permission contexts |
| 12 | `MktPermissionPriorityConfigWorkspaceEntity` | Priority configurations |
| 13 | `MktTemporaryPermissionWorkspaceEntity` | Temporary permissions |

---

**Last Updated**: 2026-01-08
**Author**: Claude Code
**Status**: Ready for Implementation
**Redis Infrastructure**: Cần thêm RBAC_CACHE_PREFIX
**Workspace Entities**: ĐÃ CÓ 13 entities ✅
