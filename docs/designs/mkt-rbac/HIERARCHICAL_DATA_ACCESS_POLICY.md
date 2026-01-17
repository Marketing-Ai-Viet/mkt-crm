# Hierarchical Data Access Policy

## Tổng quan

Policy này quy định quyền truy cập dữ liệu cho **toàn bộ hệ thống CRM** dựa trên:
1. **Ownership** - Người tạo record
2. **Hierarchy** - Cấp bậc trong tổ chức
3. **Reporting Chain** - Chuỗi báo cáo trực tiếp
4. **Department** - Phòng ban người dùng thuộc về

## Phạm vi áp dụng

Policy này áp dụng cho tất cả các đối tượng dữ liệu có thuộc tính `createdById`:

| Resource | Áp dụng | Ghi chú |
|----------|---------|---------|
| mktOrder | ✅ | Đơn hàng |
| mktInvoice | ✅ | Hóa đơn |
| mktLicense | ✅ | License |
| mktCustomer | ✅ | Khách hàng |
| mktPayment | ✅ | Thanh toán |
| task | ✅ | Công việc |
| note | ✅ | Ghi chú |
| opportunity | ✅ | Cơ hội kinh doanh |

## Quy tắc truy cập theo cấp bậc

| Cấp bậc | Hierarchy Level | Quyền truy cập (Access Scope) |
|---------|-----------------|------------------------------|
| Executive (CEO, C-Level, VP) | 1-3 | **ALL** - Toàn bộ dữ liệu |
| Upper Management (Director, Senior Manager) | 4-6 | **REPORTING_CHAIN** - Dữ liệu trong chuỗi báo cáo |
| Manager | 7 | **DIRECT_SUBORDINATES** - Dữ liệu của cấp dưới trực tiếp |
| Staff (Specialist, Associate, Junior, Intern) | 8-11 | **SELF** - Chỉ dữ liệu do mình tạo |

## Cấu trúc Organization Level

```
┌─────────────────────────────────────────────────────────────────┐
│ Level 1: CEO                    → Xem tất cả dữ liệu (ALL)      │
├─────────────────────────────────────────────────────────────────┤
│ Level 2: C_LEVEL               → Xem tất cả dữ liệu (ALL)       │
├─────────────────────────────────────────────────────────────────┤
│ Level 3: VP                    → Xem tất cả dữ liệu (ALL)       │
├─────────────────────────────────────────────────────────────────┤
│ Level 4: SENIOR_DIRECTOR       → Xem chuỗi báo cáo              │
├─────────────────────────────────────────────────────────────────┤
│ Level 5: DIRECTOR              → Xem chuỗi báo cáo              │
├─────────────────────────────────────────────────────────────────┤
│ Level 6: SENIOR_MANAGER        → Xem chuỗi báo cáo              │
├─────────────────────────────────────────────────────────────────┤
│ Level 7: MANAGER ─────────┬────→ Xem dữ liệu cấp dưới trực tiếp │
│                           │                                     │
│ Level 7: MANAGER (peer) ──┴────→ KHÔNG xem được dữ liệu         │
├─────────────────────────────────────────────────────────────────┤
│ Level 8-11: STAFF              → Chỉ xem dữ liệu do mình tạo    │
└─────────────────────────────────────────────────────────────────┘
```

## Access Scope Constants

```typescript
const ACCESS_SCOPE = {
  /** User can only access their own records */
  SELF: 'SELF',
  /** User can access records of direct subordinates */
  DIRECT_SUBORDINATES: 'DIRECT_SUBORDINATES',
  /** User can access records of entire reporting chain */
  REPORTING_CHAIN: 'REPORTING_CHAIN',
  /** User can access all records in department */
  DEPARTMENT: 'DEPARTMENT',
  /** User can access all records */
  ALL: 'ALL',
} as const;
```

## Peer Restriction Rule

**Định nghĩa**: Các Manager cùng cấp (Level 7) dưới cùng một cấp trên **không được xem** dữ liệu của team nhau.

```typescript
const PEER_DEFINITION = {
  /** Same hierarchy level under same parent manager */
  SAME_HIERARCHY_LEVEL_SAME_PARENT: 'SAME_HIERARCHY_LEVEL_SAME_PARENT',
  /** Same hierarchy level regardless of parent */
  SAME_HIERARCHY_LEVEL: 'SAME_HIERARCHY_LEVEL',
  /** Same department but different manager */
  SAME_DEPARTMENT_DIFFERENT_MANAGER: 'SAME_DEPARTMENT_DIFFERENT_MANAGER',
} as const;
```

## Hierarchical Access Configuration Schema

```json
{
  "hierarchicalAccess": {
    "enabled": true,
    "ownershipField": "createdById",
    "rules": [
      {
        "name": "EXECUTIVE_FULL_ACCESS",
        "description": "Executive có quyền xem tất cả dữ liệu",
        "minHierarchyLevel": 1,
        "maxHierarchyLevel": 3,
        "accessScope": "ALL"
      },
      {
        "name": "UPPER_MGMT_REPORTING_CHAIN",
        "description": "Upper Management xem dữ liệu trong chuỗi báo cáo",
        "minHierarchyLevel": 4,
        "maxHierarchyLevel": 6,
        "accessScope": "REPORTING_CHAIN"
      },
      {
        "name": "MANAGER_DIRECT_SUBORDINATES",
        "description": "Manager xem dữ liệu của cấp dưới trực tiếp",
        "minHierarchyLevel": 7,
        "maxHierarchyLevel": 7,
        "accessScope": "DIRECT_SUBORDINATES"
      },
      {
        "name": "STAFF_SELF_ONLY",
        "description": "Staff chỉ xem dữ liệu do mình tạo",
        "minHierarchyLevel": 8,
        "maxHierarchyLevel": 11,
        "accessScope": "SELF"
      }
    ],
    "peerRestriction": {
      "enabled": true,
      "description": "Quản lý ngang hàng không xem được dữ liệu của team nhau",
      "blockPeerAccess": true,
      "peerDefinition": "SAME_HIERARCHY_LEVEL_SAME_PARENT"
    }
  }
}
```

## Data Model

### Record với ownership tracking
```sql
-- Tất cả các bảng có hỗ trợ hierarchical access
{table_name} {
  id: UUID (PK)
  createdById: UUID (FK → workspaceMember.id)  -- Người tạo record
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

## Access Decision Matrix

### Ví dụ minh họa

Giả sử cấu trúc tổ chức:

```
                    ┌─────────────────┐
                    │   CEO (L1)      │
                    │   Jony Ive      │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   Director      │
                    │    (L5)         │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────┴────────┐           ┌────────┴────────┐
     │ Manager A (L7)  │           │ Manager B (L7)  │
     │   Team Alpha    │           │   Team Beta     │
     └────────┬────────┘           └────────┬────────┘
              │                             │
     ┌────────┼────────┐           ┌────────┼────────┐
     │        │        │           │        │        │
   User1   User2   User3         User4   User5   User6
   (L9)    (L9)    (L9)          (L9)    (L9)    (L9)
```

### Access Matrix (cho bất kỳ resource nào)

| Viewer | User1's Data | User2's Data | User4's Data | User5's Data |
|--------|-------------|--------------|--------------|--------------|
| **User1 (L9)** | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| **User2 (L9)** | ❌ NO | ✅ YES | ❌ NO | ❌ NO |
| **User4 (L9)** | ❌ NO | ❌ NO | ✅ YES | ❌ NO |
| **Manager A (L7)** | ✅ YES | ✅ YES | ❌ NO | ❌ NO |
| **Manager B (L7)** | ❌ NO | ❌ NO | ✅ YES | ✅ YES |
| **Director (L5)** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| **CEO (L1)** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |

### Giải thích quyết định

1. **User1 xem Data của User2**: ❌ DENIED
   - Lý do: User1 không phải người tạo data này
   - Rule: `STAFF_SELF_ONLY` (accessScope = SELF)

2. **Manager A xem Data của User4**: ❌ DENIED
   - Lý do: User4 không thuộc team của Manager A (peer restriction)
   - Rule: `peerRestriction.blockPeerAccess = true`

3. **Manager A xem Data của User1**: ✅ ALLOWED
   - Lý do: User1 là cấp dưới trực tiếp của Manager A
   - Rule: `MANAGER_DIRECT_SUBORDINATES` (accessScope = DIRECT_SUBORDINATES)

4. **Director xem tất cả Data**: ✅ ALLOWED
   - Lý do: Tất cả users đều nằm trong reporting chain
   - Rule: `UPPER_MGMT_REPORTING_CHAIN` (accessScope = REPORTING_CHAIN)

5. **CEO xem tất cả Data**: ✅ ALLOWED
   - Lý do: CEO có quyền truy cập toàn bộ hệ thống
   - Rule: `EXECUTIVE_FULL_ACCESS` (accessScope = ALL)

## Service Implementation

### HierarchicalAccessEvaluatorService

```typescript
@Injectable()
export class HierarchicalAccessEvaluatorService {
  /**
   * Evaluate hierarchical access for a target record
   */
  evaluateAccess(
    config: HierarchicalAccessConfig,
    context: HierarchicalAccessContext,
    target: TargetRecordInfo,
  ): HierarchicalAccessResult {
    // 1. Check if hierarchical access is enabled
    // 2. Validate context
    // 3. Find applicable rule based on hierarchy level
    // 4. Evaluate access scope (SELF, DIRECT_SUBORDINATES, REPORTING_CHAIN, ALL)
    // 5. Check peer restriction if enabled
    // 6. Return access decision
  }

  /**
   * Filter records based on hierarchical access
   */
  filterAccessibleRecords<T extends { id: string; createdById?: string }>(
    config: HierarchicalAccessConfig,
    context: HierarchicalAccessContext,
    records: T[],
  ): T[] {
    // Return only records the user can access
  }
}
```

### Types

```typescript
type HierarchicalAccessContext = {
  currentUserId: string;
  currentHierarchyLevel: HierarchyLevel;
  currentDepartmentId: string | null;
  currentDepartmentCode: string | null;
  currentManagerId: string | null;
  directSubordinateIds: string[];
  reportingChainIds: string[];
  peerManagerIds: string[];
  teamMemberIds: string[];
};

type HierarchicalAccessResult = {
  allowed: boolean;
  appliedRule?: string;
  grantedScope?: AccessScope;
  reason: string;
  peerRestrictionApplied?: boolean;
};
```

## Testing Scenarios

### Test Case 1: Staff views own record
```
Given: User = Staff (hierarchyLevel = 9)
       Record = Created by same Staff
When:  Staff tries to view the record
Then:  Access GRANTED (rule: STAFF_SELF_ONLY)
```

### Test Case 2: Staff views peer's record
```
Given: User = Staff1 (hierarchyLevel = 9)
       Record = Created by Staff2 (same manager)
When:  Staff1 tries to view the record
Then:  Access DENIED (reason: Not record creator)
```

### Test Case 3: Manager views subordinate's record
```
Given: User = Manager (hierarchyLevel = 7)
       Record = Created by subordinate of Manager
When:  Manager tries to view the record
Then:  Access GRANTED (rule: MANAGER_DIRECT_SUBORDINATES)
```

### Test Case 4: Manager views peer manager's team record
```
Given: User = Manager A (hierarchyLevel = 7)
       Record = Created by subordinate of Manager B
When:  Manager A tries to view the record
Then:  Access DENIED (reason: Peer manager restriction)
```

### Test Case 5: Director views all records in chain
```
Given: User = Director (hierarchyLevel = 5)
       Record = Created by any staff in reporting chain
When:  Director tries to view the record
Then:  Access GRANTED (rule: UPPER_MGMT_REPORTING_CHAIN)
```

### Test Case 6: CEO views any record
```
Given: User = CEO (hierarchyLevel = 1)
       Record = Created by anyone
When:  CEO tries to view the record
Then:  Access GRANTED (rule: EXECUTIVE_FULL_ACCESS)
```

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | System | Initial design cho Sales Order |
| 2.0 | 2026-01-15 | System | Generalize cho toàn bộ hệ thống |
