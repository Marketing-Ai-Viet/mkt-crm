# Department Authorization Check Flow

Tài liệu giải thích chi tiết các bước kiểm tra nghiệp vụ trong method `checkAuthorization` của `DepartmentAuthorizationGuard`.

## Tổng Quan

`checkAuthorization` sử dụng **Chain of Responsibility Pattern** để kiểm tra quyền truy cập theo thứ tự ưu tiên. Ngay khi một check trả về `allowed: true`, flow dừng lại và cho phép truy cập.

```
┌─────────────────────────────────────────────────────────────────┐
│                    checkAuthorization Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request → [Template Check] → [Executive Check] → [Manager Check]│
│                 ↓                    ↓                  ↓        │
│              allowed?             allowed?           allowed?    │
│                 │                    │                  │        │
│            ┌────┴────┐          ┌────┴────┐        ┌────┴────┐   │
│            │   Yes   │          │   Yes   │        │   Yes   │   │
│            └────┬────┘          └────┬────┘        └────┬────┘   │
│                 │                    │                  │        │
│                 ▼                    ▼                  ▼        │
│              ALLOW                ALLOW              ALLOW       │
│                                                                  │
│  → [Department Check] → DENY (nếu không match)                   │
│            ↓                                                     │
│         allowed?                                                 │
│            │                                                     │
│       ┌────┴────┐                                                │
│       │   Yes   │                                                │
│       └────┬────┘                                                │
│            ▼                                                     │
│          ALLOW                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Thứ Tự Kiểm Tra (Resolution Order)

| Priority | Check | Mô tả | Điều kiện bật |
|----------|-------|-------|---------------|
| 1 | User Override | Permission override cá nhân | TODO: chưa implement |
| 2 | High Priority Templates | Templates với priority >= threshold | `allowHighPriorityTemplates: true` |
| 3 | Executive Access | Cấp điều hành (CEO, C-Level, VP) | `allowExecutives: true` |
| 4 | Manager Access | Cấp quản lý | `allowManagers: true` |
| 5 | Department Membership | Thuộc department được phép | `allowedDepartments.length > 0` |

---

## Chi Tiết Từng Bước Kiểm Tra

### 1. High Priority Templates Check

**Method**: `checkHighPriorityTemplates()`

**Mục đích**: Kiểm tra user có được gán template với priority đủ cao không.

**Logic**:
```
IF allowHighPriorityTemplates = false HOẶC user không có templates
   → SKIP (return null)

IF có template với priority >= minTemplatePriority
   → ALLOW với checkedBy = 'template'

ELSE
   → SKIP (return null)
```

**Ví dụ**:
```typescript
// Options
{
  allowHighPriorityTemplates: true,
  minTemplatePriority: 500 // MANAGER level
}

// User có templates:
[
  { templateKey: 'SALES_ADMIN', priority: 800 },  // >= 500 → ALLOW
  { templateKey: 'BASIC_USER', priority: 100 }
]

// Result: ALLOW vì có template SALES_ADMIN với priority 800 >= 500
```

**Template Priority Levels** (từ `TEMPLATE_PRIORITY` constant):
| Level | Priority Value |
|-------|----------------|
| SYSTEM_ADMIN | 1000 |
| ADMIN | 900 |
| SUPER_MANAGER | 800 |
| SENIOR_MANAGER | 700 |
| DEPARTMENT_HEAD | 600 |
| MANAGER | 500 |
| TEAM_LEAD | 400 |
| SENIOR | 300 |
| STAFF | 200 |
| INTERN | 100 |

---

### 2. Executive Access Check

**Method**: `checkExecutiveAccess()`

**Mục đích**: Cho phép cấp điều hành (C-Level) bypass các restriction.

**Logic**:
```
IF allowExecutives = false
   → SKIP (return null)

IF user.hierarchyLevel <= 3 (CEO=1, C_LEVEL=2, VP=3)
   → ALLOW với checkedBy = 'executive'

ELSE
   → SKIP (return null)
```

**Hierarchy Level Reference**:
| Level | Value | Mô tả |
|-------|-------|-------|
| CEO | 1 | Tổng giám đốc |
| C_LEVEL | 2 | Giám đốc cấp cao (CFO, CTO, COO...) |
| VP | 3 | Phó giám đốc |
| DIRECTOR | 4 | Giám đốc bộ phận |
| SENIOR_MANAGER | 5 | Quản lý cấp cao |
| MANAGER | 7 | Quản lý |
| TEAM_LEAD | 9 | Trưởng nhóm |
| SENIOR | 11 | Nhân viên cao cấp |
| STAFF | 13 | Nhân viên |
| INTERN | 15 | Thực tập sinh |

**Ví dụ**:
```typescript
// User là VP (hierarchyLevel = 3)
// Options: { allowExecutives: true }

// Check: 3 <= 3 → true
// Result: ALLOW với reason = "User is executive"
```

---

### 3. Manager Access Check

**Method**: `checkManagerAccess()`

**Mục đích**: Cho phép cấp quản lý truy cập.

**Logic**:
```
IF allowManagers = false
   → SKIP (return null)

IF user.hierarchyLevel <= 7 (MANAGER level trở lên)
   → ALLOW với checkedBy = 'manager'

ELSE
   → SKIP (return null)
```

**Ví dụ**:
```typescript
// User là SENIOR_MANAGER (hierarchyLevel = 5)
// Options: { allowManagers: true }

// Check: 5 <= 7 → true
// Result: ALLOW với reason = "User is manager"
```

---

### 4. Department Access Check

**Method**: `checkDepartmentAccess()`

**Mục đích**: Kiểm tra user có thuộc department được phép không.

**Logic gồm 2 bước**:

#### 4.1 Direct Department Check

```
IF allowedDepartments rỗng
   → SKIP (return null)

IF user.departmentCode IN allowedDepartments
   → ALLOW với checkedBy = 'department'
```

**Ví dụ**:
```typescript
// User thuộc department 'SALES'
// Options: { allowedDepartments: ['SALES', 'MARKETING'] }

// Check: 'SALES' in ['SALES', 'MARKETING'] → true
// Result: ALLOW với reason = "User belongs to allowed department: SALES"
```

#### 4.2 Ancestor Department Check

Nếu direct check không match, kiểm tra user có thuộc department con của department được phép không.

```
IF có ancestor department IN allowedDepartments
   → ALLOW với checkedBy = 'department'

ELSE
   → SKIP (return null)
```

**Ví dụ**:
```typescript
// User thuộc department 'SALES_NORTH' (con của 'SALES')
// User.departmentAncestorCodes = ['SALES', 'BUSINESS']
// Options: { allowedDepartments: ['SALES'] }

// Direct check: 'SALES_NORTH' không có trong ['SALES'] → false
// Ancestor check: 'SALES' có trong ['SALES'] → true
// Result: ALLOW với reason = "User belongs to child of allowed department: SALES"
```

---

### 5. Denied Result

Nếu tất cả các check đều không trả về `allowed: true`, method trả về kết quả `DENIED`.

```typescript
{
  allowed: false,
  reason: 'User does not meet department authorization requirements',
  userDepartment: 'SALES_NORTH',
  userHierarchyLevel: 13
}
```

---

## Cấu Trúc DepartmentAuthResult

```typescript
type DepartmentAuthResult = {
  allowed: boolean;
  reason: string;
  userDepartment?: string;
  userHierarchyLevel: number;
  checkedBy?: 'template' | 'executive' | 'manager' | 'department';
  grantedByTemplate?: {
    templateKey: string;
    templateName: string;
    priority: number;
  };
}
```

---

## Ví Dụ Sử Dụng

### Resolver với @RequireDepartment

```typescript
@Resolver()
export class SalesReportResolver {

  // Chỉ SALES department và executives được xem báo cáo
  @RequireDepartment({
    allowedDepartments: ['SALES'],
    allowExecutives: true,
    allowManagers: false,
  })
  @Query(() => SalesReport)
  async getSalesReport(): Promise<SalesReport> {
    // ...
  }

  // Chỉ user với template có priority >= MANAGER (500)
  @RequireDepartment({
    allowHighPriorityTemplates: true,
    minTemplatePriority: TEMPLATE_PRIORITY.MANAGER,
    allowExecutives: false,
    allowManagers: false,
  })
  @Mutation(() => Boolean)
  async approveSalesOrder(): Promise<boolean> {
    // ...
  }
}
```

---

## Flow Diagram Chi Tiết

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         checkAuthorization()                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Input: DepartmentAuthContext + DepartmentAuthOptions                     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Step 1: checkHighPriorityTemplates()                                │ │
│  │                                                                     │ │
│  │  allowHighPriorityTemplates?─────┐                                  │ │
│  │         │                        │                                  │ │
│  │        Yes                      No                                  │ │
│  │         │                        │                                  │ │
│  │         ▼                        ▼                                  │ │
│  │  templates.length > 0?      return null ──────────────────────┐    │ │
│  │         │                                                     │    │ │
│  │        Yes                                                    │    │ │
│  │         │                                                     │    │ │
│  │         ▼                                                     │    │ │
│  │  template.priority >= minTemplatePriority?                    │    │ │
│  │         │                                                     │    │ │
│  │    ┌────┴────┐                                                │    │ │
│  │   Yes       No                                                │    │ │
│  │    │         │                                                │    │ │
│  │    ▼         ▼                                                │    │ │
│  │ ALLOW    return null ─────────────────────────────────────────┤    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Step 2: checkExecutiveAccess()                                      │ │
│  │                                                                     │ │
│  │  allowExecutives && hierarchyLevel <= 3?                            │ │
│  │         │                                                           │ │
│  │    ┌────┴────┐                                                      │ │
│  │   Yes       No                                                      │ │
│  │    │         │                                                      │ │
│  │    ▼         ▼                                                      │ │
│  │ ALLOW    return null ─────────────────────────────────────────┐    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Step 3: checkManagerAccess()                                        │ │
│  │                                                                     │ │
│  │  allowManagers && hierarchyLevel <= 7?                              │ │
│  │         │                                                           │ │
│  │    ┌────┴────┐                                                      │ │
│  │   Yes       No                                                      │ │
│  │    │         │                                                      │ │
│  │    ▼         ▼                                                      │ │
│  │ ALLOW    return null ─────────────────────────────────────────┐    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Step 4: checkDepartmentAccess()                                     │ │
│  │                                                                     │ │
│  │  allowedDepartments.length > 0?                                     │ │
│  │         │                                                           │ │
│  │        Yes                                                          │ │
│  │         │                                                           │ │
│  │         ▼                                                           │ │
│  │  departmentCode IN allowedDepartments?                              │ │
│  │         │                                                           │ │
│  │    ┌────┴────┐                                                      │ │
│  │   Yes       No                                                      │ │
│  │    │         │                                                      │ │
│  │    ▼         ▼                                                      │ │
│  │ ALLOW   ancestorCodes.any IN allowedDepartments?                    │ │
│  │              │                                                      │ │
│  │         ┌────┴────┐                                                 │ │
│  │        Yes       No                                                 │ │
│  │         │         │                                                 │ │
│  │         ▼         ▼                                                 │ │
│  │      ALLOW    return null ────────────────────────────────────┐    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Step 5: createDeniedResult()                                        │ │
│  │                                                                     │ │
│  │  Tất cả checks đều không match → DENY                               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Lưu Ý Quan Trọng

1. **Order matters**: Các check được thực hiện theo thứ tự ưu tiên. Template check có priority cao nhất (sau User Override).

2. **Early return**: Ngay khi một check trả về `allowed: true`, flow dừng lại. Điều này giúp tối ưu performance.

3. **Null vs Denied**:
   - `return null` = check không áp dụng, tiếp tục check tiếp theo
   - `return { allowed: false }` = check áp dụng nhưng bị từ chối

4. **Default values**:
   ```typescript
   {
     allowedDepartments: [],        // Không restrict theo department
     allowManagers: false,          // Không tự động allow managers
     allowExecutives: true,         // Tự động allow executives
     allowHighPriorityTemplates: true,  // Kiểm tra templates
     minTemplatePriority: 500       // MANAGER level
   }
   ```

5. **Ancestor check**: Hiện tại `extractAncestorCodes()` return empty array (TODO). Khi implement, sẽ cho phép user ở department con truy cập resource của department cha.
