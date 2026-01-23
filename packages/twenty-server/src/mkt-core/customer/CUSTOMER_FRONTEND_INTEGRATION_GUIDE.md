# Customer Module - Frontend Integration Guide

> Tài liệu hướng dẫn tích hợp API Customer Module cho phía Frontend (React + Apollo Client)

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
Customer Module
├── CustomerQueryResolver      # 6 queries (CRUD read operations)
├── CustomerMutationResolver   # 4 mutations (create, update, delete, restore)
├── MktCustomerTierResolver    # 2 queries (tier statistics, upgrade eligibility)
├── MktCustomerLinkedAccountResolver  # 3 queries + 3 mutations
├── MktCustomerTierHistoryResolver    # 4 queries
├── MktCustomerExportResolver         # 2 queries
└── MktCustomerLicenseResolver        # 2 queries
```

---

## TypeScript Types

### Core Types

```typescript
// ============================================
// CUSTOMER TYPES
// ============================================

type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PROSPECTIVE';

type CustomerTier = 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE' | 'DORMANT' | 'CHURNED';

type CustomerLifecycleStage =
  | 'PROSPECTIVE'
  | 'TRIAL'
  | 'CUSTOMER'
  | 'LOYAL'
  | 'CHURNED'
  | 'RETENTION'
  | 'UPSELL'
  | 'CROSS_SELL'
  | 'REACTIVATION';

type CustomerType = 'INDIVIDUAL' | 'BUSINESS' | 'ORGANIZATION';

type Customer = {
  id: string;
  mktCustomerCode: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  taxCode?: string;
  address?: string;
  status: CustomerStatus;
  tier: CustomerTier;
  lifecycleStage: CustomerLifecycleStage;
  // Analytics - Currency (VND)
  totalOrderValue?: number;
  customerLtv?: number;
  // Analytics - Integers
  licensesCount?: number;
  totalOrderCount?: number;
  churnRiskScore?: number;    // 0-100
  engagementScore?: number;   // 0-100
  // Dates - ISO 8601 String
  registrationDate?: string;
  lastPurchase?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relations
  accountOwnerId?: string;
  createdById?: string;
};

// ============================================
// LINKED ACCOUNT TYPES
// ============================================

type AccountProvider =
  | 'MKT_SERVER'
  | 'GOOGLE'
  | 'MICROSOFT'
  | 'FACEBOOK'
  | 'ZALO'
  | 'SHOPEE'
  | 'LAZADA'
  | 'TIKTOK'
  | 'CUSTOM';

type LinkedAccountStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'EXPIRED';

type LinkedAccount = {
  id: string;
  provider: AccountProvider;
  externalId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isPrimary: boolean;
  status: LinkedAccountStatus;
  linkedAt: string | null;
  lastSyncAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
};

// ============================================
// TIER HISTORY TYPES
// ============================================

type TierHistoryRecord = {
  id: string;
  customerId: string;
  previousTier: string | null;
  newTier: string;
  reason: string;
  orderValueAtChange: number;
  orderCountAtChange: number;
  createdAt: Date;
};

// ============================================
// LICENSE TYPES
// ============================================

type UserLicense = {
  id: string;
  name: string;
  licenseKey?: string;
  status?: string;
  activatedAt?: Date;
  expiresAt?: Date;
  lastLoginAt?: Date;
  trialLicense?: boolean;
  deviceInfo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  customerId?: string;
  customerName?: string;
};
```

### Input Types

```typescript
// ============================================
// CUSTOMER CRUD INPUTS
// ============================================

type CreateCustomerInput = {
  name: string;                    // Required
  email?: string;
  phone?: string;
  companyName?: string;
  taxCode?: string;                // 10 or 13 digits
  address?: string;
  status?: CustomerStatus;         // Default: 'ACTIVE'
  tier?: CustomerTier;             // Default: 'BRONZE'
  lifecycleStage?: CustomerLifecycleStage;  // Default: 'PROSPECTIVE'
  notes?: string;
  accountOwnerId?: string;
};

type UpdateCustomerInput = {
  id: string;                      // Required
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  taxCode?: string;
  address?: string;
  status?: CustomerStatus;
  tier?: CustomerTier;
  lifecycleStage?: CustomerLifecycleStage;
  notes?: string;
  accountOwnerId?: string;
};

// ============================================
// LINKED ACCOUNT INPUTS
// ============================================

type LinkAccountInput = {
  customerId: string;              // Required
  provider: AccountProvider;       // Required
  externalId: string;              // Required
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isPrimary?: boolean;             // Default: false
  notes?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

type SetPrimaryAccountInput = {
  customerId: string;              // Required
  accountId: string;               // Required
};

type UnlinkAccountInput = {
  customerId: string;              // Required
  accountId: string;               // Required
};

// ============================================
// TIER HISTORY INPUTS
// ============================================

type CustomerTierHistoryInput = {
  customerId: string;              // Required
  limit?: number;
  offset?: number;
};

type TierHistoryDateRangeInput = {
  startDate: Date;                 // Required
  endDate: Date;                   // Required
  limit?: number;
  offset?: number;
};

// ============================================
// EXPORT INPUTS
// ============================================

type CustomerExportInput = {
  status?: string;
  tier?: string;
  type?: string;
  fromDate?: string;               // ISO format
  toDate?: string;                 // ISO format
  batchSize?: number;              // 100-10000, default: 1000
};
```

### Output Types

```typescript
// ============================================
// RESPONSE TYPES
// ============================================

type CustomerListOutput = {
  customers: Customer[];
  totalCount: number;
};

type CreateCustomerResponse = {
  success: boolean;
  customerId?: string;
  customerCode?: string;
  status?: string;
  error?: string;
};

type UpdateCustomerResponse = {
  success: boolean;
  customerId?: string;
  updatedFields?: string[];
  error?: string;
};

type DeleteCustomerResponse = {
  success: boolean;
  customerId?: string;
  message?: string;
  error?: string;
};

type RestoreCustomerResponse = {
  success: boolean;
  customerId?: string;
  status?: string;
  error?: string;
};

// ============================================
// TIER STATISTICS TYPES
// ============================================

type CustomerTierStatistics = {
  tierDistribution: Record<CustomerTier, number>;
  totalCustomers: number;
  averageOrderValue: number;
  averageOrderCount: number;
};

type CustomerUpgradeEligibility = {
  currentTier: string;
  canUpgrade: boolean;
  nextTier?: string;
  requirements?: string;
};

// ============================================
// LINKED ACCOUNT RESPONSE TYPES
// ============================================

type CustomerAccountsOutput = {
  accounts: LinkedAccount[];
  totalCount: number;
  primaryAccount: LinkedAccount | null;
};

type LinkAccountOutput = {
  success: boolean;
  account: LinkedAccount | null;
  error: string | null;
};

type UnlinkAccountOutput = {
  success: boolean;
  error: string | null;
};

// ============================================
// EXPORT RESPONSE TYPES
// ============================================

type CustomerExportOutput = {
  success: boolean;
  data: string;                    // Base64 encoded CSV
  fileName: string;
  totalRecords: number;
  generatedAt: string;
};

type CustomerExportStatistics = {
  success: boolean;
  totalRecords: number;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
  byType: Record<string, number>;
  generatedAt: string;
};
```

---

## Constants & Enums

### Customer Status

```typescript
const CUSTOMER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
  PROSPECTIVE: 'PROSPECTIVE',
} as const;

const CUSTOMER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Hoạt động', color: 'green' },
  { value: 'INACTIVE', label: 'Không hoạt động', color: 'gray' },
  { value: 'BLOCKED', label: 'Bị chặn', color: 'red' },
  { value: 'PROSPECTIVE', label: 'Tiềm năng', color: 'yellow' },
];
```

### Customer Tier

```typescript
const CUSTOMER_TIER = {
  DIAMOND: 'DIAMOND',
  GOLD: 'GOLD',
  SILVER: 'SILVER',
  BRONZE: 'BRONZE',
  DORMANT: 'DORMANT',
  CHURNED: 'CHURNED',
} as const;

const CUSTOMER_TIER_OPTIONS = [
  { value: 'BRONZE', label: 'Đồng', color: 'orange' },
  { value: 'SILVER', label: 'Bạc', color: 'gray' },
  { value: 'GOLD', label: 'Vàng', color: 'yellow' },
  { value: 'DIAMOND', label: 'Kim Cương', color: 'blue' },
  { value: 'DORMANT', label: 'Không hoạt động', color: 'gray' },
  { value: 'CHURNED', label: 'Đã rời bỏ', color: 'red' },
];

// Tier thresholds for display
const CUSTOMER_TIER_THRESHOLDS = {
  DIAMOND: { minSpending: 10_000_000, minOrders: 20 },
  GOLD: { minSpending: 5_000_000, minOrders: 10 },
  SILVER: { minSpending: 2_000_000, minOrders: 5 },
  BRONZE: { minSpending: 500_000, minOrders: 1 },
};
```

### Customer Lifecycle Stage

```typescript
const CUSTOMER_LIFECYCLE_STAGE = {
  PROSPECTIVE: 'PROSPECTIVE',
  TRIAL: 'TRIAL',
  CUSTOMER: 'CUSTOMER',
  LOYAL: 'LOYAL',
  CHURNED: 'CHURNED',
  RETENTION: 'RETENTION',
  UPSELL: 'UPSELL',
  CROSS_SELL: 'CROSS_SELL',
  REACTIVATION: 'REACTIVATION',
} as const;

const LIFECYCLE_STAGE_OPTIONS = [
  { value: 'PROSPECTIVE', label: 'Tiềm năng', color: 'yellow' },
  { value: 'TRIAL', label: 'Dùng thử', color: 'blue' },
  { value: 'CUSTOMER', label: 'Khách hàng', color: 'green' },
  { value: 'LOYAL', label: 'Trung thành', color: 'purple' },
  { value: 'CHURNED', label: 'Rời bỏ', color: 'red' },
  { value: 'RETENTION', label: 'Giữ chân', color: 'orange' },
];
```

### Customer Type

```typescript
const CUSTOMER_TYPE = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
  ORGANIZATION: 'ORGANIZATION',
} as const;

const CUSTOMER_TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Cá nhân', color: 'green' },
  { value: 'BUSINESS', label: 'Doanh nghiệp', color: 'blue' },
  { value: 'ORGANIZATION', label: 'Tổ chức', color: 'purple' },
];
```

### Account Provider

```typescript
const ACCOUNT_PROVIDER = {
  MKT_SERVER: 'MKT_SERVER',
  GOOGLE: 'GOOGLE',
  MICROSOFT: 'MICROSOFT',
  FACEBOOK: 'FACEBOOK',
  ZALO: 'ZALO',
  SHOPEE: 'SHOPEE',
  LAZADA: 'LAZADA',
  TIKTOK: 'TIKTOK',
  CUSTOM: 'CUSTOM',
} as const;

const ACCOUNT_PROVIDER_OPTIONS = [
  { value: 'MKT_SERVER', label: 'MKT Server', color: 'blue' },
  { value: 'GOOGLE', label: 'Google', color: 'red' },
  { value: 'MICROSOFT', label: 'Microsoft', color: 'sky' },
  { value: 'FACEBOOK', label: 'Facebook', color: 'indigo' },
  { value: 'ZALO', label: 'Zalo', color: 'cyan' },
  { value: 'SHOPEE', label: 'Shopee', color: 'orange' },
  { value: 'LAZADA', label: 'Lazada', color: 'purple' },
  { value: 'TIKTOK', label: 'TikTok', color: 'pink' },
  { value: 'CUSTOM', label: 'Custom', color: 'gray' },
];
```

### Linked Account Status

```typescript
const LINKED_ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  EXPIRED: 'EXPIRED',
} as const;

const LINKED_ACCOUNT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'INACTIVE', label: 'Inactive', color: 'gray' },
  { value: 'SUSPENDED', label: 'Suspended', color: 'orange' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification', color: 'yellow' },
  { value: 'EXPIRED', label: 'Expired', color: 'red' },
];
```

---

## GraphQL Operations

### 1. Customer Query Operations

#### Get Customer by ID

```graphql
query GetCustomerById($id: String!) {
  getCustomerById(id: $id) {
    id
    mktCustomerCode
    name
    email
    phone
    companyName
    taxCode
    address
    status
    tier
    lifecycleStage
    totalOrderValue
    customerLtv
    licensesCount
    totalOrderCount
    churnRiskScore
    engagementScore
    registrationDate
    lastPurchase
    createdAt
    updatedAt
    accountOwnerId
    createdById
  }
}
```

**Variables:**
```json
{
  "id": "customer-uuid-here"
}
```

#### Get Customer by Code

```graphql
query GetCustomerByCode($code: String!) {
  getCustomerByCode(code: $code) {
    id
    mktCustomerCode
    name
    email
    status
    tier
    lifecycleStage
  }
}
```

**Variables:**
```json
{
  "code": "CUST-2024-001"
}
```

#### Get Customer by Email

```graphql
query GetCustomerByEmail($email: String!) {
  getCustomerByEmail(email: $email) {
    id
    mktCustomerCode
    name
    email
    status
    tier
  }
}
```

#### Get Customers (List)

```graphql
query GetCustomers($take: Int, $skip: Int) {
  getCustomers(take: $take, skip: $skip) {
    customers {
      id
      mktCustomerCode
      name
      email
      status
      tier
      lifecycleStage
      totalOrderValue
      totalOrderCount
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "take": 20,
  "skip": 0
}
```

#### Get Customers by Status

```graphql
query GetCustomersByStatus($status: String!, $take: Int, $skip: Int) {
  getCustomersByStatus(status: $status, take: $take, skip: $skip) {
    customers {
      id
      name
      email
      status
      tier
    }
    totalCount
  }
}
```

#### Get Customers by Tier

```graphql
query GetCustomersByTier($tier: String!, $take: Int, $skip: Int) {
  getCustomersByTier(tier: $tier, take: $take, skip: $skip) {
    customers {
      id
      name
      email
      tier
      totalOrderValue
    }
    totalCount
  }
}
```

### 2. Customer Mutation Operations

#### Create Customer

```graphql
mutation CreateCustomer($input: CreateCustomerInput!) {
  createCustomer(input: $input) {
    success
    customerId
    customerCode
    status
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "phone": "0901234567",
    "companyName": "Cong ty ABC",
    "taxCode": "0123456789",
    "address": "123 Nguyen Hue, Q1, HCM",
    "status": "ACTIVE",
    "tier": "BRONZE",
    "lifecycleStage": "PROSPECTIVE"
  }
}
```

#### Update Customer

```graphql
mutation UpdateCustomer($input: UpdateCustomerInput!) {
  updateCustomer(input: $input) {
    success
    customerId
    updatedFields
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "customer-uuid-here",
    "name": "Nguyen Van A (Updated)",
    "tier": "SILVER"
  }
}
```

#### Delete Customer (Soft Delete)

```graphql
mutation DeleteCustomer($id: String!) {
  deleteCustomer(id: $id) {
    success
    customerId
    message
    error
  }
}
```

#### Restore Customer

```graphql
mutation RestoreCustomer($id: String!) {
  restoreCustomer(id: $id) {
    success
    customerId
    status
    error
  }
}
```

### 3. Tier Statistics Operations

#### Get Tier Statistics

```graphql
query MktCustomerTierStatistics {
  mktCustomerTierStatistics {
    tierDistribution
    totalCustomers
    averageOrderValue
    averageOrderCount
  }
}
```

**Response Example:**
```json
{
  "data": {
    "mktCustomerTierStatistics": {
      "tierDistribution": {
        "DIAMOND": 5,
        "GOLD": 15,
        "SILVER": 30,
        "BRONZE": 100,
        "DORMANT": 10,
        "CHURNED": 5
      },
      "totalCustomers": 165,
      "averageOrderValue": 2500000,
      "averageOrderCount": 3.5
    }
  }
}
```

#### Check Upgrade Eligibility

```graphql
query MktCustomerUpgradeEligibility($customerId: String!) {
  mktCustomerUpgradeEligibility(customerId: $customerId) {
    currentTier
    canUpgrade
    nextTier
    requirements
  }
}
```

**Response Example:**
```json
{
  "data": {
    "mktCustomerUpgradeEligibility": {
      "currentTier": "SILVER",
      "canUpgrade": true,
      "nextTier": "GOLD",
      "requirements": "Need 3 more orders (current: 7/10)"
    }
  }
}
```

### 4. Linked Account Operations

#### Get Customer Accounts

```graphql
query MktCustomerAccounts($customerId: String!, $provider: String) {
  mktCustomerAccounts(customerId: $customerId, provider: $provider) {
    accounts {
      id
      provider
      externalId
      email
      displayName
      avatarUrl
      isPrimary
      status
      linkedAt
      lastSyncAt
      metadata
    }
    totalCount
    primaryAccount {
      id
      provider
      email
    }
  }
}
```

#### Get Primary Account

```graphql
query MktCustomerPrimaryAccount($customerId: String!, $provider: String!) {
  mktCustomerPrimaryAccount(customerId: $customerId, provider: $provider) {
    id
    provider
    externalId
    email
    displayName
    isPrimary
    status
  }
}
```

#### Find Customer by External ID

```graphql
query MktFindCustomerByExternalId($provider: String!, $externalId: String!) {
  mktFindCustomerByExternalId(provider: $provider, externalId: $externalId) {
    id
    mktCustomerCode
    name
    email
  }
}
```

#### Link Account

```graphql
mutation MktLinkAccount($input: LinkAccountInput!) {
  mktLinkAccount(input: $input) {
    success
    account {
      id
      provider
      externalId
      email
      isPrimary
      status
      linkedAt
    }
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "customerId": "customer-uuid",
    "provider": "MKT_SERVER",
    "externalId": "mkt-user-123",
    "email": "user@mkt.com",
    "displayName": "MKT User",
    "isPrimary": true,
    "metadata": {
      "licenseCount": 5
    }
  }
}
```

#### Unlink Account

```graphql
mutation MktUnlinkAccount($input: UnlinkAccountInput!) {
  mktUnlinkAccount(input: $input) {
    success
    error
  }
}
```

#### Set Primary Account

```graphql
mutation MktSetPrimaryAccount($input: SetPrimaryAccountInput!) {
  mktSetPrimaryAccount(input: $input) {
    success
    account {
      id
      provider
      isPrimary
    }
    error
  }
}
```

### 5. Tier History Operations

#### Get Tier History List

```graphql
query MktCustomerTierHistoryList($input: CustomerTierHistoryInput!) {
  mktCustomerTierHistoryList(input: $input) {
    items {
      id
      customerId
      previousTier
      newTier
      reason
      orderValueAtChange
      orderCountAtChange
      createdAt
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "input": {
    "customerId": "customer-uuid",
    "limit": 10,
    "offset": 0
  }
}
```

#### Get Latest Tier Change

```graphql
query MktCustomerLatestTierChange($customerId: String!) {
  mktCustomerLatestTierChange(customerId: $customerId) {
    id
    previousTier
    newTier
    reason
    createdAt
  }
}
```

#### Get Tier History by Date Range

```graphql
query MktTierHistoryByDateRange($input: TierHistoryDateRangeInput!) {
  mktTierHistoryByDateRange(input: $input) {
    items {
      id
      customerId
      previousTier
      newTier
      reason
      createdAt
    }
    totalCount
  }
}
```

#### Get Tier Change Statistics

```graphql
query MktTierChangeStatistics {
  mktTierChangeStatistics {
    totalChanges
    upgradeCount
    downgradeCount
    changesByReason {
      reason
      count
    }
  }
}
```

### 6. Export Operations

#### Export Customers to CSV

```graphql
query MktCustomerExportCsv($input: CustomerExportInput!) {
  mktCustomerExportCsv(input: $input) {
    success
    data
    fileName
    totalRecords
    generatedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "status": "ACTIVE",
    "tier": "GOLD",
    "fromDate": "2024-01-01",
    "toDate": "2024-12-31",
    "batchSize": 1000
  }
}
```

**Handling Response (Base64 decode):**
```typescript
const handleExport = (response: CustomerExportOutput) => {
  if (!response.success) return;

  // Decode Base64
  const csvContent = atob(response.data);

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = response.fileName;
  link.click();
  URL.revokeObjectURL(url);
};
```

#### Get Export Statistics

```graphql
query MktCustomerExportStatistics($input: CustomerExportStatisticsInput!) {
  mktCustomerExportStatistics(input: $input) {
    success
    totalRecords
    byStatus
    byTier
    byType
    generatedAt
  }
}
```

### 7. License Operations

#### Get My Licenses (User Auth)

```graphql
query MktGetMyLicenses {
  mktGetMyLicenses {
    licenses {
      id
      name
      licenseKey
      status
      activatedAt
      expiresAt
      lastLoginAt
      trialLicense
      deviceInfo
      notes
      createdAt
      customerId
      customerName
    }
    total
    customerId
    customerName
  }
}
```

#### Get License by Key

```graphql
query MktGetLicenseByKey($licenseKey: String!) {
  mktGetLicenseByKey(licenseKey: $licenseKey) {
    id
    name
    licenseKey
    status
    activatedAt
    expiresAt
    customerId
    customerName
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

#### useCustomer Hook

```typescript
// src/hooks/useCustomer.ts
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_CUSTOMER = gql`
  query GetCustomerById($id: String!) {
    getCustomerById(id: $id) {
      id
      mktCustomerCode
      name
      email
      phone
      status
      tier
      lifecycleStage
      totalOrderValue
      totalOrderCount
    }
  }
`;

const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      success
      customerId
      customerCode
      error
    }
  }
`;

const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      success
      customerId
      updatedFields
      error
    }
  }
`;

export const useCustomer = (id?: string) => {
  const { data, loading, error, refetch } = useQuery(GET_CUSTOMER, {
    variables: { id },
    skip: !id,
  });

  const [createCustomer, { loading: creating }] = useMutation(CREATE_CUSTOMER, {
    refetchQueries: ['GetCustomers'],
  });

  const [updateCustomer, { loading: updating }] = useMutation(UPDATE_CUSTOMER);

  return {
    customer: data?.getCustomerById,
    loading,
    error,
    refetch,
    createCustomer,
    creating,
    updateCustomer,
    updating,
  };
};
```

#### useCustomerList Hook

```typescript
// src/hooks/useCustomerList.ts
import { gql, useQuery } from '@apollo/client';

const GET_CUSTOMERS = gql`
  query GetCustomers($take: Int, $skip: Int) {
    getCustomers(take: $take, skip: $skip) {
      customers {
        id
        mktCustomerCode
        name
        email
        status
        tier
        lifecycleStage
        totalOrderValue
      }
      totalCount
    }
  }
`;

export const useCustomerList = (page = 1, pageSize = 20) => {
  const skip = (page - 1) * pageSize;

  const { data, loading, error, refetch } = useQuery(GET_CUSTOMERS, {
    variables: { take: pageSize, skip },
  });

  return {
    customers: data?.getCustomers?.customers ?? [],
    totalCount: data?.getCustomers?.totalCount ?? 0,
    loading,
    error,
    refetch,
  };
};
```

#### useCustomerTierStats Hook

```typescript
// src/hooks/useCustomerTierStats.ts
import { gql, useQuery } from '@apollo/client';

const GET_TIER_STATS = gql`
  query MktCustomerTierStatistics {
    mktCustomerTierStatistics {
      tierDistribution
      totalCustomers
      averageOrderValue
      averageOrderCount
    }
  }
`;

export const useCustomerTierStats = () => {
  const { data, loading, error } = useQuery(GET_TIER_STATS);

  return {
    stats: data?.mktCustomerTierStatistics,
    loading,
    error,
  };
};
```

#### useLinkedAccounts Hook

```typescript
// src/hooks/useLinkedAccounts.ts
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_CUSTOMER_ACCOUNTS = gql`
  query MktCustomerAccounts($customerId: String!, $provider: String) {
    mktCustomerAccounts(customerId: $customerId, provider: $provider) {
      accounts {
        id
        provider
        externalId
        email
        displayName
        isPrimary
        status
        linkedAt
      }
      totalCount
      primaryAccount {
        id
        provider
      }
    }
  }
`;

const LINK_ACCOUNT = gql`
  mutation MktLinkAccount($input: LinkAccountInput!) {
    mktLinkAccount(input: $input) {
      success
      account {
        id
        provider
        isPrimary
      }
      error
    }
  }
`;

const UNLINK_ACCOUNT = gql`
  mutation MktUnlinkAccount($input: UnlinkAccountInput!) {
    mktUnlinkAccount(input: $input) {
      success
      error
    }
  }
`;

export const useLinkedAccounts = (customerId: string, provider?: string) => {
  const { data, loading, error, refetch } = useQuery(GET_CUSTOMER_ACCOUNTS, {
    variables: { customerId, provider },
    skip: !customerId,
  });

  const [linkAccount] = useMutation(LINK_ACCOUNT, {
    refetchQueries: ['MktCustomerAccounts'],
  });

  const [unlinkAccount] = useMutation(UNLINK_ACCOUNT, {
    refetchQueries: ['MktCustomerAccounts'],
  });

  return {
    accounts: data?.mktCustomerAccounts?.accounts ?? [],
    totalCount: data?.mktCustomerAccounts?.totalCount ?? 0,
    primaryAccount: data?.mktCustomerAccounts?.primaryAccount,
    loading,
    error,
    refetch,
    linkAccount,
    unlinkAccount,
  };
};
```

### Component Examples

#### CustomerForm Component

```tsx
// src/components/CustomerForm.tsx
import React, { useState } from 'react';
import { useCustomer } from '../hooks/useCustomer';
import { CUSTOMER_STATUS_OPTIONS, CUSTOMER_TIER_OPTIONS } from '../constants';

type CustomerFormProps = {
  customerId?: string;
  onSuccess?: () => void;
};

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customerId,
  onSuccess
}) => {
  const { customer, createCustomer, updateCustomer, creating, updating } = useCustomer(customerId);

  const [formData, setFormData] = useState({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    status: customer?.status ?? 'ACTIVE',
    tier: customer?.tier ?? 'BRONZE',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (customerId) {
        const { data } = await updateCustomer({
          variables: { input: { id: customerId, ...formData } },
        });
        if (data?.updateCustomer?.success) {
          onSuccess?.();
        }
      } else {
        const { data } = await createCustomer({
          variables: { input: formData },
        });
        if (data?.createCustomer?.success) {
          onSuccess?.();
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name *</label>
        <input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <label>Phone</label>
        <input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div>
        <label>Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          {CUSTOMER_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Tier</label>
        <select
          value={formData.tier}
          onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
        >
          {CUSTOMER_TIER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={creating || updating}>
        {customerId ? 'Update' : 'Create'} Customer
      </button>
    </form>
  );
};
```

#### TierStatsDashboard Component

```tsx
// src/components/TierStatsDashboard.tsx
import React from 'react';
import { useCustomerTierStats } from '../hooks/useCustomerTierStats';
import { CUSTOMER_TIER_OPTIONS } from '../constants';

export const TierStatsDashboard: React.FC = () => {
  const { stats, loading, error } = useCustomerTierStats();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!stats) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  return (
    <div className="tier-stats-dashboard">
      <h2>Customer Tier Statistics</h2>

      <div className="stats-summary">
        <div className="stat-card">
          <h3>Total Customers</h3>
          <p>{stats.totalCustomers}</p>
        </div>
        <div className="stat-card">
          <h3>Average Order Value</h3>
          <p>{formatCurrency(stats.averageOrderValue)}</p>
        </div>
        <div className="stat-card">
          <h3>Average Orders/Customer</h3>
          <p>{stats.averageOrderCount.toFixed(2)}</p>
        </div>
      </div>

      <div className="tier-distribution">
        <h3>Distribution by Tier</h3>
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {CUSTOMER_TIER_OPTIONS.map((tier) => {
              const count = stats.tierDistribution[tier.value] ?? 0;
              const percentage = ((count / stats.totalCustomers) * 100).toFixed(1);
              return (
                <tr key={tier.value}>
                  <td>
                    <span style={{ color: tier.color }}>{tier.label}</span>
                  </td>
                  <td>{count}</td>
                  <td>{percentage}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

#### LinkedAccountsManager Component

```tsx
// src/components/LinkedAccountsManager.tsx
import React, { useState } from 'react';
import { useLinkedAccounts } from '../hooks/useLinkedAccounts';
import { ACCOUNT_PROVIDER_OPTIONS } from '../constants';

type Props = {
  customerId: string;
};

export const LinkedAccountsManager: React.FC<Props> = ({ customerId }) => {
  const {
    accounts,
    totalCount,
    primaryAccount,
    loading,
    linkAccount,
    unlinkAccount
  } = useLinkedAccounts(customerId);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    provider: 'MKT_SERVER',
    externalId: '',
    email: '',
    displayName: '',
    isPrimary: false,
  });

  const handleLink = async () => {
    try {
      const { data } = await linkAccount({
        variables: {
          input: { customerId, ...formData },
        },
      });

      if (data?.mktLinkAccount?.success) {
        setShowForm(false);
        setFormData({
          provider: 'MKT_SERVER',
          externalId: '',
          email: '',
          displayName: '',
          isPrimary: false,
        });
      }
    } catch (error) {
      console.error('Link account error:', error);
    }
  };

  const handleUnlink = async (accountId: string) => {
    if (!confirm('Are you sure you want to unlink this account?')) return;

    try {
      await unlinkAccount({
        variables: {
          input: { customerId, accountId },
        },
      });
    } catch (error) {
      console.error('Unlink account error:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="linked-accounts-manager">
      <div className="header">
        <h3>Linked Accounts ({totalCount})</h3>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Link New Account'}
        </button>
      </div>

      {primaryAccount && (
        <div className="primary-account">
          <strong>Primary:</strong> {primaryAccount.provider} - {primaryAccount.email}
        </div>
      )}

      {showForm && (
        <div className="link-form">
          <select
            value={formData.provider}
            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
          >
            {ACCOUNT_PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            placeholder="External ID *"
            value={formData.externalId}
            onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
            required
          />

          <input
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <input
            placeholder="Display Name"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          />

          <label>
            <input
              type="checkbox"
              checked={formData.isPrimary}
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
            />
            Set as Primary
          </label>

          <button onClick={handleLink}>Link Account</button>
        </div>
      )}

      <table className="accounts-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Email</th>
            <th>Status</th>
            <th>Primary</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td>{account.provider}</td>
              <td>{account.email || '-'}</td>
              <td>{account.status}</td>
              <td>{account.isPrimary ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleUnlink(account.id)}>Unlink</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Error Handling

### Common Error Codes

| Error | Description | Solution |
|-------|-------------|----------|
| `CUSTOMER_NOT_FOUND` | Customer ID does not exist | Verify customer ID |
| `DUPLICATE_EMAIL` | Email already registered | Use different email |
| `INVALID_TAX_CODE` | Tax code format invalid | Must be 10 or 13 digits |
| `ACCOUNT_ALREADY_LINKED` | External account already linked | Unlink first or use different account |
| `PRIMARY_ACCOUNT_CANNOT_UNLINK` | Cannot unlink primary account | Set different primary first |
| `UNAUTHORIZED` | Token expired or invalid | Re-authenticate |

### Error Handler Utility

```typescript
// src/utils/errorHandler.ts
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

export const handleGraphQLError = (errors: GraphQLError[]): ErrorResult => {
  const error = errors[0];
  const code = error.extensions?.code ?? 'UNKNOWN_ERROR';

  const errorMap: Record<string, { message: string; isRetryable: boolean }> = {
    CUSTOMER_NOT_FOUND: {
      message: 'Không tìm thấy khách hàng',
      isRetryable: false
    },
    DUPLICATE_EMAIL: {
      message: 'Email đã được sử dụng',
      isRetryable: false
    },
    INVALID_TAX_CODE: {
      message: 'Mã số thuế phải có 10 hoặc 13 chữ số',
      isRetryable: false
    },
    ACCOUNT_ALREADY_LINKED: {
      message: 'Tài khoản đã được liên kết',
      isRetryable: false
    },
    UNAUTHORIZED: {
      message: 'Phiên đăng nhập hết hạn',
      isRetryable: true
    },
    NETWORK_ERROR: {
      message: 'Lỗi kết nối mạng',
      isRetryable: true
    },
  };

  return {
    message: errorMap[code]?.message ?? error.message,
    code,
    isRetryable: errorMap[code]?.isRetryable ?? false,
  };
};
```

### Apollo Error Link

```typescript
// src/lib/errorLink.ts
import { onError } from '@apollo/client/link/error';

export const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.error(
        `[GraphQL error]: Message: ${err.message}, ` +
        `Location: ${err.locations}, ` +
        `Path: ${err.path}, ` +
        `Operation: ${operation.operationName}`
      );

      // Handle specific errors
      if (err.extensions?.code === 'UNAUTHORIZED') {
        // Redirect to login
        window.location.href = '/login';
      }
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});
```

---

## Best Practices

### 1. Cache Management

```typescript
// Use cache update after mutations
const [createCustomer] = useMutation(CREATE_CUSTOMER, {
  update(cache, { data }) {
    if (!data?.createCustomer?.success) return;

    // Evict and refetch
    cache.evict({ fieldName: 'getCustomers' });
    cache.gc();
  },
});
```

### 2. Optimistic Updates

```typescript
const [updateCustomer] = useMutation(UPDATE_CUSTOMER, {
  optimisticResponse: {
    updateCustomer: {
      __typename: 'UpdateCustomerResponseDto',
      success: true,
      customerId: customerId,
      updatedFields: ['name'],
      error: null,
    },
  },
});
```

### 3. Pagination with Infinite Scroll

```typescript
const { data, fetchMore } = useQuery(GET_CUSTOMERS, {
  variables: { take: 20, skip: 0 },
});

const loadMore = () => {
  fetchMore({
    variables: {
      skip: data.getCustomers.customers.length,
    },
    updateQuery: (prev, { fetchMoreResult }) => {
      if (!fetchMoreResult) return prev;
      return {
        getCustomers: {
          ...fetchMoreResult.getCustomers,
          customers: [
            ...prev.getCustomers.customers,
            ...fetchMoreResult.getCustomers.customers,
          ],
        },
      };
    },
  });
};
```

### 4. Field-Level Validation

```typescript
// src/utils/validation.ts
export const validateCustomerInput = (input: CreateCustomerInput) => {
  const errors: Record<string, string> = {};

  if (!input.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = 'Invalid email format';
  }

  if (input.taxCode && !/^\d{10}$|^\d{13}$/.test(input.taxCode)) {
    errors.taxCode = 'Tax code must be 10 or 13 digits';
  }

  if (input.phone && !/^0\d{9}$/.test(input.phone)) {
    errors.phone = 'Phone must be 10 digits starting with 0';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
```

### 5. Data Transformation Utilities

```typescript
// src/utils/transform.ts
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

export const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const getTierColor = (tier: string): string => {
  const colors: Record<string, string> = {
    DIAMOND: '#3b82f6',
    GOLD: '#eab308',
    SILVER: '#6b7280',
    BRONZE: '#f97316',
    DORMANT: '#9ca3af',
    CHURNED: '#ef4444',
  };
  return colors[tier] ?? '#6b7280';
};

export const getStatusBadge = (status: string): { color: string; label: string } => {
  const badges: Record<string, { color: string; label: string }> = {
    ACTIVE: { color: 'green', label: 'Hoạt động' },
    INACTIVE: { color: 'gray', label: 'Không hoạt động' },
    BLOCKED: { color: 'red', label: 'Bị chặn' },
    PROSPECTIVE: { color: 'yellow', label: 'Tiềm năng' },
  };
  return badges[status] ?? { color: 'gray', label: status };
};
```

---

## Appendix: Full API Reference Table

| Category | Operation | Type | Endpoint |
|----------|-----------|------|----------|
| **Customer CRUD** | Get by ID | Query | `getCustomerById(id)` |
| | Get by Code | Query | `getCustomerByCode(code)` |
| | Get by Email | Query | `getCustomerByEmail(email)` |
| | Get List | Query | `getCustomers(take, skip)` |
| | Get by Status | Query | `getCustomersByStatus(status, take, skip)` |
| | Get by Tier | Query | `getCustomersByTier(tier, take, skip)` |
| | Create | Mutation | `createCustomer(input)` |
| | Update | Mutation | `updateCustomer(input)` |
| | Delete | Mutation | `deleteCustomer(id)` |
| | Restore | Mutation | `restoreCustomer(id)` |
| **Tier Statistics** | Get Stats | Query | `mktCustomerTierStatistics` |
| | Check Upgrade | Query | `mktCustomerUpgradeEligibility(customerId)` |
| **Linked Accounts** | Get Accounts | Query | `mktCustomerAccounts(customerId, provider?)` |
| | Get Primary | Query | `mktCustomerPrimaryAccount(customerId, provider)` |
| | Find by External | Query | `mktFindCustomerByExternalId(provider, externalId)` |
| | Link | Mutation | `mktLinkAccount(input)` |
| | Unlink | Mutation | `mktUnlinkAccount(input)` |
| | Set Primary | Mutation | `mktSetPrimaryAccount(input)` |
| **Tier History** | Get History | Query | `mktCustomerTierHistoryList(input)` |
| | Get Latest | Query | `mktCustomerLatestTierChange(customerId)` |
| | Get by Date | Query | `mktTierHistoryByDateRange(input)` |
| | Get Stats | Query | `mktTierChangeStatistics` |
| **Export** | Export CSV | Query | `mktCustomerExportCsv(input)` |
| | Get Stats | Query | `mktCustomerExportStatistics(input)` |
| **License** | Get My Licenses | Query | `mktGetMyLicenses` |
| | Get by Key | Query | `mktGetLicenseByKey(licenseKey)` |

---

**Document Version:** 1.0.0
**Last Updated:** 2024-01-22
**Author:** CRM Development Team
