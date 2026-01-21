# Hybrid Concurrent Editing - Implementation Guide

## Document Information

| Item | Value |
|------|-------|
| **Document Date** | 2026-01-21 |
| **Module** | mkt-core/order |
| **Solution** | Hybrid Approach (Optimistic Locking + Soft Lock + Real-time) |
| **Status** | Implementation Guide |
| **Estimated Effort** | 3-4 weeks |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1: Optimistic Locking](#2-phase-1-optimistic-locking)
3. [Phase 2: Soft Lock Layer](#3-phase-2-soft-lock-layer)
4. [Phase 3: Real-time Notifications](#4-phase-3-real-time-notifications)
5. [Phase 4: Frontend Integration](#5-phase-4-frontend-integration)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment Checklist](#7-deployment-checklist)
8. [Troubleshooting Guide](#8-troubleshooting-guide)

---

## 1. Architecture Overview

### 1.1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ OrderEditForm   │  │ LockIndicator   │  │ ConflictDialog  │             │
│  │ - tracks version│  │ - shows editor  │  │ - diff view     │             │
│  │ - heartbeat     │  │ - countdown     │  │ - merge options │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                    ┌───────────▼───────────┐                               │
│                    │  useOrderEditLock()   │ ◄── Custom React Hook         │
│                    │  - acquire/release    │                               │
│                    │  - heartbeat interval │                               │
│                    │  - conflict handling  │                               │
│                    └───────────┬───────────┘                               │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                    GraphQL + WebSocket
                                 │
┌────────────────────────────────┼────────────────────────────────────────────┐
│                         BACKEND (NestJS)                                     │
├────────────────────────────────┼────────────────────────────────────────────┤
│                    ┌───────────▼───────────┐                               │
│                    │  OrderEditResolver    │                               │
│                    │  - acquireEditLock    │                               │
│                    │  - releaseEditLock    │                               │
│                    │  - extendEditLock     │                               │
│                    │  - updateWithVersion  │                               │
│                    └───────────┬───────────┘                               │
│                                │                                            │
│           ┌────────────────────┼────────────────────┐                      │
│           │                    │                    │                      │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐             │
│  │ OrderConcurrency│  │ OrderCrudService│  │ OrderNotification│            │
│  │ Service         │  │                 │  │ Service          │            │
│  │ - soft lock     │  │ - CRUD ops      │  │ - publish events │            │
│  │ - version check │  │ - version update│  │ - subscribe      │            │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘             │
│           │                    │                    │                      │
│           └────────────────────┼────────────────────┘                      │
│                                │                                            │
│                    ┌───────────▼───────────┐                               │
│                    │  MktOrderRepository   │                               │
│                    │  - updateWithVersion  │                               │
│                    │  - lockForEdit        │                               │
│                    │  - atomic operations  │                               │
│                    └───────────┬───────────┘                               │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌───────▼───────┐ ┌───────▼───────┐
     │   PostgreSQL    │ │     Redis     │ │   WebSocket   │
     │   - orders      │ │   - pub/sub   │ │   - Gateway   │
     │   - version     │ │   - lock cache│ │   - rooms     │
     │   - lock fields │ │   - heartbeat │ │   - broadcast │
     └─────────────────┘ └───────────────┘ └───────────────┘
```

### 1.2. Data Flow Sequence

```
┌──────┐          ┌──────────┐          ┌─────────┐          ┌───────┐
│User A│          │ Frontend │          │ Backend │          │  DB   │
└──┬───┘          └────┬─────┘          └────┬────┘          └───┬───┘
   │                   │                     │                   │
   │ Open Order Edit   │                     │                   │
   │──────────────────>│                     │                   │
   │                   │ acquireEditLock()   │                   │
   │                   │────────────────────>│                   │
   │                   │                     │ Check lock status │
   │                   │                     │──────────────────>│
   │                   │                     │   Lock available  │
   │                   │                     │<──────────────────│
   │                   │                     │ Set lock + return │
   │                   │                     │   order data      │
   │                   │<────────────────────│                   │
   │   Show form with  │                     │                   │
   │   version: 5      │                     │                   │
   │<──────────────────│                     │                   │
   │                   │                     │                   │
   │  [Heartbeat every 30s]                  │                   │
   │                   │ extendEditLock()    │                   │
   │                   │────────────────────>│                   │
   │                   │<────────────────────│                   │
   │                   │                     │                   │
   │ Save changes      │                     │                   │
   │──────────────────>│                     │                   │
   │                   │ updateWithVersion   │                   │
   │                   │ (version: 5)        │                   │
   │                   │────────────────────>│                   │
   │                   │                     │ UPDATE WHERE      │
   │                   │                     │ version = 5       │
   │                   │                     │──────────────────>│
   │                   │                     │  affected: 1      │
   │                   │                     │<──────────────────│
   │                   │                     │ Release lock      │
   │                   │   Success           │ Notify subscribers│
   │                   │<────────────────────│                   │
   │   Order saved     │                     │                   │
   │   version: 6      │                     │                   │
   │<──────────────────│                     │                   │
```

### 1.3. Conflict Flow

```
┌──────┐ ┌──────┐      ┌──────────┐          ┌─────────┐          ┌───────┐
│User A│ │User B│      │ Frontend │          │ Backend │          │  DB   │
└──┬───┘ └──┬───┘      └────┬─────┘          └────┬────┘          └───┬───┘
   │        │               │                     │                   │
   │ Edit Order (v5)        │                     │                   │
   │───────────────────────>│ acquireLock(A)     │                   │
   │                        │────────────────────>│                   │
   │                        │<────────────────────│ Lock acquired     │
   │                        │                     │                   │
   │        │ Try Edit      │                     │                   │
   │        │──────────────>│ acquireLock(B)     │                   │
   │        │               │────────────────────>│                   │
   │        │               │<────────────────────│ Locked by User A  │
   │        │<──────────────│ Show "A is editing"│                   │
   │        │               │                     │                   │
   │ [Lock expires / A releases]                 │                   │
   │                        │                     │                   │
   │        │ Retry Edit    │                     │                   │
   │        │──────────────>│ acquireLock(B)     │                   │
   │        │               │────────────────────>│                   │
   │        │               │<────────────────────│ Lock acquired (v6)│
   │        │<──────────────│ version: 6         │                   │
   │        │               │                     │                   │
   │ Save (v5)              │                     │                   │
   │───────────────────────>│ update(v5)         │                   │
   │                        │────────────────────>│ WHERE v=5         │
   │                        │                     │──────────────────>│
   │                        │                     │ affected: 0       │
   │                        │<────────────────────│ (current v=6)     │
   │<───────────────────────│ CONFLICT!          │                   │
   │                        │ Show diff dialog   │                   │
```

---

## 2. Phase 1: Optimistic Locking

### 2.1. Database Migration

**File**: `packages/twenty-server/src/database/typeorm/metadata/migrations/YYYYMMDDHHMMSS-add-order-version-field.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderVersionField1706000000000 implements MigrationInterface {
  name = 'AddOrderVersionField1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add version column with default value 1
    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1
    `);

    // Create index for version queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mktOrder_version"
      ON "mktOrder" ("version")
    `);

    // Update existing records to have version 1
    await queryRunner.query(`
      UPDATE "mktOrder"
      SET "version" = 1
      WHERE "version" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_mktOrder_version"
    `);
    await queryRunner.query(`
      ALTER TABLE "mktOrder"
      DROP COLUMN IF EXISTS "version"
    `);
  }
}
```

### 2.2. Field ID Registration

**File**: `packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts`

```typescript
// Add to MKT_ORDER_FIELD_IDS
export const MKT_ORDER_FIELD_IDS = {
  // ... existing fields

  // Concurrent Editing Fields
  version: '20260121-0001-0001-0001-000000000001',
  editLockedBy: '20260121-0001-0001-0001-000000000002',
  editLockedAt: '20260121-0001-0001-0001-000000000003',
  editLockExpiresAt: '20260121-0001-0001-0001-000000000004',
};
```

### 2.3. Entity Update

**File**: `packages/twenty-server/src/mkt-core/order/objects/mkt-order.workspace-entity.ts`

```typescript
// Add after existing fields, before relations

// ============================================
// CONCURRENT EDITING FIELDS
// ============================================

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.version,
  type: FieldMetadataType.NUMBER,
  label: msg`Version`,
  description: msg`Record version for optimistic locking`,
  icon: 'IconHistory',
  defaultValue: 1,
})
version: number;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.editLockedBy,
  type: FieldMetadataType.TEXT,
  label: msg`Edit Locked By`,
  description: msg`Workspace member ID who has edit lock`,
  icon: 'IconLock',
})
@WorkspaceIsNullable()
editLockedBy?: string | null;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.editLockedAt,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Edit Locked At`,
  description: msg`Timestamp when edit lock was acquired`,
  icon: 'IconClock',
})
@WorkspaceIsNullable()
editLockedAt?: Date | null;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.editLockExpiresAt,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Edit Lock Expires At`,
  description: msg`Timestamp when edit lock expires`,
  icon: 'IconClockStop',
})
@WorkspaceIsNullable()
editLockExpiresAt?: Date | null;
```

### 2.4. Repository Methods

**File**: `packages/twenty-server/src/mkt-core/order/repositories/mkt-order.repository.ts`

```typescript
// Add these methods to MktOrderRepository class

// ============================================
// OPTIMISTIC LOCKING OPERATIONS
// ============================================

/**
 * Update order with optimistic locking
 * Only succeeds if current version matches expected version
 *
 * @param orderId - Order ID to update
 * @param data - Data to update
 * @param expectedVersion - Version the client expects
 * @returns Result with success status and current version on conflict
 */
async updateWithVersion(
  orderId: string,
  data: DeepPartial<MktOrderWorkspaceEntity>,
  expectedVersion: number,
): Promise<{
  success: boolean;
  newVersion?: number;
  currentVersion?: number;
  currentData?: MktOrderWorkspaceEntity;
}> {
  this.logger.debug(
    `Attempting optimistic update for order ${orderId} with version ${expectedVersion}`,
  );

  const repository = await this.getRepository();

  // Perform atomic update with version check
  const result = await repository
    .createQueryBuilder()
    .update(MktOrderWorkspaceEntity)
    .set({
      ...data,
      version: () => 'version + 1',
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as unknown as QueryDeepPartialEntity<MktOrderWorkspaceEntity>)
    .where('id = :id', { id: orderId })
    .andWhere('version = :expectedVersion', { expectedVersion })
    .andWhere('deletedAt IS NULL')
    .execute();

  if (result.affected === 0) {
    // Version mismatch - fetch current state for conflict resolution
    this.logger.warn(
      `Optimistic lock conflict for order ${orderId}. Expected version: ${expectedVersion}`,
    );

    const currentOrder = await this.findById(orderId);

    return {
      success: false,
      currentVersion: currentOrder?.version,
      currentData: currentOrder ?? undefined,
    };
  }

  this.logger.debug(
    `Optimistic update succeeded for order ${orderId}. New version: ${expectedVersion + 1}`,
  );

  return {
    success: true,
    newVersion: expectedVersion + 1,
  };
}

/**
 * Get order with version for edit
 * Returns order data including current version
 */
async findByIdForEdit(
  orderId: string,
): Promise<{
  order: MktOrderWorkspaceEntity | null;
  version: number;
  editLock: {
    isLocked: boolean;
    lockedBy: string | null;
    expiresAt: Date | null;
  };
}> {
  const order = await this.findByIdWithRelations(orderId);

  if (!order) {
    return {
      order: null,
      version: 0,
      editLock: { isLocked: false, lockedBy: null, expiresAt: null },
    };
  }

  const now = DateTimeUtils.now();
  const isLocked =
    order.editLockedBy !== null &&
    order.editLockExpiresAt !== null &&
    DateTimeUtils.isAfter(
      DateTimeUtils.fromJSDate(order.editLockExpiresAt),
      now,
    );

  return {
    order,
    version: order.version,
    editLock: {
      isLocked,
      lockedBy: isLocked ? order.editLockedBy ?? null : null,
      expiresAt: isLocked ? order.editLockExpiresAt ?? null : null,
    },
  };
}
```

### 2.5. Types Definition

**File**: `packages/twenty-server/src/mkt-core/order/types/concurrent-editing.types.ts`

```typescript
import { MktOrderWorkspaceEntity } from '../objects/mkt-order.workspace-entity';

// ============================================
// OPTIMISTIC LOCKING TYPES
// ============================================

/**
 * Result of an optimistic update operation
 * NOTE: Use `type` instead of `interface` per codebase convention
 */
export type OptimisticUpdateResult = {
  success: boolean;
  newVersion?: number;
  conflict?: ConflictInfo;
  error?: string;
};

export type VersionedUpdateInput = {
  orderId: string;
  version: number;
  data: Partial<MktOrderWorkspaceEntity>;
};

// ============================================
// EDIT LOCK TYPES
// ============================================

export type EditLockStatus = {
  isLocked: boolean;
  lockedBy: string | null;
  lockedByName?: string | null;
  lockedAt: Date | null;
  expiresAt: Date | null;
  remainingSeconds?: number;
};

export type AcquireEditLockResult = {
  success: boolean;
  lock?: EditLockStatus;
  order?: MktOrderWorkspaceEntity;
  version?: number;
  error?: string;
  errorCode?: EditLockErrorCode;
};

export type ReleaseEditLockResult = {
  success: boolean;
  error?: string;
};

export type ExtendEditLockResult = {
  success: boolean;
  newExpiresAt?: Date;
  error?: string;
};

export type EditLockErrorCode =
  | 'ALREADY_LOCKED'
  | 'NOT_LOCK_OWNER'
  | 'LOCK_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'LOCK_EXPIRED'
  | 'INVALID_DURATION';

// ============================================
// CONFLICT RESOLUTION TYPES
// ============================================

/**
 * Represents a single field conflict between user's changes and current data
 * Used by detectConflicts() to return only editable fields with yourValue/currentValue
 */
export type FieldConflict = {
  field: string;
  yourValue: unknown;
  currentValue: unknown;
  originalValue?: unknown;
};

/**
 * Full conflict information returned when optimistic lock fails
 */
export type ConflictInfo = {
  currentVersion: number;
  conflicts: FieldConflict[];
  modifiedBy?: string;
  modifiedAt?: Date;
};

export type ConflictResolutionInput = {
  orderId: string;
  baseVersion: number;
  targetVersion: number;
  resolutions: Array<{
    field: string;
    resolvedValue: unknown;
    strategy: 'KEEP_MINE' | 'KEEP_THEIRS' | 'CUSTOM';
  }>;
};

// ============================================
// NOTIFICATION TYPES
// ============================================

export type OrderEditNotificationType =
  | 'EDIT_STARTED'
  | 'EDIT_ENDED'
  | 'ORDER_UPDATED'
  | 'LOCK_EXPIRED';

export type OrderEditNotification = {
  type: OrderEditNotificationType;
  orderId: string;
  userId: string;
  userName?: string;
  timestamp: Date;
  version?: number;
  changes?: string[];
};

// ============================================
// CONFIGURATION
// ============================================

export const EDIT_LOCK_CONFIG = {
  /** Default lock duration in minutes */
  DEFAULT_LOCK_DURATION_MINUTES: 15,

  /** Maximum lock duration in minutes */
  MAX_LOCK_DURATION_MINUTES: 60,

  /** Minimum lock duration in minutes */
  MIN_LOCK_DURATION_MINUTES: 1,

  /** Heartbeat interval in seconds */
  HEARTBEAT_INTERVAL_SECONDS: 30,

  /** Lock extension duration in minutes */
  LOCK_EXTENSION_MINUTES: 10,

  /** Warning threshold before lock expires (seconds) */
  LOCK_EXPIRY_WARNING_SECONDS: 60,
} as const;

/**
 * List of editable fields for conflict detection
 * Only these fields will be included in conflict detection to avoid
 * including non-editable fields like id, version, createdAt, etc.
 */
export const EDITABLE_ORDER_FIELDS = [
  'name',
  'note',
  'discount',
  'discountPercent',
  'requireContract',
  'mktCustomerId',
  'mktContractId',
] as const;

export type EditableOrderField = (typeof EDITABLE_ORDER_FIELDS)[number];
```

### 2.6. DTOs for GraphQL

**File**: `packages/twenty-server/src/mkt-core/order/dto/concurrent-editing.dto.ts`

```typescript
import { Field, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// ============================================
// ENUMS
// ============================================

export enum ConflictResolutionStrategy {
  KEEP_MINE = 'KEEP_MINE',
  KEEP_THEIRS = 'KEEP_THEIRS',
  MERGE = 'MERGE',
  CUSTOM = 'CUSTOM',
}

registerEnumType(ConflictResolutionStrategy, {
  name: 'ConflictResolutionStrategy',
  description: 'Strategy for resolving edit conflicts',
});

// ============================================
// EDIT LOCK DTOs
// ============================================

@InputType()
export class AcquireEditLockInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @Field(() => Int, { nullable: true, description: 'Lock duration in minutes (default: 15)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  lockDurationMinutes?: number;
}

@ObjectType()
export class EditLockInfo {
  @Field(() => Boolean)
  isLocked: boolean;

  @Field(() => String, { nullable: true })
  lockedBy?: string;

  @Field(() => String, { nullable: true })
  lockedByName?: string;

  @Field(() => Date, { nullable: true })
  lockedAt?: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Int, { nullable: true, description: 'Remaining seconds until lock expires' })
  remainingSeconds?: number;
}

@ObjectType()
export class AcquireEditLockOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => EditLockInfo, { nullable: true })
  lock?: EditLockInfo;

  @Field(() => Int, { nullable: true, description: 'Current order version' })
  version?: number;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  errorCode?: string;
}

@InputType()
export class ReleaseEditLockInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;
}

@ObjectType()
export class ReleaseEditLockOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

@InputType()
export class ExtendEditLockInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @Field(() => Int, { nullable: true, description: 'Additional minutes to extend (default: 10)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  extensionMinutes?: number;
}

@ObjectType()
export class ExtendEditLockOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Date, { nullable: true })
  newExpiresAt?: Date;

  @Field(() => String, { nullable: true })
  error?: string;
}

// ============================================
// VERSIONED UPDATE DTOs
// ============================================

@InputType()
export class UpdateOrderWithVersionInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @Field(() => Int, { description: 'Expected version for optimistic locking' })
  @IsNumber()
  @Min(1)
  version: number;

  // Editable fields
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  note?: string;

  @Field(() => Number, { nullable: true })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @Field(() => Number, { nullable: true })
  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  requireContract?: boolean;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  mktCustomerId?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  mktContractId?: string;
}

@ObjectType()
export class FieldConflict {
  @Field(() => String)
  field: string;

  @Field(() => String, { nullable: true })
  yourValue?: string;

  @Field(() => String, { nullable: true })
  currentValue?: string;

  @Field(() => String, { nullable: true })
  originalValue?: string;
}

@ObjectType()
export class ConflictInfo {
  @Field(() => Int)
  currentVersion: number;

  @Field(() => [FieldConflict])
  conflicts: FieldConflict[];

  @Field(() => String, { nullable: true })
  modifiedBy?: string;

  @Field(() => String, { nullable: true })
  modifiedByName?: string;

  @Field(() => Date, { nullable: true })
  modifiedAt?: Date;
}

@ObjectType()
export class UpdateOrderWithVersionOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int, { nullable: true, description: 'New version after successful update' })
  newVersion?: number;

  @Field(() => ConflictInfo, { nullable: true, description: 'Conflict details if update failed' })
  conflict?: ConflictInfo;

  @Field(() => String, { nullable: true })
  error?: string;
}

// ============================================
// QUERY DTOs
// ============================================

@ObjectType()
export class OrderForEditOutput {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  version: number;

  @Field(() => EditLockInfo)
  editLock: EditLockInfo;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Number, { nullable: true })
  totalAmount?: number;

  @Field(() => Number, { nullable: true })
  discount?: number;

  @Field(() => Number, { nullable: true })
  discountPercent?: number;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => Boolean, { nullable: true })
  requireContract?: boolean;

  @Field(() => String, { nullable: true })
  mktCustomerId?: string;

  @Field(() => String, { nullable: true })
  mktContractId?: string;

  // Add other fields as needed
}
```

### 2.7. Messages Constants

**File**: `packages/twenty-server/src/mkt-core/order/messages/concurrent-editing.messages.ts`

```typescript
/**
 * Centralized messages for concurrent editing operations
 * Use these constants instead of string literals
 */
export const CONCURRENT_EDITING_MESSAGES = {
  // Success messages
  SUCCESS: {
    LOCK_ACQUIRED: 'Edit lock acquired successfully',
    LOCK_RELEASED: 'Edit lock released successfully',
    LOCK_EXTENDED: 'Edit lock extended successfully',
    UPDATE_SUCCESS: 'Order updated successfully',
  },

  // Error messages
  ERROR: {
    ALREADY_LOCKED: 'Order is being edited by another user',
    NOT_LOCK_OWNER: 'You are not the lock owner',
    LOCK_NOT_FOUND: 'Lock not found or already released',
    LOCK_EXPIRED: 'Your edit session has expired',
    ORDER_NOT_FOUND: 'Order not found',
    VERSION_CONFLICT: 'Order was modified by another user',
    AUTH_REQUIRED: 'User authentication required',
    INVALID_DURATION: (min: number, max: number) =>
      `Lock duration must be between ${min} and ${max} minutes`,
    LOCK_EXTEND_FAILED: 'Lock not found, expired, or not owned by you',
  },

  // Log messages
  LOG: {
    ACQUIRE_ATTEMPT: (userId: string, orderId: string) =>
      `User ${userId} attempting to acquire edit lock for order ${orderId}`,
    ACQUIRE_SUCCESS: (userId: string, orderId: string) =>
      `User ${userId} acquired edit lock for order ${orderId}`,
    RELEASE_ATTEMPT: (userId: string, orderId: string) =>
      `User ${userId} releasing edit lock for order ${orderId}`,
    RELEASE_SUCCESS: (userId: string, orderId: string) =>
      `User ${userId} released edit lock for order ${orderId}`,
    EXTEND_ATTEMPT: (userId: string, orderId: string, minutes: number) =>
      `User ${userId} extending edit lock for order ${orderId} by ${minutes} minutes`,
    EXTEND_SUCCESS: (userId: string, orderId: string, expiresAt: string) =>
      `User ${userId} extended edit lock for order ${orderId} until ${expiresAt}`,
    OPTIMISTIC_UPDATE: (orderId: string, userId: string, version: number) =>
      `Optimistic update for order ${orderId} by user ${userId}, expected version: ${version}`,
    CLEANUP_START: 'Cleaning up expired edit locks',
    CLEANUP_COMPLETE: (count: number) => `Cleaned up ${count} expired edit locks`,
  },
} as const;
```

### 2.8. Concurrency Service

**File**: `packages/twenty-server/src/mkt-core/order/services/core/order-concurrency.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  AcquireEditLockResult,
  ReleaseEditLockResult,
  ExtendEditLockResult,
  OptimisticUpdateResult,
  FieldConflict,
  EDIT_LOCK_CONFIG,
  EDITABLE_ORDER_FIELDS,
} from 'src/mkt-core/order/types/concurrent-editing.types';
import { CONCURRENT_EDITING_MESSAGES } from 'src/mkt-core/order/messages/concurrent-editing.messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * OrderConcurrencyService - Handles concurrent editing operations
 *
 * Provides:
 * - Soft lock management (acquire, release, extend)
 * - Optimistic locking for updates
 * - Conflict detection and resolution helpers
 *
 * NOTE: Always use DateTimeUtils for date/time operations, not new Date()/Date.now()
 * NOTE: Always use CONCURRENT_EDITING_MESSAGES instead of string literals
 */
@Injectable()
export class OrderConcurrencyService {
  private readonly logger = new Logger(OrderConcurrencyService.name);

  constructor(private readonly orderRepository: MktOrderRepository) {}

  // ============================================
  // SOFT LOCK OPERATIONS
  // ============================================

  /**
   * Validate lock duration is within allowed range
   */
  private validateLockDuration(minutes: number): {
    valid: boolean;
    error?: string;
  } {
    const { MIN_LOCK_DURATION_MINUTES, MAX_LOCK_DURATION_MINUTES } = EDIT_LOCK_CONFIG;

    if (minutes < MIN_LOCK_DURATION_MINUTES || minutes > MAX_LOCK_DURATION_MINUTES) {
      return {
        valid: false,
        error: CONCURRENT_EDITING_MESSAGES.ERROR.INVALID_DURATION(
          MIN_LOCK_DURATION_MINUTES,
          MAX_LOCK_DURATION_MINUTES,
        ),
      };
    }

    return { valid: true };
  }

  /**
   * Acquire edit lock for an order
   *
   * @param orderId - Order to lock
   * @param userId - User acquiring the lock
   * @param lockDurationMinutes - Lock duration (default: 15 minutes, max: 60 minutes)
   */
  async acquireEditLock(
    orderId: string,
    userId: string,
    lockDurationMinutes: number = EDIT_LOCK_CONFIG.DEFAULT_LOCK_DURATION_MINUTES,
  ): Promise<AcquireEditLockResult> {
    this.logger.debug(CONCURRENT_EDITING_MESSAGES.LOG.ACQUIRE_ATTEMPT(userId, orderId));

    // Validate duration against MAX_LOCK_DURATION_MINUTES
    const durationValidation = this.validateLockDuration(lockDurationMinutes);

    if (!durationValidation.valid) {
      return {
        success: false,
        error: durationValidation.error,
        errorCode: 'INVALID_DURATION',
      };
    }

    const repository = await this.orderRepository.getRepository();
    const now = DateTimeUtils.now();
    const expiresAt = DateTimeUtils.add(now, { minutes: lockDurationMinutes });

    // Try to acquire lock with atomic operation
    const result = await repository
      .createQueryBuilder()
      .update(MktOrderWorkspaceEntity)
      .set({
        editLockedBy: userId,
        editLockedAt: DateTimeUtils.toDate(now),
        editLockExpiresAt: DateTimeUtils.toDate(expiresAt),
      })
      .where('id = :orderId', { orderId })
      .andWhere('deletedAt IS NULL')
      .andWhere(
        '(editLockedBy IS NULL OR editLockedBy = :userId OR editLockExpiresAt < :now)',
        { userId, now: DateTimeUtils.toDate(now) },
      )
      .execute();

    if (result.affected === 0) {
      // Lock not acquired - someone else has it
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        return {
          success: false,
          error: CONCURRENT_EDITING_MESSAGES.ERROR.ORDER_NOT_FOUND,
          errorCode: 'ORDER_NOT_FOUND',
        };
      }

      const remainingSeconds = order.editLockExpiresAt
        ? Math.max(
            0,
            DateTimeUtils.diffInSeconds(
              DateTimeUtils.fromJSDate(order.editLockExpiresAt),
              now,
            ),
          )
        : 0;

      return {
        success: false,
        lock: {
          isLocked: true,
          lockedBy: order.editLockedBy ?? null,
          lockedAt: order.editLockedAt ?? null,
          expiresAt: order.editLockExpiresAt ?? null,
          remainingSeconds,
        },
        error: CONCURRENT_EDITING_MESSAGES.ERROR.ALREADY_LOCKED,
        errorCode: 'ALREADY_LOCKED',
      };
    }

    // Lock acquired successfully
    const order = await this.orderRepository.findByIdForEdit(orderId);

    this.logger.debug(CONCURRENT_EDITING_MESSAGES.LOG.ACQUIRE_SUCCESS(userId, orderId));

    return {
      success: true,
      lock: {
        isLocked: true,
        lockedBy: userId,
        lockedAt: DateTimeUtils.toDate(now),
        expiresAt: DateTimeUtils.toDate(expiresAt),
        remainingSeconds: lockDurationMinutes * 60,
      },
      order: order.order ?? undefined,
      version: order.version,
    };
  }

  /**
   * Release edit lock for an order
   *
   * @param orderId - Order to unlock
   * @param userId - User releasing the lock (must be lock owner)
   */
  async releaseEditLock(
    orderId: string,
    userId: string,
  ): Promise<ReleaseEditLockResult> {
    this.logger.debug(CONCURRENT_EDITING_MESSAGES.LOG.RELEASE_ATTEMPT(userId, orderId));

    const repository = await this.orderRepository.getRepository();

    const result = await repository
      .createQueryBuilder()
      .update(MktOrderWorkspaceEntity)
      .set({
        editLockedBy: null,
        editLockedAt: null,
        editLockExpiresAt: null,
      })
      .where('id = :orderId', { orderId })
      .andWhere('editLockedBy = :userId', { userId })
      .execute();

    if (result.affected === 0) {
      // Check if order exists and if user is the lock owner
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        return { success: false, error: CONCURRENT_EDITING_MESSAGES.ERROR.ORDER_NOT_FOUND };
      }

      if (order.editLockedBy !== userId) {
        return { success: false, error: CONCURRENT_EDITING_MESSAGES.ERROR.NOT_LOCK_OWNER };
      }

      return { success: false, error: CONCURRENT_EDITING_MESSAGES.ERROR.LOCK_NOT_FOUND };
    }

    this.logger.debug(CONCURRENT_EDITING_MESSAGES.LOG.RELEASE_SUCCESS(userId, orderId));

    return { success: true };
  }

  /**
   * Extend edit lock for an order
   *
   * @param orderId - Order to extend lock
   * @param userId - User extending the lock (must be lock owner)
   * @param extensionMinutes - Additional minutes to extend (max: 60 minutes)
   */
  async extendEditLock(
    orderId: string,
    userId: string,
    extensionMinutes: number = EDIT_LOCK_CONFIG.LOCK_EXTENSION_MINUTES,
  ): Promise<ExtendEditLockResult> {
    // Validate extension duration against MAX_LOCK_DURATION_MINUTES
    const durationValidation = this.validateLockDuration(extensionMinutes);

    if (!durationValidation.valid) {
      return {
        success: false,
        error: durationValidation.error,
      };
    }

    this.logger.debug(
      CONCURRENT_EDITING_MESSAGES.LOG.EXTEND_ATTEMPT(userId, orderId, extensionMinutes),
    );

    const repository = await this.orderRepository.getRepository();
    const now = DateTimeUtils.now();
    const newExpiresAt = DateTimeUtils.add(now, { minutes: extensionMinutes });

    const result = await repository
      .createQueryBuilder()
      .update(MktOrderWorkspaceEntity)
      .set({
        editLockExpiresAt: DateTimeUtils.toDate(newExpiresAt),
      })
      .where('id = :orderId', { orderId })
      .andWhere('editLockedBy = :userId', { userId })
      .andWhere('editLockExpiresAt > :now', { now: DateTimeUtils.toDate(now) })
      .execute();

    if (result.affected === 0) {
      return { success: false, error: CONCURRENT_EDITING_MESSAGES.ERROR.LOCK_EXTEND_FAILED };
    }

    this.logger.debug(
      CONCURRENT_EDITING_MESSAGES.LOG.EXTEND_SUCCESS(
        userId,
        orderId,
        DateTimeUtils.toISO(newExpiresAt),
      ),
    );

    return {
      success: true,
      newExpiresAt: DateTimeUtils.toDate(newExpiresAt),
    };
  }

  /**
   * Check if order is locked by another user
   */
  async isLockedByOther(orderId: string, userId: string): Promise<boolean> {
    const { editLock } = await this.orderRepository.findByIdForEdit(orderId);

    return editLock.isLocked && editLock.lockedBy !== userId;
  }

  // ============================================
  // OPTIMISTIC LOCKING OPERATIONS
  // ============================================

  /**
   * Update order with optimistic locking
   *
   * @param orderId - Order to update
   * @param userChanges - Data user wants to update
   * @param expectedVersion - Version client expects
   * @param userId - User making the update
   */
  async updateWithOptimisticLock(
    orderId: string,
    userChanges: Partial<MktOrderWorkspaceEntity>,
    expectedVersion: number,
    userId: string,
  ): Promise<OptimisticUpdateResult> {
    this.logger.debug(
      CONCURRENT_EDITING_MESSAGES.LOG.OPTIMISTIC_UPDATE(orderId, userId, expectedVersion),
    );

    // First check if user holds the lock
    const isLockedByOther = await this.isLockedByOther(orderId, userId);

    if (isLockedByOther) {
      return {
        success: false,
        error: CONCURRENT_EDITING_MESSAGES.ERROR.ALREADY_LOCKED,
      };
    }

    // Perform optimistic update
    const result = await this.orderRepository.updateWithVersion(
      orderId,
      userChanges,
      expectedVersion,
    );

    if (!result.success) {
      // Version conflict - detect field-level conflicts using detectConflicts
      const conflicts = this.detectConflicts(userChanges, result.currentData);

      return {
        success: false,
        conflict: {
          currentVersion: result.currentVersion ?? 0,
          conflicts, // Return proper FieldConflict[] from detectConflicts
          modifiedBy: result.currentData?.createdById ?? undefined,
          modifiedAt: result.currentData?.updatedAt
            ? DateTimeUtils.toDate(DateTimeUtils.fromISO(String(result.currentData.updatedAt)))
            : undefined,
        },
        error: CONCURRENT_EDITING_MESSAGES.ERROR.VERSION_CONFLICT,
      };
    }

    // Release lock after successful update
    await this.releaseEditLock(orderId, userId);

    return {
      success: true,
      newVersion: result.newVersion,
    };
  }

  /**
   * Detect field-level conflicts between user's changes and current data
   *
   * IMPORTANT: Only includes fields from EDITABLE_ORDER_FIELDS to avoid
   * returning non-editable fields like id, version, createdAt, etc.
   *
   * @param userChanges - Fields the user attempted to change
   * @param currentData - Current data in database
   * @returns Array of FieldConflict with yourValue and currentValue
   */
  private detectConflicts(
    userChanges: Partial<MktOrderWorkspaceEntity>,
    currentData?: Partial<MktOrderWorkspaceEntity>,
  ): FieldConflict[] {
    if (!currentData) return [];

    const conflicts: FieldConflict[] = [];

    // Only check editable fields to avoid including system fields
    for (const field of EDITABLE_ORDER_FIELDS) {
      if (field in userChanges) {
        const yourValue = userChanges[field as keyof typeof userChanges];
        const currentValue = currentData[field as keyof typeof currentData];

        // Only add to conflicts if values are different
        if (yourValue !== currentValue) {
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

  // ============================================
  // CLEANUP OPERATIONS
  // ============================================

  /**
   * Clean up expired locks
   * Should be called periodically by a scheduled job
   */
  async cleanupExpiredLocks(): Promise<number> {
    this.logger.debug(CONCURRENT_EDITING_MESSAGES.LOG.CLEANUP_START);

    const repository = await this.orderRepository.getRepository();
    const now = DateTimeUtils.now();

    const result = await repository
      .createQueryBuilder()
      .update(MktOrderWorkspaceEntity)
      .set({
        editLockedBy: null,
        editLockedAt: null,
        editLockExpiresAt: null,
      })
      .where('editLockExpiresAt < :now', { now: DateTimeUtils.toDate(now) })
      .andWhere('editLockedBy IS NOT NULL')
      .execute();

    const cleanedCount = result.affected ?? 0;

    if (cleanedCount > 0) {
      this.logger.log(CONCURRENT_EDITING_MESSAGES.LOG.CLEANUP_COMPLETE(cleanedCount));
    }

    return cleanedCount;
  }
}
```

### 2.8. GraphQL Resolver

**File**: `packages/twenty-server/src/mkt-core/order/resolvers/order-edit.resolver.ts`

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  AcquireEditLockInput,
  AcquireEditLockOutput,
  ReleaseEditLockInput,
  ReleaseEditLockOutput,
  ExtendEditLockInput,
  ExtendEditLockOutput,
  UpdateOrderWithVersionInput,
  UpdateOrderWithVersionOutput,
  OrderForEditOutput,
} from 'src/mkt-core/order/dto/concurrent-editing.dto';
import { OrderConcurrencyService } from 'src/mkt-core/order/services/core/order-concurrency.service';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { CONCURRENT_EDITING_MESSAGES } from 'src/mkt-core/order/messages/concurrent-editing.messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * OrderEditResolver - GraphQL resolver for concurrent editing operations
 *
 * Provides mutations for:
 * - acquireOrderEditLock: Acquire soft lock before editing
 * - releaseOrderEditLock: Release lock after editing
 * - extendOrderEditLock: Extend lock during long edit sessions
 * - updateOrderWithVersion: Update with optimistic locking
 *
 * Provides queries for:
 * - getOrderForEdit: Get order with version and lock status
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class OrderEditResolver {
  constructor(
    private readonly concurrencyService: OrderConcurrencyService,
    private readonly orderRepository: MktOrderRepository,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  @Query(() => OrderForEditOutput, {
    description: 'Get order with version and lock status for editing',
    nullable: true,
  })
  async getOrderForEdit(
    @Args('orderId', { type: () => String }) orderId: string,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<OrderForEditOutput | null> {
    const result = await this.orderRepository.findByIdForEdit(orderId);

    if (!result.order) {
      return null;
    }

    const { order, version, editLock } = result;
    const now = DateTimeUtils.now();

    return {
      id: order.id,
      version,
      editLock: {
        isLocked: editLock.isLocked,
        lockedBy: editLock.lockedBy ?? undefined,
        lockedAt: editLock.lockedBy ? order.editLockedAt ?? undefined : undefined,
        expiresAt: editLock.expiresAt ?? undefined,
        remainingSeconds: editLock.expiresAt
          ? Math.max(
              0,
              DateTimeUtils.diffInSeconds(
                DateTimeUtils.fromJSDate(editLock.expiresAt),
                now,
              ),
            )
          : undefined,
      },
      name: order.name,
      orderCode: order.orderCode ?? undefined,
      status: order.status ?? undefined,
      totalAmount: order.totalAmount ?? undefined,
      discount: order.discount ?? undefined,
      discountPercent: order.discountPercent ?? undefined,
      note: order.note ?? undefined,
      requireContract: order.requireContract ?? undefined,
      mktCustomerId: order.mktCustomerId ?? undefined,
      mktContractId: order.mktContractId ?? undefined,
    };
  }

  // ============================================
  // MUTATIONS - LOCK MANAGEMENT
  // ============================================

  @Mutation(() => AcquireEditLockOutput, {
    description: 'Acquire edit lock for an order',
  })
  async acquireOrderEditLock(
    @Args('input') input: AcquireEditLockInput,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<AcquireEditLockOutput> {
    if (!workspaceMemberId) {
      return {
        success: false,
        error: CONCURRENT_EDITING_MESSAGES.ERROR.AUTH_REQUIRED,
      };
    }

    const result = await this.concurrencyService.acquireEditLock(
      input.orderId,
      workspaceMemberId,
      input.lockDurationMinutes,
    );

    return {
      success: result.success,
      lock: result.lock
        ? {
            isLocked: result.lock.isLocked,
            lockedBy: result.lock.lockedBy ?? undefined,
            lockedAt: result.lock.lockedAt ?? undefined,
            expiresAt: result.lock.expiresAt ?? undefined,
            remainingSeconds: result.lock.remainingSeconds,
          }
        : undefined,
      version: result.version,
      error: result.error,
      errorCode: result.errorCode,
    };
  }

  @Mutation(() => ReleaseEditLockOutput, {
    description: 'Release edit lock for an order',
  })
  async releaseOrderEditLock(
    @Args('input') input: ReleaseEditLockInput,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<ReleaseEditLockOutput> {
    if (!workspaceMemberId) {
      return {
        success: false,
        error: CONCURRENT_EDITING_MESSAGES.ERROR.AUTH_REQUIRED,
      };
    }

    return this.concurrencyService.releaseEditLock(input.orderId, workspaceMemberId);
  }

  @Mutation(() => ExtendEditLockOutput, {
    description: 'Extend edit lock for an order',
  })
  async extendOrderEditLock(
    @Args('input') input: ExtendEditLockInput,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<ExtendEditLockOutput> {
    if (!workspaceMemberId) {
      return {
        success: false,
        error: CONCURRENT_EDITING_MESSAGES.ERROR.AUTH_REQUIRED,
      };
    }

    return this.concurrencyService.extendEditLock(
      input.orderId,
      workspaceMemberId,
      input.extensionMinutes,
    );
  }

  // ============================================
  // MUTATIONS - VERSIONED UPDATE
  // ============================================

  @Mutation(() => UpdateOrderWithVersionOutput, {
    description: 'Update order with optimistic locking',
  })
  async updateOrderWithVersion(
    @Args('input') input: UpdateOrderWithVersionInput,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<UpdateOrderWithVersionOutput> {
    if (!workspaceMemberId) {
      return {
        success: false,
        error: CONCURRENT_EDITING_MESSAGES.ERROR.AUTH_REQUIRED,
      };
    }

    // Build update data from input
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.note !== undefined) updateData.note = input.note;
    if (input.discount !== undefined) updateData.discount = input.discount;
    if (input.discountPercent !== undefined) updateData.discountPercent = input.discountPercent;
    if (input.requireContract !== undefined) updateData.requireContract = input.requireContract;
    if (input.mktCustomerId !== undefined) updateData.mktCustomerId = input.mktCustomerId;
    if (input.mktContractId !== undefined) updateData.mktContractId = input.mktContractId;

    const result = await this.concurrencyService.updateWithOptimisticLock(
      input.orderId,
      updateData,
      input.version,
      workspaceMemberId,
    );

    if (!result.success && result.conflict) {
      // Use conflicts from detectConflicts() which includes yourValue/currentValue
      // for only editable fields (EDITABLE_ORDER_FIELDS)
      return {
        success: false,
        conflict: {
          currentVersion: result.conflict.currentVersion,
          conflicts: result.conflict.conflicts.map((c) => ({
            field: c.field,
            yourValue: c.yourValue !== undefined ? String(c.yourValue) : undefined,
            currentValue: c.currentValue !== undefined ? String(c.currentValue) : undefined,
          })),
          modifiedBy: result.conflict.modifiedBy,
          modifiedAt: result.conflict.modifiedAt,
        },
        error: result.error,
      };
    }

    return {
      success: result.success,
      newVersion: result.newVersion,
      error: result.error,
    };
  }
}
```

### 2.9. Module Registration

**File**: Update `packages/twenty-server/src/mkt-core/order/order.module.ts`

```typescript
// Add imports
import { OrderConcurrencyService } from './services/core/order-concurrency.service';
import { OrderEditResolver } from './resolvers/order-edit.resolver';

// Add to providers array
@Module({
  // ...
  providers: [
    // ... existing providers

    // Concurrent Editing
    OrderConcurrencyService,
    OrderEditResolver,
  ],
  exports: [
    // ... existing exports
    OrderConcurrencyService,
  ],
})
export class MktOrderModule {}
```

---

## 3. Phase 2: Soft Lock Layer

### 3.1. Lock Cleanup Job

**File**: `packages/twenty-server/src/mkt-core/order/jobs/cleanup-expired-locks.job.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OrderConcurrencyService } from '../services/core/order-concurrency.service';

/**
 * CleanupExpiredLocksJob - Scheduled job to clean up expired edit locks
 *
 * Runs every 5 minutes to release locks that have expired
 * This ensures locks don't get stuck if user closes browser without releasing
 */
@Injectable()
export class CleanupExpiredLocksJob {
  private readonly logger = new Logger(CleanupExpiredLocksJob.name);

  constructor(private readonly concurrencyService: OrderConcurrencyService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    this.logger.debug('Running expired locks cleanup job');

    try {
      const cleanedCount = await this.concurrencyService.cleanupExpiredLocks();

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired edit locks`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired locks', error);
    }
  }
}
```

### 3.2. Lock Status Subscription (WebSocket)

**File**: `packages/twenty-server/src/mkt-core/order/gateways/order-edit.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

import { OrderConcurrencyService } from '../services/core/order-concurrency.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

// NOTE: Use `type` instead of `interface` per codebase convention
type JoinRoomPayload = {
  orderId: string;
  userId: string;
};

type LeaveRoomPayload = {
  orderId: string;
};

/**
 * OrderEditGateway - WebSocket gateway for real-time edit notifications
 *
 * Handles:
 * - User joins/leaves order edit room
 * - Broadcasts lock status changes
 * - Notifies when order is updated
 */
@WebSocketGateway({
  namespace: '/order-edit',
  cors: {
    origin: '*',
  },
})
export class OrderEditGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderEditGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private readonly socketOrders = new Map<string, string>(); // socketId -> orderId

  constructor(private readonly concurrencyService: OrderConcurrencyService) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.debug(`Client disconnected: ${client.id}`);

    // Clean up socket tracking
    const orderId = this.socketOrders.get(client.id);

    if (orderId) {
      // Notify others that user left
      client.to(`order:${orderId}`).emit('userLeft', {
        socketId: client.id,
        timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
      });

      this.socketOrders.delete(client.id);
    }

    // Remove from user sockets
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('joinOrderRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): void {
    const { orderId, userId } = payload;
    const roomName = `order:${orderId}`;

    this.logger.debug(`User ${userId} joining room ${roomName}`);

    // Join the room
    client.join(roomName);

    // Track socket
    this.socketOrders.set(client.id, orderId);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);

    // Notify others in the room
    client.to(roomName).emit('userJoined', {
      userId,
      socketId: client.id,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    });

    // Send current room members to the new user
    const roomMembers = this.server.sockets.adapter.rooms.get(roomName);

    client.emit('roomInfo', {
      orderId,
      memberCount: roomMembers?.size ?? 1,
    });
  }

  @SubscribeMessage('leaveOrderRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomPayload,
  ): void {
    const { orderId } = payload;
    const roomName = `order:${orderId}`;

    this.logger.debug(`Client ${client.id} leaving room ${roomName}`);

    client.leave(roomName);
    this.socketOrders.delete(client.id);

    // Notify others
    client.to(roomName).emit('userLeft', {
      socketId: client.id,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    });
  }

  // ============================================
  // BROADCAST METHODS (called by services)
  // ============================================

  /**
   * Broadcast lock acquired event
   */
  broadcastLockAcquired(
    orderId: string,
    userId: string,
    userName: string,
    expiresAt: Date,
  ): void {
    this.server.to(`order:${orderId}`).emit('lockAcquired', {
      orderId,
      userId,
      userName,
      expiresAt,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    });
  }

  /**
   * Broadcast lock released event
   */
  broadcastLockReleased(orderId: string, userId: string): void {
    this.server.to(`order:${orderId}`).emit('lockReleased', {
      orderId,
      userId,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    });
  }

  /**
   * Broadcast order updated event
   */
  broadcastOrderUpdated(
    orderId: string,
    userId: string,
    newVersion: number,
    changedFields: string[],
  ): void {
    this.server.to(`order:${orderId}`).emit('orderUpdated', {
      orderId,
      userId,
      newVersion,
      changedFields,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    });
  }

  /**
   * Broadcast lock expired event
   */
  broadcastLockExpired(orderId: string, previousOwnerId: string): void {
    this.server.to(`order:${orderId}`).emit('lockExpired', {
      orderId,
      previousOwnerId,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    });
  }
}
```

---

## 4. Phase 3: Real-time Notifications

### 4.1. Redis PubSub Service

**File**: `packages/twenty-server/src/mkt-core/order/services/core/order-notification.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import { OrderEditGateway } from '../../gateways/order-edit.gateway';
import { OrderEditNotification } from '../../types/concurrent-editing.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse, safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { EDIT_LOCK_CONFIG } from '../../types/concurrent-editing.types';

const ORDER_EDIT_CHANNEL = 'order:edit:events';

/**
 * OrderNotificationService - Handles real-time notifications for order editing
 *
 * Uses Redis PubSub for cross-instance communication
 * Broadcasts events to WebSocket clients via OrderEditGateway
 */
@Injectable()
export class OrderNotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderNotificationService.name);
  private subscriber: Redis;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly orderEditGateway: OrderEditGateway,
  ) {
    // Create a separate connection for subscribing
    this.subscriber = this.redis.duplicate();
  }

  async onModuleInit(): Promise<void> {
    await this.subscriber.subscribe(ORDER_EDIT_CHANNEL);

    this.subscriber.on('message', (channel, message) => {
      if (channel === ORDER_EDIT_CHANNEL) {
        // Use safeJsonParse instead of JSON.parse per repo convention
        const parseResult = safeJsonParse<OrderEditNotification>(message);

        if (parseResult.success && parseResult.data) {
          this.handleNotification(parseResult.data);
        } else {
          this.logger.error(`Failed to parse notification: ${parseResult.error}`);
        }
      }
    });

    this.logger.log('Order notification service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.unsubscribe(ORDER_EDIT_CHANNEL);
    await this.subscriber.quit();
  }

  // ============================================
  // PUBLISH METHODS
  // ============================================

  /**
   * Publish edit started notification
   * NOTE: Use DateTimeUtils for timestamp, safeJsonStringify for serialization
   */
  async publishEditStarted(
    orderId: string,
    userId: string,
    userName: string,
  ): Promise<void> {
    const notification: OrderEditNotification = {
      type: 'EDIT_STARTED',
      orderId,
      userId,
      userName,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    };

    const serialized = safeJsonStringify(notification);
    if (serialized) {
      await this.redis.publish(ORDER_EDIT_CHANNEL, serialized);
      this.logger.debug(`Published EDIT_STARTED for order ${orderId}`);
    } else {
      this.logger.error(`Failed to serialize EDIT_STARTED notification for order ${orderId}`);
    }
  }

  /**
   * Publish edit ended notification
   */
  async publishEditEnded(orderId: string, userId: string): Promise<void> {
    const notification: OrderEditNotification = {
      type: 'EDIT_ENDED',
      orderId,
      userId,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    };

    const serialized = safeJsonStringify(notification);
    if (serialized) {
      await this.redis.publish(ORDER_EDIT_CHANNEL, serialized);
      this.logger.debug(`Published EDIT_ENDED for order ${orderId}`);
    } else {
      this.logger.error(`Failed to serialize EDIT_ENDED notification for order ${orderId}`);
    }
  }

  /**
   * Publish order updated notification
   */
  async publishOrderUpdated(
    orderId: string,
    userId: string,
    version: number,
    changes: string[],
  ): Promise<void> {
    const notification: OrderEditNotification = {
      type: 'ORDER_UPDATED',
      orderId,
      userId,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
      version,
      changes,
    };

    const serialized = safeJsonStringify(notification);
    if (serialized) {
      await this.redis.publish(ORDER_EDIT_CHANNEL, serialized);
      this.logger.debug(`Published ORDER_UPDATED for order ${orderId}, version ${version}`);
    } else {
      this.logger.error(`Failed to serialize ORDER_UPDATED notification for order ${orderId}`);
    }
  }

  /**
   * Publish lock expired notification
   */
  async publishLockExpired(orderId: string, previousOwnerId: string): Promise<void> {
    const notification: OrderEditNotification = {
      type: 'LOCK_EXPIRED',
      orderId,
      userId: previousOwnerId,
      timestamp: DateTimeUtils.toDate(DateTimeUtils.now()),
    };

    const serialized = safeJsonStringify(notification);
    if (serialized) {
      await this.redis.publish(ORDER_EDIT_CHANNEL, serialized);
      this.logger.debug(`Published LOCK_EXPIRED for order ${orderId}`);
    } else {
      this.logger.error(`Failed to serialize LOCK_EXPIRED notification for order ${orderId}`);
    }
  }

  // ============================================
  // HANDLE NOTIFICATIONS
  // ============================================

  private handleNotification(notification: OrderEditNotification): void {
    const { type, orderId, userId, userName, version, changes } = notification;

    switch (type) {
      case 'EDIT_STARTED': {
        // Use DateTimeUtils for date calculations
        const now = DateTimeUtils.now();
        const expiresAt = DateTimeUtils.add(now, {
          minutes: EDIT_LOCK_CONFIG.DEFAULT_LOCK_DURATION_MINUTES,
        });

        this.orderEditGateway.broadcastLockAcquired(
          orderId,
          userId,
          userName ?? 'Unknown',
          DateTimeUtils.toDate(expiresAt),
        );
        break;
      }

      case 'EDIT_ENDED':
        this.orderEditGateway.broadcastLockReleased(orderId, userId);
        break;

      case 'ORDER_UPDATED':
        if (version !== undefined) {
          this.orderEditGateway.broadcastOrderUpdated(
            orderId,
            userId,
            version,
            changes ?? [],
          );
        }
        break;

      case 'LOCK_EXPIRED':
        this.orderEditGateway.broadcastLockExpired(orderId, userId);
        break;
    }
  }
}
```

---

## 5. Phase 4: Frontend Integration

### 5.1. React Hook: useOrderEditLock

**File**: `packages/twenty-front/src/modules/mkt/order/hooks/useOrderEditLock.ts`

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRecoilValue } from 'recoil';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import {
  ACQUIRE_ORDER_EDIT_LOCK,
  RELEASE_ORDER_EDIT_LOCK,
  EXTEND_ORDER_EDIT_LOCK,
  GET_ORDER_FOR_EDIT,
} from '../graphql/concurrent-editing.graphql';
import { EDIT_LOCK_CONFIG } from '../constants/concurrent-editing.constants';

// NOTE: Use `type` instead of `interface` per codebase convention
type EditLockInfo = {
  isLocked: boolean;
  lockedBy?: string;
  lockedByName?: string;
  expiresAt?: Date;
  remainingSeconds?: number;
};

type UseOrderEditLockResult = {
  // State
  isLockOwner: boolean;
  isLockedByOther: boolean;
  lockInfo: EditLockInfo | null;
  version: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  acquireLock: () => Promise<boolean>;
  releaseLock: () => Promise<void>;
  extendLock: () => Promise<boolean>;
};

export const useOrderEditLock = (orderId: string): UseOrderEditLockResult => {
  const currentWorkspaceMember = useRecoilValue(currentWorkspaceMemberState);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const [lockInfo, setLockInfo] = useState<EditLockInfo | null>(null);
  const [version, setVersion] = useState<number>(0);
  const [isLockOwner, setIsLockOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { loading: queryLoading, refetch } = useQuery(GET_ORDER_FOR_EDIT, {
    variables: { orderId },
    skip: !orderId,
    onCompleted: (data) => {
      if (data?.getOrderForEdit) {
        setVersion(data.getOrderForEdit.version);
        setLockInfo(data.getOrderForEdit.editLock);
        setIsLockOwner(
          data.getOrderForEdit.editLock?.lockedBy === currentWorkspaceMember?.id
        );
      }
    },
  });

  // Mutations
  const [acquireLockMutation, { loading: acquireLoading }] = useMutation(
    ACQUIRE_ORDER_EDIT_LOCK
  );
  const [releaseLockMutation] = useMutation(RELEASE_ORDER_EDIT_LOCK);
  const [extendLockMutation] = useMutation(EXTEND_ORDER_EDIT_LOCK);

  // Heartbeat to extend lock
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(async () => {
      try {
        const result = await extendLockMutation({
          variables: { input: { orderId } },
        });

        if (result.data?.extendOrderEditLock?.success) {
          setLockInfo((prev) =>
            prev
              ? {
                  ...prev,
                  expiresAt: new Date(result.data.extendOrderEditLock.newExpiresAt),
                }
              : null
          );
        } else {
          // Lock lost
          setIsLockOwner(false);
          stopHeartbeat();
        }
      } catch (err) {
        console.error('Failed to extend lock:', err);
      }
    }, EDIT_LOCK_CONFIG.HEARTBEAT_INTERVAL_SECONDS * 1000);
  }, [orderId, extendLockMutation]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Acquire lock
  const acquireLock = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const result = await acquireLockMutation({
        variables: { input: { orderId } },
      });

      const response = result.data?.acquireOrderEditLock;

      if (response?.success) {
        setIsLockOwner(true);
        setLockInfo(response.lock);
        setVersion(response.version ?? 0);
        startHeartbeat();
        return true;
      } else {
        setError(response?.error ?? 'Failed to acquire lock');
        setLockInfo(response?.lock ?? null);
        return false;
      }
    } catch (err) {
      setError('Network error while acquiring lock');
      return false;
    }
  }, [orderId, acquireLockMutation, startHeartbeat]);

  // Release lock
  const releaseLock = useCallback(async (): Promise<void> => {
    stopHeartbeat();

    try {
      await releaseLockMutation({
        variables: { input: { orderId } },
      });

      setIsLockOwner(false);
      setLockInfo(null);
    } catch (err) {
      console.error('Failed to release lock:', err);
    }
  }, [orderId, releaseLockMutation, stopHeartbeat]);

  // Extend lock manually
  const extendLock = useCallback(async (): Promise<boolean> => {
    try {
      const result = await extendLockMutation({
        variables: { input: { orderId } },
      });

      return result.data?.extendOrderEditLock?.success ?? false;
    } catch (err) {
      // Log error instead of silent catch per repo convention
      console.error('Failed to extend lock manually:', err);
      return false;
    }
  }, [orderId, extendLockMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
      // Auto-release lock on unmount
      if (isLockOwner) {
        releaseLockMutation({
          variables: { input: { orderId } },
        }).catch((err) => {
          // Log cleanup errors instead of silent catch per repo convention
          console.warn('Failed to release lock on unmount:', err);
        });
      }
    };
  }, [orderId, isLockOwner, releaseLockMutation, stopHeartbeat]);

  return {
    isLockOwner,
    isLockedByOther: lockInfo?.isLocked && !isLockOwner,
    lockInfo,
    version,
    isLoading: queryLoading || acquireLoading,
    error,
    acquireLock,
    releaseLock,
    extendLock,
  };
};
```

### 5.2. GraphQL Operations

**File**: `packages/twenty-front/src/modules/mkt/order/graphql/concurrent-editing.graphql.ts`

```typescript
import { gql } from '@apollo/client';

export const GET_ORDER_FOR_EDIT = gql`
  query GetOrderForEdit($orderId: String!) {
    getOrderForEdit(orderId: $orderId) {
      id
      version
      editLock {
        isLocked
        lockedBy
        lockedByName
        lockedAt
        expiresAt
        remainingSeconds
      }
      name
      orderCode
      status
      totalAmount
      discount
      discountPercent
      note
      requireContract
      mktCustomerId
      mktContractId
    }
  }
`;

export const ACQUIRE_ORDER_EDIT_LOCK = gql`
  mutation AcquireOrderEditLock($input: AcquireEditLockInput!) {
    acquireOrderEditLock(input: $input) {
      success
      lock {
        isLocked
        lockedBy
        lockedByName
        expiresAt
        remainingSeconds
      }
      version
      error
      errorCode
    }
  }
`;

export const RELEASE_ORDER_EDIT_LOCK = gql`
  mutation ReleaseOrderEditLock($input: ReleaseEditLockInput!) {
    releaseOrderEditLock(input: $input) {
      success
      error
    }
  }
`;

export const EXTEND_ORDER_EDIT_LOCK = gql`
  mutation ExtendOrderEditLock($input: ExtendEditLockInput!) {
    extendOrderEditLock(input: $input) {
      success
      newExpiresAt
      error
    }
  }
`;

export const UPDATE_ORDER_WITH_VERSION = gql`
  mutation UpdateOrderWithVersion($input: UpdateOrderWithVersionInput!) {
    updateOrderWithVersion(input: $input) {
      success
      newVersion
      conflict {
        currentVersion
        conflicts {
          field
          yourValue
          currentValue
        }
        modifiedByName
        modifiedAt
      }
      error
    }
  }
`;
```

### 5.3. Lock Indicator Component

**File**: `packages/twenty-front/src/modules/mkt/order/components/OrderEditLockIndicator.tsx`

```tsx
import { useEffect, useState } from 'react';
import styled from '@emotion/styled';

import { IconLock, IconUser } from 'twenty-ui/display';

// NOTE: Use `type` instead of `interface` per codebase convention
type OrderEditLockIndicatorProps = {
  isLocked: boolean;
  lockedByName?: string;
  expiresAt?: Date;
  isOwner: boolean;
};

const Container = styled.div<{ isOwner: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: ${({ isOwner, theme }) =>
    isOwner ? theme.color.green10 : theme.color.orange10};
  color: ${({ isOwner, theme }) =>
    isOwner ? theme.color.green : theme.color.orange};
  font-size: 12px;
`;

const Timer = styled.span`
  font-weight: 600;
`;

export const OrderEditLockIndicator = ({
  isLocked,
  lockedByName,
  expiresAt,
  isOwner,
}: OrderEditLockIndicatorProps) => {
  const [remainingTime, setRemainingTime] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!isLocked) return null;

  return (
    <Container isOwner={isOwner}>
      {isOwner ? (
        <>
          <IconLock size={16} />
          <span>You are editing</span>
          <Timer>{remainingTime}</Timer>
        </>
      ) : (
        <>
          <IconUser size={16} />
          <span>{lockedByName ?? 'Someone'} is editing</span>
          <Timer>{remainingTime}</Timer>
        </>
      )}
    </Container>
  );
};
```

### 5.4. Conflict Resolution Dialog

**File**: `packages/twenty-front/src/modules/mkt/order/components/OrderConflictDialog.tsx`

```tsx
import { useState } from 'react';
import styled from '@emotion/styled';

import { Button } from 'twenty-ui/input';
import { IconAlertTriangle } from 'twenty-ui/display';
import { Modal } from '@/ui/layout/modal/components/Modal';

// NOTE: Use `type` instead of `interface` per codebase convention
type FieldConflict = {
  field: string;
  yourValue?: string;
  currentValue?: string;
};

type OrderConflictDialogProps = {
  isOpen: boolean;
  conflicts: FieldConflict[];
  modifiedByName?: string;
  modifiedAt?: Date;
  onKeepMine: () => void;
  onKeepTheirs: () => void;
  onMerge: (resolutions: Record<string, 'mine' | 'theirs'>) => void;
  onCancel: () => void;
};

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`;

const Content = styled.div`
  padding: 16px;
`;

const ConflictTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
  }

  th {
    background-color: ${({ theme }) => theme.background.tertiary};
    font-weight: 600;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 16px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const ModifiedBy = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.font.color.secondary};
  margin-bottom: 16px;
`;

export const OrderConflictDialog = ({
  isOpen,
  conflicts,
  modifiedByName,
  modifiedAt,
  onKeepMine,
  onKeepTheirs,
  onMerge,
  onCancel,
}: OrderConflictDialogProps) => {
  const [resolutions, setResolutions] = useState<Record<string, 'mine' | 'theirs'>>({});

  const handleResolutionChange = (field: string, value: 'mine' | 'theirs') => {
    setResolutions((prev) => ({ ...prev, [field]: value }));
  };

  const handleMerge = () => {
    // Default unselected fields to 'theirs'
    const finalResolutions: Record<string, 'mine' | 'theirs'> = {};
    for (const conflict of conflicts) {
      finalResolutions[conflict.field] = resolutions[conflict.field] ?? 'theirs';
    }
    onMerge(finalResolutions);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <Header>
        <IconAlertTriangle size={24} color="orange" />
        <Title>Edit Conflict Detected</Title>
      </Header>

      <Content>
        <ModifiedBy>
          This order was modified by {modifiedByName ?? 'another user'}
          {modifiedAt && ` at ${modifiedAt.toLocaleString()}`}
        </ModifiedBy>

        <ConflictTable>
          <thead>
            <tr>
              <th>Field</th>
              <th>Your Value</th>
              <th>Current Value</th>
              <th>Keep</th>
            </tr>
          </thead>
          <tbody>
            {conflicts.map((conflict) => (
              <tr key={conflict.field}>
                <td>{conflict.field}</td>
                <td>{conflict.yourValue ?? '-'}</td>
                <td>{conflict.currentValue ?? '-'}</td>
                <td>
                  <RadioGroup>
                    <label>
                      <input
                        type="radio"
                        name={`resolution-${conflict.field}`}
                        checked={resolutions[conflict.field] === 'mine'}
                        onChange={() => handleResolutionChange(conflict.field, 'mine')}
                      />
                      Mine
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`resolution-${conflict.field}`}
                        checked={resolutions[conflict.field] === 'theirs'}
                        onChange={() => handleResolutionChange(conflict.field, 'theirs')}
                      />
                      Theirs
                    </label>
                  </RadioGroup>
                </td>
              </tr>
            ))}
          </tbody>
        </ConflictTable>
      </Content>

      <Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onKeepTheirs}>
          Keep All Theirs
        </Button>
        <Button variant="secondary" onClick={onKeepMine}>
          Keep All Mine
        </Button>
        <Button variant="primary" onClick={handleMerge}>
          Merge Selected
        </Button>
      </Footer>
    </Modal>
  );
};
```

---

## 6. Testing Strategy

### 6.1. Unit Tests

**File**: `packages/twenty-server/src/mkt-core/order/services/core/__tests__/order-concurrency.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrderConcurrencyService } from '../order-concurrency.service';
import { MktOrderRepository } from '../../../repositories';

describe('OrderConcurrencyService', () => {
  let service: OrderConcurrencyService;
  let mockRepository: jest.Mocked<MktOrderRepository>;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findByIdForEdit: jest.fn(),
      getRepository: jest.fn(),
      updateWithVersion: jest.fn(),
    } as unknown as jest.Mocked<MktOrderRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderConcurrencyService,
        { provide: MktOrderRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OrderConcurrencyService>(OrderConcurrencyService);
  });

  describe('acquireEditLock', () => {
    it('should acquire lock when order is not locked', async () => {
      const mockRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      };
      mockRepository.getRepository.mockResolvedValue(mockRepo as never);
      mockRepository.findByIdForEdit.mockResolvedValue({
        order: { id: 'order-1', version: 5 } as never,
        version: 5,
        editLock: { isLocked: true, lockedBy: 'user-1', expiresAt: new Date() },
      });

      const result = await service.acquireEditLock('order-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.version).toBe(5);
    });

    it('should fail when order is locked by another user', async () => {
      const mockRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        }),
      };
      mockRepository.getRepository.mockResolvedValue(mockRepo as never);
      mockRepository.findById.mockResolvedValue({
        id: 'order-1',
        editLockedBy: 'other-user',
        editLockExpiresAt: new Date(Date.now() + 600000),
      } as never);

      const result = await service.acquireEditLock('order-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ALREADY_LOCKED');
    });
  });

  describe('updateWithOptimisticLock', () => {
    it('should succeed when version matches', async () => {
      mockRepository.updateWithVersion.mockResolvedValue({
        success: true,
        newVersion: 6,
      });
      mockRepository.findByIdForEdit.mockResolvedValue({
        order: null,
        version: 0,
        editLock: { isLocked: false, lockedBy: null, expiresAt: null },
      });

      const result = await service.updateWithOptimisticLock(
        'order-1',
        { note: 'updated' },
        5,
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe(6);
    });

    it('should fail with conflict when version mismatches', async () => {
      mockRepository.updateWithVersion.mockResolvedValue({
        success: false,
        currentVersion: 7,
        currentData: { note: 'other update' } as never,
      });
      mockRepository.findByIdForEdit.mockResolvedValue({
        order: null,
        version: 0,
        editLock: { isLocked: false, lockedBy: null, expiresAt: null },
      });

      const result = await service.updateWithOptimisticLock(
        'order-1',
        { note: 'my update' },
        5,
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.conflict?.currentVersion).toBe(7);
    });
  });
});
```

### 6.2. Integration Test Scenarios

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| INT-001 | User A acquires lock, User B tries to acquire | User B gets ALREADY_LOCKED error |
| INT-002 | User A acquires lock, waits for expiry, User B acquires | User B gets lock successfully |
| INT-003 | User A and B read same order (v5), A saves, B saves | B gets CONFLICT with v6 |
| INT-004 | Heartbeat extends lock before expiry | Lock expiry time is extended |
| INT-005 | User closes browser without release | Cleanup job releases lock |
| INT-006 | WebSocket notification on lock/update | Other users receive real-time notification |

---

## 7. Deployment Checklist

### 7.1. Pre-Deployment

- [ ] Database migration created and tested
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Documentation updated

### 7.2. Deployment Steps

```bash
# 1. Run database migration
npx nx run twenty-server:typeorm migration:run

# 2. Verify migration
npx nx run twenty-server:typeorm migration:show

# 3. Deploy backend
npx nx build twenty-server
# Deploy to production

# 4. Deploy frontend
npx nx build twenty-front
# Deploy to production

# 5. Verify WebSocket connection
# Test /order-edit namespace

# 6. Monitor logs
# Watch for any errors in lock acquisition/release
```

### 7.3. Post-Deployment Verification

- [ ] Lock acquisition working
- [ ] Heartbeat extending locks
- [ ] Version conflict detected correctly
- [ ] WebSocket notifications received
- [ ] Cleanup job running

### 7.4. Rollback Plan

```bash
# 1. Revert frontend deployment
# 2. Revert backend deployment
# 3. Run down migration
npx nx run twenty-server:typeorm migration:revert
```

---

## 8. Troubleshooting Guide

### 8.1. Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Lock not acquired | Already locked by another user | Wait for expiry or contact lock owner |
| Lock stuck | User closed browser without release | Wait for cleanup job or manually clear |
| Version always conflicts | Client not tracking version | Check frontend version state management |
| WebSocket not connecting | CORS or auth issue | Check CORS config and token |
| Heartbeat failing | Network issue | Check network logs, implement retry |

### 8.2. Manual Lock Release (Admin)

```sql
-- Release lock for specific order
UPDATE "mktOrder"
SET
  "editLockedBy" = NULL,
  "editLockedAt" = NULL,
  "editLockExpiresAt" = NULL
WHERE id = 'order-id-here';

-- Release all expired locks
UPDATE "mktOrder"
SET
  "editLockedBy" = NULL,
  "editLockedAt" = NULL,
  "editLockExpiresAt" = NULL
WHERE "editLockExpiresAt" < NOW();
```

### 8.3. Monitoring Queries

```sql
-- Count active locks
SELECT COUNT(*) as active_locks
FROM "mktOrder"
WHERE "editLockedBy" IS NOT NULL
  AND "editLockExpiresAt" > NOW();

-- List locked orders with details
SELECT
  id,
  "orderCode",
  "editLockedBy",
  "editLockedAt",
  "editLockExpiresAt",
  EXTRACT(EPOCH FROM ("editLockExpiresAt" - NOW())) as remaining_seconds
FROM "mktOrder"
WHERE "editLockedBy" IS NOT NULL
ORDER BY "editLockedAt" DESC;

-- Check for stuck locks (expired but not cleared)
SELECT COUNT(*) as stuck_locks
FROM "mktOrder"
WHERE "editLockedBy" IS NOT NULL
  AND "editLockExpiresAt" < NOW();
```

---

## 9. Appendix

### 9.1. Configuration Constants

```typescript
// packages/twenty-front/src/modules/mkt/order/constants/concurrent-editing.constants.ts

export const EDIT_LOCK_CONFIG = {
  DEFAULT_LOCK_DURATION_MINUTES: 15,
  MAX_LOCK_DURATION_MINUTES: 60,
  HEARTBEAT_INTERVAL_SECONDS: 30,
  LOCK_EXTENSION_MINUTES: 10,
  LOCK_EXPIRY_WARNING_SECONDS: 60,
} as const;
```

### 9.2. Error Messages

```typescript
// packages/twenty-server/src/mkt-core/order/messages/concurrent-editing.messages.ts

export const CONCURRENT_EDITING_MESSAGES = {
  LOCK_ACQUIRED: 'Edit lock acquired successfully',
  LOCK_RELEASED: 'Edit lock released successfully',
  LOCK_EXTENDED: 'Edit lock extended successfully',

  ERROR: {
    ALREADY_LOCKED: 'Order is being edited by another user',
    NOT_LOCK_OWNER: 'You are not the lock owner',
    LOCK_NOT_FOUND: 'Lock not found or already released',
    LOCK_EXPIRED: 'Your edit session has expired',
    ORDER_NOT_FOUND: 'Order not found',
    VERSION_CONFLICT: 'Order was modified by another user',
    AUTH_REQUIRED: 'User authentication required',
  },
} as const;
```

### 9.3. Related Files Summary

| Category | File Path |
|----------|-----------|
| Entity | `mkt-core/order/objects/mkt-order.workspace-entity.ts` |
| Repository | `mkt-core/order/repositories/mkt-order.repository.ts` |
| Service | `mkt-core/order/services/core/order-concurrency.service.ts` |
| Resolver | `mkt-core/order/resolvers/order-edit.resolver.ts` |
| DTOs | `mkt-core/order/dto/concurrent-editing.dto.ts` |
| Types | `mkt-core/order/types/concurrent-editing.types.ts` |
| Gateway | `mkt-core/order/gateways/order-edit.gateway.ts` |
| Notification | `mkt-core/order/services/core/order-notification.service.ts` |
| Job | `mkt-core/order/jobs/cleanup-expired-locks.job.ts` |
| Hook | `twenty-front/.../hooks/useOrderEditLock.ts` |
| GraphQL | `twenty-front/.../graphql/concurrent-editing.graphql.ts` |
| Components | `twenty-front/.../components/OrderEditLockIndicator.tsx` |
| Components | `twenty-front/.../components/OrderConflictDialog.tsx` |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-21 | Technical Analysis | Initial implementation guide |
