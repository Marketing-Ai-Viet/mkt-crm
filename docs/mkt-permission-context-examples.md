# 🎯 MktPermissionContextWorkspaceEntity - Giải thích qua Ví dụ Chi tiết

## 📝 Ví dụ 1: Công ty ABC Corp - Hệ thống CRM với 1000 nhân viên

### 🏢 Cấu trúc tổ chức:
```
ABC Corp
├── Sales Department (200 người)
│   ├── North Region Team (50 người) - Team Lead: John
│   ├── South Region Team (80 người) - Team Lead: Mary  
│   └── Enterprise Team (70 người) - Team Lead: David
├── Marketing Department (150 người)
└── Support Department (100 người)
```

### 🗂️ Dữ liệu khách hàng mẫu:

```typescript
// Bảng Customers
const customers = [
  { 
    id: 'cust-001', 
    name: 'Vingroup', 
    assignedSalesRep: 'john-doe',     // Thuộc North Region
    department: 'SALES',
    teamId: 'north-team',
    value: 5000000,
    createdBy: 'john-doe',
    status: 'ACTIVE'
  },
  { 
    id: 'cust-002', 
    name: 'FPT Corp', 
    assignedSalesRep: 'mary-smith',   // Thuộc South Region
    department: 'SALES', 
    teamId: 'south-team',
    value: 3000000,
    createdBy: 'mary-smith',
    status: 'PROSPECT'
  },
  { 
    id: 'cust-003', 
    name: 'Viettel', 
    assignedSalesRep: 'david-wilson', // Thuộc Enterprise Team
    department: 'SALES',
    teamId: 'enterprise-team', 
    value: 10000000,
    createdBy: 'david-wilson',
    status: 'ACTIVE'
  }
];
```

## 🔍 Context Definitions - Các phạm vi truy cập

### Context 1: OWN_RECORDS - "Chỉ bản ghi của mình"
```typescript
{
  id: 'context-own',
  contextKey: 'OWN',
  contextType: 'OWN_RECORDS',
  filterExpression: {
    "createdBy": "{{currentUserId}}"  // Chỉ record do mình tạo
  },
  description: 'Nhân viên chỉ xem được khách hàng do mình tạo'
}
```

### Context 2: TEAM_RECORDS - "Bản ghi của team"
```typescript
{
  id: 'context-team', 
  contextKey: 'TEAM',
  contextType: 'TEAM_RECORDS',
  filterExpression: {
    "teamId": "{{currentUserTeamId}}"  // Cùng team
  },
  description: 'Team Lead xem được tất cả khách hàng trong team'
}
```

### Context 3: DEPARTMENT_RECORDS - "Bản ghi phòng ban"
```typescript
{
  id: 'context-dept',
  contextKey: 'DEPARTMENT', 
  contextType: 'DEPARTMENT_RECORDS',
  filterExpression: {
    "department": "{{currentUserDepartment}}"  // Cùng phòng ban
  },
  description: 'Manager xem được tất cả khách hàng trong phòng ban'
}
```

### Context 4: ALL_RECORDS - "Tất cả bản ghi"
```typescript
{
  id: 'context-all',
  contextKey: 'ALL',
  contextType: 'ALL_RECORDS', 
  filterExpression: {},  // Không filter gì
  description: 'CEO/Director xem được tất cả'
}
```

## 👥 User Profiles và Template Assignments

### 1. **Sales Rep - Nguyễn Văn A (john-doe)**
```typescript
const johnProfile = {
  userId: 'john-doe',
  name: 'Nguyễn Văn A',
  position: 'Sales Representative',
  department: 'SALES',
  teamId: 'north-team',
  hierarchyLevel: 6,  // Employee level
  
  // Template assignment
  assignedTemplate: {
    templateKey: 'EMPLOYEE',
    contextId: 'context-own'  // ← Chỉ xem record của mình
  }
};
```

### 2. **Team Lead - Trần Thị B (mary-smith)**  
```typescript
const maryProfile = {
  userId: 'mary-smith',
  name: 'Trần Thị B', 
  position: 'Team Lead',
  department: 'SALES',
  teamId: 'south-team',
  hierarchyLevel: 4,  // Manager level
  
  // Template assignment
  assignedTemplate: {
    templateKey: 'MANAGER',
    contextId: 'context-team'  // ← Xem tất cả record trong team
  }
};
```

### 3. **Sales Director - Lê Văn C (david-wilson)**
```typescript
const davidProfile = {
  userId: 'david-wilson',
  name: 'Lê Văn C',
  position: 'Sales Director', 
  department: 'SALES',
  teamId: 'enterprise-team',
  hierarchyLevel: 3,  // Director level
  
  // Template assignment  
  assignedTemplate: {
    templateKey: 'DIRECTOR',
    contextId: 'context-dept'  // ← Xem tất cả record trong Sales
  }
};
```

### 4. **CEO - Phạm Văn D (ceo-user)**
```typescript
const ceoProfile = {
  userId: 'ceo-user',
  name: 'Phạm Văn D',
  position: 'CEO',
  department: 'EXECUTIVE', 
  hierarchyLevel: 1,  // CEO level
  
  // Template assignment
  assignedTemplate: {
    templateKey: 'CEO',
    contextId: 'context-all'  // ← Xem tất cả mọi thứ
  }
};
```

## 🔄 Runtime Examples - Các tình huống thực tế

### **Scenario 1: Sales Rep John truy cập danh sách khách hàng**

**Request:**
```typescript
GET /api/customers
Headers: { Authorization: "Bearer john-doe-token" }
```

**RBAC Processing:**
```typescript
// Step 1: Identify user context
const userContext = {
  userId: 'john-doe',
  department: 'SALES', 
  teamId: 'north-team',
  hierarchyLevel: 6
};

// Step 2: Load user's template
const template = 'EMPLOYEE';  // From MktUserPermissionTemplate
const context = 'context-own'; // From MktTemplateResourcePermission

// Step 3: Apply context filter
const contextFilter = {
  "createdBy": "john-doe"  // Chỉ record do john tạo
};

// Step 4: Build final query
SELECT * FROM customers 
WHERE created_by = 'john-doe';
```

**Result cho John:**
```javascript
[
  { 
    id: 'cust-001', 
    name: 'Vingroup',
    assignedSalesRep: 'john-doe',
    value: 5000000,
    // Chỉ khách hàng này vì john đã tạo
  }
  // cust-002, cust-003 KHÔNG hiển thị vì không phải john tạo
]
```

### **Scenario 2: Team Lead Mary truy cập danh sách khách hàng**

**Request:**
```typescript
GET /api/customers  
Headers: { Authorization: "Bearer mary-smith-token" }
```

**RBAC Processing:**
```typescript
// Step 1: User context
const userContext = {
  userId: 'mary-smith',
  department: 'SALES',
  teamId: 'south-team', 
  hierarchyLevel: 4
};

// Step 2: Template & Context
const template = 'MANAGER';
const context = 'context-team';

// Step 3: Apply context filter
const contextFilter = {
  "teamId": "south-team"  // Tất cả record trong south team
};

// Step 4: Final query
SELECT * FROM customers 
WHERE team_id = 'south-team';
```

**Result cho Mary:**
```javascript
[
  { 
    id: 'cust-002', 
    name: 'FPT Corp',
    assignedSalesRep: 'mary-smith', 
    teamId: 'south-team',
    // Mary thấy được vì thuộc south-team
  }
  // Các khách hàng khác của south-team cũng hiển thị
  // cust-001, cust-003 KHÔNG hiển thị vì khác team
]
```

### **Scenario 3: Sales Director David truy cập báo cáo**

**Request:** 
```typescript
GET /api/reports/sales-performance
Headers: { Authorization: "Bearer david-wilson-token" }
```

**RBAC Processing:**
```typescript
// Step 1: User context  
const userContext = {
  userId: 'david-wilson',
  department: 'SALES',
  hierarchyLevel: 3
};

// Step 2: Template & Context
const template = 'DIRECTOR'; 
const context = 'context-dept';

// Step 3: Apply context filter
const contextFilter = {
  "department": "SALES"  // Tất cả record trong Sales department
};

// Step 4: Final query cho report
SELECT 
  team_id,
  COUNT(*) as customer_count,
  SUM(value) as total_value
FROM customers 
WHERE department = 'SALES'  -- Context filter
GROUP BY team_id;
```

**Result cho David:**
```javascript
{
  salesPerformance: [
    { team: 'north-team', customers: 15, revenue: 25000000 },
    { team: 'south-team', customers: 22, revenue: 35000000 }, 
    { team: 'enterprise-team', customers: 8, revenue: 80000000 }
  ],
  // David thấy được tất cả team trong Sales department
  totalRevenue: 140000000
}
```

### **Scenario 4: CEO truy cập dashboard tổng quan**

**Request:**
```typescript
GET /api/dashboard/executive
Headers: { Authorization: "Bearer ceo-token" }
```

**RBAC Processing:**
```typescript
// Step 1: User context
const userContext = {
  userId: 'ceo-user',
  hierarchyLevel: 1  // CEO level
};

// Step 2: Template & Context  
const template = 'CEO';
const context = 'context-all';  

// Step 3: Apply context filter
const contextFilter = {};  // KHÔNG filter gì - toàn quyền

// Step 4: Final query
SELECT 
  department,
  COUNT(*) as customer_count,
  SUM(value) as revenue
FROM customers   -- Không có WHERE clause
GROUP BY department;
```

**Result cho CEO:**
```javascript
{
  executiveDashboard: {
    totalCustomers: 1247,
    totalRevenue: 250000000,
    departmentBreakdown: [
      { dept: 'SALES', customers: 856, revenue: 180000000 },
      { dept: 'MARKETING', customers: 234, revenue: 45000000 },
      { dept: 'SUPPORT', customers: 157, revenue: 25000000 }
    ]
    // CEO thấy được TẤT CẢ dữ liệu
  }
}
```

## 🔍 Advanced Context Examples

### **Context với Multiple Conditions**
```typescript
// Context cho Sales Manager - chỉ thấy deal dưới 1M
{
  contextKey: 'SALES_MANAGER_LIMITED',
  contextType: 'CUSTOM_FILTER',
  filterExpression: {
    "AND": [
      { "department": "{{currentUserDepartment}}" },
      { "dealValue": { "$lte": 1000000 } },         // <= 1M
      { "status": { "$in": ["ACTIVE", "PROSPECT"] } },
      { "assignedTo": { "$in": "{{currentUserTeamMembers}}" } }
    ]
  }
}
```

**Runtime Application:**
```typescript
// Manager với team có 5 người
const teamMembers = ['emp1', 'emp2', 'emp3', 'emp4', 'emp5'];

// Generated SQL
SELECT * FROM customers 
WHERE department = 'SALES'
  AND deal_value <= 1000000
  AND status IN ('ACTIVE', 'PROSPECT') 
  AND assigned_to IN ('emp1', 'emp2', 'emp3', 'emp4', 'emp5');
```

### **Time-based Context**
```typescript
// Context chỉ hoạt động trong giờ hành chính
{
  contextKey: 'BUSINESS_HOURS_ONLY',
  contextType: 'TIME_LIMITED',
  filterExpression: {
    "timeWindow": {
      "start": "08:00",
      "end": "18:00", 
      "timezone": "Asia/Ho_Chi_Minh",
      "weekdays": ["Mon", "Tue", "Wed", "Thu", "Fri"]
    }
  },
  validationRules: {
    "currentTimeCheck": true,
    "blockAfterHours": true
  }
}
```

**Runtime Validation:**
```typescript
// Kiểm tra thời gian hiện tại
const now = new Date(); // 2024-01-15 14:30:00 (2:30 PM Monday)
const vietnamTime = now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"});

// Validation result
if (isWithinBusinessHours(vietnamTime)) {
  // ✅ Cho phép truy cập - đang trong giờ hành chính
  return applyNormalContext();
} else {
  // ❌ Từ chối - ngoài giờ hành chính
  throw new Error("Access denied outside business hours");
}
```

### **Location-based Context**
```typescript
// Context chỉ cho phép truy cập từ office
{
  contextKey: 'OFFICE_ONLY',
  contextType: 'LOCATION_LIMITED',
  filterExpression: {
    "allowedIPs": ["192.168.1.0/24", "10.0.0.0/16"],
    "requiredVPN": false,
    "allowedLocations": ["office", "home_vpn"]
  },
  validationRules: {
    "strictIPCheck": true,
    "logUnauthorizedAccess": true
  }
}
```

**Runtime Validation:**
```typescript
// Kiểm tra IP của user
const clientIP = request.ip; // 192.168.1.55
const isInOfficeNetwork = isIPInRange(clientIP, "192.168.1.0/24");

if (isInOfficeNetwork) {
  // ✅ Từ office - cho phép truy cập đầy đủ
  return applyFullContext();
} else {
  // ⚠️ Từ bên ngoài - giới hạn truy cập hoặc yêu cầu VPN
  return applyRestrictedContext();
}
```

## 🎯 **Context Priority Resolution**

### **Scenario: User có nhiều template**
```typescript
// User John được assign 2 template (VD: promotion)
const johnTemplates = [
  {
    template: 'EMPLOYEE',     // Priority: 500
    context: 'OWN_RECORDS',   // Chỉ record của mình
    assignedReason: 'Default position'
  },
  {
    template: 'TEMP_MANAGER', // Priority: 700  
    context: 'TEAM_RECORDS',  // Tất cả record trong team
    assignedReason: 'Temporary team lead during vacation',
    expiresAt: '2024-02-01'
  }
];

// Resolution logic
const activeTemplates = johnTemplates
  .filter(t => !t.expiresAt || new Date(t.expiresAt) > new Date())
  .sort((a, b) => b.priority - a.priority);

// Result: TEMP_MANAGER được chọn (priority cao hơn)
const selectedContext = 'TEAM_RECORDS';  // John tạm thời thấy cả team
```

### **Context Inheritance Chain**
```typescript
// Complex scenario: Multi-level context inheritance
const contextChain = [
  {
    level: 'USER_SPECIFIC',    // Priority: 1000
    contextId: 'user-override-context',
    reason: 'Emergency access granted'
  },
  {
    level: 'ROLE_BASED',       // Priority: 800
    contextId: 'manager-context', 
    reason: 'Primary role assignment'
  },
  {
    level: 'DEPARTMENT',       // Priority: 600
    contextId: 'sales-dept-context',
    reason: 'Department membership'
  },
  {
    level: 'COMPANY_DEFAULT',  // Priority: 100
    contextId: 'employee-default-context',
    reason: 'Company-wide default'
  }
];

// Resolved context: USER_SPECIFIC (highest priority)
```

## 📊 **Performance Impact**

### **Without Context (Insecure):**
```sql
-- Tất cả user đều thấy tất cả
SELECT * FROM customers;  -- 50,000 records returned
-- ❌ Security risk, performance issue
```

### **With Context (Secure & Optimized):**
```sql
-- Sales Rep
SELECT * FROM customers 
WHERE created_by = 'john-doe';  -- 25 records returned

-- Team Lead  
SELECT * FROM customers
WHERE team_id = 'north-team';   -- 150 records returned

-- Director
SELECT * FROM customers  
WHERE department = 'SALES';     -- 2,500 records returned

-- CEO
SELECT * FROM customers;        -- 50,000 records (but with proper authorization)
```

**Index Optimization:**
```sql
-- Database indexes được tối ưu theo context patterns
CREATE INDEX idx_customers_created_by ON customers(created_by);
CREATE INDEX idx_customers_team_id ON customers(team_id);  
CREATE INDEX idx_customers_department ON customers(department);
CREATE COMPOSITE INDEX idx_customers_context ON customers(department, team_id, created_by);
```

### **Query Performance Comparison:**

| Context Type | Records Filtered | Query Time | Memory Usage |
|--------------|------------------|------------|--------------|
| OWN_RECORDS | 25 / 50,000 | 5ms | 12KB |
| TEAM_RECORDS | 150 / 50,000 | 15ms | 68KB |
| DEPT_RECORDS | 2,500 / 50,000 | 45ms | 1.2MB |
| ALL_RECORDS | 50,000 / 50,000 | 180ms | 24MB |

## 🔒 **Security Benefits**

### **Row-Level Security tự động:**
- ✅ **Data Isolation**: Mỗi user chỉ thấy đúng dữ liệu được phép
- ✅ **Zero Trust**: Mọi truy cập đều được validate 
- ✅ **Audit Ready**: Log đầy đủ ai truy cập gì
- ✅ **Performance**: Filter tại database level
- ✅ **Scalable**: Handle được millions records

### **Business Rule Enforcement:**
- ✅ **Hierarchy Respect**: Cấp trên thấy được cấp dưới
- ✅ **Department Boundaries**: Phòng ban không xem lẫn nhau
- ✅ **Time Restrictions**: Giới hạn theo giờ hành chính
- ✅ **Value Limits**: Manager chỉ thấy deal dưới threshold

### **Compliance Features:**
- ✅ **GDPR Ready**: Right to be forgotten, data portability
- ✅ **SOX Compliant**: Financial data access controls
- ✅ **Audit Trail**: Complete access logging
- ✅ **Data Classification**: Sensitive data protection

## 🚀 **Real-world Integration Example**

### **API Middleware Implementation:**
```typescript
// Context Resolution Middleware
async function contextMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Extract user from JWT token
    const user = await extractUserFromToken(req.headers.authorization);
    
    // 2. Load user's active templates
    const templates = await loadUserTemplates(user.id);
    
    // 3. Resolve context for requested resource
    const resourceType = extractResourceType(req.path); // 'customers', 'orders', etc.
    const context = await resolveContext(templates, resourceType);
    
    // 4. Build context filter
    const contextFilter = await buildContextFilter(context, user);
    
    // 5. Inject into request for downstream use
    req.rbacContext = {
      user,
      context,
      filter: contextFilter
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Access denied' });
  }
}

// Usage in controller
app.get('/api/customers', contextMiddleware, async (req, res) => {
  const { filter } = req.rbacContext;
  
  // Apply context filter to query
  const customers = await Customer.find({
    ...req.query,
    ...filter  // ← Context filter tự động được thêm
  });
  
  res.json(customers);
});
```

### **GraphQL Integration:**
```typescript
// GraphQL Resolver với Context
const resolvers = {
  Query: {
    customers: async (parent, args, context) => {
      // Context đã được inject từ middleware
      const { rbacContext } = context;
      
      return await Customer.find({
        ...args.where,
        ...rbacContext.filter  // Apply context automatically
      });
    }
  }
};
```

## 📈 **Monitoring & Analytics**

### **Context Usage Metrics:**
```typescript
// Track context usage patterns
const contextMetrics = {
  'OWN_RECORDS': {
    users: 850,           // 850 users use this context
    avgRecordsAccessed: 25,
    peakUsageHour: '10:00',
    deniedAttempts: 12    // 12 attempts blocked
  },
  'TEAM_RECORDS': {
    users: 120,
    avgRecordsAccessed: 150,
    peakUsageHour: '14:00',
    deniedAttempts: 8
  },
  'DEPT_RECORDS': {
    users: 25,
    avgRecordsAccessed: 2500,
    peakUsageHour: '09:00',
    deniedAttempts: 3
  },
  'ALL_RECORDS': {
    users: 5,             // Only 5 executives
    avgRecordsAccessed: 50000,
    peakUsageHour: '08:00',
    deniedAttempts: 1
  }
};
```

### **Security Alerts:**
```typescript
// Monitor suspicious access patterns
const securityAlerts = [
  {
    type: 'CONTEXT_ESCALATION_ATTEMPT',
    user: 'john-doe',
    attempted: 'ALL_RECORDS',
    assigned: 'OWN_RECORDS',
    timestamp: '2024-01-15T10:30:00Z',
    blocked: true
  },
  {
    type: 'UNUSUAL_ACCESS_VOLUME',
    user: 'mary-smith', 
    normalVolume: 150,
    currentVolume: 2500,
    timestamp: '2024-01-15T11:00:00Z',
    flagged: true
  }
];
```

## 🎯 **Kết luận**

**MktPermissionContextWorkspaceEntity** là trái tim của enterprise-grade security trong Twenty CRM:

### **✅ Core Value:**
1. **Precise Access Control** - Kiểm soát truy cập chính xác đến từng bản ghi
2. **Dynamic Security** - Bảo mật thích ứng theo context người dùng
3. **Performance Optimized** - Tối ưu hiệu suất với database-level filtering
4. **Compliance Ready** - Đáp ứng các tiêu chuẩn bảo mật doanh nghiệp

### **🚀 Enterprise Benefits:**
- **Scalability**: Xử lý millions records với performance tốt
- **Security**: Zero-trust architecture với row-level security
- **Flexibility**: Dễ dàng customize theo business rules
- **Auditability**: Traceability đầy đủ cho compliance

### **💼 Business Impact:**
- **Risk Reduction**: Giảm thiểu rủi ro data breach
- **Compliance**: Đáp ứng GDPR, SOX, HIPAA requirements  
- **Productivity**: Users truy cập đúng dữ liệu cần thiết
- **Trust**: Khách hàng tin tương vào bảo mật dữ liệu

**MktPermissionContextWorkspaceEntity chính là foundation cho enterprise-grade CRM với security, performance và compliance world-class!** 🛡️🚀