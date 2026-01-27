# Tài liệu đối ứng - MktCustomer Fields

## Tổng quan

Tài liệu này mô tả chi tiết các trường thông tin của entity **MktCustomer** trong hệ thống CRM.

| Mục | Giá trị |
|-----|---------|
| **Entity** | MktCustomerWorkspaceEntity |
| **Table** | mktCustomer |
| **Version** | 1.0.0 |
| **Ngày tạo** | 2026-01-27 |

---

## 1. Căn cước công dân (citizenId)

### Thông tin trường

| Thuộc tính | Giá trị |
|------------|---------|
| **Field Name** | `citizenId` |
| **Field ID** | `personalIdNumber` (mkt-field-ids.ts) |
| **Label (VI)** | Căn cước công dân |
| **Label (EN)** | Citizen ID |
| **Type** | TEXT |
| **Nullable** | Yes |
| **Unique** | Yes (trong workspace) |
| **Icon** | IconId |
| **Status** | ✅ **Đã triển khai** |

### Mô tả

Số căn cước công dân (CCCD) của khách hàng cá nhân. Áp dụng cho khách hàng loại `INDIVIDUAL`.

### Validation Rules

| Rule | Mô tả |
|------|-------|
| Format | 12 chữ số (CCCD mới) hoặc 9 chữ số (CMND cũ) |
| Regex | `^(\d{9}|\d{12})$` |
| Required | Không bắt buộc |
| Unique | Duy nhất trong workspace |

### Business Logic

```
- Chỉ áp dụng cho CustomerType = INDIVIDUAL
- Nếu CustomerType = BUSINESS hoặc ORGANIZATION → field này nên để trống
- Dùng để xác minh danh tính khách hàng
- Có thể dùng để liên kết với các hệ thống xác thực eKYC
```

### GraphQL Schema

```graphql
type MktCustomer {
  citizenId: String  # Nullable, unique
}

input CreateMktCustomerInput {
  citizenId: String  # Optional
}

input UpdateMktCustomerInput {
  citizenId: String  # Optional
}
```

### Ví dụ

| Loại | Giá trị | Hợp lệ |
|------|---------|--------|
| CCCD mới | `001234567890` | ✅ |
| CMND cũ | `123456789` | ✅ |
| Sai format | `12345` | ❌ |
| Chứa chữ | `00123456789A` | ❌ |

---

## 2. Sale phụ trách (accountOwner)

### Thông tin trường

| Thuộc tính | Giá trị |
|------------|---------|
| **Field Name** | `accountOwner` |
| **Join Column** | `accountOwnerId` |
| **Label (VI)** | Sales phụ trách |
| **Label (EN)** | Account Owner |
| **Type** | RELATION (Many-to-One) |
| **Target Entity** | WorkspaceMemberWorkspaceEntity |
| **Nullable** | Yes |
| **On Delete** | SET_NULL |
| **Icon** | IconUserCircle |

### Mô tả

Nhân viên sales được phân công phụ trách khách hàng. Relation đến `WorkspaceMember`.

### Database Schema

```sql
-- Column trong bảng mktCustomer
accountOwnerId UUID REFERENCES workspaceMember(id) ON DELETE SET NULL

-- Inverse relation trong WorkspaceMember
accountOwnerForMktCustomers: MktCustomer[]
```

### GraphQL Schema

```graphql
type MktCustomer {
  accountOwner: WorkspaceMember
  accountOwnerId: String
}

type WorkspaceMember {
  accountOwnerForMktCustomers: [MktCustomer!]!
}

input AssignAccountOwnerInput {
  customerId: String!
  accountOwnerId: String!
}
```

### Query Examples

```graphql
# Lấy thông tin customer với account owner
query GetCustomerWithOwner($id: String!) {
  mktCustomer(filter: { id: { eq: $id } }) {
    id
    name
    accountOwner {
      id
      name {
        firstName
        lastName
      }
      avatarUrl
    }
  }
}

# Lấy danh sách customers của một sales
query GetCustomersBySales($salesId: String!) {
  mktCustomers(filter: { accountOwnerId: { eq: $salesId } }) {
    edges {
      node {
        id
        name
        tier
        totalOrderValue
      }
    }
  }
}
```

### Business Logic

```
- Khi khách hàng mới được tạo, có thể auto-assign theo config:
  + Strategy: round_robin | least_customers | random
  + Eligible roles: sales, account_manager

- Khi account owner bị xóa → accountOwnerId = NULL (SET_NULL)

- Fields liên quan:
  + assignedDate: Ngày assign
  + assignedReason: Lý do assign
```

### Auto-Assignment Config

```typescript
const MKT_CUSTOMER_AUTO_ASSIGN_CONFIG = {
  ENABLED: true,
  STRATEGY: 'round_robin',  // round_robin | least_customers | random
  ELIGIBLE_ROLES: ['sales', 'account_manager'],
};
```

---

## 3. Loại khách hàng (type / CustomerType)

### Thông tin trường

| Thuộc tính | Giá trị |
|------------|---------|
| **Field Name** | `type` |
| **Label (VI)** | Loại khách hàng |
| **Label (EN)** | Customer Type |
| **Type** | SELECT |
| **Nullable** | Yes |
| **Default** | `INDIVIDUAL` |
| **Icon** | IconUser |

### Options

| Value | Label (VI) | Label (EN) | Color | Position |
|-------|------------|------------|-------|----------|
| `INDIVIDUAL` | Cá nhân | Individual | 🟢 green | 0 |
| `BUSINESS` | Doanh nghiệp | Business | 🔵 blue | 1 |
| `ORGANIZATION` | Tổ chức | Organization | 🟣 purple | 2 |

### Mô tả

Phân loại khách hàng theo hình thức pháp lý:

| Type | Mô tả | Ví dụ |
|------|-------|-------|
| **INDIVIDUAL** | Khách hàng cá nhân | Nguyễn Văn A, freelancer |
| **BUSINESS** | Doanh nghiệp, công ty | Công ty TNHH ABC, Công ty CP XYZ |
| **ORGANIZATION** | Tổ chức phi lợi nhuận, cơ quan | Trường ĐH ABC, Bệnh viện XYZ |

### GraphQL Schema

```graphql
enum MktCustomerType {
  INDIVIDUAL
  BUSINESS
  ORGANIZATION
}

type MktCustomer {
  type: MktCustomerType
}

input CreateMktCustomerInput {
  type: MktCustomerType  # Default: INDIVIDUAL
}
```

### Business Logic

```
- INDIVIDUAL:
  + Bắt buộc: name (tên cá nhân)
  + Optional: citizenId, phone, email
  + Không cần: taxCode, companyName

- BUSINESS:
  + Bắt buộc: companyName, taxCode
  + Optional: contactPosition, contactDepartment
  + name = tên người liên hệ

- ORGANIZATION:
  + Bắt buộc: companyName (tên tổ chức)
  + Optional: taxCode (nếu có)
  + Thường không có mục tiêu lợi nhuận
```

### Ví dụ sử dụng

```graphql
# Tạo khách hàng cá nhân
mutation CreateIndividual {
  createMktCustomer(data: {
    name: "Nguyễn Văn An"
    type: INDIVIDUAL
    email: "nguyen.an@gmail.com"
    phone: "0901234567"
  }) {
    id
  }
}

# Tạo khách hàng doanh nghiệp
mutation CreateBusiness {
  createMktCustomer(data: {
    name: "Trần Văn Bình"  # Người liên hệ
    type: BUSINESS
    companyName: "Công ty TNHH ABC"
    taxCode: "0123456789"
    contactPosition: "Giám đốc kinh doanh"
    industry: IT
    companySize: MEDIUM
  }) {
    id
  }
}
```

---

## 4. Ngành nghề (industry)

### Thông tin trường

| Thuộc tính | Giá trị |
|------------|---------|
| **Field Name** | `industry` |
| **Label (VI)** | Ngành nghề |
| **Label (EN)** | Industry |
| **Type** | SELECT |
| **Nullable** | Yes |
| **Default** | None |
| **Icon** | IconCategory |

### Options

| Value | Label (VI) | Label (EN) | Color | Position |
|-------|------------|------------|-------|----------|
| `IT` | Công nghệ thông tin | Information Technology | 🔵 blue | 0 |
| `FINANCE` | Tài chính - Ngân hàng | Finance & Banking | 🟢 green | 1 |
| `MANUFACTURING` | Sản xuất | Manufacturing | 🟠 orange | 2 |
| `RETAIL` | Bán lẻ | Retail | 🟣 purple | 3 |
| `HEALTHCARE` | Y tế - Sức khỏe | Healthcare | 🔴 red | 4 |
| `EDUCATION` | Giáo dục | Education | 🟡 yellow | 5 |
| `REAL_ESTATE` | Bất động sản | Real Estate | ⚪ gray | 6 |
| `OTHER` | Khác | Other | ⚪ gray | 7 |

### Mô tả

Ngành nghề kinh doanh chính của khách hàng. Chủ yếu áp dụng cho `BUSINESS` và `ORGANIZATION`.

### GraphQL Schema

```graphql
enum MktCustomerIndustry {
  IT
  FINANCE
  MANUFACTURING
  RETAIL
  HEALTHCARE
  EDUCATION
  REAL_ESTATE
  OTHER
}

type MktCustomer {
  industry: MktCustomerIndustry
}
```

### Business Logic

```
- Dùng để:
  + Phân loại khách hàng theo vertical
  + Targeting marketing campaigns
  + Báo cáo doanh thu theo ngành
  + Assign sales chuyên ngành

- Thường đi kèm với companySize để đánh giá tiềm năng
```

### Query Examples

```graphql
# Lấy khách hàng theo ngành IT
query GetITCustomers {
  mktCustomers(filter: { industry: { eq: IT } }) {
    edges {
      node {
        id
        companyName
        tier
        totalOrderValue
      }
    }
  }
}

# Thống kê theo ngành
query IndustryStats {
  mktCustomers {
    edges {
      node {
        industry
      }
    }
  }
}
```

---

## 5. Quy mô công ty (companySize)

### Thông tin trường

| Thuộc tính | Giá trị |
|------------|---------|
| **Field Name** | `companySize` |
| **Label (VI)** | Quy mô công ty |
| **Label (EN)** | Company Size |
| **Type** | SELECT |
| **Nullable** | Yes |
| **Default** | None |
| **Icon** | IconUsers |

### Options

| Value | Label (VI) | Label (EN) | Color | Position | Số nhân viên |
|-------|------------|------------|-------|----------|--------------|
| `SMALL` | Nhỏ (1-10 NV) | Small (1-10 employees) | 🟢 green | 0 | 1-10 |
| `MEDIUM` | Vừa (11-50 NV) | Medium (11-50 employees) | 🟡 yellow | 1 | 11-50 |
| `LARGE` | Lớn (51-200 NV) | Large (51-200 employees) | 🔵 blue | 2 | 51-200 |
| `ENTERPRISE` | Doanh nghiệp (200+ NV) | Enterprise (200+ employees) | 🟣 purple | 3 | 200+ |

### Mô tả

Quy mô công ty dựa trên số lượng nhân viên. Áp dụng cho `BUSINESS` và `ORGANIZATION`.

### GraphQL Schema

```graphql
enum MktCustomerCompanySize {
  SMALL
  MEDIUM
  LARGE
  ENTERPRISE
}

type MktCustomer {
  companySize: MktCustomerCompanySize
}
```

### Business Logic

```
- Dùng để:
  + Đánh giá tiềm năng mua hàng
  + Định giá sản phẩm/dịch vụ (enterprise pricing)
  + Xác định nhu cầu license
  + Phân loại khách hàng B2B

- Kết hợp với industry để scoring:
  + IT + ENTERPRISE → High potential
  + RETAIL + SMALL → Lower potential
```

### Tiêu chí phân loại

| Size | Số NV | Nhu cầu License | Support Level |
|------|-------|-----------------|---------------|
| SMALL | 1-10 | 1-5 licenses | Basic |
| MEDIUM | 11-50 | 5-20 licenses | Standard |
| LARGE | 51-200 | 20-100 licenses | Premium |
| ENTERPRISE | 200+ | 100+ licenses | Dedicated |

### Query Examples

```graphql
# Lấy enterprise customers
query GetEnterpriseCustomers {
  mktCustomers(filter: { companySize: { eq: ENTERPRISE } }) {
    edges {
      node {
        id
        companyName
        industry
        totalOrderValue
        licensesCount
      }
    }
  }
}

# Lọc theo size và industry
query GetLargeITCompanies {
  mktCustomers(
    filter: {
      and: [
        { companySize: { in: [LARGE, ENTERPRISE] } }
        { industry: { eq: IT } }
      ]
    }
  ) {
    edges {
      node {
        id
        companyName
      }
    }
  }
}
```

---

## 6. Support phụ trách (supportOwner) - Bonus

### Thông tin trường

| Thuộc tính | Giá trị |
|------------|---------|
| **Field Name** | `supportOwner` |
| **Join Column** | `supportOwnerId` |
| **Label (VI)** | Support phụ trách |
| **Label (EN)** | Support Owner |
| **Type** | RELATION (Many-to-One) |
| **Target Entity** | WorkspaceMemberWorkspaceEntity |
| **Nullable** | Yes |
| **On Delete** | SET_NULL |
| **Icon** | IconLifebuoy |

### Mô tả

Nhân viên support/CSKH được phân công phụ trách khách hàng. Khác với `accountOwner` (sales).

### So sánh accountOwner vs supportOwner

| Thuộc tính | accountOwner | supportOwner |
|------------|--------------|--------------|
| Vai trò | Sales | Customer Support |
| Nhiệm vụ | Bán hàng, upsell | Hỗ trợ kỹ thuật, CSKH |
| Giai đoạn | Pre-sales, Closing | Post-sales |
| Icon | IconUserCircle | IconLifebuoy |

---

## Tổng hợp Database Schema

```sql
CREATE TABLE "mktCustomer" (
    -- Basic Info
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "mktCustomerCode" VARCHAR UNIQUE,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    phone VARCHAR,
    type VARCHAR DEFAULT 'INDIVIDUAL',  -- SELECT: INDIVIDUAL, BUSINESS, ORGANIZATION

    -- Business Info
    "companyName" VARCHAR,
    "taxCode" VARCHAR,
    address VARCHAR,
    "companySize" VARCHAR,  -- SELECT: SMALL, MEDIUM, LARGE, ENTERPRISE
    industry VARCHAR,  -- SELECT: IT, FINANCE, MANUFACTURING, ...
    "citizenId" VARCHAR UNIQUE,  -- CCCD/CMND

    -- Relations
    "accountOwnerId" UUID REFERENCES "workspaceMember"(id) ON DELETE SET NULL,
    "supportOwnerId" UUID REFERENCES "workspaceMember"(id) ON DELETE SET NULL,

    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_mktcustomer_type ON "mktCustomer"(type);
CREATE INDEX idx_mktcustomer_industry ON "mktCustomer"(industry);
CREATE INDEX idx_mktcustomer_companysize ON "mktCustomer"("companySize");
CREATE INDEX idx_mktcustomer_accountowner ON "mktCustomer"("accountOwnerId");
```

---

## Appendix: Constants File Reference

```typescript
// File: constants/mkt-customer.constant.ts

// Customer Type
export const MKT_CUSTOMER_TYPE = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
  ORGANIZATION: 'ORGANIZATION',
};

// Company Size
export const MKT_CUSTOMER_COMPANY_SIZE = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
  ENTERPRISE: 'ENTERPRISE',
};

// Industry
export const MKT_CUSTOMER_INDUSTRY = {
  IT: 'IT',
  FINANCE: 'FINANCE',
  MANUFACTURING: 'MANUFACTURING',
  RETAIL: 'RETAIL',
  HEALTHCARE: 'HEALTHCARE',
  EDUCATION: 'EDUCATION',
  REAL_ESTATE: 'REAL_ESTATE',
  OTHER: 'OTHER',
};
```

---

---

## Triển khai

### Entity Changes

File: `objects/mkt-customer.workspace-entity.ts`

```typescript
@WorkspaceField({
  standardId: MKT_CUSTOMER_FIELD_IDS.personalIdNumber,
  type: FieldMetadataType.TEXT,
  label: msg`Citizen ID`,
  description: msg`Căn cước công dân (CCCD) hoặc CMND - 9 hoặc 12 số`,
  icon: 'IconId',
})
@WorkspaceIsNullable()
@WorkspaceIsUnique()
citizenId: string | null;
```

### Data Seeder

File: `seeder/customer-seeder/customer/mkt-customer-data-seeds.constants.ts`

| Customer | Type | citizenId |
|----------|------|-----------|
| Nguyễn Văn An | BUSINESS | `null` |
| Trần Thị Bình | BUSINESS | `null` |
| Lê Minh Cường | INDIVIDUAL | `079090012345` |
| Phạm Hoàng Dung | ORGANIZATION | `null` |
| Võ Thị Em | BUSINESS | `null` |

### Commits

| Phase | Commit | Description |
|-------|--------|-------------|
| 1 | `962bb2604f` | Add citizenId field to entity |
| 2 | `7a0e887da8` | Add citizenId to data seeder |
| 3 | (current) | Update documentation |

---

*Generated: 2026-01-27*
