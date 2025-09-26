# Tài Liệu Database CRM - Schema Core

## Tổng Quan
Schema `core` trong database PostgreSQL chứa các bảng cơ sở của hệ thống CRM Twenty. Schema này quản lý metadata, người dùng, workspace, quyền hạn, và các thành phần cốt lõi của hệ thống.

## Danh Sách Các Bảng

### 1. **user** - Quản Lý Người Dùng
**Mục đích**: Lưu trữ thông tin cá nhân và cài đặt của người dùng trong hệ thống CRM.

**Tính năng chính**:
- Quản lý thông tin cá nhân (tên, email, avatar)
- Xác thực và bảo mật (password hash, email verification)
- Cài đặt cá nhân (locale, quyền impersonate)
- Soft delete với deletedAt

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key, ID duy nhất |
| firstName | varchar | NO | '' | Tên đầu |
| lastName | varchar | NO | '' | Tên cuối |
| email | varchar | NO | - | Email duy nhất (có index) |
| isEmailVerified | boolean | NO | false | Trạng thái xác thực email |
| disabled | boolean | NO | false | Tài khoản bị vô hiệu hóa |
| passwordHash | varchar | YES | - | Hash mật khẩu |
| canImpersonate | boolean | NO | false | Quyền đóng vai người khác |
| defaultAvatarUrl | varchar | YES | - | URL avatar mặc định |
| locale | varchar | NO | 'en' | Ngôn ngữ giao diện |
| canAccessFullAdminPanel | boolean | NO | false | Quyền truy cập admin panel |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |
| deletedAt | timestamptz | YES | - | Thời gian xóa (soft delete) |

**Indexes**:
- Unique: email (where deletedAt IS NULL)
- Primary key: id

---

### 2. **workspace** - Quản Lý Không Gian Làm Việc
**Mục đích**: Lưu trữ thông tin workspace - đơn vị tổ chức chính trong CRM, mỗi workspace có database riêng và cài đặt độc lập.

**Tính năng chính**:
- Multi-tenancy với database riêng cho mỗi workspace
- Cài đặt xác thực (Google, Microsoft, Password)
- Quản lý tên miền và subdomain
- Role-based access control
- Tích hợp AI agent

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| displayName | varchar | YES | - | Tên hiển thị workspace |
| logo | varchar | YES | - | URL logo |
| subdomain | varchar | NO | - | Subdomain duy nhất |
| customDomain | varchar | YES | - | Tên miền tùy chỉnh |
| isCustomDomainEnabled | boolean | NO | false | Kích hoạt tên miền tùy chỉnh |
| databaseUrl | varchar | NO | '' | URL database riêng |
| databaseSchema | varchar | NO | '' | Schema database |
| activationStatus | enum | NO | 'INACTIVE' | Trạng thái kích hoạt |
| metadataVersion | integer | NO | 1 | Phiên bản metadata |
| allowImpersonation | boolean | NO | true | Cho phép impersonate |
| isPublicInviteLinkEnabled | boolean | NO | true | Liên kết mời công khai |
| isGoogleAuthEnabled | boolean | NO | true | Xác thực Google |
| isMicrosoftAuthEnabled | boolean | NO | true | Xác thực Microsoft |
| isPasswordAuthEnabled | boolean | NO | true | Xác thực mật khẩu |
| isTwoFactorAuthenticationEnforced | boolean | NO | false | Bắt buộc 2FA |
| defaultRoleId | uuid | YES | - | Role mặc định cho user mới |
| defaultAgentId | uuid | YES | - | AI agent mặc định |
| version | varchar | YES | - | Phiên bản workspace |
| inviteHash | varchar | YES | - | Hash cho lời mời |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |
| deletedAt | timestamptz | YES | - | Soft delete |

**Indexes**:
- Unique: subdomain, customDomain
- Primary key: id

---

### 3. **userWorkspace** - Quan Hệ Người Dùng - Workspace
**Mục đích**: Bảng trung gian quản lý mối quan hệ many-to-many giữa user và workspace, một user có thể thuộc nhiều workspace.

**Tính năng chính**:
- Liên kết user với workspace
- Cài đặt cá nhân theo workspace (avatar, locale)
- Unique constraint đảm bảo mỗi user chỉ có 1 record per workspace

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| userId | uuid | NO | - | Foreign key đến bảng user |
| workspaceId | uuid | NO | - | Foreign key đến bảng workspace |
| defaultAvatarUrl | varchar | YES | - | Avatar riêng cho workspace |
| locale | varchar | NO | 'en' | Ngôn ngữ cho workspace này |
| createdAt | timestamptz | NO | now() | Thời gian tham gia |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |
| deletedAt | timestamptz | YES | - | Soft delete |

**Indexes**:
- Unique: (userId, workspaceId)
- Index: userId, workspaceId (riêng biệt)
- Primary key: id

---

### 4. **role** - Quản Lý Vai Trò
**Mục đích**: Định nghĩa các vai trò (roles) trong workspace với các quyền hạn cụ thể, hỗ trợ RBAC (Role-Based Access Control).

**Tính năng chính**:
- Định nghĩa quyền hạn chi tiết (read, update, delete)
- Quyền truy cập settings và tools
- Roles có thể edit được hoặc system-defined
- Icon và description cho UI

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| label | varchar | NO | - | Tên role (unique per workspace) |
| description | text | YES | - | Mô tả vai trò |
| icon | varchar | YES | - | Icon hiển thị |
| workspaceId | uuid | NO | - | Workspace sở hữu |
| isEditable | boolean | NO | true | Có thể chỉnh sửa |
| canUpdateAllSettings | boolean | NO | false | Quyền cập nhật tất cả settings |
| canReadAllObjectRecords | boolean | NO | false | Đọc tất cả object records |
| canUpdateAllObjectRecords | boolean | NO | false | Cập nhật tất cả objects |
| canSoftDeleteAllObjectRecords | boolean | NO | false | Soft delete objects |
| canDestroyAllObjectRecords | boolean | NO | false | Xóa vĩnh viễn objects |
| canAccessAllTools | boolean | NO | false | Truy cập tất cả tools |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |

**Indexes**:
- Unique: (label, workspaceId)
- Primary key: id

---

### 5. **roleTargets** - Gán Vai Trò
**Mục đích**: Gán roles cho users hoặc agents trong workspace, hỗ trợ việc phân quyền chi tiết.

**Tính năng chính**:
- Gán role cho user hoặc agent
- Constraint đảm bảo chỉ có một trong hai (user hoặc agent)
- Unique constraint cho mỗi cặp user-role

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| roleId | uuid | NO | - | Foreign key đến role |
| userWorkspaceId | uuid | YES | - | Foreign key đến userWorkspace |
| agentId | uuid | YES | - | Foreign key đến agent |
| workspaceId | uuid | NO | - | Workspace context |
| createdAt | timestamptz | NO | now() | Thời gian gán |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |

**Constraints**:
- Check: CHK_role_targets_either_agent_or_user
- Unique: (userWorkspaceId, roleId)
- Index: agentId, workspaceId

---

### 6. **objectMetadata** - Metadata Đối Tượng
**Mục đích**: Lưu trữ metadata của các object types trong CRM (như Person, Company, Deal...), cho phép tạo các object tùy chỉnh.

**Tính năng chính**:
- Dynamic schema - tạo object types mới
- Quản lý tên singular/plural và labels
- Cấu hình tìm kiếm và audit logging
- Hỗ trợ remote objects và custom objects
- Duplicate criteria configuration

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| nameSingular | varchar | NO | - | Tên số ít (unique per workspace) |
| namePlural | varchar | NO | - | Tên số nhiều (unique per workspace) |
| labelSingular | varchar | NO | - | Label hiển thị số ít |
| labelPlural | varchar | NO | - | Label hiển thị số nhiều |
| description | text | YES | - | Mô tả object |
| icon | varchar | YES | - | Icon hiển thị |
| targetTableName | varchar | NO | - | Tên bảng trong database |
| dataSourceId | uuid | NO | - | Foreign key đến dataSource |
| workspaceId | uuid | NO | - | Workspace sở hữu |
| isCustom | boolean | NO | false | Object tùy chỉnh |
| isActive | boolean | NO | false | Trạng thái hoạt động |
| isSystem | boolean | NO | false | Object hệ thống |
| isRemote | boolean | NO | false | Object từ remote source |
| isAuditLogged | boolean | NO | true | Ghi log audit |
| isSearchable | boolean | NO | false | Có thể tìm kiếm |
| isLabelSyncedWithName | boolean | NO | false | Đồng bộ label với name |
| standardId | uuid | YES | - | ID cho standard objects |
| labelIdentifierFieldMetadataId | uuid | YES | - | Field dùng làm label |
| imageIdentifierFieldMetadataId | uuid | YES | - | Field dùng làm image |
| shortcut | varchar | YES | - | Phím tắt |
| duplicateCriteria | jsonb | YES | - | Tiêu chí phát hiện trùng |
| standardOverrides | jsonb | YES | - | Override cho standard objects |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |

**Indexes**:
- Unique: (nameSingular, workspaceId), (namePlural, workspaceId)
- Primary key: id

---

### 7. **fieldMetadata** - Metadata Trường Dữ Liệu
**Mục đích**: Định nghĩa các trường (fields) của object types, cho phép tạo schema động và tùy chỉnh các trường dữ liệu.

**Tính năng chính**:
- Dynamic field creation với nhiều kiểu dữ liệu
- Quan hệ giữa các objects (relations)
- Validation và constraints
- Field options và settings
- Custom vs system fields

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| objectMetadataId | uuid | NO | - | Object chứa field này |
| name | varchar | NO | - | Tên field (unique per object) |
| label | varchar | NO | - | Label hiển thị |
| type | varchar | NO | - | Kiểu dữ liệu (TEXT, NUMBER, etc.) |
| description | text | YES | - | Mô tả field |
| icon | varchar | YES | - | Icon hiển thị |
| defaultValue | jsonb | YES | - | Giá trị mặc định |
| options | jsonb | YES | - | Options cho SELECT fields |
| settings | jsonb | YES | - | Cài đặt field-specific |
| workspaceId | uuid | NO | - | Workspace sở hữu |
| isCustom | boolean | NO | false | Field tùy chỉnh |
| isActive | boolean | NO | false | Trạng thái hoạt động |
| isSystem | boolean | NO | false | Field hệ thống |
| isNullable | boolean | YES | true | Cho phép null |
| isUnique | boolean | YES | false | Giá trị duy nhất |
| isLabelSyncedWithName | boolean | NO | false | Đồng bộ label với name |
| standardId | uuid | YES | - | ID cho standard fields |
| relationTargetObjectMetadataId | uuid | YES | - | Object đích trong relation |
| relationTargetFieldMetadataId | uuid | YES | - | Field đích trong relation |
| standardOverrides | jsonb | YES | - | Override cho standard fields |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |

**Indexes**:
- Unique: (name, objectMetadataId, workspaceId) excluding MORPH_RELATION
- Index: objectMetadataId, workspaceId, relation targets
- Primary key: id

---

### 8. **apiKey** - Quản Lý API Keys
**Mục đích**: Lưu trữ và quản lý API keys cho workspace, cho phép truy cập programmatic vào CRM data.

**Tính năng chính**:
- API authentication
- Expiration management
- Revocation capability
- Workspace-scoped keys

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| name | varchar | NO | - | Tên API key |
| expiresAt | timestamptz | NO | - | Thời gian hết hạn |
| revokedAt | timestamptz | YES | - | Thời gian thu hồi |
| workspaceId | uuid | NO | - | Workspace sở hữu |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |

**Indexes**:
- Index: workspaceId
- Primary key: id

---

### 9. **view** - Quản Lý Views
**Mục đích**: Lưu trữ cấu hình views (table, kanban, calendar) của các object types, cho phép user tùy chỉnh cách hiển thị dữ liệu.

**Tính năng chính**:
- Multiple view types (table, kanban, etc.)
- View configuration và layout
- Kanban aggregation settings
- Position ordering
- Search filtering

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| name | text | NO | '' | Tên view |
| objectMetadataId | uuid | NO | - | Object được view |
| type | varchar | NO | 'table' | Loại view (table, kanban) |
| key | text | YES | 'INDEX' | Key định danh |
| icon | text | NO | - | Icon hiển thị |
| position | integer | NO | 0 | Thứ tự sắp xếp |
| isCompact | boolean | NO | false | Hiển thị compact |
| openRecordIn | enum | NO | 'SIDE_PANEL' | Cách mở record |
| kanbanAggregateOperation | enum | YES | - | Phép tính Kanban |
| kanbanAggregateOperationFieldMetadataId | uuid | YES | - | Field cho Kanban aggregation |
| anyFieldFilterValue | text | YES | - | Giá trị filter toàn bộ |
| workspaceId | uuid | NO | - | Workspace sở hữu |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |
| deletedAt | timestamptz | YES | - | Soft delete |

**Indexes**:
- Index: (workspaceId, objectMetadataId)
- Primary key: id

---

### 10. **agent** - Quản Lý AI Agents
**Mục đích**: Lưu trữ cấu hình AI agents trong workspace, hỗ trợ automation và AI-powered features.

**Tính năng chính**:
- AI model configuration
- Custom prompts và response formats
- Agent metadata (name, description, icon)
- Custom vs system agents

| Cột | Kiểu Dữ Liệu | Nullable | Mặc Định | Mô Tả |
|-----|-------------|----------|----------|--------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| name | varchar | NO | - | Tên agent (unique per workspace) |
| label | varchar | NO | - | Label hiển thị |
| description | varchar | YES | - | Mô tả agent |
| prompt | text | NO | - | System prompt cho AI |
| modelId | varchar | NO | 'auto' | Model AI sử dụng |
| responseFormat | jsonb | YES | - | Format response |
| icon | varchar | YES | - | Icon hiển thị |
| workspaceId | uuid | NO | - | Workspace sở hữu |
| isCustom | boolean | NO | false | Agent tùy chỉnh |
| createdAt | timestamptz | NO | now() | Thời gian tạo |
| updatedAt | timestamptz | NO | now() | Thời gian cập nhật |
| deletedAt | timestamptz | YES | - | Soft delete |

**Indexes**:
- Unique: (name, workspaceId)
- Index: (id, deletedAt)
- Primary key: id

---

## Các Bảng Hỗ Trợ Khác

### **agentChatMessage** - Tin Nhắn Chat AI
Lưu trữ các tin nhắn trong cuộc hội thoại với AI agents.

### **agentChatThread** - Thread Chat AI
Quản lý các thread hội thoại với AI agents.

### **agentHandoff** - Chuyển Giao AI
Quản lý việc chuyển giao giữa các AI agents.

### **appToken** - Token Ứng Dụng
Lưu trữ tokens cho các ứng dụng tích hợp.

### **approvedAccessDomain** - Domain Được Phép
Quản lý các domain được phép truy cập.

### **dataSource** - Nguồn Dữ Liệu
Định nghĩa các nguồn dữ liệu (database connections).

### **featureFlag** - Feature Flags
Quản lý các feature flags để bật/tắt tính năng.

### **fieldPermission** - Quyền Trường
Phân quyền truy cập chi tiết đến từng field.

### **file** - Quản Lý File
Lưu trữ metadata của files được upload.

### **indexFieldMetadata** & **indexMetadata** - Database Indexes
Quản lý indexes của database để tối ưu performance.

### **keyValuePair** - Cặp Key-Value
Lưu trữ các cài đặt dạng key-value.

### **objectPermission** - Quyền Đối Tượng
Phân quyền truy cập đến các object types.

### **permissionFlag** - Cờ Quyền Hạn
Quản lý các flags quyền hạn cụ thể.

### **postgresCredentials** - Thông Tin Postgres
Lưu credentials cho remote Postgres connections.

### **remoteServer** & **remoteTable** - Remote Objects
Quản lý kết nối và bảng từ remote data sources.

### **serverlessFunction** - Functions
Lưu trữ serverless functions code.

### **twoFactorAuthenticationMethod** - 2FA
Quản lý phương thức xác thực 2 yếu tố.

### **view*** Tables - Cấu Hình Views
- **viewField**: Cấu hình fields trong view
- **viewFilter**: Bộ lọc của view
- **viewFilterGroup**: Nhóm các filters
- **viewGroup**: Nhóm dữ liệu trong view
- **viewSort**: Sắp xếp trong view

### **webhook** - Webhooks
Cấu hình webhooks cho external integrations.

### **workspaceMigration** - Migration Workspace
Theo dõi migrations đã chạy cho workspace.

### **workspaceSSOIdentityProvider** - SSO
Cấu hình Single Sign-On providers.

### **_typeorm*** Tables - System
Các bảng hệ thống của TypeORM để quản lý migrations và metadata.

---

## Tổng Kết

Schema `core` được thiết kế với kiến trúc multi-tenant mạnh mẽ, hỗ trợ:

1. **Multi-tenancy**: Mỗi workspace có database riêng
2. **Dynamic Schema**: Tạo objects và fields tùy chỉnh
3. **RBAC**: Role-based access control chi tiết
4. **AI Integration**: Tích hợp AI agents
5. **Extensibility**: Dễ dàng mở rộng và tùy chỉnh
6. **Security**: Phân quyền chi tiết và audit logging

Kiến trúc này cho phép Twenty CRM hỗ trợ nhiều tổ chức khác nhau với các yêu cầu và cấu hình riêng biệt trong một hệ thống duy nhất.