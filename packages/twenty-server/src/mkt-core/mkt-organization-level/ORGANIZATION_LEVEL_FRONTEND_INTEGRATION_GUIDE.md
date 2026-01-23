# Organization Level Module - Frontend Integration Guide

> Tài liệu hướng dẫn tích hợp API Organization Level Module cho phía Frontend (React + Apollo Client)

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
Organization Level Module
├── OrganizationLevelMutationResolver  # 3 custom mutations (create, update, delete)
├── OrganizationLevelQueryResolver     # 3 queries (hierarchy, statistics, path)
└── OrganizationLevelBlockHook         # Blocks auto-generated mutations
```

### Important Notes

**Auto-generated mutations are BLOCKED.** Sử dụng các custom resolvers:
- ❌ `createMktOrganizationLevel` → Blocked
- ❌ `updateMktOrganizationLevel` → Blocked
- ❌ `deleteMktOrganizationLevel` → Blocked

**Use custom resolvers instead:**
- ✅ `createOrganizationLevel`
- ✅ `updateOrganizationLevel`
- ✅ `deleteOrganizationLevel`

### Hierarchy Structure (11 Levels)

```
Level 1-3: EXECUTIVE (ALL DEPARTMENTS access)
├── Level 1: CEO - Tổng Giám Đốc
├── Level 2: C_LEVEL - Giám đốc điều hành (CFO, CTO, COO)
└── Level 3: VP - Phó Tổng Giám Đốc

Level 4-6: DIRECTOR (OWN + CHILD DEPARTMENTS access)
├── Level 4: SENIOR_DIRECTOR - Giám đốc cấp cao
├── Level 5: DIRECTOR - Giám đốc
└── Level 6: SENIOR_MANAGER - Quản lý cấp cao

Level 7: MANAGER (OWN DEPARTMENT + TEAM access)
└── Level 7: MANAGER - Quản lý

Level 8-11: STAFF (OWN RECORDS only)
├── Level 8: SENIOR_SPECIALIST - Chuyên viên cao cấp
├── Level 9: SPECIALIST - Chuyên viên
├── Level 10: JUNIOR_SPECIALIST - Chuyên viên sơ cấp
└── Level 11: INTERN - Thực tập sinh
```

---

## TypeScript Types

### Core Types

```typescript
// ============================================
// ORGANIZATION LEVEL TYPES
// ============================================

type OrganizationLevel = {
  id: string;
  levelCode: string;
  levelName: string;
  levelNameEn?: string;
  description?: string;
  hierarchyLevel: number;           // 1-11 (or max 8 for custom levels)
  parentLevelId?: string | null;
  displayOrder: number;
  isActive: boolean;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  // Relations
  parentLevel?: OrganizationLevel | null;
  children?: OrganizationLevel[];
};

type OrganizationLevelHierarchyNode = {
  id: string;
  levelCode: string;
  levelName: string;
  levelNameEn?: string;
  hierarchyLevel: number;
  parentLevelId?: string | null;
  isActive: boolean;
  children: OrganizationLevelHierarchyNode[];
};

// ============================================
// STATISTICS TYPES
// ============================================

type OrganizationLevelStatistics = {
  totalLevels: number;
  activeLevels: number;
  maxHierarchyDepth: number;
  rootLevelsCount: number;
  totalEmployees: number;
  activeEmployees: number;
};

// ============================================
// PATH TYPES
// ============================================

type OrganizationLevelPathNode = {
  id: string;
  levelCode: string;
  levelName: string;
  hierarchyLevel: number;
};
```

### Input Types

```typescript
// ============================================
// MUTATION INPUTS
// ============================================

type CreateOrganizationLevelInput = {
  levelCode: string;                // Required, unique
  levelName: string;                // Required
  levelNameEn?: string;
  description?: string;
  hierarchyLevel: number;           // Required, 1-8
  parentLevelId?: string | null;    // Required for levels > 1
  displayOrder?: number;
  isActive?: boolean;               // Default: true
  position?: number;
};

type UpdateOrganizationLevelInput = {
  levelCode?: string;
  levelName?: string;
  levelNameEn?: string;
  description?: string;
  hierarchyLevel?: number;          // Cannot change to 1 if has parent
  parentLevelId?: string | null;    // Level 1 cannot have parent
  displayOrder?: number;
  isActive?: boolean;               // Cannot deactivate if has active children
  position?: number;
};

type DeleteOrganizationLevelInput = {
  id: string;                       // Required
};

// ============================================
// QUERY OPTIONS
// ============================================

type OrganizationLevelQueryOptions = {
  includeInactive?: boolean;        // Default: false
  maxDepth?: number;                // Default: 12
};
```

### Output Types

```typescript
// ============================================
// MUTATION RESPONSES
// ============================================

type OrganizationLevelMutationOutput = {
  success: boolean;
  organizationLevelId?: string;
  error?: string;
};

type DeleteOrganizationLevelOutput = {
  success: boolean;
  error?: string;
};

// ============================================
// QUERY RESPONSES
// ============================================

type OrganizationLevelHierarchyOutput = OrganizationLevelHierarchyNode[];

type OrganizationLevelPathOutput = OrganizationLevelPathNode[];
```

---

## Constants & Enums

### Organization Level Codes

```typescript
const ORGANIZATION_LEVEL_CODE = {
  // Executive levels (1-3) - ALL DEPARTMENTS access
  CEO: 'CEO',
  C_LEVEL: 'C_LEVEL',
  VP: 'VP',

  // Director levels (4-6) - OWN + CHILD DEPARTMENTS access
  SENIOR_DIRECTOR: 'SENIOR_DIRECTOR',
  DIRECTOR: 'DIRECTOR',
  SENIOR_MANAGER: 'SENIOR_MANAGER',

  // Manager level (7) - OWN DEPARTMENT + TEAM access
  MANAGER: 'MANAGER',

  // Staff levels (8-11) - OWN RECORDS only
  SENIOR_SPECIALIST: 'SENIOR_SPECIALIST',
  SPECIALIST: 'SPECIALIST',
  JUNIOR_SPECIALIST: 'JUNIOR_SPECIALIST',
  INTERN: 'INTERN',
} as const;

type OrganizationLevelCode =
  (typeof ORGANIZATION_LEVEL_CODE)[keyof typeof ORGANIZATION_LEVEL_CODE];
```

### Organization Level IDs (Seed Data)

```typescript
const ORGANIZATION_LEVEL_IDS = {
  CEO: '74828328-443b-416b-bbb3-fd6db70113ad',
  C_LEVEL: '52c3b3e3-cb9f-412a-9c75-dc64fe42d80c',
  VP: '7db8c6b1-efa5-4bbb-aeaa-42e15e19584f',
  SENIOR_DIRECTOR: '1841cee2-9046-49a6-8daf-8923aa7f5977',
  DIRECTOR: 'fdfac45c-6983-4d39-885b-9993d469373a',
  SENIOR_MANAGER: '976a15c6-19f6-4563-a5f0-b78e32fba082',
  MANAGER: '6edbc87b-c9db-45f2-b41f-3374ed9e3f41',
  SENIOR_SPECIALIST: '0b69ad8b-2a17-4459-ae59-1965f4c35e4d',
  SPECIALIST: '72f13ce6-c312-46d2-badc-6393e4cfc928',
  JUNIOR_SPECIALIST: '8f8a7ff9-747d-4662-af00-b15892e0e99e',
  INTERN: '2fbe024e-e64a-4f67-95fb-5371d612e22c',
} as const;
```

### Organization Level Options (for UI)

```typescript
const ORGANIZATION_LEVEL_OPTIONS = [
  { value: 'CEO', label: 'Tổng Giám Đốc', labelEn: 'CEO', level: 1, color: 'purple' },
  { value: 'C_LEVEL', label: 'Giám đốc điều hành', labelEn: 'C-Suite', level: 2, color: 'purple' },
  { value: 'VP', label: 'Phó Tổng Giám Đốc', labelEn: 'Vice President', level: 3, color: 'purple' },
  { value: 'SENIOR_DIRECTOR', label: 'Giám đốc cấp cao', labelEn: 'Senior Director', level: 4, color: 'blue' },
  { value: 'DIRECTOR', label: 'Giám đốc', labelEn: 'Director', level: 5, color: 'blue' },
  { value: 'SENIOR_MANAGER', label: 'Quản lý cấp cao', labelEn: 'Senior Manager', level: 6, color: 'blue' },
  { value: 'MANAGER', label: 'Quản lý', labelEn: 'Manager', level: 7, color: 'green' },
  { value: 'SENIOR_SPECIALIST', label: 'Chuyên viên cao cấp', labelEn: 'Senior Specialist', level: 8, color: 'gray' },
  { value: 'SPECIALIST', label: 'Chuyên viên', labelEn: 'Specialist', level: 9, color: 'gray' },
  { value: 'JUNIOR_SPECIALIST', label: 'Chuyên viên sơ cấp', labelEn: 'Junior Specialist', level: 10, color: 'gray' },
  { value: 'INTERN', label: 'Thực tập sinh', labelEn: 'Intern', level: 11, color: 'gray' },
];

const HIERARCHY_LEVEL_COLORS = {
  executive: 'purple',     // Level 1-3
  director: 'blue',        // Level 4-6
  manager: 'green',        // Level 7
  staff: 'gray',           // Level 8-11
} as const;
```

### Data Access Scope

```typescript
const DATA_ACCESS_SCOPE = {
  ALL_DEPARTMENTS: 'ALL_DEPARTMENTS',
  OWN_AND_CHILD_DEPARTMENTS: 'OWN_AND_CHILD_DEPARTMENTS',
  OWN_DEPARTMENT_AND_TEAM: 'OWN_DEPARTMENT_AND_TEAM',
  OWN_RECORDS: 'OWN_RECORDS',
} as const;

// Map hierarchy level to data access scope
const getDataAccessScope = (hierarchyLevel: number): string => {
  if (hierarchyLevel <= 3) return DATA_ACCESS_SCOPE.ALL_DEPARTMENTS;
  if (hierarchyLevel <= 6) return DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS;
  if (hierarchyLevel === 7) return DATA_ACCESS_SCOPE.OWN_DEPARTMENT_AND_TEAM;
  return DATA_ACCESS_SCOPE.OWN_RECORDS;
};
```

### Validation Constants

```typescript
const ORGANIZATION_LEVEL_CONSTRAINTS = {
  MAX_HIERARCHY_LEVEL: 8,           // Custom levels capped at 8
  MIN_HIERARCHY_LEVEL: 1,
  MAX_CODE_LENGTH: 50,
  MAX_NAME_LENGTH: 255,
} as const;
```

---

## GraphQL Operations

### 1. Query Operations

#### Get Organization Level Hierarchy

```graphql
query GetOrganizationLevelHierarchy($options: OrganizationLevelQueryOptions) {
  getOrganizationLevelHierarchy(options: $options) {
    id
    levelCode
    levelName
    levelNameEn
    hierarchyLevel
    parentLevelId
    isActive
    children {
      id
      levelCode
      levelName
      hierarchyLevel
      isActive
      children {
        id
        levelCode
        levelName
        hierarchyLevel
        isActive
      }
    }
  }
}
```

**Variables:**
```json
{
  "options": {
    "includeInactive": true,
    "maxDepth": 12
  }
}
```

**Response Example:**
```json
{
  "data": {
    "getOrganizationLevelHierarchy": [
      {
        "id": "74828328-443b-416b-bbb3-fd6db70113ad",
        "levelCode": "CEO",
        "levelName": "Tổng Giám Đốc",
        "levelNameEn": "Chief Executive Officer",
        "hierarchyLevel": 1,
        "parentLevelId": null,
        "isActive": true,
        "children": [
          {
            "id": "52c3b3e3-cb9f-412a-9c75-dc64fe42d80c",
            "levelCode": "C_LEVEL",
            "levelName": "Giám đốc điều hành",
            "hierarchyLevel": 2,
            "isActive": true,
            "children": [...]
          }
        ]
      }
    ]
  }
}
```

#### Get Organization Level Statistics

```graphql
query GetOrganizationLevelStatistics {
  getOrganizationLevelStatistics {
    totalLevels
    activeLevels
    maxHierarchyDepth
    rootLevelsCount
    totalEmployees
    activeEmployees
  }
}
```

**Response Example:**
```json
{
  "data": {
    "getOrganizationLevelStatistics": {
      "totalLevels": 11,
      "activeLevels": 11,
      "maxHierarchyDepth": 11,
      "rootLevelsCount": 1,
      "totalEmployees": 4,
      "activeEmployees": 4
    }
  }
}
```

#### Get Organization Level Path

```graphql
query GetOrganizationLevelPath($levelId: String!) {
  getOrganizationLevelPath(levelId: $levelId) {
    id
    levelCode
    levelName
    hierarchyLevel
  }
}
```

**Variables:**
```json
{
  "levelId": "6edbc87b-c9db-45f2-b41f-3374ed9e3f41"
}
```

**Response Example (Path for MANAGER):**
```json
{
  "data": {
    "getOrganizationLevelPath": [
      { "id": "74828328-...", "levelCode": "CEO", "levelName": "Tổng Giám Đốc", "hierarchyLevel": 1 },
      { "id": "52c3b3e3-...", "levelCode": "C_LEVEL", "levelName": "Giám đốc điều hành", "hierarchyLevel": 2 },
      { "id": "7db8c6b1-...", "levelCode": "VP", "levelName": "Phó Tổng Giám Đốc", "hierarchyLevel": 3 },
      { "id": "1841cee2-...", "levelCode": "SENIOR_DIRECTOR", "levelName": "Giám đốc cấp cao", "hierarchyLevel": 4 },
      { "id": "fdfac45c-...", "levelCode": "DIRECTOR", "levelName": "Giám đốc", "hierarchyLevel": 5 },
      { "id": "976a15c6-...", "levelCode": "SENIOR_MANAGER", "levelName": "Quản lý cấp cao", "hierarchyLevel": 6 },
      { "id": "6edbc87b-...", "levelCode": "MANAGER", "levelName": "Quản lý", "hierarchyLevel": 7 }
    ]
  }
}
```

### 2. Mutation Operations

#### Create Organization Level

```graphql
mutation CreateOrganizationLevel($input: CreateOrganizationLevelInput!) {
  createOrganizationLevel(input: $input) {
    success
    organizationLevelId
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "levelCode": "TEAM_LEAD",
    "levelName": "Trưởng nhóm",
    "levelNameEn": "Team Lead",
    "description": "Trưởng nhóm - Quản lý nhóm nhỏ",
    "hierarchyLevel": 8,
    "parentLevelId": "6edbc87b-c9db-45f2-b41f-3374ed9e3f41"
  }
}
```

**Success Response:**
```json
{
  "data": {
    "createOrganizationLevel": {
      "success": true,
      "organizationLevelId": "new-uuid-here",
      "error": null
    }
  }
}
```

**Error Response (Duplicate Code):**
```json
{
  "data": {
    "createOrganizationLevel": {
      "success": false,
      "organizationLevelId": null,
      "error": "Organization level with code 'CEO' already exists"
    }
  }
}
```

#### Update Organization Level

```graphql
mutation UpdateOrganizationLevel($id: String!, $input: UpdateOrganizationLevelInput!) {
  updateOrganizationLevel(id: $id, input: $input) {
    success
    error
  }
}
```

**Variables:**
```json
{
  "id": "74828328-443b-416b-bbb3-fd6db70113ad",
  "input": {
    "levelName": "Tổng Giám Đốc (CEO)",
    "description": "Cấp cao nhất trong tổ chức"
  }
}
```

**Success Response:**
```json
{
  "data": {
    "updateOrganizationLevel": {
      "success": true,
      "error": null
    }
  }
}
```

**Error Response (Deactivate with Active Children):**
```json
{
  "data": {
    "updateOrganizationLevel": {
      "success": false,
      "error": "Cannot deactivate organization level: it has active child levels. Please deactivate child levels first."
    }
  }
}
```

#### Delete Organization Level

```graphql
mutation DeleteOrganizationLevel($input: DeleteOrganizationLevelInput!) {
  deleteOrganizationLevel(input: $input) {
    success
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "2fbe024e-e64a-4f67-95fb-5371d612e22c"
  }
}
```

**Success Response:**
```json
{
  "data": {
    "deleteOrganizationLevel": {
      "success": true,
      "error": null
    }
  }
}
```

**Error Response (Has Children):**
```json
{
  "data": {
    "deleteOrganizationLevel": {
      "success": false,
      "error": "Cannot delete organization level: it has 1 child level(s): Giám đốc điều hành. Please delete or reassign child levels first."
    }
  }
}
```

### 3. Blocked Operations (DO NOT USE)

These auto-generated mutations are blocked by the system:

```graphql
# ❌ BLOCKED - Will return error
mutation CreateMktOrganizationLevel($data: mktOrganizationLevelCreateInput!) {
  createMktOrganizationLevel(data: $data) {
    id
    levelCode
  }
}

# ❌ BLOCKED - Will return error
mutation UpdateMktOrganizationLevel($idToUpdate: ID!, $data: mktOrganizationLevelUpdateInput!) {
  updateMktOrganizationLevel(id: $idToUpdate, data: $data) {
    id
    levelName
  }
}

# ❌ BLOCKED - Will return error
mutation DeleteMktOrganizationLevel($idToDelete: ID!) {
  deleteMktOrganizationLevel(id: $idToDelete) {
    id
  }
}
```

**Blocked Response:**
```json
{
  "errors": [{
    "message": "Direct mutations are disabled. Use OrganizationLevelMutationResolver instead (createOrganizationLevel, updateOrganizationLevel, deleteOrganizationLevel)"
  }]
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

#### useOrganizationLevelHierarchy Hook

```typescript
// src/hooks/useOrganizationLevelHierarchy.ts
import { gql, useQuery } from '@apollo/client';

const GET_HIERARCHY = gql`
  query GetOrganizationLevelHierarchy($options: OrganizationLevelQueryOptions) {
    getOrganizationLevelHierarchy(options: $options) {
      id
      levelCode
      levelName
      levelNameEn
      hierarchyLevel
      parentLevelId
      isActive
      children {
        id
        levelCode
        levelName
        hierarchyLevel
        isActive
        children {
          id
          levelCode
          levelName
          hierarchyLevel
          isActive
        }
      }
    }
  }
`;

type UseOrganizationLevelHierarchyOptions = {
  includeInactive?: boolean;
  maxDepth?: number;
};

export const useOrganizationLevelHierarchy = (options?: UseOrganizationLevelHierarchyOptions) => {
  const { data, loading, error, refetch } = useQuery(GET_HIERARCHY, {
    variables: {
      options: {
        includeInactive: options?.includeInactive ?? false,
        maxDepth: options?.maxDepth ?? 12,
      },
    },
  });

  return {
    hierarchy: data?.getOrganizationLevelHierarchy ?? [],
    loading,
    error,
    refetch,
  };
};
```

#### useOrganizationLevelStatistics Hook

```typescript
// src/hooks/useOrganizationLevelStatistics.ts
import { gql, useQuery } from '@apollo/client';

const GET_STATISTICS = gql`
  query GetOrganizationLevelStatistics {
    getOrganizationLevelStatistics {
      totalLevels
      activeLevels
      maxHierarchyDepth
      rootLevelsCount
      totalEmployees
      activeEmployees
    }
  }
`;

export const useOrganizationLevelStatistics = () => {
  const { data, loading, error, refetch } = useQuery(GET_STATISTICS);

  return {
    statistics: data?.getOrganizationLevelStatistics,
    loading,
    error,
    refetch,
  };
};
```

#### useOrganizationLevelPath Hook

```typescript
// src/hooks/useOrganizationLevelPath.ts
import { gql, useQuery } from '@apollo/client';

const GET_PATH = gql`
  query GetOrganizationLevelPath($levelId: String!) {
    getOrganizationLevelPath(levelId: $levelId) {
      id
      levelCode
      levelName
      hierarchyLevel
    }
  }
`;

export const useOrganizationLevelPath = (levelId?: string) => {
  const { data, loading, error } = useQuery(GET_PATH, {
    variables: { levelId },
    skip: !levelId,
  });

  return {
    path: data?.getOrganizationLevelPath ?? [],
    loading,
    error,
  };
};
```

#### useOrganizationLevelMutations Hook

```typescript
// src/hooks/useOrganizationLevelMutations.ts
import { gql, useMutation } from '@apollo/client';

const CREATE_ORGANIZATION_LEVEL = gql`
  mutation CreateOrganizationLevel($input: CreateOrganizationLevelInput!) {
    createOrganizationLevel(input: $input) {
      success
      organizationLevelId
      error
    }
  }
`;

const UPDATE_ORGANIZATION_LEVEL = gql`
  mutation UpdateOrganizationLevel($id: String!, $input: UpdateOrganizationLevelInput!) {
    updateOrganizationLevel(id: $id, input: $input) {
      success
      error
    }
  }
`;

const DELETE_ORGANIZATION_LEVEL = gql`
  mutation DeleteOrganizationLevel($input: DeleteOrganizationLevelInput!) {
    deleteOrganizationLevel(input: $input) {
      success
      error
    }
  }
`;

export const useOrganizationLevelMutations = () => {
  const [createOrganizationLevel, { loading: creating }] = useMutation(
    CREATE_ORGANIZATION_LEVEL,
    { refetchQueries: ['GetOrganizationLevelHierarchy', 'GetOrganizationLevelStatistics'] }
  );

  const [updateOrganizationLevel, { loading: updating }] = useMutation(
    UPDATE_ORGANIZATION_LEVEL,
    { refetchQueries: ['GetOrganizationLevelHierarchy', 'GetOrganizationLevelStatistics'] }
  );

  const [deleteOrganizationLevel, { loading: deleting }] = useMutation(
    DELETE_ORGANIZATION_LEVEL,
    { refetchQueries: ['GetOrganizationLevelHierarchy', 'GetOrganizationLevelStatistics'] }
  );

  return {
    createOrganizationLevel,
    creating,
    updateOrganizationLevel,
    updating,
    deleteOrganizationLevel,
    deleting,
  };
};
```

### Component Examples

#### OrganizationLevelTree Component

```tsx
// src/components/OrganizationLevelTree.tsx
import React from 'react';
import { useOrganizationLevelHierarchy } from '../hooks/useOrganizationLevelHierarchy';

type TreeNodeProps = {
  node: OrganizationLevelHierarchyNode;
  level?: number;
  onSelect?: (node: OrganizationLevelHierarchyNode) => void;
};

const TreeNode: React.FC<TreeNodeProps> = ({ node, level = 0, onSelect }) => {
  const indent = level * 24;
  const color = getHierarchyColor(node.hierarchyLevel);

  return (
    <div>
      <div
        className="tree-node"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => onSelect?.(node)}
      >
        <span className={`badge badge-${color}`}>{node.levelCode}</span>
        <span className="level-name">{node.levelName}</span>
        {!node.isActive && <span className="inactive-badge">Inactive</span>}
      </div>
      {node.children?.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          level={level + 1}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

type OrganizationLevelTreeProps = {
  includeInactive?: boolean;
  onSelect?: (node: OrganizationLevelHierarchyNode) => void;
};

export const OrganizationLevelTree: React.FC<OrganizationLevelTreeProps> = ({
  includeInactive = false,
  onSelect,
}) => {
  const { hierarchy, loading, error } = useOrganizationLevelHierarchy({
    includeInactive,
  });

  if (loading) return <div>Loading organization levels...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (hierarchy.length === 0) return <div>No organization levels found</div>;

  return (
    <div className="organization-level-tree">
      {hierarchy.map((rootNode) => (
        <TreeNode key={rootNode.id} node={rootNode} onSelect={onSelect} />
      ))}
    </div>
  );
};

// Helper function
const getHierarchyColor = (level: number): string => {
  if (level <= 3) return 'purple';
  if (level <= 6) return 'blue';
  if (level === 7) return 'green';
  return 'gray';
};
```

#### OrganizationLevelBreadcrumb Component

```tsx
// src/components/OrganizationLevelBreadcrumb.tsx
import React from 'react';
import { useOrganizationLevelPath } from '../hooks/useOrganizationLevelPath';

type Props = {
  levelId: string;
  separator?: string;
  onClick?: (levelId: string) => void;
};

export const OrganizationLevelBreadcrumb: React.FC<Props> = ({
  levelId,
  separator = ' > ',
  onClick,
}) => {
  const { path, loading, error } = useOrganizationLevelPath(levelId);

  if (loading) return <span>Loading...</span>;
  if (error) return <span>Error loading path</span>;
  if (path.length === 0) return null;

  return (
    <nav className="breadcrumb">
      {path.map((node, index) => (
        <React.Fragment key={node.id}>
          {index > 0 && <span className="separator">{separator}</span>}
          <button
            className={`breadcrumb-item ${index === path.length - 1 ? 'current' : ''}`}
            onClick={() => onClick?.(node.id)}
          >
            {node.levelName}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
```

#### OrganizationLevelForm Component

```tsx
// src/components/OrganizationLevelForm.tsx
import React, { useState, useEffect } from 'react';
import { useOrganizationLevelMutations } from '../hooks/useOrganizationLevelMutations';
import { useOrganizationLevelHierarchy } from '../hooks/useOrganizationLevelHierarchy';
import { ORGANIZATION_LEVEL_CONSTRAINTS } from '../constants';

type Props = {
  editingLevel?: OrganizationLevel;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export const OrganizationLevelForm: React.FC<Props> = ({
  editingLevel,
  onSuccess,
  onCancel,
}) => {
  const { createOrganizationLevel, updateOrganizationLevel, creating, updating } =
    useOrganizationLevelMutations();
  const { hierarchy } = useOrganizationLevelHierarchy({ includeInactive: false });

  const [formData, setFormData] = useState({
    levelCode: editingLevel?.levelCode ?? '',
    levelName: editingLevel?.levelName ?? '',
    levelNameEn: editingLevel?.levelNameEn ?? '',
    description: editingLevel?.description ?? '',
    hierarchyLevel: editingLevel?.hierarchyLevel ?? 2,
    parentLevelId: editingLevel?.parentLevelId ?? '',
    isActive: editingLevel?.isActive ?? true,
  });

  const [error, setError] = useState<string | null>(null);

  // Flatten hierarchy for parent selection
  const flattenLevels = (nodes: OrganizationLevelHierarchyNode[]): OrganizationLevelHierarchyNode[] => {
    const result: OrganizationLevelHierarchyNode[] = [];
    const traverse = (nodeList: OrganizationLevelHierarchyNode[]) => {
      for (const node of nodeList) {
        result.push(node);
        if (node.children) traverse(node.children);
      }
    };
    traverse(nodes);
    return result;
  };

  const availableParents = flattenLevels(hierarchy).filter(
    (level) => level.id !== editingLevel?.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.hierarchyLevel > ORGANIZATION_LEVEL_CONSTRAINTS.MAX_HIERARCHY_LEVEL) {
      setError(`Hierarchy level cannot exceed ${ORGANIZATION_LEVEL_CONSTRAINTS.MAX_HIERARCHY_LEVEL}`);
      return;
    }

    if (formData.hierarchyLevel === 1 && formData.parentLevelId) {
      setError('Level 1 (highest hierarchy level) cannot have a parent level');
      return;
    }

    if (formData.hierarchyLevel > 1 && !formData.parentLevelId) {
      setError('Levels 2 and above must have a parent level');
      return;
    }

    try {
      if (editingLevel) {
        const { data } = await updateOrganizationLevel({
          variables: {
            id: editingLevel.id,
            input: formData,
          },
        });

        if (data?.updateOrganizationLevel?.success) {
          onSuccess?.();
        } else {
          setError(data?.updateOrganizationLevel?.error ?? 'Update failed');
        }
      } else {
        const { data } = await createOrganizationLevel({
          variables: { input: formData },
        });

        if (data?.createOrganizationLevel?.success) {
          onSuccess?.();
        } else {
          setError(data?.createOrganizationLevel?.error ?? 'Create failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="organization-level-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Level Code *</label>
        <input
          value={formData.levelCode}
          onChange={(e) => setFormData({ ...formData, levelCode: e.target.value.toUpperCase() })}
          placeholder="e.g., TEAM_LEAD"
          maxLength={ORGANIZATION_LEVEL_CONSTRAINTS.MAX_CODE_LENGTH}
          required
          disabled={!!editingLevel}
        />
      </div>

      <div className="form-group">
        <label>Level Name (Vietnamese) *</label>
        <input
          value={formData.levelName}
          onChange={(e) => setFormData({ ...formData, levelName: e.target.value })}
          placeholder="e.g., Trưởng nhóm"
          maxLength={ORGANIZATION_LEVEL_CONSTRAINTS.MAX_NAME_LENGTH}
          required
        />
      </div>

      <div className="form-group">
        <label>Level Name (English)</label>
        <input
          value={formData.levelNameEn}
          onChange={(e) => setFormData({ ...formData, levelNameEn: e.target.value })}
          placeholder="e.g., Team Lead"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Role description..."
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Hierarchy Level * (1-{ORGANIZATION_LEVEL_CONSTRAINTS.MAX_HIERARCHY_LEVEL})</label>
          <input
            type="number"
            min={ORGANIZATION_LEVEL_CONSTRAINTS.MIN_HIERARCHY_LEVEL}
            max={ORGANIZATION_LEVEL_CONSTRAINTS.MAX_HIERARCHY_LEVEL}
            value={formData.hierarchyLevel}
            onChange={(e) => setFormData({ ...formData, hierarchyLevel: parseInt(e.target.value) })}
            required
          />
        </div>

        <div className="form-group">
          <label>Parent Level</label>
          <select
            value={formData.parentLevelId}
            onChange={(e) => setFormData({ ...formData, parentLevelId: e.target.value })}
            disabled={formData.hierarchyLevel === 1}
          >
            <option value="">-- No Parent (Root Level) --</option>
            {availableParents.map((level) => (
              <option key={level.id} value={level.id}>
                {level.levelName} (Level {level.hierarchyLevel})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          Active
        </label>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={creating || updating}>
          {creating || updating ? 'Saving...' : editingLevel ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};
```

#### OrganizationLevelStatsDashboard Component

```tsx
// src/components/OrganizationLevelStatsDashboard.tsx
import React from 'react';
import { useOrganizationLevelStatistics } from '../hooks/useOrganizationLevelStatistics';

export const OrganizationLevelStatsDashboard: React.FC = () => {
  const { statistics, loading, error } = useOrganizationLevelStatistics();

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!statistics) return null;

  const stats = [
    { label: 'Tổng số cấp bậc', value: statistics.totalLevels, icon: '📊' },
    { label: 'Cấp bậc hoạt động', value: statistics.activeLevels, icon: '✅' },
    { label: 'Độ sâu tối đa', value: statistics.maxHierarchyDepth, icon: '📐' },
    { label: 'Cấp bậc gốc', value: statistics.rootLevelsCount, icon: '🔝' },
    { label: 'Tổng nhân viên', value: statistics.totalEmployees, icon: '👥' },
    { label: 'Nhân viên hoạt động', value: statistics.activeEmployees, icon: '👤' },
  ];

  return (
    <div className="stats-dashboard">
      <h2>Thống kê cấp bậc tổ chức</h2>
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span className="stat-icon">{stat.icon}</span>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Error Handling

### Common Error Messages

| Error | Description | Solution |
|-------|-------------|----------|
| `Organization level with code 'XXX' already exists` | Duplicate level code | Use a different code |
| `Organization level with ID 'XXX' not found` | Invalid level ID | Verify the ID exists |
| `Parent level with ID 'XXX' not found` | Invalid parent ID | Select a valid parent |
| `Hierarchy level cannot exceed 8` | Custom levels capped at 8 | Use level 1-8 |
| `Level 1 (highest hierarchy level) cannot have a parent level` | Invalid hierarchy | Remove parent for level 1 |
| `Cannot deactivate organization level: it has active child levels` | Has active children | Deactivate children first |
| `Cannot delete organization level: it has X child level(s)` | Has children | Delete/reassign children first |
| `Cannot delete organization level: it is assigned to X workspace member(s)` | Has assigned members | Reassign members first |
| `Direct mutations are disabled` | Using auto-generated mutations | Use custom resolvers instead |

### Error Handler Utility

```typescript
// src/utils/organizationLevelErrors.ts
type OrganizationLevelErrorResult = {
  message: string;
  messageVi: string;
  code: string;
  isRetryable: boolean;
};

export const handleOrganizationLevelError = (error: string): OrganizationLevelErrorResult => {
  const errorPatterns: Array<{
    pattern: RegExp;
    code: string;
    messageVi: string;
    isRetryable: boolean;
  }> = [
    {
      pattern: /code '(.+)' already exists/,
      code: 'DUPLICATE_CODE',
      messageVi: 'Mã cấp bậc đã tồn tại',
      isRetryable: false,
    },
    {
      pattern: /ID '(.+)' not found/,
      code: 'NOT_FOUND',
      messageVi: 'Không tìm thấy cấp bậc',
      isRetryable: false,
    },
    {
      pattern: /Parent level with ID/,
      code: 'PARENT_NOT_FOUND',
      messageVi: 'Không tìm thấy cấp bậc cha',
      isRetryable: false,
    },
    {
      pattern: /cannot exceed (\d+)/,
      code: 'MAX_LEVEL_EXCEEDED',
      messageVi: 'Vượt quá cấp bậc tối đa cho phép',
      isRetryable: false,
    },
    {
      pattern: /Level 1.*cannot have a parent/,
      code: 'LEVEL_1_NO_PARENT',
      messageVi: 'Cấp bậc 1 không thể có cấp bậc cha',
      isRetryable: false,
    },
    {
      pattern: /has active child levels/,
      code: 'HAS_ACTIVE_CHILDREN',
      messageVi: 'Không thể vô hiệu hóa: còn cấp bậc con đang hoạt động',
      isRetryable: false,
    },
    {
      pattern: /has (\d+) child level/,
      code: 'HAS_CHILDREN',
      messageVi: 'Không thể xóa: còn cấp bậc con',
      isRetryable: false,
    },
    {
      pattern: /assigned to (\d+) workspace member/,
      code: 'HAS_MEMBERS',
      messageVi: 'Không thể xóa: đang được gán cho nhân viên',
      isRetryable: false,
    },
    {
      pattern: /Direct mutations are disabled/,
      code: 'MUTATION_BLOCKED',
      messageVi: 'Mutation trực tiếp bị chặn. Sử dụng custom resolver',
      isRetryable: false,
    },
  ];

  for (const { pattern, code, messageVi, isRetryable } of errorPatterns) {
    if (pattern.test(error)) {
      return { message: error, messageVi, code, isRetryable };
    }
  }

  return {
    message: error,
    messageVi: 'Đã xảy ra lỗi',
    code: 'UNKNOWN_ERROR',
    isRetryable: true,
  };
};
```

### Error Display Component

```tsx
// src/components/OrganizationLevelError.tsx
import React from 'react';
import { handleOrganizationLevelError } from '../utils/organizationLevelErrors';

type Props = {
  error: string;
  onRetry?: () => void;
};

export const OrganizationLevelError: React.FC<Props> = ({ error, onRetry }) => {
  const errorInfo = handleOrganizationLevelError(error);

  return (
    <div className={`error-container error-${errorInfo.code.toLowerCase()}`}>
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <div className="error-message-vi">{errorInfo.messageVi}</div>
        <div className="error-message-en">{errorInfo.message}</div>
      </div>
      {errorInfo.isRetryable && onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
};
```

---

## Best Practices

### 1. Always Use Custom Resolvers

```typescript
// ❌ WRONG - Will be blocked
const [createLevel] = useMutation(gql`
  mutation { createMktOrganizationLevel(...) { ... } }
`);

// ✅ CORRECT - Use custom resolver
const [createLevel] = useMutation(gql`
  mutation { createOrganizationLevel(...) { ... } }
`);
```

### 2. Cache Management

```typescript
// Refetch hierarchy and statistics after mutations
const [createOrganizationLevel] = useMutation(CREATE_ORGANIZATION_LEVEL, {
  refetchQueries: [
    'GetOrganizationLevelHierarchy',
    'GetOrganizationLevelStatistics',
  ],
  awaitRefetchQueries: true,
});
```

### 3. Validate Before Submission

```typescript
const validateInput = (input: CreateOrganizationLevelInput): string | null => {
  if (!input.levelCode?.trim()) {
    return 'Level code is required';
  }

  if (!/^[A-Z][A-Z0-9_]*$/.test(input.levelCode)) {
    return 'Level code must start with letter and contain only uppercase letters, numbers, and underscores';
  }

  if (!input.levelName?.trim()) {
    return 'Level name is required';
  }

  if (input.hierarchyLevel < 1 || input.hierarchyLevel > 8) {
    return 'Hierarchy level must be between 1 and 8';
  }

  if (input.hierarchyLevel === 1 && input.parentLevelId) {
    return 'Level 1 cannot have a parent';
  }

  if (input.hierarchyLevel > 1 && !input.parentLevelId) {
    return 'Levels 2-8 must have a parent';
  }

  return null;
};
```

### 4. Optimistic Updates for Better UX

```typescript
const [updateOrganizationLevel] = useMutation(UPDATE_ORGANIZATION_LEVEL, {
  optimisticResponse: {
    updateOrganizationLevel: {
      __typename: 'OrganizationLevelMutationOutput',
      success: true,
      error: null,
    },
  },
  update(cache, { data }) {
    if (!data?.updateOrganizationLevel?.success) return;
    // Update cache manually if needed
  },
});
```

### 5. Handle Loading States

```tsx
const { hierarchy, loading, error } = useOrganizationLevelHierarchy();

if (loading) {
  return (
    <div className="loading-skeleton">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-item" />
      ))}
    </div>
  );
}

if (error) {
  return <OrganizationLevelError error={error.message} />;
}
```

### 6. Delete Confirmation

```tsx
const handleDelete = async (levelId: string, levelName: string) => {
  const confirmed = window.confirm(
    `Bạn có chắc muốn xóa cấp bậc "${levelName}"?\n\n` +
    `Lưu ý: Không thể xóa nếu:\n` +
    `- Còn cấp bậc con\n` +
    `- Đang được gán cho nhân viên`
  );

  if (!confirmed) return;

  try {
    const { data } = await deleteOrganizationLevel({
      variables: { input: { id: levelId } },
    });

    if (!data?.deleteOrganizationLevel?.success) {
      alert(data?.deleteOrganizationLevel?.error);
    }
  } catch (err) {
    alert('Đã xảy ra lỗi khi xóa');
  }
};
```

---

## Appendix: Full API Reference Table

| Category | Operation | Type | Endpoint | Status |
|----------|-----------|------|----------|--------|
| **Queries** | Get Hierarchy | Query | `getOrganizationLevelHierarchy(options)` | ✅ Active |
| | Get Statistics | Query | `getOrganizationLevelStatistics` | ✅ Active |
| | Get Path | Query | `getOrganizationLevelPath(levelId)` | ✅ Active |
| **Custom Mutations** | Create | Mutation | `createOrganizationLevel(input)` | ✅ Active |
| | Update | Mutation | `updateOrganizationLevel(id, input)` | ✅ Active |
| | Delete | Mutation | `deleteOrganizationLevel(input)` | ✅ Active |
| **Blocked Mutations** | Auto Create | Mutation | `createMktOrganizationLevel` | ❌ Blocked |
| | Auto Update | Mutation | `updateMktOrganizationLevel` | ❌ Blocked |
| | Auto Delete | Mutation | `deleteMktOrganizationLevel` | ❌ Blocked |

---

## Test Results Reference

Tất cả 21 test cases đã **PASSED** (2026-01-23):

| Category | Total | Passed |
|----------|-------|--------|
| CREATE Mutations | 5 | 5 |
| UPDATE Mutations | 6 | 6 |
| DELETE Mutations | 4 | 4 |
| QUERY Tests | 3 | 3 |
| BLOCKED Operations | 3 | 3 |

Chi tiết test: xem [TEST-REPORT.md](./resolvers/TEST-REPORT.md)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-23
**Author:** CRM Development Team
