# Optimistic Locking - Implementation Roadmap

## Document Information

| Item | Value |
|------|-------|
| **Created** | 2026-01-22 |
| **Updated** | 2026-01-22 |
| **Module** | mkt-core/order |
| **Reference Doc** | `optimistic-locking-implementation.md` |
| **Common Module** | `mkt-core/common/optimistic-locking` |

---

## Review Feedback & Corrections

> **Dựa trên technical review ngày 2026-01-22**

### Issues Identified & Resolutions

| # | Issue | Resolution |
|---|-------|------------|
| 1 | **Field ID format** `20260122-...` không theo chuẩn | Sử dụng UUID v4 chuẩn như các field khác (ví dụ: `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e`) |
| 2 | **Version field nullable** với `@WorkspaceIsNullable` | ❌ **Sai** - Version PHẢI non-null với `defaultValue: 1`. Bỏ `@WorkspaceIsNullable` |
| 3 | **FieldMetadataType** NUMBER vs INTEGER | ✅ **Đúng** - Twenty chỉ có `NUMBER`, không có `INTEGER` |
| 4 | **entityName** dùng string `'mktOrder'` | Sử dụng constant `MKT_ORDER_ENTITY_NAME` từ entity file |
| 5 | **EDITABLE_ORDER_FIELDS** chưa verified | Review lại dựa trên entity fields và update input thực tế |
| 6 | **selectFields** thiếu required fields | PHẢI chứa `id`, `version`, `updatedAt` để conflict resolution hoạt động |
| 7 | **Resolver guards** | Phải dùng `@UseGuards(WorkspaceAuthGuard)` như các mutation khác |
| 8 | **Integration với existing flow** | Cần tích hợp vào luồng update hiện hữu, không chỉ mutation mới |
| 9 | **Tests** | Bổ sung test scenarios cho conflict detection và merge |

---

## Project Context

### Current State Analysis

**Từ Database (MCP Query):**
- Table `mktOrder` hiện có **42 columns**
- **KHÔNG có `version` field** - cần thêm mới
- Đã có `updatedAt` field (timestamp with time zone)
- Có các indexes cho search và relations

**Từ Codebase:**
- `MktOrderWorkspaceEntity` có ~586 lines
- `MKT_ORDER_FIELD_IDS` chưa có `version` field ID
- `MKT_ORDER_ENTITY_NAME = 'mktOrder'` đã có constant
- Order module có cấu trúc Clean Architecture:
  - `core/` - Stateless business logic
  - `domain/` - Domain operations (CRUD)
  - `application/` - Orchestration/Facade
  - `integration/` - Bridge services
- **Existing guards**: `WorkspaceAuthGuard` (all mutations)

**Field ID Format Reference:**
```typescript
// Chuẩn UUID v4 đang dùng trong MKT_ORDER_FIELD_IDS:
name: 'a5faa4d8-e788-465f-811b-a311d07c0aa2',
orderCode: 'b6db3443-3b87-4fad-b27f-77ec6eb6e57a',
// ...các field khác đều theo format UUID v4
```

**Common Module (đã tạo):**
- `mkt-core/common/optimistic-locking/` - Ready to use
- Types, DTOs, Messages, Base Service đã implement
- Có validation guard cho `expectedVersion >= 1`
- Có `selectFields` config cho privacy/performance

---

## Implementation Roadmap

### Phase 1: Entity & Database (Day 1)

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: ENTITY SETUP                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1.1: Add Field ID (UUID v4 format)                   │
│  └─ mkt-field-ids.ts: Add version field ID                 │
│                                                             │
│  Step 1.2: Update Entity (NON-NULLABLE with default)       │
│  └─ mkt-order.workspace-entity.ts: Add version field       │
│                                                             │
│  Step 1.3: Sync Metadata                                    │
│  └─ npx nx run twenty-server:command workspace:sync-metadata│
│                                                             │
│  Step 1.4: Verify Database                                  │
│  └─ Check version column exists with NOT NULL constraint   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:

| Task | File | Action | Est. |
|------|------|--------|------|
| 1.1 | `constants/mkt-field-ids.ts` | Add `version: 'uuid-v4'` to MKT_ORDER_FIELD_IDS | 5 min |
| 1.2 | `objects/mkt-order.workspace-entity.ts` | Add version WorkspaceField (non-null) | 10 min |
| 1.3 | CLI | `npx nx run twenty-server:command workspace:sync-metadata -f` | 5 min |
| 1.4 | Database | Verify via MCP `get_object_details` | 5 min |

**Code to add (Step 1.1):**
```typescript
// In mkt-field-ids.ts, add to MKT_ORDER_FIELD_IDS:
// ⚠️ Generate proper UUID v4 (e.g., use uuidgen command or online generator)
version: 'a7b8c9d0-e1f2-4a3b-8c5d-6e7f8a9b0c1d',
```

**Code to add (Step 1.2):**
```typescript
// In mkt-order.workspace-entity.ts, add field:
// ⚠️ KHÔNG dùng @WorkspaceIsNullable - version PHẢI non-null
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.version,
  type: FieldMetadataType.NUMBER,
  label: msg`Version`,
  description: msg`Version number for optimistic locking`,
  icon: 'IconGitBranch',
  defaultValue: 1,
})
version: number;
```

**⚠️ Important Notes:**
1. Field ID PHẢI là UUID v4 format (không phải `20260122-...`)
2. Version KHÔNG dùng `@WorkspaceIsNullable` - luôn có giá trị
3. Type là `number` (non-nullable), không phải `number | null`
4. `defaultValue: 1` đảm bảo existing records sẽ có version = 1

---

### Phase 2: Constants & DTOs (Day 1)

```
┌─────────────────────────────────────────────────────────────┐
│                PHASE 2: CONSTANTS & DTOs                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 2.1: Create Editable Fields Config                   │
│  └─ constants/editable-fields.constant.ts                  │
│     ⚠️ Verify against entity and update input              │
│                                                             │
│  Step 2.2: Create Order-Specific DTOs                      │
│  └─ dto/order-optimistic-locking.dto.ts                    │
│                                                             │
│  Step 2.3: Update Index Exports                            │
│  └─ constants/index.ts, dto/index.ts                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:

| Task | File | Action | Est. |
|------|------|--------|------|
| 2.1 | `constants/editable-fields.constant.ts` | **CREATE** - Define editable fields | 10 min |
| 2.2 | `dto/order-optimistic-locking.dto.ts` | **CREATE** - Extend base DTOs | 15 min |
| 2.3 | `constants/index.ts` | Update exports | 5 min |
| 2.4 | `dto/index.ts` | Update exports | 5 min |

**Key Decision - Editable Fields:**

```typescript
/**
 * Danh sách fields có thể edit qua optimistic locking
 *
 * ⚠️ VERIFIED against MktOrderWorkspaceEntity và actual business requirements:
 * - KHÔNG bao gồm computed fields (totalAmount, paidAmount, remainingAmount)
 * - KHÔNG bao gồm status fields (được quản lý bởi state machine)
 * - KHÔNG bao gồm system fields (createdAt, updatedAt, searchVector)
 * - KHÔNG bao gồm relation IDs (được quản lý bởi specific mutations)
 */
export const EDITABLE_ORDER_FIELDS = [
  // Basic editable fields
  'name',
  'note',
  'currency',

  // Discount fields (manual adjustments)
  'discount',
  'discountPercent',

  // Contract requirement
  'requireContract',

  // Customer assignment (có thể thay đổi customer của order)
  'mktCustomerId',

  // Contract assignment
  'mktContractId',

  // Promotion (coupon code)
  'couponCode',

  // Payment deadline (for new payment flow)
  'paymentDeadline',
  'paymentDeadlineSource',

  // Metadata (arbitrary JSON)
  'metadata',
] as const;

/**
 * Required fields cho conflict resolution payload
 * ⚠️ MUST include id, version, updatedAt
 */
export const ORDER_SELECT_FIELDS_FOR_CONFLICT = [
  'id',
  'version',
  'updatedAt',
  // Include editable fields for conflict UI
  ...EDITABLE_ORDER_FIELDS,
] as const;

export type EditableOrderField = typeof EDITABLE_ORDER_FIELDS[number];
```

---

### Phase 3: Service Implementation (Day 1-2)

```
┌─────────────────────────────────────────────────────────────┐
│                 PHASE 3: SERVICE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 3.1: Create Order Concurrency Service                │
│  └─ services/core/order-concurrency.service.ts             │
│     - Extend BaseOptimisticLockingService                  │
│     - Use MKT_ORDER_ENTITY_NAME constant                   │
│     - Configure selectFields with version + updatedAt      │
│                                                             │
│  Step 3.2: Update Service Exports                          │
│  └─ services/core/index.ts                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:

| Task | File | Action | Est. |
|------|------|--------|------|
| 3.1 | `services/core/order-concurrency.service.ts` | **CREATE** - Extend base service | 20 min |
| 3.2 | `services/core/index.ts` | Add export | 5 min |

**Service Structure:**
```typescript
import { Injectable } from '@nestjs/common';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseOptimisticLockingService } from 'src/mkt-core/common/optimistic-locking';
import { MktOrderWorkspaceEntity, MKT_ORDER_ENTITY_NAME } from '../objects/mkt-order.workspace-entity';
import {
  EDITABLE_ORDER_FIELDS,
  ORDER_SELECT_FIELDS_FOR_CONFLICT
} from '../constants/editable-fields.constant';

/**
 * OrderConcurrencyService - Optimistic locking cho Order entity
 *
 * Sử dụng để:
 * - Update order fields với version checking
 * - Detect và resolve conflicts khi multiple users edit cùng lúc
 *
 * @see BaseOptimisticLockingService for implementation details
 */
@Injectable()
export class OrderConcurrencyService extends BaseOptimisticLockingService<MktOrderWorkspaceEntity> {
  constructor(twentyORMGlobalManager: TwentyORMGlobalManager) {
    super(twentyORMGlobalManager, {
      // ⚠️ Sử dụng constant thay vì string literal
      entityName: MKT_ORDER_ENTITY_NAME,
      editableFields: [...EDITABLE_ORDER_FIELDS],
      logContext: 'OrderConcurrency',
      // ⚠️ MUST include id, version, updatedAt cho conflict resolution
      selectFields: [...ORDER_SELECT_FIELDS_FOR_CONFLICT],
    });
  }
}
```

---

### Phase 4: Resolver Implementation (Day 2)

```
┌─────────────────────────────────────────────────────────────┐
│                 PHASE 4: GRAPHQL RESOLVER                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 4.1: Create Order Edit Resolver                      │
│  └─ resolvers/order-edit.resolver.ts                       │
│     - updateOrderWithVersion mutation                      │
│     - resolveOrderConflict mutation                        │
│     ⚠️ MUST use @UseGuards(WorkspaceAuthGuard)            │
│                                                             │
│  Step 4.2: Update Resolver Exports                         │
│  └─ resolvers/index.ts                                     │
│                                                             │
│  Step 4.3: Integration với existing flows (optional)       │
│  └─ Xem xét tích hợp vào existing update operations       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:

| Task | File | Action | Est. |
|------|------|--------|------|
| 4.1 | `resolvers/order-edit.resolver.ts` | **CREATE** - GraphQL mutations | 40 min |
| 4.2 | `resolvers/index.ts` | Add export | 5 min |
| 4.3 | Existing resolvers | Consider integration points | 15 min |

**Resolver Structure:**
```typescript
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

import { OrderConcurrencyService } from '../services/core/order-concurrency.service';
import {
  UpdateOrderWithVersionInputDto,
  UpdateOrderWithVersionOutputDto,
  ResolveOrderConflictInputDto,
} from '../dto/order-optimistic-locking.dto';

/**
 * OrderEditResolver - GraphQL mutations cho order editing với optimistic locking
 *
 * ⚠️ IMPORTANT:
 * - PHẢI dùng @UseGuards(WorkspaceAuthGuard) như các mutation khác
 * - Resolver này BỔ SUNG cho existing mutations, không thay thế
 * - Chỉ dùng cho editable fields (name, note, discount, etc.)
 * - Status changes vẫn qua updateOrderStatus mutation
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard)
export class OrderEditResolver {
  constructor(
    private readonly orderConcurrencyService: OrderConcurrencyService,
  ) {}

  /**
   * Update order fields với optimistic locking
   *
   * Use case: Multiple sales editing same order
   * - User A mở order, thấy version = 1
   * - User B mở order, thấy version = 1
   * - User A save → success, version = 2
   * - User B save với expectedVersion = 1 → CONFLICT
   *
   * @returns Success với newVersion hoặc Conflict với currentData
   */
  @Mutation(() => UpdateOrderWithVersionOutputDto, {
    description: 'Update order with optimistic locking - returns conflict info if version mismatch',
  })
  async updateOrderWithVersion(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: UpdateOrderWithVersionInputDto,
  ): Promise<UpdateOrderWithVersionOutputDto> {
    return this.orderConcurrencyService.updateWithOptimisticLock(
      workspace.id,
      input.orderId,
      input.expectedVersion,
      input.data,
    );
  }

  /**
   * Resolve conflict bằng cách force update (KEEP_MINE strategy)
   *
   * Use case: User quyết định giữ changes của mình sau khi thấy conflict
   * - Sử dụng currentVersion từ conflict response
   * - Force update với version mới nhất
   *
   * @returns Success với newVersion
   */
  @Mutation(() => UpdateOrderWithVersionOutputDto, {
    description: 'Force update order - use after reviewing conflict to keep your changes',
  })
  async resolveOrderConflict(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: ResolveOrderConflictInputDto,
  ): Promise<UpdateOrderWithVersionOutputDto> {
    return this.orderConcurrencyService.updateWithOptimisticLock(
      workspace.id,
      input.orderId,
      input.currentVersion, // Use latest version to force update
      input.data,
    );
  }
}
```

**GraphQL Schema:**
```graphql
type Mutation {
  """Update order with optimistic locking - returns conflict info if version mismatch"""
  updateOrderWithVersion(input: UpdateOrderWithVersionInput!): UpdateOrderWithVersionOutput!

  """Force update order - use after reviewing conflict to keep your changes"""
  resolveOrderConflict(input: ResolveOrderConflictInput!): UpdateOrderWithVersionOutput!
}
```

**Integration với Existing Flows:**

| Existing Flow | Integration Strategy |
|---------------|---------------------|
| `createOrderWithItems` | ❌ Không cần - order mới luôn version = 1 |
| `confirmOrder` | ⚠️ Có thể cần - nếu nhiều người confirm cùng lúc |
| `updateOrderStatus` | ⚠️ Xem xét - status changes có thể conflict |
| `refundOrder` | ⚠️ Xem xét - refund có thể conflict |
| Direct field updates | ✅ **Dùng resolver mới** |

---

### Phase 5: Module Registration (Day 2)

```
┌─────────────────────────────────────────────────────────────┐
│              PHASE 5: MODULE REGISTRATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 5.1: Update Order Module                             │
│  └─ mkt-order.module.ts                                    │
│     - Add OrderConcurrencyService to providers             │
│     - Add OrderEditResolver to providers                   │
│     - Export OrderConcurrencyService                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:

| Task | File | Action | Est. |
|------|------|--------|------|
| 5.1 | `mkt-order.module.ts` | Register service & resolver | 15 min |

---

### Phase 6: Testing & Verification (Day 2-3)

```
┌─────────────────────────────────────────────────────────────┐
│                PHASE 6: TESTING & QA                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 6.1: TypeScript Verification                         │
│  └─ npx nx typecheck twenty-server                         │
│                                                             │
│  Step 6.2: Lint Check                                      │
│  └─ npx nx lint twenty-server                              │
│                                                             │
│  Step 6.3: Unit Tests (REQUIRED - not optional)            │
│  └─ services/__tests__/order-concurrency.service.spec.ts   │
│     ⚠️ MUST include conflict & merge scenarios             │
│                                                             │
│  Step 6.4: Integration Test (Manual)                       │
│  └─ Test via GraphQL Playground                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tasks:

| Task | Command/File | Description | Est. |
|------|--------------|-------------|------|
| 6.1 | `npx nx typecheck twenty-server` | Verify TypeScript | 5 min |
| 6.2 | `npx nx lint twenty-server` | Check ESLint | 5 min |
| 6.3 | `services/__tests__/order-concurrency.service.spec.ts` | Unit tests **(REQUIRED)** | 2-3 hours |
| 6.4 | GraphQL Playground | Manual integration test | 30 min |

**⚠️ Required Test Scenarios:**

```typescript
describe('OrderConcurrencyService', () => {
  // Happy path tests
  describe('updateWithOptimisticLock - Success', () => {
    it('should update successfully with correct version', async () => {});
    it('should increment version after successful update', async () => {});
    it('should update multiple fields atomically', async () => {});
  });

  // Conflict detection tests (REQUIRED)
  describe('updateWithOptimisticLock - Conflict', () => {
    it('should detect conflict when version mismatch', async () => {});
    it('should return current data with conflict info', async () => {});
    it('should identify conflicting fields correctly', async () => {});
    it('should return currentVersion in conflict response', async () => {});
  });

  // Merge/Resolution tests (REQUIRED)
  describe('resolveConflict', () => {
    it('should allow force update with current version', async () => {});
    it('should succeed when using version from conflict response', async () => {});
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('should reject invalid expectedVersion (< 1)', async () => {});
    it('should reject non-integer expectedVersion', async () => {});
    it('should return error for non-existent order', async () => {});
    it('should only detect conflicts for editable fields', async () => {});
  });

  // Concurrent updates simulation
  describe('Concurrent Updates', () => {
    it('should handle concurrent updates correctly', async () => {
      // Simulate: User A and User B both try to update same order
    });
  });
});
```

**Integration Test Script:**
```graphql
# Test 1: Happy path - update with correct version
mutation UpdateOrder {
  updateOrderWithVersion(input: {
    orderId: "order-uuid"
    expectedVersion: 1
    data: { name: "Updated Order Name", note: "Test note" }
  }) {
    success
    newVersion
    error
    conflict { currentVersion conflicts { field yourValue currentValue } }
  }
}

# Test 2: Conflict detection - use wrong version
mutation UpdateOrderConflict {
  updateOrderWithVersion(input: {
    orderId: "order-uuid"
    expectedVersion: 1  # Use old version after someone else updated
    data: { name: "Another Update" }
  }) {
    success
    newVersion
    error
    conflict {
      currentVersion
      conflicts { field yourValue currentValue }
      modifiedAt
    }
    currentData  # Full entity for conflict resolution UI
  }
}

# Test 3: Resolve conflict - force update
mutation ResolveConflict {
  resolveOrderConflict(input: {
    orderId: "order-uuid"
    currentVersion: 2  # Version from conflict response
    data: { name: "My Final Update" }
  }) {
    success
    newVersion
    error
  }
}

# Test 4: Invalid version
mutation InvalidVersion {
  updateOrderWithVersion(input: {
    orderId: "order-uuid"
    expectedVersion: 0  # Invalid - must be >= 1
    data: { name: "Should fail" }
  }) {
    success
    error
  }
}
```

---

## File Changes Summary

### New Files (5 files)

| File | Description | Est. LOC |
|------|-------------|----------|
| `constants/editable-fields.constant.ts` | Editable fields config với selectFields | ~30 |
| `dto/order-optimistic-locking.dto.ts` | Order-specific DTOs | ~50 |
| `services/core/order-concurrency.service.ts` | Concurrency service | ~35 |
| `resolvers/order-edit.resolver.ts` | GraphQL resolver | ~100 |
| `services/__tests__/order-concurrency.service.spec.ts` | Unit tests **(REQUIRED)** | ~200 |

### Modified Files (5 files)

| File | Change Description |
|------|-------------------|
| `constants/mkt-field-ids.ts` | Add version field ID (UUID v4 format) |
| `objects/mkt-order.workspace-entity.ts` | Add version field (NON-NULL) |
| `constants/index.ts` | Export editable fields |
| `dto/index.ts` | Export DTOs |
| `services/core/index.ts` | Export service |
| `resolvers/index.ts` | Export resolver |
| `mkt-order.module.ts` | Register providers |

---

## Risk Assessment

### Low Risk Items
- Adding version field (additive change)
- Creating new service/resolver files
- Export additions

### Medium Risk Items
- Module registration (could affect DI if incorrect)
- Metadata sync (could fail if field ID format wrong)

### ⚠️ High Risk Items (from review)
- **Version field nullable** - Nếu dùng `@WorkspaceIsNullable`, sẽ gây lỗi khi conflict detection
- **Missing selectFields** - Conflict resolution sẽ fail nếu thiếu version/updatedAt
- **Missing guards** - Security vulnerability nếu không dùng WorkspaceAuthGuard
- **Missing tests** - Regression risk nếu không có conflict/merge tests

### Mitigation
- Run typecheck after each phase
- Verify database after metadata sync (check NOT NULL constraint)
- Test in dev environment first
- **MUST run full test suite including conflict scenarios**

---

## Dependencies

### Required (Already Available)
- [x] Common module `mkt-core/common/optimistic-locking`
- [x] TwentyORMGlobalManager
- [x] DateTimeUtils
- [x] lodash.isequal
- [x] MKT_ORDER_ENTITY_NAME constant
- [x] WorkspaceAuthGuard

### No New Dependencies Needed
- No new npm packages
- No Redis changes
- No infrastructure changes

---

## Timeline Summary

| Phase | Description | Duration | Cumulative |
|-------|-------------|----------|------------|
| 1 | Entity & Database | 0.5 day | 0.5 day |
| 2 | Constants & DTOs | 0.5 day | 1 day |
| 3 | Service Implementation | 0.5 day | 1.5 days |
| 4 | Resolver Implementation | 0.5 day | 2 days |
| 5 | Module Registration | 0.25 day | 2.25 days |
| 6 | Testing & QA **(REQUIRED)** | 1 day | **3-3.5 days** |

**Total Estimated Effort: 3-3.5 days**

> ⚠️ Testing phase extended due to required conflict/merge test scenarios

---

## Next Steps After Implementation

1. **Frontend Integration**: Implement React hooks and Conflict Dialog UI
2. **Documentation**: Update API documentation
3. **Monitoring**: Add logging for conflict rate metrics
4. **Extend**: Apply same pattern to License, Invoice modules
5. **Integration**: Consider adding optimistic locking to existing update flows

---

## Quick Reference - Commands

```bash
# Phase 1: Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f

# Phase 6: Verification
npx nx typecheck twenty-server
npx nx lint twenty-server
npx nx test twenty-server

# Development
npx nx start twenty-server

# Generate UUID v4 for field ID
uuidgen  # On Linux/Mac
# Or use: https://www.uuidgenerator.net/
```

---

## Checklist

### Pre-Implementation
- [x] Read implementation guide
- [x] Understand database structure
- [x] Verify common module exists
- [x] Create this roadmap
- [x] **Review và update roadmap based on feedback**

### Implementation
- [ ] Phase 1: Entity & Database
  - [ ] Verify UUID v4 format for field ID
  - [ ] Verify version is NON-NULL (no @WorkspaceIsNullable)
  - [ ] Verify database column has NOT NULL constraint
- [ ] Phase 2: Constants & DTOs
  - [ ] Verify EDITABLE_ORDER_FIELDS matches entity
  - [ ] Verify selectFields includes id, version, updatedAt
- [ ] Phase 3: Service Implementation
  - [ ] Verify using MKT_ORDER_ENTITY_NAME constant
- [ ] Phase 4: Resolver Implementation
  - [ ] Verify @UseGuards(WorkspaceAuthGuard) is applied
- [ ] Phase 5: Module Registration
- [ ] Phase 6: Testing & Verification
  - [ ] **Conflict detection tests**
  - [ ] **Merge/Resolution tests**
  - [ ] Edge case tests

### Post-Implementation
- [ ] Update `optimistic-locking-implementation.md` with any changes
- [ ] Test in staging environment
- [ ] Plan frontend integration
- [ ] Consider integration với existing update flows
