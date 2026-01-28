# Tài liệu: Dữ liệu cần có để tạo User

## 1. Tổng quan

Tài liệu này mô tả các tables trong database cần có dữ liệu trước khi có thể tạo user mới trong hệ thống Twenty CRM với mkt-core module.

---

## 2. Sơ đồ Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        USER CREATION - DATA DEPENDENCIES                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  CORE SCHEMA (Bắt buộc - Prerequisites)                                             │
│  ══════════════════════════════════════                                             │
│                                                                                      │
│  ┌────────────────┐         ┌───────────────┐                                       │
│  │  1. workspace  │────────▶│   2. role     │                                       │
│  │  (phải có      │         │ (defaultRoleId│                                       │
│  │   trước)       │         │  phải tồn tại)│                                       │
│  └───────┬────────┘         └───────────────┘                                       │
│          │                                                                           │
│          │ Khi tạo user, hệ thống tự động tạo:                                      │
│          ▼                                                                           │
│  ┌────────────────┐         ┌───────────────┐         ┌─────────────────┐           │
│  │   3. user      │────────▶│ 4.userWorkspace│───────▶│ 5. roleTargets  │           │
│  │   (created)    │         │   (created)   │         │   (created)     │           │
│  └────────────────┘         └───────────────┘         └─────────────────┘           │
│                                                                                      │
│  WORKSPACE SCHEMA (Tự động tạo + mkt-core optional)                                 │
│  ══════════════════════════════════════════════════                                 │
│                                                                                      │
│  ┌──────────────────────┐                                       ``                    │
│  │  6. workspaceMember  │◀──────────────────────┐                                   │
│  │     (created)        │                       │                                   │
│  └──────────┬───────────┘                       │                                   │
│             │                                   │                                   │
│             │ (FK - optional)                   │                                   │
│             ▼                                   │                                   │
│  ┌──────────────────────┐    ┌──────────────────┴──────────────┐                   │
│  │  7. mktDepartment    │    │  8. mktOrganizationLevel        │                   │
│  │   (cần có nếu gán    │    │   (cần có nếu gán cho member)   │                   │
│  │    departmentId)     │    │                                 │                   │
│  └──────────────────────┘    └─────────────────────────────────┘                   │
│                                                                                      │
│  MKT-CORE RBAC (với permission template)                                            │
│  ═══════════════════════════════════════                                            │
│                                                                                      │
│  ┌──────────────────────┐         ┌─────────────────────────────┐                  │
│  │ 9. mktPermissionTemplate│────▶│ 10. mktUserPermissionTemplate│                  │
│  │  (cần có trước)      │         │    (created khi gán role)   │                  │
│  └──────────────────────┘         └─────────────────────────────┘                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Chi tiết Tables theo Tier

### 3.1. TIER 1: Prerequisites (Bắt buộc phải có trước)

| # | Schema | Table | Columns quan trọng | Mô tả |
|---|--------|-------|-------------------|-------|
| 1 | `core` | `workspace` | `id`, `defaultRoleId`, `activationStatus` | Workspace phải tồn tại và có `defaultRoleId` |
| 2 | `core` | `role` | `id`, `label`, `workspaceId` | Ít nhất 1 role để làm default role |

#### Workspace

```sql
-- Structure
CREATE TABLE core.workspace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "displayName" VARCHAR,
  subdomain VARCHAR NOT NULL UNIQUE,
  "defaultRoleId" UUID,                    -- ⚠️ BẮT BUỘC phải có giá trị
  "activationStatus" VARCHAR DEFAULT 'INACTIVE',
  "isPasswordAuthEnabled" BOOLEAN DEFAULT true,
  "isGoogleAuthEnabled" BOOLEAN DEFAULT true,
  "isMicrosoftAuthEnabled" BOOLEAN DEFAULT true,
  "inviteHash" VARCHAR,
  -- ...
);

-- Constraint: Workspace đã onboard phải có defaultRoleId
CONSTRAINT onboarded_workspace_requires_default_role CHECK (...)
```

#### Role

```sql
-- Structure
CREATE TABLE core.role (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR NOT NULL,                  -- Tên role (Admin, Member, Guest, etc.)
  "workspaceId" UUID NOT NULL,             -- FK to workspace
  "isEditable" BOOLEAN DEFAULT true,
  "canUpdateAllSettings" BOOLEAN DEFAULT false,
  "canReadAllObjectRecords" BOOLEAN DEFAULT false,
  -- ...
  UNIQUE(label, "workspaceId")
);
```

### 3.2. TIER 2: Tự động tạo khi Create User

| # | Schema | Table | Columns quan trọng | Mô tả |
|---|--------|-------|-------------------|-------|
| 3 | `core` | `user` | `id`, `email`, `passwordHash` | Core user entity |
| 4 | `core` | `userWorkspace` | `userId`, `workspaceId` | Link user với workspace |
| 5 | `core` | `roleTargets` | `userWorkspaceId`, `roleId` | Gán role cho user |
| 6 | `workspace_*` | `workspaceMember` | `userId`, `userEmail`, `departmentId` | Member info trong workspace |

#### User

```sql
CREATE TABLE core."user" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL,                  -- Email đăng nhập (unique khi không deleted)
  "passwordHash" VARCHAR,                  -- Hash của password
  "firstName" VARCHAR DEFAULT '',
  "lastName" VARCHAR DEFAULT '',
  "isEmailVerified" BOOLEAN DEFAULT false,
  disabled BOOLEAN DEFAULT false,
  locale VARCHAR DEFAULT 'en',
  -- ...
  UNIQUE(email) WHERE "deletedAt" IS NULL
);
```

#### UserWorkspace

```sql
CREATE TABLE core."userWorkspace" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES core."user"(id),
  "workspaceId" UUID NOT NULL REFERENCES core.workspace(id),
  locale VARCHAR DEFAULT 'en',
  "defaultAvatarUrl" VARCHAR,
  -- ...
  UNIQUE("userId", "workspaceId")
);
```

#### RoleTargets

```sql
CREATE TABLE core."roleTargets" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "workspaceId" UUID NOT NULL,
  "roleId" UUID NOT NULL REFERENCES core.role(id),
  "userWorkspaceId" UUID,                  -- FK to userWorkspace
  "agentId" UUID,                          -- Hoặc agent (không cả hai)
  -- ...
  UNIQUE("userWorkspaceId", "roleId"),
  CHECK (userWorkspaceId IS NOT NULL OR agentId IS NOT NULL)
);
```

#### WorkspaceMember (Workspace Schema)

```sql
CREATE TABLE workspace_xxx."workspaceMember" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,                  -- Reference to core.user
  "userEmail" VARCHAR NOT NULL,
  "nameFirstName" TEXT DEFAULT '',
  "nameLastName" TEXT DEFAULT '',
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "avatarUrl" TEXT DEFAULT '',
  locale TEXT DEFAULT 'en',
  "colorScheme" TEXT DEFAULT 'System',
  "memberCode" TEXT,                       -- Mã nhân viên (unique)
  "departmentId" UUID,                     -- FK to mktDepartment (optional)
  "organizationLevelId" UUID,              -- FK to mktOrganizationLevel (optional)
  "employmentStatusId" UUID,               -- FK to mktEmploymentStatus (optional)
  -- ...
);
```

### 3.3. TIER 3: MKT-Core Features (Optional)

| # | Schema | Table | Columns quan trọng | Mô tả |
|---|--------|-------|-------------------|-------|
| 7 | `workspace_*` | `mktDepartment` | `id`, `departmentCode`, `departmentName` | Phòng ban |
| 8 | `workspace_*` | `mktOrganizationLevel` | `id`, `levelCode`, `levelName` | Cấp bậc tổ chức |
| 9 | `workspace_*` | `mktPermissionTemplate` | `id`, `templateKey`, `isActive` | Template quyền |
| 10 | `workspace_*` | `mktUserPermissionTemplate` | `workspaceMemberId`, `templateId` | Gán template cho member |

#### MktDepartment

```sql
CREATE TABLE workspace_xxx."mktDepartment" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "departmentCode" TEXT NOT NULL,          -- Mã phòng ban (unique)
  "departmentName" TEXT NOT NULL,          -- Tên phòng ban
  "departmentNameEn" TEXT,
  "departmentType" VARCHAR,                -- ENUM: HEADQUARTERS, BRANCH, etc.
  "isActive" BOOLEAN,
  "managerId" UUID,                        -- FK to workspaceMember
  -- ...
);
```

#### MktOrganizationLevel

```sql
CREATE TABLE workspace_xxx."mktOrganizationLevel" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "levelCode" TEXT NOT NULL,               -- Mã cấp bậc
  "levelName" TEXT NOT NULL,               -- Tên cấp bậc
  "hierarchyLevel" DOUBLE PRECISION NOT NULL, -- Số thứ tự cấp bậc
  "displayOrder" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN,
  -- ...
);
```

#### MktPermissionTemplate

```sql
CREATE TABLE workspace_xxx."mktPermissionTemplate" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "templateKey" TEXT NOT NULL,             -- Key định danh (e.g., 'ADMIN', 'MANAGER')
  "templateName" TEXT NOT NULL,            -- Tên template
  "templateType" VARCHAR NOT NULL,         -- ENUM: ROLE_BASED, DEPARTMENT_BASED, etc.
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
  priority DOUBLE PRECISION NOT NULL DEFAULT 100,
  "organizationLevelId" UUID,              -- FK to mktOrganizationLevel
  -- ...
);
```

#### MktUserPermissionTemplate

```sql
CREATE TABLE workspace_xxx."mktUserPermissionTemplate" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "workspaceMemberId" UUID,                -- FK to workspaceMember
  "templateId" UUID,                       -- FK to mktPermissionTemplate
  "departmentId" UUID,                     -- FK to mktDepartment
  "assignedById" UUID,                     -- FK to workspaceMember (người gán)
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "assignmentReason" TEXT DEFAULT '',
  -- ...
);
```

---

## 4. Flow tạo User trong Code

### 4.1. Twenty CRM Standard Flow

**File:** `sign-in-up.service.ts`, `user-workspace.service.ts`

```typescript
async signUpOnNewWorkspace(userData) {
  // 1. Check prerequisites
  // - workspace.defaultRoleId must exist

  // 2. Create user in core schema
  const user = await this.userRepository.save({
    email,
    firstName,
    lastName,
    passwordHash,
    // ...
  });

  // 3. Create userWorkspace link
  const userWorkspace = await this.userWorkspaceRepository.save({
    userId: user.id,
    workspaceId: workspace.id,
  });

  // 4. Create workspaceMember in workspace schema
  await workspaceMemberRepository.insert({
    userId: user.id,
    userEmail: user.email,
    name: { firstName, lastName },
    // ...
  });

  // 5. Assign default role
  await this.userRoleService.assignRoleToUserWorkspace({
    workspaceId: workspace.id,
    userWorkspaceId: userWorkspace.id,
    roleId: workspace.defaultRoleId,
  });
}
```

### 4.2. MKT-Core Extended Flow

**File:** `user.service.ts` (user-management module)

```typescript
import { MEMBER_ROLE_LABEL } from 'src/engine/metadata-modules/permissions/constants/member-role-label.constants';

async createCompleteUser(workspaceId: string, input: CreateUserInput) {
  // 1. Find the Member role from role table (by label)
  const memberRole = await this.roleRepository.findOne({
    where: {
      workspaceId,
      label: MEMBER_ROLE_LABEL,  // 'Member'
    },
  });

  if (!memberRole) {
    throw new InternalServerErrorException(
      `Role "${MEMBER_ROLE_LABEL}" not found in workspace ${workspaceId}`,
    );
  }

  // 2. Validate input data
  await this.validateCreateUserInput(workspaceId, input);
  // - Check departmentId exists
  // - Check permissionTemplateId exists and isActive

  // 3. Create core user
  const coreUser = await this.createCoreUser(...);

  // 4. Create userWorkspace link
  const userWorkspace = await this.createUserWorkspaceRecord(...);

  // 5. Assign Member role (from core.role table by label)
  await this.assignRole(
    userWorkspace.id,
    workspaceId,
    memberRole.id,  // ← Lấy ID từ role table với label = 'Member'
  );

  // 6. Create workspaceMember
  const savedWorkspaceMember = await this.createWorkspaceMember(...);

  // 7. MKT-Core: Assign permission template
  await this.assignPermissionTemplate(
    workspaceId,
    savedWorkspaceMember.id,
    input.permissionTemplateId,
    input.departmentId,
  );

  // 8. Send welcome email
  await this.sendWelcomeEmail(workspaceId, email, passwordRandom);
}

private async assignPermissionTemplate(...) {
  // Insert into mktUserPermissionTemplate
  await this.userPermissionTemplateRepository.create({
    workspaceMemberId,
    templateId: permissionTemplateId,
    departmentId,
    isActive: true,
    assignedAt: DateTimeUtils.toDateRequired(DateTimeUtils.now()),
    assignmentReason: 'Initial user creation',
    position: 1,
  });
}
```

---

## 5. Validation Rules

### 5.1. Prerequisites Validation

| Check | Error Code | Message |
|-------|------------|---------|
| Workspace exists | `WORKSPACE_NOT_FOUND` | Workspace không tồn tại |
| Workspace has defaultRoleId | `DEFAULT_ROLE_NOT_FOUND` | Workspace chưa có default role |
| Role exists | `ROLE_NOT_FOUND` | Role không tồn tại |

### 5.2. MKT-Core Validation

| Check | Error Code | Message |
|-------|------------|---------|
| Department exists | `DEPARTMENT_NOT_FOUND` | Department với ID {id} không tồn tại |
| OrganizationLevel exists | `ORGANIZATION_LEVEL_NOT_FOUND` | Organization level không tồn tại |
| PermissionTemplate exists | `PERMISSION_TEMPLATE_NOT_FOUND` | Permission template không tồn tại |
| PermissionTemplate isActive | `PERMISSION_TEMPLATE_INACTIVE` | Permission template không active |

---

## 6. Seed Data Requirements

### 6.1. Minimum Required Seed Data

```sql
-- 1. Workspace (phải có trước)
INSERT INTO core.workspace (id, "displayName", subdomain, "activationStatus")
VALUES ('workspace-id', 'My CRM', 'my-crm', 'ACTIVE');

-- 2. Roles (ít nhất 1 làm default)
INSERT INTO core.role (id, label, "workspaceId", "isEditable")
VALUES
  ('admin-role-id', 'Admin', 'workspace-id', false),
  ('member-role-id', 'Member', 'workspace-id', true);

-- 3. Set defaultRoleId cho workspace
UPDATE core.workspace
SET "defaultRoleId" = 'member-role-id'
WHERE id = 'workspace-id';
```

### 6.2. MKT-Core Seed Data (Optional)

```sql
-- 4. Departments
INSERT INTO workspace_xxx."mktDepartment" ("departmentCode", "departmentName", "isActive")
VALUES
  ('SALES', 'Phòng Kinh doanh', true),
  ('TECH', 'Phòng Kỹ thuật', true);

-- 5. Organization Levels
INSERT INTO workspace_xxx."mktOrganizationLevel" ("levelCode", "levelName", "hierarchyLevel", "displayOrder")
VALUES
  ('CEO', 'Giám đốc điều hành', 1, 1),
  ('MANAGER', 'Trưởng phòng', 2, 2),
  ('STAFF', 'Nhân viên', 3, 3);

-- 6. Permission Templates
INSERT INTO workspace_xxx."mktPermissionTemplate" ("templateKey", "templateName", "isActive", "templateType")
VALUES
  ('ADMIN', 'Quản trị viên', true, 'ROLE_BASED'),
  ('MANAGER', 'Quản lý', true, 'ROLE_BASED'),
  ('STAFF', 'Nhân viên', true, 'ROLE_BASED');
```

---

## 7. Seed Commands (Development)

```bash
# Seed workspace và roles (Twenty CRM core)
npx nx run twenty-server:command workspace:sync-metadata -f

# Seed mkt-core data
npx nx command twenty-server -- mkt-department-data-seed-dev-workspace
npx nx command twenty-server -- mkt-organization-level-data-seed-dev-workspace
npx nx command twenty-server -- mkt-permission-template-data-seed-dev-workspace
```

---

## 8. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY RELATIONSHIPS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CORE SCHEMA                                                                 │
│  ───────────                                                                 │
│                                                                              │
│  ┌──────────┐ 1     N ┌──────────┐ 1     N ┌─────────────┐                  │
│  │ workspace│────────▶│   role   │◀────────│ roleTargets │                  │
│  └────┬─────┘         └──────────┘         └──────┬──────┘                  │
│       │                                           │                          │
│       │ 1                                         │ N                        │
│       │                                           │                          │
│       ▼ N                                         ▼ 1                        │
│  ┌─────────────┐ N     1 ┌──────────┐                                       │
│  │userWorkspace│◀────────│   user   │                                       │
│  └──────┬──────┘         └──────────┘                                       │
│         │                                                                    │
│         │ 1                                                                  │
│         ▼ 1                                                                  │
│  ┌─────────────────┐                                                        │
│  │ workspaceMember │ (workspace schema)                                     │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│  WORKSPACE SCHEMA                                                            │
│  ────────────────                                                            │
│           │                                                                  │
│           │ N                                                                │
│           ▼ 1                                                                │
│  ┌────────────────┐  1     N  ┌──────────────────────────┐                  │
│  │  mktDepartment │◀─────────│ mktUserPermissionTemplate │                  │
│  └────────────────┘           └────────────┬─────────────┘                  │
│                                            │                                 │
│                                            │ N                               │
│                                            ▼ 1                               │
│                               ┌────────────────────────┐                    │
│                               │ mktPermissionTemplate  │                    │
│                               └────────────┬───────────┘                    │
│                                            │                                 │
│                                            │ N                               │
│                                            ▼ 1                               │
│                               ┌────────────────────────┐                    │
│                               │ mktOrganizationLevel   │                    │
│                               └────────────────────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Summary

### Để tạo user mới, **BẮT BUỘC** phải có:

1. **`core.workspace`** - Với `defaultRoleId` không null
2. **`core.role`** - Role được reference bởi `workspace.defaultRoleId`

### Để sử dụng **mkt-core features** (gán department, permission template):

3. **`mktDepartment`** - Nếu `CreateUserInput.departmentId` được cung cấp
4. **`mktOrganizationLevel`** - Nếu `CreateUserInput.organizationLevelId` được cung cấp
5. **`mktPermissionTemplate`** - Nếu `CreateUserInput.permissionTemplateId` được cung cấp (phải `isActive = true`)

### Tables được **tự động tạo** khi create user:

- `core.user`
- `core.userWorkspace`
- `core.roleTargets`
- `workspace_*.workspaceMember`
- `workspace_*.mktUserPermissionTemplate` (nếu có permissionTemplateId)

---

## 10. Related Documents

- [Authentication Flow](./authentication-flow.md) - Luồng đăng nhập/đăng ký
- [User Creation Refactor](./user-creation-refactor.md) - Refactor với permission template assignment
