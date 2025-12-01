# Guards Documentation - Twenty CRM

Tài liệu này mô tả chi tiết các guards trong thư mục `/packages/twenty-server/src/engine/guards`.

## Tổng quan

Guards trong NestJS là lớp bảo vệ kiểm soát quyền truy cập vào các endpoints. Tất cả guards đều implement interface `CanActivate` và được sử dụng với decorator `@UseGuards()`.

## Danh sách Guards

### 1. JWT Auth Guard

**File**: `jwt-auth.guard.ts`

**Mục đích**: Xác thực JWT token từ request và trích xuất authentication context.

**Cách hoạt động**:
- Validate JWT token thông qua `AccessTokenService.validateTokenByRequest()`
- Gắn các thông tin vào request object:
  - `request.user` - Thông tin user
  - `request.apiKey` - API key (nếu có)
  - `request.workspace` - Workspace object
  - `request.workspaceId` - ID của workspace
  - `request.workspaceMetadataVersion` - Phiên bản metadata từ cache
  - `request.workspaceMemberId` - ID thành viên workspace hiện tại
  - `request.userWorkspaceId` - ID workspace của user

**Dependencies**:
- `AccessTokenService` - Validate và decode JWT tokens
- `WorkspaceCacheStorageService` - Lấy metadata version từ cache

**Khi nào sử dụng**: Thường được apply global hoặc trên các routes yêu cầu JWT authentication.

---

### 2. User Auth Guard

**File**: `user-auth.guard.ts`

**Mục đích**: Kiểm tra user đã được xác thực (tồn tại trong request).

**Cách hoạt động**:
- Trích xuất GraphQL execution context
- Kiểm tra `request.user` có được định nghĩa không
- Trả về boolean trực tiếp

**Dependencies**: Không có - chỉ validation đơn thuần

**Sử dụng**:
```typescript
@UseGuards(UserAuthGuard)
async getCurrentUser() { ... }
```

---

### 3. Workspace Auth Guard

**File**: `workspace-auth.guard.ts`

**Mục đích**: Kiểm tra workspace context tồn tại trong request.

**Cách hoạt động**:
- Kiểm tra `request.workspace` có được định nghĩa không
- Trả về boolean trực tiếp

**Dependencies**: Không có - chỉ validation đơn thuần

**Sử dụng**: Thường kết hợp với các guards khác
```typescript
@UseGuards(WorkspaceAuthGuard, UserAuthGuard, SettingsPermissionsGuard(...))
```

---

### 4. Feature Flag Guard

**File**: `feature-flag.guard.ts`

**Mục đích**: Kiểm soát quyền truy cập features dựa trên cài đặt feature flag của workspace.

**Decorator kèm theo**: `@RequireFeatureFlag(featureFlag: FeatureFlagKey)`

**Cách hoạt động**:
- Trích xuất `workspaceId` từ request
- Lấy required feature flag từ metadata qua Reflector
- Nếu không có flag metadata, cho phép truy cập (return `true`)
- Gọi `featureFlagService.isFeatureEnabled(flagKey, workspaceId)`
- Throw error nếu feature chưa được enable
- Return `true` nếu được enable

**Dependencies**:
- `Reflector` - Đọc metadata từ decorators
- `FeatureFlagService` - Kiểm tra feature có được enable cho workspace không

**Danh sách Feature Flags**:
| Flag | Mô tả |
|------|-------|
| IS_AIRTABLE_INTEGRATION_ENABLED | Tích hợp Airtable |
| IS_POSTGRESQL_INTEGRATION_ENABLED | Tích hợp PostgreSQL |
| IS_STRIPE_INTEGRATION_ENABLED | Tích hợp Stripe |
| IS_UNIQUE_INDEXES_ENABLED | Unique indexes |
| IS_JSON_FILTER_ENABLED | JSON filtering |
| IS_AI_ENABLED | Tính năng AI |
| IS_IMAP_SMTP_CALDAV_ENABLED | Email IMAP/SMTP/CalDAV |
| IS_MORPH_RELATION_ENABLED | Morph relations |
| IS_WORKFLOW_FILTERING_ENABLED | Workflow filtering |
| IS_RELATION_CONNECT_ENABLED | Relation connect |
| IS_WORKSPACE_API_KEY_WEBHOOK_GRAPHQL_ENABLED | API Key Webhook GraphQL |
| IS_FIELDS_PERMISSIONS_ENABLED | Field permissions |
| IS_CORE_VIEW_SYNCING_ENABLED | Core view syncing |
| IS_TWO_FACTOR_AUTHENTICATION_ENABLED | 2FA |
| IS_WORKSPACE_MIGRATION_V2_ENABLED | Workspace migration v2 |

**Sử dụng**:
```typescript
@RequireFeatureFlag(FeatureFlagKey.IS_AI_ENABLED)
async findOneAgent(@Args('input') { id }: AgentIdInput) { ... }
```

---

### 5. Public Endpoint Guard

**File**: `public-endpoint.guard.ts`

**Mục đích**: Đánh dấu endpoint là public/không cần bảo vệ; phục vụ như documentation rằng endpoint cố ý bypass authentication.

**Cách hoạt động**:
- Luôn return `true`
- Không thực hiện validation nào
- Đánh dấu có chủ đích bypass

**Dependencies**: Không có

**Sử dụng**:
```typescript
@UseGuards(CaptchaGuard, PublicEndpointGuard)
async signUp(@Body() input: SignUpInput) { ... }
```

**Lưu ý**: Thường kết hợp với guards khác như `CaptchaGuard` cho các public endpoints cần validation bổ sung.

---

### 6. Admin Panel Guard

**File**: `admin-panel-guard.ts`

**Mục đích**: Kiểm tra user có quyền truy cập đầy đủ admin panel.

**Cách hoạt động**:
- Kiểm tra `request.user.canAccessFullAdminPanel === true`
- Trả về boolean

**Dependencies**: Không có - kiểm tra trực tiếp property của user

**Khi nào sử dụng**: Bảo vệ các endpoints chỉ dành cho admin.

---

### 7. Impersonate Guard

**File**: `impersonate-guard.ts`

**Mục đích**: Kiểm tra user có quyền impersonate (mạo danh) user khác.

**Cách hoạt động**:
- Kiểm tra `request.user.canImpersonate === true`
- Trả về boolean

**Dependencies**: Không có - kiểm tra trực tiếp property của user

**Khi nào sử dụng**: Bảo vệ các endpoints/mutations liên quan đến impersonation.

---

### 8. Settings Permissions Guard

**File**: `settings-permissions.guard.ts`

**Mục đích**: Kiểm soát quyền truy cập settings dựa trên granular permission flags; sử dụng role-based access control.

**Cách hoạt động**:
- Factory function trả về `Type<CanActivate>` (mixin pattern)
- Trích xuất `workspaceId`, `userWorkspaceId`, và `workspaceActivationStatus` từ request
- Tự động cho phép nếu workspace ở trạng thái `PENDING_CREATION` hoặc `ONGOING_CREATION`
- Gọi `permissionsService.userHasWorkspaceSettingPermission()` với:
  - userWorkspaceId
  - requiredPermission setting flag
  - workspaceId
  - isExecutedByApiKey - phát hiện request có sử dụng API key không
- Throw `PermissionsException` nếu từ chối quyền
- Return `true` nếu được cấp quyền

**Dependencies**:
- `PermissionsService` - Kiểm tra quyền workspace của user
- `WorkspaceActivationStatus` enum (từ twenty-shared)
- `isDefined` utility

**Danh sách Permission Flags**:
| Flag | Mô tả |
|------|-------|
| API_KEYS_AND_WEBHOOKS | Quản lý API keys và webhooks |
| WORKSPACE | Cài đặt workspace |
| WORKSPACE_MEMBERS | Quản lý thành viên workspace |
| ROLES | Quản lý roles |
| DATA_MODEL | Data model settings |
| ADMIN_PANEL | Admin panel access |
| SECURITY | Security settings |
| WORKFLOWS | Workflow settings |
| SEND_EMAIL_TOOL | Công cụ gửi email |
| IMPORT_CSV | Import CSV |
| EXPORT_CSV | Export CSV |

**Sử dụng**:
```typescript
@UseGuards(SettingsPermissionsGuard(PermissionFlagType.API_KEYS_AND_WEBHOOKS))
async createApiKey() { ... }
```

**Hành vi đặc biệt**: Xử lý khác nhau giữa API key-based requests và user sessions.

---

## Chuỗi Dependencies & Quan hệ

```
JwtAuthGuard (điểm vào)
  ├─ Populate: request.user, request.workspace, request.workspaceId
  │
├─ UserAuthGuard (kiểm tra request.user tồn tại)
├─ WorkspaceAuthGuard (kiểm tra request.workspace tồn tại)
│
├─ FeatureFlagGuard (feature toggles cấp workspace)
├─ AdminPanelGuard (kiểm tra user.canAccessFullAdminPanel)
├─ ImpersonateGuard (kiểm tra user.canImpersonate)
│
├─ SettingsPermissionsGuard (quyền chi tiết dựa trên role)
│   └─ Phụ thuộc: PermissionsService
│
└─ PublicEndpointGuard (bypass tất cả checks)
```

---

## Key Patterns

### 1. GraphQL Context Extraction
```typescript
const ctx = GqlExecutionContext.create(context);
const request = ctx.getContext().req;
```

### 2. Request Object Population (bởi JwtAuthGuard)
Tất cả guards tiếp theo phụ thuộc vào các properties được JwtAuthGuard gắn vào request:
- Chứa thông tin user, workspace, và metadata

### 3. Guard Composition
Guards thường được xếp chồng:
```typescript
@UseGuards(WorkspaceAuthGuard, UserAuthGuard, SettingsPermissionsGuard(...))
```
- `JwtAuthGuard` thường được apply global
- `PublicEndpointGuard` bypass auth mặc định

### 4. Metadata-Driven (FeatureFlagGuard)
- Sử dụng decorator `@RequireFeatureFlag()` để đánh dấu handlers
- Guard kiểm tra metadata tại runtime qua Reflector

### 5. Permission Model (SettingsPermissionsGuard)
- Trạng thái activation của workspace ảnh hưởng đến permission checks
- Xử lý khác nhau giữa API key và user-based requests
- Throw exceptions cụ thể với error codes

---

## Ví dụ Sử dụng Thực tế

### Endpoint yêu cầu authentication cơ bản
```typescript
@UseGuards(UserAuthGuard)
@Query()
async getCurrentUser(@AuthUser() user: User) {
  return user;
}
```

### Endpoint yêu cầu workspace context
```typescript
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@Query()
async getWorkspaceData(@AuthWorkspace() workspace: Workspace) {
  return workspace;
}
```

### Endpoint yêu cầu feature flag
```typescript
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@RequireFeatureFlag(FeatureFlagKey.IS_AI_ENABLED)
@Query()
async getAIInsights() {
  // Chỉ chạy khi IS_AI_ENABLED = true cho workspace
}
```

### Endpoint yêu cầu permission cụ thể
```typescript
@UseGuards(
  WorkspaceAuthGuard,
  UserAuthGuard,
  SettingsPermissionsGuard(PermissionFlagType.DATA_MODEL)
)
@Mutation()
async updateDataModel(@Args('input') input: UpdateDataModelInput) {
  // Chỉ users có quyền DATA_MODEL mới truy cập được
}
```

### Public endpoint
```typescript
@UseGuards(CaptchaGuard, PublicEndpointGuard)
@Post('signup')
async signUp(@Body() input: SignUpInput) {
  // Không yêu cầu authentication
}
```

---

## Tổng kết

| Guard | Mục đích chính | Dependencies |
|-------|----------------|--------------|
| JwtAuthGuard | Validate JWT, populate request | AccessTokenService, WorkspaceCacheStorageService |
| UserAuthGuard | Kiểm tra user tồn tại | Không |
| WorkspaceAuthGuard | Kiểm tra workspace tồn tại | Không |
| FeatureFlagGuard | Feature toggle check | Reflector, FeatureFlagService |
| PublicEndpointGuard | Bypass authentication | Không |
| AdminPanelGuard | Admin access check | Không |
| ImpersonateGuard | Impersonate permission check | Không |
| SettingsPermissionsGuard | Granular RBAC | PermissionsService |
