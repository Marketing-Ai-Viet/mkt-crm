# User Management API - Frontend Developer Guide

## Overview

API GraphQL để quản lý users (workspace members) trong hệ thống CRM.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## API Categories

### Self-Service APIs (Recommended for end users)
- `getMyProfile` - Lấy profile của user đang đăng nhập
- `updateMyProfile` - Cập nhật profile của user đang đăng nhập

### Admin APIs (Requires elevated permissions)
- `getPersonUser` - Lấy thông tin user bất kỳ
- `updatePersonUser` - Cập nhật thông tin user bất kỳ
- `createPersonUser` - Tạo user mới
- `deletePersonUser` - Xóa user
- `searchPersonUsers` - Tìm kiếm users

---

## Queries

### 1. getMyProfile ⭐ (Recommended)

Lấy thông tin profile của user đang đăng nhập. **Không cần truyền memberId** - tự động lấy từ token.

**Query:**
```graphql
query GetMyProfile {
  getMyProfile {
    id
    email
    firstName
    lastName
    avatarUrl
    memberCode
    memberType
    status
    grade
    address
    language
    startDate
    endDate
    department {
      id
      departmentCode
      departmentName
      departmentNameEn
    }
    permissionTemplate {
      id
      templateKey
      templateName
      templateNameEn
    }
    organizationLevel {
      id
      levelCode
      levelName
      levelNameEn
      hierarchyLevel
    }
    employmentStatus {
      id
      statusCode
      statusName
      statusNameEn
    }
    createdAt
    updatedAt
  }
}
```

**Response Success:**
```json
{
  "data": {
    "getMyProfile": {
      "id": "20202020-0687-4c41-b707-ed1bfca972a7",
      "email": "tim@apple.dev",
      "firstName": "Tim",
      "lastName": "Apple",
      "avatarUrl": null,
      "memberCode": "EMP-001",
      "memberType": "FULL_TIME",
      "status": "ACTIVE",
      "language": "en",
      "startDate": "2024-01-01T00:00:00.000Z",
      "department": {
        "id": "...",
        "departmentCode": "TECH",
        "departmentName": "Technology",
        "departmentNameEn": "Technology"
      },
      "permissionTemplate": {
        "id": "...",
        "templateKey": "MANAGER",
        "templateName": "Quản lý",
        "templateNameEn": "Manager"
      },
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-15T08:30:00.000Z"
    }
  }
}
```

**Response null (user not found):**
```json
{
  "data": {
    "getMyProfile": null
  }
}
```

---

### 2. getPersonUser (Admin)

Lấy thông tin chi tiết một user theo ID. **Yêu cầu quyền admin.**

**Query:**
```graphql
query GetPersonUser($memberId: String!) {
  getPersonUser(memberId: $memberId) {
    id
    email
    firstName
    lastName
    avatarUrl
    memberCode
    memberType
    status
    department {
      id
      departmentCode
      departmentName
    }
    permissionTemplate {
      id
      templateKey
      templateName
    }
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "memberId": "20202020-0687-4c41-b707-ed1bfca972a7"
}
```

**Response Success:**
```json
{
  "data": {
    "getPersonUser": {
      "id": "20202020-0687-4c41-b707-ed1bfca972a7",
      "email": "tim@apple.dev",
      "firstName": "Tim",
      "lastName": "Apple",
      "memberCode": "EMP-001",
      "status": "ACTIVE"
    }
  }
}
```

---

### 3. searchPersonUsers

Tìm kiếm users với nhiều tiêu chí và pagination.

**Query:**
```graphql
query SearchPersonUsers($input: SearchUserInput!) {
  searchPersonUsers(input: $input) {
    items {
      id
      email
      firstName
      lastName
      memberCode
      memberType
      status
      department {
        id
        departmentCode
        departmentName
      }
      organizationLevel {
        id
        levelCode
        levelName
        hierarchyLevel
      }
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPreviousPage
  }
}
```

**Variables:**
```json
{
  "input": {
    "keyword": "tim",
    "departmentId": "dept-uuid",
    "status": "ACTIVE",
    "page": 1,
    "limit": 20
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `keyword` | String | No | - | Tìm theo tên, email |
| `email` | String | No | - | Lọc theo email |
| `memberCode` | String | No | - | Lọc theo mã nhân viên |
| `status` | String | No | - | Lọc theo trạng thái |
| `memberType` | String | No | - | Lọc theo loại nhân viên |
| `departmentId` | String (UUID) | No | - | Lọc theo phòng ban |
| `organizationLevelId` | String (UUID) | No | - | Lọc theo cấp bậc |
| `employmentStatusId` | String (UUID) | No | - | Lọc theo tình trạng làm việc |
| `page` | Int | No | `1` | Trang hiện tại (min: 1) |
| `limit` | Int | No | `20` | Số lượng mỗi trang (max: 100) |

**Response Success:**
```json
{
  "data": {
    "searchPersonUsers": {
      "items": [
        {
          "id": "...",
          "email": "tim@apple.dev",
          "firstName": "Tim",
          "lastName": "Apple",
          "memberCode": "EMP-001",
          "status": "ACTIVE"
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

## Mutations

### 1. updateMyProfile ⭐ (Recommended)

Cập nhật profile của user đang đăng nhập. **Không cần truyền memberId** - tự động lấy từ token.

**Bảo mật:** User chỉ có thể cập nhật profile của chính mình, không thể cập nhật user khác.

**Mutation:**
```graphql
mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
  updateMyProfile(input: $input) {
    id
    email
    firstName
    lastName
    avatarUrl
    address
    locale
    timeZone
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "email": "new.email@apple.dev",
    "firstName": "Timothy",
    "lastName": "Cook",
    "avatarUrl": "https://example.com/avatar.jpg",
    "address": "123 Apple Park Way",
    "locale": "en",
    "timeZone": "America/Los_Angeles",
    "calendarStartDay": 1
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | String | No | Email mới (phải unique, tự động lowercase) |
| `firstName` | String | No | Tên |
| `lastName` | String | No | Họ |
| `avatarUrl` | String (URL) | No | URL avatar |
| `address` | String | No | Địa chỉ |
| `locale` | String | No | Ngôn ngữ (vi, en, ko) |
| `timeZone` | String | No | Múi giờ |
| `calendarStartDay` | Int | No | Ngày bắt đầu tuần (0-6) |

**⚠️ Lưu ý:** UpdateMyProfileInput **KHÔNG** cho phép cập nhật:
- `departmentId` - Phòng ban
- `permissionTemplateId` - Quyền hạn
- `organizationLevelId` - Cấp bậc
- `employmentStatusId` - Tình trạng làm việc
- `status`, `memberType`, `grade` - Thông tin nhân sự

**Response Success:**
```json
{
  "data": {
    "updateMyProfile": {
      "id": "20202020-0687-4c41-b707-ed1bfca972a7",
      "email": "new.email@apple.dev",
      "firstName": "Timothy",
      "lastName": "Cook",
      "updatedAt": "2026-02-03T08:00:00.000Z"
    }
  }
}
```

**Error - Email đã tồn tại:**
```json
{
  "errors": [{
    "message": "Cannot update: this email is already used by another account",
    "extensions": {
      "code": "CONFLICT"
    }
  }],
  "data": null
}
```

**Error - Email không hợp lệ:**
```json
{
  "errors": [{
    "message": "email must be an email",
    "extensions": {
      "code": "BAD_USER_INPUT"
    }
  }],
  "data": null
}
```

---

### 2. updatePersonUser (Admin)

Cập nhật thông tin user (workspace member). **Yêu cầu quyền admin.**

**Mutation:**
```graphql
mutation UpdatePersonUser($input: UpdateUserInput!) {
  updatePersonUser(input: $input) {
    id
    email
    firstName
    lastName
    status
    memberType
    department {
      id
      departmentName
    }
    permissionTemplate {
      id
      templateName
    }
    updatedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "memberId": "20202020-0687-4c41-b707-ed1bfca972a7",
    "email": "new.email@apple.dev",
    "firstName": "Timothy",
    "lastName": "Cook",
    "departmentId": "dept-uuid",
    "permissionTemplateId": "template-uuid",
    "status": "ACTIVE",
    "memberType": "FULL_TIME"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `memberId` | String (UUID) | **Yes** | ID của workspace member |
| `email` | String | No | Email mới (phải unique) |
| `firstName` | String | No | Tên |
| `lastName` | String | No | Họ |
| `startDate` | Date | No | Ngày bắt đầu |
| `endDate` | Date | No | Ngày kết thúc |
| `avatarUrl` | String (URL) | No | URL avatar |
| `status` | String | No | Trạng thái |
| `memberType` | String | No | Loại nhân viên |
| `grade` | String | No | Cấp bậc |
| `address` | String | No | Địa chỉ |
| `departmentId` | String (UUID) | No | ID phòng ban |
| `permissionTemplateId` | String (UUID) | No | ID permission template |
| `organizationLevelId` | String (UUID) | No | ID cấp tổ chức |
| `employmentStatusId` | String (UUID) | No | ID tình trạng làm việc |
| `locale` | String | No | Ngôn ngữ |
| `timeZone` | String | No | Múi giờ |
| `position` | Int | No | Vị trí |
| `calendarStartDay` | Int | No | Ngày bắt đầu tuần |

---

### 3. createPersonUser (Admin)

Tạo user mới trong workspace.

**Mutation:**
```graphql
mutation CreatePersonUser($input: CreateUserInput!) {
  createPersonUser(input: $input) {
    id
    email
    firstName
    lastName
    memberCode
    status
    department {
      id
      departmentName
    }
    permissionTemplate {
      id
      templateName
    }
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "email": "newuser@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "startDate": "2026-02-01",
    "departmentId": "dept-uuid",
    "permissionTemplateId": "template-uuid",
    "status": "ACTIVE",
    "memberType": "FULL_TIME",
    "position": 1
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `email` | String | **Yes** | - | Email (tự động lowercase) |
| `firstName` | String | No | - | Tên |
| `lastName` | String | No | - | Họ |
| `startDate` | Date | **Yes** | - | Ngày bắt đầu |
| `endDate` | Date | No | - | Ngày kết thúc |
| `departmentId` | String (UUID) | **Yes** | - | ID phòng ban |
| `permissionTemplateId` | String (UUID) | **Yes** | - | ID permission template |
| `position` | Int | No | `0` | Vị trí |
| `jobTitle` | String | No | - | Chức danh |
| `city` | String | No | - | Thành phố |
| `phone` | String | No | - | Số điện thoại |
| `avatarUrl` | String (URL) | No | `null` | URL avatar |
| `calendarStartDay` | Int | No | `7` | Ngày bắt đầu tuần |
| `status` | String | No | - | Trạng thái |
| `memberType` | String | No | - | Loại nhân viên |
| `employmentStatusId` | String (UUID) | No | - | ID tình trạng làm việc |
| `organizationLevelId` | String (UUID) | No | - | ID cấp tổ chức |

**Response Success:**
```json
{
  "data": {
    "createPersonUser": {
      "id": "new-user-uuid",
      "email": "newuser@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "memberCode": "EMP-002",
      "status": "ACTIVE",
      "createdAt": "2026-02-03T08:00:00.000Z"
    }
  }
}
```

**Error - Email đã tồn tại:**
```json
{
  "errors": [{
    "message": "An account already exists with this email",
    "extensions": {
      "code": "CONFLICT"
    }
  }],
  "data": null
}
```

---

### 4. deletePersonUser (Admin)

Xóa user (soft delete workspace member).

**Mutation:**
```graphql
mutation DeletePersonUser($memberId: String!) {
  deletePersonUser(memberId: $memberId)
}
```

**Variables:**
```json
{
  "memberId": "20202020-0687-4c41-b707-ed1bfca972a7"
}
```

**Response Success:**
```json
{
  "data": {
    "deletePersonUser": true
  }
}
```

**Error - User không tồn tại:**
```json
{
  "errors": [{
    "message": "Workspace member not found: 20202020-0687-4c41-b707-ed1bfca972a7",
    "extensions": {
      "code": "NOT_FOUND"
    }
  }],
  "data": null
}
```

---

## Types

### UserOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | User ID (UUID) |
| `email` | String | No | Email |
| `firstName` | String | Yes | Tên |
| `lastName` | String | Yes | Họ |
| `startDate` | Date | No | Ngày bắt đầu |
| `endDate` | Date | Yes | Ngày kết thúc |
| `language` | String | No | Ngôn ngữ |
| `avatarUrl` | String | Yes | URL avatar |
| `jobTitle` | String | Yes | Chức danh |
| `city` | String | Yes | Thành phố |
| `phone` | String | Yes | Số điện thoại |
| `memberCode` | String | Yes | Mã nhân viên |
| `memberType` | String | Yes | Loại nhân viên |
| `status` | String | Yes | Trạng thái |
| `grade` | String | Yes | Cấp bậc |
| `address` | String | Yes | Địa chỉ |
| `department` | DepartmentBasicOutput | Yes | Thông tin phòng ban |
| `permissionTemplate` | PermissionTemplateBasicOutput | Yes | Thông tin quyền hạn |
| `employmentStatus` | EmploymentStatusBasicOutput | Yes | Tình trạng làm việc |
| `organizationLevel` | OrganizationLevelBasicOutput | Yes | Cấp tổ chức |
| `createdAt` | Date | No | Ngày tạo |
| `updatedAt` | Date | No | Ngày cập nhật |

### DepartmentBasicOutput

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Department ID |
| `departmentCode` | String | Mã phòng ban |
| `departmentName` | String | Tên phòng ban |
| `departmentNameEn` | String | Tên tiếng Anh |

### PermissionTemplateBasicOutput

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Template ID |
| `templateKey` | String | Mã template |
| `templateName` | String | Tên template |
| `templateNameEn` | String | Tên tiếng Anh |

### OrganizationLevelBasicOutput

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Level ID |
| `levelCode` | String | Mã cấp bậc |
| `levelName` | String | Tên cấp bậc |
| `levelNameEn` | String | Tên tiếng Anh |
| `hierarchyLevel` | Int | Thứ bậc trong tổ chức |

### EmploymentStatusBasicOutput

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Status ID |
| `statusCode` | String | Mã trạng thái |
| `statusName` | String | Tên trạng thái |
| `statusNameEn` | String | Tên tiếng Anh |

### UserListOutput

| Field | Type | Description |
|-------|------|-------------|
| `items` | [UserOutput] | Danh sách users |
| `total` | Int | Tổng số users |
| `page` | Int | Trang hiện tại |
| `limit` | Int | Số lượng mỗi trang |
| `totalPages` | Int | Tổng số trang |
| `hasNextPage` | Boolean | Có trang tiếp theo |
| `hasPreviousPage` | Boolean | Có trang trước |

---

## Security Notes

### Token-Based Authentication

| API | Authentication Method | Security Level |
|-----|----------------------|----------------|
| `getMyProfile` | Token memberId | ✅ **Safe** - User chỉ xem được profile của mình |
| `updateMyProfile` | Token memberId | ✅ **Safe** - User chỉ update được profile của mình |
| `getPersonUser` | Explicit memberId | ⚠️ Admin - Cần kiểm tra quyền |
| `updatePersonUser` | Explicit memberId | ⚠️ Admin - Cần kiểm tra quyền |
| `createPersonUser` | - | ⚠️ Admin - Cần kiểm tra quyền |
| `deletePersonUser` | Explicit memberId | ⚠️ Admin - Cần kiểm tra quyền |
| `searchPersonUsers` | - | ⚠️ Admin - Cần kiểm tra quyền |

### Email Uniqueness

- Email được validate unique trong toàn hệ thống
- Khi update email, hệ thống tự động:
  1. Normalize về lowercase và trim spaces
  2. Kiểm tra format email hợp lệ
  3. Kiểm tra không trùng với user khác
  4. Cập nhật cả core User table và workspace member

---

## Error Handling

### Common Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| `CONFLICT` | An account already exists with this email | Email đã tồn tại (create) |
| `CONFLICT` | Cannot update: this email is already used by another account | Email đã tồn tại (update) |
| `NOT_FOUND` | Workspace member not found: xxx | User không tồn tại |
| `NOT_FOUND` | Department with ID xxx not found | Phòng ban không tồn tại |
| `NOT_FOUND` | Permission template with ID xxx not found | Template không tồn tại |
| `BAD_USER_INPUT` | email must be an email | Email không hợp lệ |
| `UNAUTHENTICATED` | You must be authenticated to perform this action | Chưa đăng nhập |

---

## Best Practices

### 1. Sử dụng Self-Service APIs cho end users

```graphql
# ✅ Recommended - An toàn, không cần truyền memberId
query { getMyProfile { ... } }
mutation { updateMyProfile(input: {...}) { ... } }

# ⚠️ Admin only - Cần kiểm tra quyền
query { getPersonUser(memberId: "...") { ... } }
mutation { updatePersonUser(input: { memberId: "..." }) { ... } }
```

### 2. Handle email update errors

```typescript
const result = await updateMyProfile({
  variables: { input: { email: newEmail } }
});

if (result.errors) {
  const error = result.errors[0];
  if (error.extensions?.code === 'CONFLICT') {
    // Email đã tồn tại
    showError('Email này đã được sử dụng');
  } else if (error.extensions?.code === 'BAD_USER_INPUT') {
    // Email không hợp lệ
    showError('Email không hợp lệ');
  }
}
```

### 3. Pagination với searchPersonUsers

```graphql
query SearchUsers($page: Int!, $limit: Int!) {
  searchPersonUsers(input: { page: $page, limit: $limit }) {
    items { ... }
    total
    hasNextPage
    hasPreviousPage
  }
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-03 | Initial release |
| 1.1.0 | 2026-02-03 | Add `getMyProfile` and `updateMyProfile` with token-based auth |
| 1.2.0 | 2026-02-03 | Add `email` field to UpdateUserInput with unique check |
