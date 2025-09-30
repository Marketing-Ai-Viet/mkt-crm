# RBAC Setup Guide - Simplified for Admin, Sales, Support

## Tổng quan

Document này hướng dẫn thiết lập phân quyền **đơn giản** cho **3 vai trò chính**:
- **Admin**: Quản trị hệ thống
- **Sales**: Nhân viên kinh doanh
- **Support**: Nhân viên hỗ trợ khách hàng

---

## 📊 Cấu trúc đơn giản hóa

### 1. Organization Levels (5 cấp)

Thay vì 11 cấp phức tạp, chỉ cần **5 cấp bậc cơ bản**:

| Level | Code | Tên | Mô tả | Priority |
|-------|------|-----|-------|----------|
| 1 | ADMIN | Admin / Quản trị viên | Toàn quyền quản trị hệ thống | 1000 |
| 2 | MANAGER | Manager / Quản lý | Quản lý team và duyệt các thao tác quan trọng | 700 |
| 3 | TEAM_LEAD | Team Lead / Trưởng nhóm | Dẫn dắt nhóm nhỏ, phân công công việc | 600 |
| 4 | STAFF | Staff / Nhân viên | Thực hiện công việc hàng ngày | 500 |
| 5 | INTERN | Intern / Thực tập sinh | Quyền hạn hạn chế, đang học tập | 300 |

**Mapping với các role:**

```yaml
Admin Role:
  - Admin level: ADMIN (Level 1)
  - Manager level: MANAGER (Level 2)

Sales Role:
  - Manager level: MANAGER (Level 2)
  - Team Lead level: TEAM_LEAD (Level 3)
  - Staff level: STAFF (Level 4)
  - Intern level: INTERN (Level 5)

Support Role:
  - Manager level: MANAGER (Level 2)
  - Team Lead level: TEAM_LEAD (Level 3)
  - Staff level: STAFF (Level 4)
  - Intern level: INTERN (Level 5)
```

---

### 2. Departments (3 phòng ban)

| Code | Tên | Cross-Dept Access | Mô tả |
|------|-----|-------------------|-------|
| ADMIN | Phòng Hành chính | ✅ Yes | Quản trị hệ thống, truy cập tất cả dữ liệu |
| SALES | Phòng Kinh doanh | ✅ Yes | Quản lý khách hàng, đơn hàng |
| SUPPORT | Phòng Hỗ trợ KH | ❌ No | Hỗ trợ khách hàng, xử lý tickets |

**Department Relationships:**

```
ADMIN (Parent)
  ├── SALES (Supervisory relationship)
  └── SUPPORT (Supervisory relationship)

SALES ↔ SUPPORT (Peer collaboration)
```

---

## 🎯 Permission Matrix

### Ma trận quyền theo Role và Level

#### 1. ADMIN Department

| Level | Khách hàng | Đơn hàng | Hóa đơn | Users | Sensitive Data | Cross-Dept |
|-------|-----------|----------|---------|-------|----------------|------------|
| **ADMIN** | Full CRUD | Full CRUD | Full CRUD | Full CRUD | ✅ Full Access | ✅ All |
| **MANAGER** | Full CRUD | Full CRUD | Read/Update | Create/Read/Update | ⚠️ Limited | ✅ All |

**Admin Level Permissions:**
```typescript
{
  customers: {
    create: true,
    read: "ALL",
    update: "ALL",
    delete: true,
    export: true
  },

  orders: {
    create: true,
    read: "ALL",
    update: "ALL",
    delete: true,
    approve: true,
    export: true
  },

  invoices: {
    create: true,
    read: "ALL",
    update: "ALL",
    delete: true,
    export: true
  },

  users: {
    create: true,
    read: "ALL",
    update: "ALL",
    delete: true,
    assignRoles: true,
    changePermissions: true
  },

  system: {
    viewLogs: true,
    changeSettings: true,
    accessSensitiveData: true,
    exportAllData: true
  },

  crossDepartment: {
    viewAll: true,
    editAll: true
  }
}
```

**Manager (Admin Dept) Permissions:**
```typescript
{
  customers: {
    create: true,
    read: "ALL",
    update: "ALL",
    delete: false,  // Chỉ Admin mới delete
    export: true
  },

  orders: {
    create: true,
    read: "ALL",
    update: "ALL",
    approve: "amount <= 100000000",  // Duyệt đơn <= 100 triệu
    delete: false
  },

  users: {
    create: true,
    read: "ALL",
    update: "hierarchyLevel >= 3",  // Chỉ update Team Lead trở xuống
    assignRoles: "hierarchyLevel >= 3"
  },

  crossDepartment: {
    viewAll: true,
    editAll: false  // Chỉ xem, không sửa
  }
}
```

---

#### 2. SALES Department

| Level | Khách hàng | Đơn hàng | Hóa đơn | Reports | Sensitive Data |
|-------|-----------|----------|---------|---------|----------------|
| **MANAGER** | Team + Own | Team + Own | Read Only | Department | ⚠️ Limited |
| **TEAM_LEAD** | Team + Own | Team + Own | Read Only | Team | ❌ No |
| **STAFF** | Own Only | Own Only | Read Only | Own | ❌ No |
| **INTERN** | Read Own | Read Own | No Access | No | ❌ No |

**Sales Manager Permissions:**
```typescript
{
  customers: {
    create: true,
    read: "WHERE accountOwnerId IN (userId, teamMemberIds)",
    update: "WHERE accountOwnerId IN (userId, teamMemberIds)",
    delete: false,
    export: "WHERE accountOwnerId IN (userId, teamMemberIds)",

    // Filters
    statusFilter: {
      allowedValues: ["active", "prospect", "lead"],
      deniedValues: ["archived", "blocked"]
    }
  },

  orders: {
    create: true,
    read: "WHERE accountOwnerId IN (customerIds)",
    update: "WHERE accountOwnerId = userId AND status = 'draft'",
    approve: "WHERE amount <= 50000000",  // Duyệt đơn <= 50 triệu
    delete: false,

    // Filters
    timeRange: "createdAt >= NOW() - INTERVAL '365 days'",
    statusFilter: {
      deniedValues: ["deleted", "void"]
    }
  },

  invoices: {
    create: false,  // Chỉ Accounting/Admin tạo invoice
    read: "WHERE customerId IN (customerIds)",
    update: false,
    delete: false
  },

  reports: {
    viewDepartmentReports: true,
    viewTeamReports: true,
    viewOwnReports: true,
    exportReports: true
  },

  sensitiveData: {
    viewCustomerPaymentInfo: false,  // Chỉ Admin/Accounting
    viewCustomerContract: true,
    viewPricing: true
  }
}
```

**Sales Team Lead Permissions:**
```typescript
{
  customers: {
    create: true,
    read: "WHERE accountOwnerId IN (userId, directReportIds)",
    update: "WHERE accountOwnerId IN (userId, directReportIds)",
    delete: false,
    export: "WHERE accountOwnerId IN (userId, directReportIds)"
  },

  orders: {
    create: true,
    read: "WHERE accountOwnerId IN (customerIds)",
    update: "WHERE accountOwnerId = userId",
    approve: "WHERE amount <= 20000000",  // Duyệt đơn <= 20 triệu
    delete: false
  },

  invoices: {
    create: false,
    read: "WHERE customerId IN (customerIds)",
    update: false,
    delete: false
  },

  reports: {
    viewTeamReports: true,
    viewOwnReports: true,
    exportReports: false  // Chỉ Manager mới export
  }
}
```

**Sales Staff Permissions:**
```typescript
{
  customers: {
    create: true,
    read: "WHERE accountOwnerId = userId",  // Chỉ xem khách hàng của mình
    update: "WHERE accountOwnerId = userId",
    delete: false,
    export: false  // Không export
  },

  orders: {
    create: true,
    read: "WHERE accountOwnerId = userId",
    update: "WHERE accountOwnerId = userId AND status = 'draft'",
    approve: false,  // Không có quyền duyệt
    delete: false
  },

  invoices: {
    create: false,
    read: "WHERE customerId IN (ownCustomerIds)",
    update: false,
    delete: false
  },

  reports: {
    viewOwnReports: true,
    viewTeamReports: false,
    exportReports: false
  }
}
```

**Sales Intern Permissions:**
```typescript
{
  customers: {
    create: false,  // Không tạo mới
    read: "WHERE accountOwnerId = userId",  // Read-only
    update: false,
    delete: false,
    export: false
  },

  orders: {
    create: false,
    read: "WHERE accountOwnerId = userId",  // Read-only
    update: false,
    delete: false
  },

  invoices: {
    create: false,
    read: false,  // Không xem invoice
    update: false,
    delete: false
  },

  reports: {
    viewOwnReports: true,  // Chỉ xem report của mình
    viewTeamReports: false
  },

  restrictions: {
    requiresSupervisorApproval: true,  // Mọi thao tác cần supervisor approve
    readOnlyMode: true
  }
}
```

---

#### 3. SUPPORT Department

| Level | Khách hàng | Tickets | Orders | Knowledge Base | Sensitive Data |
|-------|-----------|---------|--------|----------------|----------------|
| **MANAGER** | All Recent | All | Read Team | Full Access | ⚠️ Limited |
| **TEAM_LEAD** | Team Assigned | Team | Read Team | Full Access | ❌ No |
| **STAFF** | Own Assigned | Own | Read Own | Full Access | ❌ No |
| **INTERN** | Read Assigned | Read Own | No Access | Read Only | ❌ No |

**Support Manager Permissions:**
```typescript
{
  customers: {
    create: false,  // Support không tạo customer
    read: "WHERE updatedAt >= NOW() - INTERVAL '90 days'",  // Xem customers có activity trong 90 ngày
    update: "WHERE supportTicketStatus = 'open'",  // Chỉ update khi có ticket open
    delete: false,

    // Filters
    statusFilter: {
      allowedValues: ["active", "pending_support"],
      deniedValues: ["archived"]
    },

    supportLevel: {
      enabled: true,
      maxLevel: "tier2"  // Manager xem được tier2
    }
  },

  tickets: {
    create: true,
    read: "ALL",  // Xem tất cả tickets trong department
    update: "ALL",
    assign: true,  // Phân công tickets
    close: true,
    escalate: true,

    priorityFilter: {
      canHandlePriority: ["low", "medium", "high", "critical"]
    }
  },

  orders: {
    create: false,
    read: "WHERE customerId IN (recentCustomerIds)",  // Xem orders để support
    update: false,
    delete: false
  },

  knowledgeBase: {
    create: true,
    read: "ALL",
    update: "ALL",
    delete: false,
    publish: true
  },

  reports: {
    viewDepartmentReports: true,
    viewTeamReports: true,
    viewSLAReports: true
  },

  sensitiveData: {
    viewCustomerPaymentInfo: false,
    viewCustomerContract: false,
    viewTicketHistory: true
  }
}
```

**Support Team Lead Permissions:**
```typescript
{
  customers: {
    create: false,
    read: "WHERE supportTicketAssignedTo IN (userId, teamMemberIds)",
    update: "WHERE supportTicketAssignedTo IN (userId, teamMemberIds)",
    delete: false
  },

  tickets: {
    create: true,
    read: "WHERE assignedTo IN (userId, teamMemberIds)",
    update: "WHERE assignedTo IN (userId, teamMemberIds)",
    assign: "WHERE assignedTo IN (teamMemberIds)",  // Chỉ assign trong team
    close: true,
    escalate: true,

    priorityFilter: {
      canHandlePriority: ["low", "medium", "high"]  // Không handle critical
    }
  },

  orders: {
    read: "WHERE customerId IN (assignedCustomerIds)"
  },

  knowledgeBase: {
    create: true,
    read: "ALL",
    update: true,
    publish: false  // Chỉ Manager mới publish
  },

  reports: {
    viewTeamReports: true,
    viewOwnReports: true
  }
}
```

**Support Staff Permissions:**
```typescript
{
  customers: {
    create: false,
    read: "WHERE supportTicketAssignedTo = userId",  // Chỉ xem customers có ticket assigned
    update: "WHERE supportTicketAssignedTo = userId",
    delete: false,

    // Restricted fields
    restrictedFields: [
      "paymentInfo",
      "contractDetails",
      "creditLimit"
    ]
  },

  tickets: {
    create: true,
    read: "WHERE assignedTo = userId",  // Chỉ xem tickets của mình
    update: "WHERE assignedTo = userId",
    assign: false,  // Không phân công
    close: "WHERE assignedTo = userId AND priority != 'critical'",
    escalate: true,

    priorityFilter: {
      canHandlePriority: ["low", "medium"]
    }
  },

  orders: {
    read: "WHERE customerId IN (assignedCustomerIds)"
  },

  knowledgeBase: {
    create: true,  // Tạo draft
    read: "ALL",
    update: "WHERE createdBy = userId",  // Chỉ sửa bài của mình
    publish: false
  },

  reports: {
    viewOwnReports: true
  }
}
```

**Support Intern Permissions:**
```typescript
{
  customers: {
    create: false,
    read: "WHERE supportTicketAssignedTo = userId",  // Read-only
    update: false,
    delete: false
  },

  tickets: {
    create: false,  // Không tạo ticket
    read: "WHERE assignedTo = userId",  // Chỉ xem tickets assigned
    update: "WHERE assignedTo = userId AND status = 'in_progress'",  // Chỉ update notes
    close: false,  // Không close tickets
    escalate: true,  // Có thể escalate

    priorityFilter: {
      canHandlePriority: ["low"]  // Chỉ handle tickets priority thấp
    }
  },

  orders: {
    read: false  // Không xem orders
  },

  knowledgeBase: {
    create: false,
    read: "ALL",
    update: false
  },

  reports: {
    viewOwnReports: false  // Không xem reports
  },

  restrictions: {
    requiresSupervisorApproval: true,
    readOnlyMode: true
  }
}
```

---

## 🔐 Data Access Policies

### Policy 1: Sales Customer Ownership

```yaml
name: Sales Customer Ownership Policy
department: SALES
objectName: mktCustomer
priority: 10

rules:
  # Staff và Intern: Chỉ xem customers của mình
  - level: [STAFF, INTERN]
    filter: "accountOwnerId = currentUserId"

  # Team Lead: Xem customers của team
  - level: [TEAM_LEAD]
    filter: "accountOwnerId IN (currentUserId, directReportIds)"

  # Manager: Xem customers của cả department
  - level: [MANAGER]
    filter: "accountOwnerId IN (currentUserId, allTeamMemberIds)"

  # Common filters
  statusFilter:
    allowedValues: [active, prospect, lead]
    deniedValues: [archived, blocked]
```

---

### Policy 2: Sales Order Access

```yaml
name: Sales Order Access Policy
department: SALES
objectName: mktOrder
priority: 8

rules:
  # Staff: Chỉ xem orders từ customers của mình
  - level: [STAFF, INTERN]
    filter: |
      accountOwnerId = currentUserId
      AND createdAt >= NOW() - INTERVAL '365 days'

  # Team Lead: Xem orders của team
  - level: [TEAM_LEAD]
    filter: |
      accountOwnerId IN (currentUserId, directReportIds)
      AND createdAt >= NOW() - INTERVAL '365 days'

  # Manager: Xem all orders của department
  - level: [MANAGER]
    filter: |
      accountOwnerId IN (allTeamMemberIds)
      AND createdAt >= NOW() - INTERVAL '365 days'

  statusFilter:
    deniedValues: [deleted, void]
```

---

### Policy 3: Support Customer Access

```yaml
name: Support Customer Access Policy
department: SUPPORT
objectName: mktCustomer
priority: 7

rules:
  # Staff và Intern: Chỉ xem customers có ticket assigned
  - level: [STAFF, INTERN]
    filter: |
      id IN (
        SELECT customerId FROM supportTickets
        WHERE assignedTo = currentUserId
        AND status IN ('open', 'in_progress')
      )

  # Team Lead: Xem customers có ticket assigned cho team
  - level: [TEAM_LEAD]
    filter: |
      id IN (
        SELECT customerId FROM supportTickets
        WHERE assignedTo IN (currentUserId, teamMemberIds)
        AND status IN ('open', 'in_progress')
      )

  # Manager: Xem all recent customers (90 days)
  - level: [MANAGER]
    filter: "updatedAt >= NOW() - INTERVAL '90 days'"

  statusFilter:
    allowedValues: [active, pending_support]
    deniedValues: [archived]

  supportLevel:
    maxLevel: tier2  # Support chỉ handle tier2 trở xuống
```

---

### Policy 4: Support Ticket Access

```yaml
name: Support Ticket Access Policy
department: SUPPORT
objectName: supportTicket
priority: 9

rules:
  # Staff và Intern: Chỉ xem tickets assigned cho mình
  - level: [STAFF, INTERN]
    filter: "assignedTo = currentUserId"

  # Team Lead: Xem tickets của team
  - level: [TEAM_LEAD]
    filter: "assignedTo IN (currentUserId, teamMemberIds)"

  # Manager: Xem all tickets của department
  - level: [MANAGER]
    filter: "departmentId = currentDepartmentId"

  priorityFilter:
    INTERN: [low]
    STAFF: [low, medium]
    TEAM_LEAD: [low, medium, high]
    MANAGER: [low, medium, high, critical]
```

---

### Policy 5: Admin Full Access

```yaml
name: Admin Full Access Policy
department: ADMIN
objectName: "*"  # All objects
priority: 100  # Highest priority

rules:
  # Admin level: Full access
  - level: [ADMIN]
    filter: "1=1"  # No restrictions

  # Manager level: Cross-department view
  - level: [MANAGER]
    filter: "1=1"  # No restrictions but some actions need approval
    canEdit: "departmentId = currentDepartmentId"  # Chỉ edit own department

  restrictions:
    ADMIN:
      requiresMFA: true
      requiresFullAuditTrail: true

    MANAGER:
      requiresMFA: false
      requiresFullAuditTrail: true
      requiresDualApproval: [user_delete, data_export_all]
```

---

## 💻 Implementation

### Bước 1: Database Setup

```sql
-- Create simplified organization levels
INSERT INTO "workspace_xxx"."mktOrganizationLevel"
  (id, "levelCode", "levelName", "levelNameEn", "hierarchyLevel", "displayOrder", "isActive")
VALUES
  (uuid_generate_v4(), 'ADMIN', 'Quản trị viên', 'Admin', 1, 1, true),
  (uuid_generate_v4(), 'MANAGER', 'Quản lý', 'Manager', 2, 2, true),
  (uuid_generate_v4(), 'TEAM_LEAD', 'Trưởng nhóm', 'Team Lead', 3, 3, true),
  (uuid_generate_v4(), 'STAFF', 'Nhân viên', 'Staff', 4, 4, true),
  (uuid_generate_v4(), 'INTERN', 'Thực tập sinh', 'Intern', 5, 5, true);

-- Departments already exist: ADMIN, SALES, SUPPORT

-- Create simplified permission templates
INSERT INTO "workspace_xxx"."mktPermissionTemplate"
  (id, "templateKey", "templateName", "hierarchyLevel", "applicableToLevels", "priority", "isSystemTemplate", "isActive")
VALUES
  (uuid_generate_v4(), 'ADMIN', 'Admin Template', 1, '[1]', 1000, true, true),
  (uuid_generate_v4(), 'MANAGER', 'Manager Template', 2, '[2]', 700, true, true),
  (uuid_generate_v4(), 'TEAM_LEAD', 'Team Lead Template', 3, '[3]', 600, true, true),
  (uuid_generate_v4(), 'STAFF', 'Staff Template', 4, '[4]', 500, true, true),
  (uuid_generate_v4(), 'INTERN', 'Intern Template', 5, '[5]', 300, true, true);
```

---

### Bước 2: Assign Users to Roles

```typescript
// File: scripts/assign-simplified-roles.ts

interface UserRoleAssignment {
  email: string;
  department: 'ADMIN' | 'SALES' | 'SUPPORT';
  level: 'ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'STAFF' | 'INTERN';
}

const userAssignments: UserRoleAssignment[] = [
  // Admin Department
  { email: 'admin@company.com', department: 'ADMIN', level: 'ADMIN' },
  { email: 'admin.manager@company.com', department: 'ADMIN', level: 'MANAGER' },

  // Sales Department
  { email: 'sales.manager@company.com', department: 'SALES', level: 'MANAGER' },
  { email: 'sales.lead1@company.com', department: 'SALES', level: 'TEAM_LEAD' },
  { email: 'sales.staff1@company.com', department: 'SALES', level: 'STAFF' },
  { email: 'sales.intern1@company.com', department: 'SALES', level: 'INTERN' },

  // Support Department
  { email: 'support.manager@company.com', department: 'SUPPORT', level: 'MANAGER' },
  { email: 'support.lead1@company.com', department: 'SUPPORT', level: 'TEAM_LEAD' },
  { email: 'support.staff1@company.com', department: 'SUPPORT', level: 'STAFF' },
  { email: 'support.intern1@company.com', department: 'SUPPORT', level: 'INTERN' },
];

async function assignRoles() {
  for (const assignment of userAssignments) {
    const user = await findUserByEmail(assignment.email);
    const department = await findDepartmentByCode(assignment.department);
    const orgLevel = await findOrgLevelByCode(assignment.level);
    const template = await findTemplateByLevel(orgLevel.hierarchyLevel);

    await updateWorkspaceMember(user.id, {
      departmentId: department.id,
      organizationLevelId: orgLevel.id,
      permissionTemplateId: template.id
    });

    console.log(`✅ Assigned ${assignment.email} → ${assignment.department} / ${assignment.level}`);
  }
}
```

---

### Bước 3: Create Data Access Policies

```typescript
// File: scripts/setup-simplified-policies.ts

async function setupSimplifiedPolicies() {

  // Policy 1: Sales Customer Ownership
  await createPolicy({
    name: "Sales Customer Ownership",
    departmentCode: "SALES",
    objectName: "mktCustomer",
    priority: 10,
    rules: [
      {
        levels: ["STAFF", "INTERN"],
        filter: "accountOwnerId = currentUserId"
      },
      {
        levels: ["TEAM_LEAD"],
        filter: "accountOwnerId IN (currentUserId, directReportIds)"
      },
      {
        levels: ["MANAGER"],
        filter: "accountOwnerId IN (allTeamMemberIds)"
      }
    ],
    commonFilters: {
      status: {
        allowedValues: ["active", "prospect", "lead"],
        deniedValues: ["archived", "blocked"]
      }
    }
  });

  // Policy 2: Sales Order Access
  await createPolicy({
    name: "Sales Order Access",
    departmentCode: "SALES",
    objectName: "mktOrder",
    priority: 8,
    rules: [
      {
        levels: ["STAFF", "INTERN"],
        filter: "accountOwnerId = currentUserId AND createdAt >= NOW() - INTERVAL '365 days'"
      },
      {
        levels: ["TEAM_LEAD"],
        filter: "accountOwnerId IN (directReportIds) AND createdAt >= NOW() - INTERVAL '365 days'"
      },
      {
        levels: ["MANAGER"],
        filter: "accountOwnerId IN (allTeamMemberIds) AND createdAt >= NOW() - INTERVAL '365 days'"
      }
    ],
    commonFilters: {
      status: {
        deniedValues: ["deleted", "void"]
      }
    }
  });

  // Policy 3: Support Customer Access
  await createPolicy({
    name: "Support Customer Access",
    departmentCode: "SUPPORT",
    objectName: "mktCustomer",
    priority: 7,
    rules: [
      {
        levels: ["STAFF", "INTERN"],
        filter: `id IN (
          SELECT customerId FROM supportTickets
          WHERE assignedTo = currentUserId
          AND status IN ('open', 'in_progress')
        )`
      },
      {
        levels: ["TEAM_LEAD"],
        filter: `id IN (
          SELECT customerId FROM supportTickets
          WHERE assignedTo IN (teamMemberIds)
          AND status IN ('open', 'in_progress')
        )`
      },
      {
        levels: ["MANAGER"],
        filter: "updatedAt >= NOW() - INTERVAL '90 days'"
      }
    ],
    commonFilters: {
      status: {
        allowedValues: ["active", "pending_support"],
        deniedValues: ["archived"]
      }
    }
  });

  // Policy 4: Support Ticket Access
  await createPolicy({
    name: "Support Ticket Access",
    departmentCode: "SUPPORT",
    objectName: "supportTicket",
    priority: 9,
    rules: [
      {
        levels: ["STAFF", "INTERN"],
        filter: "assignedTo = currentUserId"
      },
      {
        levels: ["TEAM_LEAD"],
        filter: "assignedTo IN (teamMemberIds)"
      },
      {
        levels: ["MANAGER"],
        filter: "departmentId = currentDepartmentId"
      }
    ],
    priorityFilter: {
      INTERN: ["low"],
      STAFF: ["low", "medium"],
      TEAM_LEAD: ["low", "medium", "high"],
      MANAGER: ["low", "medium", "high", "critical"]
    }
  });

  // Policy 5: Admin Full Access
  await createPolicy({
    name: "Admin Full Access",
    departmentCode: "ADMIN",
    objectName: "*",
    priority: 100,
    rules: [
      {
        levels: ["ADMIN"],
        filter: "1=1"  // No restrictions
      },
      {
        levels: ["MANAGER"],
        filter: "1=1"  // View all, edit own department only
      }
    ],
    restrictions: {
      ADMIN: {
        requiresMFA: true,
        requiresFullAuditTrail: true
      },
      MANAGER: {
        requiresDualApproval: ["user_delete", "data_export_all"]
      }
    }
  });
}
```

---

### Bước 4: Simplified Permission Resolver

```typescript
// File: packages/twenty-server/src/mkt-core/mkt-rbac-simplified/permission-resolver.service.ts

@Injectable()
export class SimplifiedPermissionResolverService {

  async checkPermission(
    workspaceMemberId: string,
    action: string,
    objectName: string,
    recordId?: string
  ): Promise<PermissionResult> {

    // Step 1: Get user info
    const user = await this.getUserInfo(workspaceMemberId);

    // Step 2: Check if Admin → Full access
    if (user.organizationLevel.levelCode === 'ADMIN') {
      return {
        allowed: true,
        filters: [],
        requiresMFA: true,
        requiresAudit: true
      };
    }

    // Step 3: Get applicable policies
    const policies = await this.getPolicies(
      user.departmentId,
      user.organizationLevel.hierarchyLevel,
      objectName
    );

    // Step 4: Apply policies and build filters
    const filters = this.buildFilters(policies, user, action);

    // Step 5: Check action permissions
    const actionAllowed = this.checkActionPermission(
      action,
      user.organizationLevel.levelCode,
      user.departmentCode
    );

    if (!actionAllowed) {
      return {
        allowed: false,
        reason: `Action '${action}' not allowed for ${user.organizationLevel.levelName}`
      };
    }

    return {
      allowed: true,
      filters,
      restrictions: this.getRestrictions(user, action)
    };
  }

  private checkActionPermission(
    action: string,
    levelCode: string,
    departmentCode: string
  ): boolean {

    // Define action matrix
    const actionMatrix: Record<string, Record<string, string[]>> = {
      create: {
        ADMIN: ['ADMIN', 'MANAGER'],
        SALES: ['MANAGER', 'TEAM_LEAD', 'STAFF'],
        SUPPORT: ['MANAGER', 'TEAM_LEAD', 'STAFF']
      },
      read: {
        ADMIN: ['ADMIN', 'MANAGER'],
        SALES: ['MANAGER', 'TEAM_LEAD', 'STAFF', 'INTERN'],
        SUPPORT: ['MANAGER', 'TEAM_LEAD', 'STAFF', 'INTERN']
      },
      update: {
        ADMIN: ['ADMIN', 'MANAGER'],
        SALES: ['MANAGER', 'TEAM_LEAD', 'STAFF'],
        SUPPORT: ['MANAGER', 'TEAM_LEAD', 'STAFF']
      },
      delete: {
        ADMIN: ['ADMIN'],
        SALES: [],
        SUPPORT: []
      },
      approve: {
        ADMIN: ['ADMIN', 'MANAGER'],
        SALES: ['MANAGER', 'TEAM_LEAD'],
        SUPPORT: ['MANAGER']
      }
    };

    const allowedLevels = actionMatrix[action]?.[departmentCode] || [];
    return allowedLevels.includes(levelCode);
  }

  private buildFilters(
    policies: DataAccessPolicy[],
    user: UserContext,
    action: string
  ): string[] {

    const filters: string[] = [];

    for (const policy of policies) {
      // Find rule for user's level
      const rule = policy.rules.find(r =>
        r.levels.includes(user.organizationLevel.levelCode)
      );

      if (rule) {
        // Replace placeholders
        let filter = rule.filter;
        filter = filter.replace('currentUserId', `'${user.id}'`);
        filter = filter.replace('currentDepartmentId', `'${user.departmentId}'`);

        // Get team member IDs
        if (filter.includes('directReportIds')) {
          const directReports = await this.getDirectReports(user.id);
          filter = filter.replace(
            'directReportIds',
            directReports.map(id => `'${id}'`).join(',')
          );
        }

        if (filter.includes('allTeamMemberIds')) {
          const teamMembers = await this.getAllTeamMembers(user.departmentId);
          filter = filter.replace(
            'allTeamMemberIds',
            teamMembers.map(id => `'${id}'`).join(',')
          );
        }

        filters.push(filter);
      }

      // Add common filters
      if (policy.commonFilters) {
        if (policy.commonFilters.status) {
          if (policy.commonFilters.status.allowedValues) {
            filters.push(
              `status IN (${policy.commonFilters.status.allowedValues.map(v => `'${v}'`).join(',')})`
            );
          }
          if (policy.commonFilters.status.deniedValues) {
            filters.push(
              `status NOT IN (${policy.commonFilters.status.deniedValues.map(v => `'${v}'`).join(',')})`
            );
          }
        }
      }
    }

    return filters;
  }
}
```

---

## 🧪 Testing

### Test Scenarios

```typescript
describe('Simplified RBAC Tests', () => {

  describe('Sales Staff', () => {
    let salesStaff: User;

    beforeEach(async () => {
      salesStaff = await createUser({
        email: 'sales.staff@test.com',
        department: 'SALES',
        level: 'STAFF'
      });
    });

    it('should see own customers only', async () => {
      const ownCustomer = await createCustomer({ accountOwnerId: salesStaff.id });
      const otherCustomer = await createCustomer({ accountOwnerId: 'other-user-id' });

      const result = await permissionResolver.checkPermission(
        salesStaff.id,
        'read',
        'mktCustomer'
      );

      expect(result.filters).toContain(`accountOwnerId = '${salesStaff.id}'`);
    });

    it('should create new customers', async () => {
      const result = await permissionResolver.checkPermission(
        salesStaff.id,
        'create',
        'mktCustomer'
      );

      expect(result.allowed).toBe(true);
    });

    it('should not delete customers', async () => {
      const result = await permissionResolver.checkPermission(
        salesStaff.id,
        'delete',
        'mktCustomer'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('Support Manager', () => {
    let supportManager: User;

    beforeEach(async () => {
      supportManager = await createUser({
        email: 'support.manager@test.com',
        department: 'SUPPORT',
        level: 'MANAGER'
      });
    });

    it('should see recent customers (90 days)', async () => {
      const result = await permissionResolver.checkPermission(
        supportManager.id,
        'read',
        'mktCustomer'
      );

      expect(result.filters).toContain("updatedAt >= NOW() - INTERVAL '90 days'");
    });

    it('should see all department tickets', async () => {
      const result = await permissionResolver.checkPermission(
        supportManager.id,
        'read',
        'supportTicket'
      );

      expect(result.filters).toContain(`departmentId = '${supportManager.departmentId}'`);
    });
  });

  describe('Admin', () => {
    let admin: User;

    beforeEach(async () => {
      admin = await createUser({
        email: 'admin@test.com',
        department: 'ADMIN',
        level: 'ADMIN'
      });
    });

    it('should have full access to all data', async () => {
      const result = await permissionResolver.checkPermission(
        admin.id,
        'read',
        'mktCustomer'
      );

      expect(result.allowed).toBe(true);
      expect(result.filters).toEqual([]);  // No filters
    });

    it('should require MFA for sensitive actions', async () => {
      const result = await permissionResolver.checkPermission(
        admin.id,
        'delete',
        'workspaceMember'
      );

      expect(result.requiresMFA).toBe(true);
    });
  });
});
```

---

## 📋 Quick Start Checklist

### Week 1: Setup
- [ ] Tạo 5 organization levels (ADMIN, MANAGER, TEAM_LEAD, STAFF, INTERN)
- [ ] Xác nhận 3 departments tồn tại (ADMIN, SALES, SUPPORT)
- [ ] Tạo 5 permission templates
- [ ] Assign organization levels cho tất cả users hiện tại

### Week 2: Policies
- [ ] Tạo Sales Customer Ownership Policy
- [ ] Tạo Sales Order Access Policy
- [ ] Tạo Support Customer Access Policy
- [ ] Tạo Support Ticket Access Policy
- [ ] Tạo Admin Full Access Policy

### Week 3: Implementation
- [ ] Implement SimplifiedPermissionResolverService
- [ ] Integrate với GraphQL query runner
- [ ] Add permission checks vào mutations
- [ ] Test với sample data

### Week 4: Testing & Rollout
- [ ] Unit tests cho 3 departments
- [ ] Integration tests cho cross-department scenarios
- [ ] Pilot với 5-10 users
- [ ] Collect feedback và adjust
- [ ] Full rollout

---

## 🎯 Summary

**3 Departments:**
- Admin (Quản trị)
- Sales (Kinh doanh)
- Support (Hỗ trợ KH)

**5 Organization Levels:**
- Admin (Level 1)
- Manager (Level 2)
- Team Lead (Level 3)
- Staff (Level 4)
- Intern (Level 5)

**5 Core Policies:**
1. Sales Customer Ownership
2. Sales Order Access
3. Support Customer Access
4. Support Ticket Access
5. Admin Full Access

**Đơn giản hơn 70%** so với version đầy đủ, phù hợp cho SME và startup!

---

**Document Version**: 2.0.0 (Simplified)
**Last Updated**: 2025-09-30
**Status**: ✅ Ready for Implementation