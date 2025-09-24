# Workflow thiết lập RBAC từ đầu

## Tổng quan

Hệ thống RBAC (Role-Based Access Control) trong Twenty CRM sử dụng kiến trúc phân cấp tổ chức với 11 levels hierarchy (bao gồm 3 sub-levels) và Data Access Policies để quản lý quyền truy cập dữ liệu.

## 1. Thiết lập Organization Hierarchy

### 1.1 Tạo Organization Levels

Tạo 11 cấp bậc tổ chức từ cao xuống thấp (bao gồm các cấp phụ):

```typescript
const levels = [
  { levelCode: "CEO", levelName: "Chief Executive Officer", hierarchyLevel: 1 },
  { levelCode: "VP", levelName: "Vice President", hierarchyLevel: 2 },
  { levelCode: "DIR", levelName: "Director", hierarchyLevel: 3 },
  { levelCode: "SUB_DIR", levelName: "Sub Director", hierarchyLevel: 3.1 },
  { levelCode: "MGR", levelName: "Manager", hierarchyLevel: 4 },
  { levelCode: "SUB_MGR", levelName: "Sub Manager", hierarchyLevel: 4.1 },
  { levelCode: "TL", levelName: "Team Lead", hierarchyLevel: 5 },
  { levelCode: "SUB_TL", levelName: "Sub Team Lead", hierarchyLevel: 5.1 },
  { levelCode: "SR", levelName: "Senior Staff", hierarchyLevel: 6 },
  { levelCode: "JR", levelName: "Junior Staff", hierarchyLevel: 7 },
  { levelCode: "INT", levelName: "Intern", hierarchyLevel: 8 }
];
```

**Cấu trúc phân cấp chi tiết:**
```
1. CEO (Tổng Giám đốc điều hành)
2. VP (Phó Tổng Giám đốc)
3. DIR (Giám đốc)
   3.1. SUB_DIR (Phó Giám đốc) - Phụ tá Giám đốc
4. MGR (Quản lý)
   4.1. SUB_MGR (Trợ lý Quản lý) - Hỗ trợ Manager
5. TL (Trưởng nhóm)
   5.1. SUB_TL (Phó nhóm) - Hỗ trợ Team Lead
6. SR (Nhân viên cao cấp)
7. JR (Nhân viên)
8. INT (Thực tập sinh)
```

**GraphQL Mutation:**
```graphql
mutation CreateOrganizationLevel {
  createOneMktOrganizationLevel(data: {
    levelCode: "MGR"
    levelName: "Manager"
    hierarchyLevel: 4
    parentLevelId: "director-uuid"
    description: "Cấp quản lý trung gian"
  }) {
    id
    levelCode
    levelName
    hierarchyLevel
  }
}
```

### 1.2 Auto-tạo Default Policies

Khi tạo Organization Level, system tự động:

1. **Pre-query Hook** validate dữ liệu đầu vào
2. **Post-query Hook** tạo Data Access Policy với permissions mặc định
3. **Policy Service** map hierarchy level sang permission template

```typescript
// Workflow tự động
CreateOrganizationLevel → Validation → Save → PostQueryHook → CreatePolicy
```

## 2. Thiết lập Department Structure

### 2.1 Tạo Departments

```typescript
const departments = [
  { name: "Sales", code: "SALES", description: "Bộ phận bán hàng" },
  { name: "Marketing", code: "MKT", description: "Bộ phận marketing" },
  { name: "Engineering", code: "ENG", description: "Bộ phận kỹ thuật" },
  { name: "HR", code: "HR", description: "Bộ phận nhân sự" },
  { name: "Finance", code: "FIN", description: "Bộ phận tài chính" }
];
```

**GraphQL Mutation:**
```graphql
mutation CreateDepartment {
  createOneMktDepartment(data: {
    name: "Sales"
    code: "SALES"
    description: "Bộ phận bán hàng"
  }) {
    id
    name
    code
  }
}
```

### 2.2 Department-specific Policies (Optional)

Tạo policies riêng cho department nếu cần override default:

```typescript
// Ví dụ: HR department có quyền đặc biệt
{
  name: "HR Department Salary Access",
  objectName: "person",
  departmentId: "hr-department-uuid",
  priority: 500, // Cao hơn default (100)
  filterConditions: {
    policyType: 'department_override',
    permissions: {
      canAccessSalaryData: true,
      canViewConfidentialInfo: true
    }
  }
}
```

## 3. Gán Users vào Hierarchy

### 3.1 Assign Organization Level cho Users

```graphql
mutation UpdateWorkspaceMember {
  updateOneWorkspaceMember(
    where: { id: "user-uuid" }
    data: {
      organizationLevelId: "manager-level-uuid"
      departmentId: "sales-department-uuid"
    }
  ) {
    id
    organizationLevel {
      levelCode
      hierarchyLevel
    }
    department {
      name
    }
  }
}
```

### 3.2 User-specific Policies (Optional)

Tạo policies riêng cho user cụ thể:

```typescript
// Ví dụ: CEO assistant có quyền như CEO
{
  name: "CEO Assistant Special Access",
  objectName: "*",
  specificMemberId: "assistant-user-uuid",
  priority: 1000, // Cao nhất
  filterConditions: {
    policyType: 'user_override',
    permissions: PERMISSION_TEMPLATES.SENIOR_STAFF.defaultPermissions
  }
}
```

## 4. Permission Templates System

### 4.1 Định nghĩa Permission Templates

```typescript
// src/mkt-core/mkt-organization-level/constants/permission-templates.constants.ts
export const PERMISSION_TEMPLATES = {
  SENIOR_STAFF: { // Level 1-2 (CEO, VP)
    defaultPermissions: {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canExport: true,
      canImport: true,
      canManageTeam: true,
      canAccessSensitiveData: true,
      canApproveTransactions: true
    },
    accessLimitations: {
      maxRecordsPerQuery: 50000,
      timeRestriction: null, // 24/7 access
      ipRestriction: false,
      canBypassWorkflowApproval: true
    }
  },

  DIRECTOR: { // Level 3-3.1 (Director, Sub Director)
    defaultPermissions: {
      canRead: true,
      canWrite: true,
      canDelete: true, // Directors can delete
      canExport: true,
      canImport: true,
      canManageTeam: true,
      canAccessSensitiveData: true, // Directors have sensitive access
      canApproveTransactions: true
    },
    accessLimitations: {
      maxRecordsPerQuery: 25000,
      timeRestriction: null, // Extended access
      ipRestriction: false,
      canBypassWorkflowApproval: true
    }
  },

  MANAGER: { // Level 4-4.1 (Manager, Sub Manager)
    defaultPermissions: {
      canRead: true,
      canWrite: true,
      canDelete: false, // Managers cannot delete
      canExport: true,
      canImport: false,
      canManageTeam: true,
      canAccessSensitiveData: false,
      canApproveTransactions: false
    },
    accessLimitations: {
      maxRecordsPerQuery: 10000,
      timeRestriction: '6-22', // 6AM-10PM
      ipRestriction: true,
      canBypassWorkflowApproval: false
    }
  },

  TEAM_LEAD: { // Level 5-5.1 (Team Lead, Sub Team Lead)
    defaultPermissions: {
      canRead: true,
      canWrite: true,
      canDelete: false,
      canExport: true,
      canImport: false,
      canManageTeam: true,
      canAccessSensitiveData: false,
      canApproveTransactions: false
    },
    accessLimitations: {
      maxRecordsPerQuery: 5000,
      timeRestriction: '8-18', // Business hours
      ipRestriction: true,
      canBypassWorkflowApproval: false
    }
  },

  JUNIOR_STAFF: { // Level 6-8 (Senior, Junior, Intern)
    defaultPermissions: {
      canRead: true,
      canWrite: false, // Chỉ đọc
      canDelete: false,
      canExport: false,
      canImport: false,
      canManageTeam: false,
      canAccessSensitiveData: false,
      canApproveTransactions: false
    },
    accessLimitations: {
      maxRecordsPerQuery: 1000,
      timeRestriction: '8-17', // Strict business hours
      ipRestriction: true,
      canBypassWorkflowApproval: false
    }
  }
};
```

### 4.2 Template Mapping Logic

```typescript
// OrganizationLevelPolicyService.getPermissionTemplateByHierarchy()
private getPermissionTemplateByHierarchy(hierarchyLevel: number) {
  // Level 1-2: CEO, VP
  if (hierarchyLevel <= 2) {
    return PERMISSION_TEMPLATES.SENIOR_STAFF;
  }
  
  // Level 3-3.1: Director, Sub Director
  if (hierarchyLevel >= 3 && hierarchyLevel < 4) {
    return PERMISSION_TEMPLATES.DIRECTOR;
  }
  
  // Level 4-4.1: Manager, Sub Manager
  if (hierarchyLevel >= 4 && hierarchyLevel < 5) {
    return PERMISSION_TEMPLATES.MANAGER;
  }
  
  // Level 5-5.1: Team Lead, Sub Team Lead
  if (hierarchyLevel >= 5 && hierarchyLevel < 6) {
    return PERMISSION_TEMPLATES.TEAM_LEAD;
  }
  
  // Level 6-8: Senior Staff, Junior Staff, Intern
  return PERMISSION_TEMPLATES.JUNIOR_STAFF;
}

// Utility method to get sub-level permissions
private getSubLevelAdjustments(hierarchyLevel: number, baseTemplate: any) {
  // Sub-levels have slightly reduced permissions compared to main levels
  if (hierarchyLevel % 1 !== 0) { // Decimal levels are sub-levels
    return {
      ...baseTemplate,
      accessLimitations: {
        ...baseTemplate.accessLimitations,
        // Sub-levels have 20% reduced query limits
        maxRecordsPerQuery: Math.floor(baseTemplate.accessLimitations.maxRecordsPerQuery * 0.8)
      }
    };
  }
  return baseTemplate;
}
```

## 5. Data Access Policy Structure

### 5.1 Policy được tạo tự động

Mỗi organization level tạo 1 default policy:

```typescript
{
  name: "Default Policy - Manager Level",
  objectName: "*", // Áp dụng cho tất cả objects
  departmentId: null, // Áp dụng cho tất cả departments
  specificMemberId: null, // Không riêng cho user nào
  priority: 100, // Default priority
  isActive: true,
  filterConditions: {
    // Metadata
    policyType: 'organization_level_default',
    organizationLevelId: 'manager-level-uuid',
    hierarchyLevel: 4,
    createdBy: 'system',
    version: '1.0.0',

    // Permissions
    permissions: PERMISSION_TEMPLATES.MANAGER.defaultPermissions,
    accessLimitations: PERMISSION_TEMPLATES.MANAGER.accessLimitations,

    // Filter conditions
    memberFilter: {
      organizationLevel: { eq: 'manager-level-uuid' }
    }
  }
}
```

### 5.2 Policy Priority System

```typescript
Priority levels:
- 1000+: User-specific overrides
- 500-999: Department-specific overrides
- 100-499: Organization level defaults
- 1-99: Global/fallback policies
```

## 6. Policy Resolution Flow

### 6.1 Khi user truy cập data

```typescript
// 1. Lấy tất cả policies áp dụng cho user
const applicablePolicies = [
  organizationLevelPolicy,    // Priority: 100
  departmentSpecificPolicy,   // Priority: 500 (nếu có)
  userSpecificPolicy         // Priority: 1000 (nếu có)
];

// 2. Sắp xếp theo priority (cao → thấp)
policies.sort((a, b) => b.priority - a.priority);

// 3. Apply policies theo thứ tự
for (const policy of policies) {
  const result = evaluatePolicy(policy, user, operation);
  if (result.isDecisive) return result;
}
```

### 6.2 Policy Evaluation Logic

```typescript
// MktRbacService.evaluateDataAccess()
async evaluateDataAccess(userId: string, objectName: string, operation: string) {
  // 1. Get user with hierarchy info
  const user = await this.getUserWithHierarchy(userId);

  // 2. Get applicable policies
  const policies = await this.getApplicablePolicies(user, objectName);

  // 3. Sort by priority
  policies.sort((a, b) => b.priority - a.priority);

  // 4. Evaluate each policy
  for (const policy of policies) {
    const filterConditions = policy.filterConditions as PolicyFilterConditions;

    // Check if policy applies to this user
    if (!this.policyAppliesTo(policy, user)) continue;

    // Check operation permission
    const hasPermission = this.checkOperationPermission(
      filterConditions.permissions,
      operation
    );

    // Check access limitations
    const withinLimitations = this.checkAccessLimitations(
      filterConditions.accessLimitations,
      user,
      operation
    );

    if (hasPermission && withinLimitations) {
      return { allowed: true, policy: policy.name };
    }
  }

  return { allowed: false, reason: 'No applicable policy grants access' };
}
```

## 7. Override và Exception Handling

### 7.1 Department Override

```typescript
// HR department cần quyền đặc biệt
mutation CreateDepartmentPolicy {
  createOneMktDataAccessPolicy(data: {
    name: "HR Department Salary Access"
    objectName: "person"
    departmentId: "hr-department-uuid"
    priority: 500
    filterConditions: {
      policyType: "department_override"
      permissions: {
        canAccessSalaryData: true
        canViewConfidentialInfo: true
        canManageEmployeeRecords: true
      }
      accessLimitations: {
        auditRequired: true
        maxRecordsPerQuery: 1000
      }
    }
  }) {
    id
    name
  }
}
```

### 7.2 User-specific Override

```typescript
// CEO assistant có quyền như CEO
mutation CreateUserPolicy {
  createOneMktDataAccessPolicy(data: {
    name: "CEO Assistant Special Access"
    objectName: "*"
    specificMemberId: "assistant-user-uuid"
    priority: 1000
    filterConditions: {
      policyType: "user_override"
      permissions: {
        // Copy all CEO permissions
        canRead: true
        canWrite: true
        canDelete: true
        canAccessSensitiveData: true
      }
      accessLimitations: {
        requiresTwoFactorAuth: true
      }
    }
  }) {
    id
    name
  }
}
```

## 8. Validation và Security

### 8.1 Input Validation

```typescript
// Pre-query hooks validate trước khi tạo/update
@WorkspaceQueryHook('mktOrganizationLevel.createOne')
export class MktOrganizationLevelCreateOnePreQueryHook {
  async execute(authContext, objectName, payload) {
    // 1. Validate với class-validator
    const validatedDto = await this.validationService.validateCreateInput(input);

    // 2. Business logic validation
    await this.validateLevelCodeUniqueness(validatedDto.levelCode, workspaceId);
    await this.validateParentLevel(validatedDto, workspaceId);
    await this.validateHierarchyLogic(validatedDto);

    return { ...payload, data: this.transformDtoToEntity(validatedDto) };
  }
}
```

### 8.2 Policy Validation

```typescript
// Validation rules
const validationRules = {
  // Không cho phép circular references
  noCircularReferences: (level) => {
    // Check parent chain doesn't include current level
  },

  // Validate priority conflicts
  noPriorityConflicts: (policy) => {
    // Check if same priority exists for same scope
  },

  // Ensure policy consistency
  consistentPermissions: (policy) => {
    // Validate permission combinations make sense
  }
};
```

## 9. Testing Flow

### 9.1 Test Hierarchy Creation

```graphql
# Test tạo level mới
mutation TestCreateLevel {
  createOneMktOrganizationLevel(data: {
    levelCode: "MGR"
    levelName: "Manager"
    hierarchyLevel: 4
    parentLevelId: "director-uuid"
  }) {
    id
    levelCode
    hierarchyLevel
  }
}
```

### 9.2 Verify Policy Auto-creation

```graphql
# Kiểm tra policy được tạo tự động
query CheckPolicyCreated {
  findManyMktDataAccessPolicy(
    filter: {
      name: { contains: "Manager Level" }
    }
  ) {
    id
    name
    priority
    filterConditions
    isActive
  }
}
```

### 9.3 Test Access Control

```typescript
// Test user với Manager level
describe('RBAC Access Control', () => {
  it('should allow read but deny delete for Manager level', async () => {
    const readAccess = await rbacService.evaluateDataAccess(
      managerId,
      "person",
      "read"
    );
    expect(readAccess.allowed).toBe(true);

    const deleteAccess = await rbacService.evaluateDataAccess(
      managerId,
      "person",
      "delete"
    );
    expect(deleteAccess.allowed).toBe(false);
  });
});
```

## 10. Monitoring và Audit

### 10.1 Policy Changes Tracking

```typescript
// Log tất cả policy changes
const auditLog = {
  action: 'POLICY_CREATED',
  policyId: policy.id,
  userId: authContext.user.id,
  changes: {
    before: null,
    after: policy.filterConditions
  },
  timestamp: new Date(),
  ipAddress: authContext.ipAddress
};
```

### 10.2 Performance Optimization

```typescript
// Strategies for optimization
const optimizations = {
  // Cache policies theo user
  userPolicyCache: new Map(),

  // Index filterConditions JSON fields
  databaseIndexes: [
    'filterConditions.policyType',
    'filterConditions.organizationLevelId',
    'priority DESC'
  ],

  // Pre-compute policy resolution
  preComputedAccess: {
    // Cache common permission checks
  }
};
```

## 11. Best Practices

### 11.1 Security Guidelines

1. **Principle of Least Privilege**: Default deny, explicit grant
2. **Defense in Depth**: Multiple validation layers
3. **Audit Everything**: Log all access attempts
4. **Regular Review**: Periodic policy audits

### 11.2 Performance Guidelines

1. **Cache Policies**: User-level caching với TTL
2. **Optimize Queries**: Index JSON fields appropriately
3. **Batch Operations**: Group policy evaluations
4. **Monitor Metrics**: Track policy evaluation performance

### 11.3 Maintenance Guidelines

1. **Version Policies**: Track policy changes over time
2. **Test Changes**: Comprehensive testing before deployment
3. **Document Exceptions**: Clear documentation for overrides
4. **Regular Cleanup**: Remove obsolete policies

## Kết luận

Hệ thống RBAC này cung cấp:

- **Flexibility**: Dễ dàng thêm/sửa permissions và policies
- **Scalability**: Hỗ trợ enterprise-level với hàng nghìn users
- **Security**: Multiple validation layers và audit trails
- **Maintainability**: Clear separation of concerns và documentation

Workflow này đảm bảo RBAC system có thể scale, maintain và secure cho enterprise-level applications.