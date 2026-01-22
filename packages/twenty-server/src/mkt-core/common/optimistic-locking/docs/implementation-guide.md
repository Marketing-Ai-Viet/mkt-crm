# Common Optimistic Locking - Implementation Guide

## Document Information

| Item | Value |
|------|-------|
| **Document Date** | 2026-01-21 |
| **Last Updated** | 2026-01-21 |
| **Module** | mkt-core/common/optimistic-locking |
| **Purpose** | Reusable Optimistic Locking infrastructure |
| **Status** | Implementation Guide |

### Changelog

| Date | Changes |
|------|---------|
| 2026-01-21 | Initial document - Extract from order module |
| 2026-01-21 | Review fixes: type-safe FindOptionsWhere, DateTimeUtils.parse(), lodash.isEqual, currentData in DTO |
| 2026-01-21 | Added: validation guard for internal callers, selectFields config, edge cases documentation |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Implementation Details](#4-implementation-details)
5. [Usage Guide](#5-usage-guide)
6. [Risks and Edge Cases](#6-risks-and-edge-cases)
7. [Migration Guide](#7-migration-guide)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Overview

### 1.1. Purpose

Extract reusable Optimistic Locking components từ Order module thành Common module để:
- **Reuse** cho các entity khác (License, Invoice, Customer, etc.)
- **Consistency** trong cách xử lý concurrent edits
- **Maintainability** - single source of truth cho logic

### 1.2. What is Optimistic Locking?

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTIMISTIC LOCKING                        │
├─────────────────────────────────────────────────────────────┤
│  1. Client load Entity → nhận version (vd: v5)              │
│  2. Client edit locally (không lock gì cả)                  │
│  3. Client save → gửi data + expectedVersion=5              │
│  4. Server: UPDATE ... WHERE id=X AND version=5             │
│     - affected=1 → Success, return version=6                │
│     - affected=0 → Conflict! Return current data            │
│  5. Client hiển thị conflict dialog nếu có                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.3. Reusable vs Entity-Specific

| Component | Reusable (Common) | Entity-Specific |
|-----------|-------------------|-----------------|
| Types (`OptimisticUpdateResult`, `FieldConflict`) | ✅ | |
| GraphQL DTOs (Input/Output) | ✅ | |
| Base Service (version check, atomic update) | ✅ | |
| Messages | ✅ | |
| Editable Fields List | | ✅ Each entity defines own |
| Entity Class Reference | | ✅ |
| Repository Name | | ✅ |

---

## 2. Architecture

### 2.1. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMMON MODULE                                    │
│                 (mkt-core/common/optimistic-locking)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                  │
│  │  Types              │  │  Messages           │                  │
│  │  - OptimisticUpdate │  │  - NOT_FOUND        │                  │
│  │    Result<T>        │  │  - VERSION_CONFLICT │                  │
│  │  - FieldConflict    │  │  - UPDATE_SUCCESS   │                  │
│  │  - ConflictInfo     │  │                     │                  │
│  └─────────────────────┘  └─────────────────────┘                  │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                  │
│  │  DTOs (GraphQL)     │  │  Base Service       │                  │
│  │  - UpdateWithVersion│  │  (Abstract)         │                  │
│  │    Input            │  │  - updateWith       │                  │
│  │  - ResolveConflict  │  │    OptimisticLock() │                  │
│  │    Input            │  │  - forceUpdate()    │                  │
│  │  - ConflictInfo     │  │  - detectConflicts()│                  │
│  │    Output           │  │                     │                  │
│  └─────────────────────┘  └─────────────────────┘                  │
│                                    │                                 │
└────────────────────────────────────┼─────────────────────────────────┘
                                     │
                                     │ extends
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│  ORDER MODULE         │ │  LICENSE MODULE   │ │  INVOICE MODULE   │
├───────────────────────┤ ├───────────────────┤ ├───────────────────┤
│  OrderConcurrency     │ │  LicenseConcurrency│ │  InvoiceConcurrency│
│  Service              │ │  Service          │ │  Service          │
│  - editableFields     │ │  - editableFields │ │  - editableFields │
│  - entityName         │ │  - entityName     │ │  - entityName     │
│                       │ │                   │ │                   │
│  OrderEditResolver    │ │  LicenseEdit      │ │  InvoiceEdit      │
│                       │ │  Resolver         │ │  Resolver         │
└───────────────────────┘ └───────────────────┘ └───────────────────┘
```

### 2.2. Class Diagram

```
┌─────────────────────────────────────────────────────────────┐
│             BaseOptimisticLockingService<T>                  │
│                        <<abstract>>                          │
├─────────────────────────────────────────────────────────────┤
│ # logger: Logger                                            │
│ # config: OptimisticLockingConfig                           │
│ # twentyORMGlobalManager: TwentyORMGlobalManager           │
├─────────────────────────────────────────────────────────────┤
│ + updateWithOptimisticLock(                                 │
│     workspaceId, entityId, data, expectedVersion            │
│   ): Promise<OptimisticUpdateResult<T>>                     │
│                                                             │
│ + forceUpdate(                                              │
│     workspaceId, entityId, resolvedData, currentVersion     │
│   ): Promise<OptimisticUpdateResult<T>>                     │
│                                                             │
│ # detectConflicts(                                          │
│     userChanges, currentData                                │
│   ): FieldConflict[]                                        │
│                                                             │
│ # buildConflictInfo(entity, conflicts): ConflictInfo        │
│                                                             │
│ # isEqual(a, b): boolean                                    │
└─────────────────────────────────────────────────────────────┘
                              △
                              │ extends
                              │
┌─────────────────────────────────────────────────────────────┐
│              OrderConcurrencyService                         │
├─────────────────────────────────────────────────────────────┤
│ config.entityName = 'mktOrder'                              │
│ config.editableFields = EDITABLE_ORDER_FIELDS               │
│ config.logContext = 'OrderConcurrency'                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.3. Sequence Diagram - Update Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────┐
│ Resolver │     │ Concrete     │     │ Base Service    │     │   DB   │
│          │     │ Service      │     │ (Common)        │     │        │
└────┬─────┘     └──────┬───────┘     └────────┬────────┘     └───┬────┘
     │                  │                      │                   │
     │ updateWithVersion│                      │                   │
     │─────────────────>│                      │                   │
     │                  │ updateWithOptimistic │                   │
     │                  │ Lock()               │                   │
     │                  │─────────────────────>│                   │
     │                  │                      │ getRepository()   │
     │                  │                      │──────────────────>│
     │                  │                      │<──────────────────│
     │                  │                      │                   │
     │                  │                      │ UPDATE...WHERE    │
     │                  │                      │ version=expected  │
     │                  │                      │──────────────────>│
     │                  │                      │    affected       │
     │                  │                      │<──────────────────│
     │                  │                      │                   │
     │                  │    [if affected=0]   │                   │
     │                  │                      │ SELECT current    │
     │                  │                      │──────────────────>│
     │                  │                      │<──────────────────│
     │                  │                      │                   │
     │                  │                      │ detectConflicts() │
     │                  │                      │ (uses editableFields)
     │                  │                      │                   │
     │                  │<─────────────────────│                   │
     │<─────────────────│  OptimisticUpdateResult                 │
     │                  │                      │                   │
```

---

## 3. File Structure

### 3.1. Common Module Structure

```
packages/twenty-server/src/mkt-core/common/optimistic-locking/
├── index.ts                              # Public exports
├── docs/
│   └── implementation-guide.md           # This document
├── types/
│   └── optimistic-locking.types.ts       # Generic types
├── dto/
│   └── optimistic-locking.dto.ts         # GraphQL DTOs
├── messages/
│   └── optimistic-locking.messages.ts    # Centralized messages
└── services/
    └── base-optimistic-locking.service.ts # Abstract base service
```

### 3.2. Files to Create

| File | Description | LOC (Est.) |
|------|-------------|------------|
| `types/optimistic-locking.types.ts` | Generic type definitions | ~60 |
| `dto/optimistic-locking.dto.ts` | GraphQL Input/Output types | ~100 |
| `messages/optimistic-locking.messages.ts` | Error/success messages | ~30 |
| `services/base-optimistic-locking.service.ts` | Abstract base service | ~150 |
| `index.ts` | Public exports | ~20 |

**Total: ~360 LOC**

### 3.3. Entity Module Changes (per entity)

```
packages/twenty-server/src/mkt-core/order/
├── constants/
│   └── editable-fields.constants.ts      # NEW: EDITABLE_ORDER_FIELDS
├── services/
│   └── order-concurrency.service.ts      # MODIFY: extend base service
└── resolvers/
    └── order-edit.resolver.ts            # KEEP: entity-specific resolver
```

---

## 4. Implementation Details

### 4.1. Types

**File**: `types/optimistic-locking.types.ts`

```typescript
/**
 * Entity interface required for optimistic locking
 * Entity must have 'version' field
 */
export type VersionedEntity = {
  id: string;
  version: number | null;
  updatedAt?: string | Date | null;
};

/**
 * Result of optimistic update operation
 * Generic type T represents the entity type
 */
export type OptimisticUpdateResult<T extends VersionedEntity = VersionedEntity> = {
  success: boolean;
  newVersion?: number;
  error?: string;
  conflict?: ConflictInfo;
  /** Current entity data (returned on conflict) */
  currentData?: T;
};

/**
 * Represents a single field conflict
 */
export type FieldConflict = {
  field: string;
  yourValue: unknown;
  currentValue: unknown;
};

/**
 * Full conflict information
 */
export type ConflictInfo = {
  currentVersion: number;
  conflicts: FieldConflict[];
  modifiedAt?: Date;
};

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy = 'KEEP_MINE' | 'KEEP_THEIRS' | 'MERGE';

/**
 * Configuration for optimistic locking service
 */
export type OptimisticLockingConfig = {
  /** Entity name for repository lookup (e.g., 'mktOrder') */
  entityName: string;
  /**
   * List of fields that can be edited (for conflict detection).
   *
   * **IMPORTANT**: Only fields in this list are checked for conflicts.
   * Fields NOT in this list will NOT be detected as conflicts,
   * but will still be updated if present in data payload.
   */
  editableFields: readonly string[];
  /** Log context for debugging */
  logContext: string;
  /**
   * Optional: Fields to select when fetching entity for conflict UI.
   * If not set, returns full entity (may contain sensitive data).
   *
   * Use for:
   * - Privacy: Limit exposed fields
   * - Performance: Reduce data transfer
   *
   * Note: 'id', 'version', 'updatedAt' are always included automatically.
   *
   * @example ['id', 'version', 'name', 'note', 'updatedAt']
   */
  selectFields?: readonly string[];
};
```

### 4.2. Messages

**File**: `messages/optimistic-locking.messages.ts`

```typescript
export const OPTIMISTIC_LOCKING_MESSAGES = {
  // Success
  UPDATE_SUCCESS: 'Entity updated successfully',
  CONFLICT_RESOLVED: 'Conflict resolved successfully',

  // Errors
  ENTITY_NOT_FOUND: 'Entity not found',
  VERSION_CONFLICT: 'Entity was modified by another user',
  INVALID_VERSION: 'Invalid version number',
  UPDATE_FAILED: 'Failed to update entity',

  // Info
  NO_CONFLICTS: 'No conflicts detected',
  FORCE_UPDATE_APPLIED: 'Force update applied',
} as const;

export type OptimisticLockingMessageKey = keyof typeof OPTIMISTIC_LOCKING_MESSAGES;
```

### 4.3. DTOs

**File**: `dto/optimistic-locking.dto.ts`

```typescript
import { Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsNumber, Min } from 'class-validator';

import GraphQLJSON from 'graphql-type-json';

// ============================================
// ENUMS
// ============================================

export enum ConflictResolutionStrategyEnum {
  KEEP_MINE = 'KEEP_MINE',
  KEEP_THEIRS = 'KEEP_THEIRS',
  MERGE = 'MERGE',
}

registerEnumType(ConflictResolutionStrategyEnum, {
  name: 'ConflictResolutionStrategy',
  description: 'Strategy for resolving edit conflicts',
});

// ============================================
// INPUT DTOs (Base classes - extend per entity)
// ============================================

/**
 * Base input for optimistic update
 * Extend this class and add entity-specific ID field
 *
 * @example
 * @InputType()
 * export class UpdateOrderWithVersionInput extends BaseUpdateWithVersionInput {
 *   @Field(() => ID)
 *   @IsUUID()
 *   orderId: string;
 *
 *   get entityId(): string { return this.orderId; }
 * }
 */
@InputType({ isAbstract: true })
export abstract class BaseUpdateWithVersionInput {
  @Field(() => Int, { description: 'Expected version number' })
  @IsNumber()
  @Min(1)
  expectedVersion: number;

  @Field(() => GraphQLJSON, { description: 'Fields to update' })
  data: Record<string, unknown>;

  /** Override in subclass to return the entity ID */
  abstract get entityId(): string;
}

/**
 * Base input for conflict resolution
 */
@InputType({ isAbstract: true })
export abstract class BaseResolveConflictInput {
  @Field(() => Int, { description: 'Current version in database' })
  @IsNumber()
  @Min(1)
  currentVersion: number;

  @Field(() => GraphQLJSON, { description: 'Resolved data to save' })
  resolvedData: Record<string, unknown>;

  /** Override in subclass to return the entity ID */
  abstract get entityId(): string;
}

// ============================================
// OUTPUT DTOs (Reusable as-is)
// ============================================

@ObjectType()
export class FieldConflictOutput {
  @Field(() => String)
  field: string;

  @Field(() => GraphQLJSON, { nullable: true })
  yourValue?: unknown;

  @Field(() => GraphQLJSON, { nullable: true })
  currentValue?: unknown;
}

@ObjectType()
export class ConflictInfoOutput {
  @Field(() => Int)
  currentVersion: number;

  @Field(() => [FieldConflictOutput])
  conflicts: FieldConflictOutput[];

  @Field(() => Date, { nullable: true })
  modifiedAt?: Date;
}

@ObjectType()
export class OptimisticUpdateOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int, { nullable: true, description: 'New version after successful update' })
  newVersion?: number;

  @Field(() => String, { nullable: true, description: 'Error message if failed' })
  error?: string;

  @Field(() => ConflictInfoOutput, { nullable: true, description: 'Conflict details if version mismatch' })
  conflict?: ConflictInfoOutput;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Current entity data when conflict occurs. Use for merge UI or refetch typed data via standard query.'
  })
  currentData?: Record<string, unknown>;
}
```

> **Note về currentData**: Field này trả về raw JSON của entity hiện tại khi có conflict.
> Frontend có 2 cách sử dụng:
> 1. **Merge UI**: Sử dụng trực tiếp `currentData` để hiển thị so sánh
> 2. **Typed data**: Refetch entity qua standard GraphQL query để có typed response

### 4.4. Base Service

**File**: `services/base-optimistic-locking.service.ts`

```typescript
import { Logger } from '@nestjs/common';

import isEqual from 'lodash.isequal';
import { FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { OPTIMISTIC_LOCKING_MESSAGES } from 'src/mkt-core/common/optimistic-locking/messages/optimistic-locking.messages';
import {
  ConflictInfo,
  FieldConflict,
  OptimisticLockingConfig,
  OptimisticUpdateResult,
  VersionedEntity,
} from 'src/mkt-core/common/optimistic-locking/types/optimistic-locking.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Abstract base service for optimistic locking operations
 *
 * Provides:
 * - Atomic update with version check
 * - Conflict detection
 * - Force update after conflict resolution
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderConcurrencyService extends BaseOptimisticLockingService<MktOrderWorkspaceEntity> {
 *   constructor(twentyORMGlobalManager: TwentyORMGlobalManager) {
 *     super(twentyORMGlobalManager, {
 *       entityName: 'mktOrder',
 *       editableFields: EDITABLE_ORDER_FIELDS,
 *       logContext: 'OrderConcurrency',
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseOptimisticLockingService<T extends VersionedEntity> {
  protected readonly logger: Logger;
  protected readonly config: OptimisticLockingConfig;

  constructor(
    protected readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    config: OptimisticLockingConfig,
  ) {
    this.config = config;
    this.logger = new Logger(config.logContext);
  }

  /**
   * Update entity with optimistic locking
   *
   * @param workspaceId - Workspace ID
   * @param entityId - Entity ID to update
   * @param data - Partial data to update
   * @param expectedVersion - Expected version number
   * @returns Result with success status and conflict info if version mismatch
   */
  async updateWithOptimisticLock(
    workspaceId: string,
    entityId: string,
    data: Partial<T>,
    expectedVersion: number,
  ): Promise<OptimisticUpdateResult<T>> {
    this.logger.debug(
      `Optimistic update: entityId=${entityId}, expectedVersion=${expectedVersion}`,
    );

    const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<T>(
      workspaceId,
      this.config.entityName,
    );

    // Atomic update with version check
    // QueryBuilder infers entity from repository context
    const result = await repository
      .createQueryBuilder()
      .update()
      .set({
        ...data,
        version: () => 'version + 1',
        updatedAt: DateTimeUtils.toDate(DateTimeUtils.now()),
      } as QueryDeepPartialEntity<T>)
      .where('id = :id AND version = :version', {
        id: entityId,
        version: expectedVersion,
      })
      .execute();

    // Success - version matched and update applied
    if (result.affected === 1) {
      this.logger.debug(
        `Update success: entityId=${entityId}, newVersion=${expectedVersion + 1}`,
      );

      return {
        success: true,
        newVersion: expectedVersion + 1,
      };
    }

    // Version mismatch - fetch current data for conflict detection
    const currentEntity = await repository.findOne({
      where: { id: entityId } as FindOptionsWhere<T>,
    });

    // Entity not found
    if (!currentEntity) {
      this.logger.warn(`Entity not found: entityId=${entityId}`);

      return {
        success: false,
        error: OPTIMISTIC_LOCKING_MESSAGES.ENTITY_NOT_FOUND,
      };
    }

    // Detect field-level conflicts
    const conflicts = this.detectConflicts(data, currentEntity);

    this.logger.debug(
      `Version conflict: entityId=${entityId}, expectedVersion=${expectedVersion}, ` +
        `currentVersion=${currentEntity.version}, conflictCount=${conflicts.length}`,
    );

    return {
      success: false,
      error: OPTIMISTIC_LOCKING_MESSAGES.VERSION_CONFLICT,
      conflict: this.buildConflictInfo(currentEntity, conflicts),
      currentData: currentEntity,
    };
  }

  /**
   * Force update after user resolves conflict
   *
   * Uses current version to ensure no other changes happened during resolution.
   * If another conflict occurs, returns new conflict info.
   *
   * @param workspaceId - Workspace ID
   * @param entityId - Entity ID to update
   * @param resolvedData - Data after user resolved conflicts
   * @param currentVersion - Current version from conflict info
   */
  async forceUpdate(
    workspaceId: string,
    entityId: string,
    resolvedData: Partial<T>,
    currentVersion: number,
  ): Promise<OptimisticUpdateResult<T>> {
    this.logger.debug(
      `Force update: entityId=${entityId}, currentVersion=${currentVersion}`,
    );

    return this.updateWithOptimisticLock(
      workspaceId,
      entityId,
      resolvedData,
      currentVersion,
    );
  }

  /**
   * Detect field-level conflicts between user's changes and current data
   *
   * Only compares fields defined in editableFields config.
   * Returns list of fields where values differ.
   */
  protected detectConflicts(
    userChanges: Partial<T>,
    currentData: T,
  ): FieldConflict[] {
    const conflicts: FieldConflict[] = [];

    for (const field of this.config.editableFields) {
      if (field in userChanges) {
        const yourValue = userChanges[field as keyof typeof userChanges];
        const currentValue = currentData[field as keyof typeof currentData];

        // Only add to conflicts if values are different
        if (!this.isEqual(yourValue, currentValue)) {
          conflicts.push({
            field,
            yourValue,
            currentValue,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Build ConflictInfo from entity and detected conflicts
   *
   * Note: updatedAt có thể là Date object hoặc ISO string tùy context.
   * Sử dụng DateTimeUtils.parse() để handle cả 2 trường hợp.
   */
  protected buildConflictInfo(entity: T, conflicts: FieldConflict[]): ConflictInfo {
    return {
      currentVersion: entity.version ?? 0,
      conflicts,
      // parse() handles Date, string (ISO), number (millis) safely
      modifiedAt: entity.updatedAt
        ? DateTimeUtils.toDate(DateTimeUtils.parse(entity.updatedAt))
        : undefined,
    };
  }

  /**
   * Compare two values for equality
   *
   * Sử dụng lodash.isEqual để deep equality comparison.
   * Handles: nested objects, arrays, dates, key order differences.
   *
   * Override in subclass for custom comparison logic if needed.
   */
  protected isEqual(a: unknown, b: unknown): boolean {
    // lodash.isEqual handles all cases:
    // - null/undefined
    // - primitives
    // - Date objects
    // - nested objects (with correct key order handling)
    // - arrays
    return isEqual(a, b);
  }
}
```

> **Technical Notes**:
> - **lodash.isEqual** được chọn thay cho JSON.stringify vì:
>   - JSON.stringify có thể khác nhau khi key order khác (`{a:1,b:2}` ≠ `{b:2,a:1}`)
>   - lodash.isEqual handle deep equality chính xác cho nested objects
> - **DateTimeUtils.parse()** được dùng trong buildConflictInfo vì:
>   - updatedAt có thể là Date object hoặc ISO string tùy vào context (workspace entity vs raw query)
>   - parse() safely handles cả Date, string, và number (millis)

### 4.5. Index Exports

**File**: `index.ts`

```typescript
// Types
export * from './types/optimistic-locking.types';

// DTOs
export * from './dto/optimistic-locking.dto';

// Messages
export * from './messages/optimistic-locking.messages';

// Services
export { BaseOptimisticLockingService } from './services/base-optimistic-locking.service';
```

---

## 5. Usage Guide

### 5.1. Implementing for Order Module

**Step 1: Define editable fields**

```typescript
// packages/twenty-server/src/mkt-core/order/constants/editable-fields.constants.ts

export const EDITABLE_ORDER_FIELDS = [
  'name',
  'note',
  'discount',
  'discountPercent',
  'requireContract',
  'mktCustomerId',
  'mktContractId',
  'couponCode',
  'paymentDeadline',
] as const;

export type EditableOrderField = (typeof EDITABLE_ORDER_FIELDS)[number];
```

**Step 2: Create concrete service**

```typescript
// packages/twenty-server/src/mkt-core/order/services/order-concurrency.service.ts

import { Injectable } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseOptimisticLockingService } from 'src/mkt-core/common/optimistic-locking';

import { EDITABLE_ORDER_FIELDS } from '../constants/editable-fields.constants';
import { MktOrderWorkspaceEntity } from '../objects/mkt-order.workspace-entity';

@Injectable()
export class OrderConcurrencyService extends BaseOptimisticLockingService<MktOrderWorkspaceEntity> {
  constructor(twentyORMGlobalManager: TwentyORMGlobalManager) {
    super(twentyORMGlobalManager, {
      entityName: 'mktOrder',
      editableFields: EDITABLE_ORDER_FIELDS,
      logContext: 'OrderConcurrency',
    });
  }
}
```

**Step 3: Create DTOs (extend base)**

```typescript
// packages/twenty-server/src/mkt-core/order/dto/order-optimistic-locking.dto.ts

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

import {
  BaseResolveConflictInput,
  BaseUpdateWithVersionInput,
  OptimisticUpdateOutput,
} from 'src/mkt-core/common/optimistic-locking';

@InputType()
export class UpdateOrderWithVersionInput extends BaseUpdateWithVersionInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  get entityId(): string {
    return this.orderId;
  }
}

@InputType()
export class ResolveOrderConflictInput extends BaseResolveConflictInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  get entityId(): string {
    return this.orderId;
  }
}

// Re-export output type with alias for consistency
export { OptimisticUpdateOutput as UpdateOrderWithVersionOutput };
```

**Step 4: Create resolver**

```typescript
// packages/twenty-server/src/mkt-core/order/resolvers/order-edit.resolver.ts

import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';

import {
  ResolveOrderConflictInput,
  UpdateOrderWithVersionInput,
  UpdateOrderWithVersionOutput,
} from '../dto/order-optimistic-locking.dto';
import { MktOrderWorkspaceEntity } from '../objects/mkt-order.workspace-entity';
import { OrderConcurrencyService } from '../services/order-concurrency.service';

@Resolver(() => MktOrderWorkspaceEntity)
export class OrderEditResolver {
  constructor(
    private readonly orderConcurrencyService: OrderConcurrencyService,
  ) {}

  @Mutation(() => UpdateOrderWithVersionOutput, {
    description: 'Update order with optimistic locking',
  })
  async updateOrderWithVersion(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: UpdateOrderWithVersionInput,
  ): Promise<UpdateOrderWithVersionOutput> {
    const result = await this.orderConcurrencyService.updateWithOptimisticLock(
      workspace.id,
      input.entityId,
      input.data as Partial<MktOrderWorkspaceEntity>,
      input.expectedVersion,
    );

    return {
      success: result.success,
      newVersion: result.newVersion,
      error: result.error,
      conflict: result.conflict,
      // Trả về currentData khi có conflict để UI có thể hiển thị merge view
      currentData: result.currentData as Record<string, unknown> | undefined,
    };
  }

  @Mutation(() => UpdateOrderWithVersionOutput, {
    description: 'Force update order after resolving conflict',
  })
  async resolveOrderConflict(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: ResolveOrderConflictInput,
  ): Promise<UpdateOrderWithVersionOutput> {
    const result = await this.orderConcurrencyService.forceUpdate(
      workspace.id,
      input.entityId,
      input.resolvedData as Partial<MktOrderWorkspaceEntity>,
      input.currentVersion,
    );

    return {
      success: result.success,
      newVersion: result.newVersion,
      error: result.error,
      conflict: result.conflict,
      currentData: result.currentData as Record<string, unknown> | undefined,
    };
  }
}
```

### 5.2. Implementing for License Module

```typescript
// packages/twenty-server/src/mkt-core/license/constants/editable-fields.constants.ts

export const EDITABLE_LICENSE_FIELDS = [
  'name',
  'status',
  'expiresAt',
  'maxDevices',
  'note',
] as const;

// packages/twenty-server/src/mkt-core/license/services/license-concurrency.service.ts

@Injectable()
export class LicenseConcurrencyService extends BaseOptimisticLockingService<MktLicenseWorkspaceEntity> {
  constructor(twentyORMGlobalManager: TwentyORMGlobalManager) {
    super(twentyORMGlobalManager, {
      entityName: 'mktLicense',
      editableFields: EDITABLE_LICENSE_FIELDS,
      logContext: 'LicenseConcurrency',
    });
  }
}
```

---

## 6. Risks and Edge Cases

### 6.1. Validation Edge Cases

#### expectedVersion Validation

**Problem**: `expectedVersion` được validate ở DTO layer (`@Min(1)`), nhưng service có thể được gọi trực tiếp từ internal code không qua GraphQL, bypass DTO validation.

**Solution**: Service có internal validation guard:

```typescript
// Base service thêm validation guard
if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
  this.logger.warn(`Invalid expectedVersion: entityId=${entityId}, expectedVersion=${expectedVersion}`);

  return {
    success: false,
    error: OPTIMISTIC_LOCKING_MESSAGES.INVALID_VERSION_MUST_BE_POSITIVE,
  };
}
```

**Design Decision**: Theo guidelines, không silent fail mà log warning + return error để caller handle.

### 6.2. Conflict Detection Scope

**Behavior**: Conflict detection chỉ check các fields trong `editableFields` config.

```
┌─────────────────────────────────────────────────────────────┐
│                   CONFLICT DETECTION SCOPE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  editableFields = ['name', 'note', 'discount']              │
│                                                              │
│  User changes: { name: 'X', note: 'Y', status: 'CONFIRMED' }│
│                        ▲          ▲              ▲           │
│                        │          │              │           │
│              CHECKED ──┘          │              │           │
│                      CHECKED ─────┘              │           │
│                             NOT CHECKED ─────────┘           │
│                             (not in editableFields)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Important Notes for Entity Owners**:
- Fields **không** trong `editableFields` sẽ **KHÔNG** được detect conflict
- Những fields này vẫn được update nếu có trong `data` payload
- Entity owner cần xác định đúng fields nào cần conflict detection

**Recommendation**: Thêm comment trong editable fields constant:

```typescript
/**
 * Editable fields for Order conflict detection.
 *
 * IMPORTANT: Fields NOT in this list will NOT trigger conflicts!
 * Add new fields here if they need concurrent edit protection.
 */
export const EDITABLE_ORDER_FIELDS = [
  'name',
  'note',
  // ... etc
] as const;
```

### 6.3. currentData Response Format

**Behavior**: `currentData` trả về raw entity object; GraphQL serialize thành JSON.

```
┌─────────────────────────────────────────────────────────────┐
│                   currentData TRANSFORMATION                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Service returns:                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ currentData: MktOrderWorkspaceEntity {              │    │
│  │   id: '...',                                        │    │
│  │   name: '...',                                      │    │
│  │   createdAt: Date object,                           │    │
│  │   relations: [loaded relations...]                  │    │
│  │ }                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼ GraphQL serialization           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ currentData: {                                      │    │
│  │   "id": "...",                                      │    │
│  │   "name": "...",                                    │    │
│  │   "createdAt": "2024-01-01T00:00:00.000Z",         │    │
│  │   "relations": [...]                                │    │
│  │ }                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Frontend Usage Options**:

1. **Direct use** (untyped JSON):
```typescript
// Simple, nhưng không có type safety
const conflictData = response.currentData;
```

2. **Refetch typed data** (recommended for complex UIs):
```typescript
// Refetch qua standard query để có typed response
const { data } = await refetchOrder(entityId);
```

### 6.4. Privacy và Performance với selectFields

**Use Case**: Một số entities có sensitive fields không nên expose trong conflict UI.

**Configuration**:

```typescript
@Injectable()
export class OrderConcurrencyService extends BaseOptimisticLockingService<MktOrderWorkspaceEntity> {
  constructor(twentyORMGlobalManager: TwentyORMGlobalManager) {
    super(twentyORMGlobalManager, {
      entityName: 'mktOrder',
      editableFields: EDITABLE_ORDER_FIELDS,
      logContext: 'OrderConcurrency',
      // Chỉ trả về các fields cần thiết cho conflict UI
      selectFields: ['id', 'version', 'name', 'note', 'discount', 'updatedAt'],
    });
  }
}
```

**Behavior**:
- `id`, `version`, `updatedAt` luôn được include (required for conflict detection)
- Các fields khác theo config
- Nếu không set `selectFields`, trả về toàn bộ entity

### 6.5. Concurrent Conflict Resolution

**Scenario**: User A đang resolve conflict, trong lúc đó User B cũng edit và save.

```
User A: Load (v5) → Edit → Save (CONFLICT v6) → Resolving...
User B:                     Load (v6) → Edit → Save (SUCCESS v7)
User A:                                         → Resolve (CONFLICT v7!)
```

**Solution**: `forceUpdate()` sử dụng `currentVersion` từ conflict info, đảm bảo version vẫn được check. Nếu có thay đổi mới, user sẽ nhận conflict mới.

---

## 7. Migration Guide

### 7.1. Steps to Migrate Order Module

| Step | Action | File |
|------|--------|------|
| 1 | Create common module files | `common/optimistic-locking/*` |
| 2 | Move types to common (extract generic parts) | `order/types/` → `common/types/` |
| 3 | Create editable fields constant | `order/constants/editable-fields.constants.ts` |
| 4 | Refactor service to extend base | `order/services/order-concurrency.service.ts` |
| 5 | Update DTOs to extend base classes | `order/dto/optimistic-locking.dto.ts` |
| 6 | Update resolver imports | `order/resolvers/order-edit.resolver.ts` |
| 7 | Update module registration | `order/mkt-order.module.ts` |
| 8 | **Export in index.ts** (nếu module dùng barrel exports) | `order/services/index.ts`, `order/dto/index.ts` |

### 7.2. Breaking Changes

**None** - This is an additive change. Existing code continues to work.

### 7.3. Backwards Compatibility

The common module is designed to be opt-in:
- Existing implementations can continue to work independently
- New implementations can extend the base classes
- Gradual migration is supported

---

## 8. Testing Strategy

### 8.1. Unit Tests for Base Service

**File**: `services/__tests__/base-optimistic-locking.service.spec.ts`

```typescript
describe('BaseOptimisticLockingService', () => {
  // Create concrete implementation for testing
  class TestConcurrencyService extends BaseOptimisticLockingService<TestEntity> {
    protected getEntityClass() {
      return TestEntity;
    }
  }

  describe('updateWithOptimisticLock', () => {
    it('should succeed when version matches', async () => {
      // Mock repository to return affected: 1
      mockRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      });

      const result = await service.updateWithOptimisticLock(
        workspaceId,
        entityId,
        { name: 'New Name' },
        5,
      );

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe(6);
    });

    it('should return conflict when version mismatches', async () => {
      // Mock affected: 0 and current entity with version 7
      mockRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      mockRepository.findOne.mockResolvedValue({
        id: entityId,
        version: 7,
        name: 'Current Name',
      });

      const result = await service.updateWithOptimisticLock(
        workspaceId,
        entityId,
        { name: 'New Name' },
        5,
      );

      expect(result.success).toBe(false);
      expect(result.conflict?.currentVersion).toBe(7);
    });

    it('should return error when entity not found', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.updateWithOptimisticLock(
        workspaceId,
        'non-existent-id',
        { name: 'New Name' },
        5,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(OPTIMISTIC_LOCKING_MESSAGES.ENTITY_NOT_FOUND);
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts only for editable fields', () => {
      const userChanges = { name: 'New Name', note: 'New Note' };
      const currentData = { name: 'Current Name', note: 'Current Note', id: '123' };

      const conflicts = service['detectConflicts'](userChanges, currentData);

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].field).toBe('name');
    });

    it('should not detect conflict when values are equal', () => {
      const userChanges = { name: 'Same Name' };
      const currentData = { name: 'Same Name', id: '123' };

      const conflicts = service['detectConflicts'](userChanges, currentData);

      expect(conflicts).toHaveLength(0);
    });
  });
});
```

### 8.2. Integration Test Scenarios

| Test ID | Scenario | Expected |
|---------|----------|----------|
| INT-001 | Single user update with correct version | Success, version incremented |
| INT-002 | Two users load same version, first saves, second saves | Second user gets conflict |
| INT-003 | User resolves conflict and saves | Success with new version |
| INT-004 | Conflict during conflict resolution | New conflict returned |
| INT-005 | Update non-existent entity | Error: Entity not found |
| INT-006 | Update with expectedVersion = 0 | Error: Invalid version (validation guard) |
| INT-007 | Update with expectedVersion = -1 | Error: Invalid version (validation guard) |
| INT-008 | Update with non-integer expectedVersion | Error: Invalid version (validation guard) |

---

## Summary

| Aspect | Value |
|--------|-------|
| **New Files** | 5 files in common module |
| **Total LOC** | ~360 lines |
| **Complexity** | Low-Medium |
| **Dependencies** | TwentyORMGlobalManager, DateTimeUtils, lodash (isEqual) |
| **Breaking Changes** | None |

### Benefits

1. **Code Reuse**: One implementation, multiple entities
2. **Consistency**: Same conflict handling UX across all entities
3. **Maintainability**: Fix once, apply everywhere
4. **Type Safety**: Generic types ensure compile-time checks
5. **Extensibility**: Easy to add custom logic per entity

### Next Steps

1. [ ] Create common module files
2. [ ] Add unit tests for base service
3. [ ] Migrate Order module to use common
4. [ ] Document usage for other teams
5. [ ] Add License module implementation as example
