# Department Module - Frontend Integration Guide

> Tài liệu hướng dẫn tích hợp API Department Module cho phía Frontend (React + Apollo Client)

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Types](#typescript-types)
3. [Constants & Enums](#constants--enums)
4. [GraphQL Operations](#graphql-operations)
5. [React Hooks & Examples](#react-hooks--examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Overview

### API Endpoint
```
POST /graphql
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Module Structure
```
Department Module
├── DepartmentTreeResolver       # 7 queries (tree navigation)
│   ├── getDepartmentHierarchyTree
│   ├── getDepartmentSubtree
│   ├── getDepartmentForest
│   ├── getDepartmentAncestors
│   ├── getDepartmentDescendants
│   ├── getHierarchyStatistics
│   └── getCompleteDepartmentStructure
├── DepartmentMutationResolver   # 2 mutations (hierarchy management)
│   ├── createDepartmentHierarchy
│   └── updateDepartmentHierarchy
└── Auto-generated CRUD          # Standard Twenty CRM operations
    ├── mktDepartments (findMany)
    ├── mktDepartment (findOne)
    ├── createMktDepartment
    ├── updateMktDepartment
    └── deleteMktDepartment
```

### Key Concepts

- **Department**: Đơn vị tổ chức (phòng ban, đội nhóm)
- **Hierarchy**: Quan hệ cha-con giữa các department
- **Tree**: Cấu trúc cây phân cấp từ root đến leaf
- **Ancestors**: Danh sách phòng ban cha/tổ tiên
- **Descendants**: Danh sách phòng ban con/hậu duệ

---

## TypeScript Types

### Core Types

```typescript
// ============================================
// DEPARTMENT TYPES
// ============================================

type DepartmentType = 'DEPARTMENT' | 'TEAM';

type Department = {
  id: string;
  departmentCode: string;
  departmentName: string;
  departmentType: DepartmentType;
  description?: string;
  isActive: boolean;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// HIERARCHY TYPES
// ============================================

type RelationshipType =
  | 'PARENT_CHILD'
  | 'SUPERVISORY'
  | 'MATRIX'
  | 'FUNCTIONAL'
  | 'ADVISORY'
  | 'DOTTED_LINE'
  | 'PEER'
  | 'CROSS_FUNCTIONAL'
  | 'VIRTUAL'
  | 'TEMPORARY';

type DepartmentHierarchy = {
  id: string;
  name?: string;
  parentDepartmentId: string;
  childDepartmentId: string;
  relationshipType?: RelationshipType;
  hierarchyLevel?: number;
  hierarchyPath?: string[];
  inheritsPermissions?: boolean;
  canEscalateToParent?: boolean;
  allowsCrossBranchAccess?: boolean;
  displayOrder?: number;
  notes?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  parentDepartment?: Department;
  childDepartment?: Department;
};

// ============================================
// TREE NODE TYPES
// ============================================

type DepartmentTreeNode = {
  id: string;
  departmentCode: string;
  departmentName: string;
  level: number;
  children: DepartmentTreeNode[];
  relationshipType?: string;
  hierarchyId?: string;
};

// ============================================
// ANCESTOR/DESCENDANT TYPES
// ============================================

type DepartmentAncestor = {
  id: string;
  departmentCode: string;
  departmentName: string;
  level: number;
  relationshipType: string;
  hierarchyId: string;
  distance: number;
};

type DepartmentDescendant = {
  id: string;
  departmentCode: string;
  departmentName: string;
  level: number;
  relationshipType: string;
  hierarchyId: string;
  distance: number;
  path: string[];
};

// ============================================
// STATISTICS TYPES
// ============================================

type HierarchyStatistics = {
  totalHierarchies: number;
  activeHierarchies: number;
  maxDepth: number;
  averageDepth: number;
  orphanedDepartments: number;
  circularReferences: number;
};
```

### Input Types

```typescript
// ============================================
// TREE OPTIONS INPUT
// ============================================

type DepartmentTreeOptions = {
  maxDepth?: number;              // Default: 10
  includeInactive?: boolean;      // Default: false
  relationshipTypes?: string[];   // Filter by types
  sortBy?: 'DISPLAY_ORDER' | 'DEPARTMENT_NAME' | 'DEPARTMENT_CODE';
  sortDirection?: 'ASC' | 'DESC'; // Default: ASC
};

// ============================================
// HIERARCHY MUTATION INPUTS
// ============================================

type CreateDepartmentHierarchyInput = {
  parentDepartmentId: string;     // Required
  childDepartmentId: string;      // Required
  name?: string;
  relationshipType?: RelationshipType;  // Default: PARENT_CHILD
  hierarchyLevel?: number;
  inheritsPermissions?: boolean;  // Default: true
  canEscalateToParent?: boolean;  // Default: false
  allowsCrossBranchAccess?: boolean;  // Default: false
  displayOrder?: number;          // Default: 0
  notes?: string;
  isActive?: boolean;             // Default: true
};

type UpdateDepartmentHierarchyInput = {
  childDepartmentId: string;      // Required - identifies the hierarchy
  parentDepartmentId?: string;    // Change parent (move department)
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
```

### Output Types

```typescript
// ============================================
// RESPONSE TYPES
// ============================================

type CreateDepartmentHierarchyResponse = {
  success: boolean;
  departmentId?: string;
  hierarchyId?: string;
  error?: string;
};

type UpdateDepartmentHierarchyResponse = {
  success: boolean;
  departmentId?: string;
  hierarchyId?: string;
  error?: string;
};
```

---

## Constants & Enums

### Department Type

```typescript
const DEPARTMENT_TYPE = {
  DEPARTMENT: 'DEPARTMENT',
  TEAM: 'TEAM',
} as const;

const DEPARTMENT_TYPE_OPTIONS = [
  { value: 'DEPARTMENT', label: 'Phòng ban', color: 'blue', icon: 'IconBuilding' },
  { value: 'TEAM', label: 'Đội nhóm', color: 'green', icon: 'IconUsers' },
];
```

### Relationship Type

```typescript
const RELATIONSHIP_TYPE = {
  PARENT_CHILD: 'PARENT_CHILD',
  SUPERVISORY: 'SUPERVISORY',
  MATRIX: 'MATRIX',
  FUNCTIONAL: 'FUNCTIONAL',
  ADVISORY: 'ADVISORY',
  DOTTED_LINE: 'DOTTED_LINE',
  PEER: 'PEER',
  CROSS_FUNCTIONAL: 'CROSS_FUNCTIONAL',
  VIRTUAL: 'VIRTUAL',
  TEMPORARY: 'TEMPORARY',
} as const;

const RELATIONSHIP_TYPE_OPTIONS = [
  { value: 'PARENT_CHILD', label: 'Cha - Con', description: 'Quan hệ trực tiếp' },
  { value: 'SUPERVISORY', label: 'Giám sát', description: 'Quản lý giám sát' },
  { value: 'MATRIX', label: 'Ma trận', description: 'Báo cáo đa chiều' },
  { value: 'FUNCTIONAL', label: 'Chức năng', description: 'Theo chức năng' },
  { value: 'ADVISORY', label: 'Tư vấn', description: 'Quan hệ tư vấn' },
  { value: 'DOTTED_LINE', label: 'Đường đứt', description: 'Báo cáo gián tiếp' },
  { value: 'PEER', label: 'Ngang hàng', description: 'Cùng cấp' },
  { value: 'CROSS_FUNCTIONAL', label: 'Liên chức năng', description: 'Xuyên phòng ban' },
  { value: 'VIRTUAL', label: 'Ảo', description: 'Nhóm ảo' },
  { value: 'TEMPORARY', label: 'Tạm thời', description: 'Quan hệ tạm' },
];
```

### Sort Options

```typescript
const SORT_BY_OPTIONS = [
  { value: 'DISPLAY_ORDER', label: 'Thứ tự hiển thị' },
  { value: 'DEPARTMENT_NAME', label: 'Tên phòng ban' },
  { value: 'DEPARTMENT_CODE', label: 'Mã phòng ban' },
];

const SORT_DIRECTION_OPTIONS = [
  { value: 'ASC', label: 'Tăng dần' },
  { value: 'DESC', label: 'Giảm dần' },
];
```

---

## GraphQL Operations

### 1. Tree Query Operations

#### Get Department Hierarchy Tree

Lấy toàn bộ cây phòng ban từ một root department.

```graphql
query GetDepartmentHierarchyTree(
  $rootDepartmentId: String!
  $options: DepartmentTreeOptions
) {
  getDepartmentHierarchyTree(
    rootDepartmentId: $rootDepartmentId
    options: $options
  ) {
    id
    departmentCode
    departmentName
    level
    relationshipType
    hierarchyId
    children {
      id
      departmentCode
      departmentName
      level
      relationshipType
      hierarchyId
      children {
        id
        departmentCode
        departmentName
        level
      }
    }
  }
}
```

**Variables:**
```json
{
  "rootDepartmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
  "options": {
    "maxDepth": 5,
    "includeInactive": false,
    "sortBy": "DISPLAY_ORDER",
    "sortDirection": "ASC"
  }
}
```

**Response Example:**
```json
{
  "data": {
    "getDepartmentHierarchyTree": {
      "id": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
      "departmentCode": "SALES",
      "departmentName": "Nhân viên kinh doanh",
      "level": 0,
      "children": [
        {
          "id": "566d23d5-1498-4f7f-b61e-a7101772344a",
          "departmentCode": "SALES_DOMESTIC",
          "departmentName": "Đội bán hàng trong nước",
          "level": 1,
          "relationshipType": "PARENT_CHILD",
          "hierarchyId": "59729773-746c-40f0-b9b6-e51dd8cb2442",
          "children": []
        }
      ]
    }
  }
}
```

#### Get Department Subtree

Lấy cây con từ một department bất kỳ (không tìm root).

```graphql
query GetDepartmentSubtree(
  $departmentId: String!
  $options: DepartmentTreeOptions
) {
  getDepartmentSubtree(departmentId: $departmentId, options: $options) {
    id
    departmentCode
    departmentName
    level
    children {
      id
      departmentCode
      departmentName
      level
    }
  }
}
```

#### Get Department Forest

Lấy nhiều cây phòng ban từ nhiều root IDs (filter invalid IDs tự động).

```graphql
query GetDepartmentForest(
  $rootIds: [String!]!
  $options: DepartmentTreeOptions
) {
  getDepartmentForest(rootIds: $rootIds, options: $options) {
    id
    departmentCode
    departmentName
    level
    children {
      id
      departmentCode
      departmentName
    }
  }
}
```

**Variables:**
```json
{
  "rootIds": [
    "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
    "e4fd8648-3739-4fec-8e37-44c90ee54a0c"
  ],
  "options": {
    "maxDepth": 3
  }
}
```

#### Get Department Ancestors

Tìm tất cả phòng ban cha/tổ tiên của một department.

```graphql
query GetDepartmentAncestors(
  $departmentId: String!
  $relationshipTypes: [String!]
) {
  getDepartmentAncestors(
    departmentId: $departmentId
    relationshipTypes: $relationshipTypes
  ) {
    id
    departmentCode
    departmentName
    level
    relationshipType
    hierarchyId
    distance
  }
}
```

**Variables:**
```json
{
  "departmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
  "relationshipTypes": ["PARENT_CHILD"]
}
```

**Response Example:**
```json
{
  "data": {
    "getDepartmentAncestors": [
      {
        "id": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
        "departmentCode": "SALES",
        "departmentName": "Nhân viên kinh doanh",
        "level": 0,
        "relationshipType": "PARENT_CHILD",
        "hierarchyId": "59729773-746c-40f0-b9b6-e51dd8cb2442",
        "distance": 1
      }
    ]
  }
}
```

**Note:** Sử dụng `relationshipTypes: ["any"]` để lấy tất cả relationship types.

#### Get Department Descendants

Tìm tất cả phòng ban con/hậu duệ của một department.

```graphql
query GetDepartmentDescendants(
  $departmentId: String!
  $maxDepth: Int
  $relationshipTypes: [String!]
) {
  getDepartmentDescendants(
    departmentId: $departmentId
    maxDepth: $maxDepth
    relationshipTypes: $relationshipTypes
  ) {
    id
    departmentCode
    departmentName
    level
    relationshipType
    hierarchyId
    distance
    path
  }
}
```

**Variables:**
```json
{
  "departmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
  "maxDepth": 5
}
```

**Response Example:**
```json
{
  "data": {
    "getDepartmentDescendants": [
      {
        "id": "566d23d5-1498-4f7f-b61e-a7101772344a",
        "departmentCode": "SALES_DOMESTIC",
        "departmentName": "Đội bán hàng trong nước",
        "level": 1,
        "relationshipType": "PARENT_CHILD",
        "distance": 1,
        "path": ["SALES_DOMESTIC"]
      }
    ]
  }
}
```

#### Get Hierarchy Statistics

Lấy thống kê về cấu trúc phân cấp phòng ban.

```graphql
query GetHierarchyStatistics {
  getHierarchyStatistics {
    totalHierarchies
    activeHierarchies
    maxDepth
    averageDepth
    orphanedDepartments
    circularReferences
  }
}
```

**Response Example:**
```json
{
  "data": {
    "getHierarchyStatistics": {
      "totalHierarchies": 20,
      "activeHierarchies": 19,
      "maxDepth": 2,
      "averageDepth": 2,
      "orphanedDepartments": 0,
      "circularReferences": 0
    }
  }
}
```

#### Get Complete Department Structure

Lấy toàn bộ cấu trúc phòng ban (tất cả root departments với children).

```graphql
query GetCompleteDepartmentStructure($options: DepartmentTreeOptions) {
  getCompleteDepartmentStructure(options: $options) {
    id
    departmentCode
    departmentName
    level
    children {
      id
      departmentCode
      departmentName
      level
      children {
        id
        departmentCode
        departmentName
      }
    }
  }
}
```

**Response Example:**
```json
{
  "data": {
    "getCompleteDepartmentStructure": [
      {
        "departmentCode": "SALES",
        "departmentName": "Nhân viên kinh doanh",
        "children": [
          {"departmentCode": "SALES_DOMESTIC", "departmentName": "Đội bán hàng trong nước"},
          {"departmentCode": "SALES_INTERNATIONAL", "departmentName": "Đội bán hàng quốc tế"}
        ]
      },
      {
        "departmentCode": "TECH",
        "departmentName": "Phòng công nghệ",
        "children": [
          {"departmentCode": "TECH_BACKEND", "departmentName": "Đội phát triển Backend"},
          {"departmentCode": "TECH_FRONTEND", "departmentName": "Đội phát triển Frontend"}
        ]
      }
    ]
  }
}
```

### 2. Hierarchy Mutation Operations

#### Create Department Hierarchy

Tạo quan hệ cha-con cho department.

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

**Variables:**
```json
{
  "input": {
    "parentDepartmentId": "ad95f81e-bda5-4a98-b72a-880c0b5c204c",
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "name": "Sales Team Hierarchy",
    "relationshipType": "PARENT_CHILD",
    "hierarchyLevel": 1,
    "inheritsPermissions": true,
    "canEscalateToParent": false,
    "displayOrder": 1,
    "notes": "Đội bán hàng thuộc phòng kinh doanh",
    "isActive": true
  }
}
```

**Response Example:**
```json
{
  "data": {
    "createDepartmentHierarchy": {
      "success": true,
      "departmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
      "hierarchyId": "5465758a-f219-431b-83f1-99d1073fde61"
    }
  }
}
```

#### Update Department Hierarchy

Cập nhật quan hệ hierarchy (có thể di chuyển department sang parent khác).

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

**Variables - Update properties:**
```json
{
  "input": {
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "hierarchyLevel": 2,
    "displayOrder": 5,
    "notes": "Updated notes"
  }
}
```

**Variables - Move to new parent:**
```json
{
  "input": {
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "parentDepartmentId": "e4fd8648-3739-4fec-8e37-44c90ee54a0c"
  }
}
```

**Variables - Deactivate hierarchy:**
```json
{
  "input": {
    "childDepartmentId": "566d23d5-1498-4f7f-b61e-a7101772344a",
    "isActive": false
  }
}
```

**Error Response (non-existent department):**
```json
{
  "data": {
    "updateDepartmentHierarchy": {
      "success": false,
      "departmentId": null,
      "error": "Hierarchy not found for department: 00000000-0000-0000-0000-000000000000"
    }
  }
}
```

### 3. Auto-generated CRUD Operations

#### Find Many Departments

```graphql
query FindManyDepartments($filter: MktDepartmentFilterInput, $orderBy: MktDepartmentOrderByInput) {
  mktDepartments(filter: $filter, orderBy: $orderBy) {
    edges {
      node {
        id
        departmentCode
        departmentName
        departmentType
        description
        isActive
        displayOrder
        createdAt
      }
    }
    totalCount
  }
}
```

#### Find One Department

```graphql
query FindOneDepartment($id: ID!) {
  mktDepartment(id: $id) {
    id
    departmentCode
    departmentName
    departmentType
    description
    isActive
    displayOrder
    metadata
    createdAt
    updatedAt
  }
}
```

#### Create Department

```graphql
mutation CreateMktDepartment($data: MktDepartmentCreateInput!) {
  createMktDepartment(data: $data) {
    id
    departmentCode
    departmentName
    departmentType
  }
}
```

**Variables:**
```json
{
  "data": {
    "departmentCode": "NEW_DEPT",
    "departmentName": "New Department",
    "departmentType": "DEPARTMENT",
    "description": "Description here",
    "isActive": true,
    "displayOrder": 10
  }
}
```

---

## React Hooks & Examples

### Setup Apollo Client

```typescript
// src/lib/apollo-client.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:3000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

### Custom Hooks

#### useDepartmentTree Hook

```typescript
// src/hooks/useDepartmentTree.ts
import { gql, useQuery } from '@apollo/client';
import { DepartmentTreeNode, DepartmentTreeOptions } from '../types';

const GET_DEPARTMENT_TREE = gql`
  query GetDepartmentHierarchyTree(
    $rootDepartmentId: String!
    $options: DepartmentTreeOptions
  ) {
    getDepartmentHierarchyTree(
      rootDepartmentId: $rootDepartmentId
      options: $options
    ) {
      id
      departmentCode
      departmentName
      level
      relationshipType
      hierarchyId
      children {
        id
        departmentCode
        departmentName
        level
        relationshipType
        hierarchyId
        children {
          id
          departmentCode
          departmentName
          level
        }
      }
    }
  }
`;

export const useDepartmentTree = (
  rootDepartmentId?: string,
  options?: DepartmentTreeOptions
) => {
  const { data, loading, error, refetch } = useQuery<{
    getDepartmentHierarchyTree: DepartmentTreeNode;
  }>(GET_DEPARTMENT_TREE, {
    variables: { rootDepartmentId, options },
    skip: !rootDepartmentId,
  });

  return {
    tree: data?.getDepartmentHierarchyTree,
    loading,
    error,
    refetch,
  };
};
```

#### useCompleteDepartmentStructure Hook

```typescript
// src/hooks/useCompleteDepartmentStructure.ts
import { gql, useQuery } from '@apollo/client';
import { DepartmentTreeNode, DepartmentTreeOptions } from '../types';

const GET_COMPLETE_STRUCTURE = gql`
  query GetCompleteDepartmentStructure($options: DepartmentTreeOptions) {
    getCompleteDepartmentStructure(options: $options) {
      id
      departmentCode
      departmentName
      level
      children {
        id
        departmentCode
        departmentName
        level
        children {
          id
          departmentCode
          departmentName
          level
        }
      }
    }
  }
`;

export const useCompleteDepartmentStructure = (options?: DepartmentTreeOptions) => {
  const { data, loading, error, refetch } = useQuery<{
    getCompleteDepartmentStructure: DepartmentTreeNode[];
  }>(GET_COMPLETE_STRUCTURE, {
    variables: { options },
  });

  return {
    departments: data?.getCompleteDepartmentStructure ?? [],
    loading,
    error,
    refetch,
  };
};
```

#### useDepartmentAncestors Hook

```typescript
// src/hooks/useDepartmentAncestors.ts
import { gql, useQuery } from '@apollo/client';
import { DepartmentAncestor } from '../types';

const GET_ANCESTORS = gql`
  query GetDepartmentAncestors(
    $departmentId: String!
    $relationshipTypes: [String!]
  ) {
    getDepartmentAncestors(
      departmentId: $departmentId
      relationshipTypes: $relationshipTypes
    ) {
      id
      departmentCode
      departmentName
      level
      relationshipType
      hierarchyId
      distance
    }
  }
`;

export const useDepartmentAncestors = (
  departmentId?: string,
  relationshipTypes?: string[]
) => {
  const { data, loading, error, refetch } = useQuery<{
    getDepartmentAncestors: DepartmentAncestor[];
  }>(GET_ANCESTORS, {
    variables: { departmentId, relationshipTypes },
    skip: !departmentId,
  });

  return {
    ancestors: data?.getDepartmentAncestors ?? [],
    loading,
    error,
    refetch,
  };
};
```

#### useDepartmentDescendants Hook

```typescript
// src/hooks/useDepartmentDescendants.ts
import { gql, useQuery } from '@apollo/client';
import { DepartmentDescendant } from '../types';

const GET_DESCENDANTS = gql`
  query GetDepartmentDescendants(
    $departmentId: String!
    $maxDepth: Int
    $relationshipTypes: [String!]
  ) {
    getDepartmentDescendants(
      departmentId: $departmentId
      maxDepth: $maxDepth
      relationshipTypes: $relationshipTypes
    ) {
      id
      departmentCode
      departmentName
      level
      relationshipType
      hierarchyId
      distance
      path
    }
  }
`;

export const useDepartmentDescendants = (
  departmentId?: string,
  maxDepth = 5,
  relationshipTypes?: string[]
) => {
  const { data, loading, error, refetch } = useQuery<{
    getDepartmentDescendants: DepartmentDescendant[];
  }>(GET_DESCENDANTS, {
    variables: { departmentId, maxDepth, relationshipTypes },
    skip: !departmentId,
  });

  return {
    descendants: data?.getDepartmentDescendants ?? [],
    loading,
    error,
    refetch,
  };
};
```

#### useHierarchyStatistics Hook

```typescript
// src/hooks/useHierarchyStatistics.ts
import { gql, useQuery } from '@apollo/client';
import { HierarchyStatistics } from '../types';

const GET_HIERARCHY_STATS = gql`
  query GetHierarchyStatistics {
    getHierarchyStatistics {
      totalHierarchies
      activeHierarchies
      maxDepth
      averageDepth
      orphanedDepartments
      circularReferences
    }
  }
`;

export const useHierarchyStatistics = () => {
  const { data, loading, error, refetch } = useQuery<{
    getHierarchyStatistics: HierarchyStatistics;
  }>(GET_HIERARCHY_STATS);

  return {
    stats: data?.getHierarchyStatistics,
    loading,
    error,
    refetch,
  };
};
```

#### useDepartmentHierarchy Hook (Mutations)

```typescript
// src/hooks/useDepartmentHierarchy.ts
import { gql, useMutation } from '@apollo/client';
import {
  CreateDepartmentHierarchyInput,
  UpdateDepartmentHierarchyInput,
  CreateDepartmentHierarchyResponse,
  UpdateDepartmentHierarchyResponse,
} from '../types';

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
      hierarchyId
      error
    }
  }
`;

export const useDepartmentHierarchy = () => {
  const [createHierarchy, { loading: creating }] = useMutation<
    { createDepartmentHierarchy: CreateDepartmentHierarchyResponse },
    { input: CreateDepartmentHierarchyInput }
  >(CREATE_HIERARCHY, {
    refetchQueries: [
      'GetCompleteDepartmentStructure',
      'GetHierarchyStatistics',
    ],
  });

  const [updateHierarchy, { loading: updating }] = useMutation<
    { updateDepartmentHierarchy: UpdateDepartmentHierarchyResponse },
    { input: UpdateDepartmentHierarchyInput }
  >(UPDATE_HIERARCHY, {
    refetchQueries: [
      'GetCompleteDepartmentStructure',
      'GetDepartmentHierarchyTree',
    ],
  });

  return {
    createHierarchy,
    creating,
    updateHierarchy,
    updating,
  };
};
```

### Component Examples

#### DepartmentTreeView Component

```tsx
// src/components/DepartmentTreeView.tsx
import React, { useState } from 'react';
import { useCompleteDepartmentStructure } from '../hooks/useCompleteDepartmentStructure';
import { DepartmentTreeNode } from '../types';

type TreeNodeProps = {
  node: DepartmentTreeNode;
  onSelect?: (node: DepartmentTreeNode) => void;
  selectedId?: string;
};

const TreeNode: React.FC<TreeNodeProps> = ({ node, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div className="tree-node" style={{ marginLeft: node.level * 20 }}>
      <div
        className={`node-content ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect?.(node)}
      >
        {hasChildren && (
          <button
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        <span className="node-icon">
          {node.level === 0 ? '🏢' : '👥'}
        </span>
        <span className="node-name">{node.departmentName}</span>
        <span className="node-code">({node.departmentCode})</span>
      </div>

      {hasChildren && expanded && (
        <div className="children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

type DepartmentTreeViewProps = {
  onSelect?: (node: DepartmentTreeNode) => void;
};

export const DepartmentTreeView: React.FC<DepartmentTreeViewProps> = ({
  onSelect,
}) => {
  const { departments, loading, error } = useCompleteDepartmentStructure({
    maxDepth: 10,
    includeInactive: false,
    sortBy: 'DISPLAY_ORDER',
    sortDirection: 'ASC',
  });

  const [selectedId, setSelectedId] = useState<string>();

  const handleSelect = (node: DepartmentTreeNode) => {
    setSelectedId(node.id);
    onSelect?.(node);
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error">Lỗi: {error.message}</div>;

  return (
    <div className="department-tree-view">
      <h3>Cấu trúc phòng ban</h3>
      {departments.map((dept) => (
        <TreeNode
          key={dept.id}
          node={dept}
          onSelect={handleSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
};
```

#### DepartmentBreadcrumb Component

```tsx
// src/components/DepartmentBreadcrumb.tsx
import React from 'react';
import { useDepartmentAncestors } from '../hooks/useDepartmentAncestors';

type Props = {
  departmentId: string;
  departmentName: string;
  onNavigate?: (departmentId: string) => void;
};

export const DepartmentBreadcrumb: React.FC<Props> = ({
  departmentId,
  departmentName,
  onNavigate,
}) => {
  const { ancestors, loading } = useDepartmentAncestors(departmentId);

  if (loading) return <div>...</div>;

  // ancestors is returned root-first, so we can use directly
  const breadcrumbItems = [
    ...ancestors.map((a) => ({
      id: a.id,
      name: a.departmentName,
      code: a.departmentCode,
    })),
    { id: departmentId, name: departmentName, code: '' },
  ];

  return (
    <nav className="department-breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <span className="separator"> / </span>}
          {index === breadcrumbItems.length - 1 ? (
            <span className="current">{item.name}</span>
          ) : (
            <button
              className="breadcrumb-link"
              onClick={() => onNavigate?.(item.id)}
            >
              {item.name}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
```

#### HierarchyForm Component

```tsx
// src/components/HierarchyForm.tsx
import React, { useState } from 'react';
import { useDepartmentHierarchy } from '../hooks/useDepartmentHierarchy';
import { RELATIONSHIP_TYPE_OPTIONS } from '../constants';

type Props = {
  parentDepartmentId?: string;
  childDepartmentId?: string;
  isEdit?: boolean;
  onSuccess?: () => void;
};

export const HierarchyForm: React.FC<Props> = ({
  parentDepartmentId,
  childDepartmentId,
  isEdit = false,
  onSuccess,
}) => {
  const { createHierarchy, updateHierarchy, creating, updating } =
    useDepartmentHierarchy();

  const [formData, setFormData] = useState({
    parentDepartmentId: parentDepartmentId ?? '',
    childDepartmentId: childDepartmentId ?? '',
    relationshipType: 'PARENT_CHILD',
    hierarchyLevel: 1,
    inheritsPermissions: true,
    canEscalateToParent: false,
    displayOrder: 0,
    notes: '',
    isActive: true,
  });

  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    try {
      if (isEdit) {
        const { data } = await updateHierarchy({
          variables: {
            input: {
              childDepartmentId: formData.childDepartmentId,
              parentDepartmentId: formData.parentDepartmentId || undefined,
              relationshipType: formData.relationshipType as any,
              hierarchyLevel: formData.hierarchyLevel,
              inheritsPermissions: formData.inheritsPermissions,
              canEscalateToParent: formData.canEscalateToParent,
              displayOrder: formData.displayOrder,
              notes: formData.notes || undefined,
              isActive: formData.isActive,
            },
          },
        });

        if (data?.updateDepartmentHierarchy.success) {
          onSuccess?.();
        } else {
          setError(data?.updateDepartmentHierarchy.error ?? 'Unknown error');
        }
      } else {
        const { data } = await createHierarchy({
          variables: {
            input: {
              parentDepartmentId: formData.parentDepartmentId,
              childDepartmentId: formData.childDepartmentId,
              relationshipType: formData.relationshipType as any,
              hierarchyLevel: formData.hierarchyLevel,
              inheritsPermissions: formData.inheritsPermissions,
              canEscalateToParent: formData.canEscalateToParent,
              displayOrder: formData.displayOrder,
              notes: formData.notes || undefined,
              isActive: formData.isActive,
            },
          },
        });

        if (data?.createDepartmentHierarchy.success) {
          onSuccess?.();
        } else {
          setError(data?.createDepartmentHierarchy.error ?? 'Unknown error');
        }
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="hierarchy-form">
      <h3>{isEdit ? 'Cập nhật Hierarchy' : 'Tạo Hierarchy'}</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Parent Department ID *</label>
        <input
          value={formData.parentDepartmentId}
          onChange={(e) =>
            setFormData({ ...formData, parentDepartmentId: e.target.value })
          }
          required={!isEdit}
          disabled={isEdit}
        />
      </div>

      <div className="form-group">
        <label>Child Department ID *</label>
        <input
          value={formData.childDepartmentId}
          onChange={(e) =>
            setFormData({ ...formData, childDepartmentId: e.target.value })
          }
          required
          disabled={isEdit}
        />
      </div>

      <div className="form-group">
        <label>Relationship Type</label>
        <select
          value={formData.relationshipType}
          onChange={(e) =>
            setFormData({ ...formData, relationshipType: e.target.value })
          }
        >
          {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} - {opt.description}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Hierarchy Level</label>
        <input
          type="number"
          min={0}
          max={10}
          value={formData.hierarchyLevel}
          onChange={(e) =>
            setFormData({ ...formData, hierarchyLevel: parseInt(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label>Display Order</label>
        <input
          type="number"
          min={0}
          value={formData.displayOrder}
          onChange={(e) =>
            setFormData({ ...formData, displayOrder: parseInt(e.target.value) })
          }
        />
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={formData.inheritsPermissions}
            onChange={(e) =>
              setFormData({ ...formData, inheritsPermissions: e.target.checked })
            }
          />
          Inherits Permissions
        </label>

        <label>
          <input
            type="checkbox"
            checked={formData.canEscalateToParent}
            onChange={(e) =>
              setFormData({ ...formData, canEscalateToParent: e.target.checked })
            }
          />
          Can Escalate to Parent
        </label>

        <label>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked })
            }
          />
          Active
        </label>
      </div>

      <button type="submit" disabled={creating || updating}>
        {creating || updating ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
      </button>
    </form>
  );
};
```

#### HierarchyStatsDashboard Component

```tsx
// src/components/HierarchyStatsDashboard.tsx
import React from 'react';
import { useHierarchyStatistics } from '../hooks/useHierarchyStatistics';

export const HierarchyStatsDashboard: React.FC = () => {
  const { stats, loading, error } = useHierarchyStatistics();

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error.message}</div>;
  if (!stats) return null;

  return (
    <div className="hierarchy-stats-dashboard">
      <h3>Thống kê cấu trúc phòng ban</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalHierarchies}</div>
          <div className="stat-label">Tổng số Hierarchies</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.activeHierarchies}</div>
          <div className="stat-label">Hierarchies Active</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.maxDepth}</div>
          <div className="stat-label">Độ sâu tối đa</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.averageDepth.toFixed(1)}</div>
          <div className="stat-label">Độ sâu trung bình</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-value">{stats.orphanedDepartments}</div>
          <div className="stat-label">Phòng ban mồ côi</div>
        </div>

        <div className="stat-card danger">
          <div className="stat-value">{stats.circularReferences}</div>
          <div className="stat-label">Tham chiếu vòng</div>
        </div>
      </div>
    </div>
  );
};
```

---

## Error Handling

### Common Error Codes

| Error | Description | Solution |
|-------|-------------|----------|
| `DEPARTMENT_NOT_FOUND` | Department ID không tồn tại | Kiểm tra lại department ID |
| `HIERARCHY_NOT_FOUND` | Hierarchy không tồn tại | Tạo hierarchy trước khi update |
| `CIRCULAR_REFERENCE` | Di chuyển gây vòng lặp | Không thể đặt parent dưới child |
| `HIERARCHY_ALREADY_EXISTS` | Hierarchy đã tồn tại | Sử dụng update thay vì create |
| `INVALID_RELATIONSHIP_TYPE` | Loại relationship không hợp lệ | Sử dụng giá trị enum đúng |
| `UNAUTHORIZED` | Token expired/invalid | Đăng nhập lại |

### Error Handler Utility

```typescript
// src/utils/departmentErrorHandler.ts
type GraphQLError = {
  message: string;
  extensions?: {
    code?: string;
  };
};

type ErrorResult = {
  message: string;
  code: string;
  isRetryable: boolean;
};

const ERROR_MAP: Record<string, { message: string; isRetryable: boolean }> = {
  DEPARTMENT_NOT_FOUND: {
    message: 'Không tìm thấy phòng ban',
    isRetryable: false,
  },
  HIERARCHY_NOT_FOUND: {
    message: 'Không tìm thấy hierarchy',
    isRetryable: false,
  },
  CIRCULAR_REFERENCE: {
    message: 'Không thể di chuyển phòng ban vào nhánh con của nó',
    isRetryable: false,
  },
  HIERARCHY_ALREADY_EXISTS: {
    message: 'Hierarchy đã tồn tại',
    isRetryable: false,
  },
  INVALID_RELATIONSHIP_TYPE: {
    message: 'Loại quan hệ không hợp lệ',
    isRetryable: false,
  },
  UNAUTHORIZED: {
    message: 'Phiên đăng nhập hết hạn',
    isRetryable: true,
  },
  NETWORK_ERROR: {
    message: 'Lỗi kết nối mạng',
    isRetryable: true,
  },
};

export const handleDepartmentError = (errors: GraphQLError[]): ErrorResult => {
  const error = errors[0];
  const code = error.extensions?.code ?? 'UNKNOWN_ERROR';

  return {
    message: ERROR_MAP[code]?.message ?? error.message,
    code,
    isRetryable: ERROR_MAP[code]?.isRetryable ?? false,
  };
};
```

---

## Best Practices

### 1. Cache Management

```typescript
// Invalidate cache after mutations
const [createHierarchy] = useMutation(CREATE_HIERARCHY, {
  update(cache) {
    // Evict related queries
    cache.evict({ fieldName: 'getCompleteDepartmentStructure' });
    cache.evict({ fieldName: 'getHierarchyStatistics' });
    cache.evict({ fieldName: 'getDepartmentHierarchyTree' });
    cache.gc();
  },
});
```

### 2. Optimistic Updates for Tree

```typescript
const [updateHierarchy] = useMutation(UPDATE_HIERARCHY, {
  optimisticResponse: {
    updateDepartmentHierarchy: {
      __typename: 'UpdateDepartmentHierarchyResponse',
      success: true,
      departmentId: childDepartmentId,
      hierarchyId: hierarchyId,
      error: null,
    },
  },
});
```

### 3. Tree Data Transformation

```typescript
// src/utils/treeUtils.ts

// Flatten tree to array
export const flattenTree = (
  nodes: DepartmentTreeNode[],
  result: DepartmentTreeNode[] = []
): DepartmentTreeNode[] => {
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) {
      flattenTree(node.children, result);
    }
  }
  return result;
};

// Find node in tree
export const findNodeInTree = (
  nodes: DepartmentTreeNode[],
  id: string
): DepartmentTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Get all leaf nodes
export const getLeafNodes = (
  nodes: DepartmentTreeNode[]
): DepartmentTreeNode[] => {
  const leaves: DepartmentTreeNode[] = [];

  const traverse = (node: DepartmentTreeNode) => {
    if (!node.children?.length) {
      leaves.push(node);
    } else {
      node.children.forEach(traverse);
    }
  };

  nodes.forEach(traverse);
  return leaves;
};

// Build path from root to node
export const buildPathToNode = (
  ancestors: DepartmentAncestor[],
  currentNode: { id: string; departmentName: string }
): string[] => {
  return [
    ...ancestors.map((a) => a.departmentName),
    currentNode.departmentName,
  ];
};
```

### 4. Drag and Drop Support

```typescript
// src/hooks/useDepartmentDragDrop.ts
import { useDepartmentHierarchy } from './useDepartmentHierarchy';

export const useDepartmentDragDrop = () => {
  const { updateHierarchy, updating } = useDepartmentHierarchy();

  const handleDrop = async (
    draggedId: string,
    targetId: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Prevent dropping on self
    if (draggedId === targetId) {
      return { success: false, error: 'Cannot drop on itself' };
    }

    try {
      const { data } = await updateHierarchy({
        variables: {
          input: {
            childDepartmentId: draggedId,
            parentDepartmentId: targetId,
          },
        },
      });

      if (data?.updateDepartmentHierarchy.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: data?.updateDepartmentHierarchy.error,
        };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  return {
    handleDrop,
    isDropping: updating,
  };
};
```

### 5. Search in Tree

```typescript
// src/utils/treeSearch.ts
export const searchInTree = (
  nodes: DepartmentTreeNode[],
  query: string
): DepartmentTreeNode[] => {
  const lowerQuery = query.toLowerCase();
  const results: DepartmentTreeNode[] = [];

  const search = (node: DepartmentTreeNode) => {
    const matchesName = node.departmentName.toLowerCase().includes(lowerQuery);
    const matchesCode = node.departmentCode.toLowerCase().includes(lowerQuery);

    if (matchesName || matchesCode) {
      results.push(node);
    }

    node.children?.forEach(search);
  };

  nodes.forEach(search);
  return results;
};
```

---

## Appendix: Full API Reference Table

| Category | Operation | Type | Endpoint |
|----------|-----------|------|----------|
| **Tree Queries** | Get Hierarchy Tree | Query | `getDepartmentHierarchyTree(rootDepartmentId, options?)` |
| | Get Subtree | Query | `getDepartmentSubtree(departmentId, options?)` |
| | Get Forest | Query | `getDepartmentForest(rootIds, options?)` |
| | Get Complete Structure | Query | `getCompleteDepartmentStructure(options?)` |
| **Navigation** | Get Ancestors | Query | `getDepartmentAncestors(departmentId, relationshipTypes?)` |
| | Get Descendants | Query | `getDepartmentDescendants(departmentId, maxDepth?, relationshipTypes?)` |
| **Statistics** | Get Stats | Query | `getHierarchyStatistics` |
| **Hierarchy Mutations** | Create | Mutation | `createDepartmentHierarchy(input)` |
| | Update | Mutation | `updateDepartmentHierarchy(input)` |
| **Auto-generated** | Find Many | Query | `mktDepartments(filter?, orderBy?)` |
| | Find One | Query | `mktDepartment(id)` |
| | Create | Mutation | `createMktDepartment(data)` |
| | Update | Mutation | `updateMktDepartment(id, data)` |
| | Delete | Mutation | `deleteMktDepartment(id)` |

---

## Test Data Reference

### Root Departments (DEPARTMENT type)
| ID | Code | Name |
|----|------|------|
| `ad95f81e-bda5-4a98-b72a-880c0b5c204c` | SALES | Nhân viên kinh doanh |
| `e4fd8648-3739-4fec-8e37-44c90ee54a0c` | TECH | Phòng công nghệ |
| `7d95bc7c-0e33-4514-9f77-143e98affdf6` | SUPPORT | Bộ phận hỗ trợ |
| `5ee8a0af-2aef-4eb4-865c-d4bc143ee97b` | ACCOUNTING | Phòng kế toán |
| `00b72fe7-77d0-429c-87b9-d88b671ea502` | HR | Phòng nhân sự |

### Team Departments (TEAM type)
| ID | Code | Parent |
|----|------|--------|
| `566d23d5-1498-4f7f-b61e-a7101772344a` | SALES_DOMESTIC | SALES |
| `e1d75cc3-fd9c-4664-b921-a407b990fb81` | SALES_INTERNATIONAL | SALES |
| `9f9c5ea1-9f04-4f30-9a4d-e0cd8881064b` | TECH_BACKEND | TECH |

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-23
**Author:** CRM Development Team
