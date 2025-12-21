# Twenty CRM - Workspace Architecture & Multi-Tenancy

> Tài liệu phân tích chi tiết cơ chế tạo và quản lý Workspace trong Twenty CRM

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc Database](#2-cấu-trúc-database)
3. [Multi-Tenancy Architecture](#3-multi-tenancy-architecture)
4. [Workspace Creation Flow](#4-workspace-creation-flow)
5. [Workspace Activation](#5-workspace-activation)
6. [User-Workspace Association](#6-user-workspace-association)
7. [Workspace Lifecycle](#7-workspace-lifecycle)
8. [Configuration](#8-configuration)
9. [Code References](#9-code-references)
10. [Hướng dẫn tạo Workspace mới](#10-hướng-dẫn-tạo-workspace-mới)
11. [Database Reset & Workspace Seeding](#11-database-reset--workspace-seeding)
12. [Commands tạo Tables không Seed Data](#12-commands-tạo-tables-không-seed-data)

---

## 1. Tổng quan

Twenty CRM sử dụng kiến trúc **Schema-Per-Tenant** (mỗi workspace có PostgreSQL schema riêng) để đảm bảo:
- **Data Isolation**: Dữ liệu hoàn toàn tách biệt ở cấp database
- **Security**: Không có rủi ro data leakage giữa các workspace
- **Scalability**: Mỗi workspace có thể scale độc lập
- **Flexibility**: Hỗ trợ customization riêng cho từng workspace

### Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐   ┌─────────────────┐   ┌────────────────┐ │
│  │   core schema   │   │ workspace_abc   │   │ workspace_xyz  │ │
│  │                 │   │                 │   │                │ │
│  │ - user          │   │ - companies     │   │ - companies    │ │
│  │ - workspace     │   │ - people        │   │ - people       │ │
│  │ - userWorkspace │   │ - opportunities │   │ - opportunities│ │
│  │ - featureFlag   │   │ - workspaceMem. │   │ - workspaceMem.│ │
│  │ - appToken      │   │ - objectMeta    │   │ - objectMeta   │ │
│  │ - role          │   │ - fieldMeta     │   │ - fieldMeta    │ │
│  └─────────────────┘   └─────────────────┘   └────────────────┘ │
│         ▲                      ▲                    ▲           │
│         │                      │                    │           │
│    Shared/Global         Tenant Data           Tenant Data      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu trúc Database

### 2.1 Core Schema (Shared)

**Bảng `core.workspace`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `displayName` | VARCHAR | Tên workspace |
| `subdomain` | VARCHAR | Unique subdomain (URL) |
| `customDomain` | VARCHAR | Custom domain (optional) |
| `databaseSchema` | VARCHAR | Tên PostgreSQL schema |
| `databaseUrl` | VARCHAR | Connection string |
| `activationStatus` | ENUM | Trạng thái workspace |
| `inviteHash` | UUID | Hash cho invite link |
| `defaultRoleId` | UUID | Role mặc định cho member mới |
| `metadataVersion` | INT | Version của metadata cache |
| `isGoogleAuthEnabled` | BOOL | Cho phép Google login |
| `isMicrosoftAuthEnabled` | BOOL | Cho phép Microsoft login |
| `isPasswordAuthEnabled` | BOOL | Cho phép password login |
| `logo` | VARCHAR | URL logo workspace |
| `createdAt` | TIMESTAMP | Thời gian tạo |
| `deletedAt` | TIMESTAMP | Soft delete timestamp |

**Bảng `core.user`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | VARCHAR | Email (unique, case-insensitive) |
| `passwordHash` | VARCHAR | Hashed password |
| `firstName` | VARCHAR | Tên |
| `lastName` | VARCHAR | Họ |
| `isEmailVerified` | BOOL | Email đã verify |
| `locale` | VARCHAR | Ngôn ngữ |
| `canImpersonate` | BOOL | Có thể impersonate |

**Bảng `core.userWorkspace`** (Join table)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | FK → core.user |
| `workspaceId` | UUID | FK → core.workspace |
| `defaultAvatarUrl` | VARCHAR | Avatar trong workspace |
| `locale` | VARCHAR | Locale riêng trong workspace |

**Unique Constraint**: `(userId, workspaceId)` - Một user chỉ có 1 record mỗi workspace

### 2.2 Workspace Schema (Isolated)

Mỗi workspace có schema riêng với naming convention:
```
workspace_{base36(workspaceId)}
```

**Ví dụ**: UUID `550e8400-e29b-41d4-a716-446655440000` → Schema `workspace_1u3agfl3s6jf4i7g8h0`

**Các bảng trong workspace schema**:
- `companies` - Công ty
- `people` - Liên hệ
- `opportunities` - Cơ hội bán hàng
- `workspaceMember` - Thành viên workspace
- `objectMetadata` - Custom objects
- `fieldMetadata` - Custom fields
- `view`, `viewFilter`, `viewSort` - Views configuration
- ... (và các custom entities khác)

---

## 3. Multi-Tenancy Architecture

### 3.1 Schema Isolation Pattern

```typescript
// File: src/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts

export const getWorkspaceSchemaName = (workspaceId: string): string => {
  // Convert UUID to Base36 for shorter schema name
  const base36Id = convertUuidToBase36(workspaceId);
  return `workspace_${base36Id}`;
};
```

### 3.2 Data Access Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Request   │────▶│ Auth Guard   │────▶│ Workspace       │
│             │     │              │     │ Datasource      │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────────────────────▼──────────────────────────────┐
                    │                     PostgreSQL                               │
                    │  ┌──────────────┐   ┌────────────────┐   ┌────────────────┐ │
                    │  │ core schema  │   │ workspace_abc  │   │ workspace_xyz  │ │
                    │  └──────────────┘   └────────────────┘   └────────────────┘ │
                    │         ▲                   ▲                    ▲          │
                    │         │                   │                    │          │
                    │    Global Data        User A's Data        User B's Data    │
                    └─────────────────────────────────────────────────────────────┘
```

### 3.3 Connection Management

```typescript
// WorkspaceDatasourceService quản lý connection pool cho từng workspace

class WorkspaceDatasourceService {
  async getWorkspaceDataSource(workspaceId: string): Promise<DataSource> {
    const schemaName = getWorkspaceSchemaName(workspaceId);

    // Get or create connection with workspace-specific schema
    return this.dataSourceFactory.create({
      schema: schemaName,
      // ... connection config
    });
  }
}
```

---

## 4. Workspace Creation Flow

### 4.1 Sign Up + Create New Workspace

**Entry Point**: `SignInUpService.signUpOnNewWorkspace()`

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  User fills  │────▶│  Create User     │────▶│ Create         │
│  signup form │     │  in core.user    │     │ Workspace      │
└──────────────┘     └──────────────────┘     └───────┬────────┘
                                                       │
                     ┌─────────────────────────────────▼─────────────────────────────┐
                     │                                                                │
                     │  1. Generate unique subdomain                                 │
                     │  2. Create workspace (status: PENDING_CREATION)               │
                     │  3. Create UserWorkspace record                               │
                     │  4. Initialize onboarding state                               │
                     │                                                                │
                     └────────────────────────────────────────────────────────────────┘
```

**Code Flow**:

```typescript
// File: src/engine/core-modules/auth/services/sign-in-up.service.ts

async signUpOnNewWorkspace(params: SignUpParams): Promise<SignInUpResult> {
  // 1. Create workspace with PENDING_CREATION status
  const workspaceToCreate = this.workspaceRepository.create({
    subdomain: await this.domainManagerService.generateSubdomain(),
    displayName: '',
    inviteHash: v4(),
    activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    logo: logoUrl,
  });

  const workspace = await this.workspaceRepository.save(workspaceToCreate);

  // 2. Create user
  const user = await this.userRepository.save({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    firstName,
    lastName,
  });

  // 3. Link user to workspace
  await this.userWorkspaceRepository.save({
    userId: user.id,
    workspaceId: workspace.id,
  });

  return { user, workspace, tokens };
}
```

### 4.2 Join Existing Workspace (Invitation)

**Entry Point**: `SignInUpService.signUpInWorkspace()`

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│ User clicks  │────▶│  Validate        │────▶│ Create User    │
│ invite link  │     │  Invite/Workspace│     │ + UserWorkspace│
└──────────────┘     └──────────────────┘     └────────────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │ Workspace must │
                     │ be ACTIVE      │
                     └────────────────┘
```

---

## 5. Workspace Activation

### 5.1 Activation Status Lifecycle

```
PENDING_CREATION ──▶ ONGOING_CREATION ──▶ ACTIVE
        │                                    │
        │                                    ▼
        │                              ┌──────────┐
        │                              │ INACTIVE │
        │                              └──────────┘
        │                                    │
        │                                    ▼
        │                              ┌───────────┐
        └─────────────────────────────▶│ SUSPENDED │
                                       └───────────┘
```

**Status Definitions**:

| Status | Description |
|--------|-------------|
| `PENDING_CREATION` | Mới tạo, chờ user nhập displayName và activate |
| `ONGOING_CREATION` | Đang trong quá trình khởi tạo (locked state) |
| `ACTIVE` | Sẵn sàng sử dụng |
| `INACTIVE` | Đã deactivate nhưng chưa xóa |
| `SUSPENDED` | Bị suspend (ví dụ: vấn đề billing) |

### 5.2 Activation Process

**Entry Point**: `WorkspaceService.activateWorkspace()`

```typescript
// File: src/engine/core-modules/workspace/services/workspace.service.ts

async activateWorkspace(user: User, workspace: Workspace, data: ActivateWorkspaceInput) {
  // 1. Validate current status
  if (workspace.activationStatus !== WorkspaceActivationStatus.PENDING_CREATION) {
    throw new ConflictException('Workspace is not in pending creation state');
  }

  // 2. Update to ONGOING_CREATION
  await this.workspaceRepository.update(workspace.id, {
    activationStatus: WorkspaceActivationStatus.ONGOING_CREATION,
    displayName: data.displayName,
  });

  // 3. Enable default feature flags
  await this.featureFlagService.enableDefaultFlags(workspace.id);

  // 4. Initialize workspace via WorkspaceManager
  await this.workspaceManagerService.init({
    workspaceId: workspace.id,
    userId: user.id,
  });

  // 5. Create workspace member
  await this.workspaceMemberService.create(workspace.id, user);

  // 6. Update to ACTIVE
  await this.workspaceRepository.update(workspace.id, {
    activationStatus: WorkspaceActivationStatus.ACTIVE,
  });
}
```

### 5.3 Workspace Initialization (WorkspaceManagerService)

**Entry Point**: `WorkspaceManagerService.init()`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WorkspaceManagerService.init()                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. createWorkspaceDBSchema()                                               │
│     └─ CREATE SCHEMA workspace_{base36_id}                                  │
│                                                                              │
│  2. createDataSourceMetadata()                                              │
│     └─ Register workspace in metadata system                                │
│                                                                              │
│  3. workspaceSyncMetadataService.synchronize()                              │
│     └─ Scan entities → Create objectMetadata → Create fieldMetadata        │
│     └─ Build indexes                                                         │
│                                                                              │
│  4. initPermissions()                                                        │
│     └─ Create admin role for founder                                        │
│     └─ Assign user to admin role                                            │
│                                                                              │
│  5. initDefaultAgent() (if AI enabled)                                      │
│     └─ Create default AI agent                                              │
│                                                                              │
│  6. prefillWorkspaceWithStandardObjectsRecords()                            │
│     └─ Create sample data (companies, people)                               │
│     └─ Create default views                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. User-Workspace Association

### 6.1 Relationship Model

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│    User     │◀───────▶│  UserWorkspace   │◀───────▶│  Workspace  │
│  (core)     │   1:N   │     (core)       │   N:1   │   (core)    │
└─────────────┘         └──────────────────┘         └─────────────┘
                                 │
                                 │ 1:1 (in workspace schema)
                                 ▼
                        ┌──────────────────┐
                        │ WorkspaceMember  │
                        │ (workspace_{id}) │
                        └──────────────────┘
```

### 6.2 Adding User to Workspace

```typescript
// File: src/engine/core-modules/user-workspace/user-workspace.service.ts

async addUserToWorkspace(userId: string, workspaceId: string) {
  // 1. Check if already exists
  const existing = await this.userWorkspaceRepository.findOne({
    where: { userId, workspaceId },
  });

  if (existing) {
    throw new ConflictException('User already in workspace');
  }

  // 2. Create UserWorkspace record (core schema)
  const userWorkspace = await this.userWorkspaceRepository.save({
    userId,
    workspaceId,
  });

  // 3. Create WorkspaceMember record (workspace schema)
  await this.workspaceMemberService.create(workspaceId, user);

  // 4. Assign default role
  await this.roleService.assignDefaultRole(userWorkspace.id, workspaceId);

  // 5. Emit event
  this.eventEmitter.emit(USER_SIGNUP_EVENT, { userId, workspaceId });

  return userWorkspace;
}
```

### 6.3 Multi-Workspace User Flow

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────────┐
│ User Login   │────▶│ Find all           │────▶│ Return available    │
│ with email   │     │ UserWorkspaces     │     │ workspaces + tokens │
└──────────────┘     └────────────────────┘     └──────────┬──────────┘
                                                            │
                     ┌──────────────────────────────────────▼──────────┐
                     │                                                  │
                     │  {                                               │
                     │    workspaces: [                                 │
                     │      { id: "ws1", name: "Company A", ... },      │
                     │      { id: "ws2", name: "Company B", ... }       │
                     │    ],                                            │
                     │    accessTokens: { ws1: "token1", ws2: "token2" }│
                     │  }                                               │
                     │                                                  │
                     └─────────────────────────────────────────────────┘
```

---

## 7. Workspace Lifecycle

### 7.1 Soft Delete

```typescript
// File: src/engine/core-modules/workspace/services/workspace.service.ts

async softDelete(workspaceId: string) {
  // Marks deletedAt timestamp, preserves data
  await this.workspaceRepository.softDelete(workspaceId);

  // UserWorkspace records also soft deleted (cascade)
}
```

### 7.2 Hard Delete

```typescript
async delete(workspaceId: string) {
  // 1. Delete UserWorkspace records
  await this.userWorkspaceRepository.delete({ workspaceId });

  // 2. Purge cache
  await this.cacheService.invalidateWorkspace(workspaceId);

  // 3. Delete via WorkspaceManager
  await this.workspaceManagerService.delete(workspaceId);

  // 4. Delete workspace record
  await this.workspaceRepository.delete(workspaceId);
}

// WorkspaceManagerService.delete()
async delete(workspaceId: string) {
  // Delete in order (respect foreign keys)
  await this.fieldMetadataRepository.delete({ workspaceId });
  await this.roleRepository.delete({ workspaceId });
  await this.objectMetadataRepository.delete({ workspaceId });
  await this.workspaceMigrationRepository.delete({ workspaceId });
  await this.dataSourceMetadataRepository.delete({ workspaceId });

  // Drop PostgreSQL schema
  const schemaName = getWorkspaceSchemaName(workspaceId);
  await this.dataSource.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}
```

---

## 8. Configuration

### 8.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `IS_MULTIWORKSPACE_ENABLED` | `false` | Cho phép tạo nhiều workspace |
| `DEFAULT_SUBDOMAIN` | `app` | Subdomain mặc định |
| `AUTH_GOOGLE_ENABLED` | `false` | Bật Google OAuth |
| `AUTH_MICROSOFT_ENABLED` | `false` | Bật Microsoft OAuth |
| `AUTH_PASSWORD_ENABLED` | `true` | Cho phép đăng nhập password |

### 8.2 Workspace Settings

| Setting | Description |
|---------|-------------|
| `displayName` | Tên hiển thị workspace |
| `subdomain` | Subdomain unique |
| `customDomain` | Custom domain (optional) |
| `logo` | URL logo |
| `inviteHash` | Hash cho public invite link |
| `isPublicInviteLinkEnabled` | Cho phép invite công khai |
| `isTwoFactorAuthenticationEnforced` | Bắt buộc 2FA |
| `allowImpersonation` | Cho phép admin impersonate |

---

## 9. Code References

### Core Files

| File | Description |
|------|-------------|
| `src/engine/core-modules/workspace/workspace.entity.ts` | Workspace entity definition |
| `src/engine/core-modules/workspace/services/workspace.service.ts` | Workspace CRUD operations |
| `src/engine/core-modules/user/user.entity.ts` | User entity definition |
| `src/engine/core-modules/user-workspace/user-workspace.entity.ts` | UserWorkspace join entity |
| `src/engine/core-modules/auth/services/sign-in-up.service.ts` | Authentication & signup flow |
| `src/engine/workspace-manager/workspace-manager.service.ts` | Workspace initialization |
| `src/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts` | Schema naming utility |

### Key Methods

| Method | File | Description |
|--------|------|-------------|
| `signUpOnNewWorkspace()` | sign-in-up.service.ts | Tạo user + workspace mới |
| `signUpInWorkspace()` | sign-in-up.service.ts | Join workspace có sẵn |
| `activateWorkspace()` | workspace.service.ts | Activate workspace |
| `init()` | workspace-manager.service.ts | Initialize workspace schema |
| `delete()` | workspace-manager.service.ts | Delete workspace + schema |
| `addUserToWorkspace()` | user-workspace.service.ts | Add user to workspace |

---

## 10. Hướng dẫn tạo Workspace mới

### 10.1 Tạo Workspace qua UI (End User)

#### Bước 1: Đăng ký tài khoản mới

1. Truy cập trang đăng ký: `https://your-domain.com/sign-up`
2. Điền thông tin:
   - Email
   - Password
   - First Name / Last Name
3. Click **Sign Up**

#### Bước 2: Activate Workspace

1. Sau khi đăng ký, bạn sẽ được chuyển đến trang **Activate Workspace**
2. Nhập **Workspace Name** (tên công ty/tổ chức)
3. Click **Continue**
4. Hệ thống sẽ:
   - Tạo PostgreSQL schema mới
   - Khởi tạo metadata
   - Tạo default views
   - Gán quyền Admin cho bạn

#### Bước 3: Mời thành viên

1. Vào **Settings** → **Members**
2. Click **Invite** hoặc copy **Invite Link**
3. Gửi link cho thành viên mới

---

### 10.2 Tạo Workspace qua GraphQL API (Developer)

#### Mutation: Sign Up + Create Workspace

```graphql
mutation SignUp($email: String!, $password: String!, $workspaceDisplayName: String) {
  signUp(
    email: $email
    password: $password
    workspaceDisplayName: $workspaceDisplayName
  ) {
    loginToken {
      token
      expiresAt
    }
    workspace {
      id
      displayName
      subdomain
    }
  }
}
```

**Variables:**
```json
{
  "email": "admin@company.com",
  "password": "SecurePassword123!",
  "workspaceDisplayName": "My Company"
}
```

#### Mutation: Activate Workspace (nếu chưa active)

```graphql
mutation ActivateWorkspace($displayName: String!) {
  activateWorkspace(data: { displayName: $displayName }) {
    workspace {
      id
      displayName
      activationStatus
    }
  }
}
```

---

### 10.3 Tạo Workspace qua Database (Self-Hosted Admin)

> ⚠️ **Cảnh báo**: Chỉ dành cho admin có quyền truy cập database. Cách này bypass các validation logic.

#### Bước 1: Tạo record trong core.workspace

```sql
-- 1. Tạo workspace record
INSERT INTO core.workspace (
  id,
  "displayName",
  subdomain,
  "inviteHash",
  "activationStatus",
  "isPasswordAuthEnabled",
  "createdAt",
  "updatedAt"
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- UUID mới
  'My Company',
  'mycompany',                              -- Subdomain unique
  gen_random_uuid(),                        -- Invite hash
  'PENDING_CREATION',                       -- Hoặc 'ACTIVE' nếu muốn skip activation
  true,
  NOW(),
  NOW()
);
```

#### Bước 2: Tạo user (nếu chưa có)

```sql
-- 2. Tạo user record
INSERT INTO core."user" (
  id,
  email,
  "passwordHash",
  "firstName",
  "lastName",
  "isEmailVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  'admin@mycompany.com',
  '$2b$10$...hashed_password...',           -- Dùng bcrypt hash
  'Admin',
  'User',
  true,
  NOW(),
  NOW()
);
```

#### Bước 3: Link user với workspace

```sql
-- 3. Tạo userWorkspace record
INSERT INTO core."userWorkspace" (
  id,
  "userId",
  "workspaceId",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  '660e8400-e29b-41d4-a716-446655440001',  -- userId
  '550e8400-e29b-41d4-a716-446655440000',  -- workspaceId
  NOW(),
  NOW()
);
```

#### Bước 4: Tạo workspace schema (QUAN TRỌNG)

```sql
-- 4. Tạo schema cho workspace
-- Schema name = workspace_{base36(workspaceId)}

CREATE SCHEMA IF NOT EXISTS "workspace_abc123xyz";

-- Hoặc dùng command của Twenty:
-- npx nx run twenty-server:command workspace:sync-metadata -w 550e8400-e29b-41d4-a716-446655440000
```

#### Bước 5: Sync metadata và activate

```bash
# Chạy command để sync metadata cho workspace
npx nx run twenty-server:command workspace:sync-metadata \
  -w 550e8400-e29b-41d4-a716-446655440000

# Update status sang ACTIVE
psql -c "UPDATE core.workspace SET \"activationStatus\" = 'ACTIVE' WHERE id = '550e8400-e29b-41d4-a716-446655440000'"
```

---

### 10.4 Tạo Workspace bằng NestJS Service (Programmatic)

```typescript
// File: custom-workspace-creator.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceManagerService } from 'src/engine/workspace-manager/workspace-manager.service';
import { WorkspaceActivationStatus } from 'twenty-shared';
import { hashPassword } from 'src/engine/core-modules/auth/auth.util';

@Injectable()
export class CustomWorkspaceCreatorService {
  constructor(
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    private readonly workspaceManagerService: WorkspaceManagerService,
  ) {}

  async createWorkspaceWithUser(params: {
    workspaceName: string;
    subdomain: string;
    userEmail: string;
    userPassword: string;
    firstName: string;
    lastName: string;
  }): Promise<{ workspace: Workspace; user: User }> {
    // 1. Create workspace
    const workspace = await this.workspaceRepository.save({
      id: uuidv4(),
      displayName: params.workspaceName,
      subdomain: params.subdomain,
      inviteHash: uuidv4(),
      activationStatus: WorkspaceActivationStatus.ONGOING_CREATION,
      isPasswordAuthEnabled: true,
    });

    // 2. Create user
    const user = await this.userRepository.save({
      id: uuidv4(),
      email: params.userEmail.toLowerCase(),
      passwordHash: await hashPassword(params.userPassword),
      firstName: params.firstName,
      lastName: params.lastName,
      isEmailVerified: true,
    });

    // 3. Link user to workspace
    await this.userWorkspaceRepository.save({
      userId: user.id,
      workspaceId: workspace.id,
    });

    // 4. Initialize workspace (create schema, metadata, etc.)
    await this.workspaceManagerService.init({
      workspaceId: workspace.id,
      userId: user.id,
    });

    // 5. Activate workspace
    await this.workspaceRepository.update(workspace.id, {
      activationStatus: WorkspaceActivationStatus.ACTIVE,
    });

    return { workspace, user };
  }
}
```

**Sử dụng:**

```typescript
// Trong controller hoặc service khác
const result = await this.customWorkspaceCreatorService.createWorkspaceWithUser({
  workspaceName: 'Acme Corporation',
  subdomain: 'acme',
  userEmail: 'admin@acme.com',
  userPassword: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
});

console.log('Workspace created:', result.workspace.id);
console.log('Admin user:', result.user.email);
```

---

### 10.5 Tạo Workspace bằng CLI Command

```bash
# Nếu có custom command (cần implement)
npx nx run twenty-server:command workspace:create \
  --name "My Company" \
  --subdomain "mycompany" \
  --admin-email "admin@mycompany.com" \
  --admin-password "SecurePass123!"
```

**Implement CLI Command:**

```typescript
// File: src/mkt-core/commands/create-workspace.command.ts

import { Command, CommandRunner, Option } from 'nest-commander';
import { CustomWorkspaceCreatorService } from './custom-workspace-creator.service';

@Command({
  name: 'workspace:create',
  description: 'Create a new workspace with admin user',
})
export class CreateWorkspaceCommand extends CommandRunner {
  constructor(
    private readonly workspaceCreator: CustomWorkspaceCreatorService,
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options: {
      name: string;
      subdomain: string;
      adminEmail: string;
      adminPassword: string;
    },
  ): Promise<void> {
    console.log('Creating workspace...');

    const result = await this.workspaceCreator.createWorkspaceWithUser({
      workspaceName: options.name,
      subdomain: options.subdomain,
      userEmail: options.adminEmail,
      userPassword: options.adminPassword,
      firstName: 'Admin',
      lastName: 'User',
    });

    console.log('✅ Workspace created successfully!');
    console.log(`   ID: ${result.workspace.id}`);
    console.log(`   Name: ${result.workspace.displayName}`);
    console.log(`   Subdomain: ${result.workspace.subdomain}`);
    console.log(`   Admin: ${result.user.email}`);
  }

  @Option({
    flags: '-n, --name <name>',
    description: 'Workspace display name',
    required: true,
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --subdomain <subdomain>',
    description: 'Workspace subdomain (unique)',
    required: true,
  })
  parseSubdomain(val: string): string {
    return val.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  @Option({
    flags: '-e, --admin-email <email>',
    description: 'Admin user email',
    required: true,
  })
  parseAdminEmail(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --admin-password <password>',
    description: 'Admin user password',
    required: true,
  })
  parseAdminPassword(val: string): string {
    return val;
  }
}
```

---

### 10.6 Checklist sau khi tạo Workspace

| # | Task | Verify |
|---|------|--------|
| 1 | Workspace record tồn tại trong `core.workspace` | `SELECT * FROM core.workspace WHERE subdomain = 'xxx'` |
| 2 | User record tồn tại trong `core.user` | `SELECT * FROM core.user WHERE email = 'xxx'` |
| 3 | UserWorkspace link tồn tại | `SELECT * FROM core."userWorkspace" WHERE "workspaceId" = 'xxx'` |
| 4 | PostgreSQL schema được tạo | `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'workspace_%'` |
| 5 | Activation status = ACTIVE | `SELECT "activationStatus" FROM core.workspace WHERE id = 'xxx'` |
| 6 | Default role được gán | `SELECT * FROM core.role WHERE "workspaceId" = 'xxx'` |
| 7 | WorkspaceMember được tạo | `SELECT * FROM workspace_xxx."workspaceMember"` |

---

### 10.7 Troubleshooting

#### Lỗi: "Workspace is not in pending creation state"

**Nguyên nhân**: Workspace đã được activate hoặc đang trong trạng thái khác.

**Giải pháp**:
```sql
-- Check current status
SELECT id, "displayName", "activationStatus" FROM core.workspace WHERE subdomain = 'xxx';

-- Reset to PENDING nếu cần re-activate
UPDATE core.workspace SET "activationStatus" = 'PENDING_CREATION' WHERE id = 'xxx';
```

#### Lỗi: "Schema already exists"

**Nguyên nhân**: Schema đã tồn tại từ lần tạo trước (có thể failed halfway).

**Giải pháp**:
```sql
-- Drop old schema (CẢNH BÁO: Mất hết data!)
DROP SCHEMA IF EXISTS "workspace_xxx" CASCADE;

-- Re-run sync
npx nx run twenty-server:command workspace:sync-metadata -w <workspace-id>
```

#### Lỗi: "Subdomain already taken"

**Nguyên nhân**: Subdomain đã được sử dụng bởi workspace khác.

**Giải pháp**:
```sql
-- Find existing workspace with subdomain
SELECT id, "displayName", subdomain, "deletedAt"
FROM core.workspace
WHERE subdomain = 'xxx';

-- Nếu là soft-deleted, có thể hard delete hoặc đổi subdomain
```

#### Lỗi: "User already exists in workspace"

**Nguyên nhân**: UserWorkspace record đã tồn tại.

**Giải pháp**:
```sql
-- Check existing record
SELECT * FROM core."userWorkspace"
WHERE "userId" = 'xxx' AND "workspaceId" = 'yyy';

-- Delete nếu cần reset
DELETE FROM core."userWorkspace"
WHERE "userId" = 'xxx' AND "workspaceId" = 'yyy';
```

---

## 11. Database Reset & Workspace Seeding

### 11.1 Tổng quan

Khi chạy lệnh `npx nx database:reset twenty-server`, hệ thống sẽ:
1. Xóa toàn bộ workspace schemas hiện có
2. Tạo lại core schema
3. Chạy migrations
4. Seed dữ liệu demo (workspaces, users, companies, etc.)

### 11.2 Flow Database Reset

```
npx nx database:reset twenty-server
    │
    │  ┌─────────────────────────────────────────────────────────────┐
    │  │                    DATABASE RESET FLOW                       │
    │  └─────────────────────────────────────────────────────────────┘
    │
    ├──▶ 1. truncate-db.ts
    │       └─ DROP SCHEMA workspace_xxx CASCADE (tất cả workspace schemas)
    │
    ├──▶ 2. setup-db.ts
    │       ├─ CREATE SCHEMA IF NOT EXISTS core
    │       ├─ CREATE SCHEMA IF NOT EXISTS public
    │       └─ CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    │
    ├──▶ 3. database:migrate
    │       └─ Run TypeORM migrations (tạo tables trong core schema)
    │
    ├──▶ 4. cache:flush
    │       └─ Clear Redis cache
    │
    └──▶ 5. workspace:seed:dev  ◀── WORKSPACE ĐƯỢC TẠO Ở ĐÂY
            │
            ├─ seedCoreSchema()
            │   ├─ Insert workspace records
            │   ├─ Insert user records
            │   └─ Insert userWorkspace records
            │
            ├─ createWorkspaceDBSchema()
            │   └─ CREATE SCHEMA workspace_{base36_id}
            │
            ├─ synchronize()
            │   └─ Create tables từ WorkspaceEntity definitions
            │
            ├─ initPermissions()
            │   └─ Create admin role, assign to founder
            │
            └─ seedData()
                └─ Insert demo data (companies, people, etc.)
```

### 11.3 Cấu hình Database Reset

**File:** `packages/twenty-server/project.json`

```json
{
  "database:reset": {
    "executor": "nx:run-commands",
    "options": {
      "parallel": false,
      "commands": [
        "npx ts-node ./scripts/truncate-db.ts",
        "npx ts-node ./scripts/setup-db.ts",
        "npx nx database:migrate twenty-server",
        "npx nx cache:flush twenty-server",
        "npx nx command twenty-server -- workspace:seed:dev"
      ]
    },
    "configurations": {
      "seed": {},
      "no-seed": {
        "commands": [
          "npx ts-node ./scripts/truncate-db.ts",
          "npx ts-node ./scripts/setup-db.ts",
          "npx nx database:migrate twenty-server"
        ]
      }
    },
    "defaultConfiguration": "seed"
  }
}
```

**Chạy không seed data:**
```bash
npx nx database:reset twenty-server --configuration=no-seed
```

### 11.4 Khai báo Seed Workspaces

**File:** `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-workspaces.util.ts`

```typescript
// Fixed UUIDs cho development
export const SEED_APPLE_WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
export const SEED_YCOMBINATOR_WORKSPACE_ID = '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

const workspaces: Record<string, WorkspaceSeederFields> = {
  [SEED_APPLE_WORKSPACE_ID]: {
    id: SEED_APPLE_WORKSPACE_ID,
    displayName: 'Apple',
    subdomain: 'apple',
    inviteHash: 'apple.dev-invite-hash',
    logo: 'https://twentyhq.github.io/placeholder-images/workspaces/apple-logo.png',
    activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    version: version,
    isTwoFactorAuthenticationEnforced: false,
  },
  [SEED_YCOMBINATOR_WORKSPACE_ID]: {
    id: SEED_YCOMBINATOR_WORKSPACE_ID,
    displayName: 'YCombinator',
    subdomain: 'yc',
    inviteHash: 'yc.dev-invite-hash',
    logo: 'https://twentyhq.github.io/placeholder-images/workspaces/ycombinator-logo.png',
    activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    version: version,
    isTwoFactorAuthenticationEnforced: false,
  },
};

export const seedWorkspaces = async ({
  dataSource,
  schemaName,
  workspaceId,
  appVersion,
}: {
  dataSource: DataSource;
  schemaName: string;
  workspaceId: string;
  appVersion: string;
}) => {
  const workspaceToSeed = workspaces[workspaceId];

  if (!workspaceToSeed) {
    throw new Error(`Workspace ${workspaceId} not found in seed data`);
  }

  await dataSource
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.workspace`)
    .values(workspaceToSeed)
    .execute();
};
```

### 11.5 Khai báo Seed Users

**File:** `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-users.util.ts`

```typescript
// Fixed UUIDs cho demo users
export const TIM_APPLE_WORKSPACE_MEMBER_UUID = '20202020-0687-4c41-b707-ed1bfca972a7';
export const JONY_IVE_WORKSPACE_MEMBER_UUID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
export const PHIL_SCHILER_WORKSPACE_MEMBER_UUID = '20202020-1553-45c6-a028-5a9064cce07f';
export const JANE_AUSTEN_WORKSPACE_MEMBER_UUID = '20202020-1d7f-44b5-9b80-dc0b0c0e1b6a';

const users: UserSeederFields[] = [
  {
    id: '20202020-9e3b-46d4-a556-88b9ddc2b034',
    firstName: 'Tim',
    lastName: 'Apple',
    email: 'tim@apple.dev',
    passwordHash: PASSWORD_HASH,          // Hash của '1Tim@appledev'
    canImpersonate: true,
    isEmailVerified: true,
  },
  {
    id: '20202020-3957-4908-9c36-2929a23f8357',
    firstName: 'Jony',
    lastName: 'Ive',
    email: 'jony.ive@apple.dev',
    passwordHash: PASSWORD_HASH,
    canImpersonate: false,
    isEmailVerified: true,
  },
  {
    id: '20202020-7169-42cf-bc47-1cfef15264b8',
    firstName: 'Phil',
    lastName: 'Schiler',
    email: 'phil.schiler@apple.dev',
    passwordHash: PASSWORD_HASH,
    canImpersonate: false,
    isEmailVerified: true,
  },
  {
    id: '20202020-e6b5-4680-8a32-b8209737156b',
    firstName: 'Jane',
    lastName: 'Austen',
    email: 'jane.austen@apple.dev',
    passwordHash: PASSWORD_HASH,
    canImpersonate: false,
    isEmailVerified: true,
  },
];
```

**Demo Login Credentials:**

| User | Email | Password |
|------|-------|----------|
| Tim Apple | `tim@apple.dev` | `1Tim@appledev` |
| Jony Ive | `jony.ive@apple.dev` | `1Tim@appledev` |
| Phil Schiler | `phil.schiler@apple.dev` | `1Tim@appledev` |
| Jane Austen | `jane.austen@apple.dev` | `1Tim@appledev` |

### 11.6 User-Workspace Associations

**File:** `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-user-workspaces.util.ts`

```typescript
const getUserWorkspaces = (workspaceId: string): UserWorkspaceSeederFields[] => {
  if (workspaceId === SEED_APPLE_WORKSPACE_ID) {
    return [
      { userId: TIM_APPLE_USER_ID, workspaceId },
      { userId: JONY_IVE_USER_ID, workspaceId },
      { userId: PHIL_SCHILER_USER_ID, workspaceId },
      { userId: JANE_AUSTEN_USER_ID, workspaceId },
    ];
  }

  if (workspaceId === SEED_YCOMBINATOR_WORKSPACE_ID) {
    return [
      // YCombinator workspace có users riêng hoặc shared
      { userId: TIM_APPLE_USER_ID, workspaceId },
      // ...
    ];
  }

  return [];
};
```

### 11.7 Command Handler

**File:** `packages/twenty-server/src/database/commands/data-seed-dev-workspace.command.ts`

```typescript
import { Command, CommandRunner } from 'nest-commander';
import { DevSeederService } from 'src/engine/workspace-manager/dev-seeder/services/dev-seeder.service';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-workspaces.util';

@Command({
  name: 'workspace:seed:dev',
  description: 'Seed workspace with initial data. This command is intended for development only.',
})
export class DataSeedWorkspaceCommand extends CommandRunner {
  workspaceIds = [SEED_APPLE_WORKSPACE_ID, SEED_YCOMBINATOR_WORKSPACE_ID];

  constructor(private readonly devSeederService: DevSeederService) {
    super();
  }

  async run(): Promise<void> {
    for (const workspaceId of this.workspaceIds) {
      await this.devSeederService.seedDev(workspaceId);
    }
  }
}
```

### 11.8 Dev Seeder Service (Orchestrator)

**File:** `packages/twenty-server/src/engine/workspace-manager/dev-seeder/services/dev-seeder.service.ts`

```typescript
@Injectable()
export class DevSeederService {
  constructor(
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly dataSourceService: DataSourceService,
    private readonly workspaceSyncMetadataService: WorkspaceSyncMetadataService,
    private readonly devSeederMetadataService: DevSeederMetadataService,
    private readonly devSeederPermissionsService: DevSeederPermissionsService,
    private readonly devSeederDataService: DevSeederDataService,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
  ) {}

  public async seedDev(workspaceId: string): Promise<void> {
    const mainDataSource = this.twentyORMGlobalManager.getMainDataSource();
    const isBillingEnabled = await this.isBillingEnabled();
    const appVersion = await this.getCurrentAppVersion();

    // ============================================
    // STEP 1: Seed Core Schema
    // ============================================
    // Insert records into core.workspace, core.user, core.userWorkspace
    await seedCoreSchema({
      dataSource: mainDataSource,
      workspaceId,
      seedBilling: isBillingEnabled,
      appVersion,
    });

    // ============================================
    // STEP 2: Create Workspace Database Schema
    // ============================================
    // CREATE SCHEMA workspace_{base36(workspaceId)}
    const schemaName = await this.workspaceDataSourceService.createWorkspaceDBSchema(workspaceId);

    // ============================================
    // STEP 3: Create Data Source Metadata
    // ============================================
    // Register workspace in metadata system
    const dataSourceMetadata = await this.dataSourceService.createDataSourceMetadata(
      workspaceId,
      schemaName,
    );

    // ============================================
    // STEP 4: Synchronize Metadata
    // ============================================
    // Scan WorkspaceEntity definitions → Create tables
    const featureFlags = await this.getFeatureFlagsMap(workspaceId);
    await this.workspaceSyncMetadataService.synchronize({
      workspaceId,
      dataSourceId: dataSourceMetadata.id,
      featureFlags,
    });

    // ============================================
    // STEP 5: Seed Custom Metadata
    // ============================================
    // Create custom objects, fields, relations
    await this.devSeederMetadataService.seed({
      dataSourceMetadata,
      workspaceId,
    });

    // ============================================
    // STEP 6: Initialize Permissions
    // ============================================
    // Create admin role, assign to founder user
    await this.devSeederPermissionsService.initPermissions(workspaceId);

    // ============================================
    // STEP 7: Seed Demo Data
    // ============================================
    // Insert companies, people, opportunities, etc.
    await this.devSeederDataService.seed({
      schemaName: dataSourceMetadata.schema,
      workspaceId,
    });

    // ============================================
    // STEP 8: Flush Cache
    // ============================================
    await this.workspaceCacheStorageService.flush(workspaceId, undefined);

    console.log(`✅ Workspace ${workspaceId} seeded successfully`);
  }
}
```

### 11.9 Core Schema Seeding Detail

**File:** `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-core-schema.util.ts`

```typescript
export const seedCoreSchema = async ({
  dataSource,
  workspaceId,
  seedBilling,
  appVersion,
}: {
  dataSource: DataSource;
  workspaceId: string;
  seedBilling: boolean;
  appVersion: string;
}) => {
  const schemaName = 'core';

  // 1. Seed workspace record
  await seedWorkspaces({
    dataSource,
    schemaName,
    workspaceId,
    appVersion,
  });

  // 2. Seed demo users
  await seedUsers(dataSource, schemaName);

  // 3. Seed user-workspace associations
  await seedUserWorkspaces(dataSource, schemaName, workspaceId);

  // 4. Seed agents (AI assistants)
  await seedAgents(dataSource, schemaName, workspaceId);

  // 5. Seed API keys
  await seedApiKeys(dataSource, schemaName, workspaceId);

  // 6. Seed feature flags
  await seedFeatureFlags(dataSource, schemaName, workspaceId);

  // 7. Seed billing subscriptions (if enabled)
  if (seedBilling) {
    await seedBillingSubscriptions(dataSource, schemaName, workspaceId);
  }
};
```

### 11.10 Database Scripts

#### truncate-db.ts

**File:** `packages/twenty-server/scripts/truncate-db.ts`

```typescript
// Drops all workspace schemas except system schemas
const dropWorkspaceSchemas = async (dataSource: DataSource) => {
  const schemas = await dataSource.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'workspace_%'
  `);

  for (const { schema_name } of schemas) {
    console.log(`Dropping schema: ${schema_name}`);
    await dataSource.query(`DROP SCHEMA IF EXISTS "${schema_name}" CASCADE`);
  }
};

// Keep these schemas intact
const PROTECTED_SCHEMAS = ['core', 'public', 'metric_helpers', 'user_management'];
```

#### setup-db.ts

**File:** `packages/twenty-server/scripts/setup-db.ts`

```typescript
const setupDatabase = async (dataSource: DataSource) => {
  // Create core schema
  await dataSource.query('CREATE SCHEMA IF NOT EXISTS core');

  // Create public schema
  await dataSource.query('CREATE SCHEMA IF NOT EXISTS public');

  // Enable UUID extension
  await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Enable pg_trgm for full-text search
  await dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  console.log('✅ Database setup completed');
};
```

### 11.11 Tóm tắt các File quan trọng

| Mục đích | File Path |
|----------|-----------|
| **Database reset config** | `packages/twenty-server/project.json` |
| **Truncate script** | `packages/twenty-server/scripts/truncate-db.ts` |
| **Setup script** | `packages/twenty-server/scripts/setup-db.ts` |
| **Command handler** | `packages/twenty-server/src/database/commands/data-seed-dev-workspace.command.ts` |
| **Orchestrator** | `packages/twenty-server/src/engine/workspace-manager/dev-seeder/services/dev-seeder.service.ts` |
| **Workspace seeds** | `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-workspaces.util.ts` |
| **User seeds** | `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-users.util.ts` |
| **UserWorkspace seeds** | `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-user-workspaces.util.ts` |
| **Core schema seeder** | `packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/utils/seed-core-schema.util.ts` |
| **Data seeder** | `packages/twenty-server/src/engine/workspace-manager/dev-seeder/data/services/dev-seeder-data.service.ts` |

### 11.12 Thêm Workspace mới vào Seed

Để thêm workspace mới vào quá trình seeding:

#### Bước 1: Thêm workspace definition

```typescript
// File: seed-workspaces.util.ts

export const SEED_MY_COMPANY_WORKSPACE_ID = '30303030-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

const workspaces = {
  // ... existing workspaces
  [SEED_MY_COMPANY_WORKSPACE_ID]: {
    id: SEED_MY_COMPANY_WORKSPACE_ID,
    displayName: 'My Company',
    subdomain: 'mycompany',
    inviteHash: 'mycompany.dev-invite-hash',
    logo: 'https://example.com/logo.png',
    activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    version: version,
    isTwoFactorAuthenticationEnforced: false,
  },
};
```

#### Bước 2: Thêm user-workspace associations

```typescript
// File: seed-user-workspaces.util.ts

const getUserWorkspaces = (workspaceId: string) => {
  // ... existing logic

  if (workspaceId === SEED_MY_COMPANY_WORKSPACE_ID) {
    return [
      { userId: TIM_APPLE_USER_ID, workspaceId },
      // Thêm users khác nếu cần
    ];
  }
};
```

#### Bước 3: Thêm vào command handler

```typescript
// File: data-seed-dev-workspace.command.ts

workspaceIds = [
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
  SEED_MY_COMPANY_WORKSPACE_ID,  // ← Thêm vào đây
];
```

#### Bước 4: Chạy database reset

```bash
npx nx database:reset twenty-server
```

---

## 12. Commands tạo Tables không Seed Data

### 12.1 Tổng quan

Trong một số trường hợp, bạn cần tạo cấu trúc database (tables, indexes) mà không muốn insert dữ liệu demo. Section này liệt kê các commands phục vụ mục đích đó.

### 12.2 So sánh các Commands

| Command | Core Tables | Workspace Tables | Seed Data | Use Case |
|---------|:-----------:|:----------------:|:---------:|----------|
| `database:reset` (default) | ✅ | ✅ | ✅ | Development với demo data |
| `database:reset --configuration=no-seed` | ✅ | ❌ | ❌ | Reset sạch, không data |
| `database:migrate` | ✅ | ❌ | ❌ | Chỉ update core schema |
| `workspace:sync-metadata` | ❌ | ✅ | ❌ | Sync tables cho workspace có sẵn |
| `workspace:seed:dev` | ✅ | ✅ | ✅ | Seed đầy đủ demo data |

### 12.3 Database Reset (No Seed)

**Command:**
```bash
npx nx database:reset twenty-server --configuration=no-seed
```

**Chức năng:**
- Drop tất cả workspace schemas hiện có
- Tạo lại core schema (`core`, `public`)
- Chạy TypeORM migrations (tạo tables trong core)
- Flush Redis cache
- **KHÔNG** chạy `workspace:seed:dev`

**Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│           database:reset --configuration=no-seed                │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌──────────┐           ┌──────────┐              ┌──────────┐
│truncate  │           │setup-db  │              │migrate   │
│-db.ts    │           │.ts       │              │          │
└──────────┘           └──────────┘              └──────────┘
    │                         │                         │
    ▼                         ▼                         ▼
DROP SCHEMA            CREATE SCHEMA             CREATE TABLES
workspace_*            core, public              in core schema
                       + extensions
```

**Cấu hình trong `project.json`:**
```json
{
  "database:reset": {
    "configurations": {
      "no-seed": {
        "commands": [
          "nx ts-node-no-deps-transpile-only -- ./scripts/truncate-db.ts",
          "nx ts-node-no-deps-transpile-only -- ./scripts/setup-db.ts",
          "nx database:migrate",
          "nx command-no-deps -- cache:flush"
        ]
      }
    }
  }
}
```

**Kết quả:**
- Core schema có đầy đủ tables: `workspace`, `user`, `userWorkspace`, `featureFlag`, etc.
- Không có workspace schemas (chưa tạo workspace nào)
- Không có dữ liệu

---

### 12.4 Database Migrate

**Command:**
```bash
npx nx database:migrate twenty-server
```

**Chức năng:**
- Chạy TypeORM migrations trong `src/database/typeorm/core/migrations/`
- Tạo/update tables trong **core schema** only
- Không ảnh hưởng workspace schemas
- Không seed data

**Khi nào dùng:**
- Sau khi pull code mới có migration files
- Update schema của core tables
- Production deployment

**Ví dụ migration file:**
```typescript
// src/database/typeorm/core/migrations/1234567890-AddNewColumn.ts

export class AddNewColumn1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE core.workspace
      ADD COLUMN "newColumn" VARCHAR(255)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE core.workspace
      DROP COLUMN "newColumn"
    `);
  }
}
```

---

### 12.5 Workspace Sync Metadata

**Command:**
```bash
npx nx run twenty-server:command workspace:sync-metadata
```

**Chức năng:**
- Quét tất cả `@WorkspaceEntity` definitions trong codebase
- So sánh với metadata hiện tại trong database
- Tạo/update tables trong workspace schema
- Tạo/update indexes
- **KHÔNG** insert bất kỳ data nào

**Options:**
```bash
# Dry run - chỉ xem thay đổi, không apply
npx nx run twenty-server:command workspace:sync-metadata --dry-run

# Chạy cho workspace cụ thể
npx nx run twenty-server:command workspace:sync-metadata -w <workspace-id>

# Force sync tất cả workspaces (bao gồm ACTIVE và SUSPENDED)
npx nx run twenty-server:command workspace:sync-metadata -f
```

**Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    workspace:sync-metadata                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Scan @WorkspaceEntity decorators                            │
│     - src/modules/**/*.workspace-entity.ts                      │
│     - src/mkt-core/**/*.workspace-entity.ts                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Compare with existing metadata                              │
│     - objectMetadata table                                      │
│     - fieldMetadata table                                       │
│     - indexMetadata table                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Generate workspace migrations                               │
│     - CREATE TABLE / ALTER TABLE                                │
│     - CREATE INDEX / DROP INDEX                                 │
│     - ADD COLUMN / DROP COLUMN                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Execute migrations (if not --dry-run)                       │
│     - Apply changes to workspace_{id} schema                    │
└─────────────────────────────────────────────────────────────────┘
```

**Code Location:**
```
src/engine/workspace-manager/workspace-sync-metadata/
├── commands/
│   └── sync-workspace-metadata.command.ts    ← Command handler
├── services/
│   ├── workspace-sync-metadata.service.ts    ← Main service
│   ├── workspace-sync-object-metadata.service.ts
│   ├── workspace-sync-field-metadata.service.ts
│   └── workspace-sync-index-metadata.service.ts
├── comparators/
│   ├── workspace-object.comparator.ts
│   ├── workspace-field.comparator.ts
│   └── workspace-index.comparator.ts
└── factories/
    ├── standard-object.factory.ts
    ├── standard-field.factory.ts
    └── standard-index.factory.ts
```

---

### 12.6 Workflow: Tạo Workspace chỉ với Tables

#### Scenario 1: Fresh Database (Development)

```bash
# 1. Reset database không seed
npx nx database:reset twenty-server --configuration=no-seed

# 2. Tạo workspace qua API hoặc SQL
# (xem Section 10.3 hoặc 10.4)

# 3. Sync metadata cho workspace
npx nx run twenty-server:command workspace:sync-metadata -w <workspace-id>
```

#### Scenario 2: Existing Database (Add new workspace)

```bash
# 1. Tạo workspace record trong core.workspace
INSERT INTO core.workspace (id, "displayName", subdomain, ...) VALUES (...);

# 2. Tạo user-workspace association
INSERT INTO core."userWorkspace" (...) VALUES (...);

# 3. Sync metadata (tạo workspace schema + tables)
npx nx run twenty-server:command workspace:sync-metadata -w <workspace-id>

# 4. (Optional) Chạy custom seeder nếu cần data cụ thể
npx nx run twenty-server:command mkt-license-data-seed-dev-workspace
```

#### Scenario 3: Update Schema sau khi thêm WorkspaceEntity mới

```bash
# 1. Tạo file workspace entity mới
# src/mkt-core/my-module/my-entity.workspace-entity.ts

# 2. Sync metadata cho tất cả workspaces
npx nx run twenty-server:command workspace:sync-metadata

# Hoặc dry-run trước để xem thay đổi
npx nx run twenty-server:command workspace:sync-metadata --dry-run
```

---

### 12.7 Tạo Workspace Schema thủ công

Nếu cần tạo workspace schema mà không dùng commands:

```sql
-- 1. Tạo workspace record
INSERT INTO core.workspace (
  id,
  "displayName",
  subdomain,
  "activationStatus",
  "isPasswordAuthEnabled",
  "createdAt",
  "updatedAt"
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'My Company',
  'mycompany',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);

-- 2. Tạo schema (cần biết base36 của workspace ID)
-- Có thể dùng function hoặc tính thủ công
CREATE SCHEMA IF NOT EXISTS "workspace_mybase36id";

-- 3. Chạy sync metadata
-- npx nx run twenty-server:command workspace:sync-metadata -w 550e8400-e29b-41d4-a716-446655440000
```

---

### 12.8 Production Deployment

**Recommended workflow cho production:**

```bash
# 1. Backup database trước
pg_dump -h localhost -U postgres mydb > backup.sql

# 2. Chạy core migrations
npx nx database:migrate twenty-server

# 3. Sync metadata cho tất cả workspaces (dry-run trước)
npx nx run twenty-server:command workspace:sync-metadata --dry-run

# 4. Nếu OK, apply changes
npx nx run twenty-server:command workspace:sync-metadata

# 5. Verify
psql -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'workspace_%'"
```

**Lưu ý quan trọng:**
- Luôn backup trước khi chạy migration
- Dùng `--dry-run` để preview changes
- Test trên staging trước production
- Không dùng `database:reset` trên production (sẽ xóa data!)

---

### 12.9 Troubleshooting

#### Lỗi: "Workspace schema does not exist"

**Nguyên nhân:** Workspace record tồn tại trong `core.workspace` nhưng schema chưa được tạo.

**Giải pháp:**
```bash
# Sync metadata sẽ tạo schema nếu chưa có
npx nx run twenty-server:command workspace:sync-metadata -w <workspace-id>
```

#### Lỗi: "Table already exists"

**Nguyên nhân:** Schema đã có tables từ trước.

**Giải pháp:**
```bash
# Dry-run để xem sync sẽ làm gì
npx nx run twenty-server:command workspace:sync-metadata --dry-run -w <workspace-id>

# Nếu cần reset hoàn toàn:
DROP SCHEMA "workspace_xxx" CASCADE;
# Rồi sync lại
```

#### Lỗi: "Migration failed"

**Nguyên nhân:** Có thể do schema changes conflict.

**Giải pháp:**
```bash
# 1. Check logs
cat sync-metadata.log

# 2. Rollback migration nếu cần
npx nx database:migrate:revert twenty-server

# 3. Fix code và thử lại
```

---

### 12.10 Tóm tắt Commands

```bash
# ============================================
# RESET & MIGRATE
# ============================================

# Reset database với demo data
npx nx database:reset twenty-server

# Reset database KHÔNG có data
npx nx database:reset twenty-server --configuration=no-seed

# Chỉ chạy core migrations
npx nx database:migrate twenty-server

# Revert migration cuối
npx nx database:migrate:revert twenty-server

# ============================================
# SYNC METADATA (Workspace Tables)
# ============================================

# Sync tất cả workspaces
npx nx run twenty-server:command workspace:sync-metadata

# Sync workspace cụ thể
npx nx run twenty-server:command workspace:sync-metadata -w <workspace-id>

# Force sync (bao gồm suspended workspaces)
npx nx run twenty-server:command workspace:sync-metadata -f

# Dry run (preview changes)
npx nx run twenty-server:command workspace:sync-metadata --dry-run

# ============================================
# CACHE
# ============================================

# Flush cache
npx nx run twenty-server:command cache:flush

# ============================================
# SEEDING (Optional)
# ============================================

# Seed demo workspaces
npx nx run twenty-server:command workspace:seed:dev

# Seed mkt-core data
npx nx run twenty-server:command mkt-license-data-seed-dev-workspace
npx nx run twenty-server:command mkt-customer-tag-data-seed-dev-workspace
npx nx run twenty-server:command mkt-department-data-seed-dev-workspace
```

---

## Tham khảo

- [Twenty CRM Official Documentation](https://twenty.com/developers)
- [Twenty GitHub Repository](https://github.com/twentyhq/twenty)
- [Multiple Workspaces Discussion](https://github.com/twentyhq/twenty/discussions/3646)
- [Create Workspace Guide](https://twenty.com/user-guide/section/getting-started/create-workspace)

---

*Tài liệu được tạo: 2025-12-21*
