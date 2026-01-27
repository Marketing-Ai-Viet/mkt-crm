# Department CRUD Resolver Test Report v3.0

**Test Date:** 2026-01-27
**Tester:** Automated
**Version:** 3.0 (departmentCode removed from API)

## Summary

All tests passed successfully. The `departmentCode` field has been removed from the GraphQL API as requested:
- Input: Client no longer needs to provide `departmentCode`
- Output: `departmentCode` is not returned in responses
- Internal: `departmentCode` is auto-generated in backend (format: `{kebab-case-name}-{short-uuid}`)

## Test Results

### Mutations

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| TC-M01 | Create department (minimal) | ✅ PASS | Only `departmentName` required |
| TC-M02 | Create department (full fields) | ✅ PASS | All optional fields work |
| TC-M05 | Update department name | ✅ PASS | Single field update |
| TC-M06 | Update multiple fields | ✅ PASS | Multiple fields in one mutation |
| TC-M10 | Delete department | ✅ PASS | Soft delete works |

### Queries

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| TC-Q01 | Get department by ID | ✅ PASS | Returns all fields except departmentCode |
| TC-Q-Tree | Get department tree | ✅ PASS | Tree structure works |

### Schema Validation

| Test | Status | Notes |
|------|--------|-------|
| departmentCode not in DepartmentOutput | ✅ PASS | Error: Cannot query field "departmentCode" |
| departmentCode not in DepartmentTreeNode | ✅ PASS | Error: Cannot query field "departmentCode" |

## Test Details

### TC-M01: Create Department (Minimal)
```graphql
mutation {
  createDepartment(input: { departmentName: "Test Department v3" }) {
    success
    department { id departmentName departmentType isActive createdAt }
    error
  }
}
```
**Response:**
```json
{
  "success": true,
  "department": {
    "id": "c4c28a2d-0c20-46e5-98dc-6944a65337b3",
    "departmentName": "Test Department v3",
    "departmentType": null,
    "isActive": true,
    "createdAt": "2026-01-27T03:15:22.408Z"
  },
  "error": null
}
```

### TC-M02: Create Department (Full Fields)
```graphql
mutation {
  createDepartment(input: {
    departmentName: "Phòng Kinh Doanh Test"
    departmentNameEn: "Sales Department"
    departmentType: "DEPARTMENT"
    description: "Quản lý bán hàng"
    budgetCode: "BD-001"
    costCenter: "CC-001"
    requiresKpiTracking: true
    colorCode: "#ff5733"
    iconName: "IconBriefcase"
    isActive: true
  }) {
    success
    department { ... }
    error
  }
}
```
**Result:** ✅ All fields saved correctly

### Schema Validation: departmentCode NOT queryable
```graphql
query {
  getDepartmentById(id: "...") {
    id departmentName departmentCode
  }
}
```
**Response:**
```json
{
  "errors": [{
    "message": "Cannot query field \"departmentCode\" on type \"DepartmentOutput\". Did you mean \"departmentName\", \"departmentType\", or \"departmentNameEn\"?"
  }]
}
```

## Breaking Changes v3.0

1. **Input Changes:**
   - `CreateDepartmentInput.departmentCode` - REMOVED
   - `UpdateDepartmentInput.departmentCode` - REMOVED

2. **Output Changes:**
   - `DepartmentOutput.departmentCode` - REMOVED
   - `DepartmentTreeNode.departmentCode` - REMOVED
   - `DepartmentAncestor.departmentCode` - REMOVED
   - `DepartmentDescendant.departmentCode` - REMOVED

3. **Behavior Changes:**
   - `departmentCode` is now auto-generated from `departmentName` using format: `{kebab-case-name}-{8-char-uuid}`
   - Example: "Phòng Kinh Doanh" → "phong-kinh-doanh-a1b2c3d4"
