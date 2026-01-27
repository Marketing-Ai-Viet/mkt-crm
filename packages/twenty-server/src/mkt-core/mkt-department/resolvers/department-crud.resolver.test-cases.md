# Test Cases - Department CRUD Resolver

> **File**: `department-crud.resolver.ts`
> **Endpoint**: `http://localhost:3000/graphql`
> **Authorization**: Bearer Token
> **Version**: 3.0

---

## ⚠️ Important Changes (v3.0)

- **`departmentCode` is now auto-generated** by the backend
- **`departmentCode` is NOT exposed** in GraphQL API (neither input nor output)
- Client only needs to provide `departmentName` when creating a department
- Backend generates unique code format: `{kebab-case-name}-{short-uuid}` (e.g., `phong-kinh-doanh-a1b2c3d4`)

---

## Authentication Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY5NDIyNDU5LCJleHAiOjE3NzcxOTg0NTl9.leO3KHgHxpGvjlVKUJpWRX2Mh-2Sf154bI-VuZeTRY8
```

---

## Available Test Data

### Existing Departments

| ID | Name | Type |
|----|------|------|
| `ad95f81e-bda5-4a98-b72a-880c0b5c204c` | Nhân viên kinh doanh | DEPARTMENT |
| `5ee8a0af-2aef-4eb4-865c-d4bc143ee97b` | Phòng kế toán | DEPARTMENT |
| `00b72fe7-77d0-429c-87b9-d88b671ea502` | Phòng nhân sự | DEPARTMENT |
| `566d23d5-1498-4f7f-b61e-a7101772344a` | Đội bán hàng trong nước | TEAM |
| `a0c628da-9e89-49d2-adf7-5cd72e52f7fc` | Đội kiểm toán | TEAM |

### Workspace Members (for managerId / subManagers)

| ID | Name | Email |
|----|------|-------|
| `20202020-0687-4c41-b707-ed1bfca972a7` | Tim Apple | tim@apple.dev |
| `20202020-77d5-4cb6-b60a-f4a835a85d61` | Jony Ive | jony.ive@apple.dev |
| `81caea88-92a5-4e88-8a9a-614ec785d244` | Jane Austen | jane.austen@apple.dev |
| `20202020-1553-45c6-a028-5a9064cce07f` | Phil Schiler | phil.schiler@apple.dev |

---

## 1. Queries

### 1.1 getDepartmentById - Get Department by ID

#### TC-Q01: Get existing department by ID with full details (Happy Path)

```graphql
query GetDepartmentById {
  getDepartmentById(id: "ad95f81e-bda5-4a98-b72a-880c0b5c204c") {
    id
    departmentName
    departmentNameEn
    departmentType
    description
    budgetCode
    costCenter
    requiresKpiTracking
    allowsCrossDepartmentAccess
    defaultKpiCategory
    displayOrder
    colorCode
    iconName
    address
    isActive
    managerId
    manager {
      id
      firstName
      lastName
      fullName
      email
      avatarUrl
    }
    subManagers {
      id
      workspaceMemberId
      firstName
      lastName
      fullName
      email
      avatarUrl
      isPrimary
      isActive
      note
      assignedAt
    }
    createdAt
    updatedAt
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "getDepartmentById": {
      "id": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
      "departmentName": "Nhân viên kinh doanh",
      "departmentType": "DEPARTMENT",
      "isActive": true,
      "managerId": "20202020-77d5-4cb6-b60a-f4a835a85d61",
      "manager": {
        "id": "20202020-77d5-4cb6-b60a-f4a835a85d61",
        "firstName": "Jony",
        "lastName": "Ive",
        "fullName": "Jony Ive",
        "email": "jony.ive@apple.dev",
        "avatarUrl": null
      },
      "subManagers": [],
      "address": "Tầng 5, Tòa nhà Vincom Center, 72 Lê Thánh Tôn, Quận 1, TP.HCM"
    }
  }
}
```

---

#### TC-Q02: Get non-existing department by ID

```graphql
query GetDepartmentByIdNotFound {
  getDepartmentById(id: "00000000-0000-0000-0000-000000000000") {
    id
    departmentName
    manager {
      id
      fullName
    }
    subManagers {
      id
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "getDepartmentById": null
  }
}
```

---

#### TC-Q03: Get department with invalid UUID format

```graphql
query GetDepartmentByInvalidId {
  getDepartmentById(id: "invalid-uuid") {
    id
    departmentName
  }
}
```

**Expected Response:** Error - Invalid UUID format

---

## 2. Mutations

### 2.1 createDepartment - Create New Department

#### TC-M01: Create department with minimal required fields (Happy Path)

```graphql
mutation CreateDepartmentMinimal {
  createDepartment(input: {
    departmentName: "Test Department"
  }) {
    success
    department {
      id
      departmentName
      departmentType
      isActive
      manager {
        id
        fullName
      }
      subManagers {
        id
      }
      createdAt
    }
    subManagers {
      id
      departmentId
      workspaceMemberId
      isPrimary
      isActive
    }
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "createDepartment": {
      "success": true,
      "department": {
        "id": "<generated-uuid>",
        "departmentName": "Test Department",
        "departmentType": null,
        "isActive": true,
        "manager": null,
        "subManagers": null
      },
      "subManagers": null,
      "error": null
    }
  }
}
```

---

#### TC-M02: Create department with all fields including subManagers (Happy Path)

```graphql
mutation CreateDepartmentFull {
  createDepartment(input: {
    departmentName: "Phòng Test Đầy Đủ"
    departmentNameEn: "Full Test Department"
    departmentType: "DEPARTMENT"
    description: "Đây là phòng test với đầy đủ thông tin"
    budgetCode: "BUD-2026-001"
    costCenter: "CC-TEST-001"
    requiresKpiTracking: true
    allowsCrossDepartmentAccess: false
    defaultKpiCategory: "PERFORMANCE"
    displayOrder: 100
    colorCode: "#FF5733"
    iconName: "IconBuilding"
    address: "Tầng 15, Tòa nhà Test, Quận 1, TP.HCM"
    isActive: true
    managerId: "20202020-0687-4c41-b707-ed1bfca972a7"
    subManagers: [
      {
        workspaceMemberId: "20202020-77d5-4cb6-b60a-f4a835a85d61"
        isPrimary: true
        note: "Primary sub-manager"
        isActive: true
      },
      {
        workspaceMemberId: "81caea88-92a5-4e88-8a9a-614ec785d244"
        isPrimary: false
        note: "Secondary sub-manager"
        isActive: true
      }
    ]
  }) {
    success
    department {
      id
      departmentName
      departmentNameEn
      departmentType
      description
      budgetCode
      costCenter
      requiresKpiTracking
      allowsCrossDepartmentAccess
      defaultKpiCategory
      displayOrder
      colorCode
      iconName
      address
      isActive
      managerId
      manager {
        id
        firstName
        lastName
        fullName
        email
      }
      createdAt
      updatedAt
    }
    subManagers {
      id
      departmentId
      workspaceMemberId
      isPrimary
      isActive
      note
      assignedAt
      createdAt
      updatedAt
    }
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "createDepartment": {
      "success": true,
      "department": {
        "departmentName": "Phòng Test Đầy Đủ",
        "departmentNameEn": "Full Test Department",
        "departmentType": "DEPARTMENT",
        "requiresKpiTracking": true,
        "allowsCrossDepartmentAccess": false,
        "managerId": "20202020-0687-4c41-b707-ed1bfca972a7",
        "manager": {
          "id": "20202020-0687-4c41-b707-ed1bfca972a7",
          "firstName": "Tim",
          "lastName": "Apple",
          "fullName": "Tim Apple",
          "email": "tim@apple.dev"
        }
      },
      "subManagers": [
        {
          "workspaceMemberId": "20202020-77d5-4cb6-b60a-f4a835a85d61",
          "isPrimary": true,
          "isActive": true,
          "note": "Primary sub-manager"
        },
        {
          "workspaceMemberId": "81caea88-92a5-4e88-8a9a-614ec785d244",
          "isPrimary": false,
          "isActive": true,
          "note": "Secondary sub-manager"
        }
      ],
      "error": null
    }
  }
}
```

---

#### TC-M03: Create department with TEAM type and subManagers

```graphql
mutation CreateTeamWithSubManagers {
  createDepartment(input: {
    departmentName: "Đội Test"
    departmentType: "TEAM"
    isActive: true
    subManagers: [
      {
        workspaceMemberId: "20202020-1553-45c6-a028-5a9064cce07f"
        isPrimary: true
      }
    ]
  }) {
    success
    department {
      id
      departmentName
      departmentType
    }
    subManagers {
      id
      workspaceMemberId
      isPrimary
      isActive
      assignedAt
    }
    error
  }
}
```

---

#### TC-M04: Create department without required fields (Error Case)

```graphql
mutation CreateDepartmentMissingFields {
  createDepartment(input: {
    departmentType: "DEPARTMENT"
  }) {
    success
    error
  }
}
```

**Expected Response:** GraphQL validation error - departmentName is required

---

### 2.2 updateDepartment - Update Existing Department

#### TC-M05: Update department name (Happy Path)

```graphql
mutation UpdateDepartmentName {
  updateDepartment(input: {
    id: "ad95f81e-bda5-4a98-b72a-880c0b5c204c"
    departmentName: "Phòng Kinh doanh (Updated)"
  }) {
    success
    department {
      id
      departmentName
      manager {
        id
        fullName
      }
      subManagers {
        id
        fullName
        isPrimary
      }
      updatedAt
    }
    subManagers {
      id
      workspaceMemberId
    }
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "updateDepartment": {
      "success": true,
      "department": {
        "id": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
        "departmentName": "Phòng Kinh doanh (Updated)",
        "manager": {
          "id": "20202020-77d5-4cb6-b60a-f4a835a85d61",
          "fullName": "Jony Ive"
        },
        "subManagers": []
      },
      "subManagers": null,
      "error": null
    }
  }
}
```

---

#### TC-M06: Update multiple fields at once

```graphql
mutation UpdateDepartmentMultipleFields {
  updateDepartment(input: {
    id: "566d23d5-1498-4f7f-b61e-a7101772344a"
    departmentName: "Đội Bán hàng Nội địa (Cập nhật)"
    departmentNameEn: "Domestic Sales Team (Updated)"
    description: "Updated description"
    displayOrder: 50
    colorCode: "#00FF00"
    address: "Địa chỉ mới, Quận 3, TP.HCM"
  }) {
    success
    department {
      id
      departmentName
      departmentNameEn
      description
      displayOrder
      colorCode
      address
      manager {
        id
        fullName
      }
      updatedAt
    }
    error
  }
}
```

---

#### TC-M07: Update non-existing department (Error Case)

```graphql
mutation UpdateNonExistingDepartment {
  updateDepartment(input: {
    id: "00000000-0000-0000-0000-000000000000"
    departmentName: "Should Fail"
  }) {
    success
    department {
      id
    }
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "updateDepartment": {
      "success": false,
      "department": null,
      "error": "Department not found: 00000000-0000-0000-0000-000000000000"
    }
  }
}
```

---

#### TC-M08: Update department manager

```graphql
mutation UpdateDepartmentManager {
  updateDepartment(input: {
    id: "ad95f81e-bda5-4a98-b72a-880c0b5c204c"
    managerId: "81caea88-92a5-4e88-8a9a-614ec785d244"
  }) {
    success
    department {
      id
      managerId
      manager {
        id
        firstName
        lastName
        fullName
        email
      }
    }
    error
  }
}
```

---

#### TC-M09: Deactivate department

```graphql
mutation DeactivateDepartment {
  updateDepartment(input: {
    id: "566d23d5-1498-4f7f-b61e-a7101772344a"
    isActive: false
  }) {
    success
    department {
      id
      isActive
    }
    error
  }
}
```

---

#### TC-M10: Replace sub-managers (REPLACE mode)

```graphql
mutation ReplaceSubManagers {
  updateDepartment(input: {
    id: "ad95f81e-bda5-4a98-b72a-880c0b5c204c"
    subManagers: [
      {
        workspaceMemberId: "81caea88-92a5-4e88-8a9a-614ec785d244"
        isPrimary: true
        note: "New primary sub-manager"
        isActive: true
      },
      {
        workspaceMemberId: "20202020-1553-45c6-a028-5a9064cce07f"
        isPrimary: false
        note: "New secondary sub-manager"
        isActive: true
      }
    ]
  }) {
    success
    department {
      id
      subManagers {
        id
        workspaceMemberId
        firstName
        lastName
        fullName
        email
        isPrimary
        isActive
        note
        assignedAt
      }
    }
    subManagers {
      id
      departmentId
      workspaceMemberId
      isPrimary
      isActive
      note
      assignedAt
      createdAt
      updatedAt
    }
    error
  }
}
```

**Note:** REPLACE mode - deletes all existing sub-managers and creates new ones

---

#### TC-M11: Clear all sub-managers (empty array)

```graphql
mutation ClearSubManagers {
  updateDepartment(input: {
    id: "ad95f81e-bda5-4a98-b72a-880c0b5c204c"
    subManagers: []
  }) {
    success
    department {
      id
      subManagers {
        id
      }
    }
    subManagers {
      id
    }
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "updateDepartment": {
      "success": true,
      "department": {
        "id": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
        "subManagers": []
      },
      "subManagers": [],
      "error": null
    }
  }
}
```

---

### 2.3 deleteDepartment - Delete Department (Soft Delete)

#### TC-M12: Delete existing department (Happy Path)

**Note:** Use a test department created in previous tests

```graphql
mutation DeleteDepartment {
  deleteDepartment(id: "<test-department-id>") {
    success
    deletedId
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "deleteDepartment": {
      "success": true,
      "deletedId": "<test-department-id>",
      "error": null
    }
  }
}
```

---

#### TC-M13: Delete non-existing department (Error Case)

```graphql
mutation DeleteNonExistingDepartment {
  deleteDepartment(id: "00000000-0000-0000-0000-000000000000") {
    success
    deletedId
    error
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "deleteDepartment": {
      "success": false,
      "deletedId": null,
      "error": "Department not found: 00000000-0000-0000-0000-000000000000"
    }
  }
}
```

---

## 3. Edge Cases & Security Tests

### 3.1 Authentication Tests

#### TC-S01: Request without Authorization header

```graphql
# Remove Authorization header
query GetDepartmentNoAuth {
  getDepartmentById(id: "ad95f81e-bda5-4a98-b72a-880c0b5c204c") {
    id
  }
}
```

**Expected Response:** 401 Unauthorized

---

### 3.2 Input Validation Tests

#### TC-V01: Create department with Unicode characters

```graphql
mutation CreateUnicodeFields {
  createDepartment(input: {
    departmentName: "Phòng Test Tiếng Việt 日本語 한국어"
    description: "Mô tả với emoji 🎉 và ký tự đặc biệt"
  }) {
    success
    department {
      departmentName
      description
    }
    error
  }
}
```

---

### 3.3 SubManager Validation Tests

#### TC-SM01: Create department with duplicate sub-manager workspaceMemberId

```graphql
mutation CreateDuplicateSubManager {
  createDepartment(input: {
    departmentName: "Test Duplicate SubManager"
    subManagers: [
      {
        workspaceMemberId: "20202020-77d5-4cb6-b60a-f4a835a85d61"
        isPrimary: true
      },
      {
        workspaceMemberId: "20202020-77d5-4cb6-b60a-f4a835a85d61"
        isPrimary: false
      }
    ]
  }) {
    success
    subManagers {
      id
      workspaceMemberId
    }
    error
  }
}
```

**Note:** Current implementation may create duplicates. Consider adding validation.

---

#### TC-SM02: Create department with invalid sub-manager workspaceMemberId

```graphql
mutation CreateInvalidSubManager {
  createDepartment(input: {
    departmentName: "Test Invalid SubManager"
    subManagers: [
      {
        workspaceMemberId: "00000000-0000-0000-0000-000000000000"
        isPrimary: true
      }
    ]
  }) {
    success
    subManagers {
      id
      workspaceMemberId
    }
    error
  }
}
```

---

## 4. Test Execution Workflow

### Setup Phase
1. Execute TC-M01 or TC-M02 to create test department
2. Note the returned `id` for subsequent tests

### Query Tests
3. Execute TC-Q01 to TC-Q03

### Update Tests
4. Execute TC-M05 to TC-M11 on created test department

### SubManager Tests
5. Execute TC-SM01 and TC-SM02 for sub-manager edge cases

### Delete Tests
6. Execute TC-M12 on test department
7. Execute TC-M13 for error cases

### Cleanup
8. Verify deleted department is soft-deleted (exists with deletedAt set)

---

## 5. cURL Examples

### Query Example with Relations

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY5NDIyNDU5LCJleHAiOjE3NzcxOTg0NTl9.leO3KHgHxpGvjlVKUJpWRX2Mh-2Sf154bI-VuZeTRY8" \
  -d '{
    "query": "query { getDepartmentById(id: \"ad95f81e-bda5-4a98-b72a-880c0b5c204c\") { id departmentName manager { id fullName email } subManagers { id fullName isPrimary } } }"
  }'
```

### Create Mutation with SubManagers

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY5NDIyNDU5LCJleHAiOjE3NzcxOTg0NTl9.leO3KHgHxpGvjlVKUJpWRX2Mh-2Sf154bI-VuZeTRY8" \
  -d '{
    "query": "mutation { createDepartment(input: { departmentName: \"cURL Test Department\", managerId: \"20202020-0687-4c41-b707-ed1bfca972a7\", subManagers: [{ workspaceMemberId: \"20202020-77d5-4cb6-b60a-f4a835a85d61\", isPrimary: true }] }) { success department { id departmentName manager { fullName } } subManagers { id workspaceMemberId isPrimary } error } }"
  }'
```

---

## 6. Test Summary

| Category | Total | Happy Path | Error Cases |
|----------|-------|------------|-------------|
| Queries | 3 | 1 | 2 |
| Create Mutations | 4 | 3 | 1 |
| Update Mutations | 7 | 6 | 1 |
| Delete Mutations | 2 | 1 | 1 |
| Security Tests | 1 | 0 | 1 |
| Validation Tests | 1 | 1 | 0 |
| SubManager Tests | 2 | 0 | 2 |
| **Total** | **20** | **12** | **8** |

---

## 7. Response Types Reference

### DepartmentOutput

| Field | Type | Description |
|-------|------|-------------|
| id | String! | Department ID |
| departmentName | String! | Display name |
| departmentNameEn | String | English name |
| departmentType | String | DEPARTMENT or TEAM |
| description | String | Detailed description |
| budgetCode | String | Budget tracking code |
| costCenter | String | Cost allocation center |
| requiresKpiTracking | Boolean | KPI tracking required |
| allowsCrossDepartmentAccess | Boolean | Cross-department access |
| defaultKpiCategory | String | Default KPI category |
| displayOrder | Int | Display order |
| colorCode | String | Color code for UI |
| iconName | String | Icon name for UI |
| address | String | Physical address |
| isActive | Boolean | Active status |
| managerId | String | Manager workspace member ID |
| manager | ManagerInfo | Manager details |
| subManagers | [SubManagerInfo] | Sub-managers with details |
| createdAt | DateTime! | Created timestamp |
| updatedAt | DateTime! | Updated timestamp |

### CreateDepartmentInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| departmentName | String! | **Yes** | Display name |
| departmentNameEn | String | No | English name |
| departmentType | String | No | DEPARTMENT or TEAM |
| description | String | No | Detailed description |
| budgetCode | String | No | Budget tracking code |
| costCenter | String | No | Cost allocation center |
| requiresKpiTracking | Boolean | No | KPI tracking required (default: false) |
| allowsCrossDepartmentAccess | Boolean | No | Cross-department access (default: false) |
| defaultKpiCategory | String | No | Default KPI category |
| displayOrder | Int | No | Display order (default: 0) |
| colorCode | String | No | Color code for UI |
| iconName | String | No | Icon name for UI |
| address | String | No | Physical address |
| isActive | Boolean | No | Active status (default: true) |
| managerId | String | No | Manager workspace member ID |
| subManagers | [SubManagerInput] | No | Sub-managers to assign |

### UpdateDepartmentInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String! | **Yes** | Department ID to update |
| departmentName | String | No | Display name |
| departmentNameEn | String | No | English name |
| departmentType | String | No | DEPARTMENT or TEAM |
| description | String | No | Detailed description |
| budgetCode | String | No | Budget tracking code |
| costCenter | String | No | Cost allocation center |
| requiresKpiTracking | Boolean | No | KPI tracking required |
| allowsCrossDepartmentAccess | Boolean | No | Cross-department access |
| defaultKpiCategory | String | No | Default KPI category |
| displayOrder | Int | No | Display order |
| colorCode | String | No | Color code for UI |
| iconName | String | No | Icon name for UI |
| address | String | No | Physical address |
| isActive | Boolean | No | Active status |
| managerId | String | No | Manager workspace member ID |
| subManagers | [SubManagerInput] | No | Sub-managers (REPLACE mode) |

### ManagerInfo

| Field | Type | Description |
|-------|------|-------------|
| id | ID! | Workspace member ID |
| firstName | String | First name |
| lastName | String | Last name |
| fullName | String | Full name |
| email | String | Email address |
| avatarUrl | String | Avatar URL |

### SubManagerInfo

| Field | Type | Description |
|-------|------|-------------|
| id | ID! | Sub-manager record ID |
| workspaceMemberId | ID! | Workspace member ID |
| firstName | String | First name |
| lastName | String | Last name |
| fullName | String | Full name |
| email | String | Email address |
| avatarUrl | String | Avatar URL |
| isPrimary | Boolean! | Primary sub-manager flag |
| isActive | Boolean! | Active status |
| note | String | Additional notes |
| assignedAt | DateTime | Assignment date |

---

**Last Updated:** 2026-01-27
**Author:** Claude AI
**Version:** 3.0

### Changelog

#### v3.0 (2026-01-27)
- **BREAKING**: `departmentCode` removed from API
  - No longer in CreateDepartmentInput
  - No longer in UpdateDepartmentInput
  - No longer in DepartmentOutput
- Backend auto-generates `departmentCode` from `departmentName`
- Removed test cases related to departmentCode validation
- Updated all test cases and expected responses
- Simplified test summary

#### v2.0 (2026-01-27)
- Added `manager` relation to all query responses
- Added `subManagers` relation to all query/mutation responses
- Added `subManagers` input to create/update mutations
- Added TC-M15: Replace sub-managers test case
- Added TC-M16: Clear all sub-managers test case

#### v1.0 (2026-01-26)
- Initial version with basic CRUD test cases
