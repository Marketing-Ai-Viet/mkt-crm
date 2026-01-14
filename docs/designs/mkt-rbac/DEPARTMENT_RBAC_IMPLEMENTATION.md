# Triển Khai Hệ Thống Phân Quyền Theo Role và Phòng Ban

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Mô Hình Dữ Liệu](#2-mô-hình-dữ-liệu)
3. [Luồng Phân Quyền](#3-luồng-phân-quyền)
4. [Thiết Lập Cơ Bản](#4-thiết-lập-cơ-bản)
5. [Cấu Hình Permission Template](#5-cấu-hình-permission-template)
6. [Data Access Policy Theo Phòng Ban](#6-data-access-policy-theo-phòng-ban)
7. [Gán Quyền Cho Nhân Viên](#7-gán-quyền-cho-nhân-viên)
8. [Use Cases Thực Tế](#8-use-cases-thực-tế)
9. [GraphQL API](#9-graphql-api)
10. [Troubleshooting](#10-troubleshooting)
11. [Use Case: Customer Ownership với Hierarchy và Support](#11-use-case-customer-ownership-với-hierarchy-và-support)

---

## 1. Tổng Quan

### 1.1 Mục Tiêu

Hệ thống phân quyền được thiết kế để:

- **Phân quyền theo Role**: CEO, Director, Manager, Staff có quyền khác nhau
- **Phân quyền theo Phòng Ban**: Nhân viên phòng Sales chỉ xem được data của phòng Sales
- **Phân quyền theo Cấp Bậc**: Manager xem được data của cấp dưới trong phòng ban
- **Kiểm soát Resource**: Mỗi role chỉ truy cập được các resource được phép

### 1.2 Nguyên Tắc Core

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION = f(Role, Department, Resource)   │
├─────────────────────────────────────────────────────────────────┤
│  User Permission = Template Permissions                         │
│                  + Department Scope                             │
│                  + Hierarchy Level                              │
│                  + Data Access Policies                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Database Schema Overview

```
┌──────────────────────┐      ┌─────────────────────────┐
│   workspaceMember    │──────│    mktDepartment        │
│   (Nhân viên)        │      │    (Phòng ban)          │
├──────────────────────┤      ├─────────────────────────┤
│ - departmentId       │      │ - departmentCode        │
│ - organizationLevelId│      │ - leaderId              │
│ - userId             │      │ - subLeaderId           │
└──────────┬───────────┘      │ - allowsCrossDeptAccess │
           │                  └─────────────────────────┘
           │
           ▼
┌──────────────────────┐      ┌─────────────────────────┐
│mktUserPermissionTmpl │──────│ mktPermissionTemplate   │
│   (Gán template)     │      │ (Template quyền)        │
├──────────────────────┤      ├─────────────────────────┤
│ - workspaceMemberId  │      │ - templateKey           │
│ - templateId         │      │ - templateType          │
│ - assignedAt         │      │ - hierarchyLevel        │
│ - expiresAt          │      │ - departmentType        │
└──────────────────────┘      │ - resolutionStrategy    │
                              └───────────┬─────────────┘
                                          │
                                          ▼
┌──────────────────────┐      ┌─────────────────────────┐
│mktTemplateResource   │──────│ mktPermissionResource   │
│    Permission        │      │ (Resource definitions)  │
├──────────────────────┤      ├─────────────────────────┤
│ - templateId         │      │ - resourceKey           │
│ - resourceId         │      │ - resourceCategory      │
│ - allowedActions[]   │      │ - isSystemResource      │
│ - deniedActions[]    │      └─────────────────────────┘
│ - conditions         │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐      ┌─────────────────────────┐
│  mktDataAccessPolicy │──────│     mktCasbinRule       │
│ (Row-level security) │      │   (Casbin policies)     │
├──────────────────────┤      ├─────────────────────────┤
│ - departmentId       │      │ - ptype (p, g, g2)      │
│ - objectName         │      │ - subject               │
│ - filterConditions   │      │ - object                │
│ - policyType         │      │ - action                │
│ - evaluationMode     │      │ - effect                │
└──────────────────────┘      └─────────────────────────┘
```

---

## 2. Mô Hình Dữ Liệu

### 2.1 Organization Level (Cấp Bậc Tổ Chức)

| Level | Code | Hierarchy | Mô Tả |
|-------|------|-----------|-------|
| 1 | CEO | 1 | Tổng Giám Đốc |
| 2 | C_LEVEL | 2 | C-Suite (CFO, CTO, COO) |
| 3 | VP | 3 | Vice President |
| 4 | SENIOR_DIRECTOR | 4 | Senior Director |
| 5 | DIRECTOR | 5 | Director |
| 6 | SENIOR_MANAGER | 6 | Senior Manager |
| 7 | MANAGER | 7 | Manager |
| 8 | SENIOR_SPECIALIST | 8 | Senior Specialist |
| 9 | SPECIALIST | 9 | Specialist |
| 10 | JUNIOR_SPECIALIST | 10 | Junior Specialist |
| 11 | INTERN | 11 | Thực tập sinh |

### 2.2 Department Type

| Type | Mô Tả | Cross-Dept Access |
|------|-------|-------------------|
| SALES | Phòng Kinh Doanh | Limited |
| MARKETING | Phòng Marketing | Limited |
| FINANCE | Phòng Tài Chính | Restricted |
| HR | Phòng Nhân Sự | Restricted |
| IT | Phòng IT | Full |
| OPERATIONS | Phòng Vận Hành | Limited |
| CUSTOMER_SERVICE | Phòng CSKH | Limited |
| EXECUTIVE | Ban Lãnh Đạo | Full |

### 2.3 Permission Actions

```typescript
const PERMISSION_ACTIONS = {
  // CRUD cơ bản
  READ: 'READ',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // Operations nâng cao
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  BULK_CREATE: 'BULK_CREATE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',

  // Approval workflow
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',

  // Team management
  MANAGE_TEAM: 'MANAGE_TEAM',
  ASSIGN_TASKS: 'ASSIGN_TASKS',
  VIEW_TEAM_REPORTS: 'VIEW_TEAM_REPORTS',

  // Sensitive data
  ACCESS_SALARY_DATA: 'ACCESS_SALARY_DATA',
  VIEW_FINANCIAL_REPORTS: 'VIEW_FINANCIAL_REPORTS',
} as const;
```

### 2.4 Resources

| Resource Key | Category | Mô Tả |
|--------------|----------|-------|
| mktCustomer | CRM | Khách hàng |
| mktOrder | SALES | Đơn hàng |
| mktInvoice | FINANCE | Hóa đơn |
| mktPayment | FINANCE | Thanh toán |
| mktLicense | PRODUCT | License |
| mktDepartment | HR | Phòng ban |
| workspaceMember | HR | Nhân viên |
| mktKpi | REPORTING | KPI |
| mktReport | REPORTING | Báo cáo |

---

## 3. Luồng Phân Quyền

### 3.1 Permission Check Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   User Request (GraphQL/REST)                     │
│            userId, workspaceId, resource, action                  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Step 1: Resolve User Context                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ - Get workspaceMember by userId                            │  │
│  │ - Extract: departmentId, organizationLevelId               │  │
│  │ - Get department info: type, leader, allowsCrossAccess     │  │
│  │ - Get hierarchy level: 1 (CEO) -> 11 (Intern)              │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│               Step 2: Get Permission Templates                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ - Query mktUserPermissionTemplate WHERE member = user       │  │
│  │ - Filter: isActive = true, not expired                     │  │
│  │ - Join mktPermissionTemplate for template details          │  │
│  │ - Sort by priority (lower = higher priority)               │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│            Step 3: Check Resource Permissions                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ - Query mktTemplateResourcePermission for resource         │  │
│  │ - Check if action in allowedActions[]                      │  │
│  │ - Check if action NOT in deniedActions[]                   │  │
│  │ - Evaluate conditions (if any)                             │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│            Step 4: Apply Data Access Policies                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ - Query mktDataAccessPolicy for objectName                 │  │
│  │ - Filter by: departmentId OR organizationLevelId           │  │
│  │ - Build filterConditions for row-level security            │  │
│  │ - Apply: ROW_LEVEL, COLUMN_LEVEL, FIELD_LEVEL policies     │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Step 5: Casbin Enforcement                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ - Build subject: user:{userId} or role:{templateKey}       │  │
│  │ - Casbin.enforce(subject, resource, action)                │  │
│  │ - Check role inheritance (g policies)                      │  │
│  │ - Apply deny-override: deny wins over allow                │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐      ┌─────────────────────────────────────┐
│   ALLOWED           │      │            DENIED                    │
│   + Data Filters    │      │   PermissionDeniedError              │
│   (dept scope)      │      │   { resource, action, reason }       │
└─────────────────────┘      └─────────────────────────────────────┘
```

### 3.2 Department Scope Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                User thuộc Department: SALES                       │
│                Hierarchy Level: 7 (MANAGER)                       │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│             Determine Data Access Scope                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Level 1-3 (CEO, C-Level, VP):                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Access: ALL DEPARTMENTS                                 │     │
│  │  Filter: none                                            │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Level 4-6 (Director, Senior Manager):                           │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Access: OWN DEPARTMENT + CHILD DEPARTMENTS              │     │
│  │  Filter: departmentId IN (own + descendants)             │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Level 7 (Manager):                                              │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Access: OWN DEPARTMENT + TEAM MEMBERS                   │     │
│  │  Filter: departmentId = own OR createdById = self        │     │
│  │          OR assignedToId = self                          │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Level 8-11 (Specialist, Junior, Intern):                        │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Access: OWN RECORDS ONLY                                │     │
│  │  Filter: createdById = self OR assignedToId = self       │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Thiết Lập Cơ Bản

### 4.1 Tạo Organization Levels

```sql
-- Insert organization levels
INSERT INTO "mktOrganizationLevel"
  ("levelCode", "levelName", "hierarchyLevel", "displayOrder", "isActive")
VALUES
  ('CEO', 'Tổng Giám Đốc', 1, 1, true),
  ('C_LEVEL', 'C-Suite Executive', 2, 2, true),
  ('VP', 'Vice President', 3, 3, true),
  ('SENIOR_DIRECTOR', 'Senior Director', 4, 4, true),
  ('DIRECTOR', 'Director', 5, 5, true),
  ('SENIOR_MANAGER', 'Senior Manager', 6, 6, true),
  ('MANAGER', 'Manager', 7, 7, true),
  ('SENIOR_SPECIALIST', 'Senior Specialist', 8, 8, true),
  ('SPECIALIST', 'Specialist', 9, 9, true),
  ('JUNIOR_SPECIALIST', 'Junior Specialist', 10, 10, true),
  ('INTERN', 'Intern', 11, 11, true);
```

### 4.2 Tạo Departments

```sql
-- Insert departments
INSERT INTO "mktDepartment"
  ("departmentCode", "departmentName", "departmentType",
   "allowsCrossDepartmentAccess", "isActive")
VALUES
  ('EXEC', 'Ban Lãnh Đạo', 'EXECUTIVE', true, true),
  ('SALES', 'Phòng Kinh Doanh', 'SALES', false, true),
  ('SALES-HN', 'Kinh Doanh Hà Nội', 'SALES', false, true),
  ('SALES-HCM', 'Kinh Doanh HCM', 'SALES', false, true),
  ('MKT', 'Phòng Marketing', 'MARKETING', false, true),
  ('FIN', 'Phòng Tài Chính', 'FINANCE', false, true),
  ('HR', 'Phòng Nhân Sự', 'HR', false, true),
  ('IT', 'Phòng IT', 'IT', true, true),
  ('CS', 'Phòng CSKH', 'CUSTOMER_SERVICE', false, true);
```

### 4.3 Tạo Permission Resources

```sql
-- Insert permission resources
INSERT INTO "mktPermissionResource"
  ("resourceKey", "resourceName", "resourceCategory",
   "isSystemResource", "isActive", "displayOrder")
VALUES
  ('mktCustomer', 'Khách hàng', 'CRM', true, true, 1),
  ('mktOrder', 'Đơn hàng', 'SALES', true, true, 2),
  ('mktInvoice', 'Hóa đơn', 'FINANCE', true, true, 3),
  ('mktPayment', 'Thanh toán', 'FINANCE', true, true, 4),
  ('mktLicense', 'License', 'PRODUCT', true, true, 5),
  ('mktDepartment', 'Phòng ban', 'HR', true, true, 6),
  ('workspaceMember', 'Nhân viên', 'HR', true, true, 7),
  ('mktKpi', 'KPI', 'REPORTING', true, true, 8),
  ('mktReport', 'Báo cáo', 'REPORTING', true, true, 9);
```

---

## 5. Cấu Hình Permission Template

### 5.1 Template Types

| Type | Mô Tả | Use Case |
|------|-------|----------|
| ROLE_BASED | Dựa trên vai trò cụ thể | Admin, Sales Rep |
| HIERARCHY_BASED | Dựa trên cấp bậc | CEO có tất cả quyền |
| DEPARTMENT_BASED | Dựa trên loại phòng ban | Finance dept có quyền xem báo cáo tài chính |

### 5.2 Tạo Permission Templates

#### Template cho CEO/Executive

```sql
-- CEO Template - Full Access
INSERT INTO "mktPermissionTemplate" (
  "templateKey", "templateName", "templateType",
  "hierarchyLevel", "priority", "isSystemTemplate", "isActive"
) VALUES (
  'CEO_FULL_ACCESS', 'CEO - Toàn quyền', 'HIERARCHY_BASED',
  1, 1, true, true
);

-- Resource permissions cho CEO
INSERT INTO "mktTemplateResourcePermission" (
  "templateId", "resourceId", "allowedActions", "isActive"
)
SELECT
  t.id,
  r.id,
  '["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "IMPORT",
    "APPROVE", "REJECT", "MANAGE_TEAM", "VIEW_FINANCIAL_REPORTS",
    "ACCESS_SALARY_DATA"]'::jsonb,
  true
FROM "mktPermissionTemplate" t, "mktPermissionResource" r
WHERE t."templateKey" = 'CEO_FULL_ACCESS';
```

#### Template cho Director

```sql
-- Director Template
INSERT INTO "mktPermissionTemplate" (
  "templateKey", "templateName", "templateType",
  "hierarchyLevel", "priority", "isSystemTemplate", "isActive"
) VALUES (
  'DIRECTOR_DEPT', 'Director - Quản lý phòng ban', 'HIERARCHY_BASED',
  5, 10, true, true
);

-- Resource permissions cho Director
INSERT INTO "mktTemplateResourcePermission" (
  "templateId", "resourceId", "allowedActions", "deniedActions", "isActive"
)
SELECT
  t.id,
  r.id,
  CASE
    WHEN r."resourceKey" IN ('mktCustomer', 'mktOrder')
      THEN '["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "APPROVE"]'::jsonb
    WHEN r."resourceKey" IN ('mktInvoice', 'mktPayment')
      THEN '["READ", "APPROVE"]'::jsonb
    WHEN r."resourceKey" = 'workspaceMember'
      THEN '["READ", "UPDATE", "MANAGE_TEAM", "VIEW_TEAM_REPORTS"]'::jsonb
    ELSE '["READ"]'::jsonb
  END,
  CASE
    WHEN r."resourceKey" IN ('mktInvoice', 'mktPayment')
      THEN '["DELETE", "ACCESS_SALARY_DATA"]'::jsonb
    ELSE '[]'::jsonb
  END,
  true
FROM "mktPermissionTemplate" t, "mktPermissionResource" r
WHERE t."templateKey" = 'DIRECTOR_DEPT';
```

#### Template cho Manager

```sql
-- Manager Template
INSERT INTO "mktPermissionTemplate" (
  "templateKey", "templateName", "templateType",
  "hierarchyLevel", "priority", "isSystemTemplate", "isActive"
) VALUES (
  'MANAGER_TEAM', 'Manager - Quản lý team', 'HIERARCHY_BASED',
  7, 20, true, true
);

-- Resource permissions cho Manager
INSERT INTO "mktTemplateResourcePermission" (
  "templateId", "resourceId", "allowedActions", "deniedActions",
  "conditions", "isActive"
)
SELECT
  t.id,
  r.id,
  CASE
    WHEN r."resourceKey" IN ('mktCustomer', 'mktOrder')
      THEN '["READ", "CREATE", "UPDATE", "EXPORT"]'::jsonb
    WHEN r."resourceKey" = 'workspaceMember'
      THEN '["READ", "VIEW_TEAM_REPORTS", "ASSIGN_TASKS"]'::jsonb
    ELSE '["READ"]'::jsonb
  END,
  '["DELETE", "APPROVE", "ACCESS_SALARY_DATA", "VIEW_FINANCIAL_REPORTS"]'::jsonb,
  -- Condition: chỉ xem data của team mình
  '{"scope": "TEAM", "filterBy": "departmentId"}'::jsonb,
  true
FROM "mktPermissionTemplate" t, "mktPermissionResource" r
WHERE t."templateKey" = 'MANAGER_TEAM';
```

#### Template cho Sales Staff

```sql
-- Sales Staff Template
INSERT INTO "mktPermissionTemplate" (
  "templateKey", "templateName", "templateType",
  "departmentType", "hierarchyLevel", "priority",
  "isSystemTemplate", "isActive"
) VALUES (
  'SALES_STAFF', 'Nhân viên Sales', 'DEPARTMENT_BASED',
  'SALES', 9, 50, true, true
);

-- Resource permissions cho Sales Staff
INSERT INTO "mktTemplateResourcePermission" (
  "templateId", "resourceId", "allowedActions", "deniedActions",
  "conditions", "isActive"
)
SELECT
  t.id,
  r.id,
  CASE
    WHEN r."resourceKey" = 'mktCustomer'
      THEN '["READ", "CREATE", "UPDATE"]'::jsonb
    WHEN r."resourceKey" = 'mktOrder'
      THEN '["READ", "CREATE", "UPDATE"]'::jsonb
    WHEN r."resourceKey" = 'mktInvoice'
      THEN '["READ"]'::jsonb
    ELSE '[]'::jsonb
  END,
  '["DELETE", "EXPORT", "IMPORT", "APPROVE", "BULK_DELETE"]'::jsonb,
  -- Condition: chỉ xem data do mình tạo hoặc được assign
  '{"scope": "OWN", "filterBy": ["createdById", "assignedToId"]}'::jsonb,
  true
FROM "mktPermissionTemplate" t, "mktPermissionResource" r
WHERE t."templateKey" = 'SALES_STAFF'
AND r."resourceKey" IN ('mktCustomer', 'mktOrder', 'mktInvoice');
```

### 5.3 Template Resolution Strategy

| Strategy | Mô Tả | Use Case |
|----------|-------|----------|
| PRIORITY_BASED | Template có priority thấp hơn được ưu tiên | Default |
| MOST_RESTRICTIVE | Lấy permission ít nhất từ tất cả templates | High security |
| MOST_PERMISSIVE | Lấy permission nhiều nhất từ tất cả templates | Flexible access |

---

## 6. Data Access Policy Theo Phòng Ban

### 6.1 Tạo Row-Level Security Policies

#### Policy cho Sales Department

```sql
-- Sales chỉ xem Customer thuộc department mình
INSERT INTO "mktDataAccessPolicy" (
  "name", "objectName", "policyType", "departmentId",
  "filterConditions", "priority", "evaluationMode",
  "conflictResolution", "isActive"
)
SELECT
  'Sales - Customer Access',
  'mktCustomer',
  'ROW_LEVEL',
  d.id,
  '{
    "type": "AND",
    "conditions": [
      {"field": "departmentId", "operator": "=", "value": "${user.departmentId}"},
      {"field": "isActive", "operator": "=", "value": true}
    ]
  }'::jsonb,
  10,
  'BALANCED',
  'DENY_WINS',
  true
FROM "mktDepartment" d
WHERE d."departmentCode" = 'SALES';
```

#### Policy cho Finance Department

```sql
-- Finance xem được tất cả Invoice và Payment
INSERT INTO "mktDataAccessPolicy" (
  "name", "objectName", "policyType", "departmentId",
  "filterConditions", "priority", "evaluationMode",
  "conflictResolution", "isActive"
)
SELECT
  'Finance - Invoice Full Access',
  'mktInvoice',
  'ROW_LEVEL',
  d.id,
  '{
    "type": "OR",
    "conditions": [
      {"field": "*", "operator": "ALL", "value": true}
    ]
  }'::jsonb,
  5,
  'PERMISSIVE',
  'ALLOW_WINS',
  true
FROM "mktDepartment" d
WHERE d."departmentCode" = 'FIN';
```

#### Policy cho Manager Level

```sql
-- Manager xem data của team members
INSERT INTO "mktDataAccessPolicy" (
  "name", "objectName", "policyType", "organizationLevelId",
  "filterConditions", "priority", "evaluationMode",
  "conflictResolution", "isActive"
)
SELECT
  'Manager - Team Data Access',
  'mktCustomer',
  'ROW_LEVEL',
  ol.id,
  '{
    "type": "OR",
    "conditions": [
      {"field": "createdById", "operator": "IN", "value": "${user.teamMemberIds}"},
      {"field": "assignedToId", "operator": "IN", "value": "${user.teamMemberIds}"},
      {"field": "departmentId", "operator": "=", "value": "${user.departmentId}"}
    ]
  }'::jsonb,
  20,
  'BALANCED',
  'DENY_WINS',
  true
FROM "mktOrganizationLevel" ol
WHERE ol."levelCode" = 'MANAGER';
```

### 6.2 Filter Condition Syntax

```typescript
type FilterCondition = {
  type: 'AND' | 'OR';
  conditions: Array<{
    field: string;           // Column name or '*' for all
    operator: FilterOperator;
    value: unknown;          // Static value or ${user.xxx} placeholder
  }>;
};

type FilterOperator =
  | '='      // Equal
  | '!='     // Not equal
  | '>'      // Greater than
  | '>='     // Greater than or equal
  | '<'      // Less than
  | '<='     // Less than or equal
  | 'IN'     // In array
  | 'NOT_IN' // Not in array
  | 'LIKE'   // Pattern match
  | 'IS_NULL'
  | 'IS_NOT_NULL'
  | 'ALL';   // All records (for full access)
```

### 6.3 Dynamic Placeholders

| Placeholder | Mô Tả | Example |
|-------------|-------|---------|
| `${user.id}` | Current user ID | uuid |
| `${user.departmentId}` | User's department | uuid |
| `${user.teamMemberIds}` | IDs của team members | [uuid, uuid] |
| `${user.hierarchyLevel}` | User's level (1-11) | 7 |
| `${user.departmentAncestorIds}` | Parent department IDs | [uuid] |
| `${user.departmentDescendantIds}` | Child department IDs | [uuid, uuid] |

---

## 7. Gán Quyền Cho Nhân Viên

### 7.1 Gán Template Cho User

```sql
-- Gán template CEO cho CEO
INSERT INTO "mktUserPermissionTemplate" (
  "workspaceMemberId", "templateId", "assignedById",
  "assignedAt", "assignmentReason", "isActive"
)
SELECT
  wm.id,
  t.id,
  admin.id,
  NOW(),
  'Initial role assignment',
  true
FROM "workspaceMember" wm
JOIN "mktOrganizationLevel" ol ON wm."organizationLevelId" = ol.id
JOIN "mktPermissionTemplate" t ON t."templateKey" = 'CEO_FULL_ACCESS'
JOIN "workspaceMember" admin ON admin."userEmail" = 'admin@company.com'
WHERE ol."levelCode" = 'CEO';

-- Gán template cho Sales Staff
INSERT INTO "mktUserPermissionTemplate" (
  "workspaceMemberId", "templateId", "assignedById",
  "assignedAt", "assignmentReason", "isActive"
)
SELECT
  wm.id,
  t.id,
  admin.id,
  NOW(),
  'Sales department assignment',
  true
FROM "workspaceMember" wm
JOIN "mktDepartment" d ON wm."departmentId" = d.id
JOIN "mktPermissionTemplate" t ON t."templateKey" = 'SALES_STAFF'
JOIN "workspaceMember" admin ON admin."userEmail" = 'admin@company.com'
WHERE d."departmentType" = 'SALES'
AND wm."organizationLevelId" IN (
  SELECT id FROM "mktOrganizationLevel"
  WHERE "hierarchyLevel" >= 8
);
```

### 7.2 Gán Quyền Tạm Thời

```sql
-- Gán quyền tạm thời cho project
INSERT INTO "mktTemporaryPermission" (
  "workspaceMemberId", "resourceKey", "allowedActions",
  "reason", "grantedById", "effectiveFrom", "effectiveTo", "isActive"
)
VALUES (
  'user-uuid',
  'mktReport',
  '["READ", "EXPORT"]'::jsonb,
  'Temporary access for Q4 project',
  'admin-uuid',
  NOW(),
  NOW() + INTERVAL '30 days',
  true
);
```

### 7.3 Sync To Casbin Rules

```sql
-- Sync permission templates to Casbin rules
INSERT INTO "mktCasbinRule" ("ptype", "subject", "object", "action", "effect")
SELECT
  'p',
  'role:' || t."templateKey",
  r."resourceKey",
  unnest(trp."allowedActions"::text[]),
  'allow'
FROM "mktPermissionTemplate" t
JOIN "mktTemplateResourcePermission" trp ON trp."templateId" = t.id
JOIN "mktPermissionResource" r ON r.id = trp."resourceId"
WHERE t."isActive" = true
AND trp."isActive" = true;

-- Sync user -> role assignments
INSERT INTO "mktCasbinRule" ("ptype", "subject", "object", "action", "effect")
SELECT
  'g',
  'user:' || wm."userId",
  'role:' || t."templateKey",
  '',
  ''
FROM "mktUserPermissionTemplate" upt
JOIN "workspaceMember" wm ON wm.id = upt."workspaceMemberId"
JOIN "mktPermissionTemplate" t ON t.id = upt."templateId"
WHERE upt."isActive" = true
AND (upt."expiresAt" IS NULL OR upt."expiresAt" > NOW());
```

---

## 8. Use Cases Thực Tế

### 8.1 Use Case: Sales Rep Xem Khách Hàng

```
User: Nguyen Van A
Department: SALES-HN (Kinh Doanh Hà Nội)
Level: SPECIALIST (9)
Template: SALES_STAFF

Request: READ mktCustomer

Flow:
1. Check template permissions:
   - SALES_STAFF allows READ on mktCustomer ✓

2. Apply Data Access Policy:
   - "Sales - Customer Access" policy applies
   - Filter: departmentId = SALES-HN OR createdById = A

3. Result:
   - ALLOWED
   - Data filtered to: customers belonging to SALES-HN dept
     OR customers created by Nguyen Van A
```

### 8.2 Use Case: Manager Xem Báo Cáo Team

```
User: Tran Thi B
Department: SALES
Level: MANAGER (7)
Template: MANAGER_TEAM

Request: READ mktKpi for team members

Flow:
1. Check template permissions:
   - MANAGER_TEAM allows READ, VIEW_TEAM_REPORTS on mktKpi ✓

2. Get team members:
   - Query workspaceMember WHERE departmentId = SALES
   - AND hierarchyLevel > 7 (cấp thấp hơn Manager)
   - Result: [user1, user2, user3]

3. Apply Data Access Policy:
   - Filter: userId IN [user1, user2, user3, B]

4. Result:
   - ALLOWED
   - Data filtered to: KPIs of team members + own KPIs
```

### 8.3 Use Case: Director Approve Order

```
User: Le Van C
Department: SALES
Level: DIRECTOR (5)
Template: DIRECTOR_DEPT

Request: APPROVE mktOrder

Flow:
1. Check template permissions:
   - DIRECTOR_DEPT allows APPROVE on mktOrder ✓

2. Check hierarchy:
   - Director (5) can approve orders from levels 6-11

3. Apply Data Access Policy:
   - Filter: departmentId IN (SALES + child departments)

4. Result:
   - ALLOWED
   - Can approve orders from SALES, SALES-HN, SALES-HCM
```

### 8.4 Use Case: Cross-Department Access Denied

```
User: Pham Van D
Department: MARKETING
Level: SPECIALIST (9)
Template: MARKETING_STAFF

Request: READ mktInvoice

Flow:
1. Check template permissions:
   - MARKETING_STAFF: mktInvoice not in allowedActions ✗

2. Check Data Access Policy:
   - Marketing department: allowsCrossDepartmentAccess = false
   - No policy grants access to Finance resources

3. Result:
   - DENIED
   - Reason: "No permission to access mktInvoice resource"
```

---

## 9. GraphQL API

### 9.1 Check Permission

```graphql
query CheckPermission($input: CheckPermissionInput!) {
  rbacCheckPermission(input: $input) {
    allowed
    reason
    latencyMs
    cached
    appliedPolicies {
      policyName
      effect
    }
    dataFilter {
      conditions
    }
  }
}

# Variables
{
  "input": {
    "resource": "mktCustomer",
    "action": "READ"
  }
}
```

### 9.2 Get User Permissions Summary

```graphql
query GetUserPermissionsSummary {
  rbacUserPermissionSummary {
    userId
    departmentId
    departmentName
    hierarchyLevel
    roles
    permissionCount
    resources {
      resourceKey
      resourceName
      allowedActions
      deniedActions
      hasDataFilter
    }
    activePolicies {
      policyName
      objectName
      policyType
    }
  }
}
```

### 9.3 Assign Permission Template

```graphql
mutation AssignPermissionTemplate($input: AssignTemplateInput!) {
  rbacAssignTemplate(input: $input) {
    success
    assignment {
      id
      workspaceMemberId
      templateKey
      assignedAt
      expiresAt
    }
  }
}

# Variables
{
  "input": {
    "workspaceMemberId": "uuid",
    "templateKey": "SALES_STAFF",
    "reason": "New sales hire",
    "expiresAt": null
  }
}
```

### 9.4 Create Data Access Policy

```graphql
mutation CreateDataAccessPolicy($input: CreatePolicyInput!) {
  rbacCreateDataAccessPolicy(input: $input) {
    success
    policy {
      id
      name
      objectName
      policyType
      filterConditions
    }
  }
}

# Variables
{
  "input": {
    "name": "Sales Region Filter",
    "objectName": "mktCustomer",
    "policyType": "ROW_LEVEL",
    "departmentId": "sales-dept-uuid",
    "filterConditions": {
      "type": "AND",
      "conditions": [
        {"field": "region", "operator": "=", "value": "${user.region}"}
      ]
    }
  }
}
```

---

## 10. Troubleshooting

### 10.1 Debug Permission Check

```bash
# CLI command để debug permission
npx nx command twenty-server -- rbac-seeder:debug \
  --user-id=<userId> \
  --workspace-id=<wsId> \
  --resource=mktCustomer \
  --action=READ

# Output:
# ┌──────────────────────────────────────────────┐
# │ Permission Debug Report                       │
# ├──────────────────────────────────────────────┤
# │ User: Nguyen Van A                           │
# │ Department: SALES-HN                         │
# │ Level: SPECIALIST (9)                        │
# │ Templates: [SALES_STAFF]                     │
# ├──────────────────────────────────────────────┤
# │ Resource: mktCustomer                        │
# │ Action: READ                                 │
# │ Result: ALLOWED                              │
# ├──────────────────────────────────────────────┤
# │ Applied Policies:                            │
# │ - Sales - Customer Access (ROW_LEVEL)        │
# │ Data Filter:                                 │
# │   departmentId = 'sales-hn-uuid'             │
# │   OR createdById = 'user-uuid'               │
# └──────────────────────────────────────────────┘
```

### 10.2 Common Issues

| Issue | Nguyên Nhân | Giải Pháp |
|-------|-------------|-----------|
| User không có quyền | Template chưa được gán | Gán template qua API hoặc admin UI |
| Data filter không apply | Policy không match department | Check departmentId trong policy |
| Permission cached | Cache chưa invalidate | Run `rbac-seeder:sync` |
| Cross-dept access denied | allowsCrossDepartmentAccess = false | Update department config |

### 10.3 Force Sync Policies

```bash
# Sync lại tất cả policies
npx nx command twenty-server -- rbac-seeder:sync

# Sync cho workspace cụ thể
npx nx command twenty-server -- rbac-seeder:sync \
  --workspace-id=<wsId>

# Clear cache và sync
npx nx command twenty-server -- rbac-seeder:sync \
  --clear-cache
```

### 10.4 Health Check

```bash
# Kiểm tra health của RBAC system
npx nx command twenty-server -- rbac-seeder:check

# Output:
# ✓ Database connection: OK
# ✓ Redis connection: OK
# ✓ Templates loaded: 15
# ✓ Resources defined: 12
# ✓ Policies active: 28
# ✓ Casbin rules: 156
# ✓ Watcher status: Connected
```

---

## 11. Use Case: Customer Ownership với Hierarchy và Support

### 11.1 Yêu Cầu Nghiệp Vụ

```
┌────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER ACCESS RULES                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Sales Staff: CHỈ xem Customer của CHÍNH MÌNH                   │
│     - accountOwnerId = currentUser                                  │
│     - HOẶC được assign support                                      │
│                                                                     │
│  2. Lead/Manager: Xem Customer của CẤP DƯỚI trong tree             │
│     - Tất cả customers của team members                             │
│     - Tree hierarchy: Department → Sub-department                   │
│                                                                     │
│  3. Support: Được cấp quyền xem Customer của người khác            │
│     - Quyền tạm thời hoặc vĩnh viễn                                 │
│     - Có thể giới hạn actions (chỉ READ, không UPDATE)              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 11.2 Database Schema Liên Quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                          mktCustomer                                 │
├─────────────────────────────────────────────────────────────────────┤
│ accountOwnerId (uuid)  ──────────► workspaceMember (Người sở hữu)   │
│ createdByWorkspaceMemberId (uuid) ► workspaceMember (Người tạo)     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        workspaceMember                               │
├─────────────────────────────────────────────────────────────────────┤
│ departmentId (uuid)    ──────────► mktDepartment                    │
│ organizationLevelId (uuid) ──────► mktOrganizationLevel             │
│ supportForMemberId (text) ───────► ID của member được hỗ trợ        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      mktDepartmentHierarchy                          │
├─────────────────────────────────────────────────────────────────────┤
│ parentDepartmentId (uuid)  ──────► Phòng ban cha                    │
│ childDepartmentId (uuid)   ──────► Phòng ban con                    │
│ hierarchyPath (uuid[])     ──────► Path đầy đủ trong tree           │
│ hierarchyLevel (number)    ──────► Cấp độ trong tree (1, 2, 3...)   │
│ canViewTeamData (boolean)  ──────► Có thể xem data của team         │
│ canEditTeamData (boolean)  ──────► Có thể sửa data của team         │
│ inheritsParentPermissions  ──────► Kế thừa quyền từ parent          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        mktDepartment                                 │
├─────────────────────────────────────────────────────────────────────┤
│ leaderId (uuid)      ────────────► workspaceMember (Trưởng phòng)   │
│ subLeaderId (uuid)   ────────────► workspaceMember (Phó phòng)      │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.3 Luồng Xác Định Quyền Xem Customer

```
┌────────────────────────────────────────────────────────────────────┐
│              User Request: READ mktCustomer                         │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│          Step 1: Xác định vai trò của User                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Query:                                                      │    │
│  │   SELECT wm.*, ol.hierarchyLevel, ol.levelCode,            │    │
│  │          d.leaderId, d.subLeaderId                          │    │
│  │   FROM workspaceMember wm                                   │    │
│  │   JOIN mktOrganizationLevel ol ON wm.organizationLevelId    │    │
│  │   JOIN mktDepartment d ON wm.departmentId = d.id            │    │
│  │   WHERE wm.userId = :currentUserId                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────────────┐
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────────────┐
│  User là Lead/SubLead?  │         │   User là Staff thường?          │
│  (leaderId = userId     │         │   (không phải lead/sublead)      │
│  OR subLeaderId = userId│         │                                  │
│  OR hierarchyLevel <= 6)│         │                                  │
└───────────┬─────────────┘         └─────────────┬───────────────────┘
            │                                     │
            ▼                                     ▼
┌─────────────────────────┐         ┌─────────────────────────────────┐
│  Step 2A: Lấy danh sách │         │  Step 2B: Lấy danh sách          │
│  Team Members trong     │         │  Customers sở hữu               │
│  Department Tree        │         │  + Customers được support        │
└───────────┬─────────────┘         └─────────────┬───────────────────┘
            │                                     │
            ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Step 3: Build Filter Conditions                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Return Filtered Customers                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.4 Triển Khai Chi Tiết

#### 11.4.1 Data Access Policy cho Sales Staff

```sql
-- Policy: Sales Staff chỉ xem Customer của mình hoặc được support
INSERT INTO "mktDataAccessPolicy" (
  "name",
  "objectName",
  "policyType",
  "organizationLevelId",
  "filterConditions",
  "priority",
  "evaluationMode",
  "conflictResolution",
  "riskLevel",
  "isActive"
)
SELECT
  'Sales Staff - Own Customers Only',
  'mktCustomer',
  'ROW_LEVEL',
  ol.id,
  '{
    "type": "OR",
    "conditions": [
      {
        "field": "accountOwnerId",
        "operator": "=",
        "value": "${user.workspaceMemberId}",
        "description": "Customer do user sở hữu"
      },
      {
        "field": "accountOwnerId",
        "operator": "IN",
        "value": "${user.supportingMemberIds}",
        "description": "Customer của người mà user đang support"
      }
    ]
  }'::jsonb,
  100,  -- Priority thấp (sẽ bị override bởi Lead policy)
  'RESTRICTIVE',
  'DENY_WINS',
  'LOW',
  true
FROM "mktOrganizationLevel" ol
WHERE ol."hierarchyLevel" >= 8;  -- SPECIALIST trở xuống
```

#### 11.4.2 Data Access Policy cho Lead/Manager

```sql
-- Policy: Lead/Manager xem Customer của tất cả team members trong tree
INSERT INTO "mktDataAccessPolicy" (
  "name",
  "objectName",
  "policyType",
  "organizationLevelId",
  "filterConditions",
  "priority",
  "evaluationMode",
  "conflictResolution",
  "riskLevel",
  "isActive"
)
SELECT
  'Lead/Manager - Team Customers Access',
  'mktCustomer',
  'ROW_LEVEL',
  ol.id,
  '{
    "type": "OR",
    "conditions": [
      {
        "field": "accountOwnerId",
        "operator": "=",
        "value": "${user.workspaceMemberId}",
        "description": "Customer của chính mình"
      },
      {
        "field": "accountOwnerId",
        "operator": "IN",
        "value": "${user.subordinateMemberIds}",
        "description": "Customer của tất cả cấp dưới trong tree"
      }
    ]
  }'::jsonb,
  50,  -- Priority cao hơn staff
  'BALANCED',
  'DENY_WINS',
  'MEDIUM',
  true
FROM "mktOrganizationLevel" ol
WHERE ol."hierarchyLevel" BETWEEN 5 AND 7;  -- DIRECTOR đến MANAGER
```

#### 11.4.3 Hàm Lấy Subordinate Members (Tree Query)

```sql
-- Function: Lấy tất cả member IDs cấp dưới trong department tree
CREATE OR REPLACE FUNCTION get_subordinate_member_ids(
  p_workspace_member_id UUID,
  p_workspace_schema TEXT
)
RETURNS UUID[] AS $$
DECLARE
  v_department_id UUID;
  v_is_leader BOOLEAN;
  v_hierarchy_level INT;
  v_result UUID[];
BEGIN
  -- Lấy thông tin của user hiện tại
  EXECUTE format('
    SELECT wm."departmentId",
           (d."leaderId" = wm.id OR d."subLeaderId" = wm.id),
           ol."hierarchyLevel"
    FROM %I."workspaceMember" wm
    JOIN %I."mktDepartment" d ON d.id = wm."departmentId"
    JOIN %I."mktOrganizationLevel" ol ON ol.id = wm."organizationLevelId"
    WHERE wm.id = $1
    AND wm."deletedAt" IS NULL
  ', p_workspace_schema, p_workspace_schema, p_workspace_schema)
  INTO v_department_id, v_is_leader, v_hierarchy_level
  USING p_workspace_member_id;

  -- Nếu là Leader hoặc cấp cao (level <= 6): lấy tất cả members trong tree
  IF v_is_leader OR v_hierarchy_level <= 6 THEN
    EXECUTE format('
      WITH RECURSIVE dept_tree AS (
        -- Base: Department của user
        SELECT id FROM %I."mktDepartment"
        WHERE id = $1 AND "deletedAt" IS NULL

        UNION ALL

        -- Recursive: Tất cả child departments
        SELECT d.id
        FROM %I."mktDepartment" d
        JOIN %I."mktDepartmentHierarchy" dh ON dh."childDepartmentId" = d.id
        JOIN dept_tree dt ON dh."parentDepartmentId" = dt.id
        WHERE d."deletedAt" IS NULL
        AND dh."deletedAt" IS NULL
        AND dh."isActive" = true
      )
      SELECT ARRAY_AGG(wm.id)
      FROM %I."workspaceMember" wm
      WHERE wm."departmentId" IN (SELECT id FROM dept_tree)
      AND wm."deletedAt" IS NULL
      AND wm.id != $2
    ', p_workspace_schema, p_workspace_schema, p_workspace_schema, p_workspace_schema)
    INTO v_result
    USING v_department_id, p_workspace_member_id;
  ELSE
    -- Staff thường: không có subordinates
    v_result := ARRAY[]::UUID[];
  END IF;

  RETURN COALESCE(v_result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;
```

#### 11.4.4 Hàm Lấy Supporting Member IDs

```sql
-- Function: Lấy IDs của members mà user đang support
CREATE OR REPLACE FUNCTION get_supporting_member_ids(
  p_workspace_member_id UUID,
  p_workspace_schema TEXT
)
RETURNS UUID[] AS $$
DECLARE
  v_result UUID[];
BEGIN
  EXECUTE format('
    SELECT ARRAY_AGG(wm.id)
    FROM %I."workspaceMember" wm
    WHERE wm."supportForMemberId" = $1::text
    AND wm."deletedAt" IS NULL
  ', p_workspace_schema)
  INTO v_result
  USING p_workspace_member_id;

  RETURN COALESCE(v_result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;
```

### 11.5 Thiết Lập Support Relationship

#### 11.5.1 Gán Support cho Member

```sql
-- Gán user B làm support cho user A
-- User B sẽ được phép xem Customers của user A

UPDATE "workspaceMember"
SET "supportForMemberId" = 'member-a-uuid'
WHERE id = 'member-b-uuid';
```

#### 11.5.2 Tạo Temporary Permission cho Support

```sql
-- Tạo quyền support tạm thời (30 ngày)
INSERT INTO "mktTemporaryPermission" (
  "workspaceMemberId",
  "resourceKey",
  "allowedActions",
  "reason",
  "grantedById",
  "effectiveFrom",
  "effectiveTo",
  "isActive"
) VALUES (
  'support-member-uuid',
  'mktCustomer',
  '["READ"]'::jsonb,  -- Chỉ cho phép xem, không UPDATE/DELETE
  'Support access for member ABC during leave',
  'manager-uuid',
  NOW(),
  NOW() + INTERVAL '30 days',
  true
);
```

### 11.6 Ví Dụ Thực Tế

#### Scenario 1: Sales Staff Xem Customer

```
User: Nguyen Van A (Sales Staff)
Department: SALES-HN
Level: SPECIALIST (9)
accountOwnerId trong Customer: 'member-A-uuid'

Request: GET /customers

Filter Applied:
  WHERE accountOwnerId = 'member-A-uuid'
  OR accountOwnerId IN (SELECT id FROM members WHERE supportForMemberId = 'member-A-uuid')

Result: Chỉ thấy customers do A sở hữu + customers của người A đang support
```

#### Scenario 2: Lead Xem Customer của Team

```
User: Tran Thi B (Sales Lead)
Department: SALES-HN (Leader)
Level: MANAGER (7)

Department Tree:
  SALES-HN
  ├── Team Alpha (3 members: C, D, E)
  └── Team Beta (2 members: F, G)

Request: GET /customers

Filter Applied:
  WHERE accountOwnerId IN ('B', 'C', 'D', 'E', 'F', 'G')

Result: Thấy tất cả customers của team (bao gồm cả sub-teams)
```

#### Scenario 3: Support Access

```
User: Pham Van H (Support)
Đang support cho: Nguyen Van A

Request: GET /customers

Filter Applied:
  WHERE accountOwnerId = 'member-H-uuid'      -- Customers của H
  OR accountOwnerId = 'member-A-uuid'         -- Customers của A (được support)

Result: Thấy customers của mình + customers của A
```

### 11.7 Permission Template cho Use Case này

```sql
-- Template cho Sales Staff với Customer Ownership
INSERT INTO "mktPermissionTemplate" (
  "templateKey",
  "templateName",
  "templateType",
  "departmentType",
  "hierarchyLevel",
  "priority",
  "isSystemTemplate",
  "isActive"
) VALUES (
  'SALES_STAFF_OWN_CUSTOMERS',
  'Sales Staff - Own Customers Only',
  'DEPARTMENT_BASED',
  'SALES',
  9,
  50,
  true,
  true
);

-- Resource permission với conditions
INSERT INTO "mktTemplateResourcePermission" (
  "templateId",
  "resourceId",
  "allowedActions",
  "deniedActions",
  "conditions",
  "restrictions",
  "isActive"
)
SELECT
  t.id,
  r.id,
  '["READ", "CREATE", "UPDATE"]'::jsonb,
  '["DELETE", "BULK_DELETE", "EXPORT"]'::jsonb,
  '{
    "scope": "OWNERSHIP",
    "ownershipField": "accountOwnerId",
    "includeSupport": true,
    "supportField": "supportForMemberId"
  }'::jsonb,
  '{
    "maxRecordsPerQuery": 100,
    "sensitiveFields": ["phone", "email"]
  }'::jsonb,
  true
FROM "mktPermissionTemplate" t
JOIN "mktPermissionResource" r ON r."resourceKey" = 'mktCustomer'
WHERE t."templateKey" = 'SALES_STAFF_OWN_CUSTOMERS';
```

### 11.8 Sync To Casbin Rules

```sql
-- Tạo Casbin rules cho ownership-based access
-- Policy: Sales staff chỉ xem customers của mình
INSERT INTO "mktCasbinRule" ("ptype", "subject", "object", "action", "effect", "condition")
VALUES
  ('p', 'role:SALES_STAFF_OWN_CUSTOMERS', 'mktCustomer', 'READ', 'allow',
   'r.obj.accountOwnerId == r.sub.workspaceMemberId || r.sub.supportingMemberIds.includes(r.obj.accountOwnerId)'),
  ('p', 'role:SALES_STAFF_OWN_CUSTOMERS', 'mktCustomer', 'CREATE', 'allow', ''),
  ('p', 'role:SALES_STAFF_OWN_CUSTOMERS', 'mktCustomer', 'UPDATE', 'allow',
   'r.obj.accountOwnerId == r.sub.workspaceMemberId'),
  ('p', 'role:SALES_STAFF_OWN_CUSTOMERS', 'mktCustomer', 'DELETE', 'deny', '');

-- Policy: Lead/Manager xem customers của subordinates
INSERT INTO "mktCasbinRule" ("ptype", "subject", "object", "action", "effect", "condition")
VALUES
  ('p', 'role:LEAD_TEAM_CUSTOMERS', 'mktCustomer', 'READ', 'allow',
   'r.sub.subordinateMemberIds.includes(r.obj.accountOwnerId) || r.obj.accountOwnerId == r.sub.workspaceMemberId'),
  ('p', 'role:LEAD_TEAM_CUSTOMERS', 'mktCustomer', 'UPDATE', 'allow',
   'r.sub.subordinateMemberIds.includes(r.obj.accountOwnerId)'),
  ('p', 'role:LEAD_TEAM_CUSTOMERS', 'mktCustomer', 'DELETE', 'allow',
   'r.sub.subordinateMemberIds.includes(r.obj.accountOwnerId)');
```

### 11.9 Diagram Tổng Hợp

```
┌────────────────────────────────────────────────────────────────────────┐
│                     CUSTOMER ACCESS MATRIX                              │
├──────────────────┬─────────────┬──────────────┬──────────────┬─────────┤
│      Role        │  Own Data   │  Team Data   │ Support Data │ All Data│
├──────────────────┼─────────────┼──────────────┼──────────────┼─────────┤
│ CEO/C-Level      │     ✓       │      ✓       │      ✓       │    ✓    │
│ VP               │     ✓       │      ✓       │      ✓       │    ✓    │
│ Director         │     ✓       │      ✓       │      ✓       │    ✗    │
│ Manager/Lead     │     ✓       │      ✓       │      ✓       │    ✗    │
│ Senior Specialist│     ✓       │      ✗       │      ✓       │    ✗    │
│ Specialist       │     ✓       │      ✗       │      ✓       │    ✗    │
│ Junior/Intern    │     ✓       │      ✗       │      ✓       │    ✗    │
└──────────────────┴─────────────┴──────────────┴──────────────┴─────────┘

Legend:
- Own Data: Customers có accountOwnerId = user
- Team Data: Customers của subordinates trong department tree
- Support Data: Customers của người mà user đang support
- All Data: Tất cả customers trong workspace
```

### 11.10 Checklist Triển Khai

- [ ] Tạo Organization Levels (CEO → Intern)
- [ ] Thiết lập Department Hierarchy (parent-child relationships)
- [ ] Tạo Data Access Policies cho từng level
- [ ] Tạo Permission Templates với ownership conditions
- [ ] Sync templates to Casbin rules
- [ ] Implement helper functions (get_subordinate_member_ids, get_supporting_member_ids)
- [ ] Test với các scenarios:
  - [ ] Staff chỉ thấy customers của mình
  - [ ] Lead thấy customers của team
  - [ ] Support thấy customers của người được support
  - [ ] Director thấy customers của departments dưới quyền

---

## Summary

Hệ thống phân quyền theo Role và Phòng Ban cung cấp:

| Feature | Implementation |
|---------|----------------|
| Role-Based Access | Permission Templates với hierarchyLevel |
| Department Scope | Data Access Policies với filterConditions |
| Resource Control | mktTemplateResourcePermission với allowedActions/deniedActions |
| Cross-Dept Access | Department.allowsCrossDepartmentAccess flag |
| Temporary Access | mktTemporaryPermission với effectiveFrom/effectiveTo |
| Audit Trail | mktPermissionAudit logging |
| Real-time Sync | PostgreSQL NOTIFY + Redis cache invalidation |
| Conflict Resolution | DENY_WINS / ALLOW_WINS / PRIORITY_BASED strategies |

---

**Liên hệ Backend Team nếu cần hỗ trợ triển khai.**
