# Sales Order Hierarchy Access Policy

## Tổng quan

Policy này quy định quyền truy cập đơn hàng (mktOrder) cho phòng Sales dựa trên:
1. **Ownership** - Người tạo đơn hàng
2. **Hierarchy** - Cấp bậc trong tổ chức
3. **Reporting Chain** - Chuỗi báo cáo trực tiếp

## Yêu cầu nghiệp vụ

| Vai trò | Quyền truy cập |
|---------|----------------|
| Nhân viên Sale (Staff) | Chỉ xem đơn hàng **do mình tạo** |
| Quản lý trực tiếp (Direct Manager) | Xem đơn hàng của **nhân viên cấp dưới trực tiếp** |
| Quản lý cấp trên (Upper Management) | Xem đơn hàng của **toàn bộ chuỗi báo cáo dưới quyền** |
| Quản lý ngang hàng (Peer Manager) | **KHÔNG** xem được đơn hàng của team khác |

## Cấu trúc Organization Level

```
┌─────────────────────────────────────────────────────────────────┐
│ Level 1: CEO                    → Xem tất cả đơn hàng           │
├─────────────────────────────────────────────────────────────────┤
│ Level 2: C_LEVEL               → Xem đơn hàng thuộc division    │
├─────────────────────────────────────────────────────────────────┤
│ Level 3: VP                    → Xem đơn hàng thuộc department  │
├─────────────────────────────────────────────────────────────────┤
│ Level 4: SENIOR_DIRECTOR       → Xem đơn hàng thuộc sub-dept    │
├─────────────────────────────────────────────────────────────────┤
│ Level 5: DIRECTOR              → Xem đơn hàng thuộc team        │
├─────────────────────────────────────────────────────────────────┤
│ Level 6: SENIOR_MANAGER        → Xem đơn hàng của managers      │
├─────────────────────────────────────────────────────────────────┤
│ Level 7: MANAGER ─────────┬────→ Xem đơn hàng của subordinates  │
│                           │                                     │
│ Level 7: MANAGER (peer) ──┴────→ KHÔNG xem được đơn hàng        │
├─────────────────────────────────────────────────────────────────┤
│ Level 8-11: STAFF              → Chỉ xem đơn hàng do mình tạo   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### mktOrder Table
```sql
mktOrder {
  id: UUID (PK)
  createdById: UUID (FK → workspaceMember.id)  -- Người tạo đơn hàng
  accountOwnerId: UUID (FK → workspaceMember.id) -- Chủ sở hữu khách hàng
  ...
}
```

### workspaceMember Table
```sql
workspaceMember {
  id: UUID (PK)
  departmentId: UUID (FK → mktDepartment.id)
  organizationLevelId: UUID (FK → mktOrganizationLevel.id)
  ...
}
```

### mktOrganizationLevel Table
```sql
mktOrganizationLevel {
  id: UUID (PK)
  levelCode: TEXT
  hierarchyLevel: DOUBLE  -- 1 (CEO) → 11 (Intern)
  parentLevelId: TEXT
  ...
}
```

## Filter Conditions Schema

```json
{
  "hierarchicalAccess": {
    "enabled": true,
    "ownershipField": "createdById",
    "rules": [
      {
        "name": "STAFF_SELF_ONLY",
        "description": "Nhân viên chỉ xem đơn hàng do mình tạo",
        "minHierarchyLevel": 8,
        "maxHierarchyLevel": 11,
        "accessScope": "SELF",
        "condition": "createdById = currentUserId"
      },
      {
        "name": "MANAGER_SUBORDINATES",
        "description": "Quản lý xem đơn hàng của cấp dưới trực tiếp",
        "minHierarchyLevel": 7,
        "maxHierarchyLevel": 7,
        "accessScope": "DIRECT_SUBORDINATES",
        "condition": "createdById IN (SELECT id FROM subordinates WHERE managerId = currentUserId)"
      },
      {
        "name": "UPPER_MANAGEMENT_CHAIN",
        "description": "Cấp trên xem toàn bộ chuỗi báo cáo",
        "minHierarchyLevel": 1,
        "maxHierarchyLevel": 6,
        "accessScope": "REPORTING_CHAIN",
        "condition": "createdById IN (SELECT id FROM getReportingChain(currentUserId))"
      }
    ],
    "peerRestriction": {
      "enabled": true,
      "description": "Quản lý ngang hàng không xem được đơn hàng của nhau",
      "blockPeerAccess": true,
      "peerDefinition": "SAME_HIERARCHY_LEVEL_SAME_PARENT"
    }
  },
  "departmentScope": {
    "enabled": true,
    "allowedDepartments": ["SALES", "SALES_DOMESTIC", "SALES_INTERNATIONAL", "SALES_ONLINE", "SALES_PARTNER"],
    "crossDepartmentAccess": false
  },
  "status": {
    "deniedValues": ["deleted", "void"]
  }
}
```

## Access Decision Matrix

### Ví dụ minh họa

Giả sử cấu trúc tổ chức Sales:

```
                    ┌─────────────────┐
                    │   CEO (L1)      │
                    │   Jony Ive      │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │ Sales Director  │
                    │   (L5)          │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────┴────────┐ ┌───┴───┐ ┌────────┴────────┐
     │ Manager A (L7)  │ │       │ │ Manager B (L7)  │
     │ Team Domestic   │ │       │ │ Team Online     │
     └────────┬────────┘ │       │ └────────┬────────┘
              │          │       │          │
     ┌────────┼────────┐ │       │ ┌────────┼────────┐
     │        │        │ │       │ │        │        │
   Staff1  Staff2   Staff3       Staff4  Staff5   Staff6
   (L9)    (L9)     (L9)         (L9)    (L9)     (L9)
```

### Access Matrix

| Viewer | Staff1's Order | Staff2's Order | Staff4's Order | Staff5's Order |
|--------|---------------|----------------|----------------|----------------|
| **Staff1 (L9)** | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| **Staff2 (L9)** | ❌ NO | ✅ YES | ❌ NO | ❌ NO |
| **Staff4 (L9)** | ❌ NO | ❌ NO | ✅ YES | ❌ NO |
| **Manager A (L7)** | ✅ YES | ✅ YES | ❌ NO | ❌ NO |
| **Manager B (L7)** | ❌ NO | ❌ NO | ✅ YES | ✅ YES |
| **Sales Director (L5)** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| **CEO (L1)** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |

### Giải thích quyết định

1. **Staff1 xem Order của Staff2**: ❌ DENIED
   - Lý do: Staff1 không phải người tạo Order này
   - Rule: `STAFF_SELF_ONLY`

2. **Manager A xem Order của Staff4**: ❌ DENIED
   - Lý do: Staff4 không thuộc team của Manager A (peer restriction)
   - Rule: `peerRestriction.blockPeerAccess = true`

3. **Manager A xem Order của Staff1**: ✅ ALLOWED
   - Lý do: Staff1 là cấp dưới trực tiếp của Manager A
   - Rule: `MANAGER_SUBORDINATES`

4. **Sales Director xem tất cả Orders**: ✅ ALLOWED
   - Lý do: Tất cả staff đều nằm trong reporting chain
   - Rule: `UPPER_MANAGEMENT_CHAIN`

## Implementation Plan

### Phase 1: Update Data Access Policy

```sql
-- Update existing SALES_ORDER_OWNERSHIP policy với hierarchical rules
UPDATE workspace_xxx."mktDataAccessPolicy"
SET "filterConditions" = '{
  "hierarchicalAccess": {
    "enabled": true,
    "ownershipField": "createdById",
    "rules": [
      {
        "name": "STAFF_SELF_ONLY",
        "minHierarchyLevel": 8,
        "maxHierarchyLevel": 11,
        "accessScope": "SELF"
      },
      {
        "name": "MANAGER_SUBORDINATES",
        "minHierarchyLevel": 7,
        "maxHierarchyLevel": 7,
        "accessScope": "DIRECT_SUBORDINATES"
      },
      {
        "name": "UPPER_MANAGEMENT_CHAIN",
        "minHierarchyLevel": 1,
        "maxHierarchyLevel": 6,
        "accessScope": "REPORTING_CHAIN"
      }
    ],
    "peerRestriction": {
      "enabled": true,
      "blockPeerAccess": true
    }
  },
  "departmentScope": {
    "enabled": true,
    "allowedDepartments": ["SALES", "SALES_DOMESTIC", "SALES_INTERNATIONAL", "SALES_ONLINE", "SALES_PARTNER"]
  },
  "status": {
    "deniedValues": ["deleted", "void"]
  }
}'::jsonb
WHERE id = '032cbac7-458f-4c28-ac07-7c7184f415d7';
```

### Phase 2: Service Implementation

Cần implement trong `DataAccessPolicyEvaluator`:

```typescript
// Pseudo-code cho policy evaluation
async evaluateHierarchicalAccess(
  userId: string,
  targetOrderId: string,
  policy: DataAccessPolicy
): Promise<AccessDecision> {
  const user = await this.getUserWithHierarchy(userId);
  const order = await this.getOrder(targetOrderId);

  const rules = policy.filterConditions.hierarchicalAccess.rules;

  // Find applicable rule based on user's hierarchy level
  const applicableRule = rules.find(rule =>
    user.hierarchyLevel >= rule.minHierarchyLevel &&
    user.hierarchyLevel <= rule.maxHierarchyLevel
  );

  if (!applicableRule) {
    return { allowed: false, reason: 'No applicable rule found' };
  }

  switch (applicableRule.accessScope) {
    case 'SELF':
      return order.createdById === userId
        ? { allowed: true, rule: 'STAFF_SELF_ONLY' }
        : { allowed: false, reason: 'Not order creator' };

    case 'DIRECT_SUBORDINATES':
      const subordinates = await this.getDirectSubordinates(userId);
      const isSubordinate = subordinates.includes(order.createdById);
      const isPeerOrder = await this.isPeerManagerOrder(userId, order.createdById);

      if (isPeerOrder && policy.filterConditions.hierarchicalAccess.peerRestriction?.enabled) {
        return { allowed: false, reason: 'Peer manager restriction' };
      }

      return isSubordinate || order.createdById === userId
        ? { allowed: true, rule: 'MANAGER_SUBORDINATES' }
        : { allowed: false, reason: 'Not in direct reports' };

    case 'REPORTING_CHAIN':
      const reportingChain = await this.getFullReportingChain(userId);
      return reportingChain.includes(order.createdById)
        ? { allowed: true, rule: 'UPPER_MANAGEMENT_CHAIN' }
        : { allowed: false, reason: 'Not in reporting chain' };
  }
}
```

## Database IDs Reference

| Entity | ID | Value |
|--------|-----|-------|
| Department SALES | `ad95f81e-bda5-4a98-b72a-880c0b5c204c` | Nhân viên kinh doanh |
| Policy SALES_ORDER_OWNERSHIP | `032cbac7-458f-4c28-ac07-7c7184f415d7` | Sales Order Access Policy |
| Level MANAGER | `5e6f7a8b-9c0d-1e2f-3a4b-c5d6e7f8a9b0` | hierarchyLevel = 7 |
| Level SPECIALIST | `6f7a8b9c-0d1e-2f3a-4b5c-d6e7f8a9b0c1` | hierarchyLevel = 9 |

## Testing Scenarios

### Test Case 1: Staff views own order
```
Given: User = Staff1 (hierarchyLevel = 9)
       Order = Created by Staff1
When:  Staff1 tries to view the order
Then:  Access GRANTED (rule: STAFF_SELF_ONLY)
```

### Test Case 2: Staff views peer's order
```
Given: User = Staff1 (hierarchyLevel = 9)
       Order = Created by Staff2 (same manager)
When:  Staff1 tries to view the order
Then:  Access DENIED (reason: Not order creator)
```

### Test Case 3: Manager views subordinate's order
```
Given: User = Manager A (hierarchyLevel = 7)
       Order = Created by Staff1 (subordinate of Manager A)
When:  Manager A tries to view the order
Then:  Access GRANTED (rule: MANAGER_SUBORDINATES)
```

### Test Case 4: Manager views peer manager's team order
```
Given: User = Manager A (hierarchyLevel = 7)
       Order = Created by Staff4 (subordinate of Manager B)
When:  Manager A tries to view the order
Then:  Access DENIED (reason: Peer manager restriction)
```

### Test Case 5: Director views all orders
```
Given: User = Sales Director (hierarchyLevel = 5)
       Order = Created by any staff in Sales
When:  Sales Director tries to view the order
Then:  Access GRANTED (rule: UPPER_MANAGEMENT_CHAIN)
```

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | System | Initial design |
