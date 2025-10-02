# Enterprise RBAC Guard - Complete Guide

## Overview

The Enterprise RBAC Guard is a comprehensive 15-step permission validation system that provides enterprise-grade access control for the Twenty CRM system. It implements a sophisticated validation pipeline with conditional execution, performance optimization, and security hardening.

## Table of Contents

- [Architecture](#architecture)
- [Validation Pipeline](#validation-pipeline)
- [Step Skipping Mechanism](#step-skipping-mechanism)
- [Performance Configuration](#performance-configuration)
- [Usage Examples](#usage-examples)
- [Configuration Options](#configuration-options)
- [Troubleshooting](#troubleshooting)

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    EnterpriseRbacGuard                      │
├─────────────────────────────────────────────────────────────┤
│  1. Context Building                                        │
│  2. Validation Orchestration                               │
│  3. Result Processing                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                ValidationOrchestratorService                │
├─────────────────────────────────────────────────────────────┤
│  • Step Registration & Management                          │
│  • Execution Planning & Optimization                       │
│  • Skip Logic & Conditional Execution                      │
│  • Performance Monitoring                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Individual Validation Steps              │
├─────────────────────────────────────────────────────────────┤
│  Step 1:  Pre-validation          (Security Foundation)    │
│  Step 2:  User Context Resolution (User Information)       │
│  Step 3:  Resource Identification (Resource Analysis)      │
│  Step 4:  Permission Templates    (Template Matching)      │
│  Step 5:  Action Permissions      (Action Validation)      │
│  Step 6:  Resource Permissions    (Resource Access)        │
│  Step 7:  Hierarchy Validation    (Org Structure)          │
│  Step 8:  Data Access Policies    (Policy Engine)          │
│  Step 9:  Special Permissions     (Elevated Access)        │
│  Step 10: Sensitive Data Checks   (Compliance)             │
│  Step 11: Department Restrictions (Team Boundaries)        │
│  Step 12: Dynamic Conditions      (Runtime Rules)          │
│  Step 13: Cache & Performance     (Optimization)           │
│  Step 14: Audit & Logging         (Compliance Tracking)    │
│  Step 15: Final Decision          (Result Aggregation)     │
└─────────────────────────────────────────────────────────────┘
```

## Validation Pipeline

### 15-Step Validation Process

#### Core Security Steps (Never Skip)

**Step 1: Pre-validation**
- **Purpose**: Basic authentication and security checks
- **Duration**: ~100ms
- **Can Skip**: ❌ Never
- **Retry**: 0 attempts
- **Checks**:
  - User authentication status
  - Request context validity
  - Workspace membership
  - Action validity

**Step 2: User Context Resolution**
- **Purpose**: Resolve detailed user information from database
- **Duration**: ~150ms
- **Can Skip**: ❌ Rarely
- **Retry**: 1 attempt
- **Checks**:
  - User profile enrichment
  - Role and permission resolution
  - Organizational context

**Step 3: Resource Identification**
- **Purpose**: Identify and classify the target resource
- **Duration**: ~80ms
- **Can Skip**: ❌ Rarely
- **Retry**: 1 attempt
- **Checks**:
  - Resource type classification
  - Ownership verification
  - Resource metadata
- Step 3 Resource Identification Service có những mục đích chính sau:

  Mục đích chính của Step 3:

    1. Nhận diện và phân loại tài nguyên (Resource Classification)
    - Xác định loại tài nguyên: SYSTEM_CONFIG, FINANCIAL, USER_MGMT, AUDIT_DATA, BUSINESS_DATA
    - Phân loại theo category: SYSTEM, FINANCIAL, USER_DATA, AUDIT, BUSINESS
    - Xác định đặc tính: isSystemResource, isFinancialData, isPersonalData, isAuditData

    2. Phân tích độ nhạy cảm (Sensitivity Analysis)
    - Tính toán sensitivity score dựa trên patterns và field analysis
    - Phân cấp sensitivity: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED → TOP_SECRET
    - Phát hiện dữ liệu PII, financial info, medical data, credentials
    - Đưa ra security recommendations và compliance requirements

    3. Xác định ownership và inheritance chain
    - Resolve record owner từ các field: ownerId, createdById, userId, workspaceMemberId
    - Xây dựng department hierarchy path từ owner đến root department
    - Tạo inheritance order: owner → department → parent departments → workspace
    - Permission cascade theo organizational structure

    4. Phân tích cross-references và dependencies
    - Tìm các object relationships từ metadata
    - Xác định dependency strength: WEAK, MODERATE, STRONG
    - Đánh giá cascade risk khi thay đổi/xóa resource
    - Map relationship types và onDelete behaviors

    5. Xây dựng Enhanced Resource Context
    - Tổng hợp tất cả thông tin thành ResourceContext đầy đủ
    - Cung cấp cho các validation steps tiếp theo
    - Bao gồm: resourceType, confidentialityLevel, dataClassification, ownership, dependencies

  Vị trí trong 15-step validation process:

  Step 1: Pre-validation (kiểm tra điều kiện cơ bản)
  Step 2: User Context Resolution (resolve user info, department, hierarchy)
  👉 Step 3: Resource Identification (nhận diện resource, sensitivity, ownership)
  Step 4: Permission Template Resolution
  Step 5: Hierarchy-based Access Control
  ...
  Step 15: Final Authorization Decision

  Tại sao Step 3 quan trọng:

    1. Foundation cho các step sau:
    - Cung cấp complete resource context cho permission evaluation
    - Sensitivity level quyết định security requirements
    - Ownership chain xác định inheritance rules

    2. Security và Compliance:
    - Tự động detect sensitive data và áp dụng security measures
    - Compliance framework identification (GDPR, SOX, PCI_DSS, HIPAA)
    - Access restrictions dựa trên sensitivity level

    3. Performance optimization:
    - Cache resource metadata để tránh repeated database queries
    - Skip step nếu resource context đã được resolved
    - Efficient dependency analysis

    4. Enterprise-grade features:
    - Automatic data classification
    - Audit trail requirements
    - Retention policy compliance
    - Encryption requirements detection


#### Permission Logic Steps (Conditional Skip)

**Step 4: Permission Template Check**
- **Purpose**: Apply permission templates and patterns
- **Duration**: ~200ms
- **Can Skip**: ✅ For simple operations
- **Retry**: 2 attempts
- **Skip When**:
  - Direct permission grants exist
  - Public resource access
  - System-level operations

**Step 5: Action Permission Validation**
- **Purpose**: Validate specific action permissions
- **Duration**: ~120ms
- **Can Skip**: ✅ For read-only public resources
- **Retry**: 1 attempt
- **Skip When**:
  - Read access to public data
  - System maintenance operations

**Step 6: Resource Permission Check**
- **Purpose**: Check resource-specific permissions
- **Duration**: ~250ms
- **Can Skip**: ✅ For public resources
- **Retry**: 2 attempts
- **Skip When**:
  - Public resources
  - System configuration (admin only)

#### Advanced Validation Steps (Often Skipped)

**Step 7: Hierarchy Validation**
- **Purpose**: Apply organizational hierarchy rules
- **Duration**: ~300ms
- **Can Skip**: ✅ For flat organizations
- **Retry**: 2 attempts
- **Skip When**:
  - Flat organizational structure
  - Cross-department access enabled
  - Emergency access mode

**Step 8: Data Access Policy Check**
- **Purpose**: Apply complex data access policies
- **Duration**: ~180ms
- **Can Skip**: ✅ For simple policies
- **Retry**: 1 attempt
- **Skip When**:
  - Simple permission model
  - Development environment
  - Basic CRUD operations

**Step 9: Special Permissions**
- **Purpose**: Handle elevated and special access cases
- **Duration**: ~150ms
- **Can Skip**: ✅ For normal operations
- **Retry**: 0 attempts
- **Skip When**:
  - Normal business operations
  - No special permissions required
  - Standard user access

**Step 10: Sensitive Data Checks**
- **Purpose**: Apply compliance and sensitive data rules
- **Duration**: ~400ms
- **Can Skip**: ✅ For non-sensitive data
- **Retry**: 3 attempts
- **Skip When**:
  - Non-sensitive resources
  - Public information
  - Development environment

**Step 11: Department Restrictions**
- **Purpose**: Apply department and team boundaries
- **Duration**: ~120ms
- **Can Skip**: ✅ For cross-department access
- **Retry**: 1 attempt
- **Skip When**:
  - Cross-department operations
  - Administrative access
  - Shared resources

**Step 12: Dynamic Conditions**
- **Purpose**: Evaluate runtime conditional rules
- **Duration**: ~500ms
- **Can Skip**: ✅ For static rule sets
- **Retry**: 2 attempts
- **Skip When**:
  - Static permission model
  - Simple business rules
  - Performance-critical operations

#### Meta Steps (Utility)

**Step 13: Cache & Performance**
- **Purpose**: Performance optimization and caching
- **Duration**: ~50ms
- **Can Skip**: ✅ Optional optimization
- **Retry**: 0 attempts

**Step 14: Audit & Logging**
- **Purpose**: Compliance and audit trail
- **Duration**: ~100ms
- **Can Skip**: ✅ In development mode
- **Retry**: 3 attempts

**Step 15: Final Decision**
- **Purpose**: Aggregate results and make final decision
- **Duration**: ~30ms
- **Can Skip**: ❌ Never
- **Retry**: 0 attempts

## Step Skipping Mechanism

### Skip Strategies

#### 1. Basic Operations (High Performance)
```typescript
const basicOperationConfig = {
  skipSteps: [6, 7, 8, 9, 10, 11, 12], // Skip advanced validation
  validationMode: 'PERMISSIVE',
  failFast: true,
  timeoutMs: 1000
};
```
**Use Cases:**
- Reading public data
- Simple CRUD operations
- Development environment
- High-throughput APIs

#### 2. Administrative Operations (Moderate Security)
```typescript
const adminOperationConfig = {
  skipSteps: [11, 12], // Skip dept restrictions and dynamic conditions
  validationMode: 'STRICT',
  failFast: false,
  timeoutMs: 3000
};
```
**Use Cases:**
- Administrative functions
- Cross-department operations
- System configuration

#### 3. Financial Operations (Maximum Security)
```typescript
const financialOperationConfig = {
  skipSteps: [], // No steps skipped
  validationMode: 'STRICT',
  failFast: false,
  timeoutMs: 10000
};
```
**Use Cases:**
- Financial data access
- Sensitive information
- Compliance-critical operations
- Audit-required actions

#### 4. Emergency Access (Minimal Validation)
```typescript
const emergencyConfig = {
  skipSteps: [4, 5, 6, 7, 8, 9, 10, 11, 12], // Only basic checks
  validationMode: 'EMERGENCY',
  failFast: true,
  timeoutMs: 500
};
```
**Use Cases:**
- System emergencies
- Disaster recovery
- Critical system maintenance

### Skip Decision Matrix

| Resource Type | Action | Skip Steps | Reasoning |
|---------------|--------|------------|-----------|
| `PUBLIC_DATA` | `READ` | `[6,7,8,9,10,11,12]` | Public data needs minimal validation |
| `BUSINESS_DATA` | `READ` | `[9,10,11,12]` | Standard business read operation |
| `BUSINESS_DATA` | `UPDATE` | `[9,11,12]` | Update needs more validation |
| `FINANCIAL` | `*` | `[]` | Financial data requires full validation |
| `SYSTEM_CONFIG` | `*` | `[11]` | System config doesn't need dept restrictions |
| `USER_MGMT` | `UPDATE` | `[12]` | User management skips dynamic conditions |
| `REPORTING` | `READ` | `[9,10,11]` | Reports skip special permissions |

## Performance Configuration

### Timeout Configuration

```typescript
export const STEP_PERFORMANCE_CONFIG = {
  [VALIDATION_STEPS.PRE_VALIDATION]: {
    maxExecutionTime: 5000,      // 5 seconds
    estimatedExecutionTime: 100,  // 100ms
    enableCaching: false,
    retryAttempts: 0,
  },
  [VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]: {
    maxExecutionTime: 3000,      // 3 seconds
    estimatedExecutionTime: 150,  // 150ms
    enableCaching: true,
    cacheExpirationTime: 60000,  // 1 minute
    retryAttempts: 1,
  },
  // ... other steps
};
```

### Global Thresholds

```typescript
export const GLOBAL_PERFORMANCE_THRESHOLDS = {
  TOTAL_MAX_EXECUTION_TIME: 30000,    // 30 seconds total
  CRITICAL_STEP_TIMEOUT: 10000,       // 10 seconds for critical steps
  DEFAULT_MAX_REQUEST_AGE: 300000,    // 5 minutes
  SLOW_STEP_THRESHOLD: 1000,          // 1 second
  MAX_PARALLEL_STEPS: 3,
  MAX_CONCURRENT_VALIDATIONS: 10,
};
```

## Usage Examples

### Basic Implementation

```typescript
// In your resolver or controller
@UseGuards(EnterpriseRbacGuard)
@Permission({
  action: PermissionAction.READ,
  resourceType: 'BUSINESS_DATA',
  skipSteps: [7, 8, 9, 10, 11, 12], // Basic validation only
  validationMode: 'PERMISSIVE',
  failFast: true,
})
async getOrders(@Context() context: any) {
  return this.orderService.findAll();
}
```

### Advanced Configuration

```typescript
@UseGuards(EnterpriseRbacGuard)
@Permission({
  action: PermissionAction.UPDATE,
  resourceType: 'FINANCIAL',
  skipSteps: [], // Full validation required
  validationMode: 'STRICT',
  failFast: false,
  requireSpecialPermissions: true,
  auditRequired: true,
})
async updateFinancialRecord(@Body() data: UpdateFinancialDto) {
  return this.financialService.update(data);
}
```

### Dynamic Skip Configuration

```typescript
// In a service method
private getSkipStepsForOperation(action: string, resourceType: string): number[] {
  const skipConfig = {
    'READ_PUBLIC': [6, 7, 8, 9, 10, 11, 12],
    'READ_BUSINESS': [9, 10, 11, 12],
    'UPDATE_BUSINESS': [9, 11, 12],
    'DELETE_BUSINESS': [11, 12],
    'FINANCIAL_ALL': [], // No skips for financial
    'SYSTEM_CONFIG': [11], // Skip department restrictions
  };

  const key = `${action}_${resourceType}`;
  return skipConfig[key] || [];
}
```

## Configuration Options

### Validation Modes

```typescript
type ValidationMode =
  | 'STRICT'      // All enabled steps must pass
  | 'PERMISSIVE'  // Allow warnings, continue execution
  | 'EMERGENCY'   // Minimal validation for emergencies
  | 'AUDIT'       // Full validation with detailed logging
```

### Execution Modes

```typescript
type ExecutionMode =
  | 'SYNC'        // Sequential step execution
  | 'ASYNC'       // Parallel execution where possible
  | 'OPTIMIZED'   // Smart parallel/sequential hybrid
```

### Priority Levels

```typescript
type PriorityLevel =
  | 'LOW'         // Background operations, longer timeouts
  | 'NORMAL'      // Standard operations
  | 'HIGH'        // User-facing operations, faster timeouts
  | 'CRITICAL'    // Emergency operations, immediate processing
```

## Troubleshooting

### Common Issues

#### Performance Problems

**Symptom**: Validation taking longer than expected
```typescript
// Solution: Add strategic step skipping
const optimizedConfig = {
  skipSteps: [7, 8, 11, 12], // Skip heavy steps
  validationMode: 'PERMISSIVE',
  timeoutMs: 2000,
};
```

**Symptom**: Database timeout errors
```typescript
// Solution: Increase retry attempts and enable caching
const resilientConfig = {
  retryAttempts: 2,
  enableCaching: true,
  cacheExpirationTime: 300000, // 5 minutes
};
```

#### Permission Denied Errors

**Symptom**: Unexpected permission failures
```typescript
// Debug: Check which step is failing
const debugConfig = {
  validationMode: 'AUDIT',
  detailedLogging: true,
  skipSteps: [], // Don't skip any steps for debugging
};
```

#### Memory/Resource Issues

**Symptom**: High memory usage
```typescript
// Solution: Limit concurrent validations
const limitedConfig = {
  maxConcurrentValidations: 5,
  skipSteps: [12], // Skip resource-intensive dynamic conditions
  enableCaching: true,
};
```

### Debug Configuration

```typescript
// Development environment debug config
const debugConfig = {
  skipSteps: [10, 14], // Skip sensitive data and audit in dev
  validationMode: 'PERMISSIVE',
  enableDebugLogging: true,
  detailedErrorMessages: true,
  performanceMetrics: true,
};
```

### Monitoring and Metrics

```typescript
// Example metrics to monitor
const metricsToTrack = {
  averageValidationTime: 'Average time per validation',
  stepFailureRates: 'Failure rate per validation step',
  skipStepUsage: 'Frequency of step skipping',
  cacheHitRates: 'Cache effectiveness per step',
  timeoutOccurrences: 'Frequency of timeouts',
  retryAttempts: 'Retry frequency per step',
};
```

## Best Practices

1. **Start with basic skip configuration** and add steps as needed
2. **Use caching** for frequently accessed, slowly changing data
3. **Monitor performance metrics** and adjust timeouts accordingly
4. **Use appropriate validation modes** for different environments
5. **Skip department restrictions** for cross-functional operations
6. **Never skip core security steps** (1, 2, 3, 15)
7. **Use emergency mode sparingly** and with proper audit trails
8. **Test skip configurations** thoroughly in staging environments

## Security Considerations

- **Core steps (1-3, 15) should never be skipped** except in true emergencies
- **Financial operations should use minimal skipping** to maintain compliance
- **Emergency access should be logged and reviewed** regularly
- **Skip configurations should be audited** and approved by security teams
- **Development environments should mirror production** skip patterns when possible