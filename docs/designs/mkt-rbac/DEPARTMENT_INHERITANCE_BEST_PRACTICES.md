# Department Inheritance - Best Practices

## Vấn Đề

Khi khai báo `allowedDepartments: ['TECH']`, user ở team con `TECH_BACKEND` không được phép vì guard chưa implement ancestor lookup.

## Giải Pháp

### Option 1: Implement Ancestor Lookup (Recommended)

Sửa `extractAncestorCodes()` để query từ `mktDepartmentAncestry` table.

```typescript
// department-authorization.guard.ts

/**
 * Extract ancestor department codes từ userContext
 * Query từ mktDepartmentAncestry để lấy tất cả ancestor codes
 */
private async extractAncestorCodes(
  workspaceId: string,
  departmentId: string | null,
): Promise<string[]> {
  if (!departmentId) {
    return [];
  }

  // Query từ mktDepartmentAncestry
  const ancestries = await this.departmentAncestryRepository.find({
    where: {
      departmentId,
      deletedAt: IsNull(),
    },
    relations: ['ancestor'],
  });

  return ancestries
    .map((a) => a.ancestor?.departmentCode)
    .filter((code): code is string => !!code);
}
```

**Kết quả sau khi implement:**
- `allowedDepartments: ['TECH']`
- User ở `TECH_BACKEND` có `ancestorCodes = ['TECH']`
- Ancestor check: `'TECH' in ['TECH']` → ✅ Allowed

---

### Option 2: Khai Báo Explicit Teams

Liệt kê tất cả teams trong `allowedDepartments`:

```typescript
// order-authorization.constants.ts

CREATE_ORDER: {
  allowedDepartments: [
    DEPARTMENT.TECH,
    TEAM.TECH_BACKEND,
    TEAM.TECH_FRONTEND,
    TEAM.TECH_DEVOPS,
    TEAM.TECH_QA,
    TEAM.TECH_DATA,
  ],
  // ...
}
```

**Nhược điểm:**
- Verbose, khó maintain
- Phải update mỗi khi thêm team mới

---

### Option 3: Sử Dụng Department Groups

Sử dụng `DEPARTMENT_CODE_GROUP` từ constants:

```typescript
// mkt-department.constant.ts
export const DEPARTMENT_CODE_GROUP = {
  TECHNICAL: [
    DepartmentCode.TECH,
    DepartmentCode.IT,
    DepartmentCode.ENGINEERING,
    DepartmentCode.QA,
  ],
  // ...
};

// Mở rộng thêm teams
export const DEPARTMENT_WITH_TEAMS = {
  TECH: [
    DepartmentCode.TECH,
    TEAM.TECH_BACKEND,
    TEAM.TECH_FRONTEND,
    TEAM.TECH_DEVOPS,
    TEAM.TECH_QA,
    TEAM.TECH_DATA,
  ],
  // ...
};

// Usage
CREATE_ORDER: {
  allowedDepartments: DEPARTMENT_WITH_TEAMS.TECH,
  // ...
}
```

---

### Option 4: Wildcard Pattern Matching

Thêm support cho wildcard trong guard:

```typescript
// Khai báo
allowedDepartments: ['TECH*']  // Match: TECH, TECH_BACKEND, TECH_FRONTEND, ...

// Implement trong guard
private matchesDepartment(
  userDepartmentCode: string,
  allowedDepartments: string[],
): boolean {
  return allowedDepartments.some((pattern) => {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return userDepartmentCode.startsWith(prefix);
    }
    return userDepartmentCode === pattern;
  });
}
```

---

## Recommendation: Hybrid Approach

### 1. Short-term: Khai báo explicit với helper

```typescript
// helpers/department-auth.helper.ts

import { DEPARTMENT, TEAM } from 'src/mkt-core/mkt-department/constants';

/**
 * Get department with all child teams
 */
export const withChildTeams = (departmentCode: string): string[] => {
  const mapping: Record<string, string[]> = {
    [DEPARTMENT.TECH]: [
      DEPARTMENT.TECH,
      TEAM.TECH_BACKEND,
      TEAM.TECH_FRONTEND,
      TEAM.TECH_DEVOPS,
      TEAM.TECH_QA,
      TEAM.TECH_DATA,
    ],
    [DEPARTMENT.SALES]: [
      DEPARTMENT.SALES,
      TEAM.SALES_DOMESTIC,
      TEAM.SALES_INTERNATIONAL,
      TEAM.SALES_PARTNER,
      TEAM.SALES_ONLINE,
    ],
    [DEPARTMENT.ACCOUNTING]: [
      DEPARTMENT.ACCOUNTING,
      TEAM.ACCOUNTING_PAYABLE,
      TEAM.ACCOUNTING_RECEIVABLE,
      TEAM.ACCOUNTING_AUDIT,
      TEAM.ACCOUNTING_TAX,
    ],
    // ... more mappings
  };

  return mapping[departmentCode] ?? [departmentCode];
};

// Usage
CREATE_ORDER: {
  allowedDepartments: [
    ...withChildTeams(DEPARTMENT.SALES),
    ...withChildTeams(DEPARTMENT.TECH),
  ],
}
```

### 2. Long-term: Implement proper ancestor lookup

```typescript
// RbacContextService.resolveContext()
// Thêm departmentAncestorCodes vào RBACUserContext

type RBACUserContext = {
  // ... existing fields
  departmentCode: string | null;
  departmentAncestorCodes: string[]; // ← Populate từ mktDepartmentAncestry
};
```

---

## Trường Hợp Đặc Biệt

### Case 1: Chỉ cho phép team cụ thể (không phải toàn bộ department)

```typescript
// Chỉ TECH_BACKEND và TECH_DEVOPS được phép, không phải tất cả TECH
CREATE_ORDER: {
  allowedDepartments: [TEAM.TECH_BACKEND, TEAM.TECH_DEVOPS],
  // User ở TECH (parent) sẽ KHÔNG được phép
  // User ở TECH_FRONTEND sẽ KHÔNG được phép
}
```

### Case 2: Department + một số teams từ department khác

```typescript
// SALES + chỉ TECH_BACKEND (không phải tất cả TECH)
CREATE_ORDER: {
  allowedDepartments: [
    ...withChildTeams(DEPARTMENT.SALES),  // All SALES teams
    TEAM.TECH_BACKEND,                     // Only TECH_BACKEND
  ],
}
```

### Case 3: Exclude specific teams

```typescript
// Helper để exclude teams
export const withChildTeamsExcept = (
  departmentCode: string,
  excludeTeams: string[],
): string[] => {
  const allTeams = withChildTeams(departmentCode);
  return allTeams.filter((team) => !excludeTeams.includes(team));
};

// SALES nhưng không cho SALES_INTERNATIONAL
CREATE_ORDER: {
  allowedDepartments: withChildTeamsExcept(
    DEPARTMENT.SALES,
    [TEAM.SALES_INTERNATIONAL],
  ),
}
```

---

## Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Tạo `withChildTeams()` helper | Low | High |
| 2 | Update `ORDER_AUTHORIZATION` constants | Low | High |
| 3 | Implement `extractAncestorCodes()` trong guard | Medium | High |
| 4 | Add wildcard pattern support | Medium | Medium |
| 5 | Dynamic rules từ database | High | High |

---

## Database Query Reference

Query để lấy ancestor codes cho một department:

```sql
-- Get ancestors of TECH_BACKEND
SELECT
  a."departmentCode" as ancestor_code,
  da.distance
FROM "mktDepartmentAncestry" da
JOIN "mktDepartment" a ON da."ancestorId" = a.id
JOIN "mktDepartment" d ON da."departmentId" = d.id
WHERE d."departmentCode" = 'TECH_BACKEND'
  AND da."deletedAt" IS NULL
ORDER BY da.distance;

-- Result: ancestor_code = 'TECH', distance = 1
```
