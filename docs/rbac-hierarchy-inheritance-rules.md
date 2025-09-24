# RBAC Hierarchy Inheritance Rules Documentation

## 📋 Tổng quan

`getInheritanceRules` là một component quan trọng trong **Step 2: User Context Resolution** của hệ thống Enterprise RBAC. Nó trả về các quy tắc kế thừa quyền giữa các cấp bậc trong phòng ban, được sử dụng để validate permissions trong **Step 7: Hierarchy Validation**.

## 🎯 Mục đích chính

- **Định nghĩa quy tắc kế thừa quyền** giữa các cấp bậc tổ chức
- **Kiểm soát permission cascade** từ cấp cao xuống cấp thấp
- **Ngăn chặn privilege escalation** không được phép
- **Hỗ trợ Step 7 validation** với dữ liệu hierarchy chi tiết

## 📊 Cấu trúc dữ liệu

### HierarchyInheritance Type

```typescript
export type HierarchyInheritance = {
  sourceLevel: number;              // Cấp nguồn (cấp được kế thừa từ)
  targetLevel: number;              // Cấp đích (cấp sẽ kế thừa)
  inheritsPermissions: boolean;     // Có kế thừa quyền không
  inheritsParentPermissions: boolean; // Có kế thừa quyền từ cấp cha không
  permissions: {
    canViewTeamData: boolean;       // Có thể xem data team
    canEditTeamData: boolean;       // Có thể sửa data team
    canExportTeamData: boolean;     // Có thể export data team
  };
}
```

### Field Definitions

| Field | Type | Mô tả | Ví dụ |
|-------|------|-------|-------|
| `sourceLevel` | `number` | Cấp độ nguồn trong hierarchy (1=cao nhất) | `2` (Manager level) |
| `targetLevel` | `number` | Cấp độ đích sẽ kế thừa (luôn > sourceLevel) | `3` (Senior level) |
| `inheritsPermissions` | `boolean` | Có kế thừa quyền từ cấp nguồn | `true` |
| `inheritsParentPermissions` | `boolean` | Có kế thừa quyền từ tất cả cấp cha | `false` |
| `permissions.canViewTeamData` | `boolean` | Quyền xem dữ liệu team | `true` |
| `permissions.canEditTeamData` | `boolean` | Quyền chỉnh sửa dữ liệu team | `false` |
| `permissions.canExportTeamData` | `boolean` | Quyền export dữ liệu team | `false` |

## 🏗️ Database Source

### Bảng `mktDepartmentHierarchy`

```sql
-- Các field liên quan đến inheritance
hierarchyLevel              -- Cấp độ trong hierarchy
inheritsPermissions         -- Có kế thừa quyền không
inheritsParentPermissions   -- Có kế thừa quyền từ cấp cha không
canViewTeamData            -- Quyền xem data team
canEditTeamData            -- Quyền sửa data team
canExportTeamData          -- Quyền export data team
parentDepartmentId         -- Department cha
childDepartmentId          -- Department con
isActive                   -- Có đang hoạt động không
```

### Query Logic

```typescript
// Lấy hierarchy rules cho department
const hierarchyRules = await departmentHierarchyRepository.find({
  where: [
    { parentDepartmentId: departmentId, isActive: true },
    { childDepartmentId: departmentId, isActive: true },
  ],
  select: {
    hierarchyLevel: true,
    inheritsPermissions: true,
    inheritsParentPermissions: true,
    canViewTeamData: true,
    canEditTeamData: true,
    canExportTeamData: true,
  },
  order: { hierarchyLevel: 'ASC' },
});
```

## 💡 Ví dụ thực tế

### Scenario: IT Department Hierarchy

```
Level 1: CTO (Chief Technology Officer)
Level 2: Engineering Manager
Level 3: Senior Developer
Level 4: Junior Developer
Level 5: Intern
```

### Dữ liệu inheritance rules

```typescript
const inheritanceRules: HierarchyInheritance[] = [
  {
    sourceLevel: 1,                    // CTO
    targetLevel: 2,                    // Engineering Manager kế thừa từ CTO
    inheritsPermissions: true,         // Manager có quyền từ CTO
    inheritsParentPermissions: true,   // Manager có tất cả quyền cấp cha
    permissions: {
      canViewTeamData: true,          // Manager xem được data team
      canEditTeamData: true,          // Manager sửa được data team
      canExportTeamData: true,        // Manager export được data team
    }
  },
  {
    sourceLevel: 2,                    // Engineering Manager
    targetLevel: 3,                    // Senior Dev kế thừa từ Manager
    inheritsPermissions: true,
    inheritsParentPermissions: false,  // Senior KHÔNG có quyền CTO
    permissions: {
      canViewTeamData: true,          // Senior xem được data team
      canEditTeamData: true,          // Senior sửa được data team (limited)
      canExportTeamData: false,       // Senior KHÔNG export được
    }
  },
  {
    sourceLevel: 3,                    // Senior Developer
    targetLevel: 4,                    // Junior kế thừa từ Senior
    inheritsPermissions: true,
    inheritsParentPermissions: false,
    permissions: {
      canViewTeamData: true,          // Junior xem được data team
      canEditTeamData: false,         // Junior KHÔNG sửa được
      canExportTeamData: false,       // Junior KHÔNG export được
    }
  },
  {
    sourceLevel: 4,                    // Junior Developer
    targetLevel: 5,                    // Intern kế thừa từ Junior
    inheritsPermissions: false,        // Intern KHÔNG kế thừa quyền
    inheritsParentPermissions: false,
    permissions: {
      canViewTeamData: false,         // Intern KHÔNG xem được data team
      canEditTeamData: false,
      canExportTeamData: false,
    }
  }
];
```

## 🔧 Cách sử dụng

### 1. Kiểm tra quyền truy cập cơ bản

```typescript
function canUserAccessLevel(
  userLevel: number,
  targetLevel: number,
  inheritanceRules: HierarchyInheritance[]
): boolean {
  return inheritanceRules.some(rule =>
    rule.sourceLevel <= userLevel &&           // User level phù hợp
    rule.targetLevel >= targetLevel &&         // Target level được phép
    rule.inheritsPermissions                   // Có quyền kế thừa
  );
}

// Ví dụ: Engineering Manager (level 2) có thể truy cập Junior Dev (level 4)?
const canAccess = canUserAccessLevel(2, 4, inheritanceRules); // true
```

### 2. Kiểm tra quyền hành động cụ thể

```typescript
function canUserPerformAction(
  userLevel: number,
  targetLevel: number,
  action: 'view' | 'edit' | 'export',
  inheritanceRules: HierarchyInheritance[]
): boolean {
  const applicableRules = inheritanceRules.filter(rule =>
    rule.sourceLevel <= userLevel &&
    rule.targetLevel >= targetLevel &&
    rule.inheritsPermissions
  );

  return applicableRules.some(rule => {
    switch (action) {
      case 'view': return rule.permissions.canViewTeamData;
      case 'edit': return rule.permissions.canEditTeamData;
      case 'export': return rule.permissions.canExportTeamData;
      default: return false;
    }
  });
}

// Ví dụ: Senior Dev (level 3) có thể export data của Junior Dev (level 4)?
const canExport = canUserPerformAction(3, 4, 'export', inheritanceRules); // false
```

### 3. Tính toán quyền cascade (từ cấp cha)

```typescript
function getCascadePermissions(
  userLevel: number,
  inheritanceRules: HierarchyInheritance[]
): string[] {
  const permissions: string[] = [];

  // Tìm tất cả rules mà user có thể kế thừa từ cấp cha
  const cascadeRules = inheritanceRules.filter(rule =>
    rule.sourceLevel <= userLevel &&
    rule.inheritsParentPermissions
  );

  cascadeRules.forEach(rule => {
    if (rule.permissions.canViewTeamData) permissions.push('VIEW_TEAM_DATA');
    if (rule.permissions.canEditTeamData) permissions.push('EDIT_TEAM_DATA');
    if (rule.permissions.canExportTeamData) permissions.push('EXPORT_TEAM_DATA');
  });

  return [...new Set(permissions)]; // Remove duplicates
}

// Ví dụ: Engineering Manager (level 2) có những quyền cascade nào?
const cascadePerms = getCascadePermissions(2, inheritanceRules);
// Output: ['VIEW_TEAM_DATA', 'EDIT_TEAM_DATA', 'EXPORT_TEAM_DATA']
```

## 🎪 Tích hợp với Enterprise RBAC Steps

### Step 2: User Context Resolution
```typescript
// getInheritanceRules được gọi trong buildHierarchyContext
const hierarchyContext = {
  // ... other fields
  inheritanceRules: await this.getInheritanceRules(departmentId, workspaceId),
};
```

### Step 7: Hierarchy Validation
```typescript
// Sử dụng inheritanceRules để validate permissions
function validateHierarchyPermission(
  context: EnhancedPermissionContext
): StepValidationResult {
  const { userContext, hierarchyContext, action } = context;

  // Kiểm tra inheritance rules
  const hasPermission = hierarchyContext.inheritanceRules?.some(rule =>
    rule.sourceLevel <= userContext.organizationLevel &&
    rule.targetLevel >= context.targetLevel &&
    rule.permissions.canEditTeamData // Tùy theo action
  );

  return {
    result: hasPermission ? CheckResult.PASS : CheckResult.FAIL,
    reason: hasPermission ? 'Hierarchy permission granted' : 'Insufficient hierarchy permission',
    continue: hasPermission,
  };
}
```

## 🛡️ Security Considerations

### 1. Privilege Escalation Prevention
```typescript
// NGUY HIỂM: Không bao giờ cho phép targetLevel < sourceLevel
const invalidRule = {
  sourceLevel: 3,      // Senior Dev
  targetLevel: 1,      // CTO - NGUY HIỂM!
  inheritsPermissions: true,  // Junior có thể có quyền CTO
};

// AN TOÀN: Luôn kiểm tra rule validity
function isValidInheritanceRule(rule: HierarchyInheritance): boolean {
  return rule.targetLevel > rule.sourceLevel; // Chỉ kế thừa xuống dưới
}
```

### 2. Parent Permission Control
```typescript
// Kiểm soát kế thừa từ cấp cha để tránh over-permission
const restrictedRule = {
  sourceLevel: 2,
  targetLevel: 3,
  inheritsPermissions: true,
  inheritsParentPermissions: false,  // QUAN TRỌNG: Ngăn kế thừa từ CTO
  permissions: { /* limited permissions */ }
};
```

### 3. Action-Specific Permissions
```typescript
// Phân quyền chi tiết theo từng action
const granularRule = {
  sourceLevel: 2,
  targetLevel: 3,
  inheritsPermissions: true,
  inheritsParentPermissions: false,
  permissions: {
    canViewTeamData: true,    // Cho phép xem
    canEditTeamData: false,   // KHÔNG cho phép sửa
    canExportTeamData: false, // KHÔNG cho phép export
  }
};
```

## 📈 Performance Optimization

### 1. Caching Strategy
```typescript
// Cache inheritance rules per department
const CACHE_KEY = `inheritance_rules_${departmentId}`;
const CACHE_TTL = 300000; // 5 minutes

// Implement trong getInheritanceRules
if (this.enableCaching) {
  const cached = await this.cacheService.get(CACHE_KEY);
  if (cached) return cached;
}

const rules = await this.fetchInheritanceRules(departmentId, workspaceId);

if (this.enableCaching) {
  await this.cacheService.set(CACHE_KEY, rules, CACHE_TTL);
}
```

### 2. Query Optimization
```typescript
// Chỉ query fields cần thiết
const hierarchyRules = await departmentHierarchyRepository.find({
  select: {
    // Chỉ select fields cần thiết cho inheritance
    hierarchyLevel: true,
    inheritsPermissions: true,
    inheritsParentPermissions: true,
    canViewTeamData: true,
    canEditTeamData: true,
    canExportTeamData: true,
  },
  // ... other options
});
```

## 🧪 Testing Scenarios

### 1. Basic Inheritance Test
```typescript
describe('getInheritanceRules', () => {
  it('should return proper inheritance hierarchy', async () => {
    const rules = await service.getInheritanceRules(departmentId, workspaceId);

    expect(rules).toBeDefined();
    expect(rules.length).toBeGreaterThan(0);

    // Kiểm tra rule validity
    rules.forEach(rule => {
      expect(rule.targetLevel).toBeGreaterThan(rule.sourceLevel);
      expect(rule.permissions).toBeDefined();
    });
  });
});
```

### 2. Permission Cascade Test
```typescript
it('should prevent privilege escalation', async () => {
  const rules = await service.getInheritanceRules(departmentId, workspaceId);

  // Không có rule nào cho phép escalation
  const escalationRules = rules.filter(rule =>
    rule.targetLevel <= rule.sourceLevel
  );

  expect(escalationRules).toHaveLength(0);
});
```

### 3. Parent Permission Test
```typescript
it('should control parent permission inheritance', async () => {
  const rules = await service.getInheritanceRules(departmentId, workspaceId);

  // Kiểm tra logic inheritsParentPermissions
  const parentInheritanceRules = rules.filter(rule =>
    rule.inheritsParentPermissions
  );

  // Chỉ có limited rules có parent inheritance
  expect(parentInheritanceRules.length).toBeLessThanOrEqual(2);
});
```

## 📚 Best Practices

### 1. Rule Design Principles
- **Principle of Least Privilege**: Chỉ cấp quyền tối thiểu cần thiết
- **Explicit Deny**: Mặc định deny, explicit allow
- **Granular Permissions**: Phân quyền chi tiết theo action
- **No Escalation**: Không bao giờ cho phép escalation lên cấp cao hơn

### 2. Implementation Guidelines
- **Validate Rules**: Luôn validate rule logic trước khi apply
- **Cache Wisely**: Cache results nhưng có TTL hợp lý
- **Log Access**: Log tất cả inheritance-based access
- **Review Regularly**: Review và audit inheritance rules định kỳ

### 3. Error Handling
- **Fail Secure**: Khi có lỗi, default deny access
- **Graceful Degradation**: Fallback to basic permissions khi rules unavailable
- **Clear Logging**: Log rõ ràng lỗi và context

## 🔗 Related Documentation

- [Enterprise RBAC Guard Guide](./enterprise-rbac-guard-guide.md)
- [Step 7: Hierarchy Validation](./rbac-step7-hierarchy-validation.md)
- [Database Schema Design](./rbac-database-design.md)
- [Performance Optimization](./rbac-performance-guide.md)

---

**Tác giả**: Enterprise RBAC Team
**Ngày cập nhật**: 2025-01-15
**Phiên bản**: 1.0.0