# RBAC Module Redesign: From 15-Step to Casbin

## Executive Summary

Tài liệu này đề xuất redesign module `mkt-rbac-enterprise-grade` từ kiến trúc 15-step validation tự phát triển sang sử dụng Casbin làm authorization engine chính.

---

## 1. Current State Analysis

### 1.1 Existing Structure

```
mkt-rbac-enterprise-grade/
├── services/                     # ~15,000 LOC
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
│   ├── validation-orchestrator.service.ts
│   ├── rbac-cache-manager.service.ts
│   └── hierarchy-level.service.ts
├── workspace-entities/           # 13 entities
├── repositories/                 # 13 repositories
├── types/                        # ~3,000 LOC
├── constants/                    # ~500 LOC
├── guards/
├── interceptors/
├── decorators/
├── hooks/                        # Empty - pending
├── listeners/                    # Empty - pending
├── jobs/                         # Empty - pending
└── resolvers/                    # Empty - pending
```

### 1.2 Current Flow

```
Request → Guard → 15 Steps Sequential/Parallel → Response
          │
          └→ Step 1 → Step 2 → ... → Step 14 → Step 15
                │         │              │          │
                └─────────┴──────────────┴──────────┘
                        Complex dependencies
```

### 1.3 Pain Points

| Issue | Impact | Severity |
|-------|--------|----------|
| 15 service files to maintain | High maintenance cost | HIGH |
| Complex step dependencies | Hard to modify/extend | HIGH |
| Custom caching logic | Performance issues | MEDIUM |
| No standard model | Hard to test | MEDIUM |
| Incomplete hooks/jobs | Features blocked | HIGH |

---

## 2. Policy Model & Conventions

### 2.1 Casbin Model Definition

**File: `casbin/models/rbac-domains.conf`**

```ini
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
g = _, _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && g2(r.obj, p.obj) && r.act == p.act
```

**File: `casbin/models/abac-hybrid.conf`** (cho ABAC conditions)

```ini
[request_definition]
r = sub, dom, obj, act, attr

[policy_definition]
p = sub, dom, obj, act, eft, condition

[role_definition]
g = _, _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && g2(r.obj, p.obj) && r.act == p.act && (p.condition == "" || eval(p.condition))
```

### 2.2 Naming Conventions

| Element | Format | Examples |
|---------|--------|----------|
| **Subject (user)** | `user:{uuid}` | `user:550e8400-e29b-41d4-a716-446655440000` |
| **Role/Template** | `tpl:{key}` | `tpl:admin`, `tpl:sales_manager`, `tpl:viewer` |
| **Domain (workspace)** | `ws:{uuid}` | `ws:123e4567-e89b-12d3-a456-426614174000` |
| **Resource** | `{entity}` hoặc `{entity}:{id}` | `mktCustomer`, `mktOrder:ord-123` |
| **Action** | verb lowercase | `read`, `create`, `update`, `delete`, `export` |
| **Department** | `dept:{uuid}` | `dept:789e0123-e45b-67c8-d901-234567890abc` |

### 2.3 Custom Functions

```typescript
// casbin/functions/department-functions.ts
export const CUSTOM_FUNCTIONS = {
  /**
   * Check if userDept is descendant of targetDept in hierarchy
   * Uses precomputed ancestor list for O(1) lookup
   */
  isDescendant: async (userDept: string, targetDept: string): Promise<boolean> => {
    const ancestors = await departmentCache.getAncestors(userDept);
    return ancestors.includes(targetDept);
  },

  /**
   * Check if userDept is ancestor of targetDept
   */
  isAncestor: async (userDept: string, targetDept: string): Promise<boolean> => {
    const descendants = await departmentCache.getDescendants(userDept);
    return descendants.includes(targetDept);
  },

  /**
   * Check hierarchy level permission
   */
  hasMinLevel: (userLevel: number, requiredLevel: number): boolean => {
    return userLevel >= requiredLevel;
  },

  /**
   * Check time-based access
   */
  isWithinTimeRange: (currentTime: string, startTime: string, endTime: string): boolean => {
    const now = new Date(currentTime);
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  },
};
```

### 2.4 Sample Policy Set

```yaml
# sample-policies.yaml - Development/POC seed data

# ===== GROUPING POLICIES (g) - Role assignments =====
grouping_policies:
  # User -> Role assignments (per workspace)
  - ["user:admin-001", "tpl:super_admin", "ws:workspace-001"]
  - ["user:manager-001", "tpl:sales_manager", "ws:workspace-001"]
  - ["user:sales-001", "tpl:sales_rep", "ws:workspace-001"]
  - ["user:viewer-001", "tpl:viewer", "ws:workspace-001"]

  # Role hierarchy
  - ["tpl:super_admin", "tpl:admin", "ws:workspace-001"]
  - ["tpl:admin", "tpl:manager", "ws:workspace-001"]
  - ["tpl:manager", "tpl:sales_rep", "ws:workspace-001"]

# ===== RESOURCE GROUPING (g2) - Resource hierarchy =====
resource_grouping:
  - ["mktOrder", "mktBusinessData"]
  - ["mktInvoice", "mktBusinessData"]
  - ["mktCustomer", "mktBusinessData"]
  - ["mktLicense", "mktBusinessData"]

# ===== PERMISSION POLICIES (p) =====
policies:
  # Super Admin - full access
  - sub: "tpl:super_admin"
    dom: "ws:*"
    obj: "*"
    act: "*"
    eft: "allow"

  # Admin - manage all business data
  - sub: "tpl:admin"
    dom: "ws:workspace-001"
    obj: "mktBusinessData"
    act: "*"
    eft: "allow"

  # Sales Manager - CRUD customers, orders, read invoices
  - sub: "tpl:sales_manager"
    dom: "ws:workspace-001"
    obj: "mktCustomer"
    act: "*"
    eft: "allow"
  - sub: "tpl:sales_manager"
    dom: "ws:workspace-001"
    obj: "mktOrder"
    act: "*"
    eft: "allow"
  - sub: "tpl:sales_manager"
    dom: "ws:workspace-001"
    obj: "mktInvoice"
    act: "read"
    eft: "allow"

  # Sales Rep - create/read customers and orders
  - sub: "tpl:sales_rep"
    dom: "ws:workspace-001"
    obj: "mktCustomer"
    act: "read"
    eft: "allow"
  - sub: "tpl:sales_rep"
    dom: "ws:workspace-001"
    obj: "mktCustomer"
    act: "create"
    eft: "allow"
  - sub: "tpl:sales_rep"
    dom: "ws:workspace-001"
    obj: "mktOrder"
    act: "read"
    eft: "allow"
  - sub: "tpl:sales_rep"
    dom: "ws:workspace-001"
    obj: "mktOrder"
    act: "create"
    eft: "allow"

  # Viewer - read only
  - sub: "tpl:viewer"
    dom: "ws:workspace-001"
    obj: "mktBusinessData"
    act: "read"
    eft: "allow"

  # Explicit deny - block export for non-admins
  - sub: "tpl:sales_rep"
    dom: "ws:workspace-001"
    obj: "*"
    act: "export"
    eft: "deny"

# ===== ABAC POLICIES (với conditions) =====
abac_policies:
  # Time-based access
  - sub: "tpl:temp_contractor"
    dom: "ws:workspace-001"
    obj: "mktCustomer"
    act: "read"
    eft: "allow"
    condition: "r.attr.currentTime >= '2026-01-01' && r.attr.currentTime <= '2026-03-31'"

  # Department-based access
  - sub: "tpl:dept_manager"
    dom: "ws:workspace-001"
    obj: "mktOrder"
    act: "*"
    eft: "allow"
    condition: "isDescendant(r.attr.resourceDept, r.attr.userDept)"

  # Data classification
  - sub: "tpl:classified_reader"
    dom: "ws:workspace-001"
    obj: "mktSensitiveData"
    act: "read"
    eft: "allow"
    condition: "r.attr.userClearance >= p.requiredClearance"
```

**SQL Seed Script:**

```sql
-- casbin/seeds/sample-policies.sql
INSERT INTO casbin_rule (ptype, v0, v1, v2, v3, v4) VALUES
-- Role assignments
('g', 'user:admin-001', 'tpl:super_admin', 'ws:workspace-001', '', ''),
('g', 'user:manager-001', 'tpl:sales_manager', 'ws:workspace-001', '', ''),
('g', 'user:sales-001', 'tpl:sales_rep', 'ws:workspace-001', '', ''),

-- Role hierarchy
('g', 'tpl:super_admin', 'tpl:admin', 'ws:workspace-001', '', ''),
('g', 'tpl:admin', 'tpl:manager', 'ws:workspace-001', '', ''),

-- Resource hierarchy
('g2', 'mktOrder', 'mktBusinessData', '', '', ''),
('g2', 'mktInvoice', 'mktBusinessData', '', '', ''),
('g2', 'mktCustomer', 'mktBusinessData', '', '', ''),

-- Policies
('p', 'tpl:super_admin', 'ws:*', '*', '*', 'allow'),
('p', 'tpl:admin', 'ws:workspace-001', 'mktBusinessData', '*', 'allow'),
('p', 'tpl:sales_manager', 'ws:workspace-001', 'mktCustomer', '*', 'allow'),
('p', 'tpl:viewer', 'ws:workspace-001', 'mktBusinessData', 'read', 'allow');
```

---

## 3. Multi-tenant Isolation

### 3.1 Domain-based Workspace Isolation

```typescript
// casbin/adapters/workspace-filtered.adapter.ts
import { FilteredAdapter } from 'casbin';

export class WorkspaceFilteredAdapter extends FilteredAdapter {
  private workspaceId: string;

  setWorkspaceFilter(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  async loadFilteredPolicy(model: Model, filter: Filter): Promise<void> {
    // Only load policies for current workspace + global policies
    const workspaceFilter = {
      ...filter,
      v1: [this.workspaceId, 'ws:*'], // domain column
    };
    await super.loadFilteredPolicy(model, workspaceFilter);
  }
}
```

### 3.2 Cross-tenant Validation

```typescript
// casbin/validators/policy.validator.ts
export class PolicyValidator {
  /**
   * Validate policy before adding to prevent cross-tenant issues
   */
  validatePolicy(policy: CasbinPolicy, currentWorkspaceId: string): ValidationResult {
    const errors: string[] = [];

    // Check domain isolation
    if (policy.domain !== `ws:${currentWorkspaceId}` && policy.domain !== 'ws:*') {
      errors.push(`Cross-tenant policy rejected: domain ${policy.domain} not allowed`);
    }

    // Check subject format
    if (!this.isValidSubjectFormat(policy.subject)) {
      errors.push(`Invalid subject format: ${policy.subject}`);
    }

    // Check for privilege escalation
    if (this.isPotentialEscalation(policy)) {
      errors.push('Potential privilege escalation detected');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate grouping policy (role assignment)
   */
  validateGroupingPolicy(
    policy: GroupingPolicy,
    currentWorkspaceId: string,
    currentUserRoles: string[],
  ): ValidationResult {
    const errors: string[] = [];

    // Prevent cross-tenant role assignment
    if (policy.domain !== `ws:${currentWorkspaceId}`) {
      errors.push('Cross-tenant role assignment not allowed');
    }

    // Check if current user can assign this role (no escalation)
    if (!this.canAssignRole(policy.role, currentUserRoles)) {
      errors.push(`Cannot assign role ${policy.role}: insufficient privileges`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private canAssignRole(roleToAssign: string, currentUserRoles: string[]): boolean {
    const roleHierarchy = ['tpl:viewer', 'tpl:sales_rep', 'tpl:manager', 'tpl:admin', 'tpl:super_admin'];
    const roleToAssignLevel = roleHierarchy.indexOf(roleToAssign);
    const maxCurrentLevel = Math.max(...currentUserRoles.map(r => roleHierarchy.indexOf(r)));

    // Can only assign roles at or below current level
    return maxCurrentLevel > roleToAssignLevel;
  }
}
```

### 3.3 Workspace Context Middleware

```typescript
// casbin/middleware/workspace-context.middleware.ts
@Injectable()
export class WorkspaceContextMiddleware implements NestMiddleware {
  constructor(
    private readonly enforcerFactory: CasbinEnforcerFactory,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const workspaceId = req.headers['x-workspace-id'] as string;

    if (!workspaceId) {
      throw new UnauthorizedException('Workspace ID required');
    }

    // Get workspace-specific enforcer (cached)
    req['casbinEnforcer'] = await this.enforcerFactory.getEnforcer(workspaceId);

    next();
  }
}
```

---

## 4. Proposed Architecture

### 4.1 Target Structure

```
mkt-rbac-enterprise-grade/
├── casbin/                         # NEW - Core authorization
│   ├── models/
│   │   ├── rbac-domains.conf       # RBAC model definition
│   │   └── abac-hybrid.conf        # For complex conditions
│   ├── adapters/
│   │   ├── twenty-typeorm.adapter.ts
│   │   └── workspace-filtered.adapter.ts
│   ├── watchers/                   # Custom watcher implementations
│   │   └── pg-notify.watcher.ts    # PostgreSQL NOTIFY (recommended)
│   ├── functions/
│   │   └── department-functions.ts # Custom functions
│   ├── validators/
│   │   └── policy.validator.ts     # Cross-tenant validation
│   ├── services/
│   │   ├── casbin-enforcer.service.ts
│   │   ├── casbin-enforcer.factory.ts
│   │   ├── policy-sync.service.ts
│   │   └── role-manager.service.ts
│   ├── guards/
│   │   └── casbin-authz.guard.ts
│   ├── seeds/
│   │   └── sample-policies.sql
│   └── casbin.module.ts
│
├── audit/                          # SEPARATE - Compliance
│   ├── services/
│   │   └── permission-audit.service.ts
│   ├── interceptors/
│   │   └── audit-logging.interceptor.ts
│   └── audit.module.ts
│
├── workspace-entities/             # KEEP - Data models
│   ├── mkt-permission-template.workspace-entity.ts
│   ├── mkt-permission-audit.workspace-entity.ts
│   ├── mkt-data-access-policy.workspace-entity.ts
│   └── ...
│
├── repositories/                   # KEEP - Data access
│   └── ... (simplified)
│
├── decorators/                     # REFACTOR
│   ├── require-permission.decorator.ts
│   └── check-policy.decorator.ts
│
├── dto/                            # KEEP
├── types/                          # SIMPLIFY
├── constants/                      # SIMPLIFY
│
└── mkt-rbac.module.ts              # SIMPLIFY
```

### 4.2 New Authorization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      GraphQL Request                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CasbinAuthzGuard                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  1. Extract context (user, workspace, resource, action)  │    │
│  │  2. Call enforcer.enforce()                              │    │
│  │  3. Return allow/deny                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│    Casbin Enforcer       │  │   Audit Interceptor      │
│                          │  │                          │
│  - RBAC check (cached)   │  │  - Log permission check  │
│  - ABAC conditions       │  │  - Compliance tracking   │
│  - Domain isolation      │  │  - Analytics             │
└──────────────────────────┘  └──────────────────────────┘
              │
              ▼
┌──────────────────────────┐
│   PostgreSQL Policies    │
│  + PG NOTIFY Watcher     │
│  (distributed sync)      │
└──────────────────────────┘
```

---

## 5. Migration & Rollout Strategy

### 5.1 Database Migration

```typescript
// migrations/20260109-create-casbin-rule.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCasbinRule20260109 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Main casbin_rule table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS casbin_rule (
        id SERIAL PRIMARY KEY,
        ptype VARCHAR(100) NOT NULL,
        v0 VARCHAR(256) DEFAULT '',
        v1 VARCHAR(256) DEFAULT '',
        v2 VARCHAR(256) DEFAULT '',
        v3 VARCHAR(256) DEFAULT '',
        v4 VARCHAR(256) DEFAULT '',
        v5 VARCHAR(256) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes for efficient queries
    await queryRunner.query(`
      CREATE INDEX idx_casbin_rule_ptype ON casbin_rule(ptype);
      CREATE INDEX idx_casbin_rule_v0 ON casbin_rule(v0);
      CREATE INDEX idx_casbin_rule_v1 ON casbin_rule(v1);
      CREATE INDEX idx_casbin_rule_v0_v1 ON casbin_rule(v0, v1);
      CREATE INDEX idx_casbin_rule_ptype_v0_v1 ON casbin_rule(ptype, v0, v1);
    `);

    // Policy version tracking table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS casbin_policy_version (
        id SERIAL PRIMARY KEY,
        workspace_id VARCHAR(256) NOT NULL UNIQUE,
        version INTEGER DEFAULT 1,
        policy_hash VARCHAR(64) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_policy_version_workspace ON casbin_policy_version(workspace_id);
    `);

    // Debug view
    await queryRunner.query(`
      CREATE VIEW casbin_rule_debug AS
      SELECT
        id,
        ptype,
        CASE ptype
          WHEN 'p' THEN 'permission'
          WHEN 'g' THEN 'role_assignment'
          WHEN 'g2' THEN 'resource_group'
        END as policy_type,
        v0 as subject,
        v1 as domain,
        v2 as object,
        v3 as action,
        v4 as effect,
        created_at
      FROM casbin_rule;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW IF EXISTS casbin_rule_debug');
    await queryRunner.query('DROP TABLE IF EXISTS casbin_policy_version');
    await queryRunner.query('DROP TABLE IF EXISTS casbin_rule');
  }
}
```

### 5.2 Feature Flag Configuration

```typescript
// config/rbac.config.ts
export const RBAC_CONFIG = {
  /**
   * RBAC Engine mode:
   * - 'legacy': Use existing 15-step validation (default for production)
   * - 'casbin': Use Casbin enforcer only
   * - 'shadow': Run both, log discrepancies, use legacy result
   * - 'shadow_casbin': Run both, log discrepancies, use casbin result
   */
  RBAC_ENGINE: process.env.RBAC_ENGINE as RbacEngineMode || 'legacy',

  /**
   * Resolvers to migrate (gradual rollout)
   */
  CASBIN_ENABLED_RESOLVERS: (process.env.CASBIN_ENABLED_RESOLVERS || '')
    .split(',')
    .filter(Boolean),

  /**
   * Shadow mode configuration
   */
  SHADOW_MODE: {
    enabled: process.env.RBAC_ENGINE?.startsWith('shadow') || false,
    logDiscrepancies: true,
    alertOnDiscrepancy: process.env.RBAC_SHADOW_ALERT === 'true',
    sampleRate: parseFloat(process.env.RBAC_SHADOW_SAMPLE_RATE || '1.0'),
  },
};

export type RbacEngineMode = 'legacy' | 'casbin' | 'shadow' | 'shadow_casbin';
```

### 5.3 Dual-Path Guard

```typescript
// casbin/guards/dual-path-authz.guard.ts
@Injectable()
export class DualPathAuthzGuard implements CanActivate {
  private readonly logger = new Logger(DualPathAuthzGuard.name);

  constructor(
    private readonly casbinEnforcer: CasbinEnforcerService,
    private readonly legacyOrchestrator: ValidationOrchestratorService,
    private readonly config: ConfigService,
    private readonly metricsService: RbacMetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.config.get<RbacEngineMode>('RBAC_ENGINE');
    const permission = this.reflector.get<PermissionMetadata>('permission', context.getHandler());

    if (!permission) return true;

    const { userId, workspaceId, resource, action } = this.extractContext(context);
    const startTime = Date.now();

    switch (mode) {
      case 'casbin':
        return this.casbinCheck(userId, workspaceId, resource, action);

      case 'legacy':
        return this.legacyCheck(userId, workspaceId, resource, action);

      case 'shadow':
      case 'shadow_casbin':
        return this.shadowCheck(userId, workspaceId, resource, action, mode, startTime);

      default:
        return this.legacyCheck(userId, workspaceId, resource, action);
    }
  }

  private async shadowCheck(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
    mode: RbacEngineMode,
    startTime: number,
  ): Promise<boolean> {
    // Run both checks in parallel
    const [casbinResult, legacyResult] = await Promise.all([
      this.casbinCheck(userId, workspaceId, resource, action),
      this.legacyCheck(userId, workspaceId, resource, action),
    ]);

    const latency = Date.now() - startTime;

    // Log discrepancy
    if (casbinResult !== legacyResult) {
      this.logger.warn('RBAC discrepancy detected', {
        userId,
        workspaceId,
        resource,
        action,
        casbinResult,
        legacyResult,
        latency,
      });

      this.metricsService.recordDiscrepancy({
        resource,
        action,
        casbinResult,
        legacyResult,
      });
    }

    // Return based on mode
    return mode === 'shadow_casbin' ? casbinResult : legacyResult;
  }
}
```

### 5.4 Rollout Plan by Resolver

| Phase | Resolvers | Mode | Duration | Success Criteria |
|-------|-----------|------|----------|------------------|
| **POC** | `mktCustomerResolver` | shadow | 1 week | 0 discrepancies for 48h |
| **Phase 1** | `mktOrderResolver`, `mktInvoiceResolver` | shadow | 1 week | 0 discrepancies |
| **Phase 2** | `mktLicenseResolver`, `mktPaymentResolver` | shadow_casbin | 1 week | <0.1% error rate |
| **Phase 3** | All remaining resolvers | casbin | 1 week | Stable metrics |
| **Cleanup** | Remove legacy code | casbin | 1 week | Tests passing |

---

## 6. Sync Pipeline

### 6.1 PolicySyncService (Enhanced)

```typescript
// casbin/services/policy-sync.service.ts
@Injectable()
export class PolicySyncService {
  private readonly logger = new Logger(PolicySyncService.name);
  private readonly syncLock = new Map<string, boolean>();
  private readonly DEBOUNCE_MS = 500;
  private pendingSync = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject('CASBIN_ENFORCER') private readonly enforcer: Enforcer,
    private readonly templateRepository: MktPermissionTemplateRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: RbacMetricsService,
  ) {}

  /**
   * Debounced sync - prevents rapid successive syncs
   */
  @OnEvent('permission.*')
  async onPermissionChange(payload: PermissionChangeEvent): Promise<void> {
    const { workspaceId } = payload;

    // Clear existing pending sync
    const existing = this.pendingSync.get(workspaceId);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new sync with debounce
    const timeout = setTimeout(async () => {
      await this.syncWorkspacePolicies(workspaceId);
      this.pendingSync.delete(workspaceId);
    }, this.DEBOUNCE_MS);

    this.pendingSync.set(workspaceId, timeout);
  }

  /**
   * Full sync with idempotency and conflict resolution
   */
  async syncWorkspacePolicies(workspaceId: string): Promise<SyncResult> {
    const startTime = Date.now();

    // Prevent concurrent syncs
    if (this.syncLock.get(workspaceId)) {
      this.logger.debug(`Sync already in progress for ${workspaceId}`);
      return { status: 'skipped', reason: 'sync_in_progress' };
    }

    this.syncLock.set(workspaceId, true);

    try {
      // Calculate new policy hash
      const templates = await this.templateRepository.findAllWithRelations(workspaceId);
      const newHash = this.calculatePolicyHash(templates);

      // Check if sync needed (idempotency)
      const currentVersion = await this.policyVersionRepository.findByWorkspace(workspaceId);
      if (currentVersion?.policyHash === newHash) {
        this.logger.debug(`No changes detected for ${workspaceId}`);
        return { status: 'skipped', reason: 'no_changes' };
      }

      // Clear existing policies for workspace
      await this.enforcer.removeFilteredPolicy(1, `ws:${workspaceId}`);
      await this.enforcer.removeFilteredGroupingPolicy(2, `ws:${workspaceId}`);

      // Sync templates to policies
      const policiesAdded = await this.syncTemplates(templates, workspaceId);

      // Update version
      await this.policyVersionRepository.upsert({
        workspaceId,
        version: (currentVersion?.version ?? 0) + 1,
        policyHash: newHash,
        updatedAt: new Date(),
      });

      // Notify watcher (distributed cache sync)
      await this.enforcer.getWatcher()?.update();

      const latency = Date.now() - startTime;
      this.metricsService.recordSyncSuccess(workspaceId, policiesAdded, latency);

      this.logger.log(`Synced ${policiesAdded} policies for ${workspaceId} in ${latency}ms`);

      return { status: 'success', policiesAdded, latency };

    } catch (error) {
      this.metricsService.recordSyncFailure(workspaceId, error);
      this.logger.error(`Sync failed for ${workspaceId}`, error);

      // Emit for dead-letter queue / alerting
      this.eventEmitter.emit('rbac.sync.failed', {
        workspaceId,
        error: error.message,
        timestamp: new Date(),
      });

      throw error;

    } finally {
      this.syncLock.delete(workspaceId);
    }
  }

  /**
   * Scheduled full resync (cron)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledFullResync(): Promise<void> {
    this.logger.log('Starting scheduled full resync');

    const workspaces = await this.workspaceRepository.findAllActive();

    for (const workspace of workspaces) {
      try {
        await this.syncWorkspacePolicies(workspace.id);
      } catch (error) {
        this.logger.error(`Scheduled sync failed for ${workspace.id}`, error);
      }
    }
  }

  /**
   * Manual sync endpoint
   */
  async manualSync(workspaceId: string, dryRun = false): Promise<ManualSyncResult> {
    const templates = await this.templateRepository.findAllWithRelations(workspaceId);
    const policies = this.templatesToPolicies(templates, workspaceId);

    if (dryRun) {
      const currentPolicies = await this.enforcer.getFilteredPolicy(1, `ws:${workspaceId}`);
      return {
        dryRun: true,
        current: currentPolicies,
        proposed: policies,
        diff: this.calculateDiff(currentPolicies, policies),
      };
    }

    return this.syncWorkspacePolicies(workspaceId);
  }

  private calculatePolicyHash(templates: PermissionTemplate[]): string {
    const content = JSON.stringify(
      templates.map(t => ({
        id: t.id,
        key: t.templateKey,
        resources: t.resourcePermissions,
        updatedAt: t.updatedAt,
      }))
    );
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

### 6.2 Retry with Backoff

```typescript
// casbin/services/sync-retry.service.ts
@Injectable()
export class SyncRetryService {
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 1000;

  @OnEvent('rbac.sync.failed')
  async handleSyncFailure(payload: SyncFailedEvent): Promise<void> {
    const { workspaceId, retryCount = 0 } = payload;

    if (retryCount >= this.MAX_RETRIES) {
      // Send to dead-letter queue
      await this.deadLetterQueue.add({
        workspaceId,
        failedAt: new Date(),
        lastError: payload.error,
      });

      // Alert
      await this.alertService.sendAlert({
        severity: 'high',
        title: 'RBAC Sync Failed Permanently',
        message: `Workspace ${workspaceId} sync failed after ${this.MAX_RETRIES} retries`,
      });

      return;
    }

    // Exponential backoff
    const delay = this.BASE_DELAY_MS * Math.pow(2, retryCount);

    setTimeout(async () => {
      try {
        await this.policySyncService.syncWorkspacePolicies(workspaceId);
      } catch {
        this.eventEmitter.emit('rbac.sync.failed', {
          ...payload,
          retryCount: retryCount + 1,
        });
      }
    }, delay);
  }
}
```

---

## 7. Performance & Cache Strategy

### 7.1 Cache Configuration

```typescript
// casbin/config/cache.config.ts
export const CASBIN_CACHE_CONFIG = {
  // In-memory cache (Casbin built-in)
  ENABLE_CACHE: true,

  // Policy reload interval (milliseconds)
  POLICY_RELOAD_INTERVAL_MS: 60000, // 1 minute fallback if watcher miss

  // Cache warming
  WARM_ON_STARTUP: true,
  WARM_ON_DEPLOY: true,

  // Limits per workspace
  MAX_POLICIES_PER_WORKSPACE: 10000,
  MAX_CACHE_SIZE_MB: 100,

  // Performance targets
  P95_LATENCY_TARGET_MS: 5,
  P99_LATENCY_TARGET_MS: 15,
};
```

### 7.2 Cache Warming

```typescript
// casbin/services/cache-warmer.service.ts
@Injectable()
export class CacheWarmerService implements OnModuleInit {
  constructor(
    private readonly enforcerFactory: CasbinEnforcerFactory,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly metricsService: RbacMetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (CASBIN_CACHE_CONFIG.WARM_ON_STARTUP) {
      await this.warmAllCaches();
    }
  }

  async warmAllCaches(): Promise<void> {
    const workspaces = await this.workspaceRepository.findAllActive();

    this.logger.log(`Warming caches for ${workspaces.length} workspaces`);
    const startTime = Date.now();

    // Warm in batches to avoid overwhelming database
    const BATCH_SIZE = 10;
    for (let i = 0; i < workspaces.length; i += BATCH_SIZE) {
      const batch = workspaces.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(ws => this.warmWorkspaceCache(ws.id)));
    }

    const latency = Date.now() - startTime;
    this.logger.log(`Cache warming completed in ${latency}ms`);
    this.metricsService.recordCacheWarmup(workspaces.length, latency);
  }

  async warmWorkspaceCache(workspaceId: string): Promise<void> {
    const enforcer = await this.enforcerFactory.getEnforcer(workspaceId);

    // Preload policies into memory
    await enforcer.loadPolicy();

    // Pre-compute common permission checks
    const commonChecks = await this.getCommonPermissionChecks(workspaceId);
    for (const check of commonChecks) {
      await enforcer.enforce(check.sub, check.dom, check.obj, check.act);
    }
  }
}
```

### 7.3 Batch Enforce for Lists

```typescript
// casbin/services/casbin-enforcer.service.ts (enhanced)
@Injectable()
export class CasbinEnforcerService {
  /**
   * Batch check for GraphQL list queries (DataLoader pattern)
   */
  async batchCheckResourceAccess(
    userId: string,
    workspaceId: string,
    resources: Array<{ type: string; id: string }>,
    action: string,
  ): Promise<Map<string, boolean>> {
    const requests = resources.map(r => [
      `user:${userId}`,
      `ws:${workspaceId}`,
      `${r.type}:${r.id}`,
      action,
    ]);

    const results = await this.enforcer.batchEnforce(requests);

    const resultMap = new Map<string, boolean>();
    resources.forEach((r, index) => {
      resultMap.set(`${r.type}:${r.id}`, results[index]);
    });

    return resultMap;
  }

  /**
   * Filter list to only accessible resources
   */
  async filterAccessible<T extends { id: string }>(
    userId: string,
    workspaceId: string,
    items: T[],
    resourceType: string,
    action: string,
  ): Promise<T[]> {
    const accessMap = await this.batchCheckResourceAccess(
      userId,
      workspaceId,
      items.map(i => ({ type: resourceType, id: i.id })),
      action,
    );

    return items.filter(item => accessMap.get(`${resourceType}:${item.id}`));
  }
}
```

### 7.4 Watcher Implementation (PostgreSQL NOTIFY)

**Lý do chọn PostgreSQL NOTIFY thay vì `casbin-redis-watcher`:**

| Tiêu chí | `casbin-redis-watcher` | PostgreSQL NOTIFY |
|----------|------------------------|-------------------|
| Stars | 7 ⭐ | N/A (built-in PG) |
| Last update | Aug 2022 (deprecated) | Native PostgreSQL |
| Dependencies | Thêm Redis | Không cần thêm |
| Maintenance | Không active | PostgreSQL team |

**Implementation (Recommended):**

```typescript
// casbin/watchers/pg-notify.watcher.ts
import { Client } from 'pg';
import { Watcher } from 'casbin';
import { Logger } from '@nestjs/common';

export class PgNotifyWatcher implements Watcher {
  private readonly logger = new Logger(PgNotifyWatcher.name);
  private client: Client;
  private callback: () => void;
  private readonly channel = 'casbin_policy_update';
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(private readonly connectionString: string) {
    this.client = new Client({ connectionString });
  }

  async init(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.query(`LISTEN ${this.channel}`);

      this.client.on('notification', (msg) => {
        if (msg.channel === this.channel && this.callback) {
          this.logger.debug(`Policy update received: ${msg.payload}`);
          this.callback();
        }
      });

      this.client.on('error', async (err) => {
        this.logger.error('PG Watcher connection error', err);
        await this.handleReconnect();
      });

      this.reconnectAttempts = 0;
      this.logger.log('PG NOTIFY watcher connected');
    } catch (error) {
      this.logger.error('Failed to connect PG watcher', error);
      await this.handleReconnect();
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.logger.warn(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      this.client = new Client({ connectionString: this.connectionString });
      await this.connect();
    }, delay);
  }

  setUpdateCallback(callback: () => void): void {
    this.callback = callback;
  }

  async update(): Promise<boolean> {
    try {
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        source: process.env.HOSTNAME || 'unknown',
      });
      await this.client.query(`NOTIFY ${this.channel}, '${payload}'`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send NOTIFY', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.query(`UNLISTEN ${this.channel}`);
    await this.client.end();
    this.logger.log('PG NOTIFY watcher closed');
  }

  isConnected(): boolean {
    return this.client !== null && this.reconnectAttempts === 0;
  }
}
```

**Sử dụng trong CasbinModule:**

```typescript
// casbin/casbin.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([CasbinRule])],
  providers: [
    CasbinEnforcerService,
    PolicySyncService,
    {
      provide: 'CASBIN_ENFORCER',
      useFactory: async (dataSource: DataSource, configService: ConfigService) => {
        const adapter = await TypeORMAdapter.newAdapter({
          type: 'postgres',
          ...dataSource.options,
        });

        const enforcer = await newEnforcer(
          'casbin/models/rbac-domains.conf',
          adapter,
        );

        // Setup PostgreSQL NOTIFY watcher
        const pgConnectionString = configService.get<string>('DATABASE_URL');
        const watcher = new PgNotifyWatcher(pgConnectionString);
        await watcher.init();
        enforcer.setWatcher(watcher);

        // Auto-reload on notification
        watcher.setUpdateCallback(() => {
          enforcer.loadPolicy();
        });

        return enforcer;
      },
      inject: [DataSource, ConfigService],
    },
  ],
  exports: [CasbinEnforcerService, 'CASBIN_ENFORCER'],
})
export class CasbinModule {}
```

**Giới hạn PostgreSQL NOTIFY:**
- Payload tối đa 8000 bytes (đủ cho policy sync signals)
- Không persist messages (nếu client disconnect sẽ miss)
- Giải pháp: Scheduled full resync mỗi giờ (đã có trong PolicySyncService)

### 7.5 Policy Size Monitoring

```typescript
// casbin/services/policy-monitor.service.ts
@Injectable()
export class PolicyMonitorService {
  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorPolicySizes(): Promise<void> {
    const workspaces = await this.workspaceRepository.findAllActive();

    for (const workspace of workspaces) {
      const policyCount = await this.getPolicyCount(workspace.id);

      if (policyCount > CASBIN_CACHE_CONFIG.MAX_POLICIES_PER_WORKSPACE * 0.8) {
        this.logger.warn(`Workspace ${workspace.id} approaching policy limit: ${policyCount}`);
        this.metricsService.recordPolicySizeWarning(workspace.id, policyCount);
      }

      if (policyCount > CASBIN_CACHE_CONFIG.MAX_POLICIES_PER_WORKSPACE) {
        this.alertService.sendAlert({
          severity: 'critical',
          title: 'Policy limit exceeded',
          message: `Workspace ${workspace.id} has ${policyCount} policies (limit: ${CASBIN_CACHE_CONFIG.MAX_POLICIES_PER_WORKSPACE})`,
        });
      }
    }
  }
}
```

---

## 8. Observability

### 8.1 Metrics

```typescript
// casbin/services/rbac-metrics.service.ts
@Injectable()
export class RbacMetricsService {
  private readonly metrics = {
    // Decision metrics
    decisionLatency: new promClient.Histogram({
      name: 'rbac_decision_latency_seconds',
      help: 'Permission check latency',
      labelNames: ['resource', 'action', 'result'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
    }),

    decisionTotal: new promClient.Counter({
      name: 'rbac_decisions_total',
      help: 'Total permission decisions',
      labelNames: ['resource', 'action', 'result'],
    }),

    // Cache metrics
    cacheHitRate: new promClient.Gauge({
      name: 'rbac_cache_hit_rate',
      help: 'Cache hit rate percentage',
    }),

    // Sync metrics
    syncLatency: new promClient.Histogram({
      name: 'rbac_sync_latency_seconds',
      help: 'Policy sync latency',
      labelNames: ['workspace_id', 'status'],
    }),

    syncFailures: new promClient.Counter({
      name: 'rbac_sync_failures_total',
      help: 'Policy sync failures',
      labelNames: ['workspace_id', 'error_type'],
    }),

    // Policy metrics
    policyCount: new promClient.Gauge({
      name: 'rbac_policies_total',
      help: 'Total policies per workspace',
      labelNames: ['workspace_id', 'policy_type'],
    }),

    // Deny reasons (top-K)
    denyReasons: new promClient.Counter({
      name: 'rbac_deny_reasons_total',
      help: 'Permission deny reasons',
      labelNames: ['resource', 'action', 'reason'],
    }),
  };

  recordDecision(params: {
    resource: string;
    action: string;
    result: boolean;
    latencyMs: number;
    denyReason?: string;
  }): void {
    const { resource, action, result, latencyMs, denyReason } = params;
    const resultLabel = result ? 'allow' : 'deny';

    this.metrics.decisionLatency.observe(
      { resource, action, result: resultLabel },
      latencyMs / 1000,
    );

    this.metrics.decisionTotal.inc({ resource, action, result: resultLabel });

    if (!result && denyReason) {
      this.metrics.denyReasons.inc({ resource, action, reason: denyReason });
    }
  }
}
```

### 8.2 Tracing

```typescript
// casbin/interceptors/tracing.interceptor.ts
@Injectable()
export class RbacTracingInterceptor implements NestInterceptor {
  constructor(private readonly tracer: Tracer) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const permission = this.reflector.get<PermissionMetadata>('permission', context.getHandler());

    if (!permission) return next.handle();

    const span = this.tracer.startSpan('rbac.enforce', {
      attributes: {
        'rbac.resource': permission.resource,
        'rbac.action': permission.action,
        'rbac.workspace_id': this.extractWorkspaceId(context),
        'rbac.user_id': this.extractUserId(context),
      },
    });

    return next.handle().pipe(
      tap({
        next: () => {
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
        },
        error: (error) => {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
          span.end();
        },
      }),
    );
  }
}
```

### 8.3 Health Check

```typescript
// casbin/health/rbac-health.indicator.ts
@Injectable()
export class RbacHealthIndicator extends HealthIndicator {
  constructor(
    @Inject('CASBIN_ENFORCER') private readonly enforcer: Enforcer,
    @Inject('PG_NOTIFY_WATCHER') private readonly watcher: PgNotifyWatcher,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const checks = await Promise.all([
      this.checkEnforcer(),
      this.checkPgWatcher(),
      this.checkPolicyLoad(),
    ]);

    const isHealthy = checks.every(c => c.healthy);

    return this.getStatus(key, isHealthy, {
      enforcer: checks[0],
      pg_watcher: checks[1],
      policy_load: checks[2],
    });
  }

  private async checkEnforcer(): Promise<{ healthy: boolean; latency_ms: number }> {
    const start = Date.now();
    try {
      // Test enforcement
      await this.enforcer.enforce('health:check', 'ws:test', 'resource', 'read');
      return { healthy: true, latency_ms: Date.now() - start };
    } catch {
      return { healthy: false, latency_ms: Date.now() - start };
    }
  }

  private async checkPgWatcher(): Promise<{ healthy: boolean; connected: boolean }> {
    try {
      const connected = this.watcher.isConnected();
      return { healthy: connected, connected };
    } catch {
      return { healthy: false, connected: false };
    }
  }

  private async checkPolicyLoad(): Promise<{ healthy: boolean; policy_count: number }> {
    try {
      const policies = await this.enforcer.getPolicy();
      return { healthy: policies.length > 0, policy_count: policies.length };
    } catch {
      return { healthy: false, policy_count: 0 };
    }
  }
}
```

---

## 9. Security

### 9.1 PII Masking in Audit

```typescript
// audit/services/permission-audit.service.ts
@Injectable()
export class PermissionAuditService {
  private readonly PII_FIELDS = ['email', 'phone', 'ssn', 'creditCard', 'password'];

  async logPermissionCheck(params: AuditLogParams): Promise<void> {
    const maskedParams = this.maskPII(params);

    await this.auditRepository.create({
      ...maskedParams,
      timestamp: DateTimeUtils.now(),
      source: 'casbin',
      // Append-only - no updates allowed
      immutable: true,
    });
  }

  private maskPII(params: AuditLogParams): AuditLogParams {
    const masked = _.cloneDeep(params);

    if (masked.context) {
      for (const field of this.PII_FIELDS) {
        if (masked.context[field]) {
          masked.context[field] = this.mask(String(masked.context[field]));
        }
      }
    }

    return masked;
  }

  private mask(value: string): string {
    if (value.length <= 4) return '****';
    return value.slice(0, 2) + '***' + value.slice(-2);
  }
}
```

### 9.2 Tamper-Proof Audit Log

```typescript
// audit/services/audit-integrity.service.ts
@Injectable()
export class AuditIntegrityService {
  private previousHash: string = '';

  async appendAuditLog(entry: AuditLogEntry): Promise<string> {
    // Create hash chain (blockchain-like)
    const entryHash = this.calculateHash({
      ...entry,
      previousHash: this.previousHash,
    });

    await this.auditRepository.create({
      ...entry,
      hash: entryHash,
      previousHash: this.previousHash,
    });

    this.previousHash = entryHash;
    return entryHash;
  }

  async verifyIntegrity(startId: number, endId: number): Promise<IntegrityResult> {
    const entries = await this.auditRepository.findRange(startId, endId);

    let previousHash = entries[0]?.previousHash || '';
    const violations: number[] = [];

    for (const entry of entries) {
      const expectedHash = this.calculateHash({
        ..._.omit(entry, ['hash']),
        previousHash,
      });

      if (entry.hash !== expectedHash) {
        violations.push(entry.id);
      }

      previousHash = entry.hash;
    }

    return {
      verified: violations.length === 0,
      totalChecked: entries.length,
      violations,
    };
  }

  private calculateHash(data: Record<string, unknown>): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
}
```

### 9.3 Permission Escalation Control

```typescript
// casbin/guards/escalation-prevention.guard.ts
@Injectable()
export class EscalationPreventionGuard implements CanActivate {
  constructor(
    private readonly enforcer: CasbinEnforcerService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const isPolicyModification = this.reflector.get<boolean>('modifiesPolicy', handler);

    if (!isPolicyModification) return true;

    const { user, workspaceId, targetPolicy } = this.extractContext(context);

    // Check if user can manage policies
    const canManagePolicies = await this.enforcer.checkPermission({
      userId: user.id,
      workspaceId,
      resource: 'rbac:policy',
      action: 'manage',
    });

    if (!canManagePolicies) {
      throw new ForbiddenException('Insufficient permissions to modify policies');
    }

    // Prevent self-escalation
    if (this.isSelfEscalation(user, targetPolicy)) {
      throw new ForbiddenException('Cannot modify own permissions');
    }

    // Prevent assigning higher roles
    if (targetPolicy.type === 'role_assignment') {
      const validation = await this.policyValidator.validateGroupingPolicy(
        targetPolicy,
        workspaceId,
        user.roles,
      );

      if (!validation.valid) {
        throw new ForbiddenException(validation.errors.join(', '));
      }
    }

    // Require approval for sensitive changes (optional 2-step)
    if (this.requiresApproval(targetPolicy)) {
      await this.createApprovalRequest(user, targetPolicy);
      throw new ForbiddenException('Policy change requires approval');
    }

    return true;
  }

  private isSelfEscalation(user: User, policy: CasbinPolicy): boolean {
    return policy.subject === `user:${user.id}` &&
           (policy.action === '*' || policy.effect === 'allow');
  }
}
```

---

## 10. Testing Strategy

### 10.1 Test Matrix

```typescript
// casbin/__tests__/rbac-test-matrix.ts
export const RBAC_TEST_MATRIX = {
  // RBAC Tests
  rbac: [
    { name: 'basic_allow', sub: 'user:1', dom: 'ws:1', obj: 'customer', act: 'read', expected: true },
    { name: 'basic_deny', sub: 'user:2', dom: 'ws:1', obj: 'admin', act: 'delete', expected: false },
    { name: 'role_inherit', sub: 'user:admin', dom: 'ws:1', obj: 'customer', act: 'delete', expected: true },
    { name: 'cross_tenant_deny', sub: 'user:1', dom: 'ws:2', obj: 'customer', act: 'read', expected: false },
    { name: 'resource_hierarchy', sub: 'user:manager', dom: 'ws:1', obj: 'order', act: 'read', expected: true },
    { name: 'explicit_deny', sub: 'user:sales', dom: 'ws:1', obj: 'salary', act: 'read', expected: false },
  ],

  // ABAC Tests
  abac: [
    {
      name: 'time_valid',
      sub: 'user:temp',
      dom: 'ws:1',
      obj: 'report',
      act: 'read',
      attr: { currentTime: '2026-02-01T10:00:00Z' },
      expected: true,
    },
    {
      name: 'time_expired',
      sub: 'user:temp',
      dom: 'ws:1',
      obj: 'report',
      act: 'read',
      attr: { currentTime: '2026-04-01T10:00:00Z' },
      expected: false,
    },
    {
      name: 'dept_descendant',
      sub: 'user:dept_mgr',
      dom: 'ws:1',
      obj: 'order',
      act: 'approve',
      attr: { userDept: 'dept:sales', resourceDept: 'dept:sales-north' },
      expected: true,
    },
    {
      name: 'clearance_insufficient',
      sub: 'user:intern',
      dom: 'ws:1',
      obj: 'classified',
      act: 'read',
      attr: { userClearance: 1, requiredClearance: 3 },
      expected: false,
    },
  ],

  // Edge Cases
  edge_cases: [
    { name: 'empty_subject', sub: '', dom: 'ws:1', obj: 'any', act: 'read', expected: false },
    { name: 'wildcard_resource', sub: 'user:admin', dom: 'ws:1', obj: '*', act: 'read', expected: true },
    { name: 'special_chars', sub: 'user:test@domain.com', dom: 'ws:1', obj: 'resource', act: 'read', expected: true },
  ],
};
```

### 10.2 Golden File Tests

```typescript
// casbin/__tests__/golden/matcher.test.ts
describe('Casbin Matcher Golden Tests', () => {
  let enforcer: Enforcer;

  beforeAll(async () => {
    enforcer = await newEnforcer(
      'casbin/models/rbac-domains.conf',
      'casbin/__tests__/golden/policies.csv',
    );
  });

  // Load golden file expectations
  const goldenTests = loadGoldenFile('casbin/__tests__/golden/expected-results.json');

  test.each(goldenTests)('$name', async ({ input, expected }) => {
    const result = await enforcer.enforce(
      input.sub,
      input.dom,
      input.obj,
      input.act,
    );
    expect(result).toBe(expected);
  });

  // Snapshot test for policy changes
  test('policy snapshot', async () => {
    const allPolicies = await enforcer.getPolicy();
    expect(allPolicies).toMatchSnapshot();
  });
});
```

### 10.3 Contract Tests

```typescript
// casbin/__tests__/contract/sync.contract.test.ts
describe('Policy Sync Contract Tests', () => {
  let syncService: PolicySyncService;
  let enforcer: Enforcer;

  beforeEach(async () => {
    // Setup with test database
  });

  test('workspace entity changes sync to casbin', async () => {
    // Given: a permission template in workspace entity
    const template = await templateRepository.create({
      workspaceId: 'ws:test',
      templateKey: 'sales_rep',
      resourcePermissions: [
        { resourceName: 'mktCustomer', allowedActions: ['read', 'create'] },
      ],
    });

    // When: sync is triggered
    await syncService.syncWorkspacePolicies('ws:test');

    // Then: policies exist in casbin
    const hasReadCustomer = await enforcer.enforce(
      'tpl:sales_rep',
      'ws:test',
      'mktCustomer',
      'read',
    );
    expect(hasReadCustomer).toBe(true);

    const hasDeleteCustomer = await enforcer.enforce(
      'tpl:sales_rep',
      'ws:test',
      'mktCustomer',
      'delete',
    );
    expect(hasDeleteCustomer).toBe(false);
  });

  test('user-template assignment syncs to grouping policy', async () => {
    // Given: user assigned to template
    await userTemplateRepository.create({
      workspaceMemberId: 'user:123',
      templateId: template.id,
      workspaceId: 'ws:test',
    });

    // When: sync is triggered
    await syncService.syncWorkspacePolicies('ws:test');

    // Then: user inherits template permissions
    const hasPermission = await enforcer.enforce(
      'user:123',
      'ws:test',
      'mktCustomer',
      'read',
    );
    expect(hasPermission).toBe(true);
  });
});
```

### 10.4 Chaos/Failure Tests

```typescript
// casbin/__tests__/chaos/failure.test.ts
describe('RBAC Failure Mode Tests', () => {
  test('database down - uses in-memory cache', async () => {
    // Given: policies loaded in cache
    await enforcer.loadPolicy();

    // When: database connection lost
    await mockDatabaseDisconnect();

    // Then: enforcement still works with in-memory cached policies
    const result = await enforcer.enforce('user:1', 'ws:1', 'customer', 'read');
    expect(result).toBe(true); // Uses cached result
  });

  test('database down - new uncached requests fail-closed', async () => {
    // Given: database is down, cache empty
    await mockDatabaseDisconnect();
    enforcer.clearPolicy(); // Clear in-memory cache

    // When: new uncached permission check
    const result = await enforcerService.checkPermission({
      userId: 'user:new',
      workspaceId: 'ws:1',
      resource: 'customer',
      action: 'read',
    });

    // Then: fail-closed (deny)
    expect(result).toBe(false);
    expect(metricsService.getMetric('rbac_failclosed_total')).toBeGreaterThan(0);
  });

  test('partial sync recovery', async () => {
    // Given: sync interrupted halfway
    const syncPromise = syncService.syncWorkspacePolicies('ws:1');
    await simulateNetworkFailure(500); // Fail after 500ms

    // When: sync is retried
    await syncService.syncWorkspacePolicies('ws:1');

    // Then: policies are consistent
    const policyCount = await enforcer.getFilteredPolicy(1, 'ws:1');
    expect(policyCount.length).toBe(expectedPolicies);
  });

  test('PG NOTIFY watcher disconnect - alerts fired', async () => {
    // Given: watcher connected
    const watcher = enforcer.getWatcher() as PgNotifyWatcher;
    expect(watcher.isConnected()).toBe(true);

    // When: watcher disconnects
    await watcher.close();
    await sleep(1000); // Wait for health check

    // Then: alert is fired
    expect(alertService.getAlerts()).toContainEqual(
      expect.objectContaining({ title: 'RBAC PG Watcher Disconnected' })
    );
  });

  test('PG NOTIFY watcher auto-reconnects', async () => {
    // Given: watcher loses connection
    const watcher = enforcer.getWatcher() as PgNotifyWatcher;
    await simulatePgConnectionLoss();

    // When: wait for auto-reconnect (exponential backoff)
    await sleep(3000);

    // Then: watcher reconnects
    expect(watcher.isConnected()).toBe(true);
  });
});
```

---

## 11. Failure Modes & Recovery

### 11.1 Failure Mode Matrix

| Failure | Detection | Behavior | Recovery |
|---------|-----------|----------|----------|
| PostgreSQL down | Health check, connection error | Fail-closed (deny all) | Auto-reconnect with backoff |
| PG NOTIFY disconnect | Watcher health check | Continue with stale policy, full resync hourly | Auto-reconnect, manual resync |
| Partial sync | Hash mismatch | Retry sync | Full resync on next cron |
| Policy corruption | Hash verification fail | Reject load, use previous | Alert + manual intervention |
| Enforcer OOM | Memory threshold | Evict old policies | Restart with smaller cache |

### 11.2 Fail-Closed Implementation

```typescript
// casbin/services/casbin-enforcer.service.ts
@Injectable()
export class CasbinEnforcerService {
  private readonly FAIL_CLOSED = true; // Security default

  async checkPermission(input: PermissionCheckInput): Promise<boolean> {
    const startTime = Date.now();

    try {
      const result = await this.enforcer.enforce(
        `user:${input.userId}`,
        `ws:${input.workspaceId}`,
        input.resource,
        input.action,
      );

      this.metricsService.recordDecision({
        ...input,
        result,
        latencyMs: Date.now() - startTime,
      });

      return result;

    } catch (error) {
      this.logger.error('Enforcement failed', { error, input });

      this.metricsService.recordFailure({
        ...input,
        errorType: error.constructor.name,
        latencyMs: Date.now() - startTime,
      });

      // Fail-closed: deny on error for security
      if (this.FAIL_CLOSED) {
        this.logger.warn('Fail-closed: denying permission due to error');
        return false;
      }

      throw error;
    }
  }
}
```

### 11.3 Recovery Playbook

```yaml
# playbooks/rbac-recovery.yaml
name: RBAC Recovery Playbook

scenarios:
  postgresql_failure:
    detection:
      - Alert: "RBAC PostgreSQL Connection Lost"
      - Metric: pg_connection_errors > 0
    steps:
      - Check PostgreSQL status: pg_isready -h <host> -p <port>
      - Verify network connectivity to database
      - System operates in fail-closed mode (deny all)
      - Once PostgreSQL restored, enforcer auto-reconnects
      - Trigger manual resync: npx nx run twenty-server:command rbac:sync
      - Verify metrics: rbac_policy_count returns to normal
    rollback: null  # Automatic recovery via PgNotifyWatcher reconnect

  pg_notify_watcher_disconnect:
    detection:
      - Alert: "RBAC PG Watcher Disconnected"
      - Health check: pg_watcher.connected = false
    steps:
      - Check PostgreSQL LISTEN/NOTIFY status
      - Watcher auto-reconnects with exponential backoff (max 5 attempts)
      - If max attempts reached, restart application
      - Policies still served from in-memory cache
      - Hourly cron will perform full resync
    rollback:
      - Manual restart: pm2 restart twenty-server
      - Force resync: npx nx run twenty-server:command rbac:sync --force

  policy_sync_failure:
    detection:
      - Alert: "RBAC Sync Failed Permanently"
      - Metric: rbac_sync_failures_total increasing
    steps:
      - Check dead-letter queue in database: SELECT * FROM rbac_sync_dlq
      - Identify failed workspace from logs
      - Manual sync with dry-run: npx nx run twenty-server:command rbac:sync -- --workspace=<id> --dry-run
      - Review diff and apply: npx nx run twenty-server:command rbac:sync -- --workspace=<id>
      - Clear DLQ entry: DELETE FROM rbac_sync_dlq WHERE workspace_id = '<id>'
    rollback:
      - Restore from casbin_policy_version backup
      - Trigger full resync

  corrupted_policies:
    detection:
      - Alert: "RBAC Policy Integrity Check Failed"
      - Audit: integrity check violations in logs
    steps:
      - Identify corrupted entries: SELECT * FROM casbin_rule_debug WHERE ...
      - Backup current state: pg_dump -t casbin_rule > backup.sql
      - Clear affected workspace policies: DELETE FROM casbin_rule WHERE v1 = 'ws:<id>'
      - Trigger full resync from workspace entities
      - Verify integrity: npx nx run twenty-server:command rbac:verify-integrity -- --workspace=<id>
    rollback:
      - Restore from backup: psql < backup.sql
      - Switch to legacy mode: RBAC_ENGINE=legacy
```

---

## 12. Developer Ergonomics

### 12.1 @RequirePermission Decorator

```typescript
// decorators/require-permission.decorator.ts
export const RequirePermission = (
  resource: string,
  action: string,
  options?: PermissionOptions,
): MethodDecorator => {
  return applyDecorators(
    SetMetadata('permission', { resource, action, ...options }),
    UseGuards(CasbinAuthzGuard),
  );
};

// Usage
@Resolver(() => MktCustomer)
export class MktCustomerResolver {
  @Query(() => [MktCustomer])
  @RequirePermission('mktCustomer', 'read')
  async customers(): Promise<MktCustomer[]> {
    // ...
  }

  @Mutation(() => MktCustomer)
  @RequirePermission('mktCustomer', 'create')
  async createCustomer(@Args('input') input: CreateCustomerInput): Promise<MktCustomer> {
    // ...
  }

  @Mutation(() => Boolean)
  @RequirePermission('mktCustomer', 'delete', {
    checkOwnership: true,
    auditLevel: 'high',
  })
  async deleteCustomer(@Args('id') id: string): Promise<boolean> {
    // ...
  }
}
```

### 12.2 Standardized Error Responses

```typescript
// casbin/errors/permission-denied.error.ts
export class PermissionDeniedError extends ForbiddenException {
  constructor(params: {
    resource: string;
    action: string;
    reason?: string;
  }) {
    super({
      code: 'PERMISSION_DENIED',
      message: `Access denied: cannot ${params.action} ${params.resource}`,
      resource: params.resource,
      action: params.action,
      reason: params.reason || 'insufficient_permissions',
    });
  }
}

// GraphQL error formatting
export const PERMISSION_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_NOT_ASSIGNED: 'ROLE_NOT_ASSIGNED',
  POLICY_EXPIRED: 'POLICY_EXPIRED',
  CROSS_TENANT_ACCESS: 'CROSS_TENANT_ACCESS',
  ESCALATION_PREVENTED: 'ESCALATION_PREVENTED',
} as const;
```

### 12.3 CLI Commands

```bash
# Sync policies for workspace
npx nx run twenty-server:command rbac:sync -- --workspace=<id>

# Dry-run sync (show diff)
npx nx run twenty-server:command rbac:sync -- --workspace=<id> --dry-run

# Warm cache for all workspaces
npx nx run twenty-server:command rbac:warm-cache

# Check permission (debugging)
npx nx run twenty-server:command rbac:check -- \
  --user=user:123 \
  --workspace=ws:456 \
  --resource=mktCustomer \
  --action=read

# Verify policy integrity
npx nx run twenty-server:command rbac:verify-integrity -- --workspace=<id>

# Export policies for workspace
npx nx run twenty-server:command rbac:export -- --workspace=<id> --format=csv

# Import policies
npx nx run twenty-server:command rbac:import -- --file=policies.csv --workspace=<id>
```

### 12.4 Developer Documentation

```markdown
# Adding a New Resource/Action

## Checklist

1. [ ] Define resource in `constants/resources.ts`
2. [ ] Add actions in `constants/actions.ts`
3. [ ] Update workspace entity (if needed)
4. [ ] Add to permission template UI options
5. [ ] Add `@RequirePermission` to resolver methods
6. [ ] Add test cases to RBAC_TEST_MATRIX
7. [ ] Trigger policy sync for affected workspaces
8. [ ] Update documentation

## Example: Adding "mktReport" Resource

```typescript
// 1. constants/resources.ts
export const RBAC_RESOURCES = {
  // ... existing
  MKT_REPORT: 'mktReport',
} as const;

// 2. constants/actions.ts
export const RBAC_ACTIONS = {
  // ... existing
  GENERATE: 'generate',
  EXPORT: 'export',
} as const;

// 3. resolver
@Resolver(() => MktReport)
export class MktReportResolver {
  @Query(() => MktReport)
  @RequirePermission(RBAC_RESOURCES.MKT_REPORT, RBAC_ACTIONS.READ)
  async report(@Args('id') id: string): Promise<MktReport> {
    // ...
  }

  @Mutation(() => MktReport)
  @RequirePermission(RBAC_RESOURCES.MKT_REPORT, RBAC_ACTIONS.GENERATE)
  async generateReport(@Args('input') input: GenerateReportInput): Promise<MktReport> {
    // ...
  }
}

// 4. Test matrix addition
// casbin/__tests__/rbac-test-matrix.ts
{
  name: 'report_generate',
  sub: 'user:analyst',
  dom: 'ws:1',
  obj: 'mktReport',
  act: 'generate',
  expected: true,
},
```
```

---

## 13. Migration Checklist (Updated)

### Phase 1: Setup (Week 1)
- [ ] Install Casbin packages: `casbin`, `@casbin/typeorm-adapter` (73⭐, 232 dependents, actively maintained)
- [ ] Create Casbin model files (`rbac-domains.conf`, `abac-hybrid.conf`)
- [ ] Create `casbin_rule` table migration with indexes
- [ ] Create `casbin_policy_version` table
- [ ] Create CasbinModule with TypeORM adapter
- [ ] Create custom functions for department tree
- [ ] Seed sample policies for development
- [ ] Setup metrics and tracing

### Phase 2: Integration (Week 2)
- [ ] Create PolicySyncService with debounce and idempotency
- [ ] Create PolicyValidator for cross-tenant prevention
- [ ] Create WorkspaceFilteredAdapter
- [ ] Create CasbinEnforcerService with batch support
- [ ] Create CasbinAuthzGuard
- [ ] Create `@RequirePermission` decorator
- [ ] Setup PgNotifyWatcher (PostgreSQL NOTIFY - xem Section 7.4)
- [ ] Create cache warming service
- [ ] Create health check indicator
- [ ] Setup CLI commands

### Phase 3: Shadow Mode (Week 3)
- [ ] Create DualPathAuthzGuard
- [ ] Configure feature flag `RBAC_ENGINE=shadow`
- [ ] Deploy to staging with shadow mode
- [ ] Monitor discrepancy metrics for 48h
- [ ] Fix any discrepancies found
- [ ] POC: Enable Casbin for `mktCustomerResolver`
- [ ] Monitor P95 latency target (< 5ms)

### Phase 4: Gradual Rollout (Week 4)
- [ ] Enable for `mktOrderResolver`, `mktInvoiceResolver`
- [ ] Switch to `shadow_casbin` mode
- [ ] Monitor for 48h
- [ ] Enable for remaining resolvers
- [ ] Full Casbin mode (`RBAC_ENGINE=casbin`)
- [ ] Performance validation

### Phase 5: Cleanup (Week 5)
- [ ] Remove 15-step services
- [ ] Simplify types (remove step interfaces)
- [ ] Remove old cache manager
- [ ] Remove legacy guard
- [ ] Remove feature flag code
- [ ] Update all documentation
- [ ] Archive legacy code (git tag)

---

## 14. Answers to Review Questions

### Q1: Hybrid mode hay Casbin 100%?
**A:** Khuyến nghị **Casbin 100%** cho enforcement. Tuy nhiên:
- Phase chuyển đổi sử dụng shadow mode để đảm bảo tương thích
- Custom functions (department tree) được implement trong Casbin
- Complex async logic (approval workflow) nằm ngoài Casbin, trigger qua events

### Q2: Ai được quản lý templates và ABAC conditions?
**A:**
- Super Admin: Full access, tạo/sửa mọi templates
- Admin: Tạo/sửa templates trong workspace của mình
- Có `EscalationPreventionGuard` ngăn self-escalation
- Approval 2-step là optional (configurable), áp dụng cho sensitive policies

### Q3: Department tree: precomputed hay runtime?
**A:** **Precomputed ancestor list** cho O(1) lookup:
- Khi department thay đổi → trigger recompute ancestors
- Store trong PostgreSQL table `department_ancestors` (hoặc in-memory cache)
- Custom function `isDescendant()` lookup từ cache
- Full recompute mỗi giờ để đảm bảo consistency

### Q4: Fail-closed khi PostgreSQL down?
**A:** **Fail-closed** là default cho security:
- In-memory cached policies vẫn hoạt động (Casbin built-in cache)
- New requests không có cache → deny
- Health check alert khi PG Watcher disconnect
- PgNotifyWatcher auto-reconnects với exponential backoff
- Hourly cron full resync để recover từ missed notifications

---

## 15. Risk Assessment (Updated)

| Risk | Mitigation | Fallback | Owner |
|------|------------|----------|-------|
| Policy sync issues | Debounce + idempotency + version hash | Manual sync + DLQ | Backend |
| Cross-tenant leak | PolicyValidator + FilteredAdapter | Audit + alert | Security |
| Performance regression | BatchEnforce + cache warm + P95 monitoring | Increase cache, reduce policy size | DevOps |
| Complex ABAC not supported | Custom functions in matcher | Keep specific step logic | Backend |
| Migration data loss | Shadow mode + discrepancy logging | Rollback script + tag | Backend |
| PostgreSQL failure | Health check + in-memory cache | Fail-closed + PG reconnect | DevOps |
| PG Watcher disconnect | Auto-reconnect + hourly full resync | Manual resync + alert | DevOps |
| Privilege escalation | EscalationPreventionGuard + audit | Manual review | Security |

---

## 16. Success Metrics (Updated)

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Code lines | ~15,000 | ~2,500 | `cloc` |
| Avg response time (P50) | 50-100ms | 3-5ms | APM |
| P95 response time | 200ms | 10ms | APM |
| Cache hit rate | 60% | 95% | Prometheus |
| Test coverage | 30% | 85% | Jest |
| Shadow mode discrepancy | N/A | 0% | Custom metric |
| Policy sync latency | N/A | <500ms | Prometheus |
| Time to add permission | 2-4 hours | 15 minutes | Dev feedback |
| Cross-tenant incidents | Unknown | 0 | Audit log |

---

*Document version: 2.0*
*Created: 2026-01-08*
*Updated: 2026-01-09*
*Review status: Addressed all review comments*
