# API Documentation - Department Mutation Resolver

> **Module**: `mkt-department`
> **File**: `department-mutation.resolver.ts`
> **Version**: 1.2.0
> **Last Updated**: 2026-01-27

### Changes v1.2.0
- Thêm `DEPARTMENT_TYPE` enum (`DEPARTMENT`, `TEAM`) cho `departmentType` field
- Cập nhật TypeScript interfaces với generic types (no `any`)

### Changes v1.1.0
- `CreateDepartmentHierarchyInput`: `parentDepartmentId` và `childDepartmentId` giờ đều **optional**
- Thêm `deleteDepartmentHierarchy` mutation với soft delete (đánh dấu `deletedAt`)
- Thêm `DeleteDepartmentHierarchyResponse` output type

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Base Configuration](#3-base-configuration)
4. [Data Types](#4-data-types)
5. [Mutations](#5-mutations)
6. [Error Handling](#6-error-handling)
7. [Usage Examples](#7-usage-examples)
8. [Best Practices](#8-best-practices)

---

## 1. Overview

Department Mutation Resolver cung cấp các API GraphQL để quản lý **hierarchy (cấu trúc phân cấp)** của phòng ban trong hệ thống CRM. Resolver này thay thế các post-query hooks cho department hierarchy operations.

### Tính năng chính
- **Create Hierarchy**: Tạo quan hệ parent-child giữa các department (parent/child đều optional)
- **Update Hierarchy**: Cập nhật quan hệ hierarchy (thay đổi parent, permissions, etc.)
- **Delete Hierarchy**: Xóa mềm hierarchy (soft delete với deletedAt timestamp)

### Khi nào sử dụng?

| Scenario | Sử dụng |
|----------|---------|
| Tạo department mới | Dùng `createDepartment` (department-crud.resolver) |
| Thiết lập parent cho TEAM | Dùng `createDepartmentHierarchy` (resolver này) |
| Thay đổi parent của department | Dùng `updateDepartmentHierarchy` (resolver này) |
| Cập nhật thông tin department | Dùng `updateDepartment` (department-crud.resolver) |
| Hủy quan hệ parent-child | Dùng `deleteDepartmentHierarchy` (resolver này) |

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
│               DepartmentMutationResolver                    │
│         (GraphQL Resolver - Hierarchy Operations)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              MktDepartmentHierarchyService                  │
│          (Business Logic + Validation + Tree Ops)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             MktDepartmentHierarchyRepository                │
│                    (Data Access Layer)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       PostgreSQL                            │
│              (mktDepartmentHierarchy table)                 │
└─────────────────────────────────────────────────────────────┘
```

### Relationship Diagram

```
┌──────────────────────────┐
│      mktDepartment       │
│       (DEPARTMENT)       │
│ ┌──────────────────────┐ │
│ │ id: SALES            │ │
│ │ departmentName: ...  │ │
│ │ departmentType: DEPARTMENT │ │
│ └──────────────────────┘ │
└────────────┬─────────────┘
             │ parentDepartmentId
             ▼
┌─────────────────────────────────────────┐
│       mktDepartmentHierarchy            │
│ ┌─────────────────────────────────────┐ │
│ │ parentDepartmentId: SALES           │ │
│ │ childDepartmentId: SALES_DOMESTIC   │ │
│ │ relationshipType: PARENT_CHILD      │ │
│ │ hierarchyLevel: 2                   │ │
│ │ inheritsPermissions: true           │ │
│ └─────────────────────────────────────┘ │
└────────────┬────────────────────────────┘
             │ childDepartmentId
             ▼
┌──────────────────────────┐
│      mktDepartment       │
│         (TEAM)           │
│ ┌──────────────────────┐ │
│ │ id: SALES_DOMESTIC   │ │
│ │ departmentName: ...  │ │
│ │ departmentType: TEAM │ │
│ └──────────────────────┘ │
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

### 4.1 CreateDepartmentHierarchyInput

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `parentDepartmentId` | `String` | No | - | ID của department cha (optional nếu là root) |
| `childDepartmentId` | `String` | No | - | ID của department con (optional nếu chỉ set parent) |
| `name` | `String` | No | - | Tên mối quan hệ |
| `relationshipType` | `String` | No | - | Loại quan hệ: `PARENT_CHILD`, `FUNCTIONAL`, etc. (xem [4.7](#47-relationship-types-enum)) |
| `hierarchyLevel` | `Int` | No | - | Cấp độ trong hierarchy (1, 2, 3...) |
| `inheritsPermissions` | `Boolean` | No | `true` | Kế thừa quyền từ parent |
| `canEscalateToParent` | `Boolean` | No | `false` | Cho phép escalate lên parent |
| `allowsCrossBranchAccess` | `Boolean` | No | `false` | Cho phép truy cập cross-branch |
| `displayOrder` | `Int` | No | `0` | Thứ tự hiển thị trong cùng level |
| `notes` | `String` | No | - | Ghi chú về relationship |
| `isActive` | `Boolean` | No | `true` | Trạng thái active |

> **Note v1.1**: `parentDepartmentId` và `childDepartmentId` giờ đều optional, cho phép tạo hierarchy linh hoạt (root department, partial relationship, etc.)

### 4.2 UpdateDepartmentHierarchyInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `childDepartmentId` | `String!` | **Yes** | ID của department cần cập nhật |
| `parentDepartmentId` | `String` | No | ID của department cha mới |
| `name` | `String` | No | Tên mối quan hệ mới |
| `relationshipType` | `String` | No | Loại quan hệ mới |
| `hierarchyLevel` | `Int` | No | Cấp độ mới |
| `inheritsPermissions` | `Boolean` | No | Kế thừa quyền |
| `canEscalateToParent` | `Boolean` | No | Cho phép escalate |
| `allowsCrossBranchAccess` | `Boolean` | No | Cho phép cross-branch |
| `displayOrder` | `Int` | No | Thứ tự hiển thị |
| `notes` | `String` | No | Ghi chú |
| `isActive` | `Boolean` | No | Trạng thái |

### 4.3 CreateDepartmentHierarchyResponse

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | `Boolean!` | No | Thành công hay không |
| `departmentId` | `String` | Yes | ID của department con |
| `hierarchyId` | `String` | Yes | ID của hierarchy record được tạo |
| `error` | `String` | Yes | Thông báo lỗi nếu có |

### 4.4 UpdateDepartmentHierarchyResponse

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | `Boolean!` | No | Thành công hay không |
| `departmentId` | `String` | Yes | ID của department được cập nhật |
| `hierarchyId` | `String` | Yes | ID của hierarchy record |
| `error` | `String` | Yes | Thông báo lỗi nếu có |

### 4.5 DeleteDepartmentHierarchyResponse

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | `Boolean!` | No | Thành công hay không |
| `deletedHierarchyId` | `String` | Yes | ID của hierarchy đã xóa |
| `error` | `String` | Yes | Thông báo lỗi nếu có |

### 4.6 Department Type (Enum)

> **GraphQL Enum Name**: `DepartmentTypeEnum`

| Type | Description |
|------|-------------|
| `DEPARTMENT` | Phòng ban cấp cao (Level 1) |
| `TEAM` | Đội/nhóm thuộc phòng ban (Level 2+) |

**TypeScript:**
```typescript
import { DEPARTMENT_TYPE } from 'src/mkt-core/mkt-department/constants';

// DEPARTMENT_TYPE.DEPARTMENT = 'DEPARTMENT'
// DEPARTMENT_TYPE.TEAM = 'TEAM'
```

### 4.7 Relationship Types (Enum)

> **Important**: Giá trị `relationshipType` phải là một trong các enum sau (case-sensitive):

| Type | Description | Use Case |
|------|-------------|----------|
| `PARENT_CHILD` | Quan hệ cha-con trực tiếp | SALES → SALES_DOMESTIC |
| `FUNCTIONAL` | Quan hệ chức năng | Team thuộc phòng ban theo chức năng |
| `SUPERVISORY` | Quan hệ giám sát | Manager giám sát team |
| `DOTTED_LINE` | Quan hệ gián tiếp (đường chấm) | Cross-functional reporting |
| `MATRIX` | Quan hệ ma trận | Report to multiple managers |
| `ADVISORY` | Quan hệ tư vấn | Advisory role |
| `PEER` | Quan hệ ngang hàng | 2 teams cùng cấp |
| `CROSS_FUNCTIONAL` | Quan hệ liên chức năng | Cross-department collaboration |
| `TEMPORARY` | Quan hệ tạm thời | Project-based assignment |
| `VIRTUAL` | Quan hệ ảo | Virtual team structure |

**Lưu ý**: Sử dụng giá trị không hợp lệ sẽ trả về lỗi:
```
"invalid input value for enum mktDepartmentHierarchy_relationshipType_enum"
```

---

## 5. Mutations

### 5.1 createDepartmentHierarchy

Tạo hierarchy relationship cho department. Thường dùng sau khi tạo department type TEAM qua `createDepartment`.

**GraphQL Schema:**
```graphql
type Mutation {
  createDepartmentHierarchy(
    input: CreateDepartmentHierarchyInput!
  ): CreateDepartmentHierarchyResponse!
}
```

**Request:**
```graphql
mutation CreateDepartmentHierarchy($input: CreateDepartmentHierarchyInput!) {
  createDepartmentHierarchy(input: $input) {
    success
    departmentId
    hierarchyId
    error
  }
}
```

**Variables (Minimal - chỉ parent và child):**
```json
{
  "input": {
    "parentDepartmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a"
  }
}
```

**Variables (Full):**
```json
{
  "input": {
    "parentDepartmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "name": "Sales Domestic Team",
    "relationshipType": "PARENT_CHILD",
    "hierarchyLevel": 2,
    "inheritsPermissions": true,
    "canEscalateToParent": true,
    "allowsCrossBranchAccess": false,
    "displayOrder": 1,
    "notes": "Đội bán hàng trong nước thuộc phòng kinh doanh",
    "isActive": true
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "createDepartmentHierarchy": {
      "success": true,
      "departmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
      "hierarchyId": "generated-hierarchy-uuid",
      "error": null
    }
  }
}
```

**Response (Error - Parent not found):**
```json
{
  "data": {
    "createDepartmentHierarchy": {
      "success": false,
      "departmentId": null,
      "hierarchyId": null,
      "error": "Parent department not found: invalid-uuid"
    }
  }
}
```

**Response (Error - Hierarchy already exists):**
```json
{
  "data": {
    "createDepartmentHierarchy": {
      "success": false,
      "departmentId": null,
      "hierarchyId": null,
      "error": "Hierarchy already exists for this child department"
    }
  }
}
```

---

### 5.2 updateDepartmentHierarchy

Cập nhật hierarchy của department. Sử dụng khi cần thay đổi parent hoặc các thuộc tính hierarchy khác.

**GraphQL Schema:**
```graphql
type Mutation {
  updateDepartmentHierarchy(
    input: UpdateDepartmentHierarchyInput!
  ): UpdateDepartmentHierarchyResponse!
}
```

**Request:**
```graphql
mutation UpdateDepartmentHierarchy($input: UpdateDepartmentHierarchyInput!) {
  updateDepartmentHierarchy(input: $input) {
    success
    departmentId
    hierarchyId
    error
  }
}
```

**Variables (Change parent):**
```json
{
  "input": {
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "parentDepartmentId": "new-parent-uuid"
  }
}
```

**Variables (Update permissions):**
```json
{
  "input": {
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "inheritsPermissions": false,
    "canEscalateToParent": true
  }
}
```

**Variables (Update multiple fields):**
```json
{
  "input": {
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "name": "Updated Team Name",
    "displayOrder": 5,
    "notes": "Updated notes",
    "isActive": true
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "updateDepartmentHierarchy": {
      "success": true,
      "departmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
      "hierarchyId": null,
      "error": null
    }
  }
}
```

**Response (Error - Not found):**
```json
{
  "data": {
    "updateDepartmentHierarchy": {
      "success": false,
      "departmentId": null,
      "hierarchyId": null,
      "error": "Hierarchy not found for department: invalid-uuid"
    }
  }
}
```

**Response (Error - Circular reference):**
```json
{
  "data": {
    "updateDepartmentHierarchy": {
      "success": false,
      "departmentId": null,
      "hierarchyId": null,
      "error": "Circular reference detected: cannot set parent"
    }
  }
}
```

---

### 5.3 deleteDepartmentHierarchy

Xóa mềm hierarchy (soft delete). Hierarchy sẽ được đánh dấu `deletedAt` thay vì xóa hoàn toàn.

**GraphQL Schema:**
```graphql
type Mutation {
  deleteDepartmentHierarchy(
    hierarchyId: String!
  ): DeleteDepartmentHierarchyResponse!
}
```

**Request:**
```graphql
mutation DeleteDepartmentHierarchy($hierarchyId: String!) {
  deleteDepartmentHierarchy(hierarchyId: $hierarchyId) {
    success
    deletedHierarchyId
    error
  }
}
```

**Variables:**
```json
{
  "hierarchyId": "hierarchy-uuid-to-delete"
}
```

**Response (Success):**
```json
{
  "data": {
    "deleteDepartmentHierarchy": {
      "success": true,
      "deletedHierarchyId": "hierarchy-uuid-to-delete",
      "error": null
    }
  }
}
```

**Response (Error - Not found):**
```json
{
  "data": {
    "deleteDepartmentHierarchy": {
      "success": false,
      "deletedHierarchyId": null,
      "error": "Hierarchy not found: invalid-uuid"
    }
  }
}
```

> **Note**: Soft delete chỉ đánh dấu `deletedAt` timestamp, không xóa vĩnh viễn. Hierarchy có thể được khôi phục bằng cách set `deletedAt = null`.

---

## 6. Error Handling

### Error Response Structure

Tất cả mutations trả về response có cấu trúc nhất quán:

```typescript
{
  success: boolean;        // true nếu thành công
  departmentId?: string;   // ID của department (nếu có)
  hierarchyId?: string;    // ID của hierarchy record (nếu có)
  error?: string;          // Thông báo lỗi (nếu thất bại)
}
```

### Error Types

| Error | Cause | Solution |
|-------|-------|----------|
| `violates foreign key constraint` | parentDepartmentId hoặc childDepartmentId không tồn tại | Kiểm tra lại UUID |
| `invalid input syntax for type uuid` | UUID format không hợp lệ | Sử dụng đúng format UUID |
| `invalid input value for enum` | relationshipType không hợp lệ | Sử dụng giá trị enum hợp lệ |
| `Hierarchy not found for department` | Child chưa có hierarchy (update) | Create trước |
| `Hierarchy not found: <id>` | hierarchyId không tồn tại (delete) | Kiểm tra UUID |
| `Forbidden resource` | Token không hợp lệ hoặc không có token | Kiểm tra Authorization header |

### Validation Rules

1. **Parent phải tồn tại**: parentDepartmentId phải là UUID của department hợp lệ
2. **Child phải tồn tại**: childDepartmentId phải là UUID của department hợp lệ
3. **Không circular**: Parent không được là con/cháu của child
4. **Unique child**: Mỗi child chỉ có một hierarchy record

---

## 7. Usage Examples

### 7.1 cURL Examples

**Create Hierarchy (Minimal):**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { createDepartmentHierarchy(input: { parentDepartmentId: \"ad95f81e-bda5-4a98-b72a-880c0b5c204c\", childDepartmentId: \"566d23d5-1498-4f7f-b61e-a7101772344a\" }) { success departmentId hierarchyId error } }"
  }'
```

**Create Hierarchy (Full):**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation CreateHierarchy($input: CreateDepartmentHierarchyInput!) { createDepartmentHierarchy(input: $input) { success departmentId hierarchyId error } }",
    "variables": {
      "input": {
        "parentDepartmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
        "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
        "relationshipType": "PARENT_CHILD",
        "hierarchyLevel": 2,
        "inheritsPermissions": true,
        "displayOrder": 1
      }
    }
  }'
```

**Update Hierarchy:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { updateDepartmentHierarchy(input: { childDepartmentId: \"566d23d5-1498-4f7f-b61e-a7101772344a\", displayOrder: 5, notes: \"Updated\" }) { success departmentId error } }"
  }'
```

**Delete Hierarchy (Soft Delete):**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { deleteDepartmentHierarchy(hierarchyId: \"hierarchy-uuid-to-delete\") { success deletedHierarchyId error } }"
  }'
```

**Create Hierarchy (Only Parent - Root):**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { createDepartmentHierarchy(input: { parentDepartmentId: \"ad95f81e-bda5-4a98-b72a-880c0b5c204c\", relationshipType: \"PARENT_CHILD\" }) { success departmentId hierarchyId error } }"
  }'
```

**Create Hierarchy (Only Child - Orphan):**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "query": "mutation { createDepartmentHierarchy(input: { childDepartmentId: \"566d23d5-1498-4f7f-b61e-a7101772344a\", relationshipType: \"FUNCTIONAL\" }) { success departmentId hierarchyId error } }"
  }'
```

### 7.2 TypeScript Interfaces

```typescript
// Enum cho departmentType (DEPARTMENT hoặc TEAM)
enum DEPARTMENT_TYPE {
  DEPARTMENT = 'DEPARTMENT',
  TEAM = 'TEAM',
}

// Enum type cho relationshipType
type RelationshipType =
  | 'PARENT_CHILD'
  | 'FUNCTIONAL'
  | 'SUPERVISORY'
  | 'DOTTED_LINE'
  | 'MATRIX'
  | 'ADVISORY'
  | 'PEER'
  | 'CROSS_FUNCTIONAL'
  | 'TEMPORARY'
  | 'VIRTUAL';

// Input Types
type CreateDepartmentHierarchyInput = {
  parentDepartmentId?: string;          // Optional (v1.1)
  childDepartmentId?: string;           // Optional (v1.1)
  name?: string;
  relationshipType?: RelationshipType;
  hierarchyLevel?: number;
  inheritsPermissions?: boolean;        // Default: true
  canEscalateToParent?: boolean;        // Default: false
  allowsCrossBranchAccess?: boolean;    // Default: false
  displayOrder?: number;                // Default: 0
  notes?: string;
  isActive?: boolean;                   // Default: true
};

type UpdateDepartmentHierarchyInput = {
  childDepartmentId: string;            // Required
  parentDepartmentId?: string;
  name?: string;
  relationshipType?: RelationshipType;
  hierarchyLevel?: number;
  inheritsPermissions?: boolean;
  canEscalateToParent?: boolean;
  allowsCrossBranchAccess?: boolean;
  displayOrder?: number;
  notes?: string;
  isActive?: boolean;
};

// Response Types
type CreateDepartmentHierarchyResponse = {
  success: boolean;
  departmentId?: string;                // childId hoặc parentId (fallback)
  hierarchyId?: string;
  error?: string;
};

type UpdateDepartmentHierarchyResponse = {
  success: boolean;
  departmentId?: string;
  hierarchyId?: string;
  error?: string;
};

type DeleteDepartmentHierarchyResponse = {
  success: boolean;
  deletedHierarchyId?: string;
  error?: string;
};
```

### 7.3 React / TanStack Query Examples

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';

// GraphQL Documents
const CREATE_HIERARCHY = `
  mutation CreateDepartmentHierarchy($input: CreateDepartmentHierarchyInput!) {
    createDepartmentHierarchy(input: $input) {
      success
      departmentId
      hierarchyId
      error
    }
  }
`;

const UPDATE_HIERARCHY = `
  mutation UpdateDepartmentHierarchy($input: UpdateDepartmentHierarchyInput!) {
    updateDepartmentHierarchy(input: $input) {
      success
      departmentId
      error
    }
  }
`;

// Hooks
export const useCreateDepartmentHierarchy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDepartmentHierarchyInput) => {
      const { createDepartmentHierarchy } = await graphqlClient.request(
        CREATE_HIERARCHY,
        { input }
      );
      return createDepartmentHierarchy;
    },
    onSuccess: () => {
      // Invalidate department tree cache
      queryClient.invalidateQueries({ queryKey: ['departmentTree'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useUpdateDepartmentHierarchy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDepartmentHierarchyInput) => {
      const { updateDepartmentHierarchy } = await graphqlClient.request(
        UPDATE_HIERARCHY,
        { input }
      );
      return updateDepartmentHierarchy;
    },
    onSuccess: (data) => {
      if (data.departmentId) {
        queryClient.invalidateQueries({
          queryKey: ['department', data.departmentId]
        });
      }
      queryClient.invalidateQueries({ queryKey: ['departmentTree'] });
    },
  });
};

// Usage in Component
const CreateTeamForm: React.FC<{ parentId: string }> = ({ parentId }) => {
  const createHierarchy = useCreateDepartmentHierarchy();

  const handleCreateTeam = async (childDepartmentId: string) => {
    const result = await createHierarchy.mutateAsync({
      parentDepartmentId: parentId,
      childDepartmentId,
      relationshipType: 'PARENT_CHILD',
      inheritsPermissions: true,
    });

    if (result.success) {
      toast.success('Đã tạo hierarchy thành công');
    } else {
      toast.error(result.error || 'Có lỗi xảy ra');
    }
  };

  return (
    <button
      onClick={() => handleCreateTeam('team-uuid')}
      disabled={createHierarchy.isPending}
    >
      {createHierarchy.isPending ? 'Đang xử lý...' : 'Tạo Team'}
    </button>
  );
};
```

### 7.4 Apollo Client Example

```typescript
import { gql, useMutation } from '@apollo/client';

const CREATE_HIERARCHY = gql`
  mutation CreateDepartmentHierarchy($input: CreateDepartmentHierarchyInput!) {
    createDepartmentHierarchy(input: $input) {
      success
      departmentId
      hierarchyId
      error
    }
  }
`;

const UPDATE_HIERARCHY = gql`
  mutation UpdateDepartmentHierarchy($input: UpdateDepartmentHierarchyInput!) {
    updateDepartmentHierarchy(input: $input) {
      success
      departmentId
      error
    }
  }
`;

function DepartmentHierarchyManager({ departmentId }: { departmentId: string }) {
  const [createHierarchy, { loading: creating }] = useMutation(CREATE_HIERARCHY);
  const [updateHierarchy, { loading: updating }] = useMutation(UPDATE_HIERARCHY);

  const handleSetParent = async (parentId: string) => {
    const { data } = await createHierarchy({
      variables: {
        input: {
          parentDepartmentId: parentId,
          childDepartmentId: departmentId,
          relationshipType: 'PARENT_CHILD',
        },
      },
      refetchQueries: ['GetDepartmentTree'],
    });

    if (!data.createDepartmentHierarchy.success) {
      // Nếu hierarchy đã tồn tại, thử update
      if (data.createDepartmentHierarchy.error?.includes('already exists')) {
        const { data: updateData } = await updateHierarchy({
          variables: {
            input: {
              childDepartmentId: departmentId,
              parentDepartmentId: parentId,
            },
          },
          refetchQueries: ['GetDepartmentTree'],
        });

        if (updateData.updateDepartmentHierarchy.success) {
          alert('Đã cập nhật parent thành công');
        } else {
          alert(updateData.updateDepartmentHierarchy.error);
        }
      } else {
        alert(data.createDepartmentHierarchy.error);
      }
    } else {
      alert('Đã thiết lập hierarchy thành công');
    }
  };

  const handleUpdatePermissions = async (inheritsPermissions: boolean) => {
    const { data } = await updateHierarchy({
      variables: {
        input: {
          childDepartmentId: departmentId,
          inheritsPermissions,
        },
      },
    });

    if (data.updateDepartmentHierarchy.success) {
      alert('Đã cập nhật permissions');
    } else {
      alert(data.updateDepartmentHierarchy.error);
    }
  };

  return (
    <div>
      <button
        onClick={() => handleSetParent('parent-uuid')}
        disabled={creating || updating}
      >
        Set Parent
      </button>
      <button
        onClick={() => handleUpdatePermissions(true)}
        disabled={updating}
      >
        Enable Permission Inheritance
      </button>
    </div>
  );
}
```

---

## 8. Best Practices

### 8.1 Workflow: Tạo Team thuộc Department

```typescript
// Step 1: Tạo department (TEAM type) trước
const createResult = await createDepartment({
  variables: {
    input: {
      departmentName: 'Đội bán hàng trong nước',
      departmentNameEn: 'Domestic Sales Team',
      departmentType: DEPARTMENT_TYPE.TEAM, // Sử dụng enum
      isActive: true,
    },
  },
});

if (!createResult.data.createDepartment.success) {
  throw new Error(createResult.data.createDepartment.error);
}

const teamId = createResult.data.createDepartment.department.id;

// Step 2: Thiết lập hierarchy
const hierarchyResult = await createHierarchy({
  variables: {
    input: {
      parentDepartmentId: 'SALES-department-uuid',
      childDepartmentId: teamId,
      relationshipType: 'PARENT_CHILD',
      hierarchyLevel: 2,
      inheritsPermissions: true,
    },
  },
});

if (!hierarchyResult.data.createDepartmentHierarchy.success) {
  // Handle error - có thể cần rollback department
  throw new Error(hierarchyResult.data.createDepartmentHierarchy.error);
}
```

### 8.2 Move Department to New Parent

```typescript
const moveDepartment = async (
  childId: string,
  newParentId: string
) => {
  const result = await updateHierarchy({
    variables: {
      input: {
        childDepartmentId: childId,
        parentDepartmentId: newParentId,
      },
    },
  });

  if (!result.data.updateDepartmentHierarchy.success) {
    const error = result.data.updateDepartmentHierarchy.error;

    if (error.includes('Circular reference')) {
      showError('Không thể di chuyển: Parent là con/cháu của department này');
    } else if (error.includes('not found')) {
      showError('Không tìm thấy hierarchy. Vui lòng tạo mới.');
    } else {
      showError(error);
    }
    return false;
  }

  return true;
};
```

### 8.3 Permission Settings Guide

```typescript
// Scenario 1: Team kế thừa tất cả quyền từ parent
const inheritAllPermissions = {
  inheritsPermissions: true,
  canEscalateToParent: true,
  allowsCrossBranchAccess: false,
};

// Scenario 2: Team độc lập, không kế thừa
const independentTeam = {
  inheritsPermissions: false,
  canEscalateToParent: false,
  allowsCrossBranchAccess: false,
};

// Scenario 3: Team có thể truy cập cross-branch
const crossBranchTeam = {
  inheritsPermissions: true,
  canEscalateToParent: true,
  allowsCrossBranchAccess: true,
};
```

### 8.4 Error Handling Pattern

```typescript
const handleHierarchyOperation = async <T extends { success: boolean; error?: string }>(
  operation: () => Promise<{ data: { createDepartmentHierarchy?: T; updateDepartmentHierarchy?: T } }>,
  successMessage: string
) => {
  try {
    const result = await operation();
    const response = result.data.createDepartmentHierarchy
      || result.data.updateDepartmentHierarchy;

    if (!response.success) {
      const error = response.error;

      // Handle specific errors
      if (error.includes('not found')) {
        showError('Department không tồn tại');
      } else if (error.includes('already exists')) {
        showError('Hierarchy đã tồn tại, vui lòng sử dụng update');
      } else if (error.includes('Circular reference')) {
        showError('Phát hiện vòng lặp: không thể đặt parent');
      } else {
        showError(error);
      }
      return false;
    }

    showSuccess(successMessage);
    return true;
  } catch (networkError) {
    showError('Lỗi kết nối. Vui lòng thử lại.');
    return false;
  }
};
```

### 8.5 Hierarchy Level Convention

| Level | Type | Example |
|-------|------|---------|
| 1 | DEPARTMENT (Root) | Phòng Kinh Doanh (SALES) |
| 2 | TEAM | Đội bán hàng trong nước (SALES_DOMESTIC) |
| 3 | SUB-TEAM | Nhóm Hà Nội |
| 4+ | Nested groups | Hiếm dùng, tránh quá sâu |

**Recommendation**: Giữ hierarchy tối đa 3-4 levels để dễ quản lý.

---

## Related Documentation

- [Department CRUD API](./department-crud.resolver.api-docs.md) - CRUD operations cho department
- [Sub-Manager API](./sub-manager.resolver.api-docs.md) - Quản lý sub-managers
- [Department Tree Resolver](./department-tree.resolver.ts) - Query hierarchy tree

---

**Document Version**: 1.2.0
**Author**: Claude Code
**Last Updated**: 2026-01-27
