# Contract Module - Frontend Integration Guide

Tài liệu hướng dẫn tích hợp Contract API cho phía Frontend.

---

## Table of Contents

1. [Overview](#overview)
2. [Access Control](#access-control)
3. [TypeScript Types](#typescript-types)
4. [GraphQL Queries](#graphql-queries)
5. [GraphQL Mutations](#graphql-mutations)
6. [React Hooks Examples](#react-hooks-examples)
7. [UI Components Guidelines](#ui-components-guidelines)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Overview

Contract module quản lý hợp đồng trong hệ thống CRM với các tính năng:
- Tạo/cập nhật/xóa mềm/khôi phục hợp đồng
- Quản lý trạng thái hợp đồng (ACTIVE, INACTIVE, EXPIRED, REVOKED)
- Phân loại hợp đồng (ORIGIN, RENEW, UPGRADE)
- Liên kết với Customer
- Thống kê và báo cáo

### API Endpoint
```
POST /graphql
```

### Authentication
Tất cả requests cần Bearer token trong header:
```
Authorization: Bearer <access_token>
```

---

## Access Control

### Quyền truy cập

| Department/Level | Read | Write | Delete |
|-----------------|------|-------|--------|
| FINANCE | ✅ | ✅ | ✅ |
| ACCOUNTING | ✅ | ✅ | ✅ |
| Executive (Level 1-3) | ✅ | ✅ | ✅ |
| Other departments | ❌ | ❌ | ❌ |

### Xử lý unauthorized access

Khi user không có quyền truy cập:
- Query endpoints trả về `null` hoặc empty array
- Mutation endpoints trả về `{ success: false, error: "..." }`
- Request không có token trả về error: `"Forbidden resource"`

---

## TypeScript Types

### Enums

```typescript
// Contract Status
export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

// Contract Type
export enum ContractType {
  ORIGIN = 'ORIGIN',   // Hợp đồng gốc
  RENEW = 'RENEW',     // Hợp đồng gia hạn
  UPGRADE = 'UPGRADE', // Hợp đồng nâng cấp
}
```

### Status Options (for UI)

```typescript
export const CONTRACT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Hoạt động', labelEn: 'Active', color: 'green' },
  { value: 'INACTIVE', label: 'Không hoạt động', labelEn: 'Inactive', color: 'gray' },
  { value: 'EXPIRED', label: 'Hết hạn', labelEn: 'Expired', color: 'red' },
  { value: 'REVOKED', label: 'Bị thu hồi', labelEn: 'Revoked', color: 'orange' },
] as const;

export const CONTRACT_TYPE_OPTIONS = [
  { value: 'ORIGIN', label: 'Hợp đồng gốc', labelEn: 'Original Contract', color: 'blue' },
  { value: 'RENEW', label: 'Hợp đồng gia hạn', labelEn: 'Renewal Contract', color: 'green' },
  { value: 'UPGRADE', label: 'Hợp đồng nâng cấp', labelEn: 'Upgrade Contract', color: 'purple' },
] as const;
```

### Response Types

```typescript
// Contract entity
export type Contract = {
  id: string;
  name: string;
  contractNumber: string;
  status: ContractStatus;
  contractType: ContractType;
  startDate: string | null;
  endDate: string | null;
  signedDate: string | null;
  filePath: string | null;
  fileName: string | null;
  description: string | null;
  position: number | null;
  customerId: string | null;
  accountOwnerId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

// Contract list response
export type ContractListResponse = {
  contracts: Contract[];
  totalCount: number;
};

// Status distribution
export type ContractStatusDistribution = {
  distribution: Array<{ status: string; count: number }>;
  totalCount: number;
};

// Customer contract stats
export type CustomerContractStats = {
  contractCount: number;
  activeCount: number;
  expiredCount: number;
  firstContractDate: string | null;
  lastContractDate: string | null;
};

// Mutation responses
export type CreateContractResponse = {
  success: boolean;
  contractId?: string;
  contractNumber?: string;
  status?: ContractStatus;
  error?: string;
};

export type UpdateContractResponse = {
  success: boolean;
  contractId?: string;
  previousStatus?: ContractStatus;
  newStatus?: ContractStatus;
  error?: string;
};

export type DeleteContractResponse = {
  success: boolean;
  contractId?: string;
  message?: string;
  error?: string;
};

export type RestoreContractResponse = {
  success: boolean;
  contractId?: string;
  status?: ContractStatus;
  error?: string;
};
```

### Input Types

```typescript
// Create contract input
export type CreateContractInput = {
  name: string;
  contractNumber?: string;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  filePath?: string;
  fileName?: string;
  description?: string;
  customerId?: string;
  accountOwnerId?: string;
};

// Update contract input
export type UpdateContractInput = {
  id: string;
  name?: string;
  contractNumber?: string;
  status?: ContractStatus;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  filePath?: string;
  fileName?: string;
  description?: string;
  customerId?: string;
  accountOwnerId?: string;
};

// Update status input
export type UpdateContractStatusInput = {
  id: string;
  status: ContractStatus;
  reason?: string;
};
```

---

## GraphQL Queries

### 1. Get Contract by ID

```graphql
query GetContractById($contractId: String!) {
  getContractById(contractId: $contractId) {
    id
    name
    contractNumber
    status
    contractType
    startDate
    endDate
    signedDate
    filePath
    fileName
    description
    position
    customerId
    accountOwnerId
    createdById
    createdAt
    updatedAt
  }
}
```

**Variables:**
```json
{
  "contractId": "c1f5e779-7f5d-4da3-93c3-e306bbcf6a50"
}
```

### 2. Get Contract by Number

```graphql
query GetContractByNumber($contractNumber: String!) {
  getContractByNumber(contractNumber: $contractNumber) {
    id
    name
    contractNumber
    status
    contractType
    startDate
    endDate
    customerId
  }
}
```

**Variables:**
```json
{
  "contractNumber": "MS-365-2024-001"
}
```

### 3. Get Contracts by Customer

```graphql
query GetContractsByCustomer($customerId: String!) {
  getContractsByCustomer(customerId: $customerId) {
    contracts {
      id
      name
      contractNumber
      status
      startDate
      endDate
    }
    totalCount
  }
}
```

### 4. Get Contracts by Status

```graphql
query GetContractsByStatus($status: ContractStatus!) {
  getContractsByStatus(status: $status) {
    contracts {
      id
      name
      contractNumber
      status
      startDate
      endDate
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "status": "ACTIVE"
}
```

### 5. Get Contracts (Paginated)

```graphql
query GetContracts($take: Float, $skip: Float) {
  getContracts(take: $take, skip: $skip) {
    contracts {
      id
      name
      contractNumber
      status
      contractType
      startDate
      endDate
      customerId
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "take": 10,
  "skip": 0
}
```

**Default values:** `take: 50`, `skip: 0`

### 6. Get Contract Status Distribution

```graphql
query GetContractStatusDistribution {
  getContractStatusDistribution {
    distribution {
      status
      count
    }
    totalCount
  }
}
```

**Response example:**
```json
{
  "data": {
    "getContractStatusDistribution": {
      "distribution": [
        { "status": "ACTIVE", "count": 12 },
        { "status": "EXPIRED", "count": 1 },
        { "status": "INACTIVE", "count": 1 },
        { "status": "REVOKED", "count": 1 }
      ],
      "totalCount": 15
    }
  }
}
```

### 7. Get Customer Contract Stats

```graphql
query GetCustomerContractStats($customerId: String!) {
  getCustomerContractStats(customerId: $customerId) {
    contractCount
    activeCount
    expiredCount
    firstContractDate
    lastContractDate
  }
}
```

### 8. Get Expiring Contracts

```graphql
query GetExpiringContracts($startDate: String!, $endDate: String!) {
  getExpiringContracts(startDate: $startDate, endDate: $endDate) {
    contracts {
      id
      name
      contractNumber
      status
      endDate
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

---

## GraphQL Mutations

### 1. Create Contract

```graphql
mutation CreateContract($input: CreateContractInput!) {
  createContract(input: $input) {
    success
    contractId
    contractNumber
    status
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Hợp đồng cung cấp dịch vụ - ABC Corp",
    "contractType": "ORIGIN",
    "startDate": "2024-01-22",
    "endDate": "2025-01-21",
    "signedDate": "2024-01-20",
    "description": "Hợp đồng cung cấp dịch vụ marketing automation",
    "customerId": "49868053-4758-457f-9332-6ebd48af7ca6"
  }
}
```

**Notes:**
- `name` là field bắt buộc
- `contractNumber` nếu không cung cấp sẽ được tự động generate với format `CT{YYYYMMDD}{NNN}`
- `status` mặc định là `ACTIVE`

### 2. Update Contract

```graphql
mutation UpdateContract($input: UpdateContractInput!) {
  updateContract(input: $input) {
    success
    contractId
    previousStatus
    newStatus
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "c1f5e779-7f5d-4da3-93c3-e306bbcf6a50",
    "name": "Updated Contract Name",
    "status": "INACTIVE",
    "description": "Updated description"
  }
}
```

### 3. Update Contract Status

```graphql
mutation UpdateContractStatus($input: UpdateContractStatusInput!) {
  updateContractStatus(input: $input) {
    success
    contractId
    previousStatus
    newStatus
    message
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "c1f5e779-7f5d-4da3-93c3-e306bbcf6a50",
    "status": "INACTIVE",
    "reason": "Customer requested suspension"
  }
}
```

### 4. Delete Contract (Soft Delete)

```graphql
mutation DeleteContract($contractId: String!) {
  deleteContract(contractId: $contractId) {
    success
    contractId
    message
    error
  }
}
```

**Variables:**
```json
{
  "contractId": "c1f5e779-7f5d-4da3-93c3-e306bbcf6a50"
}
```

### 5. Restore Contract

```graphql
mutation RestoreContract($contractId: String!) {
  restoreContract(contractId: $contractId) {
    success
    contractId
    status
    error
  }
}
```

---

## React Hooks Examples

### GraphQL Documents

```typescript
// src/modules/contract/graphql/contract.queries.ts
import { gql } from '@apollo/client';

export const CONTRACT_FRAGMENT = gql`
  fragment ContractFields on ContractOutput {
    id
    name
    contractNumber
    status
    contractType
    startDate
    endDate
    signedDate
    description
    customerId
    createdAt
    updatedAt
  }
`;

export const GET_CONTRACTS = gql`
  ${CONTRACT_FRAGMENT}
  query GetContracts($take: Float, $skip: Float) {
    getContracts(take: $take, skip: $skip) {
      contracts {
        ...ContractFields
      }
      totalCount
    }
  }
`;

export const GET_CONTRACT_BY_ID = gql`
  ${CONTRACT_FRAGMENT}
  query GetContractById($contractId: String!) {
    getContractById(contractId: $contractId) {
      ...ContractFields
    }
  }
`;

export const GET_CONTRACT_STATUS_DISTRIBUTION = gql`
  query GetContractStatusDistribution {
    getContractStatusDistribution {
      distribution {
        status
        count
      }
      totalCount
    }
  }
`;
```

```typescript
// src/modules/contract/graphql/contract.mutations.ts
import { gql } from '@apollo/client';

export const CREATE_CONTRACT = gql`
  mutation CreateContract($input: CreateContractInput!) {
    createContract(input: $input) {
      success
      contractId
      contractNumber
      status
      error
    }
  }
`;

export const UPDATE_CONTRACT = gql`
  mutation UpdateContract($input: UpdateContractInput!) {
    updateContract(input: $input) {
      success
      contractId
      previousStatus
      newStatus
      error
    }
  }
`;

export const UPDATE_CONTRACT_STATUS = gql`
  mutation UpdateContractStatus($input: UpdateContractStatusInput!) {
    updateContractStatus(input: $input) {
      success
      contractId
      previousStatus
      newStatus
      message
      error
    }
  }
`;

export const DELETE_CONTRACT = gql`
  mutation DeleteContract($contractId: String!) {
    deleteContract(contractId: $contractId) {
      success
      contractId
      message
      error
    }
  }
`;

export const RESTORE_CONTRACT = gql`
  mutation RestoreContract($contractId: String!) {
    restoreContract(contractId: $contractId) {
      success
      contractId
      status
      error
    }
  }
`;
```

### Custom Hooks

```typescript
// src/modules/contract/hooks/useContracts.ts
import { useQuery, useMutation } from '@apollo/client';
import { useCallback, useMemo } from 'react';

import {
  GET_CONTRACTS,
  GET_CONTRACT_BY_ID,
  GET_CONTRACT_STATUS_DISTRIBUTION,
} from '../graphql/contract.queries';
import {
  CREATE_CONTRACT,
  UPDATE_CONTRACT,
  UPDATE_CONTRACT_STATUS,
  DELETE_CONTRACT,
  RESTORE_CONTRACT,
} from '../graphql/contract.mutations';

// Hook for fetching contracts list
export const useContracts = (take = 50, skip = 0) => {
  const { data, loading, error, refetch } = useQuery(GET_CONTRACTS, {
    variables: { take, skip },
    fetchPolicy: 'cache-and-network',
  });

  return {
    contracts: data?.getContracts?.contracts ?? [],
    totalCount: data?.getContracts?.totalCount ?? 0,
    loading,
    error,
    refetch,
  };
};

// Hook for fetching single contract
export const useContract = (contractId: string) => {
  const { data, loading, error, refetch } = useQuery(GET_CONTRACT_BY_ID, {
    variables: { contractId },
    skip: !contractId,
    fetchPolicy: 'cache-and-network',
  });

  return {
    contract: data?.getContractById ?? null,
    loading,
    error,
    refetch,
  };
};

// Hook for status distribution
export const useContractStatusDistribution = () => {
  const { data, loading, error, refetch } = useQuery(
    GET_CONTRACT_STATUS_DISTRIBUTION,
    {
      fetchPolicy: 'cache-and-network',
    }
  );

  return {
    distribution: data?.getContractStatusDistribution?.distribution ?? [],
    totalCount: data?.getContractStatusDistribution?.totalCount ?? 0,
    loading,
    error,
    refetch,
  };
};

// Hook for contract mutations
export const useContractMutations = () => {
  const [createContractMutation, { loading: creating }] =
    useMutation(CREATE_CONTRACT);
  const [updateContractMutation, { loading: updating }] =
    useMutation(UPDATE_CONTRACT);
  const [updateStatusMutation, { loading: updatingStatus }] =
    useMutation(UPDATE_CONTRACT_STATUS);
  const [deleteContractMutation, { loading: deleting }] =
    useMutation(DELETE_CONTRACT);
  const [restoreContractMutation, { loading: restoring }] =
    useMutation(RESTORE_CONTRACT);

  const createContract = useCallback(
    async (input: CreateContractInput) => {
      const { data } = await createContractMutation({
        variables: { input },
        refetchQueries: [GET_CONTRACTS, GET_CONTRACT_STATUS_DISTRIBUTION],
      });
      return data?.createContract;
    },
    [createContractMutation]
  );

  const updateContract = useCallback(
    async (input: UpdateContractInput) => {
      const { data } = await updateContractMutation({
        variables: { input },
        refetchQueries: [GET_CONTRACTS, GET_CONTRACT_STATUS_DISTRIBUTION],
      });
      return data?.updateContract;
    },
    [updateContractMutation]
  );

  const updateContractStatus = useCallback(
    async (input: UpdateContractStatusInput) => {
      const { data } = await updateStatusMutation({
        variables: { input },
        refetchQueries: [GET_CONTRACTS, GET_CONTRACT_STATUS_DISTRIBUTION],
      });
      return data?.updateContractStatus;
    },
    [updateStatusMutation]
  );

  const deleteContract = useCallback(
    async (contractId: string) => {
      const { data } = await deleteContractMutation({
        variables: { contractId },
        refetchQueries: [GET_CONTRACTS, GET_CONTRACT_STATUS_DISTRIBUTION],
      });
      return data?.deleteContract;
    },
    [deleteContractMutation]
  );

  const restoreContract = useCallback(
    async (contractId: string) => {
      const { data } = await restoreContractMutation({
        variables: { contractId },
        refetchQueries: [GET_CONTRACTS, GET_CONTRACT_STATUS_DISTRIBUTION],
      });
      return data?.restoreContract;
    },
    [restoreContractMutation]
  );

  return {
    createContract,
    updateContract,
    updateContractStatus,
    deleteContract,
    restoreContract,
    loading: creating || updating || updatingStatus || deleting || restoring,
  };
};
```

### Usage Example in Component

```tsx
// src/modules/contract/components/ContractList.tsx
import { useContracts, useContractMutations } from '../hooks/useContracts';
import { ContractStatus } from '../types';

export const ContractList = () => {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { contracts, totalCount, loading, refetch } = useContracts(
    pageSize,
    page * pageSize
  );
  const { deleteContract, updateContractStatus } = useContractMutations();

  const handleDelete = async (contractId: string) => {
    const result = await deleteContract(contractId);
    if (result?.success) {
      // Show success toast
    } else {
      // Show error toast with result?.error
    }
  };

  const handleStatusChange = async (
    contractId: string,
    newStatus: ContractStatus
  ) => {
    const result = await updateContractStatus({
      id: contractId,
      status: newStatus,
    });
    if (result?.success) {
      // Show success toast with result?.message
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <Table>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell>{contract.name}</TableCell>
            <TableCell>{contract.contractNumber}</TableCell>
            <TableCell>
              <StatusBadge status={contract.status} />
            </TableCell>
            <TableCell>
              <ActionMenu
                onDelete={() => handleDelete(contract.id)}
                onStatusChange={(status) =>
                  handleStatusChange(contract.id, status)
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </Table>
      <Pagination
        total={totalCount}
        page={page}
        pageSize={pageSize}
        onChange={setPage}
      />
    </div>
  );
};
```

---

## UI Components Guidelines

### Status Badge Component

```tsx
// src/modules/contract/components/ContractStatusBadge.tsx
import { ContractStatus, CONTRACT_STATUS_OPTIONS } from '../types';

type ContractStatusBadgeProps = {
  status: ContractStatus;
  locale?: 'vi' | 'en';
};

export const ContractStatusBadge = ({
  status,
  locale = 'vi',
}: ContractStatusBadgeProps) => {
  const option = CONTRACT_STATUS_OPTIONS.find((opt) => opt.value === status);

  if (!option) return null;

  const label = locale === 'vi' ? option.label : option.labelEn;

  return (
    <Badge
      color={option.color}
      variant="light"
    >
      {label}
    </Badge>
  );
};
```

### Contract Type Badge

```tsx
// src/modules/contract/components/ContractTypeBadge.tsx
import { ContractType, CONTRACT_TYPE_OPTIONS } from '../types';

type ContractTypeBadgeProps = {
  type: ContractType;
  locale?: 'vi' | 'en';
};

export const ContractTypeBadge = ({
  type,
  locale = 'vi',
}: ContractTypeBadgeProps) => {
  const option = CONTRACT_TYPE_OPTIONS.find((opt) => opt.value === type);

  if (!option) return null;

  const label = locale === 'vi' ? option.label : option.labelEn;

  return (
    <Badge
      color={option.color}
      variant="outline"
    >
      {label}
    </Badge>
  );
};
```

### Status Select Component

```tsx
// src/modules/contract/components/ContractStatusSelect.tsx
import { ContractStatus, CONTRACT_STATUS_OPTIONS } from '../types';

type ContractStatusSelectProps = {
  value: ContractStatus;
  onChange: (status: ContractStatus) => void;
  disabled?: boolean;
  locale?: 'vi' | 'en';
};

export const ContractStatusSelect = ({
  value,
  onChange,
  disabled,
  locale = 'vi',
}: ContractStatusSelectProps) => {
  return (
    <Select
      value={value}
      onChange={(newValue) => onChange(newValue as ContractStatus)}
      disabled={disabled}
    >
      {CONTRACT_STATUS_OPTIONS.map((option) => (
        <SelectOption
          key={option.value}
          value={option.value}
        >
          <ColorDot color={option.color} />
          {locale === 'vi' ? option.label : option.labelEn}
        </SelectOption>
      ))}
    </Select>
  );
};
```

---

## Error Handling

### Error Types

```typescript
// API errors
type ContractApiError = {
  success: false;
  error: string;
};

// GraphQL errors
type GraphQLError = {
  message: string;
  extensions: {
    code: string;
    userFriendlyMessage: string;
  };
};
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `"Forbidden resource"` | No authentication token | Redirect to login |
| `"Contract not found"` | Invalid contract ID | Show error message |
| `"Contract is not deleted"` | Trying to restore non-deleted contract | Refresh data |
| `"invalid input syntax for type uuid"` | Invalid UUID format | Validate input |

### Error Handling Example

```typescript
const handleMutation = async () => {
  try {
    const result = await createContract(input);

    if (!result?.success) {
      // Handle API-level error
      showErrorToast(result?.error ?? 'Unknown error');
      return;
    }

    showSuccessToast('Contract created successfully');
  } catch (error) {
    // Handle GraphQL/network error
    if (error instanceof ApolloError) {
      const message =
        error.graphQLErrors[0]?.extensions?.userFriendlyMessage ??
        error.message;
      showErrorToast(message);
    } else {
      showErrorToast('Network error. Please try again.');
    }
  }
};
```

---

## Best Practices

### 1. Date Handling

Dates được trả về dạng JavaScript Date string. Convert về ISO format để xử lý:

```typescript
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Hoặc sử dụng luxon (đã có trong project)
import { DateTime } from 'luxon';

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';

  return DateTime.fromJSDate(new Date(dateString)).toFormat('dd/MM/yyyy');
};
```

### 2. Optimistic Updates

```typescript
const { updateContract } = useContractMutations();

const handleUpdate = async (input: UpdateContractInput) => {
  // Optimistic update
  const previousContract = cache.readQuery({ query: GET_CONTRACT_BY_ID });

  cache.writeQuery({
    query: GET_CONTRACT_BY_ID,
    data: { getContractById: { ...previousContract, ...input } },
  });

  try {
    await updateContract(input);
  } catch (error) {
    // Rollback on error
    cache.writeQuery({
      query: GET_CONTRACT_BY_ID,
      data: { getContractById: previousContract },
    });
  }
};
```

### 3. Pagination

```typescript
// Infinite scroll pattern
const { contracts, totalCount, fetchMore } = useQuery(GET_CONTRACTS, {
  variables: { take: 20, skip: 0 },
});

const loadMore = () => {
  fetchMore({
    variables: {
      skip: contracts.length,
    },
    updateQuery: (prev, { fetchMoreResult }) => ({
      getContracts: {
        ...fetchMoreResult.getContracts,
        contracts: [
          ...prev.getContracts.contracts,
          ...fetchMoreResult.getContracts.contracts,
        ],
      },
    }),
  });
};
```

### 4. Cache Invalidation

```typescript
// After mutation, refetch related queries
const { createContract } = useContractMutations();

await createContract(input);

// Manually refetch if needed
client.refetchQueries({
  include: ['GetContracts', 'GetContractStatusDistribution'],
});
```

### 5. Form Validation

```typescript
// Using Zod for validation
import { z } from 'zod';

const createContractSchema = z.object({
  name: z.string().min(1, 'Tên hợp đồng là bắt buộc'),
  contractType: z.nativeEnum(ContractType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.string().uuid('ID khách hàng không hợp lệ').optional(),
});

type CreateContractFormData = z.infer<typeof createContractSchema>;
```

---

## File Structure Recommendation

```
src/modules/contract/
├── components/
│   ├── ContractList.tsx
│   ├── ContractDetail.tsx
│   ├── ContractForm.tsx
│   ├── ContractStatusBadge.tsx
│   ├── ContractTypeBadge.tsx
│   ├── ContractStatusSelect.tsx
│   └── ContractExpiringAlert.tsx
├── graphql/
│   ├── contract.queries.ts
│   ├── contract.mutations.ts
│   └── contract.fragments.ts
├── hooks/
│   ├── useContracts.ts
│   ├── useContract.ts
│   └── useContractMutations.ts
├── types/
│   ├── contract.types.ts
│   └── index.ts
├── utils/
│   ├── contractFormatters.ts
│   └── contractValidation.ts
└── index.ts
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-22 | Initial release |

---

*Document maintained by Backend Team*
