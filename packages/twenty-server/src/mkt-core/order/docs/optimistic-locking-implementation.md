# Optimistic Locking - Implementation Guide

## Document Information

| Item | Value |
|------|-------|
| **Document Date** | 2026-01-21 |
| **Last Updated** | 2026-01-21 |
| **Module** | mkt-core/order |
| **Solution** | Optimistic Locking (Version-based) |
| **Status** | Implementation Guide |
| **Estimated Effort** | 3-5 days |

### Changelog

| Date | Changes |
|------|---------|
| 2026-01-21 | Initial document (Hybrid approach) |
| 2026-01-21 | Simplified: Remove Soft Lock, Real-time, Redis - keep only Optimistic Locking |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Implementation](#2-implementation)
3. [Frontend Integration](#3-frontend-integration)
4. [Testing Strategy](#4-testing-strategy)
5. [Deployment Checklist](#5-deployment-checklist)

---

## 1. Architecture Overview

### 1.1. Concept

**Optimistic Locking** giả định rằng conflicts hiếm khi xảy ra. Thay vì lock record khi edit, hệ thống chỉ check version tại thời điểm save.

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTIMISTIC LOCKING                        │
├─────────────────────────────────────────────────────────────┤
│  1. Client load Order → nhận version (vd: v5)               │
│  2. Client edit locally (không lock gì cả)                  │
│  3. Client save → gửi data + expectedVersion=5              │
│  4. Server: UPDATE ... WHERE id=X AND version=5             │
│     - affected=1 → Success, return version=6                │
│     - affected=0 → Conflict! Return current data            │
│  5. Client hiển thị conflict dialog nếu có                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │ OrderEditForm   │              │ ConflictDialog  │       │
│  │ - tracks version│              │ - diff view     │       │
│  │ - submit handler│              │ - merge options │       │
│  └────────┬────────┘              └────────┬────────┘       │
│           │                                │                 │
│           └────────────┬───────────────────┘                 │
│                        │                                     │
│            ┌───────────▼───────────┐                        │
│            │  useOrderEdit() Hook  │                        │
│            │  - load with version  │                        │
│            │  - save with version  │                        │
│            │  - handle conflict    │                        │
│            └───────────┬───────────┘                        │
└────────────────────────┼────────────────────────────────────┘
                         │
                    GraphQL API
                         │
┌────────────────────────┼────────────────────────────────────┐
│                  BACKEND (NestJS)                            │
├────────────────────────┼────────────────────────────────────┤
│            ┌───────────▼───────────┐                        │
│            │  OrderEditResolver    │                        │
│            │  - updateWithVersion  │                        │
│            └───────────┬───────────┘                        │
│                        │                                     │
│            ┌───────────▼───────────┐                        │
│            │ OrderConcurrencyService│                       │
│            │ - version check       │                        │
│            │ - conflict detection  │                        │
│            └───────────┬───────────┘                        │
│                        │                                     │
│            ┌───────────▼───────────┐                        │
│            │  MktOrderRepository   │                        │
│            │  - updateWithVersion  │                        │
│            │  - atomic operations  │                        │
│            └───────────┬───────────┘                        │
└────────────────────────┼────────────────────────────────────┘
                         │
               ┌─────────▼─────────┐
               │    PostgreSQL     │
               │    - orders       │
               │    - version      │
               └───────────────────┘
```

### 1.3. Data Flow - Happy Path

```
┌──────┐          ┌──────────┐          ┌─────────┐          ┌───────┐
│User A│          │ Frontend │          │ Backend │          │  DB   │
└──┬───┘          └────┬─────┘          └────┬────┘          └───┬───┘
   │                   │                     │                   │
   │ Open Order Edit   │                     │                   │
   │──────────────────>│                     │                   │
   │                   │ getOrder(id)        │                   │
   │                   │────────────────────>│                   │
   │                   │                     │ SELECT * FROM ... │
   │                   │                     │──────────────────>│
   │                   │                     │   Order (v=5)     │
   │                   │<────────────────────│<──────────────────│
   │   Show form       │                     │                   │
   │   version: 5      │                     │                   │
   │<──────────────────│                     │                   │
   │                   │                     │                   │
   │ [User edits...]   │                     │                   │
   │                   │                     │                   │
   │ Save changes      │                     │                   │
   │──────────────────>│                     │                   │
   │                   │ updateWithVersion   │                   │
   │                   │ (data, version: 5)  │                   │
   │                   │────────────────────>│                   │
   │                   │                     │ UPDATE ... WHERE  │
   │                   │                     │ id=X AND version=5│
   │                   │                     │──────────────────>│
   │                   │                     │  affected: 1      │
   │                   │                     │<──────────────────│
   │                   │   Success (v=6)     │                   │
   │                   │<────────────────────│                   │
   │   Order saved!    │                     │                   │
   │<──────────────────│                     │                   │
```

### 1.4. Data Flow - Conflict

```
┌──────┐ ┌──────┐      ┌──────────┐          ┌─────────┐          ┌───────┐
│User A│ │User B│      │ Frontend │          │ Backend │          │  DB   │
└──┬───┘ └──┬───┘      └────┬─────┘          └────┬────┘          └───┬───┘
   │        │               │                     │                   │
   │ Load Order (v5)        │                     │                   │
   │───────────────────────>│                     │                   │
   │<───────────────────────│ version: 5         │                   │
   │        │               │                     │                   │
   │        │ Load Order    │                     │                   │
   │        │──────────────>│                     │                   │
   │        │<──────────────│ version: 5         │                   │
   │        │               │                     │                   │
   │ [A edits name="ABC"]   │                     │                   │
   │        │               │                     │                   │
   │        │ [B edits name="XYZ"]                │                   │
   │        │               │                     │                   │
   │ Save (v5)              │                     │                   │
   │───────────────────────>│ update(v5)         │                   │
   │                        │────────────────────>│ WHERE v=5        │
   │                        │                     │──────────────────>│
   │                        │                     │ affected: 1       │
   │                        │<────────────────────│<──────────────────│
   │<───────────────────────│ Success (v=6)      │                   │
   │                        │                     │                   │
   │        │ Save (v5)     │                     │                   │
   │        │──────────────>│ update(v5)         │                   │
   │        │               │────────────────────>│ WHERE v=5        │
   │        │               │                     │──────────────────>│
   │        │               │                     │ affected: 0 ❌    │
   │        │               │                     │<──────────────────│
   │        │               │                     │ Fetch current     │
   │        │               │                     │──────────────────>│
   │        │               │                     │ Order (v=6)       │
   │        │               │<────────────────────│<──────────────────│
   │        │<──────────────│ CONFLICT!          │                   │
   │        │               │ - yourValue: "XYZ" │                   │
   │        │               │ - currentValue:"ABC"                   │
   │        │               │ - currentVersion: 6│                   │
```

---

## 2. Implementation

### 2.1. Files to Create/Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| **MODIFY** | `mkt-core/constants/mkt-field-ids.ts` | Thêm field ID cho version |
| **MODIFY** | `mkt-core/order/objects/mkt-order.workspace-entity.ts` | Thêm version field |
| **CREATE** | `mkt-core/order/types/optimistic-locking.types.ts` | Types cho optimistic locking |
| **CREATE** | `mkt-core/order/dto/optimistic-locking.dto.ts` | GraphQL DTOs |
| **CREATE** | `mkt-core/order/services/order-concurrency.service.ts` | Service xử lý version check |
| **CREATE** | `mkt-core/order/resolvers/order-edit.resolver.ts` | GraphQL resolver |
| **MODIFY** | `mkt-core/order/mkt-order.module.ts` | Register services |

### 2.2. Entity Field

**File**: `packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts`

```typescript
// Thêm vào MKT_ORDER_FIELD_IDS
export const MKT_ORDER_FIELD_IDS = {
  // ... existing fields ...

  // OPTIMISTIC LOCKING
  version: '20260121-0001-4000-8000-000000000001',
};
```

**File**: `packages/twenty-server/src/mkt-core/order/objects/mkt-order.workspace-entity.ts`

```typescript
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.version,
  type: FieldMetadataType.NUMBER,
  label: 'Version',
  description: 'Version number for optimistic locking',
  icon: 'IconGitBranch',
  defaultValue: 1,
})
@WorkspaceIsNullable()
version: number | null;
```

### 2.3. Types

**File**: `packages/twenty-server/src/mkt-core/order/types/optimistic-locking.types.ts`

```typescript
/**
 * Result of optimistic update operation
 */
export type OptimisticUpdateResult = {
  success: boolean;
  newVersion?: number;
  error?: string;
  conflict?: ConflictInfo;
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
 * List of editable fields for conflict detection
 * Only these fields will be included in conflict detection
 */
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

### 2.4. DTOs

**File**: `packages/twenty-server/src/mkt-core/order/dto/optimistic-locking.dto.ts`

```typescript
import { Field, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

import GraphQLJSON from 'graphql-type-json';

// ============================================
// ENUMS
// ============================================

export enum ConflictResolutionStrategy {
  KEEP_MINE = 'KEEP_MINE',
  KEEP_THEIRS = 'KEEP_THEIRS',
  MERGE = 'MERGE',
}

registerEnumType(ConflictResolutionStrategy, {
  name: 'ConflictResolutionStrategy',
  description: 'Strategy for resolving edit conflicts',
});

// ============================================
// INPUT DTOs
// ============================================

@InputType()
export class UpdateOrderWithVersionInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @Field(() => Int, { description: 'Expected version number' })
  @IsNumber()
  @Min(1)
  expectedVersion: number;

  @Field(() => GraphQLJSON, { description: 'Fields to update' })
  data: Record<string, unknown>;
}

@InputType()
export class ResolveConflictInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @Field(() => Int, { description: 'Current version in database' })
  @IsNumber()
  @Min(1)
  currentVersion: number;

  @Field(() => GraphQLJSON, { description: 'Resolved data to save' })
  resolvedData: Record<string, unknown>;
}

// ============================================
// OUTPUT DTOs
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
export class UpdateOrderWithVersionOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int, { nullable: true, description: 'New version after successful update' })
  newVersion?: number;

  @Field(() => String, { nullable: true, description: 'Error message if failed' })
  error?: string;

  @Field(() => ConflictInfoOutput, { nullable: true, description: 'Conflict details if version mismatch' })
  conflict?: ConflictInfoOutput;
}
```

### 2.5. Service

**File**: `packages/twenty-server/src/mkt-core/order/services/order-concurrency.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import {
  ConflictInfo,
  EDITABLE_ORDER_FIELDS,
  FieldConflict,
  OptimisticUpdateResult,
} from '../types/optimistic-locking.types';

const MESSAGES = {
  ORDER_NOT_FOUND: 'Order not found',
  VERSION_CONFLICT: 'Order was modified by another user',
  UPDATE_SUCCESS: 'Order updated successfully',
};

@Injectable()
export class OrderConcurrencyService {
  private readonly logger = new Logger(OrderConcurrencyService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Update order with optimistic locking
   * @returns Result with success status and conflict info if version mismatch
   */
  async updateWithOptimisticLock(
    workspaceId: string,
    orderId: string,
    data: Partial<MktOrderWorkspaceEntity>,
    expectedVersion: number,
  ): Promise<OptimisticUpdateResult> {
    this.logger.debug(
      `Optimistic update: orderId=${orderId}, expectedVersion=${expectedVersion}`,
    );

    const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
    );

    // Atomic update with version check
    const result = await repository
      .createQueryBuilder()
      .update(MktOrderWorkspaceEntity)
      .set({
        ...data,
        version: () => 'version + 1',
        updatedAt: DateTimeUtils.toDate(DateTimeUtils.now()),
      } as unknown as QueryDeepPartialEntity<MktOrderWorkspaceEntity>)
      .where('id = :id AND version = :version', {
        id: orderId,
        version: expectedVersion,
      })
      .execute();

    // Success
    if (result.affected === 1) {
      return {
        success: true,
        newVersion: expectedVersion + 1,
      };
    }

    // Conflict - fetch current data
    const currentOrder = await repository.findOne({
      where: { id: orderId },
    });

    if (!currentOrder) {
      return {
        success: false,
        error: MESSAGES.ORDER_NOT_FOUND,
      };
    }

    // Detect field-level conflicts
    const conflicts = this.detectConflicts(data, currentOrder);

    return {
      success: false,
      error: MESSAGES.VERSION_CONFLICT,
      conflict: {
        currentVersion: currentOrder.version ?? 0,
        conflicts,
        modifiedAt: currentOrder.updatedAt
          ? DateTimeUtils.toDate(DateTimeUtils.fromISO(String(currentOrder.updatedAt)))
          : undefined,
      },
    };
  }

  /**
   * Force update after user resolves conflict
   */
  async forceUpdate(
    workspaceId: string,
    orderId: string,
    resolvedData: Partial<MktOrderWorkspaceEntity>,
    currentVersion: number,
  ): Promise<OptimisticUpdateResult> {
    // Use current version to ensure no other changes happened during resolution
    return this.updateWithOptimisticLock(
      workspaceId,
      orderId,
      resolvedData,
      currentVersion,
    );
  }

  /**
   * Detect field-level conflicts between user's changes and current data
   */
  private detectConflicts(
    userChanges: Partial<MktOrderWorkspaceEntity>,
    currentData: MktOrderWorkspaceEntity,
  ): FieldConflict[] {
    const conflicts: FieldConflict[] = [];

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
}
```

### 2.6. Resolver

**File**: `packages/twenty-server/src/mkt-core/order/resolvers/order-edit.resolver.ts`

```typescript
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

import {
  ResolveConflictInput,
  UpdateOrderWithVersionInput,
  UpdateOrderWithVersionOutput,
} from '../dto/optimistic-locking.dto';
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
      input.orderId,
      input.data as Partial<MktOrderWorkspaceEntity>,
      input.expectedVersion,
    );

    return {
      success: result.success,
      newVersion: result.newVersion,
      error: result.error,
      conflict: result.conflict
        ? {
            currentVersion: result.conflict.currentVersion,
            conflicts: result.conflict.conflicts.map((c) => ({
              field: c.field,
              yourValue: c.yourValue,
              currentValue: c.currentValue,
            })),
            modifiedAt: result.conflict.modifiedAt,
          }
        : undefined,
    };
  }

  @Mutation(() => UpdateOrderWithVersionOutput, {
    description: 'Force update after resolving conflict',
  })
  async resolveOrderConflict(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: ResolveConflictInput,
  ): Promise<UpdateOrderWithVersionOutput> {
    const result = await this.orderConcurrencyService.forceUpdate(
      workspace.id,
      input.orderId,
      input.resolvedData as Partial<MktOrderWorkspaceEntity>,
      input.currentVersion,
    );

    return {
      success: result.success,
      newVersion: result.newVersion,
      error: result.error,
      conflict: result.conflict
        ? {
            currentVersion: result.conflict.currentVersion,
            conflicts: result.conflict.conflicts.map((c) => ({
              field: c.field,
              yourValue: c.yourValue,
              currentValue: c.currentValue,
            })),
            modifiedAt: result.conflict.modifiedAt,
          }
        : undefined,
    };
  }
}
```

### 2.7. Module Registration

**File**: `packages/twenty-server/src/mkt-core/order/mkt-order.module.ts`

```typescript
// Thêm imports
import { OrderConcurrencyService } from './services/order-concurrency.service';
import { OrderEditResolver } from './resolvers/order-edit.resolver';

@Module({
  providers: [
    // ... existing providers ...
    OrderConcurrencyService,
    OrderEditResolver,
  ],
  exports: [
    // ... existing exports ...
    OrderConcurrencyService,
  ],
})
export class MktOrderModule {}
```

---

## 3. Frontend Integration

### 3.1. GraphQL Operations

**File**: `packages/twenty-front/src/modules/mkt/order/graphql/order-edit.graphql.ts`

```typescript
import { gql } from '@apollo/client';

export const UPDATE_ORDER_WITH_VERSION = gql`
  mutation UpdateOrderWithVersion($input: UpdateOrderWithVersionInput!) {
    updateOrderWithVersion(input: $input) {
      success
      newVersion
      error
      conflict {
        currentVersion
        conflicts {
          field
          yourValue
          currentValue
        }
        modifiedAt
      }
    }
  }
`;

export const RESOLVE_ORDER_CONFLICT = gql`
  mutation ResolveOrderConflict($input: ResolveConflictInput!) {
    resolveOrderConflict(input: $input) {
      success
      newVersion
      error
      conflict {
        currentVersion
        conflicts {
          field
          yourValue
          currentValue
        }
        modifiedAt
      }
    }
  }
`;
```

### 3.2. React Hook

**File**: `packages/twenty-front/src/modules/mkt/order/hooks/useOrderEdit.ts`

```typescript
import { useMutation } from '@apollo/client';
import { useCallback, useState } from 'react';

import {
  RESOLVE_ORDER_CONFLICT,
  UPDATE_ORDER_WITH_VERSION,
} from '../graphql/order-edit.graphql';

type FieldConflict = {
  field: string;
  yourValue: unknown;
  currentValue: unknown;
};

type ConflictInfo = {
  currentVersion: number;
  conflicts: FieldConflict[];
  modifiedAt?: Date;
};

type UseOrderEditReturn = {
  updateOrder: (
    orderId: string,
    data: Record<string, unknown>,
    expectedVersion: number,
  ) => Promise<{ success: boolean; newVersion?: number }>;
  resolveConflict: (
    orderId: string,
    resolvedData: Record<string, unknown>,
    currentVersion: number,
  ) => Promise<{ success: boolean; newVersion?: number }>;
  conflict: ConflictInfo | null;
  clearConflict: () => void;
  isLoading: boolean;
  error: string | null;
};

export const useOrderEdit = (): UseOrderEditReturn => {
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [updateMutation, { loading: updateLoading }] = useMutation(
    UPDATE_ORDER_WITH_VERSION,
  );
  const [resolveMutation, { loading: resolveLoading }] = useMutation(
    RESOLVE_ORDER_CONFLICT,
  );

  const updateOrder = useCallback(
    async (
      orderId: string,
      data: Record<string, unknown>,
      expectedVersion: number,
    ) => {
      setError(null);
      setConflict(null);

      const result = await updateMutation({
        variables: {
          input: { orderId, data, expectedVersion },
        },
      });

      const response = result.data?.updateOrderWithVersion;

      if (response?.success) {
        return { success: true, newVersion: response.newVersion };
      }

      if (response?.conflict) {
        setConflict(response.conflict);
      }

      setError(response?.error ?? 'Update failed');
      return { success: false };
    },
    [updateMutation],
  );

  const resolveConflict = useCallback(
    async (
      orderId: string,
      resolvedData: Record<string, unknown>,
      currentVersion: number,
    ) => {
      setError(null);

      const result = await resolveMutation({
        variables: {
          input: { orderId, resolvedData, currentVersion },
        },
      });

      const response = result.data?.resolveOrderConflict;

      if (response?.success) {
        setConflict(null);
        return { success: true, newVersion: response.newVersion };
      }

      if (response?.conflict) {
        setConflict(response.conflict);
      }

      setError(response?.error ?? 'Resolve failed');
      return { success: false };
    },
    [resolveMutation],
  );

  const clearConflict = useCallback(() => {
    setConflict(null);
    setError(null);
  }, []);

  return {
    updateOrder,
    resolveConflict,
    conflict,
    clearConflict,
    isLoading: updateLoading || resolveLoading,
    error,
  };
};
```

### 3.3. Conflict Dialog Component

**File**: `packages/twenty-front/src/modules/mkt/order/components/OrderConflictDialog.tsx`

```typescript
import styled from '@emotion/styled';
import { useState } from 'react';

type FieldConflict = {
  field: string;
  yourValue: unknown;
  currentValue: unknown;
};

type OrderConflictDialogProps = {
  isOpen: boolean;
  conflicts: FieldConflict[];
  onResolve: (resolvedData: Record<string, unknown>) => void;
  onCancel: () => void;
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const Title = styled.h2`
  margin: 0 0 16px 0;
  color: #dc2626;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;

  th,
  td {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: left;
  }

  th {
    background: #f9fafb;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  background: ${({ variant }) =>
    variant === 'primary' ? '#3b82f6' : '#f3f4f6'};
  color: ${({ variant }) => (variant === 'primary' ? 'white' : '#374151')};
  border: 1px solid
    ${({ variant }) => (variant === 'primary' ? '#3b82f6' : '#d1d5db')};

  &:hover {
    opacity: 0.9;
  }
`;

export const OrderConflictDialog = ({
  isOpen,
  conflicts,
  onResolve,
  onCancel,
}: OrderConflictDialogProps) => {
  const [resolutions, setResolutions] = useState<Record<string, 'mine' | 'theirs'>>({});

  if (!isOpen) return null;

  const handleResolutionChange = (field: string, choice: 'mine' | 'theirs') => {
    setResolutions((prev) => ({ ...prev, [field]: choice }));
  };

  const handleResolve = () => {
    const resolvedData: Record<string, unknown> = {};

    for (const conflict of conflicts) {
      const choice = resolutions[conflict.field] ?? 'theirs';
      resolvedData[conflict.field] =
        choice === 'mine' ? conflict.yourValue : conflict.currentValue;
    }

    onResolve(resolvedData);
  };

  return (
    <Overlay>
      <Dialog>
        <Title>Edit Conflict Detected</Title>
        <p>
          Another user has modified this order. Please choose which values to
          keep:
        </p>

        <Table>
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
                <td>{String(conflict.yourValue ?? '-')}</td>
                <td>{String(conflict.currentValue ?? '-')}</td>
                <td>
                  <label>
                    <input
                      type="radio"
                      name={`resolution-${conflict.field}`}
                      checked={resolutions[conflict.field] === 'mine'}
                      onChange={() =>
                        handleResolutionChange(conflict.field, 'mine')
                      }
                    />
                    Mine
                  </label>
                  <label style={{ marginLeft: 12 }}>
                    <input
                      type="radio"
                      name={`resolution-${conflict.field}`}
                      checked={
                        resolutions[conflict.field] === 'theirs' ||
                        !resolutions[conflict.field]
                      }
                      onChange={() =>
                        handleResolutionChange(conflict.field, 'theirs')
                      }
                    />
                    Theirs
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <ButtonGroup>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleResolve}>
            Resolve & Save
          </Button>
        </ButtonGroup>
      </Dialog>
    </Overlay>
  );
};
```

### 3.4. Usage Example

```typescript
const OrderEditForm = ({ orderId, initialData, initialVersion }) => {
  const [formData, setFormData] = useState(initialData);
  const [version, setVersion] = useState(initialVersion);

  const { updateOrder, resolveConflict, conflict, clearConflict, isLoading } =
    useOrderEdit();

  const handleSubmit = async () => {
    const result = await updateOrder(orderId, formData, version);

    if (result.success) {
      setVersion(result.newVersion!);
      toast.success('Order saved!');
    }
    // If conflict, the conflict state will be set automatically
  };

  const handleResolveConflict = async (resolvedData: Record<string, unknown>) => {
    const result = await resolveConflict(
      orderId,
      resolvedData,
      conflict!.currentVersion,
    );

    if (result.success) {
      setVersion(result.newVersion!);
      setFormData(resolvedData);
      toast.success('Conflict resolved!');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </form>

      <OrderConflictDialog
        isOpen={!!conflict}
        conflicts={conflict?.conflicts ?? []}
        onResolve={handleResolveConflict}
        onCancel={clearConflict}
      />
    </>
  );
};
```

---

## 4. Testing Strategy

### 4.1. Unit Tests

**File**: `packages/twenty-server/src/mkt-core/order/services/__tests__/order-concurrency.service.spec.ts`

```typescript
describe('OrderConcurrencyService', () => {
  describe('updateWithOptimisticLock', () => {
    it('should succeed when version matches', async () => {
      // Mock repository to return affected: 1
      const result = await service.updateWithOptimisticLock(
        workspaceId,
        orderId,
        { name: 'New Name' },
        5,
      );

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe(6);
    });

    it('should fail with conflict when version mismatches', async () => {
      // Mock repository to return affected: 0 and current order with version 7
      const result = await service.updateWithOptimisticLock(
        workspaceId,
        orderId,
        { name: 'New Name' },
        5,
      );

      expect(result.success).toBe(false);
      expect(result.conflict?.currentVersion).toBe(7);
      expect(result.conflict?.conflicts).toHaveLength(1);
    });

    it('should return error when order not found', async () => {
      // Mock repository to return affected: 0 and null order
      const result = await service.updateWithOptimisticLock(
        workspaceId,
        'non-existent-id',
        { name: 'New Name' },
        5,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });
  });
});
```

### 4.2. Integration Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| INT-001 | User A loads order (v5), edits, saves | Success, version becomes 6 |
| INT-002 | User A loads (v5), User B loads (v5), A saves, B saves | B gets CONFLICT with v6 |
| INT-003 | User resolves conflict and saves | Success with new version |

---

## 5. Deployment Checklist

### Pre-deployment

- [ ] Add `version` field to entity
- [ ] Run `npx nx run twenty-server:command workspace:sync-metadata -f`
- [ ] Verify migration created for version field
- [ ] Run database migration

### Post-deployment

- [ ] Test optimistic locking works correctly
- [ ] Test conflict detection returns correct field differences
- [ ] Test conflict resolution saves correct data
- [ ] Monitor for any "Order not found" errors

---

## Summary

| Aspect | Value |
|--------|-------|
| **Complexity** | Low |
| **New Fields** | 1 (version) |
| **New Services** | 1 (OrderConcurrencyService) |
| **New Resolvers** | 1 (OrderEditResolver) |
| **Dependencies** | None (no Redis, no WebSocket) |
| **Estimated Effort** | 3-5 days |

**Key Benefits:**
- Simple implementation
- No infrastructure changes needed
- Conflict only occurs when actually needed
- Clean conflict resolution UX
