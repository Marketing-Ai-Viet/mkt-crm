# Legacy RBAC to Casbin Parity Matrix

## Overview

This document maps each of the 15 legacy RBAC validation steps to their equivalent Casbin constructs, ensuring behavioral equivalence during migration.

## Migration Status

| Status | Count |
|--------|-------|
| Fully Mapped | 15/15 |
| Test Coverage | Pending |

---

## Parity Matrix

| Step | Legacy Name | Casbin Construct | Implementation | Notes |
|------|-------------|------------------|----------------|-------|
| 1 | Pre-Validation | Guard middleware | `DualPathAuthzGuard.extractContext()` | Context extraction from GraphQL/HTTP |
| 2 | User Context Resolution | Policy subject | `user:{userId}` in p-type policies | User identified by UUID |
| 3 | Resource Identification | Policy object | `CASBIN_RESOURCES` constants | Resource type from entity name |
| 4 | Permission Template Check | p-type policies | `PolicySyncService.generateUserPolicies()` | Templates → Casbin policies |
| 5 | Action Permission | Policy action | `CASBIN_ACTIONS` constants | CRUD + manage actions |
| 6 | Resource Permission | enforce() | `enforce(sub, obj, act, attr)` | Binary allow/deny |
| 7 | Hierarchy Validation | g-type policies | `PolicySyncService.generateRoleInheritance()` | Role inheritance via g rules |
| 8 | Data Access Policy | ABAC conditions | `extractAbacCondition()` | Condition in 5th policy column |
| 9 | Special Permissions | Wildcard policies | `*` in object/action | Admin/superuser access |
| 10 | Financial Data Checks | ABAC attr | `attr.userClearance >= minClearance` | Clearance level check |
| 11 | Department Restrictions | ABAC attr | `attr.userDepartments` | Department membership |
| 12 | Dynamic Conditions | ABAC conditions | `validFrom`, `validTo`, `expression` | Time-based + custom |
| 13 | Cache Check | In-memory cache | `CasbinEnforcerService.enforcers` Map | LRU eviction, TTL |
| 14 | Audit & Logging | Metrics + Events | `RbacMetricsService.recordCheck()` | Permission check metrics |
| 15 | Final Decision | enforce() result | `checkPermission().allowed` | Boolean allow/deny |

---

## Detailed Mapping

### Step 1: Pre-Validation → Guard Middleware

**Legacy**: Validate context, authentication, workspace, and action basics.

**Casbin Implementation**:
```typescript
// DualPathAuthzGuard.extractContext()
private extractContext(context: ExecutionContext, permission: PermissionMetadata): ExtractedContext {
  const contextType = context.getType<string>();

  if (contextType === 'graphql') {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();
    return {
      userId: ctx.req?.user?.id,
      workspaceId: ctx.req?.workspace?.id,
      resource: permission.resource,
      action: permission.action,
    };
  }
  // HTTP context...
}
```

**Equivalence**: Guard extracts same context data as legacy Step 1.

---

### Step 2: User Context Resolution → Policy Subject

**Legacy**: Resolve user hierarchy, department, reporting relationships.

**Casbin Implementation**:
```typescript
// Policy subject format
const subject = `user:${userId}`;

// Role assignment (g-type)
['user:uuid', 'role:admin']  // g, user:uuid, role:admin
```

**Equivalence**: User identity preserved via subject. Hierarchy via role inheritance.

---

### Step 3: Resource Identification → Policy Object

**Legacy**: Identify resource type, ownership, sensitivity.

**Casbin Implementation**:
```typescript
// CASBIN_RESOURCES constants
export const CASBIN_RESOURCES = {
  MKT_ORDER: 'mktOrder',
  MKT_LICENSE: 'mktLicense',
  MKT_CUSTOMER: 'mktCustomer',
  // ... 40+ resources
};

// Object format
const object = resourceId ? `${resource}:${resourceId}` : resource;
```

**Equivalence**: Resource type mapping via constants. Instance-level via `:id` suffix.

---

### Step 4: Permission Template Check → p-type Policies

**Legacy**: Resolve applicable templates, evaluate conflicts, apply hierarchy.

**Casbin Implementation**:
```typescript
// PolicySyncService.generateUserPolicies()
private generateUserPolicies(
  userId: string,
  permissions: MktUserPermissionWorkspaceEntity[],
): CasbinPolicy[] {
  return permissions.flatMap((permission) => {
    const actions = this.resolveActions(permission.accessLevel);
    return actions.map((action) => ({
      ptype: 'p',
      subject: `user:${userId}`,
      object: permission.resource,
      action,
      effect: 'allow',
      condition: this.extractAbacCondition(permission),
    }));
  });
}
```

**Equivalence**: Templates converted to p-type policies with same access semantics.

---

### Step 5: Action Permission Validation → Policy Action

**Legacy**: Validate action type, risk level, approval requirements.

**Casbin Implementation**:
```typescript
// CASBIN_ACTIONS constants
export const CASBIN_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',  // Full CRUD
  EXPORT: 'export',
  IMPORT: 'import',
  ASSIGN: 'assign',
  CONFIGURE: 'configure',
};
```

**Equivalence**: Same action vocabulary. Risk level handled by High-Risk Validator.

---

### Step 6: Resource Permission Check → enforce()

**Legacy**: Check resource access, validate categories, check cross-dependencies.

**Casbin Implementation**:
```typescript
// CasbinEnforcerService.checkPermission()
const allowed = await enforcer.enforce(
  subject,      // user:uuid
  resource,     // mktOrder or mktOrder:uuid
  action,       // read, create, etc.
  attributes,   // ABAC attributes
);
```

**Equivalence**: Single enforce() call replaces multi-step resource checks.

---

### Step 7: Hierarchy-based Validation → g-type Policies

**Legacy**: Validate hierarchy levels, check reporting relationships.

**Casbin Implementation**:
```typescript
// Role inheritance (g-type rules)
['user:uuid', 'role:manager']           // User has manager role
['role:manager', 'role:viewer']         // Manager inherits viewer
['role:admin', 'role:manager']          // Admin inherits manager

// Check via role links
await enforcer.hasRoleForUser('user:uuid', 'role:admin');
```

**Equivalence**: Role hierarchy via g-type policies. Transitive inheritance supported.

---

### Step 8: Data Access Policy Check → ABAC Conditions

**Legacy**: Evaluate policies, parse filter conditions, apply department policies.

**Casbin Implementation**:
```typescript
// extractAbacCondition() in PolicySyncService
private extractAbacCondition(permission: MktUserPermissionWorkspaceEntity): string | undefined {
  const conditions: string[] = [];

  // Time-based conditions
  if (permission.validFrom) {
    conditions.push(`attr.currentDate >= '${format(permission.validFrom)}'`);
  }

  // Clearance level
  if (permission.minClearance) {
    conditions.push(`attr.userClearance >= ${permission.minClearance}`);
  }

  // Department restrictions
  if (permission.departments?.length) {
    conditions.push(`attr.userDepartments.includes('${permission.departments.join("','")}')`);
  }

  return conditions.length > 0 ? conditions.join(' && ') : undefined;
}
```

**Equivalence**: ABAC conditions in policy 5th column evaluated at enforcement.

---

### Step 9: Special Permissions → Wildcard Policies

**Legacy**: Check emergency access, validate temporary elevation, system overrides.

**Casbin Implementation**:
```typescript
// Wildcard policies for admin/superuser
['role:superadmin', '*', '*', 'allow']  // Full access to everything

// Temporary elevation via time-bounded policies
['user:uuid', 'mktOrder', 'manage', 'allow', "attr.currentTime <= '2024-12-31'"]
```

**Equivalence**: Wildcards for broad access. Time conditions for temporary elevation.

---

### Step 10: Financial/Sensitive Data Checks → Clearance Level

**Legacy**: Validate salary/financial data access, check data classification.

**Casbin Implementation**:
```typescript
// ABAC condition for clearance
const condition = `attr.userClearance >= ${resource.minClearance}`;

// At enforcement time
await enforcer.enforce(subject, object, action, {
  userClearance: user.clearanceLevel,  // 1-5
  // ...
});
```

**Equivalence**: Clearance level passed as ABAC attribute, validated in condition.

---

### Step 11: Department & Team Restrictions → Department Attributes

**Legacy**: Validate department access, check team permissions.

**Casbin Implementation**:
```typescript
// Department condition in policy
const condition = `attr.userDepartments.includes('${targetDeptId}')`;

// At enforcement
await enforcer.enforce(subject, object, action, {
  userDepartments: user.departmentAncestors,  // Including ancestors
});
```

**Equivalence**: Department membership via ABAC attributes. Ancestry for hierarchy.

---

### Step 12: Dynamic Conditions → ABAC Expression

**Legacy**: Validate time restrictions, check location/device constraints.

**Casbin Implementation**:
```typescript
// Time-based condition
`attr.currentTime >= '09:00' && attr.currentTime <= '18:00'`

// Custom expression from template
`${permission.customExpression}`  // e.g., "attr.amount <= 10000"

// At enforcement
await enforcer.enforce(subject, object, action, {
  currentTime: DateTimeUtils.toISO(DateTimeUtils.now()),
  amount: request.amount,
});
```

**Equivalence**: Dynamic conditions as ABAC expressions evaluated at runtime.

---

### Step 13: Cache Check & Performance → Enforcer Cache

**Legacy**: Check cache, update cache, optimize performance.

**Casbin Implementation**:
```typescript
// CasbinEnforcerService in-memory cache
private readonly enforcers = new Map<string, EnforcerWithMeta>();

// LRU eviction
if (this.enforcers.size >= this.config.maxEnforcersInMemory) {
  const oldestKey = this.findOldestEnforcer();
  this.enforcers.delete(oldestKey);
}

// TTL check
private isEnforcerValid(meta: EnforcerWithMeta): boolean {
  const age = DateTimeUtils.diffInMillis(meta.loadedAt, DateTimeUtils.now());
  return age < this.config.enforcerTtlMs;
}
```

**Equivalence**: In-memory enforcer cache with LRU + TTL. Redis for cross-instance.

---

### Step 14: Audit & Logging → Metrics Service

**Legacy**: Log permission checks, audit sensitive access, track security events.

**Casbin Implementation**:
```typescript
// RbacMetricsService.recordCheck()
await metricsService.recordCheck({
  workspaceId,
  latencyMs,
  allowed,
  cached,
});

// RBAC Events for significant actions
eventEmitter.emit('permission.granted', {
  userId,
  resource,
  action,
  timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
});
```

**Equivalence**: Metrics for performance. Events for audit trail.

---

### Step 15: Final Decision & Response → checkPermission() Result

**Legacy**: Combine results, resolve conflicts, generate final response.

**Casbin Implementation**:
```typescript
// CasbinEnforcerService.checkPermission() result
return {
  allowed: boolean,         // Final decision
  latencyMs: number,        // Performance metric
  reason: string,           // Human-readable explanation
};
```

**Equivalence**: Binary allow/deny. Reason for debugging/audit.

---

## ABAC Attributes Reference

| Attribute | Type | Source | Usage |
|-----------|------|--------|-------|
| `currentTime` | string (ISO) | System | Time-based access |
| `currentDate` | string (YYYY-MM-DD) | System | Date-based access |
| `userClearance` | number (1-5) | User profile | Sensitive data access |
| `userDepartments` | string[] | User + ancestry | Department restrictions |
| `userRoles` | string[] | Role assignments | Role-based conditions |
| `resourceOwner` | string (userId) | Resource | Ownership checks |
| `amount` | number | Request | Financial limits |

---

## Casbin Model Definition

```ini
[request_definition]
r = sub, obj, act, attr

[policy_definition]
p = sub, obj, act, eft, condition

[role_definition]
g = _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = (g(r.sub, p.sub) || r.sub == p.sub) && \
    (keyMatch2(r.obj, p.obj) || r.obj == p.obj) && \
    (r.act == p.act || p.act == "*") && \
    (p.condition == "" || eval(p.condition))
```

---

## Migration Checklist

- [x] Step 1-15 mapped to Casbin constructs
- [x] ABAC conditions for dynamic rules
- [x] Role hierarchy via g-type policies
- [ ] Performance tests (P95 < 10ms cached)
- [ ] Chaos tests (fail-closed verification)
- [ ] Shadow mode validation complete
- [ ] Production cutover approved

---

## References

- [Casbin Documentation](https://casbin.org/docs/overview)
- [RBAC-MODULE-REDESIGN.md](./RBAC-MODULE-REDESIGN.md)
- [CASBIN-RBAC-GUIDE.md](../casbin/CASBIN-RBAC-GUIDE.md)
