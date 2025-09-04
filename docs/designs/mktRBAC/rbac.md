# Thiết kế Hệ thống Phân quyền KPI cho Twenty.com

## Tổng quan
- **Role-based access control (RBAC)** hiện có
- **Object-level permissions** thông qua `objectPermission`
- **Field-level permissions** thông qua `fieldPermission`
- **Row-level security** thông qua business logic

---

## 1. Cấu trúc Phân quyền Twenty.com hiện có

### 1.1 Các thành phần chính:

```sql
-- Bảng role (Vai trò)
core.role {
  id UUID PRIMARY KEY,
  label VARCHAR,                    -- Tên role: "Admin", "Sales Manager", "Sales Rep"
  canUpdateAllSettings BOOLEAN,     -- Có thể sửa cài đặt hệ thống
  canReadAllObjectRecords BOOLEAN,  -- Đọc tất cả records của mọi object
  canUpdateAllObjectRecords BOOLEAN,-- Sửa tất cả records của mọi object
  canSoftDeleteAllObjectRecords BOOLEAN, -- Xóa mềm tất cả records
  canDestroyAllObjectRecords BOOLEAN,    -- Xóa vĩnh viễn tất cả records
  canAccessAllTools BOOLEAN        -- Truy cập tất cả tools
}

-- Bảng objectPermission (Phân quyền theo Object)
core.objectPermission {
  roleId UUID,                     -- Liên kết với role
  objectMetadataId UUID,          -- Object được phân quyền (mktKpi, mktKpiHistory...)
  canReadObjectRecords BOOLEAN,   -- Đọc records của object này
  canUpdateObjectRecords BOOLEAN, -- Sửa records của object này
  canSoftDeleteObjectRecords BOOLEAN, -- Xóa mềm records
  canDestroyObjectRecords BOOLEAN     -- Xóa vĩnh viễn records
}

-- Bảng fieldPermission (Phân quyền theo Field)
core.fieldPermission {
  roleId UUID,                    -- Liên kết với role
  objectMetadataId UUID,         -- Object chứa field
  fieldMetadataId UUID,          -- Field cụ thể được phân quyền
  canReadFieldValue BOOLEAN,     -- Đọc giá trị field
  canUpdateFieldValue BOOLEAN    -- Sửa giá trị field
}

-- Bảng roleTargets (Gán role cho user)
core.roleTargets {
  roleId UUID,                   -- Role được gán
  userWorkspaceId UUID,         -- User workspace được gán role
  workspaceId UUID              -- Workspace scope
}
```

---

## 2. Định nghĩa các Role KPI Business

### 2.1 Role Hierarchy (Thứ bậc vai trò)

```sql
-- === MANAGEMENT ROLES ===

-- 1. KPI Admin - Toàn quyền quản lý KPI
INSERT INTO core.role (label, description, canUpdateAllSettings, canReadAllObjectRecords, canUpdateAllObjectRecords) 
VALUES (
  'KPI Admin', 
  'Toàn quyền quản lý hệ thống KPI - tạo template, cấu hình, xem tất cả KPI',
  true, true, true
);

-- 2. Sales Director - Quản lý KPI cấp cao
INSERT INTO core.role (label, description, canReadAllObjectRecords) 
VALUES (
  'Sales Director', 
  'Xem tất cả KPI, phê duyệt target, tạo KPI cho Manager và dưới',
  true
);

-- 3. Sales Manager - Quản lý team
INSERT INTO core.role (label, description) 
VALUES (
  'Sales Manager', 
  'Quản lý KPI team, tạo KPI cho nhân viên, xem KPI cấp dưới'
);

-- 4. Team Leader - Dẫn dắt nhóm nhỏ
INSERT INTO core.role (label, description) 
VALUES (
  'Team Leader', 
  'Xem KPI team của mình, hỗ trợ nhân viên đạt target'
);

-- === EXECUTION ROLES ===

-- 5. Senior Sales - Sales cao cấp
INSERT INTO core.role (label, description) 
VALUES (
  'Senior Sales', 
  'Quản lý KPI cá nhân, mentor Junior Sales, xem KPI team'
);

-- 6. Sales Representative - Nhân viên bán hàng
INSERT INTO core.role (label, description) 
VALUES (
  'Sales Representative', 
  'Xem và cập nhật KPI cá nhân, báo cáo tiến độ'
);

-- === SUPPORT ROLES ===

-- 7. KPI Analyst - Phân tích KPI
INSERT INTO core.role (label, description) 
VALUES (
  'KPI Analyst', 
  'Phân tích dữ liệu KPI, tạo báo cáo, không sửa KPI'
);

-- 8. HR KPI Coordinator - Phối hợp KPI với HR
INSERT INTO core.role (label, description) 
VALUES (
  'HR KPI Coordinator', 
  'Tạo KPI từ template cho nhân viên mới, theo dõi KPI thử việc'
);
```

### 2.2 Role Permissions Matrix

| Role | KPI Template | KPI | KPI History | KPI Metric | Dashboard | Reports |
|------|-------------|-----|-------------|------------|-----------|---------|
| **KPI Admin** | CRUD | CRUD | CRUD | CRUD | ALL | ALL |
| **Sales Director** | R | CRUD | R | R | ALL | ALL |
| **Sales Manager** | R | CRU (team) | R (team) | R (team) | Team | Team |
| **Team Leader** | R | RU (team) | R (team) | R (team) | Team | Team |
| **Senior Sales** | R | RU (self) | R (self) | R (self) | Self | Self |
| **Sales Rep** | R | RU (self) | R (self) | - | Self | Self |
| **KPI Analyst** | R | R | R | R | ALL | ALL |
| **HR Coordinator** | R | CRU (new staff) | R (new staff) | - | New Staff | New Staff |

*Legend: C=Create, R=Read, U=Update, D=Delete*

---

## 3. Object-level Permissions

### 3.1 mktKpi Object Permissions

```sql
-- === KPI ADMIN - Toàn quyền ===
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords, canDestroyObjectRecords)
SELECT 
  r.id,
  om.id, 
  true, true, true, true
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'KPI Admin' AND om.nameSingular = 'mktKpi';

-- === SALES DIRECTOR - Đọc tất cả, sửa được ===
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords)
SELECT 
  r.id, om.id, 
  true, true, true
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'Sales Director' AND om.nameSingular = 'mktKpi';

-- === SALES MANAGER - Đọc/sửa KPI team ===
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords)
SELECT 
  r.id, om.id,
  true, true, false  -- Không xóa, chỉ sửa
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'Sales Manager' AND om.nameSingular = 'mktKpi';

-- === SALES REPRESENTATIVE - Chỉ đọc/cập nhật KPI của mình ===
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords)
SELECT 
  r.id, om.id,
  true, true  -- Đọc và cập nhật, không xóa
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'Sales Representative' AND om.nameSingular = 'mktKpi';

-- === KPI ANALYST - Chỉ đọc ===
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords)
SELECT 
  r.id, om.id, true
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'KPI Analyst' AND om.nameSingular = 'mktKpi';
```

### 3.2 mktKpiHistory Object Permissions

```sql
-- History thường chỉ cho đọc, chỉ Admin và system có thể ghi

-- KPI ADMIN - Toàn quyền
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords)
SELECT r.id, om.id, true, true, true
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'KPI Admin' AND om.nameSingular = 'mktKpiHistory';

-- Các role khác chỉ đọc
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords)
SELECT r.id, om.id, true
FROM core.role r, core.objectMetadata om 
WHERE r.label IN ('Sales Director', 'Sales Manager', 'Senior Sales', 'Sales Representative', 'KPI Analyst') 
  AND om.nameSingular = 'mktKpiHistory';
```

### 3.3 mktKpiTemplate Object Permissions

```sql
-- Template thường chỉ Admin và Manager tạo/sửa

-- KPI ADMIN - Toàn quyền
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords, canSoftDeleteObjectRecords)
SELECT r.id, om.id, true, true, true
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'KPI Admin' AND om.nameSingular = 'mktKpiTemplate';

-- Sales Director - Tạo template cho cấp dưới
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords)
SELECT r.id, om.id, true, true
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'Sales Director' AND om.nameSingular = 'mktKpiTemplate';

-- HR Coordinator - Tạo template cho nhân viên mới
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords)
SELECT r.id, om.id, true, true
FROM core.role r, core.objectMetadata om 
WHERE r.label = 'HR KPI Coordinator' AND om.nameSingular = 'mktKpiTemplate';

-- Các role khác chỉ đọc template
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords)
SELECT r.id, om.id, true
FROM core.role r, core.objectMetadata om 
WHERE r.label IN ('Sales Manager', 'Team Leader', 'Senior Sales', 'Sales Representative') 
  AND om.nameSingular = 'mktKpiTemplate';
```

---

## 4. Field-level Permissions (Phân quyền theo trường)

### 4.1 Sensitive Fields (Các trường nhạy cảm)

```sql
-- === Target Value - Chỉ Manager+ mới sửa được ===

-- Lấy fieldMetadataId của targetValue
-- (Giả sử đã có trong system, thực tế cần query để lấy)
-- SELECT id FROM core.fieldMetadata WHERE name = 'targetValue' AND objectMetadataId = (SELECT id FROM core.objectMetadata WHERE nameSingular = 'mktKpi');

-- Sales Rep KHÔNG được sửa targetValue
INSERT INTO core.fieldPermission (roleId, objectMetadataId, fieldMetadataId, canReadFieldValue, canUpdateFieldValue)
SELECT 
  r.id, 
  om.id,
  fm.id,
  true,   -- Đọc được target
  false   -- KHÔNG sửa được target
FROM core.role r, core.objectMetadata om, core.fieldMetadata fm
WHERE r.label = 'Sales Representative' 
  AND om.nameSingular = 'mktKpi'
  AND fm.name = 'targetValue' AND fm.objectMetadataId = om.id;

-- Senior Sales được đọc target, không sửa
INSERT INTO core.fieldPermission (roleId, objectMetadataId, fieldMetadataId, canReadFieldValue, canUpdateFieldValue)
SELECT r.id, om.id, fm.id, true, false
FROM core.role r, core.objectMetadata om, core.fieldMetadata fm
WHERE r.label = 'Senior Sales' 
  AND om.nameSingular = 'mktKpi'
  AND fm.name = 'targetValue' AND fm.objectMetadataId = om.id;

-- Manager+ được sửa target
INSERT INTO core.fieldPermission (roleId, objectMetadataId, fieldMetadataId, canReadFieldValue, canUpdateFieldValue)
SELECT r.id, om.id, fm.id, true, true
FROM core.role r, core.objectMetadata om, core.fieldMetadata fm
WHERE r.label IN ('Sales Manager', 'Sales Director', 'KPI Admin')
  AND om.nameSingular = 'mktKpi'
  AND fm.name = 'targetValue' AND fm.objectMetadataId = om.id;

-- === Actual Value - Sales Rep chỉ sửa được KPI của mình ===
INSERT INTO core.fieldPermission (roleId, objectMetadataId, fieldMetadataId, canReadFieldValue, canUpdateFieldValue)
SELECT r.id, om.id, fm.id, true, true
FROM core.role r, core.objectMetadata om, core.fieldMetadata fm
WHERE r.label = 'Sales Representative' 
  AND om.nameSingular = 'mktKpi'
  AND fm.name = 'actualValue' AND fm.objectMetadataId = om.id;

-- === Status Field - Chỉ Manager+ mới đổi status ===
INSERT INTO core.fieldPermission (roleId, objectMetadataId, fieldMetadataId, canReadFieldValue, canUpdateFieldValue)
SELECT r.id, om.id, fm.id, true, false
FROM core.role r, core.objectMetadata om, core.fieldMetadata fm
WHERE r.label IN ('Sales Representative', 'Senior Sales')
  AND om.nameSingular = 'mktKpi'
  AND fm.name = 'status' AND fm.objectMetadataId = om.id;

-- Manager+ được đổi status
INSERT INTO core.fieldPermission (roleId, objectMetadataId, fieldMetadataId, canReadFieldValue, canUpdateFieldValue)
SELECT r.id, om.id, fm.id, true, true
FROM core.role r, core.objectMetadata om, core.fieldMetadata fm
WHERE r.label IN ('Sales Manager', 'Sales Director', 'KPI Admin')
  AND om.nameSingular = 'mktKpi'
  AND fm.name = 'status' AND fm.objectMetadataId = om.id;
```

---

## 5. Row-level Security (RLS) - Business Logic

### 5.1 Nguyên tắc Row-level Access

Twenty.com không có built-in RLS, nhưng chúng ta implement qua business logic:

```javascript
// === KPI ACCESS CONTROL FUNCTIONS ===

/**
 * Kiểm tra user có quyền truy cập KPI không
 * @param {string} userId - ID của user
 * @param {string} kpiId - ID của KPI
 * @param {string} action - Hành động: 'read', 'update', 'delete'
 * @returns {boolean} - Có quyền hay không
 */
async function checkKpiAccess(userId, kpiId, action) {
  // 1. Lấy thông tin user và role
  const user = await getUserWithRole(userId);
  const kpi = await getKpiById(kpiId);
  
  // 2. Admin có toàn quyền
  if (user.role.label === 'KPI Admin') {
    return true;
  }
  
  // 3. Sales Director xem được tất cả
  if (user.role.label === 'Sales Director') {
    return true;
  }
  
  // 4. Sales Manager chỉ xem KPI của team
  if (user.role.label === 'Sales Manager') {
    // Kiểm tra user có phải manager của assignee không
    if (kpi.assigneeType === 'INDIVIDUAL') {
      const assignee = await getUserById(kpi.assigneeWorkspaceMemberId);
      return assignee.managerId === userId;
    }
    
    if (kpi.assigneeType === 'DEPARTMENT') {
      const department = await getDepartmentById(kpi.assigneeDepartmentId);
      return department.managerId === userId;
    }
  }
  
  // 5. Sales Rep chỉ xem KPI của mình
  if (user.role.label === 'Sales Representative') {
    if (action === 'delete') return false; // Sales Rep không xóa được
    
    return kpi.assigneeType === 'INDIVIDUAL' && 
           kpi.assigneeWorkspaceMemberId === user.workspaceMemberId;
  }
  
  // 6. KPI Analyst xem được tất cả nhưng không sửa
  if (user.role.label === 'KPI Analyst') {
    return action === 'read';
  }
  
  return false;
}

/**
 * Filter KPI list theo quyền của user
 */
async function getKpiListForUser(userId, filters = {}) {
  const user = await getUserWithRole(userId);
  let query = buildKpiQuery(filters);
  
  // Apply row-level filters based on role
  switch (user.role.label) {
    case 'KPI Admin':
    case 'Sales Director':
      // Xem tất cả
      break;
      
    case 'Sales Manager':
      // Chỉ xem KPI của team mình quản lý
      query = query.where(function() {
        this.where('assigneeType', 'INDIVIDUAL')
            .whereIn('assigneeWorkspaceMemberId', function() {
              this.select('id').from('workspaceMember')
                  .where('managerId', userId);
            })
            .orWhere('assigneeType', 'DEPARTMENT')
            .whereIn('assigneeDepartmentId', function() {
              this.select('id').from('mktDepartment')
                  .where('managerId', userId);
            });
      });
      break;
      
    case 'Sales Representative':
      // Chỉ xem KPI của mình
      query = query.where('assigneeWorkspaceMemberId', user.workspaceMemberId);
      break;
      
    case 'KPI Analyst':
      // Xem tất cả để phân tích
      break;
      
    default:
      // Không có quyền xem KPI
      return [];
  }
  
  return await query;
}
```

---

## 6. API Security Implementation

### 6.1 Middleware kiểm tra quyền

```typescript
// === KPI AUTHORIZATION MIDDLEWARE ===

import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    workspaceMemberId: string;
    role: {
      label: string;
      permissions: any[];
    };
  };
}

/**
 * Middleware kiểm tra quyền truy cập KPI
 */
export const kpiAuthMiddleware = (requiredAction: 'read' | 'create' | 'update' | 'delete') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { user } = req;
      const kpiId = req.params.kpiId;
      
      // 1. Kiểm tra object permission
      const hasObjectPermission = await checkObjectPermission(
        user.role.label, 
        'mktKpi', 
        requiredAction
      );
      
      if (!hasObjectPermission) {
        return res.status(403).json({ error: 'Không có quyền truy cập object KPI' });
      }
      
      // 2. Kiểm tra row-level permission (nếu có kpiId)
      if (kpiId) {
        const hasRowPermission = await checkKpiAccess(
          user.id, 
          kpiId, 
          requiredAction
        );
        
        if (!hasRowPermission) {
          return res.status(403).json({ error: 'Không có quyền truy cập KPI này' });
        }
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Lỗi kiểm tra quyền truy cập' });
    }
  };
};

/**
 * Middleware kiểm tra quyền field cụ thể
 */
export const kpiFieldAuthMiddleware = (fieldName: string, action: 'read' | 'update') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { user } = req;
      
      const hasFieldPermission = await checkFieldPermission(
        user.role.label,
        'mktKpi',
        fieldName,
        action
      );
      
      if (!hasFieldPermission) {
        return res.status(403).json({ 
          error: `Không có quyền ${action} field ${fieldName}` 
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Lỗi kiểm tra quyền field' });
    }
  };
};
```

### 6.2 API Endpoints với phân quyền

```typescript
// === KPI API WITH AUTHORIZATION ===

import { Router } from 'express';
import { kpiAuthMiddleware, kpiFieldAuthMiddleware } from './middleware/kpi-auth';

const router = Router();

// === READ APIs ===

// GET /api/v1/sales/{id}/kpis - Danh sách KPI của sales
router.get('/sales/:salesId/kpis', 
  kpiAuthMiddleware('read'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { salesId } = req.params;
    const { user } = req;
    
    // Kiểm tra quyền xem KPI của sales này
    const canViewSalesKpis = await canUserViewSalesKpis(user.id, salesId);
    if (!canViewSalesKpis) {
      return res.status(403).json({ error: 'Không có quyền xem KPI của sales này' });
    }
    
    const kpis = await getKpiListForUser(user.id, { salesId });
    res.json(kpis);
  }
);

// GET /api/v1/sales/kpis/dashboard - Dashboard KPI
router.get('/sales/kpis/dashboard',
  kpiAuthMiddleware('read'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { user } = req;
    
    // Dashboard data sẽ được filter theo quyền của user
    const dashboardData = await getKpiDashboardForUser(user.id);
    res.json(dashboardData);
  }
);

// === CREATE APIs ===

// POST /api/v1/sales/{id}/kpis/set - Thiết lập KPI
router.post('/sales/:salesId/kpis/set',
  kpiAuthMiddleware('create'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { salesId } = req.params;
    const { user } = req;
    const kpiData = req.body;
    
    // Kiểm tra quyền tạo KPI cho sales này
    const canCreateKpiForSales = await canUserCreateKpiForSales(user.id, salesId);
    if (!canCreateKpiForSales) {
      return res.status(403).json({ error: 'Không có quyền tạo KPI cho sales này' });
    }
    
    // Validate dữ liệu và tạo KPI
    const newKpi = await createKpiForSales(salesId, kpiData, user.id);
    res.status(201).json(newKpi);
  }
);

// === UPDATE APIs ===

// PUT /api/v1/sales/{id}/kpis/update-actual - Cập nhật số liệu thực tế
router.put('/sales/:salesId/kpis/update-actual',
  kpiAuthMiddleware('update'),
  kpiFieldAuthMiddleware('actualValue', 'update'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { salesId } = req.params;
    const { kpiId, actualValue, notes } = req.body;
    const { user } = req;
    
    // Kiểm tra quyền cập nhật actual value cho KPI này
    const canUpdateActual = await checkKpiAccess(user.id, kpiId, 'update');
    if (!canUpdateActual) {
      return res.status(403).json({ error: 'Không có quyền cập nhật KPI này' });
    }
    
    const updatedKpi = await updateKpiActualValue(kpiId, actualValue, notes, user.id);
    res.json(updatedKpi);
  }
);

// PUT /api/v1/kpis/{id}/target - Cập nhật target (chỉ Manager+)
router.put('/kpis/:kpiId/target',
  kpiAuthMiddleware('update'),
  kpiFieldAuthMiddleware('targetValue', 'update'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { kpiId } = req.params;
    const { targetValue, reason } = req.body;
    const { user } = req;
    
    // Double check quyền sửa target
    if (!['Sales Manager', 'Sales Director', 'KPI Admin'].includes(user.role.label)) {
      return res.status(403).json({ error: 'Chỉ Manager trở lên mới có quyền sửa target' });
    }
    
    const updatedKpi = await updateKpiTarget(kpiId, targetValue, reason, user.id);
    res.json(updatedKpi);
  }
);

// PUT /api/v1/kpis/{id}/status - Cập nhật trạng thái KPI
router.put('/kpis/:kpiId/status',
  kpiAuthMiddleware('update'),
  kpiFieldAuthMiddleware('status', 'update'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { kpiId } = req.params;
    const { status, reason } = req.body;
    const { user } = req;
    
    // Chỉ Manager+ mới đổi được status
    if (!['Sales Manager', 'Sales Director', 'KPI Admin'].includes(user.role.label)) {
      return res.status(403).json({ error: 'Không có quyền thay đổi trạng thái KPI' });
    }
    
    const updatedKpi = await updateKpiStatus(kpiId, status, reason, user.id);
    res.json(updatedKpi);
  }
);

// === TEMPLATE APIs ===

// POST /api/v1/kpi-templates - Tạo template KPI
router.post('/kpi-templates',
  kpiAuthMiddleware('create'), // Check quyền tạo template
  async (req: AuthenticatedRequest, res: Response) => {
    const { user } = req;
    const templateData = req.body;
    
    // Chỉ Admin, Director, HR Coordinator mới tạo được template
    const allowedRoles = ['KPI Admin', 'Sales Director', 'HR KPI Coordinator'];
    if (!allowedRoles.includes(user.role.label)) {
      return res.status(403).json({ error: 'Không có quyền tạo template KPI' });
    }
    
    const newTemplate = await createKpiTemplate(templateData, user.id);
    res.status(201).json(newTemplate);
  }
);

export default router;
```

---

## 7. Advanced Security Features

### 7.1 Temporary Access (Quyền tạm thời)

```sql
-- Bảng lưu quyền truy cập tạm thời
CREATE TABLE mktKpiTemporaryAccess (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  granteeWorkspaceMemberId UUID NOT NULL, -- Người được cấp quyền
  granterWorkspaceMemberId UUID NOT NULL, -- Người cấp quyền
  kpiId UUID,                            -- KPI cụ thể (hoặc NULL = tất cả)
  departmentId UUID,                     -- Department scope (nếu có)
  
  -- Quyền được cấp
  canRead BOOLEAN DEFAULT false,
  canUpdate BOOLEAN DEFAULT false,
  canDelete BOOLEAN DEFAULT false,
  
  -- Thời hạn
  expiresAt TIMESTAMPTZ NOT NULL,
  
  -- Lý do cấp quyền
  reason TEXT,
  purpose TEXT, -- VD: "Cover cho nhân viên nghỉ phép", "Audit định kỳ"
  
  -- Status
  isActive BOOLEAN DEFAULT true,
  revokedAt TIMESTAMPTZ,
  revokedBy UUID,
  
  -- Audit
  createdAt TIMESTAMPTZ DEFAULT now(),
  createdBy UUID,
  
  FOREIGN KEY (granteeWorkspaceMemberId) REFERENCES workspaceMember(id),
  FOREIGN KEY (granterWorkspaceMemberId) REFERENCES workspaceMember(id),
  FOREIGN KEY (kpiId) REFERENCES mktKpi(id),
  FOREIGN KEY (departmentId) REFERENCES mktDepartment(id)
);

-- Index cho performance
CREATE INDEX idx_temp_access_grantee_active ON mktKpiTemporaryAccess(granteeWorkspaceMemberId, isActive, expiresAt);
```

```typescript
// === TEMPORARY ACCESS FUNCTIONS ===

/**
 * Cấp quyền tạm thời cho user
 */
async function grantTemporaryAccess(
  granterId: string,    // Manager cấp quyền
  granteeId: string,    // Nhân viên được cấp quyền
  scope: {
    kpiId?: string;
    departmentId?: string;
  },
  permissions: {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  },
  duration: number,     // Số giờ
  reason: string
) {
  // 1. Validate granter có quyền cấp không
  const granter = await getUserWithRole(granterId);
  if (!['Sales Manager', 'Sales Director', 'KPI Admin'].includes(granter.role.label)) {
    throw new Error('Không có quyền cấp quyền tạm thời');
  }
  
  // 2. Tạo temporary access record
  const temporaryAccess = await db('mktKpiTemporaryAccess').insert({
    granteeWorkspaceMemberId: granteeId,
    granterWorkspaceMemberId: granterId,
    kpiId: scope.kpiId,
    departmentId: scope.departmentId,
    canRead: permissions.canRead,
    canUpdate: permissions.canUpdate,
    canDelete: permissions.canDelete,
    expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000), // + duration hours
    reason,
    createdBy: granterId
  });
  
  return temporaryAccess;
}

/**
 * Kiểm tra temporary access
 */
async function checkTemporaryAccess(userId: string, kpiId: string, action: string): Promise<boolean> {
  const now = new Date();
  
  const tempAccess = await db('mktKpiTemporaryAccess')
    .where('granteeWorkspaceMemberId', userId)
    .where('isActive', true)
    .where('expiresAt', '>', now)
    .where(function() {
      this.where('kpiId', kpiId).orWhereNull('kpiId'); // Specific KPI hoặc tất cả
    })
    .first();
  
  if (!tempAccess) return false;
  
  switch (action) {
    case 'read': return tempAccess.canRead;
    case 'update': return tempAccess.canUpdate;
    case 'delete': return tempAccess.canDelete;
    default: return false;
  }
}

/**
 * Auto cleanup expired access
 */
async function cleanupExpiredAccess() {
  const now = new Date();
  
  await db('mktKpiTemporaryAccess')
    .where('expiresAt', '<', now)
    .where('isActive', true)
    .update({
      isActive: false,
      revokedAt: now,
      revokedBy: null // System cleanup
    });
}
```

### 7.2 Delegation (Ủy quyền)

```sql
-- Bảng ủy quyền KPI khi nhân viên nghỉ phép/chuyển công tác
CREATE TABLE mktKpiDelegation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Người ủy quyền và người nhận ủy quyền
  delegatorWorkspaceMemberId UUID NOT NULL, -- Người ủy quyền (đi nghỉ)
  delegateeWorkspaceMemberId UUID NOT NULL, -- Người nhận ủy quyền (thay thế)
  
  -- Scope ủy quyền
  delegationType TEXT NOT NULL, -- 'ALL_KPIS', 'SPECIFIC_KPIS', 'DEPARTMENT_KPIS'
  specificKpiIds UUID[],        -- Nếu chỉ ủy quyền KPI cụ thể
  departmentId UUID,           -- Nếu ủy quyền theo department
  
  -- Thời gian ủy quyền
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  
  -- Quyền hạn được ủy quyền
  delegatedPermissions JSONB DEFAULT '{}', -- {"canUpdate": true, "canApprove": false}
  
  -- Lý do và context
  reason TEXT,
  delegationContext TEXT, -- VD: "Nghỉ phép", "Chuyển department", "Tạm thời"
  
  -- Approval process
  approvedBy UUID,          -- Manager phê duyệt ủy quyền
  approvedAt TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'PENDING', -- PENDING, ACTIVE, COMPLETED, REVOKED
  
  -- Audit
  createdAt TIMESTAMPTZ DEFAULT now(),
  createdBy UUID,
  
  FOREIGN KEY (delegatorWorkspaceMemberId) REFERENCES workspaceMember(id),
  FOREIGN KEY (delegateeWorkspaceMemberId) REFERENCES workspaceMember(id),
  FOREIGN KEY (departmentId) REFERENCES mktDepartment(id),
  FOREIGN KEY (approvedBy) REFERENCES workspaceMember(id)
);
```

### 7.3 Audit Trail Enhancement

```sql
-- Bảng audit chi tiết cho KPI permissions
CREATE TABLE mktKpiPermissionAudit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Thông tin hành động
  actionType TEXT NOT NULL, -- 'GRANT_PERMISSION', 'REVOKE_PERMISSION', 'ACCESS_DENIED', 'ESCALATION'
  resourceType TEXT NOT NULL, -- 'KPI', 'KPI_TEMPLATE', 'KPI_HISTORY'
  resourceId UUID,
  
  -- Người thực hiện và bị ảnh hưởng
  actorWorkspaceMemberId UUID, -- Người thực hiện hành động
  targetWorkspaceMemberId UUID, -- Người bị ảnh hưởng
  
  -- Chi tiết permission
  permissionBefore JSONB,      -- Quyền trước khi thay đổi
  permissionAfter JSONB,       -- Quyền sau khi thay đổi
  
  -- Context
  reason TEXT,
  ipAddress INET,
  userAgent TEXT,
  requestId UUID,             -- Để trace lại request
  
  -- Kết quả
  success BOOLEAN,
  errorMessage TEXT,
  
  -- Metadata
  additionalData JSONB DEFAULT '{}',
  
  createdAt TIMESTAMPTZ DEFAULT now()
);

-- Indexes cho audit queries
CREATE INDEX idx_kpi_permission_audit_actor ON mktKpiPermissionAudit(actorWorkspaceMemberId, createdAt);
CREATE INDEX idx_kpi_permission_audit_resource ON mktKpiPermissionAudit(resourceType, resourceId, createdAt);
CREATE INDEX idx_kpi_permission_audit_action ON mktKpiPermissionAudit(actionType, createdAt);
```

---

## 8. Data Filtering & Query Security

### 8.1 Secure Query Builder

```typescript
// === SECURE KPI QUERY BUILDER ===

interface QueryContext {
  userId: string;
  userRole: string;
  workspaceMemberId: string;
  departmentIds: string[];
  managedUserIds: string[];
}

class SecureKpiQueryBuilder {
  private query: any;
  private context: QueryContext;
  
  constructor(baseQuery: any, context: QueryContext) {
    this.query = baseQuery;
    this.context = context;
  }
  
  /**
   * Apply row-level security filters
   */
  applySecurityFilters(): this {
    switch (this.context.userRole) {
      case 'KPI Admin':
      case 'Sales Director':
        // Có thể xem tất cả - không filter
        break;
        
      case 'Sales Manager':
        this.query = this.query.where(function() {
          // KPI của nhân viên mà mình quản lý
          this.where('assigneeType', 'INDIVIDUAL')
              .whereIn('assigneeWorkspaceMemberId', this.context.managedUserIds)
              // Hoặc KPI của department mà mình quản lý
              .orWhere('assigneeType', 'DEPARTMENT')
              .whereIn('assigneeDepartmentId', this.context.departmentIds)
              // Hoặc KPI của chính mình
              .orWhere('assigneeWorkspaceMemberId', this.context.workspaceMemberId);
        });
        break;
        
      case 'Team Leader':
        this.query = this.query.where(function() {
          // KPI của team members
          this.where('assigneeType', 'INDIVIDUAL')
              .whereIn('assigneeWorkspaceMemberId', this.context.managedUserIds)
              // Hoặc KPI của chính mình
              .orWhere('assigneeWorkspaceMemberId', this.context.workspaceMemberId);
        });
        break;
        
      case 'Senior Sales':
      case 'Sales Representative':
        // Chỉ xem KPI của chính mình
        this.query = this.query.where('assigneeWorkspaceMemberId', this.context.workspaceMemberId);
        break;
        
      case 'KPI Analyst':
        // Xem tất cả để phân tích - không filter
        break;
        
      default:
        // Không có quyền - filter về empty
        this.query = this.query.whereRaw('1 = 0');
    }
    
    return this;
  }
  
  /**
   * Apply field-level security
   */
  applyFieldSecurity(fields: string[]): this {
    const allowedFields = this.getAllowedFields(fields);
    this.query = this.query.select(allowedFields);
    return this;
  }
  
  private getAllowedFields(requestedFields: string[]): string[] {
    const baseFields = ['id', 'kpiName', 'kpiCode', 'kpiType', 'assigneeType'];
    
    switch (this.context.userRole) {
      case 'KPI Admin':
      case 'Sales Director':
        return requestedFields; // Xem tất cả fields
        
      case 'Sales Manager':
      case 'Team Leader':
        return requestedFields.filter(field => 
          // Không cho xem một số fields nhạy cảm
          !['calculationFormula', 'internalNotes'].includes(field)
        );
        
      case 'Sales Representative':
      case 'Senior Sales':
        return requestedFields.filter(field => 
          // Sales Rep không xem được target của người khác, config internal
          !['calculationFormula', 'internalNotes', 'alertThresholds'].includes(field)
        );
        
      case 'KPI Analyst':
        return requestedFields.filter(field => 
          // Analyst xem được dữ liệu phân tích, không xem config
          !['calculationFormula', 'internalNotes'].includes(field)
        );
        
      default:
        return baseFields;
    }
  }
  
  /**
   * Apply temporary access
   */
  async applyTemporaryAccess(): Promise<this> {
    const tempPermissions = await this.getTemporaryPermissions();
    
    if (tempPermissions.length > 0) {
      // Expand query để include KPIs mà user có temporary access
      const tempKpiIds = tempPermissions
        .filter(p => p.canRead)
        .map(p => p.kpiId)
        .filter(id => id !== null);
      
      if (tempKpiIds.length > 0) {
        this.query = this.query.orWhereIn('id', tempKpiIds);
      }
    }
    
    return this;
  }
  
  private async getTemporaryPermissions() {
    const now = new Date();
    return await db('mktKpiTemporaryAccess')
      .where('granteeWorkspaceMemberId', this.context.workspaceMemberId)
      .where('isActive', true)
      .where('expiresAt', '>', now);
  }
}

// === USAGE EXAMPLE ===

/**
 * Secure KPI list endpoint
 */
export async function getSecureKpiList(userId: string, filters: any = {}) {
  // 1. Build query context
  const context = await buildQueryContext(userId);
  
  // 2. Build base query
  let baseQuery = db('mktKpi')
    .where('deletedAt', null)
    .where(filters); // Apply user filters
  
  // 3. Apply security
  const secureQuery = new SecureKpiQueryBuilder(baseQuery, context)
    .applySecurityFilters();
  
  await secureQuery.applyTemporaryAccess();
  
  // 4. Execute with field security
  const requestedFields = ['*']; // hoặc từ request
  secureQuery.applyFieldSecurity(requestedFields);
  
  return await secureQuery.query;
}

async function buildQueryContext(userId: string): Promise<QueryContext> {
  const user = await getUserWithRole(userId);
  
  // Lấy thông tin managed users và departments
  const managedUsers = await db('workspaceMember')
    .where('managerId', user.workspaceMemberId)
    .pluck('id');
    
  const managedDepartments = await db('mktDepartment')
    .where('managerId', user.workspaceMemberId)
    .pluck('id');
  
  return {
    userId: user.id,
    userRole: user.role.label,
    workspaceMemberId: user.workspaceMemberId,
    departmentIds: managedDepartments,
    managedUserIds: managedUsers
  };
}
```

---

## 9. Testing Security Implementation

### 9.1 Unit Tests cho Permission System

```typescript
// === PERMISSION SYSTEM TESTS ===

describe('KPI Permission System', () => {
  let testUsers: any = {};
  let testKpis: any = {};
  
  beforeAll(async () => {
    // Setup test data
    testUsers = await createTestUsers();
    testKpis = await createTestKpis();
  });
  
  describe('Object-level Permissions', () => {
    it('KPI Admin có thể CRUD tất cả KPI', async () => {
      const admin = testUsers.kpiAdmin;
      
      // Test create
      const newKpi = await createKpi(testKpis.sampleKpiData, admin.id);
      expect(newKpi).toBeDefined();
      
      // Test read
      const kpis = await getKpiListForUser(admin.id);
      expect(kpis.length).toBeGreaterThan(0);
      
      // Test update
      const updated = await updateKpi(newKpi.id, { actualValue: 1000000 }, admin.id);
      expect(updated.actualValue).toBe(1000000);
      
      // Test delete
      const deleted = await deleteKpi(newKpi.id, admin.id);
      expect(deleted).toBe(true);
    });
    
    it('Sales Rep chỉ xem được KPI của mình', async () => {
      const salesRep = testUsers.salesRep1;
      const otherSalesRep = testUsers.salesRep2;
      
      const kpis = await getKpiListForUser(salesRep.id);
      
      // Tất cả KPI trả về phải thuộc về salesRep này
      kpis.forEach(kpi => {
        expect(kpi.assigneeWorkspaceMemberId).toBe(salesRep.workspaceMemberId);
      });
      
      // Không thể xem KPI của sales khác
      const otherKpiAccess = await checkKpiAccess(
        salesRep.id, 
        testKpis.otherSalesKpi.id, 
        'read'
      );
      expect(otherKpiAccess).toBe(false);
    });
    
    it('Sales Manager xem được KPI của team', async () => {
      const manager = testUsers.salesManager;
      
      const kpis = await getKpiListForUser(manager.id);
      
      // Phải có KPI của team members
      const teamMemberKpis = kpis.filter(kpi => 
        testUsers.teamMembers.some(member => 
          member.workspaceMemberId === kpi.assigneeWorkspaceMemberId
        )
      );
      
      expect(teamMemberKpis.length).toBeGreaterThan(0);
    });
  });
  
  describe('Field-level Permissions', () => {
    it('Sales Rep không được sửa targetValue', async () => {
      const salesRep = testUsers.salesRep1;
      const kpi = testKpis.salesRepKpi;
      
      const canUpdateTarget = await checkFieldPermission(
        salesRep.role.label,
        'mktKpi',
        'targetValue',
        'update'
      );
      
      expect(canUpdateTarget).toBe(false);
    });
    
    it('Sales Manager được sửa targetValue', async () => {
      const manager = testUsers.salesManager;
      
      const canUpdateTarget = await checkFieldPermission(
        manager.role.label,
        'mktKpi',
        'targetValue',
        'update'
      );
      
      expect(canUpdateTarget).toBe(true);
    });
    
    it('Sales Rep được cập nhật actualValue của KPI mình', async () => {
      const salesRep = testUsers.salesRep1;
      const kpi = testKpis.salesRepKpi;
      
      const updated = await updateKpiActualValue(
        kpi.id,
        2000000,
        'Updated by sales rep',
        salesRep.id
      );
      
      expect(updated.actualValue).toBe(2000000);
    });
  });
  
  describe('Temporary Access', () => {
    it('Cấp quyền tạm thời cho nhân viên', async () => {
      const manager = testUsers.salesManager;
      const salesRep = testUsers.salesRep1;
      const otherKpi = testKpis.otherTeamKpi;
      
      // Manager cấp quyền tạm thời
      await grantTemporaryAccess(
        manager.id,
        salesRep.id,
        { kpiId: otherKpi.id },
        { canRead: true, canUpdate: true, canDelete: false },
        24, // 24 hours
        'Cover for sick leave'
      );
      
      // Sales rep bây giờ có thể access KPI khác
      const hasAccess = await checkKpiAccess(salesRep.id, otherKpi.id, 'read');
      expect(hasAccess).toBe(true);
      
      const canUpdate = await checkKpiAccess(salesRep.id, otherKpi.id, 'update');
      expect(canUpdate).toBe(true);
      
      const canDelete = await checkKpiAccess(salesRep.id, otherKpi.id, 'delete');
      expect(canDelete).toBe(false);
    });
  });
});
```

### 9.2 Integration Tests cho API Security

```typescript
// === API SECURITY INTEGRATION TESTS ===

describe('KPI API Security', () => {
  let authTokens: any = {};
  
  beforeAll(async () => {
    // Setup auth tokens for different roles
    authTokens = await setupAuthTokens();
  });
  
  describe('GET /api/v1/sales/:salesId/kpis', () => {
    it('Sales Rep chỉ có thể xem KPI của mình', async () => {
      const response = await request(app)
        .get(`/api/v1/sales/${testUsers.salesRep1.id}/kpis`)
        .set('Authorization', `Bearer ${authTokens.salesRep1}`);
        
      expect(response.status).toBe(200);
      
      // Tất cả KPI trả về phải của sales rep này
      response.body.forEach((kpi: any) => {
        expect(kpi.assigneeWorkspaceMemberId).toBe(testUsers.salesRep1.workspaceMemberId);
      });
    });
    
    it('Sales Rep không thể xem KPI của sales khác', async () => {
      const response = await request(app)
        .get(`/api/v1/sales/${testUsers.salesRep2.id}/kpis`)
        .set('Authorization', `Bearer ${authTokens.salesRep1}`);
        
      expect(response.status).toBe(403);
    });
    
    it('Sales Manager có thể xem KPI của team', async () => {
      const response = await request(app)
        .get(`/api/v1/sales/${testUsers.salesRep1.id}/kpis`)
        .set('Authorization', `Bearer ${authTokens.salesManager}`);
        
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
  
  describe('PUT /api/v1/kpis/:kpiId/target', () => {
    it('Sales Rep không được sửa target', async () => {
      const response = await request(app)
        .put(`/api/v1/kpis/${testKpis.salesRepKpi.id}/target`)
        .set('Authorization', `Bearer ${authTokens.salesRep1}`)
        .send({ targetValue: 60000000, reason: 'Increase target' });
        
      expect(response.status).toBe(403);
    });
    
    it('Sales Manager được sửa target của team', async () => {
      const response = await request(app)
        .put(`/api/v1/kpis/${testKpis.salesRepKpi.id}/target`)
        .set('Authorization', `Bearer ${authTokens.salesManager}`)
        .send({ targetValue: 60000000, reason: 'Quarterly adjustment' });
        
      expect(response.status).toBe(200);
      expect(response.body.targetValue).toBe(60000000);
    });
  });
});
```

---

## 10. Monitoring & Alerting

### 10.1 Permission Violation Monitoring

```typescript
// === SECURITY MONITORING ===

interface SecurityEvent {
  type: 'PERMISSION_DENIED' | 'SUSPICIOUS_ACCESS' | 'PRIVILEGE_ESCALATION';
  userId: string;
  resource: string;
  details: any;
  timestamp: Date;
}

class KpiSecurityMonitor {
  private static instance: KpiSecurityMonitor;
  
  static getInstance(): KpiSecurityMonitor {
    if (!this.instance) {
      this.instance = new KpiSecurityMonitor();
    }
    return this.instance;
  }
  
  /**
   * Log security event
   */
  async logSecurityEvent(event: SecurityEvent) {
    // 1. Log to audit table
    await db('mktKpiPermissionAudit').insert({
      actionType: event.type,
      actorWorkspaceMemberId: event.userId,
      resourceType: 'KPI',
      resourceId: event.resource,
      success: false,
      errorMessage: JSON.stringify(event.details),
      additionalData: event.details,
      createdAt: event.timestamp
    });
    
    // 2. Check for suspicious patterns
    await this.checkSuspiciousActivity(event.userId);
    
    // 3. Send alerts if needed
    await this.sendSecurityAlert(event);
  }
  
  /**
   * Detect suspicious activity patterns
   */
  private async checkSuspiciousActivity(userId: string) {
    const recentEvents = await db('mktKpiPermissionAudit')
      .where('actorWorkspaceMemberId', userId)
      .where('success', false)
      .where('createdAt', '>', new Date(Date.now() - 60 * 60 * 1000)) // Last 1 hour
      .count('* as count');
    
    const failureCount = recentEvents[0].count;
    
    if (failureCount > 10) {
      // Quá nhiều lần access denied trong 1 giờ
      await this.escalateSecurityIncident(userId, 'HIGH_FAILURE_RATE', {
        failureCount,
        timeWindow: '1 hour'
      });
    }
  }
  
  /**
   * Send security alerts
   */
  private async sendSecurityAlert(event: SecurityEvent) {
    const user = await getUserById(event.userId);
    
    // 1. Notify security team
    await sendSlackAlert({
      channel: '#security-alerts',
      message: `🚨 KPI Permission Violation
User: ${user.name} (${user.email})
Action: ${event.type}
Resource: ${event.resource}
Time: ${event.timestamp}
Details: ${JSON.stringify(event.details, null, 2)}`
    });
    
    // 2. Email security admin
    if (event.type === 'PRIVILEGE_ESCALATION') {
      await sendEmail({
        to: 'security@company.com',
        subject: 'URGENT: Privilege Escalation Detected',
        body: `Potential privilege escalation detected in KPI system...`
      });
    }
  }
  
  /**
   * Escalate security incident
   */
  private async escalateSecurityIncident(userId: string, incidentType: string, details: any) {
    // 1. Create incident record
    await db('securityIncidents').insert({
      userId,
      incidentType,
      severity: 'HIGH',
      details: JSON.stringify(details),
      status: 'OPEN'
    });
    
    // 2. Temporarily restrict access
    await this.temporarilyRestrictAccess(userId, 'SECURITY_INCIDENT');
    
    // 3. Notify management
    await this.notifyManagement(userId, incidentType, details);
  }
  
  /**
   * Temporarily restrict user access
   */
  private async temporarilyRestrictAccess(userId: string, reason: string) {
    const restrictionDuration = 2 * 60 * 60 * 1000; // 2 hours
    
    await db('userAccessRestrictions').insert({
      userId,
      restrictionType: 'KPI_ACCESS_SUSPENDED',
      reason,
      expiresAt: new Date(Date.now() + restrictionDuration),
      createdBy: 'SYSTEM'
    });
    
    // Invalidate user sessions
    await invalidateUserSessions(userId);
  }
}

// === USAGE IN MIDDLEWARE ===

export const securityMonitoringMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // Intercept response to log security events
    if (res.statusCode === 403) {
      const monitor = KpiSecurityMonitor.getInstance();
      monitor.logSecurityEvent({
        type: 'PERMISSION_DENIED',
        userId: req.user.id,
        resource: req.originalUrl,
        details: {
          method: req.method,
          params: req.params,
          query: req.query,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        },
        timestamp: new Date()
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};
```

### 10.2 Security Dashboard & Reports

```sql
-- === SECURITY REPORTING VIEWS ===

-- View: Daily permission violations
CREATE VIEW vw_daily_permission_violations AS
SELECT 
  DATE(createdAt) as violation_date,
  actionType,
  COUNT(*) as violation_count,
  COUNT(DISTINCT actorWorkspaceMemberId) as unique_users
FROM mktKpiPermissionAudit
WHERE success = false
GROUP BY DATE(createdAt), actionType
ORDER BY violation_date DESC;

-- View: Top violators
CREATE VIEW vw_top_permission_violators AS
SELECT 
  wm.nameFirstName || ' ' || wm.nameLastName as user_name,
  wm.userEmail,
  COUNT(*) as violation_count,
  MAX(audit.createdAt) as last_violation
FROM mktKpiPermissionAudit audit
JOIN workspaceMember wm ON audit.actorWorkspaceMemberId = wm.id
WHERE audit.success = false
  AND audit.createdAt >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY wm.id, wm.nameFirstName, wm.nameLastName, wm.userEmail
HAVING COUNT(*) > 5
ORDER BY violation_count DESC;

-- View: Permission changes audit
CREATE VIEW vw_permission_changes AS
SELECT 
  DATE(createdAt) as change_date,
  actionType,
  resourceType,
  COUNT(*) as change_count
FROM mktKpiPermissionAudit
WHERE actionType IN ('GRANT_PERMISSION', 'REVOKE_PERMISSION')
GROUP BY DATE(createdAt), actionType, resourceType
ORDER BY change_date DESC;
```

```typescript
// === SECURITY DASHBOARD API ===

router.get('/admin/security/dashboard',
  adminAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dashboardData = {
        // Today's violations
        todayViolations: await getTodayViolations(),
        
        // Top violators this month
        topViolators: await getTopViolators(30),
        
        // Permission changes trends
        permissionTrends: await getPermissionTrends(7),
        
        // Active temporary access
        activeTemporaryAccess: await getActiveTemporaryAccess(),
        
        // Security incidents
        openIncidents: await getOpenSecurityIncidents()
      };
      
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load security dashboard' });
    }
  }
);

async function getTodayViolations() {
  return await db('vw_daily_permission_violations')
    .where('violation_date', new Date().toISOString().split('T')[0])
    .orderBy('violation_count', 'desc');
}

async function getTopViolators(days: number) {
  return await db('vw_top_permission_violators')
    .limit(10);
}

async function getPermissionTrends(days: number) {
  return await db('vw_permission_changes')
    .where('change_date', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
    .orderBy('change_date', 'desc');
}

async function getActiveTemporaryAccess() {
  return await db('mktKpiTemporaryAccess')
    .select([
      'ta.*',
      'grantee.nameFirstName as granteeName',
      'granter.nameFirstName as granterName'
    ])
    .join('workspaceMember as grantee', 'ta.granteeWorkspaceMemberId', 'grantee.id')
    .join('workspaceMember as granter', 'ta.granterWorkspaceMemberId', 'granter.id')
    .where('ta.isActive', true)
    .where('ta.expiresAt', '>', new Date());
}
```

---

## 11. Best Practices & Guidelines

### 11.1 Security Implementation Checklist

```markdown
## KPI Security Implementation Checklist

### ✅ Authentication & Authorization
- [ ] Implement JWT/session-based authentication
- [ ] Role-based access control (RBAC) setup
- [ ] Object-level permissions configured
- [ ] Field-level permissions for sensitive data
- [ ] Row-level security through business logic

### ✅ Data Protection
- [ ] Sensitive fields encrypted at rest
- [ ] API responses filtered by user permissions
- [ ] SQL injection prevention (parameterized queries)
- [ ] Input validation and sanitization
- [ ] Rate limiting on sensitive endpoints

### ✅ Audit & Monitoring
- [ ] Comprehensive audit logging
- [ ] Security event monitoring
- [ ] Automated threat detection
- [ ] Real-time alerting system
- [ ] Regular security reports

### ✅ Advanced Security Features
- [ ] Temporary access management
- [ ] Delegation workflows
- [ ] Multi-factor authentication support
- [ ] Session management
- [ ] Access restriction mechanisms

### ✅ Testing & Validation
- [ ] Unit tests for permission logic
- [ ] Integration tests for API security
- [ ] Penetration testing
- [ ] Security code review
- [ ] Performance testing with security filters
```

### 11.2 Common Security Pitfalls & Solutions

```typescript
// === COMMON PITFALLS & HOW TO AVOID ===

// ❌ BAD: Direct database access without permission check
async function getKpiBad(kpiId: string) {
  return await db('mktKpi').where('id', kpiId).first();
}

// ✅ GOOD: Always check permissions
async function getKpiGood(kpiId: string, userId: string) {
  // 1. Check if user can read this KPI
  const canAccess = await checkKpiAccess(userId, kpiId, 'read');
  if (!canAccess) {
    throw new Error('Access denied');
  }
  
  // 2. Get KPI with field filtering
  const user = await getUserWithRole(userId);
  const allowedFields = getAllowedFieldsForRole(user.role.label, 'mktKpi');
  
  return await db('mktKpi')
    .select(allowedFields)
    .where('id', kpiId)
    .first();
}

// ❌ BAD: Mass update without individual permission check
async function updateKpisBulkBad(kpiIds: string[], updates: any) {
  return await db('mktKpi')
    .whereIn('id', kpiIds)
    .update(updates);
}

// ✅ GOOD: Check each KPI individually
async function updateKpisBulkGood(kpiIds: string[], updates: any, userId: string) {
  const results = [];
  
  for (const kpiId of kpiIds) {
    const canUpdate = await checkKpiAccess(userId, kpiId, 'update');
    if (canUpdate) {
      const updated = await db('mktKpi')
        .where('id', kpiId)
        .update(updates);
      results.push({ kpiId, success: true });
    } else {
      results.push({ kpiId, success: false, error: 'Access denied' });
    }
  }
  
  return results;
}

// ❌ BAD: Exposing sensitive data in API responses
async function getKpiListBad() {
  return await db('mktKpi').select('*');
}

// ✅ GOOD: Filter response based on user permissions
async function getKpiListGood(userId: string) {
  const user = await getUserWithRole(userId);
  
  // Apply row-level security
  const query = new SecureKpiQueryBuilder(
    db('mktKpi'), 
    await buildQueryContext(userId)
  ).applySecurityFilters();
  
  // Apply field-level security
  const allowedFields = getAllowedFieldsForRole(user.role.label, 'mktKpi');
  query.applyFieldSecurity(allowedFields);
  
  return await query.query;
}
```

### 11.3 Performance Optimization

```sql
-- === INDEXES FOR SECURITY QUERIES ===

-- Speed up permission checks
CREATE INDEX idx_mktKpi_assignee_type_id ON mktKpi(assigneeType, assigneeWorkspaceMemberId) 
WHERE deletedAt IS NULL;

CREATE INDEX idx_mktKpi_department_active ON mktKpi(assigneeDepartmentId) 
WHERE deletedAt IS NULL AND assigneeType = 'DEPARTMENT';

-- Speed up audit queries
CREATE INDEX idx_permission_audit_actor_date ON mktKpiPermissionAudit(actorWorkspaceMemberId, createdAt);
CREATE INDEX idx_permission_audit_resource_date ON mktKpiPermissionAudit(resourceType, resourceId, createdAt);

-- Speed up temporary access checks
CREATE INDEX idx_temp_access_active_user ON mktKpiTemporaryAccess(granteeWorkspaceMemberId, isActive, expiresAt);

-- Composite index for common security queries
CREATE INDEX idx_mktKpi_security_lookup ON mktKpi(assigneeType, assigneeWorkspaceMemberId, assigneeDepartmentId) 
WHERE deletedAt IS NULL;
```

```typescript
// === CACHING STRATEGIES ===

class PermissionCache {
  private static redis = new Redis(process.env.REDIS_URL);
  
  /**
   * Cache user permissions
   */
  static async cacheUserPermissions(userId: string, permissions: any) {
    const key = `permissions:${userId}`;
    await this.redis.setex(key, 300, JSON.stringify(permissions)); // 5 minutes cache
  }
  
  /**
   * Get cached permissions
   */
  static async getCachedPermissions(userId: string) {
    const key = `permissions:${userId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  /**
   * Invalidate user permissions cache
   */
  static async invalidateUserPermissions(userId: string) {
    const key = `permissions:${userId}`;
    await this.redis.del(key);
  }
  
  /**
   * Cache role permissions
   */
  static async cacheRolePermissions(roleLabel: string, permissions: any) {
    const key = `role_permissions:${roleLabel}`;
    await this.redis.setex(key, 3600, JSON.stringify(permissions)); // 1 hour cache
  }
}

// Usage in permission check functions
async function checkKpiAccessCached(userId: string, kpiId: string, action: string) {
  // 1. Try to get from cache first
  let userPermissions = await PermissionCache.getCachedPermissions(userId);
  
  if (!userPermissions) {
    // 2. Calculate permissions and cache
    userPermissions = await calculateUserPermissions(userId);
    await PermissionCache.cacheUserPermissions(userId, userPermissions);
  }
  
  // 3. Check specific KPI access
  return await checkSpecificKpiAccess(userPermissions, kpiId, action);
}
```

---

## 12. Migration Strategy

### 12.1 Phased Rollout Plan

```sql
-- === PHASE 1: BASIC RBAC SETUP ===

-- Step 1: Create basic roles
INSERT INTO core.role (label, description, workspaceId) VALUES
  ('KPI Admin', 'Toàn quyền quản lý KPI', 'workspace_id_here'),
  ('Sales Director', 'Xem tất cả KPI, phê duyệt target', 'workspace_id_here'),
  ('Sales Manager', 'Quản lý KPI team', 'workspace_id_here'),
  ('Sales Representative', 'Quản lý KPI cá nhân', 'workspace_id_here');

-- Step 2: Setup object permissions for existing KPI objects
INSERT INTO core.objectPermission (roleId, objectMetadataId, canReadObjectRecords, canUpdateObjectRecords)
SELECT 
  r.id,
  om.id,
  CASE r.label 
    WHEN 'KPI Admin' THEN true
    WHEN 'Sales Director' THEN true
    WHEN 'Sales Manager' THEN true
    WHEN 'Sales Representative' THEN true
    ELSE false
  END,
  CASE r.label 
    WHEN 'KPI Admin' THEN true
    WHEN 'Sales Director' THEN true
    WHEN 'Sales Manager' THEN true
    WHEN 'Sales Representative' THEN true
    ELSE false
  END
FROM core.role r
CROSS JOIN core.objectMetadata om
WHERE r.label IN ('KPI Admin', 'Sales Director', 'Sales Manager', 'Sales Representative')
  AND om.nameSingular IN ('mktKpi', 'mktKpiHistory', 'mktKpiTemplate');
```

```bash
#!/bin/bash
# === DEPLOYMENT SCRIPT ===

echo "🚀 Starting KPI Permission System Deployment..."

# Phase 1: Database migrations
echo "📊 Running database migrations..."
npm run migrate:permissions

# Phase 2: Deploy basic RBAC
echo "🔐 Setting up basic roles..."
npm run setup:roles

# Phase 3: Migrate existing users
echo "👥 Migrating existing users to new roles..."
npm run migrate:users

# Phase 4: Deploy API with feature flags
echo "🌐 Deploying API with feature flags..."
export FEATURE_KPI_PERMISSIONS=enabled
npm run deploy:api

# Phase 5: Gradual rollout
echo "⚡ Starting gradual rollout..."
export KPI_PERMISSIONS_ROLLOUT_PERCENTAGE=10
npm run rollout:gradual

echo "✅ Deployment completed successfully!"
```

### 12.2 Rollback Strategy

```typescript
// === ROLLBACK PROCEDURES ===

class PermissionRollback {
  /**
   * Rollback to legacy permission system
   */
  static async rollbackToLegacy() {
    console.log('🔄 Starting rollback to legacy permissions...');
    
    // 1. Disable new permission system
    await this.disableNewPermissionSystem();
    
    // 2. Re-enable legacy permission checks
    await this.enableLegacyPermissions();
    
    // 3. Clear permission caches
    await this.clearPermissionCaches();
    
    // 4. Notify teams
    await this.notifyRollback();
    
    console.log('✅ Rollback completed');
  }
  
  private static async disableNewPermissionSystem() {
    // Set feature flag to disable new system
    await db('featureFlags').where('key', 'KPI_PERMISSIONS_V2').update({ enabled: false });
  }
  
  private static async enableLegacyPermissions() {
    // Re-enable legacy middleware
    process.env.USE_LEGACY_PERMISSIONS = 'true';
  }
  
  private static async clearPermissionCaches() {
    const redis = new Redis(process.env.REDIS_URL);
    await redis.flushdb();
  }
  
  private static async notifyRollback() {
    await sendSlackAlert({
      channel: '#engineering',
      message: '🔄 KPI Permission system has been rolled back to legacy version'
    });
  }
}
```

---

## 13. Conclusion

Hệ thống phân quyền KPI được thiết kế tận dụng tối đa cấu trúc Twenty.com hiện có:

### ✅ **Ưu điểm chính:**

1. **Tương thích hoàn toàn** với hệ thống Twenty.com
2. **Multi-layered security**: Object → Field → Row level
3. **Flexible & Extensible**: Dễ mở rộng cho các module khác
4. **Performance optimized**: Caching, indexing, efficient queries
5. **Comprehensive auditing**: Track mọi thay đổi permission

### 🔧 **Tính năng nổi bật:**

- **Role hierarchy** phù hợp với cấu trúc sales
- **Temporary access** cho trường hợp đặc biệt
- **Delegation workflows** khi nhân viên nghỉ phép
- **Real-time monitoring** và alerting
- **Secure API design** với proper middleware

### 📈 **Khả năng mở rộng:**

- Dễ dàng thêm role mới
- Support multi-tenant architecture
- Integration với external systems
- Scalable caching strategy

Hệ thống này đảm bảo bảo mật cao while maintaining usability và performance cho hệ thống KPI management trong môi trường enterprise.