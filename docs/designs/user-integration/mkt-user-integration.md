# MKT User Integration Module

## Tổng quan

Module **mkt-user-integration** cung cấp tích hợp với MKT Server để quản lý User thông qua OAuth2. Module hỗ trợ CRUD operations, login history tracking và không sử dụng caching để đảm bảo dữ liệu real-time.

**Vị trí:** `packages/twenty-server/src/mkt-core/mkt-user-integration/`

**Đặc điểm quan trọng:** Không sử dụng cache - dữ liệu user thay đổi thường xuyên (login, status) nên cần độ chính xác real-time.

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                    GraphQL API Layer                             │
│                    MktUserResolver                               │
│              (2 Queries + 2 Mutations)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                 │
│                 MktUserProxyService                              │
│     (Business logic, validation, NotFoundException handling)     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository Layer                              │
│                   MktUserRepository                              │
│            (HTTP calls to MKT Server via OAuth2)                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External: MKT Server                          │
│              User OAuth API (/api/oauth/users)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
mkt-user-integration/
├── constants/
│   └── mkt-user.constants.ts          # API endpoints, status enums, URL builders
├── dto/
│   ├── mkt-user.input.ts              # GraphQL input types cho CRUD
│   └── mkt-user.output.ts             # GraphQL output types và response DTOs
├── message/
│   └── index.ts                        # Success/error messages và log messages
├── repositories/
│   └── mkt-user.repository.ts          # Data access layer (HTTP calls)
├── resolvers/
│   └── mkt-user.resolver.ts            # GraphQL resolvers
├── services/
│   └── mkt-user-proxy.service.ts       # Business logic facade service
├── types/
│   └── mkt-user.types.ts               # TypeScript type definitions
├── utils/
│   └── mkt-user-mapper.utils.ts        # DTO mapping utilities
└── mkt-user-integration.module.ts      # NestJS module definition
```

## Nghiệp vụ User

### Trạng thái User (Status)

| Status | Mô tả |
|--------|-------|
| `active` | User đang hoạt động |
| `pending` | User chờ xác nhận/phê duyệt |
| `suspended` | User bị tạm ngưng |
| `inactive` | User không hoạt động |

### Phương thức xác thực (Auth Method)

| Method | Mô tả |
|--------|-------|
| `local` | Xác thực bằng username/password |
| `google` | OAuth via Google |
| `facebook` | OAuth via Facebook |
| `apple` | OAuth via Apple |

### OAuth2 Scopes

| Scope | Mô tả |
|-------|-------|
| `users:read` | Đọc dữ liệu user |
| `users:write` | Ghi dữ liệu user |
| `users:manage` | Quản lý users (admin) |

## API Endpoints

### MKT Server Endpoints (OAuth Protected)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/oauth/users` | GET | Lấy danh sách users |
| `/api/oauth/users/:id` | GET | Lấy user theo ID |
| `/api/oauth/users/by-email/:email` | GET | Lấy user theo email |
| `/api/oauth/users/register` | POST | Tạo user mới |
| `/api/oauth/users/:id` | PATCH | Cập nhật user |
| `/api/oauth/users/by-email/:email/login-history` | GET | Lấy lịch sử đăng nhập |

### GraphQL API

#### Queries (3)

```graphql
# Lấy user theo ID
mktUser(userId: String!): MktUserResponseDto

# Lấy user theo email
mktUserByEmail(email: String!): MktUserResponseDto

# Lấy lịch sử đăng nhập theo email
mktUserLoginHistory(email: String!): MktUserLoginHistoryResponseDto
```

#### Mutations (2)

```graphql
# Tạo user mới
mktCreateUser(input: MktCreateUserInputDto!): MktUserResponseDto

# Cập nhật user
mktUpdateUser(userId: String!, input: MktUpdateUserInputDto!): MktUserResponseDto
```

## Types & Interfaces

### User Type

```typescript
type MktUser = {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  code: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roleId: string | null;
  status: MktUserStatusType;           // active | pending | suspended | inactive
  authMethod: MktAuthMethodType;       // local | google | facebook | apple
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  crmCustomerId: string | null;        // Link đến CRM Customer
  crmSyncEnabled: boolean;
  preferences: Record<string, unknown>;
  settings: Record<string, unknown>;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### Login History Type

```typescript
type MktUserLoginHistory = {
  userId: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lockedUntil: string | null;          // Thời gian khóa (nếu bị khóa)
};
```

### Input Types

```typescript
// Tạo user
type MktCreateUserInput = {
  email: string;            // Required
  password: string;         // Required
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  code?: string;
  roleId?: string;
  status?: MktUserStatusType;
};

// Cập nhật user
type MktUpdateUserInput = {
  email?: string;
  username?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  status?: MktUserStatusType;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
  settings?: Record<string, unknown>;
};
```

### Query Parameters

```typescript
type MktUserQueryParams = {
  page?: number;           // Default: 1
  limit?: number;          // Default: 10, Max: 100
  role?: string;           // Filter theo role
  status?: MktUserStatusType;  // Filter theo status
  search?: string;         // Tìm kiếm
};
```

## Service Methods

### MktUserProxyService

#### Get User Methods

| Method | Throws Error | Mô tả |
|--------|--------------|-------|
| `getUser(userId, userContext?)` | ✓ NotFoundException | Lấy user theo ID |
| `getUserOrNull(userId, userContext?)` | ✗ Returns null | Lấy user theo ID (nullable) |
| `getUserByEmail(email, userContext?)` | ✓ NotFoundException | Lấy user theo email |
| `getUserByEmailOrNull(email, userContext?)` | ✗ Returns null | Lấy user theo email (nullable) |
| `getUsers(params?, userContext?)` | ✗ | Lấy danh sách users |

#### Mutation Methods

| Method | Mô tả |
|--------|-------|
| `createUser(input, userContext?)` | Tạo user mới |
| `updateUser(userId, input, userContext?)` | Cập nhật user (kiểm tra tồn tại trước) |

#### Login History Methods

| Method | Throws Error | Mô tả |
|--------|--------------|-------|
| `getUserLoginHistoryByEmail(email, userContext?)` | ✓ NotFoundException | Lấy login history |
| `getUserLoginHistoryByEmailOrNull(email, userContext?)` | ✗ Returns null | Lấy login history (nullable) |

#### Utility Methods

| Method | Mô tả |
|--------|-------|
| `userExists(userId, userContext?)` | Kiểm tra user tồn tại theo ID |
| `userExistsByEmail(email, userContext?)` | Kiểm tra user tồn tại theo email |

### Pattern: Nullable vs Throwing

```typescript
// Throwing variant - ném exception nếu không tìm thấy
const user = await userService.getUser(userId);
// Throws NotFoundException nếu user không tồn tại

// Nullable variant - trả về null nếu không tìm thấy
const user = await userService.getUserOrNull(userId);
if (!user) {
  // Handle không tìm thấy
}
```

## Workflows

### Create User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Create User Workflow                          │
├─────────────────────────────────────────────────────────────────┤
│  1. GraphQL nhận mutation mktCreateUser                         │
│  2. Resolver build UserContext từ authenticated user             │
│  3. Service validate input structure                             │
│  4. Repository POST to /api/oauth/users/register                 │
│  5. MKT Server tạo user, trả về user mới với ID                  │
│  6. Map response → MktUserDto                                    │
│  7. Wrap trong MktUserResponseDto { success: true, data }       │
└─────────────────────────────────────────────────────────────────┘
```

### Read User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Read User Workflow                            │
├─────────────────────────────────────────────────────────────────┤
│  1. GraphQL nhận query mktUser hoặc mktUserByEmail              │
│  2. Service gọi repository với userId hoặc email                 │
│  3. Repository GET to /api/oauth/users/:id                       │
│     ├─ Found → Return MktUser                                    │
│     └─ Not found → Return null                                   │
│  4. Service kiểm tra null                                        │
│     ├─ null → Throw NotFoundException                           │
│     └─ user → Continue                                           │
│  5. Resolver catch exception hoặc return user DTO                │
│  6. Response: { success: true/false, data/error }               │
└─────────────────────────────────────────────────────────────────┘
```

### Update User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Update User Workflow                          │
├─────────────────────────────────────────────────────────────────┤
│  1. GraphQL nhận mutation mktUpdateUser(userId, input)          │
│  2. Service verify user exists (via getUser - throws if not)    │
│  3. Repository PATCH to /api/oauth/users/:id                     │
│  4. MKT Server update và return updated user                     │
│  5. Map response → MktUserDto                                    │
│  6. Response: { success: true, data, message }                  │
└─────────────────────────────────────────────────────────────────┘
```

### Login History Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                Login History Workflow                            │
├─────────────────────────────────────────────────────────────────┤
│  1. GraphQL nhận query mktUserLoginHistory(email)               │
│  2. Service verify user exists by email                          │
│     └─ Not found → Throw NotFoundException                      │
│  3. Repository GET to /api/oauth/users/by-email/:email/login-history │
│  4. Map response → MktUserLoginHistoryDto                        │
│  5. Response: { success: true, data }                            │
└─────────────────────────────────────────────────────────────────┘
```

## GraphQL DTOs

### Input DTOs

```typescript
// Query users
input MktUserQueryInput {
  page: Int = 1
  limit: Int = 10
  role: String
  status: MktUserStatusFilter
  search: String
}

// Create user
input MktCreateUserInputDto {
  email: String!
  password: String!
  firstName: String
  lastName: String
  fullName: String
  phone: String
  code: String
  roleId: String
  status: MktUserStatusFilter
}

// Update user
input MktUpdateUserInputDto {
  email: String
  username: String
  fullName: String
  phone: String
  role: String
  status: MktUserStatusFilter
  avatarUrl: String
  preferences: JSON
  settings: JSON
}
```

### Output DTOs

```typescript
type MktUserDto {
  id: String!
  email: String!
  username: String
  firstName: String!
  lastName: String!
  fullName: String!
  code: String
  phone: String
  avatarUrl: String
  roleId: String
  status: String!
  authMethod: String!
  emailVerified: Boolean!
  phoneVerified: Boolean!
  twoFactorEnabled: Boolean!
  crmCustomerId: String
  crmSyncEnabled: Boolean!
  preferences: JSON
  settings: JSON
  lastLoginAt: String
  lastLoginIp: String
  createdAt: String!
  updatedAt: String!
}

type MktUserResponseDto {
  success: Boolean!
  data: MktUserDto
  message: String
  error: String
}

type MktUserListResponseDto {
  success: Boolean!
  data: [MktUserDto!]!
  total: Int!
  page: Int!
  limit: Int!
  message: String
  error: String
}

type MktUserLoginHistoryDto {
  userId: String!
  lastLoginAt: String
  lastLoginIp: String
  lockedUntil: String
}
```

## Error Handling

### Response Pattern

```typescript
// Success response
{
  success: true,
  data: { ... },
  message: "User retrieved successfully"
}

// Error response
{
  success: false,
  error: "User not found"
}
```

### Common Errors

| Error | Mô tả |
|-------|-------|
| `NOT_FOUND` | User không tồn tại theo ID |
| `NOT_FOUND_BY_EMAIL` | User không tồn tại theo email |
| `EMAIL_ALREADY_EXISTS` | Email đã tồn tại |
| `UNAUTHORIZED` | Không có quyền truy cập |
| `INVALID_INPUT` | Dữ liệu đầu vào không hợp lệ |
| `LOGIN_HISTORY_NOT_FOUND` | Lịch sử đăng nhập không tồn tại |

## Messages

### Success Messages

```typescript
const MKT_USER_MESSAGES = {
  SUCCESS: {
    RETRIEVED: 'User retrieved successfully',
    LIST_FETCHED: 'Users list fetched successfully',
    LIST_EMPTY: 'No users found',
    LOGIN_HISTORY_FETCHED: 'Login history retrieved successfully',
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
  },
};
```

### Log Messages

```typescript
// Fetch user
FETCH_USER_START(userId)     // "Fetching user with ID: {userId}"
FETCH_USER_SUCCESS(userId)   // "User fetched successfully: {userId}"
FETCH_USER_NOT_FOUND(userId) // "User not found: {userId}"

// Create user
CREATE_USER_START(email)           // "Creating user with email: {email}"
CREATE_USER_SUCCESS(userId)        // "User created successfully: {userId}"
CREATE_USER_FAILED(email, error)   // "Failed to create user: {email}, error: {error}"

// Update user
UPDATE_USER_START(userId)          // "Updating user: {userId}"
UPDATE_USER_SUCCESS(userId)        // "User updated successfully: {userId}"
UPDATE_USER_FAILED(userId, error)  // "Failed to update user: {userId}, error: {error}"
```

## Configuration

### Query Defaults

```typescript
const MKT_USER_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
};
```

### URL Builders

```typescript
const MKT_USER_URL_BUILDER = {
  getById: (userId: string) => `/api/oauth/users/${userId}`,
  getByEmail: (email: string) => `/api/oauth/users/by-email/${encodeURIComponent(email)}`,
  update: (userId: string) => `/api/oauth/users/${userId}`,
  loginHistoryByEmail: (email: string) =>
    `/api/oauth/users/by-email/${encodeURIComponent(email)}/login-history`,
};
```

## Ví dụ sử dụng

### Inject Service trong module khác

```typescript
import { MktUserProxyService } from 'src/mkt-core/mkt-user-integration/services';

@Injectable()
export class OrderService {
  constructor(private userService: MktUserProxyService) {}

  async validateOrderUser(userId: string) {
    // Sử dụng throwing variant - tự động throw nếu không tìm thấy
    const user = await this.userService.getUser(userId);

    if (user.status !== 'active') {
      throw new Error('User is not active');
    }

    return user;
  }

  async findUserByEmail(email: string) {
    // Sử dụng nullable variant - handle null manually
    const user = await this.userService.getUserByEmailOrNull(email);

    if (!user) {
      return null; // Hoặc xử lý theo logic riêng
    }

    return user;
  }

  async checkUserExists(userId: string): Promise<boolean> {
    return this.userService.userExists(userId);
  }
}
```

### GraphQL Query Examples

```graphql
# Lấy user theo ID
query GetUser {
  mktUser(userId: "user-uuid-here") {
    success
    data {
      id
      email
      fullName
      status
      authMethod
      lastLoginAt
      twoFactorEnabled
    }
    error
  }
}

# Lấy user theo email
query GetUserByEmail {
  mktUserByEmail(email: "user@example.com") {
    success
    data {
      id
      email
      fullName
      crmCustomerId
      crmSyncEnabled
    }
  }
}

# Lấy lịch sử đăng nhập
query GetLoginHistory {
  mktUserLoginHistory(email: "user@example.com") {
    success
    data {
      userId
      lastLoginAt
      lastLoginIp
      lockedUntil
    }
  }
}
```

### GraphQL Mutation Examples

```graphql
# Tạo user mới
mutation CreateUser {
  mktCreateUser(input: {
    email: "newuser@example.com"
    password: "SecurePassword123!"
    firstName: "John"
    lastName: "Doe"
    fullName: "John Doe"
    phone: "+84901234567"
    status: ACTIVE
  }) {
    success
    data {
      id
      email
      fullName
      status
    }
    message
    error
  }
}

# Cập nhật user
mutation UpdateUser {
  mktUpdateUser(
    userId: "user-uuid-here"
    input: {
      fullName: "John Updated Doe"
      phone: "+84909876543"
      status: ACTIVE
      preferences: { theme: "dark", language: "vi" }
    }
  ) {
    success
    data {
      id
      fullName
      phone
      preferences
    }
    message
  }
}
```

## Module Exports

```typescript
// Exported services có thể inject ở module khác
exports: [
  MktUserProxyService,  // Business logic service (recommended)
  MktUserRepository,    // Direct data access (nếu cần)
]
```

## Dependencies

**Internal:**
- `oauth2-client` - OAuth2 HTTP client và token management
- `common/messages` - Message builder utilities
- `utils/url-builder.util` - URL utilities
- `utils/error.util` - Error message extraction

**External:**
- `@nestjs/common` - NestJS framework
- `@nestjs/graphql` - GraphQL decorators

## Tại sao không sử dụng Cache?

Module này **không sử dụng caching** vì:

1. **Dữ liệu thay đổi thường xuyên:** Login time, IP, status có thể thay đổi bất kỳ lúc nào
2. **Real-time accuracy:** Cần độ chính xác cao cho các quyết định authorization
3. **Security concerns:** Cache có thể chứa dữ liệu outdated về quyền/status
4. **Login tracking:** Cần thông tin login mới nhất để detect suspicious activity
5. **CRM sync:** Đồng bộ với CRM cần dữ liệu real-time

So sánh với `mkt-product-integration` (có cache 24h):
- Products ít thay đổi
- Không có security implications
- Performance quan trọng hơn real-time accuracy
