# Casbin Implementation Guide

> Hướng dẫn triển khai chi tiết module Casbin Authorization theo Twenty CRM patterns

---

## Mục lục

1. [Folder Structure](#1-folder-structure)
2. [Dependencies](#2-dependencies)
3. [Constants & Types](#3-constants--types)
4. [Messages Pattern](#4-messages-pattern)
5. [Casbin Models](#5-casbin-models)
6. [PgNotifyWatcher](#6-pgnotifywatcher)
7. [Adapters](#7-adapters)
8. [Validators](#8-validators)
9. [Repositories](#9-repositories)
10. [Services](#10-services)
11. [Guards](#11-guards)
12. [Decorators](#12-decorators)
13. [Module Definition](#13-module-definition)
14. [Migrations](#14-migrations)
15. [CLI Commands](#15-cli-commands)
16. [Tests](#16-tests)
17. [Integration Guide](#17-integration-guide)

---

## 1. Folder Structure

Theo chuẩn mkt-core module (invoice làm reference):

```
mkt-rbac-enterprise-grade/
├── casbin/                              # Core Casbin implementation
│   ├── models/                          # Casbin model definitions
│   │   ├── rbac-domains.conf            # RBAC model với domains
│   │   └── abac-hybrid.conf             # ABAC model cho conditions
│   │
│   ├── adapters/                        # Custom adapters
│   │   ├── index.ts                     # Export barrel
│   │   ├── twenty-typeorm.adapter.ts    # TypeORM adapter configuration
│   │   └── workspace-filtered.adapter.ts # Filtered adapter per workspace
│   │
│   ├── watchers/                        # Policy change watchers
│   │   ├── index.ts                     # Export barrel
│   │   └── pg-notify.watcher.ts         # PostgreSQL NOTIFY watcher
│   │
│   ├── functions/                       # Custom Casbin functions
│   │   ├── index.ts                     # Export barrel
│   │   └── department-functions.ts      # Department hierarchy functions
│   │
│   ├── validators/                      # Policy validators
│   │   ├── index.ts                     # Export barrel
│   │   └── policy.validator.ts          # Cross-tenant & escalation checks
│   │
│   ├── services/                        # Core services
│   │   ├── index.ts                     # Export barrel
│   │   ├── casbin-enforcer.service.ts   # Main enforcement service
│   │   ├── casbin-enforcer.factory.ts   # Enforcer factory per workspace
│   │   ├── policy-sync.service.ts       # Sync policies from entities
│   │   ├── sync-retry.service.ts        # Retry with backoff
│   │   ├── cache-warmer.service.ts      # Cache warming on startup
│   │   ├── policy-monitor.service.ts    # Monitor policy sizes
│   │   └── rbac-metrics.service.ts      # Prometheus metrics
│   │
│   ├── guards/                          # Authorization guards
│   │   ├── index.ts                     # Export barrel
│   │   ├── casbin-authz.guard.ts        # Main authorization guard
│   │   ├── dual-path-authz.guard.ts     # Shadow mode guard
│   │   └── escalation-prevention.guard.ts # Prevent privilege escalation
│   │
│   ├── interceptors/                    # Interceptors
│   │   ├── index.ts                     # Export barrel
│   │   └── tracing.interceptor.ts       # Distributed tracing
│   │
│   ├── health/                          # Health checks
│   │   ├── index.ts                     # Export barrel
│   │   └── rbac-health.indicator.ts     # Health indicator
│   │
│   ├── errors/                          # Custom errors
│   │   ├── index.ts                     # Export barrel
│   │   └── permission-denied.error.ts   # Standard permission error
│   │
│   ├── seeds/                           # Sample data
│   │   └── sample-policies.sql          # Development seed
│   │
│   └── casbin.module.ts                 # Casbin NestJS module
│
├── audit/                               # Audit & Compliance
│   ├── services/
│   │   ├── index.ts
│   │   ├── permission-audit.service.ts  # PII masking, logging
│   │   └── audit-integrity.service.ts   # Tamper-proof hash chain
│   │
│   ├── interceptors/
│   │   ├── index.ts
│   │   └── audit-logging.interceptor.ts
│   │
│   └── audit.module.ts
│
├── config/                              # Configuration
│   ├── index.ts
│   ├── rbac.config.ts                   # Main RBAC config
│   ├── rbac-config.defaults.ts          # Default values
│   └── cache.config.ts                  # Cache configuration
│
├── constants/                           # Constants & Enums
│   ├── index.ts                         # Export barrel
│   ├── resources.constant.ts            # Resource names
│   ├── actions.constant.ts              # Action names
│   ├── cache-keys.constant.ts           # Cache key patterns
│   └── error-codes.constant.ts          # Error codes
│
├── decorators/                          # Decorators
│   ├── index.ts                         # Export barrel
│   ├── require-permission.decorator.ts  # Main permission decorator
│   └── check-policy.decorator.ts        # Policy check decorator
│
├── dto/                                 # Data Transfer Objects
│   ├── index.ts                         # Export barrel
│   ├── permission-check.input.ts        # GraphQL inputs
│   └── permission-check.output.ts       # GraphQL outputs
│
├── messages/                            # Centralized messages
│   └── index.ts                         # LOG, WARN, ERROR messages
│
├── repositories/                        # Data access layer
│   ├── index.ts                         # Export barrel
│   ├── casbin-rule.repository.ts        # Casbin rule repository
│   └── policy-version.repository.ts     # Version tracking repository
│
├── types/                               # TypeScript types
│   ├── index.ts                         # Export barrel
│   ├── casbin.types.ts                  # Casbin-related types
│   ├── policy.types.ts                  # Policy types
│   └── rbac-config.types.ts             # Config types
│
├── commands/                            # CLI Commands
│   ├── index.ts                         # Export barrel
│   ├── rbac-sync.command.ts             # Sync policies
│   ├── rbac-check.command.ts            # Check permission
│   ├── rbac-warm-cache.command.ts       # Warm cache
│   └── rbac-verify-integrity.command.ts # Verify audit log
│
├── workspace-entities/                  # Keep existing entities
│   └── ... (giữ nguyên)
│
└── mkt-rbac-enterprise-grade.module.ts  # Main module definition
```

---

## 2. Dependencies

### 2.1 Package Installation

```bash
# Core Casbin packages
yarn add casbin @casbin/typeorm-adapter

# PostgreSQL client (for PgNotifyWatcher)
yarn add pg

# Prometheus metrics
yarn add prom-client

# Dev dependencies
yarn add -D @types/pg
```

### 2.2 Package.json Updates

```json
{
  "dependencies": {
    "casbin": "^5.x.x",
    "@casbin/typeorm-adapter": "^5.x.x",
    "pg": "^8.x.x",
    "prom-client": "^15.x.x"
  }
}
```

---

## 3. Constants & Types

### 3.1 Resources Constant

**File: `constants/resources.constant.ts`**

```typescript
/**
 * RBAC Resource identifiers
 * Format: {entity} hoặc {entity}:{id} cho specific resource
 */
export const RBAC_RESOURCES = {
  // Business entities
  MKT_CUSTOMER: 'mktCustomer',
  MKT_ORDER: 'mktOrder',
  MKT_INVOICE: 'mktInvoice',
  MKT_LICENSE: 'mktLicense',
  MKT_PAYMENT: 'mktPayment',
  MKT_PRODUCT: 'mktProduct',

  // Organization
  MKT_DEPARTMENT: 'mktDepartment',
  MKT_ORGANIZATION_LEVEL: 'mktOrganizationLevel',

  // User management
  WORKSPACE_MEMBER: 'workspaceMember',
  MKT_PERMISSION_TEMPLATE: 'mktPermissionTemplate',

  // System
  RBAC_POLICY: 'rbac:policy',
  AUDIT_LOG: 'auditLog',

  // Groupings
  MKT_BUSINESS_DATA: 'mktBusinessData',
  MKT_SENSITIVE_DATA: 'mktSensitiveData',
} as const;

export type RbacResource = (typeof RBAC_RESOURCES)[keyof typeof RBAC_RESOURCES];
```

### 3.2 Actions Constant

**File: `constants/actions.constant.ts`**

```typescript
/**
 * RBAC Action identifiers
 */
export const RBAC_ACTIONS = {
  // CRUD
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',

  // Extended
  LIST: 'list',
  EXPORT: 'export',
  IMPORT: 'import',
  APPROVE: 'approve',
  REJECT: 'reject',

  // Admin
  MANAGE: 'manage',
  ASSIGN: 'assign',

  // Special
  ALL: '*',
} as const;

export type RbacAction = (typeof RBAC_ACTIONS)[keyof typeof RBAC_ACTIONS];
```

### 3.3 Cache Keys Constant

**File: `constants/cache-keys.constant.ts`**

```typescript
/**
 * Cache key patterns for RBAC
 */
export const RBAC_CACHE_KEYS = {
  // Enforcer cache per workspace
  ENFORCER: (workspaceId: string) => `rbac:enforcer:${workspaceId}`,

  // Policy version
  POLICY_VERSION: (workspaceId: string) => `rbac:policy:version:${workspaceId}`,

  // Department ancestors cache
  DEPT_ANCESTORS: (deptId: string) => `rbac:dept:ancestors:${deptId}`,
  DEPT_DESCENDANTS: (deptId: string) => `rbac:dept:descendants:${deptId}`,

  // User roles cache
  USER_ROLES: (userId: string, workspaceId: string) =>
    `rbac:user:roles:${workspaceId}:${userId}`,
} as const;
```

### 3.4 Error Codes Constant

**File: `constants/error-codes.constant.ts`**

```typescript
/**
 * Permission error codes
 */
export const PERMISSION_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_NOT_ASSIGNED: 'ROLE_NOT_ASSIGNED',
  POLICY_EXPIRED: 'POLICY_EXPIRED',
  CROSS_TENANT_ACCESS: 'CROSS_TENANT_ACCESS',
  ESCALATION_PREVENTED: 'ESCALATION_PREVENTED',
  SYNC_FAILED: 'SYNC_FAILED',
  ENFORCER_ERROR: 'ENFORCER_ERROR',
} as const;

export type PermissionErrorCode =
  (typeof PERMISSION_ERROR_CODES)[keyof typeof PERMISSION_ERROR_CODES];
```

### 3.5 Index Export

**File: `constants/index.ts`**

```typescript
export * from './resources.constant';
export * from './actions.constant';
export * from './cache-keys.constant';
export * from './error-codes.constant';
```

### 3.6 Types Definition

**File: `types/casbin.types.ts`**

```typescript
import { Enforcer } from 'casbin';

/**
 * Casbin policy types
 */
export type CasbinPolicyType = 'p' | 'g' | 'g2';

/**
 * Permission check input
 */
export type PermissionCheckInput = {
  userId: string;
  workspaceId: string;
  resource: string;
  action: string;
  attributes?: Record<string, unknown>;
};

/**
 * Permission check result
 */
export type PermissionCheckResult = {
  allowed: boolean;
  reason?: string;
  latencyMs: number;
};

/**
 * Casbin policy entry
 */
export type CasbinPolicy = {
  ptype: CasbinPolicyType;
  subject: string;
  domain: string;
  object: string;
  action: string;
  effect: 'allow' | 'deny';
  condition?: string;
};

/**
 * Grouping policy (role assignment)
 */
export type GroupingPolicy = {
  subject: string;
  role: string;
  domain: string;
};

/**
 * Enforcer factory result
 */
export type EnforcerWithMeta = {
  enforcer: Enforcer;
  workspaceId: string;
  loadedAt: Date;
  policyCount: number;
};
```

**File: `types/policy.types.ts`**

```typescript
/**
 * Policy sync result
 */
export type SyncResult = {
  status: 'success' | 'skipped';
  reason?: string;
  policiesAdded?: number;
  latency?: number;
};

/**
 * Manual sync result with diff
 */
export type ManualSyncResult =
  | SyncResult
  | {
      dryRun: true;
      current: string[][];
      proposed: string[][];
      diff: PolicyDiff;
    };

/**
 * Policy diff
 */
export type PolicyDiff = {
  added: string[][];
  removed: string[][];
  unchanged: number;
};

/**
 * Sync failed event
 */
export type SyncFailedEvent = {
  workspaceId: string;
  error: string;
  retryCount?: number;
  timestamp: Date;
};

/**
 * Validation result
 */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};
```

**File: `types/rbac-config.types.ts`**

```typescript
/**
 * RBAC Engine mode
 */
export type RbacEngineMode = 'legacy' | 'casbin' | 'shadow' | 'shadow_casbin';

/**
 * RBAC Configuration
 */
export type RbacConfig = {
  engine: RbacEngineMode;
  enabledResolvers: string[];
  shadowMode: {
    enabled: boolean;
    logDiscrepancies: boolean;
    alertOnDiscrepancy: boolean;
    sampleRate: number;
  };
};

/**
 * Cache configuration
 */
export type CasbinCacheConfig = {
  enableCache: boolean;
  policyReloadIntervalMs: number;
  warmOnStartup: boolean;
  warmOnDeploy: boolean;
  maxPoliciesPerWorkspace: number;
  maxCacheSizeMb: number;
  p95LatencyTargetMs: number;
  p99LatencyTargetMs: number;
};
```

**File: `types/index.ts`**

```typescript
export * from './casbin.types';
export * from './policy.types';
export * from './rbac-config.types';
```

---

## 4. Messages Pattern

**File: `messages/index.ts`**

```typescript
/**
 * Log context for RBAC module
 */
export const RBAC_LOG_CONTEXT = 'MktRbac';

/**
 * Centralized messages for RBAC module
 */
export const RBAC_MESSAGES = {
  LOG: {
    // Enforcer
    ENFORCER_CREATED: (workspaceId: string) =>
      `Casbin enforcer created for workspace: ${workspaceId}`,
    PERMISSION_CHECK_START: (userId: string, resource: string, action: string) =>
      `Checking permission: user=${userId}, resource=${resource}, action=${action}`,
    PERMISSION_CHECK_RESULT: (result: boolean, latencyMs: number) =>
      `Permission check result: ${result ? 'ALLOW' : 'DENY'} (${latencyMs}ms)`,

    // Sync
    SYNC_START: (workspaceId: string) =>
      `Starting policy sync for workspace: ${workspaceId}`,
    SYNC_SUCCESS: (workspaceId: string, count: number, latencyMs: number) =>
      `Synced ${count} policies for ${workspaceId} in ${latencyMs}ms`,
    SYNC_SKIPPED: (workspaceId: string, reason: string) =>
      `Sync skipped for ${workspaceId}: ${reason}`,

    // Cache
    CACHE_WARM_START: (count: number) =>
      `Warming caches for ${count} workspaces`,
    CACHE_WARM_COMPLETE: (latencyMs: number) =>
      `Cache warming completed in ${latencyMs}ms`,

    // Watcher
    WATCHER_CONNECTED: 'PG NOTIFY watcher connected',
    WATCHER_NOTIFICATION: (payload: string) =>
      `Policy update received: ${payload}`,
  },

  WARN: {
    // Sync
    SYNC_IN_PROGRESS: (workspaceId: string) =>
      `Sync already in progress for ${workspaceId}`,
    POLICY_LIMIT_APPROACHING: (workspaceId: string, count: number) =>
      `Workspace ${workspaceId} approaching policy limit: ${count}`,

    // Watcher
    WATCHER_RECONNECTING: (attempt: number, delayMs: number) =>
      `Reconnecting watcher in ${delayMs}ms (attempt ${attempt})`,

    // Security
    CROSS_TENANT_REJECTED: (domain: string) =>
      `Cross-tenant policy rejected: domain ${domain} not allowed`,
    ESCALATION_DETECTED: (subject: string) =>
      `Potential privilege escalation detected for ${subject}`,
  },

  ERROR: {
    // Enforcer
    ENFORCER_CREATE_FAILED: (workspaceId: string, error: string) =>
      `Failed to create enforcer for ${workspaceId}: ${error}`,
    ENFORCEMENT_FAILED: (error: string) =>
      `Permission enforcement failed: ${error}`,

    // Sync
    SYNC_FAILED: (workspaceId: string, error: string) =>
      `Policy sync failed for ${workspaceId}: ${error}`,
    SYNC_FAILED_PERMANENTLY: (workspaceId: string, retries: number) =>
      `Workspace ${workspaceId} sync failed after ${retries} retries`,

    // Watcher
    WATCHER_CONNECTION_FAILED: (error: string) =>
      `Failed to connect PG watcher: ${error}`,
    WATCHER_MAX_RECONNECTS: 'Max reconnect attempts reached',

    // Validation
    INVALID_POLICY: (errors: string[]) =>
      `Invalid policy: ${errors.join(', ')}`,

    // General
    WORKSPACE_NOT_FOUND: 'Workspace ID not found in context',
    USER_NOT_FOUND: 'User ID not found in context',
  },

  INFO: {
    MODULE_INITIALIZED: 'RBAC Casbin module initialized',
    POLICY_UPDATED: (workspaceId: string) =>
      `Policies updated for workspace: ${workspaceId}`,
  },
} as const;
```

---

## 5. Casbin Models

### 5.1 RBAC Model với Domains

**File: `casbin/models/rbac-domains.conf`**

```ini
# RBAC with Domains Model
# Supports: role hierarchy, resource grouping, multi-tenant isolation

[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
# g: user -> role (per domain/workspace)
g = _, _, _
# g2: resource -> resource group
g2 = _, _

[policy_effect]
# Allow if any allow AND no explicit deny
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
# Match: role hierarchy + domain + resource group + action
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && g2(r.obj, p.obj) && r.act == p.act
```

### 5.2 ABAC Hybrid Model

**File: `casbin/models/abac-hybrid.conf`**

```ini
# ABAC Hybrid Model
# Supports: RBAC + attribute-based conditions

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
# Standard RBAC + condition evaluation
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && g2(r.obj, p.obj) && r.act == p.act && (p.condition == "" || eval(p.condition))
```

---

## 6. PgNotifyWatcher

**File: `casbin/watchers/pg-notify.watcher.ts`**

```typescript
import { Client } from 'pg';
import { Watcher } from 'casbin';
import { Logger } from '@nestjs/common';

import { RBAC_LOG_CONTEXT, RBAC_MESSAGES } from '../../messages';

/**
 * PostgreSQL NOTIFY Watcher for Casbin
 *
 * Sử dụng PostgreSQL LISTEN/NOTIFY thay vì Redis
 * để sync policies giữa các instances.
 *
 * Ưu điểm:
 * - Không cần thêm dependency (Redis)
 * - Sử dụng PostgreSQL có sẵn
 * - Built-in trong PostgreSQL, stable
 *
 * Hạn chế:
 * - Payload max 8000 bytes (đủ cho sync signals)
 * - Messages không persist nếu client disconnect
 * - Giải pháp: hourly full resync
 */
export class PgNotifyWatcher implements Watcher {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:PgNotifyWatcher`);
  private client: Client | null = null;
  private callback: (() => void) | null = null;
  private reconnectAttempts = 0;

  private readonly channel = 'casbin_policy_update';
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly BASE_DELAY_MS = 1000;

  constructor(private readonly connectionString: string) {}

  /**
   * Initialize watcher - connect to PostgreSQL
   */
  async init(): Promise<void> {
    await this.connect();
  }

  /**
   * Connect to PostgreSQL and setup LISTEN
   */
  private async connect(): Promise<void> {
    try {
      this.client = new Client({ connectionString: this.connectionString });
      await this.client.connect();
      await this.client.query(`LISTEN ${this.channel}`);

      // Setup notification handler
      this.client.on('notification', (msg) => {
        if (msg.channel === this.channel && this.callback) {
          this.logger.debug(RBAC_MESSAGES.LOG.WATCHER_NOTIFICATION(msg.payload ?? ''));
          this.callback();
        }
      });

      // Setup error handler for auto-reconnect
      this.client.on('error', async (err) => {
        this.logger.error(RBAC_MESSAGES.ERROR.WATCHER_CONNECTION_FAILED(err.message));
        await this.handleReconnect();
      });

      // Reset reconnect counter on successful connect
      this.reconnectAttempts = 0;
      this.logger.log(RBAC_MESSAGES.LOG.WATCHER_CONNECTED);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(RBAC_MESSAGES.ERROR.WATCHER_CONNECTION_FAILED(errorMessage));
      await this.handleReconnect();
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(RBAC_MESSAGES.ERROR.WATCHER_MAX_RECONNECTS);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts);

    this.logger.warn(RBAC_MESSAGES.WARN.WATCHER_RECONNECTING(this.reconnectAttempts, delay));

    // Cleanup old client
    if (this.client) {
      try {
        await this.client.end();
      } catch {
        // Ignore cleanup errors
      }
      this.client = null;
    }

    // Schedule reconnect
    setTimeout(async () => {
      await this.connect();
    }, delay);
  }

  /**
   * Set callback to be called when policy updates are received
   */
  setUpdateCallback(callback: () => void): void {
    this.callback = callback;
  }

  /**
   * Notify other instances about policy update
   */
  async update(): Promise<boolean> {
    if (!this.client) {
      this.logger.error('Cannot send NOTIFY: client not connected');
      return false;
    }

    try {
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        source: process.env.HOSTNAME ?? 'unknown',
      });
      await this.client.query(`NOTIFY ${this.channel}, '${payload}'`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send NOTIFY: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.query(`UNLISTEN ${this.channel}`);
        await this.client.end();
      } catch {
        // Ignore cleanup errors
      }
      this.client = null;
    }
    this.logger.log('PG NOTIFY watcher closed');
  }

  /**
   * Check if watcher is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.reconnectAttempts === 0;
  }

  /**
   * Get current reconnect attempts (for metrics/monitoring)
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
```

**File: `casbin/watchers/index.ts`**

```typescript
export { PgNotifyWatcher } from './pg-notify.watcher';
```

---

## 7. Adapters

### 7.1 TypeORM Adapter Configuration

**File: `casbin/adapters/twenty-typeorm.adapter.ts`**

```typescript
import TypeORMAdapter from '@casbin/typeorm-adapter';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

import { RBAC_LOG_CONTEXT } from '../../messages';

/**
 * Create TypeORM adapter for Casbin
 * Sử dụng @casbin/typeorm-adapter (73⭐, 232 dependents)
 */
export async function createTypeORMAdapter(
  dataSource: DataSource,
): Promise<TypeORMAdapter> {
  const logger = new Logger(`${RBAC_LOG_CONTEXT}:TypeORMAdapter`);

  try {
    const adapter = await TypeORMAdapter.newAdapter({
      type: 'postgres',
      host: dataSource.options.host as string,
      port: dataSource.options.port as number,
      username: dataSource.options.username as string,
      password: dataSource.options.password as string,
      database: dataSource.options.database as string,
    });

    logger.log('TypeORM adapter created successfully');
    return adapter;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to create TypeORM adapter: ${errorMessage}`);
    throw error;
  }
}
```

### 7.2 Workspace Filtered Adapter

**File: `casbin/adapters/workspace-filtered.adapter.ts`**

```typescript
import TypeORMAdapter from '@casbin/typeorm-adapter';
import { Model, Filter } from 'casbin';

/**
 * Workspace-filtered adapter
 *
 * Chỉ load policies cho workspace hiện tại + global policies (ws:*)
 * để tối ưu memory và đảm bảo tenant isolation.
 */
export class WorkspaceFilteredAdapter {
  private workspaceId: string | null = null;

  constructor(private readonly adapter: TypeORMAdapter) {}

  /**
   * Set workspace filter
   */
  setWorkspaceFilter(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  /**
   * Load filtered policies for current workspace
   */
  async loadFilteredPolicy(model: Model): Promise<void> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID not set');
    }

    const filter: Filter = {
      // v1 là domain column trong casbin_rule
      v1: [`ws:${this.workspaceId}`, 'ws:*'],
    };

    await this.adapter.loadFilteredPolicy(model, filter);
  }

  /**
   * Proxy other methods to underlying adapter
   */
  async savePolicy(model: Model): Promise<boolean> {
    return this.adapter.savePolicy(model);
  }

  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    return this.adapter.addPolicy(sec, ptype, rule);
  }

  async removePolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    return this.adapter.removePolicy(sec, ptype, rule);
  }

  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    return this.adapter.removeFilteredPolicy(sec, ptype, fieldIndex, ...fieldValues);
  }
}
```

**File: `casbin/adapters/index.ts`**

```typescript
export { createTypeORMAdapter } from './twenty-typeorm.adapter';
export { WorkspaceFilteredAdapter } from './workspace-filtered.adapter';
```

---

## 8. Validators

**File: `casbin/validators/policy.validator.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { RBAC_LOG_CONTEXT, RBAC_MESSAGES } from '../../messages';
import { CasbinPolicy, GroupingPolicy, ValidationResult } from '../../types';

/**
 * Policy Validator
 *
 * Validates policies before adding to prevent:
 * - Cross-tenant access
 * - Privilege escalation
 * - Invalid format
 */
@Injectable()
export class PolicyValidator {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:PolicyValidator`);

  // Role hierarchy từ thấp đến cao
  private readonly ROLE_HIERARCHY = [
    'tpl:viewer',
    'tpl:sales_rep',
    'tpl:manager',
    'tpl:admin',
    'tpl:super_admin',
  ];

  /**
   * Validate policy before adding
   */
  validatePolicy(
    policy: CasbinPolicy,
    currentWorkspaceId: string,
  ): ValidationResult {
    const errors: string[] = [];

    // Check domain isolation
    if (
      policy.domain !== `ws:${currentWorkspaceId}` &&
      policy.domain !== 'ws:*'
    ) {
      errors.push(RBAC_MESSAGES.WARN.CROSS_TENANT_REJECTED(policy.domain));
    }

    // Check subject format
    if (!this.isValidSubjectFormat(policy.subject)) {
      errors.push(`Invalid subject format: ${policy.subject}`);
    }

    // Check effect
    if (!['allow', 'deny'].includes(policy.effect)) {
      errors.push(`Invalid effect: ${policy.effect}`);
    }

    // Check for privilege escalation patterns
    if (this.isPotentialEscalation(policy)) {
      errors.push(RBAC_MESSAGES.WARN.ESCALATION_DETECTED(policy.subject));
    }

    if (errors.length > 0) {
      this.logger.warn(RBAC_MESSAGES.ERROR.INVALID_POLICY(errors));
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

    // Check if current user can assign this role
    if (!this.canAssignRole(policy.role, currentUserRoles)) {
      errors.push(`Cannot assign role ${policy.role}: insufficient privileges`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if subject format is valid
   */
  private isValidSubjectFormat(subject: string): boolean {
    // Valid formats: user:{uuid}, tpl:{key}
    const validPatterns = [
      /^user:[a-f0-9-]{36}$/i, // UUID format
      /^tpl:[a-z_]+$/i, // Template key format
    ];

    return validPatterns.some((pattern) => pattern.test(subject));
  }

  /**
   * Check for potential privilege escalation
   */
  private isPotentialEscalation(policy: CasbinPolicy): boolean {
    // Escalation patterns:
    // 1. Granting wildcard permissions
    // 2. Granting policy management permissions
    const escalationPatterns = [
      { obj: '*', act: '*', effect: 'allow' },
      { obj: 'rbac:policy', act: 'manage', effect: 'allow' },
      { obj: 'rbac:policy', act: '*', effect: 'allow' },
    ];

    return escalationPatterns.some(
      (pattern) =>
        policy.object === pattern.obj &&
        policy.action === pattern.act &&
        policy.effect === pattern.effect,
    );
  }

  /**
   * Check if user can assign a role
   * User can only assign roles at or below their level
   */
  private canAssignRole(roleToAssign: string, currentUserRoles: string[]): boolean {
    const roleToAssignLevel = this.ROLE_HIERARCHY.indexOf(roleToAssign);

    // Unknown role - cannot assign
    if (roleToAssignLevel === -1) {
      return false;
    }

    const maxCurrentLevel = Math.max(
      ...currentUserRoles.map((r) => this.ROLE_HIERARCHY.indexOf(r)),
    );

    // Can only assign roles at lower level
    return maxCurrentLevel > roleToAssignLevel;
  }
}
```

**File: `casbin/validators/index.ts`**

```typescript
export { PolicyValidator } from './policy.validator';
```

---

## 9. Repositories

### 9.1 Casbin Rule Repository

**File: `repositories/casbin-rule.repository.ts`**

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { RBAC_LOG_CONTEXT, RBAC_MESSAGES } from '../messages';
import { CasbinPolicy, CasbinPolicyType } from '../types';

/**
 * Casbin Rule Repository
 *
 * Data access layer for casbin_rule table.
 * Provides direct SQL access for complex queries.
 */
@Injectable()
export class CasbinRuleRepository {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:CasbinRuleRepository`);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Count policies for workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM casbin_rule WHERE v1 = $1 OR v1 = 'ws:*'`,
      [`ws:${workspaceId}`],
    );
    return parseInt(result[0].count, 10);
  }

  /**
   * Get all policies for workspace
   */
  async findByWorkspace(workspaceId: string): Promise<CasbinPolicy[]> {
    const rows = await this.dataSource.query(
      `SELECT ptype, v0, v1, v2, v3, v4
       FROM casbin_rule
       WHERE (v1 = $1 OR v1 = 'ws:*') AND ptype = 'p'`,
      [`ws:${workspaceId}`],
    );

    return rows.map((row: Record<string, string>) => ({
      ptype: row.ptype as CasbinPolicyType,
      subject: row.v0,
      domain: row.v1,
      object: row.v2,
      action: row.v3,
      effect: row.v4 as 'allow' | 'deny',
    }));
  }

  /**
   * Get role assignments for user in workspace
   */
  async findUserRoles(userId: string, workspaceId: string): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT v1 as role FROM casbin_rule
       WHERE ptype = 'g' AND v0 = $1 AND v2 = $2`,
      [`user:${userId}`, `ws:${workspaceId}`],
    );

    return rows.map((row: Record<string, string>) => row.role);
  }

  /**
   * Check if policy exists
   */
  async exists(policy: CasbinPolicy): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM casbin_rule
       WHERE ptype = $1 AND v0 = $2 AND v1 = $3 AND v2 = $4 AND v3 = $5 AND v4 = $6
       LIMIT 1`,
      [
        'p',
        policy.subject,
        policy.domain,
        policy.object,
        policy.action,
        policy.effect,
      ],
    );

    return result.length > 0;
  }

  /**
   * Delete all policies for workspace
   */
  async deleteByWorkspace(workspaceId: string): Promise<number> {
    const result = await this.dataSource.query(
      `DELETE FROM casbin_rule WHERE v1 = $1`,
      [`ws:${workspaceId}`],
    );

    return result.rowCount ?? 0;
  }

  /**
   * Get policy statistics
   */
  async getStatistics(workspaceId: string): Promise<{
    totalPolicies: number;
    roleAssignments: number;
    resourceGroups: number;
  }> {
    const result = await this.dataSource.query(
      `SELECT
         SUM(CASE WHEN ptype = 'p' THEN 1 ELSE 0 END) as total_policies,
         SUM(CASE WHEN ptype = 'g' THEN 1 ELSE 0 END) as role_assignments,
         SUM(CASE WHEN ptype = 'g2' THEN 1 ELSE 0 END) as resource_groups
       FROM casbin_rule
       WHERE v1 = $1 OR v1 = 'ws:*'`,
      [`ws:${workspaceId}`],
    );

    return {
      totalPolicies: parseInt(result[0].total_policies ?? '0', 10),
      roleAssignments: parseInt(result[0].role_assignments ?? '0', 10),
      resourceGroups: parseInt(result[0].resource_groups ?? '0', 10),
    };
  }
}
```

### 9.2 Policy Version Repository

**File: `repositories/policy-version.repository.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { RBAC_LOG_CONTEXT } from '../messages';

/**
 * Policy version entry
 */
export type PolicyVersion = {
  workspaceId: string;
  version: number;
  policyHash: string;
  updatedAt: Date;
};

/**
 * Policy Version Repository
 *
 * Tracks policy versions for idempotent sync.
 */
@Injectable()
export class PolicyVersionRepository {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:PolicyVersionRepository`);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Find version by workspace
   */
  async findByWorkspace(workspaceId: string): Promise<PolicyVersion | null> {
    const rows = await this.dataSource.query(
      `SELECT workspace_id, version, policy_hash, updated_at
       FROM casbin_policy_version
       WHERE workspace_id = $1`,
      [workspaceId],
    );

    if (rows.length === 0) {
      return null;
    }

    return {
      workspaceId: rows[0].workspace_id,
      version: rows[0].version,
      policyHash: rows[0].policy_hash,
      updatedAt: rows[0].updated_at,
    };
  }

  /**
   * Upsert version
   */
  async upsert(version: PolicyVersion): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO casbin_policy_version (workspace_id, version, policy_hash, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id)
       DO UPDATE SET version = $2, policy_hash = $3, updated_at = $4`,
      [
        version.workspaceId,
        version.version,
        version.policyHash,
        version.updatedAt,
      ],
    );
  }

  /**
   * Increment version
   */
  async incrementVersion(workspaceId: string, newHash: string): Promise<number> {
    const result = await this.dataSource.query(
      `INSERT INTO casbin_policy_version (workspace_id, version, policy_hash, updated_at)
       VALUES ($1, 1, $2, NOW())
       ON CONFLICT (workspace_id)
       DO UPDATE SET version = casbin_policy_version.version + 1, policy_hash = $2, updated_at = NOW()
       RETURNING version`,
      [workspaceId, newHash],
    );

    return result[0].version;
  }
}
```

**File: `repositories/index.ts`**

```typescript
export { CasbinRuleRepository } from './casbin-rule.repository';
export { PolicyVersionRepository } from './policy-version.repository';
```

---

## 10. Services

### 10.1 Casbin Enforcer Service

**File: `casbin/services/casbin-enforcer.service.ts`**

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Enforcer } from 'casbin';

import { RBAC_LOG_CONTEXT, RBAC_MESSAGES } from '../../messages';
import { PermissionCheckInput, PermissionCheckResult } from '../../types';
import { RbacMetricsService } from './rbac-metrics.service';

/**
 * Casbin Enforcer Service
 *
 * Main service for permission enforcement.
 * Implements fail-closed pattern for security.
 */
@Injectable()
export class CasbinEnforcerService {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:CasbinEnforcerService`);
  private readonly FAIL_CLOSED = true; // Security default

  constructor(
    @Inject('CASBIN_ENFORCER')
    private readonly enforcer: Enforcer,
    private readonly metricsService: RbacMetricsService,
  ) {}

  /**
   * Check permission
   */
  async checkPermission(input: PermissionCheckInput): Promise<PermissionCheckResult> {
    const startTime = Date.now();

    this.logger.debug(
      RBAC_MESSAGES.LOG.PERMISSION_CHECK_START(input.userId, input.resource, input.action),
    );

    try {
      const result = await this.enforcer.enforce(
        `user:${input.userId}`,
        `ws:${input.workspaceId}`,
        input.resource,
        input.action,
      );

      const latencyMs = Date.now() - startTime;

      this.logger.debug(RBAC_MESSAGES.LOG.PERMISSION_CHECK_RESULT(result, latencyMs));

      this.metricsService.recordDecision({
        resource: input.resource,
        action: input.action,
        result,
        latencyMs,
      });

      return {
        allowed: result,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(RBAC_MESSAGES.ERROR.ENFORCEMENT_FAILED(errorMessage));

      this.metricsService.recordFailure({
        resource: input.resource,
        action: input.action,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        latencyMs,
      });

      // Fail-closed: deny on error for security
      if (this.FAIL_CLOSED) {
        this.logger.warn('Fail-closed: denying permission due to error');
        return {
          allowed: false,
          reason: 'enforcement_error',
          latencyMs,
        };
      }

      throw error;
    }
  }

  /**
   * Check permission with ABAC attributes
   */
  async checkPermissionWithAttributes(
    input: PermissionCheckInput,
  ): Promise<PermissionCheckResult> {
    const startTime = Date.now();

    try {
      const result = await this.enforcer.enforce(
        `user:${input.userId}`,
        `ws:${input.workspaceId}`,
        input.resource,
        input.action,
        input.attributes ?? {},
      );

      const latencyMs = Date.now() - startTime;

      return {
        allowed: result,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (this.FAIL_CLOSED) {
        return {
          allowed: false,
          reason: 'enforcement_error',
          latencyMs,
        };
      }

      throw error;
    }
  }

  /**
   * Batch check for GraphQL list queries
   */
  async batchCheckResourceAccess(
    userId: string,
    workspaceId: string,
    resources: Array<{ type: string; id: string }>,
    action: string,
  ): Promise<Map<string, boolean>> {
    const requests = resources.map((r) => [
      `user:${userId}`,
      `ws:${workspaceId}`,
      `${r.type}:${r.id}`,
      action,
    ]);

    const results = await this.enforcer.batchEnforce(requests);

    const resultMap = new Map<string, boolean>();
    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      resultMap.set(`${r.type}:${r.id}`, results[i]);
    }

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
    if (items.length === 0) {
      return [];
    }

    const accessMap = await this.batchCheckResourceAccess(
      userId,
      workspaceId,
      items.map((i) => ({ type: resourceType, id: i.id })),
      action,
    );

    return items.filter((item) => accessMap.get(`${resourceType}:${item.id}`));
  }

  /**
   * Get user roles in workspace
   */
  async getUserRoles(userId: string, workspaceId: string): Promise<string[]> {
    return this.enforcer.getRolesForUserInDomain(
      `user:${userId}`,
      `ws:${workspaceId}`,
    );
  }

  /**
   * Reload policies
   */
  async reloadPolicies(): Promise<void> {
    await this.enforcer.loadPolicy();
    this.logger.log('Policies reloaded');
  }

  /**
   * Get policy count
   */
  async getPolicyCount(): Promise<number> {
    const policies = await this.enforcer.getPolicy();
    return policies.length;
  }
}
```

### 10.2 Policy Sync Service

**File: `casbin/services/policy-sync.service.ts`**

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Enforcer } from 'casbin';
import * as crypto from 'crypto';

import { RBAC_LOG_CONTEXT, RBAC_MESSAGES } from '../../messages';
import { SyncResult, ManualSyncResult, PolicyDiff } from '../../types';
import { PolicyVersionRepository } from '../../repositories';
import { RbacMetricsService } from './rbac-metrics.service';

// Import permission template repository từ existing codebase
// import { MktPermissionTemplateRepository } from '../../repositories';

/**
 * Permission change event
 */
export type PermissionChangeEvent = {
  workspaceId: string;
  templateId?: string;
  userId?: string;
  action: 'created' | 'updated' | 'deleted';
};

/**
 * Policy Sync Service
 *
 * Sync policies từ workspace entities sang Casbin.
 * Features:
 * - Debounce để tránh sync liên tục
 * - Idempotency với hash comparison
 * - Retry với exponential backoff
 * - Event-driven sync
 */
@Injectable()
export class PolicySyncService {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:PolicySyncService`);
  private readonly syncLock = new Map<string, boolean>();
  private readonly pendingSync = new Map<string, NodeJS.Timeout>();

  private readonly DEBOUNCE_MS = 500;

  constructor(
    @Inject('CASBIN_ENFORCER')
    private readonly enforcer: Enforcer,
    // private readonly templateRepository: MktPermissionTemplateRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: RbacMetricsService,
  ) {}

  /**
   * Event handler - debounced sync on permission change
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
   * Sync policies for workspace
   */
  async syncWorkspacePolicies(workspaceId: string): Promise<SyncResult> {
    const startTime = Date.now();

    // Prevent concurrent syncs
    if (this.syncLock.get(workspaceId)) {
      this.logger.debug(RBAC_MESSAGES.WARN.SYNC_IN_PROGRESS(workspaceId));
      return { status: 'skipped', reason: 'sync_in_progress' };
    }

    this.syncLock.set(workspaceId, true);
    this.logger.log(RBAC_MESSAGES.LOG.SYNC_START(workspaceId));

    try {
      // Get templates from database
      // const templates = await this.templateRepository.findAllWithRelations(workspaceId);
      const templates: unknown[] = []; // TODO: Implement template fetching

      // Calculate new policy hash
      const newHash = this.calculatePolicyHash(templates);

      // Check if sync needed (idempotency)
      const currentVersion = await this.policyVersionRepository.findByWorkspace(workspaceId);
      if (currentVersion?.policyHash === newHash) {
        this.logger.debug(RBAC_MESSAGES.LOG.SYNC_SKIPPED(workspaceId, 'no_changes'));
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
      const watcher = this.enforcer.getWatcher();
      if (watcher) {
        await watcher.update();
      }

      const latency = Date.now() - startTime;
      this.metricsService.recordSyncSuccess(workspaceId, policiesAdded, latency);

      this.logger.log(RBAC_MESSAGES.LOG.SYNC_SUCCESS(workspaceId, policiesAdded, latency));

      return { status: 'success', policiesAdded, latency };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.metricsService.recordSyncFailure(workspaceId, errorMessage);
      this.logger.error(RBAC_MESSAGES.ERROR.SYNC_FAILED(workspaceId, errorMessage));

      // Emit for retry/dead-letter queue
      this.eventEmitter.emit('rbac.sync.failed', {
        workspaceId,
        error: errorMessage,
        timestamp: new Date(),
      });

      throw error;
    } finally {
      this.syncLock.delete(workspaceId);
    }
  }

  /**
   * Scheduled full resync for all workspaces
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledFullResync(): Promise<void> {
    this.logger.log('Starting scheduled full resync');

    // TODO: Get all active workspaces
    const workspaces: Array<{ id: string }> = [];

    for (const workspace of workspaces) {
      try {
        await this.syncWorkspacePolicies(workspace.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(RBAC_MESSAGES.ERROR.SYNC_FAILED(workspace.id, errorMessage));
      }
    }
  }

  /**
   * Manual sync with optional dry-run
   */
  async manualSync(workspaceId: string, dryRun = false): Promise<ManualSyncResult> {
    // TODO: Implement template fetching
    const templates: unknown[] = [];
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

  /**
   * Sync templates to Casbin policies
   */
  private async syncTemplates(templates: unknown[], workspaceId: string): Promise<number> {
    const policies = this.templatesToPolicies(templates, workspaceId);
    let addedCount = 0;

    for (const policy of policies) {
      await this.enforcer.addPolicy(...policy);
      addedCount++;
    }

    return addedCount;
  }

  /**
   * Convert templates to Casbin policy format
   */
  private templatesToPolicies(templates: unknown[], workspaceId: string): string[][] {
    // TODO: Implement template to policy conversion
    // Example format:
    // [['tpl:sales_rep', 'ws:workspace-001', 'mktCustomer', 'read', 'allow']]
    return [];
  }

  /**
   * Calculate hash of policies for idempotency
   */
  private calculatePolicyHash(templates: unknown[]): string {
    const content = JSON.stringify(templates);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Calculate diff between current and proposed policies
   */
  private calculateDiff(current: string[][], proposed: string[][]): PolicyDiff {
    const currentSet = new Set(current.map((p) => JSON.stringify(p)));
    const proposedSet = new Set(proposed.map((p) => JSON.stringify(p)));

    const added = proposed.filter((p) => !currentSet.has(JSON.stringify(p)));
    const removed = current.filter((p) => !proposedSet.has(JSON.stringify(p)));

    return {
      added,
      removed,
      unchanged: current.length - removed.length,
    };
  }
}
```

### 10.3 Cache Warmer Service

**File: `casbin/services/cache-warmer.service.ts`**

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { RBAC_LOG_CONTEXT, RBAC_MESSAGES } from '../../messages';
import { CASBIN_CACHE_CONFIG } from '../../config/cache.config';
import { CasbinEnforcerFactory } from './casbin-enforcer.factory';
import { RbacMetricsService } from './rbac-metrics.service';

/**
 * Cache Warmer Service
 *
 * Warm Casbin enforcer caches on startup.
 */
@Injectable()
export class CacheWarmerService implements OnModuleInit {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:CacheWarmerService`);

  constructor(
    private readonly enforcerFactory: CasbinEnforcerFactory,
    private readonly metricsService: RbacMetricsService,
    // private readonly workspaceRepository: WorkspaceRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (CASBIN_CACHE_CONFIG.warmOnStartup) {
      await this.warmAllCaches();
    }
  }

  /**
   * Warm caches for all active workspaces
   */
  async warmAllCaches(): Promise<void> {
    // TODO: Get active workspaces
    const workspaces: Array<{ id: string }> = [];

    this.logger.log(RBAC_MESSAGES.LOG.CACHE_WARM_START(workspaces.length));
    const startTime = Date.now();

    // Warm in batches to avoid overwhelming database
    const BATCH_SIZE = 10;
    for (let i = 0; i < workspaces.length; i += BATCH_SIZE) {
      const batch = workspaces.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((ws) => this.warmWorkspaceCache(ws.id)));
    }

    const latency = Date.now() - startTime;
    this.logger.log(RBAC_MESSAGES.LOG.CACHE_WARM_COMPLETE(latency));
    this.metricsService.recordCacheWarmup(workspaces.length, latency);
  }

  /**
   * Warm cache for single workspace
   */
  async warmWorkspaceCache(workspaceId: string): Promise<void> {
    try {
      const enforcer = await this.enforcerFactory.getEnforcer(workspaceId);

      // Preload policies into memory
      await enforcer.loadPolicy();

      // Pre-compute common permission checks
      const commonChecks = await this.getCommonPermissionChecks(workspaceId);
      for (const check of commonChecks) {
        await enforcer.enforce(check.sub, check.dom, check.obj, check.act);
      }

      this.logger.debug(`Warmed cache for workspace: ${workspaceId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to warm cache for ${workspaceId}: ${errorMessage}`);
    }
  }

  /**
   * Get common permission checks for pre-warming
   */
  private async getCommonPermissionChecks(
    workspaceId: string,
  ): Promise<Array<{ sub: string; dom: string; obj: string; act: string }>> {
    // Common checks that should be pre-warmed
    const commonResources = ['mktCustomer', 'mktOrder', 'mktInvoice'];
    const commonActions = ['read', 'create', 'update'];

    // TODO: Get common user roles from workspace
    const commonRoles = ['tpl:admin', 'tpl:sales_manager', 'tpl:sales_rep'];

    const checks: Array<{ sub: string; dom: string; obj: string; act: string }> = [];

    for (const role of commonRoles) {
      for (const resource of commonResources) {
        for (const action of commonActions) {
          checks.push({
            sub: role,
            dom: `ws:${workspaceId}`,
            obj: resource,
            act: action,
          });
        }
      }
    }

    return checks;
  }
}
```

### 10.4 RbacMetrics Service

**File: `casbin/services/rbac-metrics.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

/**
 * RBAC Metrics Service
 *
 * Prometheus metrics cho RBAC system.
 */
@Injectable()
export class RbacMetricsService {
  private readonly decisionLatency: promClient.Histogram<string>;
  private readonly decisionTotal: promClient.Counter<string>;
  private readonly syncLatency: promClient.Histogram<string>;
  private readonly syncFailures: promClient.Counter<string>;
  private readonly policyCount: promClient.Gauge<string>;
  private readonly cacheWarmupLatency: promClient.Histogram<string>;

  constructor() {
    // Decision metrics
    this.decisionLatency = new promClient.Histogram({
      name: 'rbac_decision_latency_seconds',
      help: 'Permission check latency',
      labelNames: ['resource', 'action', 'result'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
    });

    this.decisionTotal = new promClient.Counter({
      name: 'rbac_decisions_total',
      help: 'Total permission decisions',
      labelNames: ['resource', 'action', 'result'],
    });

    // Sync metrics
    this.syncLatency = new promClient.Histogram({
      name: 'rbac_sync_latency_seconds',
      help: 'Policy sync latency',
      labelNames: ['workspace_id', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.syncFailures = new promClient.Counter({
      name: 'rbac_sync_failures_total',
      help: 'Policy sync failures',
      labelNames: ['workspace_id', 'error_type'],
    });

    // Policy metrics
    this.policyCount = new promClient.Gauge({
      name: 'rbac_policies_total',
      help: 'Total policies per workspace',
      labelNames: ['workspace_id'],
    });

    // Cache metrics
    this.cacheWarmupLatency = new promClient.Histogram({
      name: 'rbac_cache_warmup_latency_seconds',
      help: 'Cache warmup latency',
      buckets: [1, 5, 10, 30, 60],
    });
  }

  /**
   * Record permission decision
   */
  recordDecision(params: {
    resource: string;
    action: string;
    result: boolean;
    latencyMs: number;
  }): void {
    const resultLabel = params.result ? 'allow' : 'deny';

    this.decisionLatency.observe(
      { resource: params.resource, action: params.action, result: resultLabel },
      params.latencyMs / 1000,
    );

    this.decisionTotal.inc({
      resource: params.resource,
      action: params.action,
      result: resultLabel,
    });
  }

  /**
   * Record enforcement failure
   */
  recordFailure(params: {
    resource: string;
    action: string;
    errorType: string;
    latencyMs: number;
  }): void {
    this.decisionTotal.inc({
      resource: params.resource,
      action: params.action,
      result: 'error',
    });
  }

  /**
   * Record sync success
   */
  recordSyncSuccess(workspaceId: string, policyCount: number, latencyMs: number): void {
    this.syncLatency.observe(
      { workspace_id: workspaceId, status: 'success' },
      latencyMs / 1000,
    );
    this.policyCount.set({ workspace_id: workspaceId }, policyCount);
  }

  /**
   * Record sync failure
   */
  recordSyncFailure(workspaceId: string, errorType: string): void {
    this.syncFailures.inc({ workspace_id: workspaceId, error_type: errorType });
  }

  /**
   * Record cache warmup
   */
  recordCacheWarmup(workspaceCount: number, latencyMs: number): void {
    this.cacheWarmupLatency.observe(latencyMs / 1000);
  }
}
```

**File: `casbin/services/index.ts`**

```typescript
export { CasbinEnforcerService } from './casbin-enforcer.service';
export { CasbinEnforcerFactory } from './casbin-enforcer.factory';
export { PolicySyncService } from './policy-sync.service';
export { CacheWarmerService } from './cache-warmer.service';
export { RbacMetricsService } from './rbac-metrics.service';
```

---

## 11. Guards

### 11.1 Casbin Authorization Guard

**File: `casbin/guards/casbin-authz.guard.ts`**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { RBAC_LOG_CONTEXT, RBAC_MESSAGES } from '../../messages';
import { PermissionMetadata } from '../../decorators';
import { CasbinEnforcerService } from '../services';
import { PermissionDeniedError } from '../errors';

/**
 * Casbin Authorization Guard
 *
 * Main guard for GraphQL resolvers.
 * Reads permission metadata from @RequirePermission decorator.
 */
@Injectable()
export class CasbinAuthzGuard implements CanActivate {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:CasbinAuthzGuard`);

  constructor(
    private readonly reflector: Reflector,
    private readonly enforcerService: CasbinEnforcerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission metadata from decorator
    const permission = this.reflector.get<PermissionMetadata>(
      'permission',
      context.getHandler(),
    );

    // No permission required
    if (!permission) {
      return true;
    }

    // Extract context
    const { userId, workspaceId, resource, action } = this.extractContext(
      context,
      permission,
    );

    // Validate required context
    if (!userId) {
      throw new ForbiddenException(RBAC_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    if (!workspaceId) {
      throw new ForbiddenException(RBAC_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    // Check permission
    const result = await this.enforcerService.checkPermission({
      userId,
      workspaceId,
      resource,
      action,
    });

    if (!result.allowed) {
      throw new PermissionDeniedError({
        resource,
        action,
        reason: result.reason,
      });
    }

    return true;
  }

  /**
   * Extract context from execution context
   */
  private extractContext(
    context: ExecutionContext,
    permission: PermissionMetadata,
  ): {
    userId: string | undefined;
    workspaceId: string | undefined;
    resource: string;
    action: string;
  } {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();

    // Get user and workspace from context (set by auth middleware)
    const userId = ctx.req?.user?.id;
    const workspaceId = ctx.req?.workspaceId;

    // Get resource and action from decorator
    const resource = permission.resource;
    const action = permission.action;

    return { userId, workspaceId, resource, action };
  }
}
```

### 11.2 Dual Path Guard (Shadow Mode)

**File: `casbin/guards/dual-path-authz.guard.ts`**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';

import { RBAC_LOG_CONTEXT } from '../../messages';
import { PermissionMetadata } from '../../decorators';
import { RbacEngineMode } from '../../types';
import { CasbinEnforcerService, RbacMetricsService } from '../services';

// Import legacy service nếu cần
// import { ValidationOrchestratorService } from '../../services';

/**
 * Dual Path Authorization Guard
 *
 * Guard cho shadow mode - chạy cả Casbin và legacy,
 * log discrepancies để validate trước khi full migration.
 */
@Injectable()
export class DualPathAuthzGuard implements CanActivate {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:DualPathAuthzGuard`);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly casbinEnforcer: CasbinEnforcerService,
    // private readonly legacyOrchestrator: ValidationOrchestratorService,
    private readonly metricsService: RbacMetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.configService.get<RbacEngineMode>('RBAC_ENGINE', 'legacy');
    const permission = this.reflector.get<PermissionMetadata>(
      'permission',
      context.getHandler(),
    );

    if (!permission) {
      return true;
    }

    const { userId, workspaceId, resource, action } = this.extractContext(
      context,
      permission,
    );

    if (!userId || !workspaceId) {
      return false;
    }

    const startTime = Date.now();

    switch (mode) {
      case 'casbin':
        return this.casbinCheck(userId, workspaceId, resource, action);

      case 'legacy':
        return this.legacyCheck(userId, workspaceId, resource, action);

      case 'shadow':
      case 'shadow_casbin':
        return this.shadowCheck(
          userId,
          workspaceId,
          resource,
          action,
          mode,
          startTime,
        );

      default:
        return this.legacyCheck(userId, workspaceId, resource, action);
    }
  }

  private async casbinCheck(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const result = await this.casbinEnforcer.checkPermission({
      userId,
      workspaceId,
      resource,
      action,
    });
    return result.allowed;
  }

  private async legacyCheck(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // TODO: Implement legacy check
    // return this.legacyOrchestrator.validatePermission(...);
    return true;
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

      // Record metric
      // this.metricsService.recordDiscrepancy({ ... });
    }

    // Return based on mode
    return mode === 'shadow_casbin' ? casbinResult : legacyResult;
  }

  private extractContext(
    context: ExecutionContext,
    permission: PermissionMetadata,
  ): {
    userId: string | undefined;
    workspaceId: string | undefined;
    resource: string;
    action: string;
  } {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();

    return {
      userId: ctx.req?.user?.id,
      workspaceId: ctx.req?.workspaceId,
      resource: permission.resource,
      action: permission.action,
    };
  }
}
```

**File: `casbin/guards/index.ts`**

```typescript
export { CasbinAuthzGuard } from './casbin-authz.guard';
export { DualPathAuthzGuard } from './dual-path-authz.guard';
```

---

## 12. Decorators

**File: `decorators/require-permission.decorator.ts`**

```typescript
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { CasbinAuthzGuard } from '../casbin/guards';

/**
 * Permission metadata
 */
export type PermissionMetadata = {
  resource: string;
  action: string;
  checkOwnership?: boolean;
  auditLevel?: 'low' | 'medium' | 'high';
};

/**
 * Permission options
 */
export type PermissionOptions = {
  checkOwnership?: boolean;
  auditLevel?: 'low' | 'medium' | 'high';
};

/**
 * @RequirePermission decorator
 *
 * Apply to resolver methods to require permission check.
 *
 * @example
 * ```typescript
 * @Query(() => [MktCustomer])
 * @RequirePermission('mktCustomer', 'read')
 * async customers(): Promise<MktCustomer[]> {
 *   // ...
 * }
 *
 * @Mutation(() => Boolean)
 * @RequirePermission('mktCustomer', 'delete', { auditLevel: 'high' })
 * async deleteCustomer(@Args('id') id: string): Promise<boolean> {
 *   // ...
 * }
 * ```
 */
export const RequirePermission = (
  resource: string,
  action: string,
  options?: PermissionOptions,
): MethodDecorator => {
  const metadata: PermissionMetadata = {
    resource,
    action,
    ...options,
  };

  return applyDecorators(
    SetMetadata('permission', metadata),
    UseGuards(CasbinAuthzGuard),
  );
};
```

**File: `decorators/index.ts`**

```typescript
export { RequirePermission, PermissionMetadata, PermissionOptions } from './require-permission.decorator';
```

---

## 13. Module Definition

### 13.1 Casbin Module

**File: `casbin/casbin.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { newEnforcer, Enforcer } from 'casbin';
import * as path from 'path';

import { createTypeORMAdapter } from './adapters';
import { PgNotifyWatcher } from './watchers';
import { PolicyValidator } from './validators';
import {
  CasbinEnforcerService,
  CasbinEnforcerFactory,
  PolicySyncService,
  CacheWarmerService,
  RbacMetricsService,
} from './services';
import { CasbinAuthzGuard, DualPathAuthzGuard } from './guards';
import { RbacHealthIndicator } from './health';
import {
  CasbinRuleRepository,
  PolicyVersionRepository,
} from '../repositories';

/**
 * Casbin Module
 *
 * Core module for Casbin authorization.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  providers: [
    // Repositories
    CasbinRuleRepository,
    PolicyVersionRepository,

    // Validators
    PolicyValidator,

    // Services
    CasbinEnforcerService,
    CasbinEnforcerFactory,
    PolicySyncService,
    CacheWarmerService,
    RbacMetricsService,

    // Guards
    CasbinAuthzGuard,
    DualPathAuthzGuard,

    // Health
    RbacHealthIndicator,

    // PgNotifyWatcher provider
    {
      provide: 'PG_NOTIFY_WATCHER',
      useFactory: async (configService: ConfigService): Promise<PgNotifyWatcher> => {
        const connectionString = configService.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL not configured');
        }
        const watcher = new PgNotifyWatcher(connectionString);
        await watcher.init();
        return watcher;
      },
      inject: [ConfigService],
    },

    // Casbin Enforcer provider
    {
      provide: 'CASBIN_ENFORCER',
      useFactory: async (
        dataSource: DataSource,
        configService: ConfigService,
        watcher: PgNotifyWatcher,
      ): Promise<Enforcer> => {
        // Create adapter
        const adapter = await createTypeORMAdapter(dataSource);

        // Model path
        const modelPath = path.join(
          __dirname,
          'models',
          'rbac-domains.conf',
        );

        // Create enforcer
        const enforcer = await newEnforcer(modelPath, adapter);

        // Setup watcher
        enforcer.setWatcher(watcher);
        watcher.setUpdateCallback(() => {
          enforcer.loadPolicy();
        });

        // Enable auto-save
        enforcer.enableAutoSave(true);

        return enforcer;
      },
      inject: [DataSource, ConfigService, 'PG_NOTIFY_WATCHER'],
    },
  ],
  exports: [
    // Services
    CasbinEnforcerService,
    CasbinEnforcerFactory,
    PolicySyncService,
    RbacMetricsService,

    // Guards
    CasbinAuthzGuard,
    DualPathAuthzGuard,

    // Health
    RbacHealthIndicator,

    // Providers
    'CASBIN_ENFORCER',
    'PG_NOTIFY_WATCHER',
  ],
})
export class CasbinModule {}
```

### 13.2 Main Module Update

**File: `mkt-rbac-enterprise-grade.module.ts`** (Updated)

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import existing workspace entities
// import { ... } from './workspace-entities';

// Import Casbin module
import { CasbinModule } from './casbin/casbin.module';
import { AuditModule } from './audit/audit.module';

// Import existing repositories
import { CasbinRuleRepository, PolicyVersionRepository } from './repositories';

// Import decorators
import { RequirePermission } from './decorators';

/**
 * MKT RBAC Enterprise Grade Module
 *
 * Combines:
 * - Casbin authorization engine
 * - Audit & compliance
 * - Permission templates (workspace entities)
 */
@Module({
  imports: [
    // Casbin core
    CasbinModule,

    // Audit & compliance
    AuditModule,

    // TypeORM for workspace entities (existing)
    // TypeOrmModule.forFeature([...]),
  ],
  providers: [
    // Repositories
    CasbinRuleRepository,
    PolicyVersionRepository,

    // Keep existing services that are still needed
    // ...
  ],
  exports: [
    // Casbin module exports
    CasbinModule,

    // Audit module exports
    AuditModule,

    // Repositories
    CasbinRuleRepository,
    PolicyVersionRepository,
  ],
})
export class MktRbacEnterpriseGradeModule {}
```

---

## 14. Migrations

**File: `migrations/20260109-create-casbin-tables.ts`**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCasbinTables20260109 implements MigrationInterface {
  name = 'CreateCasbinTables20260109';

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

---

## 15. CLI Commands

### 15.1 RBAC Sync Command

**File: `commands/rbac-sync.command.ts`**

```typescript
import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';

import { PolicySyncService } from '../casbin/services';

type SyncCommandOptions = {
  workspace?: string;
  dryRun?: boolean;
  force?: boolean;
};

@Command({
  name: 'rbac:sync',
  description: 'Sync RBAC policies for workspace',
})
export class RbacSyncCommand extends CommandRunner {
  private readonly logger = new Logger(RbacSyncCommand.name);

  constructor(private readonly policySyncService: PolicySyncService) {
    super();
  }

  async run(passedParams: string[], options?: SyncCommandOptions): Promise<void> {
    const workspaceId = options?.workspace;
    const dryRun = options?.dryRun ?? false;

    if (!workspaceId) {
      this.logger.error('Workspace ID is required. Use --workspace=<id>');
      return;
    }

    this.logger.log(`Syncing policies for workspace: ${workspaceId}`);

    try {
      const result = await this.policySyncService.manualSync(workspaceId, dryRun);

      if ('dryRun' in result && result.dryRun) {
        this.logger.log('Dry run results:');
        this.logger.log(`  Current policies: ${result.current.length}`);
        this.logger.log(`  Proposed policies: ${result.proposed.length}`);
        this.logger.log(`  Added: ${result.diff.added.length}`);
        this.logger.log(`  Removed: ${result.diff.removed.length}`);
        this.logger.log(`  Unchanged: ${result.diff.unchanged}`);
      } else {
        this.logger.log(`Sync completed: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Sync failed: ${errorMessage}`);
    }
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID to sync',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Show changes without applying',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --force',
    description: 'Force sync even if no changes detected',
  })
  parseForce(): boolean {
    return true;
  }
}
```

### 15.2 RBAC Check Command

**File: `commands/rbac-check.command.ts`**

```typescript
import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';

import { CasbinEnforcerService } from '../casbin/services';

type CheckCommandOptions = {
  user: string;
  workspace: string;
  resource: string;
  action: string;
};

@Command({
  name: 'rbac:check',
  description: 'Check permission for user',
})
export class RbacCheckCommand extends CommandRunner {
  private readonly logger = new Logger(RbacCheckCommand.name);

  constructor(private readonly enforcerService: CasbinEnforcerService) {
    super();
  }

  async run(passedParams: string[], options?: CheckCommandOptions): Promise<void> {
    if (!options?.user || !options?.workspace || !options?.resource || !options?.action) {
      this.logger.error(
        'All options required: --user, --workspace, --resource, --action',
      );
      return;
    }

    this.logger.log('Checking permission:');
    this.logger.log(`  User: ${options.user}`);
    this.logger.log(`  Workspace: ${options.workspace}`);
    this.logger.log(`  Resource: ${options.resource}`);
    this.logger.log(`  Action: ${options.action}`);

    try {
      const result = await this.enforcerService.checkPermission({
        userId: options.user.replace('user:', ''),
        workspaceId: options.workspace.replace('ws:', ''),
        resource: options.resource,
        action: options.action,
      });

      this.logger.log(`Result: ${result.allowed ? 'ALLOW' : 'DENY'}`);
      this.logger.log(`Latency: ${result.latencyMs}ms`);
      if (result.reason) {
        this.logger.log(`Reason: ${result.reason}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Check failed: ${errorMessage}`);
    }
  }

  @Option({
    flags: '-u, --user <user>',
    description: 'User ID (format: user:uuid)',
  })
  parseUser(val: string): string {
    return val;
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID (format: ws:uuid)',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --resource <resource>',
    description: 'Resource name',
  })
  parseResource(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --action <action>',
    description: 'Action name',
  })
  parseAction(val: string): string {
    return val;
  }
}
```

**File: `commands/index.ts`**

```typescript
export { RbacSyncCommand } from './rbac-sync.command';
export { RbacCheckCommand } from './rbac-check.command';
```

---

## 16. Tests

### 16.1 Unit Tests

**File: `__tests__/casbin-enforcer.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Enforcer } from 'casbin';

import { CasbinEnforcerService } from '../casbin/services/casbin-enforcer.service';
import { RbacMetricsService } from '../casbin/services/rbac-metrics.service';

describe('CasbinEnforcerService', () => {
  let service: CasbinEnforcerService;
  let mockEnforcer: jest.Mocked<Enforcer>;
  let mockMetrics: jest.Mocked<RbacMetricsService>;

  beforeEach(async () => {
    mockEnforcer = {
      enforce: jest.fn(),
      batchEnforce: jest.fn(),
      getRolesForUserInDomain: jest.fn(),
      loadPolicy: jest.fn(),
      getPolicy: jest.fn(),
    } as unknown as jest.Mocked<Enforcer>;

    mockMetrics = {
      recordDecision: jest.fn(),
      recordFailure: jest.fn(),
    } as unknown as jest.Mocked<RbacMetricsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasbinEnforcerService,
        { provide: 'CASBIN_ENFORCER', useValue: mockEnforcer },
        { provide: RbacMetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<CasbinEnforcerService>(CasbinEnforcerService);
  });

  describe('checkPermission', () => {
    it('should return allowed=true when enforcer allows', async () => {
      mockEnforcer.enforce.mockResolvedValue(true);

      const result = await service.checkPermission({
        userId: 'user-123',
        workspaceId: 'ws-456',
        resource: 'mktCustomer',
        action: 'read',
      });

      expect(result.allowed).toBe(true);
      expect(mockEnforcer.enforce).toHaveBeenCalledWith(
        'user:user-123',
        'ws:ws-456',
        'mktCustomer',
        'read',
      );
    });

    it('should return allowed=false when enforcer denies', async () => {
      mockEnforcer.enforce.mockResolvedValue(false);

      const result = await service.checkPermission({
        userId: 'user-123',
        workspaceId: 'ws-456',
        resource: 'mktCustomer',
        action: 'delete',
      });

      expect(result.allowed).toBe(false);
    });

    it('should fail-closed on error', async () => {
      mockEnforcer.enforce.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.checkPermission({
        userId: 'user-123',
        workspaceId: 'ws-456',
        resource: 'mktCustomer',
        action: 'read',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('enforcement_error');
    });
  });

  describe('batchCheckResourceAccess', () => {
    it('should batch check multiple resources', async () => {
      mockEnforcer.batchEnforce.mockResolvedValue([true, false, true]);

      const result = await service.batchCheckResourceAccess(
        'user-123',
        'ws-456',
        [
          { type: 'mktCustomer', id: '1' },
          { type: 'mktCustomer', id: '2' },
          { type: 'mktCustomer', id: '3' },
        ],
        'read',
      );

      expect(result.get('mktCustomer:1')).toBe(true);
      expect(result.get('mktCustomer:2')).toBe(false);
      expect(result.get('mktCustomer:3')).toBe(true);
    });
  });
});
```

### 16.2 Integration Tests

**File: `__tests__/integration/policy-sync.integration.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Enforcer } from 'casbin';

import { CasbinModule } from '../casbin/casbin.module';
import { PolicySyncService } from '../casbin/services';

describe('PolicySync Integration', () => {
  let app: INestApplication;
  let syncService: PolicySyncService;
  let enforcer: Enforcer;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CasbinModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    syncService = module.get<PolicySyncService>(PolicySyncService);
    enforcer = module.get<Enforcer>('CASBIN_ENFORCER');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('syncWorkspacePolicies', () => {
    it('should sync policies from templates', async () => {
      const workspaceId = 'test-workspace';

      const result = await syncService.syncWorkspacePolicies(workspaceId);

      expect(result.status).toBe('success');
    });

    it('should skip if no changes', async () => {
      const workspaceId = 'test-workspace';

      // First sync
      await syncService.syncWorkspacePolicies(workspaceId);

      // Second sync should skip
      const result = await syncService.syncWorkspacePolicies(workspaceId);

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('no_changes');
    });
  });
});
```

### 16.3 Test Matrix

**File: `__tests__/rbac-test-matrix.ts`**

```typescript
/**
 * RBAC Test Matrix
 *
 * Comprehensive test cases for permission checking.
 */
export const RBAC_TEST_MATRIX = {
  // RBAC Basic Tests
  rbac: [
    {
      name: 'admin_can_read_customer',
      sub: 'tpl:admin',
      dom: 'ws:workspace-001',
      obj: 'mktCustomer',
      act: 'read',
      expected: true,
    },
    {
      name: 'viewer_cannot_delete_customer',
      sub: 'tpl:viewer',
      dom: 'ws:workspace-001',
      obj: 'mktCustomer',
      act: 'delete',
      expected: false,
    },
    {
      name: 'cross_tenant_deny',
      sub: 'user:user-001',
      dom: 'ws:workspace-002', // Different workspace
      obj: 'mktCustomer',
      act: 'read',
      expected: false,
    },
    {
      name: 'role_inheritance',
      sub: 'tpl:admin',
      dom: 'ws:workspace-001',
      obj: 'mktOrder',
      act: 'delete',
      expected: true,
    },
  ],

  // Edge Cases
  edge_cases: [
    {
      name: 'empty_subject_deny',
      sub: '',
      dom: 'ws:workspace-001',
      obj: 'mktCustomer',
      act: 'read',
      expected: false,
    },
    {
      name: 'wildcard_resource',
      sub: 'tpl:super_admin',
      dom: 'ws:*',
      obj: '*',
      act: '*',
      expected: true,
    },
  ],
};
```

---

## 17. Integration Guide

### 17.1 Sử dụng trong Resolver

```typescript
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';

import { RequirePermission } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { RBAC_RESOURCES, RBAC_ACTIONS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

@Resolver(() => MktCustomer)
export class MktCustomerResolver {
  @Query(() => [MktCustomer])
  @RequirePermission(RBAC_RESOURCES.MKT_CUSTOMER, RBAC_ACTIONS.READ)
  async mktCustomers(): Promise<MktCustomer[]> {
    // Implementation
  }

  @Query(() => MktCustomer)
  @RequirePermission(RBAC_RESOURCES.MKT_CUSTOMER, RBAC_ACTIONS.READ)
  async mktCustomer(@Args('id') id: string): Promise<MktCustomer> {
    // Implementation
  }

  @Mutation(() => MktCustomer)
  @RequirePermission(RBAC_RESOURCES.MKT_CUSTOMER, RBAC_ACTIONS.CREATE)
  async createMktCustomer(
    @Args('input') input: CreateCustomerInput,
  ): Promise<MktCustomer> {
    // Implementation
  }

  @Mutation(() => MktCustomer)
  @RequirePermission(RBAC_RESOURCES.MKT_CUSTOMER, RBAC_ACTIONS.UPDATE)
  async updateMktCustomer(
    @Args('id') id: string,
    @Args('input') input: UpdateCustomerInput,
  ): Promise<MktCustomer> {
    // Implementation
  }

  @Mutation(() => Boolean)
  @RequirePermission(RBAC_RESOURCES.MKT_CUSTOMER, RBAC_ACTIONS.DELETE, {
    auditLevel: 'high',
  })
  async deleteMktCustomer(@Args('id') id: string): Promise<boolean> {
    // Implementation
  }
}
```

### 17.2 Programmatic Permission Check

```typescript
import { Injectable } from '@nestjs/common';

import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services';

@Injectable()
export class MktOrderService {
  constructor(
    private readonly enforcerService: CasbinEnforcerService,
  ) {}

  async canUserApproveOrder(
    userId: string,
    workspaceId: string,
    orderId: string,
  ): Promise<boolean> {
    const result = await this.enforcerService.checkPermission({
      userId,
      workspaceId,
      resource: `mktOrder:${orderId}`,
      action: 'approve',
    });

    return result.allowed;
  }

  async filterAccessibleOrders(
    userId: string,
    workspaceId: string,
    orders: MktOrder[],
  ): Promise<MktOrder[]> {
    return this.enforcerService.filterAccessible(
      userId,
      workspaceId,
      orders,
      'mktOrder',
      'read',
    );
  }
}
```

### 17.3 CLI Usage

```bash
# Sync policies for workspace
npx nx run twenty-server:command rbac:sync -- --workspace=550e8400-e29b-41d4-a716-446655440000

# Dry-run sync (preview changes)
npx nx run twenty-server:command rbac:sync -- --workspace=550e8400-e29b-41d4-a716-446655440000 --dry-run

# Check permission
npx nx run twenty-server:command rbac:check -- \
  --user=user:550e8400-e29b-41d4-a716-446655440000 \
  --workspace=ws:123e4567-e89b-12d3-a456-426614174000 \
  --resource=mktCustomer \
  --action=read

# Warm cache
npx nx run twenty-server:command rbac:warm-cache
```

### 17.4 Environment Variables

```bash
# RBAC Engine mode: legacy, casbin, shadow, shadow_casbin
RBAC_ENGINE=shadow

# Enabled resolvers for gradual rollout (comma-separated)
CASBIN_ENABLED_RESOLVERS=mktCustomerResolver,mktOrderResolver

# Shadow mode alerting
RBAC_SHADOW_ALERT=true
RBAC_SHADOW_SAMPLE_RATE=1.0

# Database connection for PgNotifyWatcher
DATABASE_URL=postgresql://user:pass@localhost:5432/twenty
```

---

## Checklist Implementation

### Phase 1: Setup (Week 1)
- [ ] Install packages: `casbin`, `@casbin/typeorm-adapter`, `pg`
- [ ] Create folder structure theo guide
- [ ] Create constants (`resources`, `actions`, `cache-keys`, `error-codes`)
- [ ] Create types (`casbin.types`, `policy.types`, `rbac-config.types`)
- [ ] Create messages pattern
- [ ] Create Casbin model files (`rbac-domains.conf`)
- [ ] Create migration cho `casbin_rule` và `casbin_policy_version`

### Phase 2: Core (Week 2)
- [ ] Implement `PgNotifyWatcher`
- [ ] Implement `createTypeORMAdapter`
- [ ] Implement `PolicyValidator`
- [ ] Implement `CasbinRuleRepository`
- [ ] Implement `PolicyVersionRepository`
- [ ] Implement `CasbinEnforcerService`
- [ ] Implement `PolicySyncService`
- [ ] Implement `RbacMetricsService`
- [ ] Implement `CacheWarmerService`

### Phase 3: Integration (Week 3)
- [ ] Implement `CasbinAuthzGuard`
- [ ] Implement `DualPathAuthzGuard`
- [ ] Implement `@RequirePermission` decorator
- [ ] Implement `PermissionDeniedError`
- [ ] Implement `RbacHealthIndicator`
- [ ] Create `CasbinModule`
- [ ] Update `MktRbacEnterpriseGradeModule`

### Phase 4: CLI & Testing (Week 4)
- [ ] Implement CLI commands (`rbac:sync`, `rbac:check`, `rbac:warm-cache`)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update resolvers với `@RequirePermission`

### Phase 5: Rollout (Week 5)
- [ ] Deploy với `RBAC_ENGINE=shadow`
- [ ] Monitor discrepancies
- [ ] Gradual enable per resolver
- [ ] Switch to `RBAC_ENGINE=casbin`
- [ ] Remove legacy code

---

*Document version: 1.0*
*Created: 2026-01-09*
*Based on: RBAC-MODULE-REDESIGN.md v2.0*
