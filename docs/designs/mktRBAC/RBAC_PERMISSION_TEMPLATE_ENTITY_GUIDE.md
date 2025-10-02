# MktPermissionTemplateWorkspaceEntity - Hướng Dẫn Chi Tiết

## Giới Thiệu (Overview)

`MktPermissionTemplateWorkspaceEntity` là thành phần cốt lõi trong hệ thống RBAC (Role-Based Access Control) của CRM. Nó đóng vai trò như một **bản thiết kế (blueprint)** định nghĩa các tập hợp quyền hạn chuẩn cho mỗi cấp độ tổ chức trong công ty.

### Vai Trò Chính

1. **Định nghĩa quyền hạn chuẩn theo cấp bậc**: Mỗi template tương ứng với một cấp độ tổ chức (ADMIN, MANAGER, TEAM_LEAD, STAFF, INTERN)
2. **Tách biệt quyền và người dùng**: Template định nghĩa "quyền gì có thể có", user assignment xác định "ai có quyền đó"
3. **Tái sử dụng và nhất quán**: Một template có thể được gán cho nhiều user, đảm bảo quyền hạn nhất quán
4. **Quản lý tập trung**: Thay đổi template sẽ tự động áp dụng cho tất cả users được gán template đó

## Cấu Trúc Entity (Entity Structure)

### Định Nghĩa TypeORM

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPermissionTemplate,
  namePlural: 'mktPermissionTemplates',
  labelSingular: msg`Permission Template`,
  labelPlural: msg`Permission Templates`,
})
export class MktPermissionTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  // Thông tin cơ bản (Basic Information)
  templateKey: string;              // Mã định danh duy nhất: 'ADMIN', 'MANAGER', 'STAFF', etc.
  templateName: string;             // Tên dễ đọc: 'Admin Template', 'Manager Template'
  description?: string;             // Mô tả chi tiết về template

  // Cấp độ và phạm vi áp dụng (Level and Scope)
  hierarchyLevel: number;           // Cấp độ chính (1-5): 1=ADMIN, 2=MANAGER, 3=TEAM_LEAD, 4=STAFF, 5=INTERN
  applicableToLevels: number[];     // Các cấp độ có thể áp dụng template này

  // Quản lý phiên bản (Version Management)
  version: string;                  // Phiên bản template: '1.0.0', '2.1.0'
  isSystemTemplate: boolean;        // Template hệ thống (true) hay custom (false)
  isActive: boolean;                // Trạng thái hoạt động

  // Độ ưu tiên (Priority)
  priority: number;                 // Độ ưu tiên giải quyết xung đột: ADMIN=1000, MANAGER=700, TEAM_LEAD=600, STAFF=500, INTERN=300

  // Quan hệ với các entity khác (Relationships)
  resourcePermissions: Relation<MktTemplateResourcePermissionWorkspaceEntity[]>;  // Quyền truy cập tài nguyên
  systemActions: Relation<MktTemplateSystemActionWorkspaceEntity[]>;               // Các thao tác hệ thống
  accessLimitations: Relation<MktTemplateAccessLimitationWorkspaceEntity[]>;       // Giới hạn truy cập
  dataAccessPolicies: Relation<MktDataAccessPolicyWorkspaceEntity[]>;              // Chính sách truy cập dữ liệu
  userAssignments: Relation<MktUserPermissionTemplateWorkspaceEntity[]>;           // Gán template cho users

  // Metadata
  createdBySource: string;          // Nguồn tạo: 'SYSTEM', 'MANUAL', 'IMPORT'
  lastModifiedBy?: string;          // Người sửa đổi cuối
  lastModifiedAt?: Date;            // Thời gian sửa đổi cuối
  position?: number;                // Vị trí hiển thị trong UI
}
```

### Giải Thích Các Trường Quan Trọng

#### 1. `templateKey` - Mã Định Danh
- **Mục đích**: Định danh duy nhất cho template, không thay đổi
- **Giá trị**: 'ADMIN', 'MANAGER', 'TEAM_LEAD', 'STAFF', 'INTERN'
- **Ví dụ**: `templateKey: 'MANAGER'`

#### 2. `hierarchyLevel` - Cấp Độ Phân Cấp
- **Mục đích**: Xác định vị trí trong cấu trúc tổ chức
- **Giá trị**: 1 (cao nhất) đến 5 (thấp nhất)
- **Quy tắc**: Cấp thấp hơn kế thừa một số quyền từ cấp cao hơn

#### 3. `priority` - Độ Ưu Tiên
- **Mục đích**: Giải quyết xung đột khi user có nhiều templates
- **Mapping**:
  - ADMIN: 1000 (cao nhất)
  - MANAGER: 700
  - TEAM_LEAD: 600
  - STAFF: 500
  - INTERN: 300 (thấp nhất)

#### 4. `applicableToLevels` - Phạm Vi Áp Dụng
- **Mục đích**: Kiểm soát template có thể được gán cho cấp độ nào
- **Ví dụ**: MANAGER template có `applicableToLevels: [2]` - chỉ có thể gán cho users cấp MANAGER

## Ví Dụ Cụ Thể: Phòng Sales

### Kịch Bản

Phòng Sales có 4 nhân viên với 4 cấp độ khác nhau:

| Nhân Viên | Cấp Độ (Level) | Template Được Gán | Priority |
|-----------|----------------|-------------------|----------|
| Anh Minh  | 2 - MANAGER    | MANAGER           | 700      |
| Chị Lan   | 3 - TEAM_LEAD  | TEAM_LEAD         | 600      |
| Anh Tuấn  | 4 - STAFF      | STAFF             | 500      |
| Chị Hương | 5 - INTERN     | INTERN            | 300      |

### Permission Templates Của Từng Cấp

#### 1. ADMIN Template (Priority: 1000)
```typescript
{
  id: '1a1b1c1d-1e1f-4a4b-8c8d-1e1f2a2b3c3d',
  templateKey: 'ADMIN',
  templateName: 'Admin Template',
  description: 'Toàn quyền quản trị hệ thống - Full access to all data and functions',
  hierarchyLevel: 1,
  applicableToLevels: [1],
  version: '1.0.0',
  isSystemTemplate: true,
  isActive: true,
  priority: 1000,
}
```

**Quyền hạn chính**:
- ✅ Truy cập tất cả dữ liệu (ALL_RECORDS)
- ✅ Tất cả thao tác CRUD trên mọi tài nguyên
- ✅ Phê duyệt giao dịch không giới hạn
- ✅ Quản lý users, roles, permissions
- ✅ Cấu hình hệ thống
- ✅ Bypass mọi workflow approval

#### 2. MANAGER Template (Priority: 700)
```typescript
{
  id: '2a2b2c2d-2e2f-4a4b-8c8d-2e2f3a3b4c4d',
  templateKey: 'MANAGER',
  templateName: 'Manager Template',
  description: 'Quản lý team và duyệt các thao tác quan trọng',
  hierarchyLevel: 2,
  applicableToLevels: [2],
  version: '1.0.0',
  isSystemTemplate: true,
  isActive: true,
  priority: 700,
}
```

**Quyền hạn chính**:
- ✅ Truy cập dữ liệu phòng ban và team (DEPARTMENT_RECORDS)
- ✅ CRUD customers, orders trong phạm vi phòng ban
- ✅ Phê duyệt giao dịch lên đến 50M VND (Sales) / 100M VND (Admin)
- ✅ Xem báo cáo phòng ban
- ✅ Quản lý team members
- ✅ Phân công công việc
- ❌ Không thể cấu hình hệ thống
- ❌ Không thể truy cập dữ liệu phòng ban khác (trừ khi được cấp riêng)

#### 3. TEAM_LEAD Template (Priority: 600)
```typescript
{
  id: '3a3b3c3d-3e3f-4a4b-8c8d-3e3f4a4b5c5d',
  templateKey: 'TEAM_LEAD',
  templateName: 'Team Lead Template',
  description: 'Dẫn dắt nhóm nhỏ, phân công công việc',
  hierarchyLevel: 3,
  applicableToLevels: [3],
  version: '1.0.0',
  isSystemTemplate: true,
  isActive: true,
  priority: 600,
}
```

**Quyền hạn chính**:
- ✅ Truy cập dữ liệu team và cá nhân (TEAM_RECORDS)
- ✅ CRUD customers, orders trong phạm vi team
- ✅ Phê duyệt giao dịch lên đến 20M VND
- ✅ Xem báo cáo team
- ✅ Phân công công việc cho team members
- ✅ Xử lý items có priority medium-high
- ❌ Không thể truy cập dữ liệu toàn phòng ban
- ❌ Không thể quản lý users

#### 4. STAFF Template (Priority: 500)
```typescript
{
  id: '4a4b4c4d-4e4f-4a4b-8c8d-4e4f5a5b6c6d',
  templateKey: 'STAFF',
  templateName: 'Staff Template',
  description: 'Thực hiện công việc hàng ngày',
  hierarchyLevel: 4,
  applicableToLevels: [4],
  version: '1.0.0',
  isSystemTemplate: true,
  isActive: true,
  priority: 500,
}
```

**Quyền hạn chính**:
- ✅ Truy cập dữ liệu cá nhân (OWN_RECORDS)
- ✅ CREATE customers, orders (được gán cho mình)
- ✅ UPDATE/DELETE customers, orders của mình
- ✅ Xem báo cáo cá nhân
- ✅ Xử lý items có priority low-medium
- ❌ Không có quyền phê duyệt
- ❌ Không thể truy cập dữ liệu của người khác
- ❌ Không thể xóa dữ liệu quan trọng

#### 5. INTERN Template (Priority: 300)
```typescript
{
  id: '5a5b5c5d-5e5f-4a4b-8c8d-5e5f6a6b7c7d',
  templateKey: 'INTERN',
  templateName: 'Intern Template',
  description: 'Quyền hạn hạn chế, đang học tập',
  hierarchyLevel: 5,
  applicableToLevels: [5],
  version: '1.0.0',
  isSystemTemplate: true,
  isActive: true,
  priority: 300,
}
```

**Quyền hạn chính**:
- ✅ READ ONLY cho hầu hết dữ liệu
- ✅ CREATE customers (cần approval từ supervisor)
- ✅ Xem báo cáo cá nhân (hạn chế)
- ✅ Xử lý items có priority low
- ⚠️ Mọi thao tác critical cần approval từ Team Lead/Manager
- ⚠️ Monitoring toàn diện mọi hoạt động
- ❌ Không có quyền DELETE
- ❌ Không thể truy cập dữ liệu sensitive

## Ma Trận Quyền Chi Tiết (Detailed Permission Matrix)

### 1. Quản Lý Khách Hàng (Customer Management)

| Thao Tác | ADMIN | MANAGER | TEAM_LEAD | STAFF | INTERN |
|----------|-------|---------|-----------|-------|--------|
| READ All Customers | ✅ | ✅ (Department) | ✅ (Team) | ✅ (Own) | ✅ (Own, Read-only) |
| CREATE Customer | ✅ | ✅ | ✅ | ✅ | ⚠️ (Cần approval) |
| UPDATE Customer | ✅ | ✅ (Department) | ✅ (Team) | ✅ (Own) | ❌ |
| DELETE Customer | ✅ | ✅ (Department) | ⚠️ (Team, cần approval) | ❌ | ❌ |
| ASSIGN Customer | ✅ | ✅ | ✅ (Trong team) | ❌ | ❌ |
| TRANSFER Customer | ✅ | ✅ | ⚠️ (Cần approval nếu ra ngoài team) | ❌ | ❌ |
| MERGE Customers | ✅ | ✅ | ❌ | ❌ | ❌ |
| EXPORT Customers | ✅ | ✅ (Department) | ✅ (Team) | ✅ (Own) | ❌ |

### 2. Quản Lý Đơn Hàng (Order Management)

| Thao Tác | ADMIN | MANAGER | TEAM_LEAD | STAFF | INTERN |
|----------|-------|---------|-----------|-------|--------|
| READ All Orders | ✅ | ✅ (Department) | ✅ (Team) | ✅ (Own) | ✅ (Own, Read-only) |
| CREATE Order | ✅ | ✅ | ✅ | ✅ | ⚠️ (Cần approval) |
| UPDATE Order | ✅ | ✅ (Department) | ✅ (Team) | ✅ (Own) | ❌ |
| DELETE Order | ✅ | ⚠️ (Cần approval >50M) | ❌ | ❌ | ❌ |
| APPROVE Order | ✅ | ✅ (≤50M VND) | ✅ (≤20M VND) | ❌ | ❌ |
| CLOSE Deal | ✅ | ✅ | ✅ | ⚠️ (Cần approval) | ❌ |
| APPROVE Discount | ✅ | ✅ (≤20%) | ⚠️ (≤10%, cần approval) | ❌ | ❌ |

### 3. Báo Cáo & Analytics (Reporting)

| Thao Tác | ADMIN | MANAGER | TEAM_LEAD | STAFF | INTERN |
|----------|-------|---------|-----------|-------|--------|
| VIEW Dashboard | ✅ (All) | ✅ (Department) | ✅ (Team) | ✅ (Personal) | ✅ (Personal, hạn chế) |
| CREATE Report | ✅ | ✅ | ✅ | ⚠️ (Template only) | ❌ |
| SCHEDULE Report | ✅ | ✅ | ❌ | ❌ | ❌ |
| EXPORT Analytics | ✅ | ✅ | ✅ | ⚠️ (Hạn chế) | ❌ |
| ACCESS Financial Reports | ✅ | ✅ | ⚠️ (Tóm tắt) | ❌ | ❌ |

### 4. Quản Lý Người Dùng (User Management)

| Thao Tác | ADMIN | MANAGER | TEAM_LEAD | STAFF | INTERN |
|----------|-------|---------|-----------|-------|--------|
| VIEW Users | ✅ (All) | ✅ (Department) | ✅ (Team) | ✅ (Team list) | ✅ (Team list) |
| CREATE User | ✅ | ❌ | ❌ | ❌ | ❌ |
| UPDATE User | ✅ | ⚠️ (Team members, hạn chế) | ❌ | ❌ | ❌ |
| DELETE/Deactivate User | ✅ | ❌ | ❌ | ❌ | ❌ |
| ASSIGN Role | ✅ | ❌ | ❌ | ❌ | ❌ |
| RESET Password | ✅ | ⚠️ (Team members only) | ❌ | ❌ | ❌ |

### 5. Cấu Hình Hệ Thống (System Configuration)

| Thao Tác | ADMIN | MANAGER | TEAM_LEAD | STAFF | INTERN |
|----------|-------|---------|-----------|-------|--------|
| CONFIGURE System | ✅ | ❌ | ❌ | ❌ | ❌ |
| MANAGE Integrations | ✅ | ❌ | ❌ | ❌ | ❌ |
| CREATE Workflow | ✅ | ⚠️ (Department only) | ❌ | ❌ | ❌ |
| AUDIT System | ✅ | ⚠️ (View logs only) | ❌ | ❌ | ❌ |
| BACKUP/RESTORE | ✅ | ❌ | ❌ | ❌ | ❌ |

## Luồng Kiểm Tra Quyền (Permission Check Flow)

### Ví Dụ 1: Anh Minh (Manager) Truy Cập Khách Hàng

**Kịch bản**: Anh Minh muốn xem thông tin khách hàng "Công ty ABC" thuộc phòng Sales.

```typescript
// Step 1: Lấy template của user
const userTemplate = await getUserPermissionTemplate(userId: 'minh_id');
// Result: MANAGER Template (priority: 700, hierarchyLevel: 2)

// Step 2: Kiểm tra quyền trên resource
const hasPermission = await checkResourcePermission({
  template: userTemplate,
  resource: 'CUSTOMER',
  action: 'READ',
  resourceOwnerId: 'abc_company_id',
  userDepartmentId: 'sales_dept_id'
});

// Step 3: Áp dụng Data Access Policy
const dataAccessPolicy = await getDataAccessPolicy({
  departmentId: 'sales_dept_id',
  organizationLevelId: 'manager_level_id'
});
// Result: contextFilter = "DEPARTMENT_RECORDS"
//         filterLogic = "departmentId = :userDepartmentId OR assignedToUserId = :userId"

// Step 4: Kiểm tra department matching
if (customer.departmentId === user.departmentId) {
  // ✅ ALLOW - Anh Minh có quyền READ customer trong phòng Sales
  return true;
}
```

**Kết quả**: ✅ **CHO PHÉP** - Anh Minh có quyền xem khách hàng "Công ty ABC" vì:
1. Template MANAGER có quyền READ trên resource CUSTOMER
2. Customer thuộc phòng Sales (cùng department với Anh Minh)
3. Data Access Policy cho phép truy cập DEPARTMENT_RECORDS

### Ví Dụ 2: Chị Hương (Intern) Tạo Đơn Hàng

**Kịch bản**: Chị Hương muốn tạo đơn hàng mới cho khách hàng "Công ty XYZ" (giá trị 15M VND).

```typescript
// Step 1: Lấy template của user
const userTemplate = await getUserPermissionTemplate(userId: 'huong_id');
// Result: INTERN Template (priority: 300, hierarchyLevel: 5)

// Step 2: Kiểm tra quyền CREATE ORDER
const hasCreatePermission = await checkResourcePermission({
  template: userTemplate,
  resource: 'ORDER',
  action: 'CREATE',
  resourceOwnerId: null, // New record
  userDepartmentId: 'sales_dept_id'
});
// Result: ⚠️ CONDITIONAL - CREATE allowed but requiresApproval = true

// Step 3: Kiểm tra Access Limitations
const limitations = await getAccessLimitations({
  templateId: 'intern_template_id',
  resource: 'ORDER',
  action: 'CREATE'
});
// Result:
// - maxRecordValue: 10000000 (10M VND)
// - requiresSupervisorApproval: true
// - allowedPriorityLevels: ['LOW']

// Step 4: Validate business rules
if (orderValue > limitations.maxRecordValue) {
  // ❌ REJECT - Order value 15M exceeds limit 10M
  return {
    allowed: false,
    reason: 'ORDER_VALUE_EXCEEDS_LIMIT',
    message: 'Intern chỉ được tạo đơn hàng tối đa 10M VND. Vui lòng yêu cầu Team Lead phê duyệt.'
  };
}

// Step 5: Create with approval workflow
await createOrderWithApproval({
  order: orderData,
  createdBy: 'huong_id',
  requiresApprovalFrom: 'team_lead_id' // Chị Lan
});
```

**Kết quả**: ❌ **TỪ CHỐI** - Chị Hương không thể tạo đơn hàng 15M VND vì:
1. Template INTERN có giới hạn maxRecordValue = 10M VND
2. Đơn hàng 15M VND vượt quá giới hạn
3. Cần yêu cầu Team Lead (Chị Lan) phê duyệt

**Giải pháp**:
- Chị Hương tạo draft order và request approval từ Chị Lan
- Chị Lan review và approve (nếu giá trị ≤20M) hoặc escalate lên Anh Minh (nếu >20M)

### Ví Dụ 3: Chị Lan (Team Lead) Chuyển Khách Hàng Sang Team Khác

**Kịch bản**: Chị Lan muốn chuyển khách hàng "Công ty DEF" từ Team A sang Team B (cùng phòng Sales).

```typescript
// Step 1: Lấy template của user
const userTemplate = await getUserPermissionTemplate(userId: 'lan_id');
// Result: TEAM_LEAD Template (priority: 600, hierarchyLevel: 3)

// Step 2: Kiểm tra quyền TRANSFER_CUSTOMER
const hasTransferPermission = await checkSystemAction({
  template: userTemplate,
  action: 'TRANSFER_CUSTOMER'
});
// Result: ✅ Có quyền TRANSFER_CUSTOMER

// Step 3: Kiểm tra phạm vi transfer
const transferScope = await getAccessLimitations({
  templateId: 'team_lead_template_id',
  action: 'TRANSFER_CUSTOMER'
});
// Result: scopeLimitation = "WITHIN_TEAM" (default)
//         crossTeamRequiresApproval = true

// Step 4: Validate target team
if (targetTeam.departmentId === user.departmentId &&
    targetTeam.id !== user.teamId) {
  // Cross-team within department
  return {
    allowed: true,
    requiresApproval: true,
    approverRole: 'MANAGER',
    message: 'Chuyển khách hàng sang team khác cần Manager phê duyệt.'
  };
}

// Step 5: Create approval request
await createTransferApprovalRequest({
  customer: 'def_company_id',
  fromTeam: 'team_a_id',
  toTeam: 'team_b_id',
  requestedBy: 'lan_id',
  approver: 'minh_id' // Anh Minh - Manager
});
```

**Kết quả**: ⚠️ **CẦN PHÊ DUYỆT** - Chị Lan có thể chuyển khách hàng nhưng cần approval vì:
1. Template TEAM_LEAD có quyền TRANSFER_CUSTOMER
2. Transfer cross-team (Team A → Team B) cần Manager approval
3. Transfer trong cùng department nên không bị reject hoàn toàn

**Workflow tiếp theo**:
1. Chị Lan tạo transfer request
2. Anh Minh nhận notification để approve/reject
3. Nếu Anh Minh approve → Customer được chuyển sang Team B
4. Nếu Anh Minh reject → Customer giữ nguyên ở Team A, Chị Lan nhận thông báo lý do

## Quan Hệ Giữa Các Entity (Entity Relationships)

```
MktPermissionTemplate (1) ──────┐
                                │
                                ├─► (Many) MktTemplateResourcePermission
                                │           - Quyền trên từng resource (Customer, Order, etc.)
                                │           - Actions: READ, CREATE, UPDATE, DELETE, etc.
                                │           - Context: ALL_RECORDS, DEPARTMENT, TEAM, OWN
                                │
                                ├─► (Many) MktTemplateSystemAction
                                │           - Các thao tác hệ thống (ASSIGN_CUSTOMER, APPROVE, etc.)
                                │           - requiresApproval, requiresMFA
                                │           - Execution constraints
                                │
                                ├─► (Many) MktTemplateAccessLimitation
                                │           - Giới hạn cụ thể (maxRecordValue, allowedPriorities, etc.)
                                │           - Time-based restrictions
                                │           - IP/Location restrictions
                                │
                                ├─► (Many) MktDataAccessPolicy
                                │           - Chính sách lọc dữ liệu
                                │           - SQL contextFilter
                                │           - Department/Level based filtering
                                │
                                └─► (Many) MktUserPermissionTemplate
                                            - Gán template cho users
                                            - effectiveFrom, effectiveTo
                                            - isActive, assignedBy
```

### Chi Tiết Các Quan Hệ

#### 1. Template → Resource Permissions (1:N)

```typescript
// Template MANAGER có nhiều Resource Permissions
{
  template: MANAGER_TEMPLATE,
  resourcePermissions: [
    {
      resourceType: 'CUSTOMER',
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canExport: true,
      contextScope: 'DEPARTMENT_RECORDS'
    },
    {
      resourceType: 'ORDER',
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false, // Không thể xóa order
      canExport: true,
      contextScope: 'DEPARTMENT_RECORDS'
    },
    // ... more resources
  ]
}
```

#### 2. Template → System Actions (1:N)

```typescript
// Template MANAGER có nhiều System Actions
{
  template: MANAGER_TEMPLATE,
  systemActions: [
    {
      actionKey: 'APPROVE_ORDER',
      isAllowed: true,
      requiresApproval: false,
      requiresMFA: false,
      constraints: {
        maxAmount: 50000000 // 50M VND
      }
    },
    {
      actionKey: 'ASSIGN_CUSTOMER',
      isAllowed: true,
      requiresApproval: false,
      constraints: {
        scopeLimitation: 'DEPARTMENT'
      }
    },
    // ... more actions
  ]
}
```

#### 3. Template → Access Limitations (1:N)

```typescript
// Template INTERN có nhiều Access Limitations
{
  template: INTERN_TEMPLATE,
  accessLimitations: [
    {
      limitationType: 'RECORD_VALUE',
      resourceType: 'ORDER',
      maxRecordValue: 10000000, // 10M VND
      enforceStrict: true
    },
    {
      limitationType: 'PRIORITY_LEVEL',
      allowedPriorityLevels: ['LOW'],
      requiresApprovalForHigher: true
    },
    {
      limitationType: 'TIME_RESTRICTION',
      allowedHours: '08:00-18:00',
      allowedDays: 'MON-FRI',
      timezone: 'Asia/Ho_Chi_Minh'
    },
    {
      limitationType: 'MONITORING',
      comprehensiveMonitoring: true,
      logAllActions: true,
      alertOnSuspiciousActivity: true
    }
  ]
}
```

#### 4. Template → Data Access Policies (1:N)

```typescript
// Template TEAM_LEAD có Data Access Policy cho từng Department
{
  template: TEAM_LEAD_TEMPLATE,
  dataAccessPolicies: [
    {
      departmentId: 'sales_dept_id',
      organizationLevelId: 'team_lead_level_id',
      contextFilter: 'TEAM_RECORDS',
      filterLogic: `
        (assignedToTeamId = :userTeamId)
        OR (assignedToUserId = :userId)
        OR (createdByUserId = :userId)
      `,
      canOverride: false,
      isActive: true
    }
  ]
}
```

#### 5. Template → User Assignments (1:N)

```typescript
// Template MANAGER được gán cho nhiều users
{
  template: MANAGER_TEMPLATE,
  userAssignments: [
    {
      userId: 'minh_id',
      workspaceMemberId: 'minh_workspace_member_id',
      assignedBy: 'admin_id',
      assignedAt: '2025-01-01T00:00:00Z',
      effectiveFrom: '2025-01-01T00:00:00Z',
      effectiveTo: null, // Vô thời hạn
      isActive: true,
      assignmentReason: 'Promoted to Sales Manager'
    },
    {
      userId: 'hoa_id',
      workspaceMemberId: 'hoa_workspace_member_id',
      assignedBy: 'admin_id',
      assignedAt: '2025-02-01T00:00:00Z',
      effectiveFrom: '2025-02-01T00:00:00Z',
      effectiveTo: null,
      isActive: true,
      assignmentReason: 'Promoted to Support Manager'
    }
  ]
}
```

## Best Practices

### 1. Quản Lý Templates

#### ✅ Nên làm (DO)
- **Sử dụng system templates** cho các vai trò chuẩn (ADMIN, MANAGER, TEAM_LEAD, STAFF, INTERN)
- **Tạo custom templates** chỉ khi có nhu cầu đặc biệt (ví dụ: "Sales Manager VIP Clients")
- **Version control** cho mọi thay đổi template (increment version number)
- **Document changes** trong description field
- **Test thoroughly** trước khi activate template mới
- **Backup old templates** trước khi deactivate

#### ❌ Không nên làm (DON'T)
- **Không modify system templates** trực tiếp - tạo custom template thay vì
- **Không delete templates** đang được gán cho users
- **Không set priority tùy tiện** - follow standard mapping
- **Không skip version increments** - mỗi change cần bump version
- **Không assign nhiều templates** cùng lúc cho một user (gây conflict)

### 2. Gán Templates Cho Users

#### ✅ Nên làm (DO)
- **Match organization level** với template (MANAGER user → MANAGER template)
- **Set effective dates** rõ ràng (effectiveFrom, effectiveTo)
- **Document assignment reason** để audit sau này
- **Review permissions** sau khi gán để đảm bảo đúng
- **Notify user** về permissions mới

#### ❌ Không nên làm (DON'T)
- **Không gán template** cao hơn organization level của user
- **Không quên set effectiveFrom** - có thể gây áp dụng sai thời điểm
- **Không gán permanent** nếu là temporary role
- **Không skip approval workflow** khi gán sensitive templates

### 3. Thiết Kế Permissions

#### ✅ Nên làm (DO)
- **Follow principle of least privilege** - chỉ cấp quyền cần thiết
- **Use context filters** để giới hạn phạm vi truy cập
- **Set appropriate limitations** cho từng level
- **Enable monitoring** cho sensitive actions
- **Require MFA** cho critical operations
- **Implement approval workflows** cho high-risk actions

#### ❌ Không nên làm (DON'T)
- **Không cấp ALL_RECORDS access** nếu không cần thiết
- **Không skip requiresApproval** cho sensitive actions
- **Không ignore maxRecordValue** constraints
- **Không disable monitoring** cho security reasons

### 4. Troubleshooting

#### Vấn đề: User không có quyền mong đợi

**Kiểm tra**:
```typescript
// 1. Check template assignment
const assignment = await getUserPermissionTemplate(userId);
console.log('Template:', assignment.template.templateKey);
console.log('Priority:', assignment.template.priority);
console.log('Is Active:', assignment.isActive);
console.log('Effective:', assignment.effectiveFrom, '-', assignment.effectiveTo);

// 2. Check resource permissions
const resourcePerms = await getResourcePermissions({
  templateId: assignment.template.id,
  resourceType: 'CUSTOMER'
});
console.log('Can Read:', resourcePerms.canRead);
console.log('Context:', resourcePerms.contextScope);

// 3. Check data access policy
const policy = await getDataAccessPolicy({
  departmentId: user.departmentId,
  organizationLevelId: user.organizationLevelId
});
console.log('Filter:', policy.contextFilter);
console.log('Logic:', policy.filterLogic);

// 4. Check access limitations
const limitations = await getAccessLimitations({
  templateId: assignment.template.id
});
console.log('Limitations:', limitations);
```

#### Vấn đề: Permission conflicts

**Giải quyết**:
```typescript
// Khi user có nhiều templates (không nên, nhưng nếu có)
const templates = await getUserPermissionTemplates(userId);

// Sắp xếp theo priority (cao nhất trước)
const sortedTemplates = templates.sort((a, b) => b.priority - a.priority);

// Template có priority cao nhất sẽ được áp dụng
const effectiveTemplate = sortedTemplates[0];

console.log('Effective Template:', effectiveTemplate.templateKey);
console.log('Priority:', effectiveTemplate.priority);

// Các templates khác chỉ có tác dụng nếu effectiveTemplate không định nghĩa quyền cụ thể
```

## Kết Luận

`MktPermissionTemplateWorkspaceEntity` là nền tảng của hệ thống RBAC, đóng vai trò:

1. **Blueprint cho quyền hạn** - Định nghĩa rõ ràng quyền gì được phép cho từng cấp độ
2. **Tách biệt concerns** - Template định nghĩa quyền, assignment áp dụng cho users
3. **Tái sử dụng** - Một template có thể dùng cho nhiều users cùng level
4. **Quản lý tập trung** - Thay đổi template tự động áp dụng cho tất cả assigned users
5. **Audit và compliance** - Version control và logging đầy đủ
6. **Linh hoạt và mở rộng** - Dễ dàng thêm custom templates khi cần

Hiểu rõ entity này giúp developers:
- Implement permission checks chính xác
- Design RBAC workflows hiệu quả
- Debug permission issues nhanh chóng
- Extend system an toàn khi có yêu cầu mới

---

**Document Version**: 1.0.0
**Last Updated**: 2025-09-30
**Author**: Development Team
**Related Guides**:
- `RBAC_SIMPLIFIED_SETUP_GUIDE.md`
- `RBAC_ROLE_PERMISSION_SETUP_GUIDE.md`
- `CACHE_IMPLEMENTATION_GUIDE.md`