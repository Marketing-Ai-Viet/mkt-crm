# API Documentation - Sub-Manager Resolver

> **Module**: `mkt-department`
> **File**: `sub-manager.resolver.ts`
> **Version**: 1.0.0
> **Last Updated**: 2026-01-27

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Base Configuration](#3-base-configuration)
4. [Data Types](#4-data-types)
5. [Queries](#5-queries)
6. [Mutations](#6-mutations)
7. [Error Handling](#7-error-handling)
8. [Usage Examples](#8-usage-examples)
9. [Best Practices](#9-best-practices)

---

## 1. Overview

Sub-Manager Resolver cung cấp các API GraphQL để quản lý phó quản lý phòng ban (Sub-Manager) trong hệ thống CRM. Mỗi Sub-Manager là một assignment giữa workspace member và department, cho phép một member có thể quản lý nhiều department và một department có thể có nhiều sub-managers.

### Tính năng chính
- **Query**: Lấy danh sách sub-managers theo department, theo member, hoặc theo ID
- **Create**: Tạo mới sub-manager assignment với validation trùng lặp
- **Update**: Cập nhật thông tin sub-manager (note, isPrimary, isActive)
- **Delete**: Xóa mềm (soft delete) sub-manager assignment
- **Set Primary**: Đặt sub-manager làm primary cho department
- **Activate/Deactivate**: Kích hoạt hoặc vô hiệu hóa sub-manager

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              WorkspaceAuthGuard + UserAuthGuard             │
│                   (Authentication Layer)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SubManagerResolver                       │
│         (GraphQL Resolver - Request/Response handling)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SubManagerService                        │
│              (Business Logic + Validation)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             MktDepartmentSubManagerRepository               │
│                    (Data Access Layer)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       PostgreSQL                            │
│              (mktDepartmentSubManager table)                │
└─────────────────────────────────────────────────────────────┘
```

### Relationship Diagram

```
┌──────────────────┐       ┌──────────────────────────┐       ┌──────────────────┐
│   mktDepartment  │       │  mktDepartmentSubManager │       │  workspaceMember │
├──────────────────┤       ├──────────────────────────┤       ├──────────────────┤
│ id               │◄──────│ departmentId             │       │ id               │
│ departmentCode   │       │ workspaceMemberId        │──────►│ name             │
│ departmentName   │       │ isPrimary                │       │ email            │
│ ...              │       │ isActive                 │       │ ...              │
└──────────────────┘       │ note                     │       └──────────────────┘
                           │ assignedAt               │
                           └──────────────────────────┘
```

---

## 2. Authentication

### Required Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Guards Applied
- `WorkspaceAuthGuard`: Xác thực workspace context
- `UserAuthGuard`: Xác thực user trong workspace

### Token Structure (JWT Payload)
```json
{
  "sub": "<user-id>",
  "userId": "<user-id>",
  "workspaceId": "<workspace-id>",
  "workspaceMemberId": "<workspace-member-id>",
  "type": "ACCESS",
  "authProvider": "password",
  "iat": 1769478084,
  "exp": 1777254084
}
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | `UNAUTHENTICATED` | No token provided |
| 401 | `UNAUTHENTICATED` | Invalid or expired token |
| 403 | `FORBIDDEN` | Workspace access denied |

---

## 3. Base Configuration

### Endpoint
```
POST /graphql
```

### Environment Variables
```env
# Server
SERVER_URL=http://localhost:3000

# GraphQL
GRAPHQL_PLAYGROUND_ENABLED=true
```

---

## 4. Data Types

### 4.1 SubManagerOutput (Response Type)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `String!` | No | Sub-manager assignment UUID |
| `departmentId` | `String!` | No | Department UUID |
| `workspaceMemberId` | `String!` | No | Workspace Member UUID |
| `isPrimary` | `Boolean` | Yes | Có phải là primary sub-manager không |
| `assignedAt` | `DateTime` | Yes | Thời điểm được assign |
| `note` | `String` | Yes | Ghi chú về assignment |
| `isActive` | `Boolean` | Yes | Trạng thái active |
| `createdAt` | `DateTime!` | No | Thời điểm tạo |
| `updatedAt` | `DateTime!` | No | Thời điểm cập nhật cuối |

### 4.2 SubManagerListResponse

| Field | Type | Description |
|-------|------|-------------|
| `items` | `[SubManagerOutput!]!` | Danh sách sub-managers |
| `totalCount` | `Int!` | Tổng số records |

### 4.3 CreateSubManagerInput

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `departmentId` | `String!` | **Yes** | - | Department UUID |
| `workspaceMemberId` | `String!` | **Yes** | - | Workspace Member UUID |
| `isPrimary` | `Boolean` | No | `false` | Đặt làm primary |
| `note` | `String` | No | - | Ghi chú |
| `isActive` | `Boolean` | No | `true` | Trạng thái active |

### 4.4 UpdateSubManagerInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `String!` | **Yes** | Sub-manager assignment ID |
| `isPrimary` | `Boolean` | No | Đặt làm primary |
| `note` | `String` | No | Ghi chú mới |
| `isActive` | `Boolean` | No | Trạng thái active |

### 4.5 SetPrimarySubManagerInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `departmentId` | `String!` | **Yes** | Department UUID |
| `subManagerId` | `String!` | **Yes** | Sub-manager ID để set primary |

---

## 5. Queries

### 5.1 getSubManagersByDepartment

Lấy tất cả sub-managers của một department.

**GraphQL Schema:**
```graphql
type Query {
  getSubManagersByDepartment(
    departmentId: String!
    activeOnly: Boolean = false
  ): SubManagerListResponse!
}
```

**Request:**
```graphql
query GetSubManagersByDepartment($departmentId: String!, $activeOnly: Boolean) {
  getSubManagersByDepartment(departmentId: $departmentId, activeOnly: $activeOnly) {
    items {
      id
      departmentId
      workspaceMemberId
      isPrimary
      note
      isActive
      assignedAt
      createdAt
      updatedAt
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
  "activeOnly": false
}
```

**Response:**
```json
{
  "data": {
    "getSubManagersByDepartment": {
      "items": [
        {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456002",
          "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
          "workspaceMemberId": "20202020-1553-45c6-a028-5a9064cce07f",
          "isPrimary": true,
          "note": "Phó trưởng phòng kinh doanh - phụ trách chiến lược",
          "isActive": true,
          "assignedAt": "2026-01-20T08:00:00.000Z",
          "createdAt": "2026-01-20T08:00:00.000Z",
          "updatedAt": "2026-01-25T10:30:00.000Z"
        },
        {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001",
          "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
          "workspaceMemberId": "20202020-0687-4c41-b707-ed1bfca972a7",
          "isPrimary": false,
          "note": "Phó trưởng phòng kinh doanh - phụ trách bán hàng trong nước",
          "isActive": true,
          "assignedAt": "2026-01-15T09:00:00.000Z",
          "createdAt": "2026-01-15T09:00:00.000Z",
          "updatedAt": "2026-01-20T14:00:00.000Z"
        }
      ],
      "totalCount": 2
    }
  }
}
```

---

### 5.2 getSubManagersByMember

Lấy tất cả department assignments của một workspace member.

**GraphQL Schema:**
```graphql
type Query {
  getSubManagersByMember(
    workspaceMemberId: String!
    activeOnly: Boolean = false
  ): SubManagerListResponse!
}
```

**Request:**
```graphql
query GetSubManagersByMember($workspaceMemberId: String!, $activeOnly: Boolean) {
  getSubManagersByMember(workspaceMemberId: $workspaceMemberId, activeOnly: $activeOnly) {
    items {
      id
      departmentId
      workspaceMemberId
      isPrimary
      note
      isActive
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "workspaceMemberId": "20202020-0687-4c41-b707-ed1bfca972a7",
  "activeOnly": true
}
```

**Response:**
```json
{
  "data": {
    "getSubManagersByMember": {
      "items": [
        {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001",
          "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
          "workspaceMemberId": "20202020-0687-4c41-b707-ed1bfca972a7",
          "isPrimary": false,
          "note": "Phó trưởng phòng kinh doanh",
          "isActive": true
        },
        {
          "id": "b2c3d4e5-f6a7-8901-bcde-f01234567002",
          "departmentId": "5ee8a0af-2aef-4eb4-865c-d4bc143ee97b",
          "workspaceMemberId": "20202020-0687-4c41-b707-ed1bfca972a7",
          "isPrimary": true,
          "note": "Trưởng nhóm kỹ thuật",
          "isActive": true
        }
      ],
      "totalCount": 2
    }
  }
}
```

---

### 5.3 getSubManager

Lấy thông tin chi tiết một sub-manager theo ID.

**GraphQL Schema:**
```graphql
type Query {
  getSubManager(id: String!): SubManagerOutput
}
```

**Request:**
```graphql
query GetSubManager($id: String!) {
  getSubManager(id: $id) {
    id
    departmentId
    workspaceMemberId
    isPrimary
    note
    isActive
    assignedAt
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001"
}
```

**Response (Success):**
```json
{
  "data": {
    "getSubManager": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001",
      "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
      "workspaceMemberId": "20202020-0687-4c41-b707-ed1bfca972a7",
      "isPrimary": false,
      "note": "Phó trưởng phòng kinh doanh",
      "isActive": true,
      "assignedAt": "2026-01-15T09:00:00.000Z",
      "createdAt": "2026-01-15T09:00:00.000Z",
      "updatedAt": "2026-01-20T14:00:00.000Z"
    }
  }
}
```

**Response (Not Found):**
```json
{
  "data": {
    "getSubManager": null
  }
}
```

---

### 5.4 getPrimarySubManager

Lấy primary sub-manager của một department.

**GraphQL Schema:**
```graphql
type Query {
  getPrimarySubManager(departmentId: String!): SubManagerOutput
}
```

**Request:**
```graphql
query GetPrimarySubManager($departmentId: String!) {
  getPrimarySubManager(departmentId: $departmentId) {
    id
    departmentId
    workspaceMemberId
    isPrimary
    note
    isActive
  }
}
```

**Variables:**
```json
{
  "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c"
}
```

**Response:**
```json
{
  "data": {
    "getPrimarySubManager": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456002",
      "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
      "workspaceMemberId": "20202020-1553-45c6-a028-5a9064cce07f",
      "isPrimary": true,
      "note": "Phó trưởng phòng kinh doanh - phụ trách chiến lược",
      "isActive": true
    }
  }
}
```

---

## 6. Mutations

### 6.1 createSubManager

Tạo mới sub-manager assignment.

**GraphQL Schema:**
```graphql
type Mutation {
  createSubManager(input: CreateSubManagerInput!): CreateSubManagerResponse!
}

type CreateSubManagerResponse {
  success: Boolean!
  subManager: SubManagerOutput
  error: String
}
```

**Request:**
```graphql
mutation CreateSubManager($input: CreateSubManagerInput!) {
  createSubManager(input: $input) {
    success
    subManager {
      id
      departmentId
      workspaceMemberId
      isPrimary
      note
      isActive
      assignedAt
      createdAt
    }
    error
  }
}
```

**Variables (Minimal):**
```json
{
  "input": {
    "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
    "workspaceMemberId": "81caea88-92a5-4e88-8a9a-614ec785d244"
  }
}
```

**Variables (Full):**
```json
{
  "input": {
    "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
    "workspaceMemberId": "81caea88-92a5-4e88-8a9a-614ec785d244",
    "isPrimary": false,
    "note": "Phó trưởng phòng - phụ trách marketing nội bộ",
    "isActive": true
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "createSubManager": {
      "success": true,
      "subManager": {
        "id": "generated-uuid-here",
        "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
        "workspaceMemberId": "81caea88-92a5-4e88-8a9a-614ec785d244",
        "isPrimary": false,
        "note": "Phó trưởng phòng - phụ trách marketing nội bộ",
        "isActive": true,
        "assignedAt": "2026-01-27T10:00:00.000Z",
        "createdAt": "2026-01-27T10:00:00.000Z"
      },
      "error": null
    }
  }
}
```

**Response (Duplicate Assignment):**
```json
{
  "data": {
    "createSubManager": {
      "success": false,
      "subManager": null,
      "error": "Sub-manager assignment already exists for this department and member"
    }
  }
}
```

---

### 6.2 updateSubManager

Cập nhật sub-manager assignment.

**GraphQL Schema:**
```graphql
type Mutation {
  updateSubManager(input: UpdateSubManagerInput!): UpdateSubManagerResponse!
}

type UpdateSubManagerResponse {
  success: Boolean!
  subManager: SubManagerOutput
  error: String
}
```

**Request:**
```graphql
mutation UpdateSubManager($input: UpdateSubManagerInput!) {
  updateSubManager(input: $input) {
    success
    subManager {
      id
      note
      isPrimary
      isActive
      updatedAt
    }
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001",
    "note": "Updated: Phó trưởng phòng kinh doanh - phụ trách chiến lược bán hàng",
    "isPrimary": false
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "updateSubManager": {
      "success": true,
      "subManager": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001",
        "note": "Updated: Phó trưởng phòng kinh doanh - phụ trách chiến lược bán hàng",
        "isPrimary": false,
        "isActive": true,
        "updatedAt": "2026-01-27T11:00:00.000Z"
      },
      "error": null
    }
  }
}
```

**Response (Not Found):**
```json
{
  "data": {
    "updateSubManager": {
      "success": false,
      "subManager": null,
      "error": "Sub-manager assignment not found: invalid-uuid"
    }
  }
}
```

---

### 6.3 deleteSubManager

Xóa mềm (soft delete) sub-manager assignment.

**GraphQL Schema:**
```graphql
type Mutation {
  deleteSubManager(id: String!): DeleteSubManagerResponse!
}

type DeleteSubManagerResponse {
  success: Boolean!
  deletedId: String
  error: String
}
```

**Request:**
```graphql
mutation DeleteSubManager($id: String!) {
  deleteSubManager(id: $id) {
    success
    deletedId
    error
  }
}
```

**Variables:**
```json
{
  "id": "sub-manager-uuid-to-delete"
}
```

**Response (Success):**
```json
{
  "data": {
    "deleteSubManager": {
      "success": true,
      "deletedId": "sub-manager-uuid-to-delete",
      "error": null
    }
  }
}
```

**Response (Not Found):**
```json
{
  "data": {
    "deleteSubManager": {
      "success": false,
      "deletedId": null,
      "error": "Sub-manager assignment not found: invalid-uuid"
    }
  }
}
```

---

### 6.4 setPrimarySubManager

Đặt sub-manager làm primary cho department. Sub-manager primary trước đó sẽ bị bỏ flag isPrimary.

**GraphQL Schema:**
```graphql
type Mutation {
  setPrimarySubManager(input: SetPrimarySubManagerInput!): SetPrimarySubManagerResponse!
}

type SetPrimarySubManagerResponse {
  success: Boolean!
  error: String
}
```

**Request:**
```graphql
mutation SetPrimarySubManager($input: SetPrimarySubManagerInput!) {
  setPrimarySubManager(input: $input) {
    success
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
    "subManagerId": "a1b2c3d4-e5f6-7890-abcd-ef0123456001"
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "setPrimarySubManager": {
      "success": true,
      "error": null
    }
  }
}
```

**Response (Mismatched Department):**
```json
{
  "data": {
    "setPrimarySubManager": {
      "success": false,
      "error": "Sub-manager does not belong to this department"
    }
  }
}
```

---

### 6.5 deactivateSubManager

Vô hiệu hóa sub-manager assignment (set isActive = false).

**GraphQL Schema:**
```graphql
type Mutation {
  deactivateSubManager(id: String!): UpdateSubManagerResponse!
}
```

**Request:**
```graphql
mutation DeactivateSubManager($id: String!) {
  deactivateSubManager(id: $id) {
    success
    subManager {
      id
      isActive
      updatedAt
    }
    error
  }
}
```

**Variables:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001"
}
```

**Response:**
```json
{
  "data": {
    "deactivateSubManager": {
      "success": true,
      "subManager": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001",
        "isActive": false,
        "updatedAt": "2026-01-27T12:00:00.000Z"
      },
      "error": null
    }
  }
}
```

---

### 6.6 activateSubManager

Kích hoạt lại sub-manager assignment (set isActive = true).

**GraphQL Schema:**
```graphql
type Mutation {
  activateSubManager(id: String!): UpdateSubManagerResponse!
}
```

**Request:**
```graphql
mutation ActivateSubManager($id: String!) {
  activateSubManager(id: $id) {
    success
    subManager {
      id
      isActive
      updatedAt
    }
    error
  }
}
```

**Variables:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001"
}
```

**Response:**
```json
{
  "data": {
    "activateSubManager": {
      "success": true,
      "subManager": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456001",
        "isActive": true,
        "updatedAt": "2026-01-27T13:00:00.000Z"
      },
      "error": null
    }
  }
}
```

---

## 7. Error Handling

### Error Response Structure

Tất cả mutations trả về response có cấu trúc nhất quán:

```typescript
{
  success: boolean;        // true nếu thành công
  subManager?: object;     // Dữ liệu sub-manager (nếu thành công)
  deletedId?: string;      // ID đã xóa (chỉ cho delete)
  error?: string;          // Thông báo lỗi (nếu thất bại)
}
```

### Error Types

| Error | Cause | Response |
|-------|-------|----------|
| `Sub-manager assignment not found` | ID không tồn tại hoặc đã bị xóa | `success: false` |
| `Sub-manager assignment already exists for this department and member` | Trùng assignment | `success: false` |
| `Sub-manager does not belong to this department` | Department ID không khớp | `success: false` |
| `UNAUTHENTICATED` | Token không hợp lệ | GraphQL error |
| `FORBIDDEN` | Không có quyền truy cập workspace | GraphQL error |

### Notes
- **Soft Delete**: Khi xóa, record vẫn tồn tại với `deletedAt` được set
- **Unique Constraint**: Mỗi workspace member chỉ có thể được assign vào một department một lần
- **Primary Logic**: Mỗi department chỉ có tối đa một primary sub-manager

---

## 8. Usage Examples

### 8.1 cURL Examples

**Query - Get by Department:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "query { getSubManagersByDepartment(departmentId: \"ad95f81e-bda5-4a98-b72a-880c0b5c204c\") { items { id workspaceMemberId isPrimary note } totalCount } }"
  }'
```

**Mutation - Create:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { createSubManager(input: { departmentId: \"ad95f81e-bda5-4a98-b72a-880c0b5c204c\", workspaceMemberId: \"81caea88-92a5-4e88-8a9a-614ec785d244\", note: \"Phó phòng\" }) { success subManager { id } error } }"
  }'
```

**Mutation - Set Primary:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { setPrimarySubManager(input: { departmentId: \"ad95f81e-bda5-4a98-b72a-880c0b5c204c\", subManagerId: \"a1b2c3d4-e5f6-7890-abcd-ef0123456001\" }) { success error } }"
  }'
```

**Mutation - Delete:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { deleteSubManager(id: \"sub-manager-uuid\") { success deletedId error } }"
  }'
```

### 8.2 JavaScript/TypeScript Examples

```typescript
// Using fetch
async function createSubManager(
  token: string,
  departmentId: string,
  workspaceMemberId: string,
  options?: { isPrimary?: boolean; note?: string }
) {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `
        mutation CreateSubManager($input: CreateSubManagerInput!) {
          createSubManager(input: $input) {
            success
            subManager { id departmentId workspaceMemberId isPrimary note }
            error
          }
        }
      `,
      variables: {
        input: {
          departmentId,
          workspaceMemberId,
          ...options
        }
      },
    }),
  });

  return response.json();
}

// Usage
const result = await createSubManager(
  accessToken,
  'ad95f81e-bda5-4a98-b72a-880c0b5c204c',
  '81caea88-92a5-4e88-8a9a-614ec785d244',
  { isPrimary: false, note: 'Phó phòng kinh doanh' }
);

if (result.data.createSubManager.success) {
  console.log('Created:', result.data.createSubManager.subManager);
} else {
  console.error('Error:', result.data.createSubManager.error);
}
```

### 8.3 Apollo Client Example

```typescript
import { gql, useMutation, useQuery } from '@apollo/client';

// Queries
const GET_SUB_MANAGERS = gql`
  query GetSubManagersByDepartment($departmentId: String!, $activeOnly: Boolean) {
    getSubManagersByDepartment(departmentId: $departmentId, activeOnly: $activeOnly) {
      items {
        id
        departmentId
        workspaceMemberId
        isPrimary
        note
        isActive
      }
      totalCount
    }
  }
`;

// Mutations
const CREATE_SUB_MANAGER = gql`
  mutation CreateSubManager($input: CreateSubManagerInput!) {
    createSubManager(input: $input) {
      success
      subManager {
        id
        departmentId
        workspaceMemberId
        isPrimary
        note
      }
      error
    }
  }
`;

const SET_PRIMARY = gql`
  mutation SetPrimarySubManager($input: SetPrimarySubManagerInput!) {
    setPrimarySubManager(input: $input) {
      success
      error
    }
  }
`;

// React Component
function SubManagerList({ departmentId }: { departmentId: string }) {
  const { data, loading, refetch } = useQuery(GET_SUB_MANAGERS, {
    variables: { departmentId, activeOnly: true },
  });

  const [createSubManager] = useMutation(CREATE_SUB_MANAGER);
  const [setPrimary] = useMutation(SET_PRIMARY);

  const handleAddSubManager = async (workspaceMemberId: string, note: string) => {
    const { data } = await createSubManager({
      variables: {
        input: { departmentId, workspaceMemberId, note },
      },
    });

    if (data.createSubManager.success) {
      refetch();
    } else {
      alert(data.createSubManager.error);
    }
  };

  const handleSetPrimary = async (subManagerId: string) => {
    const { data } = await setPrimary({
      variables: {
        input: { departmentId, subManagerId },
      },
    });

    if (data.setPrimarySubManager.success) {
      refetch();
    } else {
      alert(data.setPrimarySubManager.error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {data.getSubManagersByDepartment.items.map((sm) => (
        <li key={sm.id}>
          {sm.workspaceMemberId} - {sm.note}
          {sm.isPrimary && ' (Primary)'}
          {!sm.isPrimary && (
            <button onClick={() => handleSetPrimary(sm.id)}>
              Set Primary
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

---

## 9. Best Practices

### 9.1 Assignment Guidelines

- Mỗi member chỉ nên được assign vào một department một lần
- Sử dụng `activeOnly: true` khi query để lọc các assignment không còn active
- Luôn kiểm tra kết quả trả về trước khi hiển thị UI

### 9.2 Primary Sub-Manager

```typescript
// Workflow để set primary mới
// 1. Kiểm tra sub-manager có thuộc department không
// 2. Nếu có primary cũ, hệ thống tự động bỏ flag isPrimary
// 3. Set primary mới

const result = await setPrimary({
  variables: {
    input: {
      departmentId: 'dept-uuid',
      subManagerId: 'new-primary-uuid'
    }
  }
});
```

### 9.3 Activate/Deactivate Pattern

```typescript
// Deactivate thay vì delete khi cần giữ lịch sử
const deactivate = async (id: string) => {
  const result = await deactivateSubManager({ variables: { id } });
  if (result.data.deactivateSubManager.success) {
    // Refresh list
  }
};

// Activate lại khi cần
const activate = async (id: string) => {
  const result = await activateSubManager({ variables: { id } });
  if (result.data.activateSubManager.success) {
    // Refresh list
  }
};
```

### 9.4 Error Handling Best Practice

```typescript
const result = await createSubManager({ variables: { input } });

if (!result.data.createSubManager.success) {
  const error = result.data.createSubManager.error;

  if (error.includes('already exists')) {
    // Handle duplicate assignment
    showError('Thành viên này đã được phân công vào phòng ban');
  } else if (error.includes('not found')) {
    // Handle not found
    showError('Không tìm thấy dữ liệu');
  } else {
    // Handle other errors
    showError(error);
  }
  return;
}

// Process success case
const subManager = result.data.createSubManager.subManager;
```

### 9.5 Query Optimization

```typescript
// Sử dụng activeOnly khi chỉ cần active sub-managers
const { data } = useQuery(GET_SUB_MANAGERS, {
  variables: {
    departmentId,
    activeOnly: true  // Chỉ lấy active sub-managers
  },
});

// Lấy tất cả (kể cả inactive) khi cần quản lý
const { data: allData } = useQuery(GET_SUB_MANAGERS, {
  variables: {
    departmentId,
    activeOnly: false  // Lấy tất cả
  },
});
```

---

## Related Documentation

- [Test Cases](./sub-manager.resolver.test-cases.md)
- [Test Report](./sub-manager.resolver.test-report.md)
- [Department CRUD API](./department-crud.resolver.api-docs.md)
- [Department Tree Resolver](./department-tree.resolver.ts)

---

**Document Version**: 1.0.0
**Author**: Claude Code
**Last Updated**: 2026-01-27
