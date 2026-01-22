# Optimistic Locking - Order Module Implementation

## Document Information

| Item | Value |
|------|-------|
| **Document Date** | 2026-01-21 |
| **Last Updated** | 2026-01-21 |
| **Module** | mkt-core/order |
| **Solution** | Optimistic Locking (Version-based) |
| **Status** | Implementation Guide |
| **Estimated Effort** | 2-3 days |

### Changelog

| Date | Changes |
|------|---------|
| 2026-01-21 | Initial document (Hybrid approach) |
| 2026-01-21 | Simplified: Remove Soft Lock, Real-time, Redis - keep only Optimistic Locking |
| 2026-01-21 | Refactored: Extend từ common module `mkt-core/common/optimistic-locking` |
| 2026-01-22 | Integrated `expectedVersion` into existing status update mutations |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Common Module Integration](#2-common-module-integration)
3. [Order Module Implementation](#3-order-module-implementation)
4. [Frontend Integration](#4-frontend-integration)
5. [Testing Strategy](#5-testing-strategy)
6. [Deployment Checklist](#6-deployment-checklist)

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
│  ┌─────────────────────┼─────────────────────┐              │
│  │    COMMON MODULE    │                     │              │
│  │  ┌──────────────────▼────────────────┐   │              │
│  │  │ BaseOptimisticLockingService<T>   │   │              │
│  │  │ - updateWithOptimisticLock()      │   │              │
│  │  │ - forceUpdate()                   │   │              │
│  │  │ - detectConflicts()               │   │              │
│  │  └──────────────────┬────────────────┘   │              │
│  └─────────────────────┼─────────────────────┘              │
│                        │ extends                             │
│            ┌───────────▼───────────┐                        │
│            │ OrderConcurrencyService│                       │
│            │ (Order-specific config)│                        │
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

## 2. Common Module Integration

Order module sử dụng common module `mkt-core/common/optimistic-locking` làm base.

### 2.1. Common Module Structure

```
mkt-core/common/optimistic-locking/
├── index.ts                                    # Public exports
├── types/optimistic-locking.types.ts          # Generic types
├── dto/optimistic-locking.dto.ts              # Base GraphQL DTOs
├── messages/optimistic-locking.messages.ts    # Shared messages
└── services/base-optimistic-locking.service.ts # Abstract base service
```

### 2.2. Available Base Types

```typescript
import {
  // Types
  VersionedEntity,
  OptimisticUpdateResult,
  FieldConflict,
  ConflictInfo,
  OptimisticLockingConfig,
  // DTOs
  BaseUpdateWithVersionInput,
  BaseResolveConflictInput,
  OptimisticUpdateOutput,
  ConflictInfoOutput,
  FieldConflictOutput,
  ConflictResolutionStrategyEnum,
  // Service
  BaseOptimisticLockingService,
  // Messages
  OPTIMISTIC_LOCKING_MESSAGES,
} from 'src/mkt-core/common/optimistic-locking';
```

### 2.3. Key Features in Base Service

**File**: `src/mkt-core/common/optimistic-locking/services/base-optimistic-locking.service.ts`

```typescript
export abstract class BaseOptimisticLockingService<T extends VersionedEntity> {
  // Atomic update với version check
  async updateWithOptimisticLock(
    workspaceId: string,
    entityId: string,
    data: Partial<T>,
    expectedVersion: number,
  ): Promise<OptimisticUpdateResult<T>>;

  // Force update sau conflict resolution
  async forceUpdate(
    workspaceId: string,
    entityId: string,
    resolvedData: Partial<T>,
    currentVersion: number,
  ): Promise<OptimisticUpdateResult<T>>;

  // Detect field-level conflicts
  protected detectConflicts(
    userChanges: Partial<T>,
    currentData: T,
  ): FieldConflict[];

  // Deep equality comparison with lodash.isequal
  protected isEqual(a: unknown, b: unknown): boolean;

  // Build conflict info from entity
  protected buildConflictInfo(entity: T, conflicts: FieldConflict[]): ConflictInfo;
}
```

**Key Implementation Details:**

1. **Atomic Update Query**:
```typescript
// Sử dụng QueryBuilder với WHERE version = expectedVersion
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
```

2. **Type-Safe FindOne** (sử dụng `FindOptionsWhere<T>` thay vì `as any`):
```typescript
import { FindOptionsWhere } from 'typeorm';

const currentEntity = await repository.findOne({
  where: { id: entityId } as FindOptionsWhere<T>,
});
```

3. **Deep Equality với lodash.isequal**:
```typescript
import isEqual from 'lodash.isequal';

protected isEqual(a: unknown, b: unknown): boolean {
  // lodash.isEqual handles:
  // - null/undefined
  // - primitives
  // - Date objects
  // - nested objects (key order independent)
  // - arrays
  return isEqual(a, b);
}
```

4. **Safe Date Parsing với DateTimeUtils.parse()**:
```typescript
// DateTimeUtils.parse() xử lý an toàn cả Date object và ISO string
protected buildConflictInfo(entity: T, conflicts: FieldConflict[]): ConflictInfo {
  return {
    currentVersion: entity.version ?? 0,
    conflicts,
    modifiedAt: entity.updatedAt
      ? DateTimeUtils.toDate(DateTimeUtils.parse(entity.updatedAt))
      : undefined,
  };
}
```

---

## 3. Order Module Implementation

### 3.1. Files to Create/Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| **MODIFY** | `mkt-core/constants/mkt-field-ids.ts` | Thêm field ID cho version |
| **MODIFY** | `mkt-core/order/objects/mkt-order.workspace-entity.ts` | Thêm version field |
| **CREATE** | `mkt-core/order/constants/editable-fields.constant.ts` | Config editable fields |
| **CREATE** | `mkt-core/order/dto/order-optimistic-locking.dto.ts` | Order-specific DTOs |
| **CREATE** | `mkt-core/order/services/order-concurrency.service.ts` | Extend base service |
| **CREATE** | `mkt-core/order/resolvers/order-edit.resolver.ts` | GraphQL resolver |
| **MODIFY** | `mkt-core/order/mkt-order.module.ts` | Register services |
| **MODIFY** | `mkt-core/order/services/index.ts` | Export service |

### 3.2. Entity Field

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

### 3.3. Editable Fields Config

**File**: `packages/twenty-server/src/mkt-core/order/constants/editable-fields.constant.ts`

```typescript
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

### 3.4. Order-Specific DTOs

**File**: `packages/twenty-server/src/mkt-core/order/dto/order-optimistic-locking.dto.ts`

```typescript
import { Field, ID, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsUUID } from 'class-validator';

import {
  BaseResolveConflictInput,
  BaseUpdateWithVersionInput,
  OptimisticUpdateOutput,
} from 'src/mkt-core/common/optimistic-locking';

// ============================================
// INPUT DTOs (Extend base với Order ID)
// ============================================

@InputType()
export class UpdateOrderWithVersionInput extends BaseUpdateWithVersionInput {
  @Field(() => ID, { description: 'Order ID to update' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  get entityId(): string {
    return this.orderId;
  }
}

@InputType()
export class ResolveOrderConflictInput extends BaseResolveConflictInput {
  @Field(() => ID, { description: 'Order ID to resolve conflict' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  get entityId(): string {
    return this.orderId;
  }
}

// ============================================
// OUTPUT DTOs (Re-export từ common với alias)
// ============================================

/**
 * Output cho Order optimistic update operations
 * Re-export từ common module với alias phù hợp
 */
export { OptimisticUpdateOutput as UpdateOrderWithVersionOutput };
```

### 3.5. Order Concurrency Service

**File**: `packages/twenty-server/src/mkt-core/order/services/order-concurrency.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseOptimisticLockingService } from 'src/mkt-core/common/optimistic-locking';
import { EDITABLE_ORDER_FIELDS } from 'src/mkt-core/order/constants/editable-fields.constant';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

/**
 * Order Concurrency Service
 *
 * Extends BaseOptimisticLockingService với Order-specific configuration.
 * Handles concurrent edit protection cho MktOrder entity.
 *
 * @example
 * ```typescript
 * const result = await orderConcurrencyService.updateWithOptimisticLock(
 *   workspaceId,
 *   orderId,
 *   { name: 'Updated Name' },
 *   expectedVersion,
 * );
 *
 * if (!result.success && result.conflict) {
 *   // Handle conflict - show dialog to user
 * }
 * ```
 */
@Injectable()
export class OrderConcurrencyService extends BaseOptimisticLockingService<MktOrderWorkspaceEntity> {
  constructor(twentyORMGlobalManager: TwentyORMGlobalManager) {
    super(twentyORMGlobalManager, {
      entityName: 'mktOrder',
      editableFields: [...EDITABLE_ORDER_FIELDS],
      logContext: 'OrderConcurrency',
    });
  }
}
```

### 3.6. Resolver

**File**: `packages/twenty-server/src/mkt-core/order/resolvers/order-edit.resolver.ts`

```typescript
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import {
  ResolveOrderConflictInput,
  UpdateOrderWithVersionInput,
  UpdateOrderWithVersionOutput,
} from 'src/mkt-core/order/dto/order-optimistic-locking.dto';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderConcurrencyService } from 'src/mkt-core/order/services/order-concurrency.service';

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
      // Trả về currentData để client có thể refetch hoặc hiển thị merge UI
      currentData: result.currentData as Record<string, unknown> | undefined,
    };
  }

  @Mutation(() => UpdateOrderWithVersionOutput, {
    description: 'Force update after resolving conflict',
  })
  async resolveOrderConflict(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: ResolveOrderConflictInput,
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
      currentData: result.currentData as Record<string, unknown> | undefined,
    };
  }
}
```

### 3.7. Module Registration

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

### 3.8. Service Exports

**File**: `packages/twenty-server/src/mkt-core/order/services/index.ts`

```typescript
// ... existing exports ...
export { OrderConcurrencyService } from './order-concurrency.service';
```

---

## 4. Frontend Integration

### 4.1. GraphQL Operations

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
      currentData
    }
  }
`;

export const RESOLVE_ORDER_CONFLICT = gql`
  mutation ResolveOrderConflict($input: ResolveOrderConflictInput!) {
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
      currentData
    }
  }
`;
```

### 4.2. React Hook

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
  currentData?: Record<string, unknown>;
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
        setConflict({
          ...response.conflict,
          currentData: response.currentData,
        });
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
        setConflict({
          ...response.conflict,
          currentData: response.currentData,
        });
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

### 4.3. Conflict Dialog Component

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

### 4.4. Usage Example

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

## 5. Testing Strategy

### 5.1. Unit Tests

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
      expect(result.currentData).toBeDefined();
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
      expect(result.error).toBe('Entity not found');
    });

    it('should detect conflicts using deep equality', async () => {
      // Test with nested object that has different key order
      // lodash.isEqual should handle this correctly
    });
  });
});
```

### 5.2. Integration Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| INT-001 | User A loads order (v5), edits, saves | Success, version becomes 6 |
| INT-002 | User A loads (v5), User B loads (v5), A saves, B saves | B gets CONFLICT with v6 |
| INT-003 | User resolves conflict and saves | Success with new version |
| INT-004 | Conflict response includes currentData | currentData field populated |

---

## 6. Deployment Checklist

### Pre-deployment

- [ ] Add `version` field to entity
- [ ] Run `npx nx run twenty-server:command workspace:sync-metadata -f`
- [ ] Verify migration created for version field
- [ ] Run database migration
- [ ] Export OrderConcurrencyService từ `services/index.ts`

### Post-deployment

- [ ] Test optimistic locking works correctly
- [ ] Test conflict detection returns correct field differences
- [ ] Test conflict response includes `currentData`
- [ ] Test conflict resolution saves correct data
- [ ] Monitor for any "Entity not found" errors

---

## Summary

| Aspect | Value |
|--------|-------|
| **Complexity** | Low |
| **New Fields** | 1 (version) |
| **New Services** | 1 (OrderConcurrencyService - extends base) |
| **New Resolvers** | 1 (OrderEditResolver) |
| **Dependencies** | Common module `mkt-core/common/optimistic-locking` |
| **Estimated Effort** | 2-3 days |

**Key Benefits:**
- Simple implementation (extends base service)
- Reusable common module for other entities
- No infrastructure changes needed
- Conflict only occurs when actually needed
- Clean conflict resolution UX
- `currentData` returned for merge UI support

**Key Technical Fixes (vs original):**
- Sử dụng `lodash.isequal` thay vì `===` để deep equality comparison
- Sử dụng `DateTimeUtils.parse()` thay vì `fromISO(String(...))` cho safe date parsing
- Sử dụng `FindOptionsWhere<T>` thay vì `as any` cho type safety
- Thêm `currentData` field trong response cho merge UI
- Export service qua barrel file `services/index.ts`

---

## 7. Integration với Existing Mutations (Phase 2)

Ngoài resolver riêng `OrderEditResolver`, optimistic locking cũng được tích hợp vào các mutations hiện có để bảo vệ các thao tác thay đổi status của order.

### 7.1. DTOs Updated

Các DTOs sau đã được thêm field `expectedVersion`:

| DTO | File |
|-----|------|
| `ConfirmOrderInputDto` | `dto/create-order.input.ts` |
| `UpdateOrderStatusInputDto` | `dto/create-order.input.ts` |
| `RefundOrderInputDto` | `dto/create-order.input.ts` |
| `PublishDraftOrderInputDto` | `dto/create-order.input.ts` |
| `ConfirmOrderWithLicenseInputDto` | `dto/payment-flow.dto.ts` |
| `ConfirmPaymentInputDto` | `dto/payment-flow.dto.ts` |
| `UnlockOrderInputDto` | `dto/payment-flow.dto.ts` |

**Example:**
```typescript
@Field(() => Int, {
  nullable: true,
  description:
    'Expected version for optimistic locking. If provided, update will fail if version mismatch.',
})
@IsOptional()
@IsNumber()
@Min(1)
expectedVersion?: number;
```

### 7.2. Types Updated

Các types trong `types/order-mutation.types.ts` cũng được cập nhật:

- `ConfirmOrderInput`
- `RefundOrderInput`
- `UpdateOrderStatusInput`
- `PublishDraftOrderInput`

### 7.3. OrderOrchestrationService Updates

**File**: `services/application/order-orchestration.service.ts`

Thêm helper method `checkVersionIfRequired()`:

```typescript
private async checkVersionIfRequired(
  orderId: string,
  expectedVersion?: number,
): Promise<{
  error?: string;
  currentVersion?: number;
  currentData?: { version: number };
} | null> {
  // Nếu không có expectedVersion, bỏ qua check (backward compatible)
  if (expectedVersion === undefined || expectedVersion === null) {
    return null;
  }

  // Validate expectedVersion phải >= 1
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      error: OPTIMISTIC_LOCKING_MESSAGES.INVALID_VERSION_MUST_BE_POSITIVE,
    };
  }

  // Fetch current order và compare versions
  const order = await this.orderRepository.findById(orderId);
  if (!order) {
    return { error: OPTIMISTIC_LOCKING_MESSAGES.ENTITY_NOT_FOUND };
  }

  const currentVersion = order.version ?? 1;
  if (currentVersion !== expectedVersion) {
    return {
      error: OPTIMISTIC_LOCKING_MESSAGES.VERSION_CONFLICT,
      currentVersion,
      currentData: { version: currentVersion },
    };
  }

  return null;
}
```

**Các methods được update:**

| Method | Description |
|--------|-------------|
| `confirmOrder()` | Version check trước validation và saga execution |
| `updateOrderStatus()` | Version check trước saga execution |
| `refundOrder()` | Version check trước saga execution |
| `publishDraftOrder()` | Version check trước validation |
| `confirmOrderWithLicense()` | Version check trước saga execution |
| `confirmOrderPayment()` | Version check trước get order |
| `unlockOrderAfterPayment()` | Version check trước get order |

### 7.4. Mapper Updates

**File**: `mappers/order-input.mapper.ts`

Các mapper methods được update để pass `expectedVersion`:

- `toConfirmOrderInput()`
- `toUpdateOrderStatusInput()`
- `toUpdateOrderStatusInputWithStatus()`
- `toRefundOrderInput()` (mới thêm)

### 7.5. Resolver Updates

**File**: `resolvers/order-mutation.resolver.ts`

Các resolver methods được update để pass `expectedVersion` từ DTO:

- `publishDraftOrder()`
- `confirmOrderWithLicense()`
- `confirmOrderPayment()`
- `unlockOrderAfterPayment()`
- `refundOrder()` (sử dụng mapper)

### 7.6. Usage

**Backward Compatible**: Field `expectedVersion` là optional. Nếu không cung cấp, mutation sẽ hoạt động như cũ mà không check version.

**Với Version Check:**
```graphql
mutation {
  updateOrderStatus(input: {
    orderId: "uuid"
    action: COMPLETE
    expectedVersion: 5  # Optional - nếu có sẽ check version
  }) {
    success
    error  # "Entity was modified by another user" nếu version mismatch
    previousStatus
    newStatus
  }
}
```

**Không có Version Check (backward compatible):**
```graphql
mutation {
  updateOrderStatus(input: {
    orderId: "uuid"
    action: COMPLETE
    # Không có expectedVersion - bỏ qua check
  }) {
    success
    previousStatus
    newStatus
  }
}
```

### 7.7. Error Messages

Khi version mismatch, mutation sẽ return:
```json
{
  "success": false,
  "error": "Entity was modified by another user"
}
```

Khi version không hợp lệ (< 1):
```json
{
  "success": false,
  "error": "Expected version must be a positive integer (>= 1)"
}
```
