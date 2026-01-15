# Sơ đồ Mối quan hệ Entity trong Hệ thống RBAC

## Tổng quan

Tài liệu này mô tả mối quan hệ giữa các entity trong hệ thống phân quyền RBAC Enterprise Grade của CRM.

---

## 1. Entity Relationship Diagram - Tổng quan

```mermaid
erDiagram
    %% ==================== CORE ENTITIES ====================
    WorkspaceMember ||--o{ MktUserPermissionTemplate : "được gán"
    WorkspaceMember ||--o{ MktUserPermissionOverride : "có override"
    WorkspaceMember ||--o{ MktTemporaryPermission : "nhận quyền tạm"
    WorkspaceMember ||--o{ MktTemporaryPermission : "cấp quyền tạm"
    WorkspaceMember ||--o{ MktPermissionAudit : "tạo audit log"
    WorkspaceMember ||--o{ MktDataAccessPolicy : "áp dụng policy"

    %% ==================== TEMPLATE RELATIONSHIPS ====================
    MktPermissionTemplate ||--o{ MktTemplateResourcePermission : "chứa"
    MktPermissionTemplate ||--o{ MktTemplateSystemAction : "chứa"
    MktPermissionTemplate ||--o{ MktTemplateAccessLimitation : "chứa"
    MktPermissionTemplate ||--o{ MktUserPermissionTemplate : "được gán cho"
    MktPermissionTemplate ||--o{ MktDataAccessPolicy : "sinh ra"
    MktPermissionTemplate }o--|| MktOrganizationLevel : "thuộc về"

    %% ==================== RESOURCE & ACTION ====================
    MktPermissionResource ||--o{ MktTemplateResourcePermission : "được cấp quyền"
    MktPermissionResource ||--o{ MktUserPermissionOverride : "bị override"
    MktPermissionAction ||--o{ MktUserPermissionOverride : "bị override"
    MktPermissionContext ||--o{ MktTemplateResourcePermission : "áp dụng context"

    %% ==================== CASBIN POLICY ====================
    MktPolicyChangeRequest ||--o{ MktPolicyApproval : "cần approval"

    %% ==================== DEPARTMENT & ORG ====================
    MktDepartment ||--o{ MktDataAccessPolicy : "áp dụng"
    MktOrganizationLevel ||--o{ MktDataAccessPolicy : "áp dụng"
    MktOrganizationLevel ||--o{ MktPermissionTemplate : "có templates"
```

---

## 2. Chi tiết Entity theo Domain

### 2.1 Template Domain

```mermaid
erDiagram
    MktPermissionTemplate {
        uuid id PK
        string templateKey UK "CEO, VP, DIRECTOR..."
        string templateName "Tên hiển thị"
        enum templateType "ROLE_BASED, HIERARCHY_BASED, DEPARTMENT_BASED"
        string departmentType "SALES, SUPPORT, ACCOUNTING..."
        int hierarchyLevel "1-11"
        json applicableToLevels "Array levels"
        string version "v1.0.0"
        boolean isSystemTemplate
        boolean isActive
        int priority "100-1000"
        enum resolutionStrategy "PRIORITY_BASED, MOST_RESTRICTIVE"
        datetime effectiveFrom
        datetime effectiveTo
        uuid organizationLevelId FK
        uuid createdById FK
    }

    MktTemplateResourcePermission {
        uuid id PK
        uuid templateId FK
        uuid resourceId FK
        uuid contextId FK
        json allowedActions "['READ', 'CREATE', 'UPDATE']"
        json deniedActions "['DELETE']"
        json conditions "Điều kiện"
        json restrictions "Giới hạn"
        boolean isActive
    }

    MktTemplateSystemAction {
        uuid id PK
        uuid templateId FK
        string actionKey "MANAGE_USERS, EXPORT_DATA..."
        boolean isAllowed
        json configuration
        json restrictions
        boolean isActive
    }

    MktTemplateAccessLimitation {
        uuid id PK
        uuid templateId FK
        enum limitationType "TIME, IP, LOCATION, DEVICE"
        string limitationKey "working_hours, session_timeout"
        json limitationValue "Config JSON"
        boolean isEnforced
        enum severity "WARNING, BLOCK, ALERT"
        boolean isActive
    }

    MktUserPermissionTemplate {
        uuid id PK
        uuid workspaceMemberId FK
        uuid templateId FK
        boolean isActive
        datetime assignedAt
        uuid assignedById FK
        datetime expiresAt
        string assignmentReason
    }

    MktPermissionTemplate ||--o{ MktTemplateResourcePermission : "1:N"
    MktPermissionTemplate ||--o{ MktTemplateSystemAction : "1:N"
    MktPermissionTemplate ||--o{ MktTemplateAccessLimitation : "1:N"
    MktPermissionTemplate ||--o{ MktUserPermissionTemplate : "1:N"
```

### 2.2 Permission Domain

```mermaid
erDiagram
    MktPermissionResource {
        uuid id PK
        string resourceKey UK "CUSTOMER, ORDER, INVOICE..."
        string resourceName "Khách hàng, Đơn hàng..."
        enum resourceCategory "BUSINESS_DATA, FINANCIAL, SENSITIVE_DATA"
        string description
        boolean isSystemResource
        boolean isActive
        int displayOrder
        string icon
        string colorCode
    }

    MktPermissionAction {
        uuid id PK
        string actionKey UK "READ, CREATE, UPDATE, DELETE..."
        string actionName "Xem, Tạo mới, Cập nhật..."
        enum actionCategory "BASIC_CRUD, DATA_TRANSFER, WORKFLOW, ADMIN"
        string description
        enum riskLevel "LOW, MEDIUM, HIGH, CRITICAL"
        boolean requiresApproval
        boolean isSystemAction
        boolean isActive
    }

    MktPermissionContext {
        uuid id PK
        string name "Own Records Only"
        string description
        enum contextType "OWNERSHIP, DEPARTMENT, HIERARCHY, CUSTOM"
        string contextKey "own, department, all, custom"
        json filterExpression "Expression JSON"
        int priority
        boolean isActive
        boolean isSystemDefault
        json validationRules
    }

    MktPermissionPriorityConfig {
        uuid id PK
        enum sourceType "TEMPLATE, OVERRIDE, POLICY"
        enum sourceSubType "EMERGENCY, COMPLIANCE, ROLE_BASED..."
        int basePriority "100"
        int priorityBoost "0"
        int maxPriority
        int minPriority
        string priorityFormula "basePriority + boost * level"
        json conditions
        boolean isActive
        string description
    }
```

### 2.3 Policy Domain

```mermaid
erDiagram
    MktDataAccessPolicy {
        uuid id PK
        string name "Sales - Customer Access"
        string description
        uuid departmentId FK
        uuid specificMemberId FK
        uuid organizationLevelId FK
        uuid permissionTemplateId FK
        string objectName "mktCustomer, mktOrder..."
        json filterConditions "Filter rules JSON"
        int priority
        boolean isActive
        enum policyType "ROW_LEVEL, FIELD_LEVEL, COLUMN_LEVEL"
        enum evaluationMode "STRICT, PERMISSIVE, BALANCED"
        enum riskLevel "LOW, MEDIUM, HIGH, CRITICAL"
        enum conflictResolution "DENY_WINS, ALLOW_WINS, HIGHEST_PRIORITY"
    }

    MktCasbinRule {
        uuid id PK
        string ptype "p, g, g2"
        string subject "user:uuid, role:SALES_STAFF"
        string object "mktCustomer, role:MANAGER"
        string action "read, write, delete, *"
        string effect "allow, deny"
        string condition "ABAC condition"
    }

    MktPolicyVersion {
        uuid id PK
        int version "Auto-increment"
        string policyHash "SHA-256"
        int policyCount
        datetime syncedAt
    }
```

### 2.4 Approval Workflow Domain

```mermaid
erDiagram
    MktPolicyChangeRequest {
        uuid id PK
        string title "Add Admin Role"
        enum status "PENDING, APPROVED, REJECTED, APPLIED, EXPIRED"
        enum changeType "CREATE, UPDATE, DELETE"
        json policyData "Policy JSON"
        json riskAssessment "Risk analysis"
        int requiredApprovals "1 or 2 for dual-sign"
        int currentApprovals
        string requestReason
        uuid requestedById FK
    }

    MktPolicyApproval {
        uuid id PK
        string title
        uuid changeRequestId FK
        uuid approverId FK
        enum decision "APPROVED, REJECTED"
        string reason "Approval/Rejection reason"
    }

    MktPolicyChangeRequest ||--o{ MktPolicyApproval : "1:N"
```

### 2.5 Override & Temporary Permission Domain

```mermaid
erDiagram
    MktUserPermissionOverride {
        uuid id PK
        uuid workspaceMemberId FK
        uuid resourceId FK
        uuid actionId FK
        boolean isAllowed "Grant or Deny"
        json contextFilter "Own records filter"
        datetime expiresAt
        enum reason "TEMPORARY_ACCESS, SPECIAL_PROJECT..."
        string reasonDescription
        uuid approvedById FK
        datetime approvedAt
        boolean isActive
    }

    MktTemporaryPermission {
        uuid id PK
        uuid granteeWorkspaceMemberId FK
        uuid granterWorkspaceMemberId FK
        string objectName "mktCustomer"
        uuid recordId "Specific record or null"
        boolean canRead
        boolean canUpdate
        boolean canDelete
        datetime expiresAt
        string reason
        enum purpose "SUPPORT_TICKET, PROJECT_ASSISTANCE..."
        boolean isActive
        datetime revokedAt
        uuid revokedById FK
        enum revokeReason "TASK_COMPLETED, SECURITY_CONCERN..."
    }

    WorkspaceMember ||--o{ MktUserPermissionOverride : "có overrides"
    WorkspaceMember ||--o{ MktTemporaryPermission : "nhận quyền"
    WorkspaceMember ||--o{ MktTemporaryPermission : "cấp quyền"
    WorkspaceMember ||--o{ MktTemporaryPermission : "thu hồi quyền"
    MktPermissionResource ||--o{ MktUserPermissionOverride : "được override"
    MktPermissionAction ||--o{ MktUserPermissionOverride : "được override"
```

### 2.6 Audit Domain

```mermaid
erDiagram
    MktPermissionAudit {
        uuid id PK
        uuid workspaceMemberId FK
        string userId "core.user ID"
        enum action "READ, CREATE, UPDATE, DELETE..."
        string objectName "mktCustomer"
        string recordId "Specific record ID"
        enum permissionSource "TEMPLATE, OVERRIDE, POLICY, CASBIN"
        enum checkResult "ALLOWED, DENIED, PARTIALLY_ALLOWED"
        string denialReason
        json requestContext "Request metadata"
        string ipAddress
        string userAgent
        int checkDurationMs
        json stepResults "Validation steps"
        boolean cacheHit
        string executionPath
        string requestId "Trace ID"
        json metadata "Extensible"
    }

    WorkspaceMember ||--o{ MktPermissionAudit : "1:N"
```

---

## 3. Relationship với External Entities

```mermaid
flowchart TB
    subgraph "Core Entities"
        WM[WorkspaceMember]
        DEPT[MktDepartment]
        ORG[MktOrganizationLevel]
    end

    subgraph "Template Layer"
        PT[MktPermissionTemplate]
        TRP[MktTemplateResourcePermission]
        TSA[MktTemplateSystemAction]
        TAL[MktTemplateAccessLimitation]
        UPT[MktUserPermissionTemplate]
    end

    subgraph "Permission Layer"
        PR[MktPermissionResource]
        PA[MktPermissionAction]
        PC[MktPermissionContext]
        PPC[MktPermissionPriorityConfig]
    end

    subgraph "Policy Layer"
        DAP[MktDataAccessPolicy]
        CR[MktCasbinRule]
        PV[MktPolicyVersion]
    end

    subgraph "Override Layer"
        UPO[MktUserPermissionOverride]
        TP[MktTemporaryPermission]
    end

    subgraph "Approval Layer"
        PCR[MktPolicyChangeRequest]
        PAP[MktPolicyApproval]
    end

    subgraph "Audit Layer"
        PAU[MktPermissionAudit]
    end

    %% Core -> Template
    WM -->|được gán| UPT
    WM -->|tạo| PT
    ORG -->|có| PT

    %% Template -> Detail
    PT -->|chứa| TRP
    PT -->|chứa| TSA
    PT -->|chứa| TAL
    PT -->|gán cho| UPT
    PT -->|sinh ra| DAP

    %% Permission -> Template
    PR -->|trong| TRP
    PA -->|được override| UPO
    PC -->|áp dụng| TRP

    %% Core -> Policy
    DEPT -->|áp dụng| DAP
    ORG -->|áp dụng| DAP
    WM -->|áp dụng| DAP

    %% Override
    WM -->|có| UPO
    WM -->|nhận/cấp| TP
    PR -->|bị| UPO

    %% Approval
    PCR -->|cần| PAP
    WM -->|yêu cầu| PCR
    WM -->|phê duyệt| PAP

    %% Audit
    WM -->|tạo| PAU
```

---

## 4. Data Flow trong Hệ thống Phân quyền

```mermaid
sequenceDiagram
    participant U as User/Request
    participant G as GraphQL Guard
    participant RB as RbacContextService
    participant CR as CasbinRule
    participant PT as PermissionTemplate
    participant UO as UserOverride
    participant TP as TempPermission
    participant DAP as DataAccessPolicy
    participant AU as PermissionAudit

    U->>G: Request (action, object)
    G->>RB: resolveContext(user)

    RB->>UO: Check User Overrides (Priority: 2000)
    alt Has Override
        UO-->>RB: Override Decision
    else No Override
        RB->>TP: Check Temporary Permissions (Priority: 1500)
        alt Has Temp Permission
            TP-->>RB: Temp Permission Decision
        else No Temp Permission
            RB->>PT: Check Templates (Priority: 400-1000)
            PT-->>RB: Template Decision
        end
    end

    RB->>CR: Translate to Casbin Rule
    CR->>CR: Enforce Policy (p, g, g2)
    CR-->>RB: allow/deny

    RB->>DAP: Apply Data Filters
    DAP-->>RB: Filtered Query

    RB->>AU: Log Audit (async)
    AU-->>AU: Store Audit Record

    RB-->>G: Final Decision + Filters
    G-->>U: Response / 403 Forbidden
```

---

## 5. Priority Resolution Flow

```mermaid
flowchart TD
    A[Permission Check Request] --> B{User Override?}

    B -->|Yes, Priority 2000| C[Apply User Override]
    B -->|No| D{Temporary Permission?}

    D -->|Yes, Priority 1500| E[Apply Temp Permission]
    D -->|No| F{Emergency Override?}

    F -->|Yes, Priority 1200| G[Apply Emergency]
    F -->|No| H{Template by Level}

    H --> I{CEO Level 1?}
    I -->|Yes, Priority 1000| J[Full Access]
    I -->|No| K{C-Level 2?}

    K -->|Yes, Priority 900| L[Executive Access]
    K -->|No| M{Director 5?}

    M -->|Yes, Priority 800| N[Director Access]
    M -->|No| O{Manager 7?}

    O -->|Yes, Priority 700| P[Manager Access]
    O -->|No| Q{Specialist?}

    Q -->|Yes, Priority 500-600| R[Specialist Access]
    Q -->|No| S{Junior/Intern?}

    S -->|Yes, Priority 100-400| T[Limited Access]
    S -->|No| U[Default Deny]

    C --> V[Apply Data Access Policy]
    E --> V
    G --> V
    J --> V
    L --> V
    N --> V
    P --> V
    R --> V
    T --> V

    V --> W[Generate Casbin Rules]
    W --> X[Return Decision + Filters]
```

---

## 6. Bảng Tham chiếu Entity

| Entity | Domain | Mô tả | Priority |
|--------|--------|-------|----------|
| `MktPermissionTemplate` | Template | Template quyền theo hierarchy/department | 400-1000 |
| `MktTemplateResourcePermission` | Template | Quyền resource trong template | - |
| `MktTemplateSystemAction` | Template | System actions trong template | - |
| `MktTemplateAccessLimitation` | Template | Giới hạn truy cập | - |
| `MktUserPermissionTemplate` | Template | Gán template cho user | - |
| `MktPermissionResource` | Permission | Định nghĩa resources | - |
| `MktPermissionAction` | Permission | Định nghĩa actions | - |
| `MktPermissionContext` | Config | Context cho permissions | - |
| `MktPermissionPriorityConfig` | Config | Cấu hình priority động | - |
| `MktDataAccessPolicy` | Policy | Row/Field/Column level policy | - |
| `MktCasbinRule` | Casbin | Casbin authorization rules | - |
| `MktPolicyVersion` | Casbin | Version tracking for sync | - |
| `MktPolicyChangeRequest` | Approval | Yêu cầu thay đổi policy | - |
| `MktPolicyApproval` | Approval | Approval records | - |
| `MktUserPermissionOverride` | Override | Override quyền cho user | 2000 |
| `MktTemporaryPermission` | Override | Quyền tạm thời | 1500 |
| `MktPermissionAudit` | Audit | Audit log | - |

---

## 7. Cardinality Summary

| From Entity | Relationship | To Entity | Cardinality |
|-------------|--------------|-----------|-------------|
| WorkspaceMember | được gán | MktUserPermissionTemplate | 1:N |
| WorkspaceMember | có | MktUserPermissionOverride | 1:N |
| WorkspaceMember | nhận | MktTemporaryPermission | 1:N |
| WorkspaceMember | cấp | MktTemporaryPermission | 1:N |
| WorkspaceMember | tạo | MktPermissionAudit | 1:N |
| MktPermissionTemplate | chứa | MktTemplateResourcePermission | 1:N |
| MktPermissionTemplate | chứa | MktTemplateSystemAction | 1:N |
| MktPermissionTemplate | chứa | MktTemplateAccessLimitation | 1:N |
| MktPermissionTemplate | gán | MktUserPermissionTemplate | 1:N |
| MktPermissionTemplate | sinh ra | MktDataAccessPolicy | 1:N |
| MktPermissionTemplate | thuộc về | MktOrganizationLevel | N:1 |
| MktPermissionResource | trong | MktTemplateResourcePermission | 1:N |
| MktPermissionResource | bị override | MktUserPermissionOverride | 1:N |
| MktPermissionAction | bị override | MktUserPermissionOverride | 1:N |
| MktPermissionContext | áp dụng | MktTemplateResourcePermission | 1:N |
| MktPolicyChangeRequest | cần | MktPolicyApproval | 1:N |
| MktDepartment | áp dụng | MktDataAccessPolicy | 1:N |
| MktOrganizationLevel | áp dụng | MktDataAccessPolicy | 1:N |

---

*Tài liệu này được tạo tự động dựa trên phân tích code RBAC trong mkt-core module.*
*Cập nhật lần cuối: 2026-01-14*
