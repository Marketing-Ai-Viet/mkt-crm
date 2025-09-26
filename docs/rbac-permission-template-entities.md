# Hệ thống Permission Template RBAC - Phân tích Entity và Mối quan hệ

## 📋 Tổng quan

Hệ thống RBAC Permission Template được thiết kế để quản lý quyền truy cập phân cấp trong doanh nghiệp. Tài liệu này mô tả chi tiết các entity, mối quan hệ và cách thiết lập dữ liệu trong hệ thống.

## 🏗️ Kiến trúc Tổng thể Các Entity RBAC

Hệ thống RBAC Permission Template được thiết kế theo kiến trúc **3 tầng**:

### 📋 Tầng 1: Master Data (Dữ liệu Cơ sở)

#### `MktPermissionResourceWorkspaceEntity`
**Mục đích**: Định nghĩa các tài nguyên có thể áp dụng quyền
- **resourceKey**: Khóa định danh (CUSTOMERS, ORDERS, PRODUCTS...)
- **resourceName**: Tên hiển thị (Quản lý Khách hàng, Quản lý Đơn hàng...)
- **resourceCategory**: Loại tài nguyên (BUSINESS_DATA, SYSTEM_CONFIG, USER_MGMT...)
- **isSystemResource**: Tài nguyên hệ thống hay business

#### `MktPermissionActionWorkspaceEntity`
**Mục đích**: Định nghĩa các hành động có thể thực hiện
- **actionKey**: Khóa hành động (READ, CREATE, UPDATE, DELETE...)
- **actionName**: Tên hiển thị (Xem, Tạo mới, Cập nhật, Xóa...)
- **actionCategory**: Loại hành động (BASIC_CRUD, BULK_OPERATIONS, SYSTEM_ACTIONS...)
- **riskLevel**: Mức độ rủi ro (LOW, MEDIUM, HIGH, CRITICAL)
- **requiresApproval**: Có cần phê duyệt không

#### `MktPermissionContextWorkspaceEntity`
**Mục đích**: Định nghĩa ngữ cảnh áp dụng quyền
- **contextKey**: Khóa ngữ cảnh (OWN, DEPARTMENT, ALL...)
- **contextType**: Loại ngữ cảnh (OWN_RECORDS, DEPARTMENT_RECORDS, ALL_RECORDS...)
- **filterExpression**: Biểu thức lọc JSON để xác định phạm vi

### 📊 Tầng 2: Template Configuration (Cấu hình Template)

#### `MktPermissionTemplateWorkspaceEntity` (Entity Trung tâm)
**Mục đích**: Định nghĩa các template quyền theo chức danh
- **templateKey**: Khóa template (CEO, VP, DIRECTOR, MANAGER, EMPLOYEE...)
- **templateName**: Tên template (Chief Executive Officer, Vice President...)
- **hierarchyLevel**: Cấp độ phân cấp (1=CEO, 2=VP, 3=Director...)
- **applicableToLevels**: Array các cấp độ có thể áp dụng
- **priority**: Độ ưu tiên giải quyết conflict
- **isSystemTemplate**: Template hệ thống hay tùy chỉnh
- **version**: Phiên bản template để track changes

#### `MktTemplateResourcePermissionWorkspaceEntity`
**Mục đích**: Liên kết template với resource và định nghĩa quyền cụ thể
- **templateId**: ID template (FK)
- **resourceId**: ID resource (FK)
- **contextId**: ID context (FK, optional)
- **allowedActions**: Array các action được phép
- **deniedActions**: Array các action bị cấm (explicit deny)
- **conditions**: JSON điều kiện áp dụng
- **restrictions**: JSON giới hạn truy cập

#### `MktTemplateSystemActionWorkspaceEntity`
**Mục đích**: Định nghĩa quyền các hành động hệ thống
- **templateId**: ID template (FK)
- **actionKey**: Khóa hành động hệ thống (DATA_EXPORT, BULK_DELETE...)
- **isAllowed**: Có được phép không
- **configuration**: JSON cấu hình chi tiết (max records, time limits...)
- **restrictions**: JSON giới hạn thực hiện

#### `MktTemplateAccessLimitationWorkspaceEntity`
**Mục đích**: Định nghĩa các giới hạn truy cập
- **templateId**: ID template (FK)
- **limitationType**: Loại giới hạn (TEMPORAL, OPERATIONAL, FUNCTIONAL...)
- **limitationKey**: Khóa giới hạn (working_hours, session_timeout, ip_restrictions...)
- **limitationValue**: JSON giá trị cấu hình giới hạn
- **isEnforced**: Có thực thi không (có thể tạm thời disable)
- **severity**: Mức độ nghiêm trọng (LOW, MEDIUM, HIGH)

### 👥 Tầng 3: User Assignment (Gán User)

#### `MktUserPermissionTemplateWorkspaceEntity`
**Mục đích**: Gán user vào template cụ thể
- **workspaceMemberId**: ID workspace member (FK)
- **templateId**: ID template (FK)
- **assignedAt**: Thời gian gán
- **assignedBy**: Người gán
- **expiresAt**: Thời gian hết hạn (optional)
- **assignmentReason**: Lý do gán
- **isActive**: Có đang hoạt động không

#### `MktUserPermissionOverrideWorkspaceEntity`
**Mục đích**: Override quyền đặc biệt cho user
- **workspaceMemberId**: ID workspace member (FK)
- **resourceId**: ID resource (FK, optional)
- **actionId**: ID action (FK, optional)
- **overrideType**: Loại override (GRANT, DENY, TEMPORARY...)
- **overrideValue**: JSON giá trị override
- **reason**: Lý do override
- **expiresAt**: Thời gian hết hạn
- **isActive**: Có đang hoạt động không

## 🔗 Sơ đồ Mối quan hệ Entity

```
┌─────────────────────────┐    ONE_TO_MANY    ┌────────────────────────────┐
│ MktPermissionTemplate   │ ──────────────── │ MktTemplateResourcePerm... │
│ - templateKey           │                   │ - allowedActions           │
│ - hierarchyLevel        │                   │ - deniedActions           │
│ - priority             │                   │ - conditions              │
└─────────────────────────┘                   └────────────────────────────┘
         │                                                   │
         │ ONE_TO_MANY                              MANY_TO_ONE │
         ▼                                                   ▼
┌─────────────────────────┐                   ┌────────────────────────────┐
│ MktTemplateSystemAction │                   │ MktPermissionResource      │
│ - actionKey            │                   │ - resourceKey              │
│ - isAllowed            │                   │ - resourceCategory         │
│ - configuration        │                   │ - isSystemResource         │
└─────────────────────────┘                   └────────────────────────────┘
         │                                                   │
         │ ONE_TO_MANY                              ONE_TO_MANY │
         ▼                                                   ▼
┌─────────────────────────┐                   ┌────────────────────────────┐
│ MktTemplateAccessLimit..│                   │ MktUserPermissionOverride  │
│ - limitationType       │                   │ - overrideType             │
│ - limitationValue      │                   │ - overrideValue            │
│ - severity             │                   │ - reason                   │
└─────────────────────────┘                   └────────────────────────────┘
         │
         │ MANY_TO_ONE
         ▼
┌─────────────────────────┐    MANY_TO_ONE    ┌────────────────────────────┐
│ MktUserPermissionTemp.. │ ──────────────── │ WorkspaceMember            │
│ - assignedAt           │                   │ - userId                   │
│ - expiresAt            │                   │ - roles                    │
│ - assignmentReason     │                   │ - departmentId             │
└─────────────────────────┘                   └────────────────────────────┘
```

### Mối quan hệ Chi tiết:

**Quan hệ ONE_TO_MANY:**
```
MktPermissionTemplate (1) → (N) MktTemplateResourcePermission
MktPermissionTemplate (1) → (N) MktTemplateSystemAction
MktPermissionTemplate (1) → (N) MktTemplateAccessLimitation
MktPermissionTemplate (1) → (N) MktUserPermissionTemplate
MktPermissionResource (1) → (N) MktTemplateResourcePermission
MktPermissionResource (1) → (N) MktUserPermissionOverride
MktPermissionAction (1) → (N) MktUserPermissionOverride
MktPermissionContext (1) → (N) MktTemplateResourcePermission
WorkspaceMember (1) → (N) MktUserPermissionTemplate
WorkspaceMember (1) → (N) MktUserPermissionOverride
```

**Quan hệ MANY_TO_ONE:**
```
MktTemplateResourcePermission (N) → (1) MktPermissionTemplate
MktTemplateResourcePermission (N) → (1) MktPermissionResource
MktTemplateResourcePermission (N) → (1) MktPermissionContext
MktUserPermissionTemplate (N) → (1) WorkspaceMember
MktUserPermissionOverride (N) → (1) WorkspaceMember
```

## ⚙️ Các Bước Thiết lập Dữ liệu

### Bước 1: Khởi tạo Master Data

#### 1.1 Permission Resources
```typescript
const resources = [
  // Business Data Resources
  {
    resourceKey: 'CUSTOMERS',
    resourceName: 'Quản lý Khách hàng',
    resourceCategory: 'BUSINESS_DATA',
    isSystemResource: false,
    description: 'Truy cập dữ liệu khách hàng và thông tin liên quan'
  },
  {
    resourceKey: 'ORDERS',
    resourceName: 'Quản lý Đơn hàng',
    resourceCategory: 'BUSINESS_DATA',
    isSystemResource: false,
    description: 'Quản lý đơn hàng, thanh toán và giao hàng'
  },
  {
    resourceKey: 'PRODUCTS',
    resourceName: 'Quản lý Sản phẩm',
    resourceCategory: 'BUSINESS_DATA',
    isSystemResource: false,
    description: 'Catalog sản phẩm, giá cả và inventory'
  },
  {
    resourceKey: 'REPORTS',
    resourceName: 'Báo cáo',
    resourceCategory: 'REPORTING',
    isSystemResource: false,
    description: 'Các báo cáo business intelligence'
  },

  // System Resources
  {
    resourceKey: 'USER_MANAGEMENT',
    resourceName: 'Quản lý Người dùng',
    resourceCategory: 'USER_MGMT',
    isSystemResource: true,
    description: 'Quản lý tài khoản và phân quyền user'
  },
  {
    resourceKey: 'SYSTEM_CONFIG',
    resourceName: 'Cấu hình Hệ thống',
    resourceCategory: 'SYSTEM_CONFIG',
    isSystemResource: true,
    description: 'Cấu hình tham số và setting hệ thống'
  }
];
```

#### 1.2 Permission Actions
```typescript
const actions = [
  // Basic CRUD Actions
  {
    actionKey: 'READ',
    actionName: 'Xem',
    actionCategory: 'BASIC_CRUD',
    riskLevel: 'LOW',
    requiresApproval: false,
    description: 'Đọc và xem thông tin'
  },
  {
    actionKey: 'CREATE',
    actionName: 'Tạo mới',
    actionCategory: 'BASIC_CRUD',
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    description: 'Tạo bản ghi mới'
  },
  {
    actionKey: 'UPDATE',
    actionName: 'Cập nhật',
    actionCategory: 'BASIC_CRUD',
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    description: 'Chỉnh sửa thông tin hiện có'
  },
  {
    actionKey: 'DELETE',
    actionName: 'Xóa',
    actionCategory: 'BASIC_CRUD',
    riskLevel: 'HIGH',
    requiresApproval: true,
    description: 'Xóa bản ghi (cần phê duyệt)'
  },

  // Advanced Actions
  {
    actionKey: 'EXPORT',
    actionName: 'Xuất dữ liệu',
    actionCategory: 'DATA_OPERATIONS',
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    description: 'Export dữ liệu ra file'
  },
  {
    actionKey: 'BULK_DELETE',
    actionName: 'Xóa hàng loạt',
    actionCategory: 'BULK_OPERATIONS',
    riskLevel: 'CRITICAL',
    requiresApproval: true,
    description: 'Xóa nhiều bản ghi cùng lúc'
  },
  {
    actionKey: 'APPROVE',
    actionName: 'Phê duyệt',
    actionCategory: 'WORKFLOW',
    riskLevel: 'HIGH',
    requiresApproval: false,
    description: 'Phê duyệt workflow'
  }
];
```

#### 1.3 Permission Contexts
```typescript
const contexts = [
  {
    contextKey: 'OWN',
    contextName: 'Bản ghi của mình',
    contextType: 'OWN_RECORDS',
    filterExpression: '{"createdBy": "${user.id}"}',
    description: 'Chỉ truy cập bản ghi do mình tạo'
  },
  {
    contextKey: 'DEPARTMENT',
    contextName: 'Bản ghi phòng ban',
    contextType: 'DEPARTMENT_RECORDS',
    filterExpression: '{"department": "${user.department}"}',
    description: 'Truy cập bản ghi trong cùng phòng ban'
  },
  {
    contextKey: 'TEAM',
    contextName: 'Bản ghi nhóm',
    contextType: 'TEAM_RECORDS',
    filterExpression: '{"assignedTo": {"$in": "${user.teamMembers}"}}',
    description: 'Truy cập bản ghi của team trực tiếp'
  },
  {
    contextKey: 'ALL',
    contextName: 'Tất cả bản ghi',
    contextType: 'ALL_RECORDS',
    filterExpression: '{}',
    description: 'Toàn quyền truy cập tất cả dữ liệu'
  }
];
```

### Bước 2: Tạo Permission Templates

```typescript
const templates = [
  // C-Level Templates
  {
    templateKey: 'CEO',
    templateName: 'Chief Executive Officer',
    description: 'Quyền CEO - Toàn quyền quản lý',
    hierarchyLevel: 1,
    applicableToLevels: [1],
    priority: 1000,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },
  {
    templateKey: 'CTO',
    templateName: 'Chief Technology Officer',
    description: 'Quyền CTO - Quản lý công nghệ',
    hierarchyLevel: 1,
    applicableToLevels: [1],
    priority: 1000,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },

  // VP Level Templates
  {
    templateKey: 'VP_SALES',
    templateName: 'Vice President - Sales',
    description: 'Quyền VP Sales - Quản lý bán hàng',
    hierarchyLevel: 2,
    applicableToLevels: [2],
    priority: 900,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },
  {
    templateKey: 'VP_ENGINEERING',
    templateName: 'Vice President - Engineering',
    description: 'Quyền VP Engineering - Quản lý kỹ thuật',
    hierarchyLevel: 2,
    applicableToLevels: [2],
    priority: 900,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },

  // Director Level Templates
  {
    templateKey: 'DIRECTOR_SALES',
    templateName: 'Sales Director',
    description: 'Quyền Director Sales - Giám đốc bán hàng',
    hierarchyLevel: 3,
    applicableToLevels: [3],
    priority: 800,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },
  {
    templateKey: 'DIRECTOR_ENGINEERING',
    templateName: 'Engineering Director',
    description: 'Quyền Director Engineering - Giám đốc kỹ thuật',
    hierarchyLevel: 3,
    applicableToLevels: [3],
    priority: 800,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },

  // Manager Level Templates
  {
    templateKey: 'MANAGER',
    templateName: 'Manager',
    description: 'Quyền Manager - Quản lý cấp trung',
    hierarchyLevel: 4,
    applicableToLevels: [4],
    priority: 700,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },

  // Employee Level Templates
  {
    templateKey: 'SENIOR_EMPLOYEE',
    templateName: 'Senior Employee',
    description: 'Quyền Senior Employee - Nhân viên cao cấp',
    hierarchyLevel: 5,
    applicableToLevels: [5],
    priority: 600,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  },
  {
    templateKey: 'EMPLOYEE',
    templateName: 'Employee',
    description: 'Quyền Employee - Nhân viên',
    hierarchyLevel: 6,
    applicableToLevels: [6],
    priority: 500,
    isSystemTemplate: true,
    version: '1.0',
    isActive: true,
    createdBySource: 'SYSTEM'
  }
];
```

### Bước 3: Cấu hình Template Resource Permissions

#### 3.1 CEO Permissions (Toàn quyền)
```typescript
const ceoPermissions = [
  // Full access to all business resources
  {
    templateId: 'ceo-template-id',
    resourceId: 'customers-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'],
    deniedActions: [],
    conditions: {},
    restrictions: {},
    isActive: true
  },
  {
    templateId: 'ceo-template-id',
    resourceId: 'orders-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'],
    deniedActions: [],
    conditions: {},
    restrictions: {},
    isActive: true
  },
  {
    templateId: 'ceo-template-id',
    resourceId: 'products-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'],
    deniedActions: [],
    conditions: {},
    restrictions: {},
    isActive: true
  },
  // System resources access
  {
    templateId: 'ceo-template-id',
    resourceId: 'system-config-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
    deniedActions: [],
    conditions: {},
    restrictions: {},
    isActive: true
  },
  {
    templateId: 'ceo-template-id',
    resourceId: 'user-management-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
    deniedActions: [],
    conditions: {},
    restrictions: {},
    isActive: true
  }
];
```

#### 3.2 VP Sales Permissions
```typescript
const vpSalesPermissions = [
  // Full access to sales-related resources
  {
    templateId: 'vp-sales-template-id',
    resourceId: 'customers-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'],
    deniedActions: [],
    conditions: {},
    restrictions: {},
    isActive: true
  },
  {
    templateId: 'vp-sales-template-id',
    resourceId: 'orders-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'],
    deniedActions: [],
    conditions: {},
    restrictions: {},
    isActive: true
  },
  // Read-only access to products
  {
    templateId: 'vp-sales-template-id',
    resourceId: 'products-resource-id',
    contextId: 'all-context-id',
    allowedActions: ['READ', 'EXPORT'],
    deniedActions: ['CREATE', 'UPDATE', 'DELETE'],
    conditions: {},
    restrictions: {},
    isActive: true
  }
];
```

#### 3.3 Director Permissions
```typescript
const directorPermissions = [
  // Department-level access
  {
    templateId: 'director-template-id',
    resourceId: 'customers-resource-id',
    contextId: 'department-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'EXPORT'],
    deniedActions: ['DELETE'], // Cannot delete customers
    conditions: {
      'department': '${user.department}',
      'salesAmount': { '$lte': 1000000 } // Max 1M deal approval
    },
    restrictions: {
      'maxRecordsPerDay': 100,
      'requiresSecondApproval': true
    },
    isActive: true
  },
  {
    templateId: 'director-template-id',
    resourceId: 'orders-resource-id',
    contextId: 'department-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE', 'APPROVE'],
    deniedActions: ['DELETE'],
    conditions: {
      'orderValue': { '$lte': 500000 } // Max 500K order approval
    },
    restrictions: {},
    isActive: true
  }
];
```

#### 3.4 Manager Permissions
```typescript
const managerPermissions = [
  // Team-level access
  {
    templateId: 'manager-template-id',
    resourceId: 'customers-resource-id',
    contextId: 'team-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE'],
    deniedActions: ['DELETE', 'BULK_DELETE'],
    conditions: {
      'assignedTo': { '$in': '${user.teamMembers}' },
      'customerValue': { '$lte': 100000 } // Max 100K customer value
    },
    restrictions: {
      'maxRecordsPerDay': 50,
      'requiresApproval': ['UPDATE']
    },
    isActive: true
  },
  {
    templateId: 'manager-template-id',
    resourceId: 'orders-resource-id',
    contextId: 'team-context-id',
    allowedActions: ['READ', 'CREATE', 'UPDATE'],
    deniedActions: ['DELETE', 'APPROVE'],
    conditions: {
      'orderValue': { '$lte': 50000 } // Max 50K order handling
    },
    restrictions: {},
    isActive: true
  }
];
```

#### 3.5 Employee Permissions
```typescript
const employeePermissions = [
  // Own records only
  {
    templateId: 'employee-template-id',
    resourceId: 'customers-resource-id',
    contextId: 'own-context-id',
    allowedActions: ['READ', 'CREATE'],
    deniedActions: ['UPDATE', 'DELETE', 'EXPORT', 'BULK_DELETE'],
    conditions: {
      'createdBy': '${user.id}',
      'status': { '$ne': 'ARCHIVED' }
    },
    restrictions: {
      'maxRecordsPerDay': 20,
      'workingHoursOnly': true
    },
    isActive: true
  },
  {
    templateId: 'employee-template-id',
    resourceId: 'orders-resource-id',
    contextId: 'own-context-id',
    allowedActions: ['READ'],
    deniedActions: ['CREATE', 'UPDATE', 'DELETE'],
    conditions: {
      'assignedTo': '${user.id}'
    },
    restrictions: {
      'workingHoursOnly': true
    },
    isActive: true
  }
];
```

### Bước 4: Thiết lập System Actions

```typescript
const systemActions = [
  // CEO - Unlimited system access
  {
    templateId: 'ceo-template-id',
    actionKey: 'DATA_EXPORT',
    isAllowed: true,
    configuration: {
      maxRecords: -1, // Unlimited
      allowedFormats: ['CSV', 'EXCEL', 'PDF', 'JSON'],
      includePersonalData: true
    },
    restrictions: {},
    isActive: true
  },
  {
    templateId: 'ceo-template-id',
    actionKey: 'BULK_OPERATIONS',
    isAllowed: true,
    configuration: {
      maxBatchSize: -1, // Unlimited
      allowedOperations: ['UPDATE', 'DELETE', 'CREATE']
    },
    restrictions: {},
    isActive: true
  },
  {
    templateId: 'ceo-template-id',
    actionKey: 'SYSTEM_BACKUP',
    isAllowed: true,
    configuration: {
      scheduleBackup: true,
      fullBackupAccess: true
    },
    restrictions: {},
    isActive: true
  },

  // VP Level - High limits
  {
    templateId: 'vp-sales-template-id',
    actionKey: 'DATA_EXPORT',
    isAllowed: true,
    configuration: {
      maxRecords: 100000, // 100K records
      allowedFormats: ['CSV', 'EXCEL'],
      includePersonalData: false
    },
    restrictions: {
      'dailyLimit': 10,
      'requiresApproval': false
    },
    isActive: true
  },
  {
    templateId: 'vp-sales-template-id',
    actionKey: 'BULK_OPERATIONS',
    isAllowed: true,
    configuration: {
      maxBatchSize: 5000,
      allowedOperations: ['UPDATE', 'CREATE']
    },
    restrictions: {
      'requiresSecondApproval': true
    },
    isActive: true
  },

  // Director Level - Medium limits
  {
    templateId: 'director-template-id',
    actionKey: 'DATA_EXPORT',
    isAllowed: true,
    configuration: {
      maxRecords: 50000, // 50K records
      allowedFormats: ['CSV', 'EXCEL'],
      includePersonalData: false
    },
    restrictions: {
      'dailyLimit': 5,
      'requiresApproval': false
    },
    isActive: true
  },
  {
    templateId: 'director-template-id',
    actionKey: 'BULK_OPERATIONS',
    isAllowed: true,
    configuration: {
      maxBatchSize: 1000,
      allowedOperations: ['UPDATE']
    },
    restrictions: {
      'requiresApproval': true
    },
    isActive: true
  },

  // Manager Level - Lower limits
  {
    templateId: 'manager-template-id',
    actionKey: 'DATA_EXPORT',
    isAllowed: true,
    configuration: {
      maxRecords: 10000, // 10K records
      allowedFormats: ['CSV'],
      includePersonalData: false
    },
    restrictions: {
      'dailyLimit': 3,
      'requiresApproval': true
    },
    isActive: true
  },
  {
    templateId: 'manager-template-id',
    actionKey: 'BULK_OPERATIONS',
    isAllowed: false, // Not allowed
    configuration: {},
    restrictions: {},
    isActive: true
  },

  // Employee Level - No system actions
  {
    templateId: 'employee-template-id',
    actionKey: 'DATA_EXPORT',
    isAllowed: false,
    configuration: {},
    restrictions: {},
    isActive: true
  },
  {
    templateId: 'employee-template-id',
    actionKey: 'BULK_OPERATIONS',
    isAllowed: false,
    configuration: {},
    restrictions: {},
    isActive: true
  }
];
```

### Bước 5: Định nghĩa Access Limitations

```typescript
const accessLimitations = [
  // CEO - Minimal restrictions
  {
    templateId: 'ceo-template-id',
    limitationType: 'OPERATIONAL',
    limitationKey: 'session_timeout',
    limitationValue: {
      minutes: 720, // 12 hours
      extendable: true,
      maxExtensions: -1 // Unlimited
    },
    isEnforced: true,
    severity: 'LOW',
    isActive: true
  },
  {
    templateId: 'ceo-template-id',
    limitationType: 'FUNCTIONAL',
    limitationKey: 'concurrent_sessions',
    limitationValue: {
      maxSessions: 10,
      allowMobile: true,
      allowTablet: true
    },
    isEnforced: true,
    severity: 'LOW',
    isActive: true
  },

  // VP Level - Moderate restrictions
  {
    templateId: 'vp-sales-template-id',
    limitationType: 'OPERATIONAL',
    limitationKey: 'session_timeout',
    limitationValue: {
      minutes: 480, // 8 hours
      extendable: true,
      maxExtensions: 2
    },
    isEnforced: true,
    severity: 'MEDIUM',
    isActive: true
  },
  {
    templateId: 'vp-sales-template-id',
    limitationType: 'FUNCTIONAL',
    limitationKey: 'ip_restrictions',
    limitationValue: {
      allowedIPs: ['192.168.1.0/24', '10.0.0.0/16'],
      requireVPN: false,
      allowRemoteAccess: true
    },
    isEnforced: true,
    severity: 'MEDIUM',
    isActive: true
  },

  // Director Level - Standard restrictions
  {
    templateId: 'director-template-id',
    limitationType: 'TEMPORAL',
    limitationKey: 'working_hours',
    limitationValue: {
      start: '07:00',
      end: '19:00',
      timezone: 'Asia/Ho_Chi_Minh',
      allowWeekends: true,
      allowHolidays: false
    },
    isEnforced: true,
    severity: 'MEDIUM',
    isActive: true
  },
  {
    templateId: 'director-template-id',
    limitationType: 'OPERATIONAL',
    limitationKey: 'session_timeout',
    limitationValue: {
      minutes: 300, // 5 hours
      extendable: true,
      maxExtensions: 1
    },
    isEnforced: true,
    severity: 'MEDIUM',
    isActive: true
  },

  // Manager Level - Higher restrictions
  {
    templateId: 'manager-template-id',
    limitationType: 'TEMPORAL',
    limitationKey: 'working_hours',
    limitationValue: {
      start: '08:00',
      end: '18:00',
      timezone: 'Asia/Ho_Chi_Minh',
      allowWeekends: false,
      allowHolidays: false
    },
    isEnforced: true,
    severity: 'HIGH',
    isActive: true
  },
  {
    templateId: 'manager-template-id',
    limitationType: 'OPERATIONAL',
    limitationKey: 'failed_login_attempts',
    limitationValue: {
      maxAttempts: 5,
      lockoutDuration: 30, // minutes
      resetAfter: 24 // hours
    },
    isEnforced: true,
    severity: 'HIGH',
    isActive: true
  },

  // Employee Level - Strict restrictions
  {
    templateId: 'employee-template-id',
    limitationType: 'TEMPORAL',
    limitationKey: 'working_hours',
    limitationValue: {
      start: '09:00',
      end: '17:00',
      timezone: 'Asia/Ho_Chi_Minh',
      allowWeekends: false,
      allowHolidays: false,
      strictEnforcement: true
    },
    isEnforced: true,
    severity: 'HIGH',
    isActive: true
  },
  {
    templateId: 'employee-template-id',
    limitationType: 'OPERATIONAL',
    limitationKey: 'session_timeout',
    limitationValue: {
      minutes: 240, // 4 hours
      extendable: false,
      maxExtensions: 0
    },
    isEnforced: true,
    severity: 'HIGH',
    isActive: true
  },
  {
    templateId: 'employee-template-id',
    limitationType: 'FUNCTIONAL',
    limitationKey: 'concurrent_sessions',
    limitationValue: {
      maxSessions: 1,
      allowMobile: true,
      allowTablet: false
    },
    isEnforced: true,
    severity: 'HIGH',
    isActive: true
  },
  {
    templateId: 'employee-template-id',
    limitationType: 'FUNCTIONAL',
    limitationKey: 'download_restrictions',
    limitationValue: {
      maxFileSize: '10MB',
      allowedFormats: ['PDF', 'DOC'],
      dailyDownloadLimit: 100 // files
    },
    isEnforced: true,
    severity: 'MEDIUM',
    isActive: true
  }
];
```

## 🎯 Vai trò trong Hệ thống RBAC 15 bước

### Quy trình Validation Pipeline:

#### **🔍 Steps 1-3: Identity & Context Setup**
- Step 1: Pre-validation (authentication basic)
- Step 2: User context resolution
- Step 3: Resource identification

#### **📋 Step 4: Permission Template Check**
**Vai trò chính của entities:**
- **MktUserPermissionTemplateWorkspaceEntity**: Xác định template nào áp dụng cho user
- **MktPermissionTemplateWorkspaceEntity**: Load template configuration
- **Template Priority Resolution**: Giải quyết conflicts giữa nhiều template

**Workflow:**
```typescript
// 1. Identify user's assigned templates
const userTemplates = await MktUserPermissionTemplateRepository.find({
  where: { workspaceMemberId: userId, isActive: true }
});

// 2. Load template configurations
const templates = await MktPermissionTemplateRepository.find({
  where: { id: { $in: userTemplates.map(ut => ut.templateId) } },
  relations: ['resourcePermissions', 'systemActions', 'accessLimitations']
});

// 3. Apply priority-based resolution
const resolvedTemplates = templates.sort((a, b) => b.priority - a.priority);
```

#### **🔐 Steps 5-7: Permission Validation**
**Vai trò chính của entities:**
- **MktTemplateResourcePermissionWorkspaceEntity**: Kiểm tra quyền trên resource cụ thể
- **MktPermissionContextWorkspaceEntity**: Áp dụng context restrictions (own/department/all)

**Workflow:**
```typescript
// Check resource permissions
const resourcePermission = await MktTemplateResourcePermissionRepository.findOne({
  where: {
    templateId: applicableTemplate.id,
    resourceId: requestedResource.id
  },
  relations: ['context']
});

// Apply context filtering
const contextFilter = buildContextFilter(resourcePermission.context, userContext);
```

#### **⏰ Step 11: Access Limitations Check**
**Vai trò chính của entities:**
- **MktTemplateAccessLimitationWorkspaceEntity**: Kiểm tra giới hạn thời gian, IP, session

**Workflow:**
```typescript
// Check temporal restrictions
const temporalLimitations = await MktTemplateAccessLimitationRepository.find({
  where: {
    templateId: applicableTemplate.id,
    limitationType: 'TEMPORAL'
  }
});

// Validate working hours, session timeout, etc.
for (const limitation of temporalLimitations) {
  validateAccessLimitation(limitation, currentContext);
}
```

#### **⚡ Step 12: System Actions Validation**
**Vai trò chính của entities:**
- **MktTemplateSystemActionWorkspaceEntity**: Validate quyền export data, bulk operations

**Workflow:**
```typescript
// Check system action permissions
const systemAction = await MktTemplateSystemActionRepository.findOne({
  where: {
    templateId: applicableTemplate.id,
    actionKey: requestedSystemAction
  }
});

if (systemAction && systemAction.isAllowed) {
  // Apply configuration limits
  applySystemActionLimits(systemAction.configuration);
}
```

#### **🔄 Step 13: User Permission Override**
**Vai trò chính của entities:**
- **MktUserPermissionOverrideWorkspaceEntity**: Áp dụng override đặc biệt

**Workflow:**
```typescript
// Check for user-specific overrides
const overrides = await MktUserPermissionOverrideRepository.find({
  where: {
    workspaceMemberId: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }
});

// Apply overrides with highest priority
for (const override of overrides.sort((a, b) => b.priority - a.priority)) {
  applyOverride(override, currentPermissions);
}
```

### 🔄 Data Flow trong Validation:

```
User Request →
  Step 4: Template Lookup (MktUserPermissionTemplate) →
  Load Template Config (MktPermissionTemplate) →
  Step 5-7: Resource Permission Check (MktTemplateResourcePermission) →
  Apply Context Filter (MktPermissionContext) →
  Step 11: Access Limitations (MktTemplateAccessLimitation) →
  Step 12: System Actions (MktTemplateSystemAction) →
  Step 13: Override Check (MktUserPermissionOverride) →
  Final Permission Decision
```

## 📊 Ví dụ Use Case Thực tế

### Scenario: Sales Manager cố gắng export customer data

#### **Input:**
- User: John Doe (Sales Manager, hierarchy level 4)
- Action: DATA_EXPORT
- Resource: CUSTOMERS
- Requested records: 15,000

#### **Validation Flow:**

**Step 4 - Template Resolution:**
```sql
-- Find user's template assignment
SELECT t.* FROM mkt_permission_templates t
JOIN mkt_user_permission_templates upt ON t.id = upt.template_id
WHERE upt.workspace_member_id = 'john-doe-id'
-- Result: MANAGER template (priority: 700, hierarchy: 4)
```

**Step 5-7 - Resource Permission Check:**
```sql
-- Check resource permission
SELECT * FROM mkt_template_resource_permissions trp
WHERE trp.template_id = 'manager-template-id'
  AND trp.resource_id = 'customers-resource-id'
-- Result: READ access with TEAM context
```

**Step 12 - System Action Validation:**
```sql
-- Check system action permission
SELECT * FROM mkt_template_system_actions tsa
WHERE tsa.template_id = 'manager-template-id'
  AND tsa.action_key = 'DATA_EXPORT'
-- Result: Allowed with maxRecords: 10,000
```

**Final Decision:**
- ❌ **DENIED** - Requested 15,000 records exceeds limit of 10,000
- Alternative: Approve for 10,000 records with TEAM context filter

#### **Alternative với Override:**
```sql
-- Emergency override for special case
INSERT INTO mkt_user_permission_overrides (
  workspace_member_id, override_type, override_value,
  reason, expires_at
) VALUES (
  'john-doe-id', 'TEMPORARY_GRANT',
  '{"action": "DATA_EXPORT", "maxRecords": 20000}',
  'Q4 sales report preparation',
  '2024-01-01 23:59:59'
);
```

Với override này: ✅ **APPROVED** - Tạm thời cho phép export 20,000 records

## 🚀 Kết luận

Hệ thống Permission Template RBAC được thiết kế với:

### **✅ Ưu điểm:**
- **Flexible**: Dễ dàng thêm/sửa quyền theo hierarchy
- **Secure**: Nhiều lớp validation và giới hạn
- **Auditable**: Theo dõi đầy đủ quyền và thay đổi
- **Scalable**: Dễ dàng mở rộng resources và actions mới
- **Performance**: Cache được các template thường dùng
- **Override Support**: Hỗ trợ exceptions và emergency access

### **🔧 Best Practices:**
1. **Template Design**: Thiết kế template theo business hierarchy thực tế
2. **Principle of Least Privilege**: Chỉ cấp quyền tối thiểu cần thiết
3. **Regular Review**: Định kỳ review và cleanup permissions
4. **Audit Logging**: Log tất cả access attempts và changes
5. **Emergency Procedures**: Có quy trình cấp quyền khẩn cấp rõ ràng
6. **Testing**: Test thoroughly trước khi deploy templates mới

### **📈 Monitoring & Maintenance:**
- Monitor permission denials và approval rates
- Track system action usage và patterns
- Regular permission audit và compliance checks
- Performance monitoring của validation pipeline
- User feedback và permission request analysis

Hệ thống này đảm bảo security, compliance và user experience tối ưu cho doanh nghiệp cấp độ enterprise.