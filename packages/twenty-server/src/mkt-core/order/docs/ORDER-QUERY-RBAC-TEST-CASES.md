# Test Cases: RBAC Permission cho OrderQueryResolver

> Test cases kiểm tra phân quyền RBAC cho `order/resolvers/order-query.resolver.ts`.
>
> **Workspace ID:** `20202020-1c25-4d02-bf25-6aeccf7ea419`
>
> **Ngày tạo:** 2026-02-27

---

## Mục lục

0. [Hướng dẫn đăng nhập để test role](#0-hướng-dẫn-đăng-nhập-để-test-role)
1. [Dữ liệu test thực tế](#1-dữ-liệu-test-thực-tế)
2. [Ma trận phân quyền](#2-ma-trận-phân-quyền)
3. [TC Group 1: getOrderById](#3-tc-group-1-getorderbyid)
4. [TC Group 2: getOrderByCode](#4-tc-group-2-getorderbycode)
5. [TC Group 3: getOrders (paginated)](#5-tc-group-3-getorders-paginated)
6. [TC Group 4: getOrdersByCustomer](#6-tc-group-4-getordersbycustomer)
7. [TC Group 5: getOrdersByStatus](#7-tc-group-5-getordersbystatus)
8. [TC Group 6: getOrderPaymentSummary](#8-tc-group-6-getorderpaymentsummary)
9. [TC Group 7: getCustomerOrderStats](#9-tc-group-7-getcustomerorderstats)
10. [TC Group 8: Edge Cases](#10-tc-group-8-edge-cases)

---

## 0. Hướng dẫn đăng nhập để test role

### 0.1 Thông tin đăng nhập các user test

Tất cả user dùng chung password: **`1Tim@appledev`**

| # | User | Email | Password | Dept | Level | Guard | DataScope |
|---|------|-------|----------|------|-------|-------|-----------|
| 1 | Jony Ive | `jony.ive@apple.dev` | `1Tim@appledev` | SALES | 1 (CEO) | ALLOW | ALL |
| 2 | Craig Federighi | `craig.federighi@apple.dev` | `1Tim@appledev` | TECH | 2 (C_LEVEL) | ALLOW | ALL |
| 3 | Angela Ahrendts | `angela.ahrendts@apple.dev` | `1Tim@appledev` | SALES | 3 (VP) | ALLOW | ALL |
| 4 | Michael Brown | `michael.brown@apple.dev` | `1Tim@appledev` | TECH | 4 (SR_DIRECTOR) | ALLOW | department |
| 5 | Sarah Chen | `sarah.chen@apple.dev` | `1Tim@appledev` | SALES | 5 (DIRECTOR) | ALLOW | department |
| 6 | Emily Wilson | `emily.wilson@apple.dev` | `1Tim@appledev` | ACCOUNTING | 6 (SR_MANAGER) | ALLOW | department |
| 7 | Dan Riccio | `dan.riccio@apple.dev` | `1Tim@appledev` | SUPPORT | 6 (SR_MANAGER) | ALLOW | department |
| 8 | Deirdre O'Brien | `deirdre.obrien@apple.dev` | `1Tim@appledev` | HR | 7 (MANAGER) | ALLOW | team |
| 9 | Tim Apple | `tim@apple.dev` | `1Tim@appledev` | TECH_BACKEND | 7 (MANAGER) | ALLOW | team |
| 10 | Eddy Cue | `eddy.cue@apple.dev` | `1Tim@appledev` | SALES | 7 (MANAGER) | ALLOW | team |
| 11 | Phil Schiler | `phil.schiler@apple.dev` | `1Tim@appledev` | TECH_FRONTEND | 8 (SR_SPECIALIST) | **DENY** | - |
| 12 | Lisa Jackson | `lisa.jackson@apple.dev` | `1Tim@appledev` | ACCOUNTING | 8 (SR_SPECIALIST) | ALLOW | own |
| 13 | Greg Joswiak | `greg.joswiak@apple.dev` | `1Tim@appledev` | SALES_DOMESTIC | 9 (SPECIALIST) | ALLOW | own |
| 14 | John Ternus | `john.ternus@apple.dev` | `1Tim@appledev` | SUPPORT | 9 (SPECIALIST) | **DENY** | - |
| 15 | Jane Austen | `jane.austen@apple.dev` | `1Tim@appledev` | TECH_DEVOPS | 9 (SPECIALIST) | **DENY** | - |
| 16 | Luca Maestri | `luca.maestri@apple.dev` | `1Tim@appledev` | TECH_QA | 10 (JR_SPECIALIST) | **DENY** | - |
| 17 | Jeff Williams | `jeff.williams@apple.dev` | `1Tim@appledev` | TECH_DATA | 11 (INTERN) | **DENY** | - |

### 0.2 Flow đăng nhập qua GraphQL (2 bước)

GraphQL endpoint: `http://localhost:3000/graphql`

**Bước 1: Challenge** — Gửi email + password để nhận `loginToken`

```graphql
mutation Challenge {
  challenge(email: "sarah.chen@apple.dev", password: "1Tim@appledev") {
    loginToken {
      token
      expiresAt
    }
  }
}
```

Response:
```json
{
  "data": {
    "challenge": {
      "loginToken": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "expiresAt": "2026-02-28T..."
      }
    }
  }
}
```

**Bước 2: Get Auth Tokens** — Đổi `loginToken` thành `accessToken` + `refreshToken`

```graphql
mutation GetAuthTokens {
  getAuthTokensFromLoginToken(
    loginToken: "eyJhbGciOiJIUzI1NiIs..."
  ) {
    tokens {
      accessToken {
        token
        expiresAt
      }
      refreshToken {
        token
        expiresAt
      }
    }
  }
}
```

Response:
```json
{
  "data": {
    "getAuthTokensFromLoginToken": {
      "tokens": {
        "accessToken": {
          "token": "eyJhbGciOiJIUzI1NiIs...<ACCESS_TOKEN>",
          "expiresAt": "2026-02-27T..."
        },
        "refreshToken": {
          "token": "eyJhbGciOiJIUzI1NiIs...",
          "expiresAt": "2026-03-27T..."
        }
      }
    }
  }
}
```

**Bước 3: Gọi API** — Dùng `accessToken` trong header `Authorization`

```
Authorization: Bearer <ACCESS_TOKEN>
```

Ví dụ gọi `getOrders`:
```graphql
# Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...<ACCESS_TOKEN>

query GetOrders {
  getOrders {
    orders {
      id
      orderCode
      totalAmount
      status
      paymentStatus
    }
    totalCount
  }
}
```

### 0.3 Chuyển đổi user nhanh (script flow)

Để test nhiều role, lặp lại Bước 1 + 2 với email khác:

```bash
# 1. Lấy loginToken cho user cần test
LOGIN_TOKEN=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { challenge(email: \"sarah.chen@apple.dev\", password: \"1Tim@appledev\") { loginToken { token } } }"
  }' | jq -r '.data.challenge.loginToken.token')

# 2. Đổi loginToken thành accessToken
ACCESS_TOKEN=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { getAuthTokensFromLoginToken(loginToken: \\\"$LOGIN_TOKEN\\\") { tokens { accessToken { token } } } }\"
  }" | jq -r '.data.getAuthTokensFromLoginToken.tokens.accessToken.token')

# 3. Gọi API với accessToken
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "query": "query { getOrders { orders { id orderCode totalAmount status } totalCount } }"
  }' | jq .
```

### 0.4 Users gợi ý cho từng scenario test

| Scenario | User gợi ý | Lý do |
|----------|-----------|-------|
| Full access (thấy tất cả) | `jony.ive@apple.dev` | CEO, level 1, hasFullAccess=true |
| Cross-dept executive | `craig.federighi@apple.dev` | TECH dept nhưng vẫn thấy ALL orders |
| Department scope (SALES) | `sarah.chen@apple.dev` | SALES Director, thấy SALES + child depts |
| Department scope (ACCOUNTING) | `emily.wilson@apple.dev` | ACCOUNTING, thấy ACCOUNTING tree |
| Team scope (SALES) | `eddy.cue@apple.dev` | SALES Manager, thấy team members |
| Team scope (cross-dept) | `deirdre.obrien@apple.dev` | HR Manager, chỉ thấy HR team |
| Own records only | `greg.joswiak@apple.dev` | SALES_DOMESTIC staff, chỉ thấy orders mình |
| Own records (ACCOUNTING) | `lisa.jackson@apple.dev` | ACCOUNTING staff, chỉ thấy orders mình |
| Guard DENY | `phil.schiler@apple.dev` | TECH_FRONTEND level 8, bị chặn |
| Guard DENY (intern) | `jeff.williams@apple.dev` | TECH_DATA level 11, bị chặn |

---

## 1. Dữ liệu test thực tế

### 1.1 Users (từ database)

| # | User | Email | Department | Level | LevelCode | Template | Priority |
|---|------|-------|------------|-------|-----------|----------|----------|
| 1 | Jony Ive | jony.ive@apple.dev | SALES | 1 | CEO | CEO | 1000 |
| 2 | Craig Federighi | craig.federighi@apple.dev | TECH | 2 | C_LEVEL | VP | 900 |
| 3 | Angela Ahrendts | angela.ahrendts@apple.dev | SALES | 3 | VP | DIRECTOR | 800 |
| 4 | Michael Brown | michael.brown@apple.dev | TECH | 4 | SENIOR_DIRECTOR | MANAGER | 700 |
| 5 | Sarah Chen | sarah.chen@apple.dev | SALES | 5 | DIRECTOR | SALES_DIRECTOR | 800 |
| 6 | Emily Wilson | emily.wilson@apple.dev | ACCOUNTING | 6 | SENIOR_MANAGER | FINANCE_ANALYST | 550 |
| 7 | Dan Riccio | dan.riccio@apple.dev | SUPPORT | 6 | SENIOR_MANAGER | TEAM_LEAD | 600 |
| 8 | Deirdre O'Brien | deirdre.obrien@apple.dev | HR | 7 | MANAGER | MANAGER | 700 |
| 9 | Tim Apple | tim@apple.dev | TECH_BACKEND | 7 | MANAGER | MANAGER | 700 |
| 10 | Eddy Cue | eddy.cue@apple.dev | SALES | 7 | MANAGER | SALES_MANAGER | 700 |
| 11 | Phil Schiler | phil.schiler@apple.dev | TECH_FRONTEND | 8 | SENIOR_SPECIALIST | SENIOR | 500 |
| 12 | Lisa Jackson | lisa.jackson@apple.dev | ACCOUNTING | 8 | SENIOR_SPECIALIST | ACCOUNTANT_STAFF | 550 |
| 13 | Greg Joswiak | greg.joswiak@apple.dev | SALES_DOMESTIC | 9 | SPECIALIST | SALES_STAFF | 500 |
| 14 | John Ternus | john.ternus@apple.dev | SUPPORT | 9 | SPECIALIST | SUPPORT_STAFF | 500 |
| 15 | Jane Austen | jane.austen@apple.dev | TECH_DEVOPS | 9 | SPECIALIST | JUNIOR | 400 |
| 16 | Luca Maestri | luca.maestri@apple.dev | TECH_QA | 10 | JUNIOR_SPECIALIST | JUNIOR | 400 |
| 17 | Jeff Williams | jeff.williams@apple.dev | TECH_DATA | 11 | INTERN | JUNIOR | 400 |

### 1.2 Workspace Member IDs

| User | workspace_member_id |
|------|---------------------|
| Jony Ive (CEO) | `20202020-77d5-4cb6-b60a-f4a835a85d61` |
| Craig Federighi (C_LEVEL) | `d637ddb6-9606-4234-ab7f-f184c3693028` |
| Angela Ahrendts (VP) | `e8ee6acd-2487-4a1c-9a20-328302196387` |
| Sarah Chen (DIRECTOR) | `0254f5eb-4a2c-4251-9685-b14db6056820` |
| Emily Wilson (SENIOR_MANAGER) | `b5e86369-48fa-41b7-b87d-306631075983` |
| Eddy Cue (SALES MANAGER) | `a81bccba-c749-4436-bb0d-bb5c414dd54f` |
| Tim Apple (MANAGER) | `20202020-0687-4c41-b707-ed1bfca972a7` |
| Phil Schiler (SENIOR_SPECIALIST) | `20202020-1553-45c6-a028-5a9064cce07f` |
| Lisa Jackson (ACCOUNTANT) | `c4ef4ada-d63a-4db8-97a3-5a0ca65c70a8` |
| Greg Joswiak (SALES_STAFF) | `f098b41c-242e-4075-b3a7-5063f40a0602` |
| John Ternus (SUPPORT_STAFF) | `da57648d-a85d-4788-8158-ca2353dd57c6` |
| Luca Maestri (JUNIOR) | `f4811b01-9fc9-4b23-922d-4ac74946dd35` |
| Jeff Williams (INTERN) | `ba1790f0-74da-41af-ad56-afed7a857296` |

### 1.3 Orders (từ database)

Tất cả orders hiện tại đều do **Tim Apple** (`20202020-0687-4c41-b707-ed1bfca972a7`) tạo.

| Order Code | Status | Payment | Amount | createdById | Customer |
|------------|--------|---------|--------|-------------|----------|
| MKT-VIRAL-2024-002 | COMPLETED | PAID | 17,100,000 | Tim Apple | Lê Minh Cường |
| MKT-UID-2024-003 | COMPLETED | PENDING | 6,600,000 | Tim Apple | Lê Minh Cường |
| MKT-INSTA-2024-004 | COMPLETED | PAID | 16,500,000 | Tim Apple | Lê Minh Cường |
| MKT-TUBE-2024-005 | COMPLETED | PAID | 9,900,000 | Tim Apple | Lê Minh Cường |
| MKT-ZALO-2024-007 | COMPLETED | PAID | 5,500,000 | Tim Apple | Trần Thị Bình |
| MKT-GROUP-2024-008 | COMPLETED | PAID | 17,600,000 | Tim Apple | Trần Thị Bình |
| MKT-TWITTER-2024-009 | COMPLETED | PENDING | 3,300,000 | Tim Apple | Trần Thị Bình |
| MKT-COMBO-2024-013 | COMPLETED | PENDING | 9,350,000 | Tim Apple | Trần Thị Bình |
| MKT-PREMIUM-2024-015 | COMPLETED | PAID | 26,500,000 | Tim Apple | Trần Thị Bình |
| MKT-CARE-2024-001 | COMPLETED | PAID | 12,100,000 | Tim Apple | Phạm Hoàng Dung |

**Order IDs cho test:**

| Order Code | ID |
|------------|------|
| MKT-VIRAL-2024-002 | `09f33908-d459-44c3-999e-97f42faf6d30` |
| MKT-UID-2024-003 | `0200e865-6bb2-4645-904c-1ee9fc021c1e` |
| MKT-ZALO-2024-007 | `642c3b7b-6fff-4fbb-a096-7f5432260ed8` |
| MKT-PREMIUM-2024-015 | `01f52114-52d6-4e77-8a1a-5cf064ac8451` |

**Customer IDs:**

| Customer | ID |
|----------|------|
| Lê Minh Cường | `9c500415-1e6a-4320-8770-a6a33d03f0a2` |
| Trần Thị Bình | `1e75547f-3d1c-4da8-99a9-b716f3b17ab9` |
| Phạm Hoàng Dung | `cbdb1f84-693c-4f66-8049-93169a0231c4` |

### 1.4 Template Permissions cho ORDERS resource

| Template | Priority | allowedActions | deniedActions |
|----------|----------|----------------|---------------|
| CEO | 1000 | READ, CREATE, UPDATE, DELETE, MANAGE, EXPORT, IMPORT, APPROVE, REJECT, ARCHIVE, RESTORE, ASSIGN | - |
| VP | 900 | READ, CREATE, UPDATE, DELETE | - |
| SALES_DIRECTOR | 800 | READ, CREATE, UPDATE, DELETE, APPROVE | - |
| DIRECTOR | 800 | READ, CREATE, UPDATE, EXPORT | DELETE |
| MANAGER | 700 | READ, CREATE, UPDATE, EXPORT | DELETE |
| SALES_MANAGER | 700 | READ, CREATE, UPDATE, APPROVE | DELETE |
| ACCOUNTANT_STAFF | 550 | READ, EXPORT | CREATE, UPDATE, DELETE |
| SALES_STAFF | 500 | READ, CREATE, UPDATE | DELETE, APPROVE |
| SUPPORT_STAFF | 500 | READ, UPDATE | CREATE, DELETE, APPROVE |

### 1.5 PermissionContext (filterExpression theo contextKey)

| contextKey | DataAccessScope | filterExpression |
|-----------|-----------------|------------------|
| `all` | ALL_RECORDS | `{}` (no filter) |
| `department` | DEPARTMENT_RECORDS | `{ $or: [{ departmentId: '$user.departmentId' }, { departmentId: { $in: '$user.departmentDescendantIds' } }] }` |
| `team` | TEAM_RECORDS | `{ $or: [{ createdById: '$user.workspaceMemberId' }, { createdById: { $in: '$user.teamMemberIds' } }, { accountOwnerId: { $in: '$user.teamMemberIds' } }] }` |
| `own` | OWN_RECORDS | `{ $or: [{ createdById: '$user.workspaceMemberId' }, { accountOwnerId: '$user.workspaceMemberId' }] }` |

### 1.6 RequireOrderReadAccess authorization

Decorator `@RequireOrderReadAccess()` uses `ORDER_AUTHORIZATION.UPDATE_STATUS`:

```
allowedDepartments: SALES + child teams + ACCOUNTING + child teams
allowManagers: true
allowExecutives: true
```

Child teams:
- SALES → SALES_DOMESTIC, SALES_INTERNATIONAL, SALES_ONLINE, SALES_PARTNER
- ACCOUNTING → ACCOUNTING_PAYABLE, ACCOUNTING_RECEIVABLE, ACCOUNTING_TAX, ACCOUNTING_AUDIT

---

## 2. Ma trận phân quyền

### 2.1 Department Authorization (Guard) — Ai được phép truy cập?

| User | Dept | Level | Guard Result | Lý do |
|------|------|-------|-------------|-------|
| Jony Ive | SALES | 1 | **ALLOW** | Executive (level 1) |
| Craig Federighi | TECH | 2 | **ALLOW** | Executive (level 2) |
| Angela Ahrendts | SALES | 3 | **ALLOW** | Executive (level 3) |
| Michael Brown | TECH | 4 | **DENY** | TECH not in allowedDepts, not manager (allowManagers=true nhưng level 4 = SENIOR_DIRECTOR, không phải Manager level <= 7... thực tế level 4 < 7 nên **ALLOW** via manager check) |
| Sarah Chen | SALES | 5 | **ALLOW** | SALES department match |
| Emily Wilson | ACCOUNTING | 6 | **ALLOW** | ACCOUNTING department match |
| Dan Riccio | SUPPORT | 6 | **ALLOW** | Manager check (level 6 <= 7, allowManagers=true) |
| Deirdre O'Brien | HR | 7 | **ALLOW** | Manager check (level 7 <= 7) |
| Tim Apple | TECH_BACKEND | 7 | **ALLOW** | Manager check (level 7) |
| Eddy Cue | SALES | 7 | **ALLOW** | SALES department match + Manager |
| Phil Schiler | TECH_FRONTEND | 8 | **DENY** | Level 8, TECH_FRONTEND not in allowed, not manager |
| Lisa Jackson | ACCOUNTING | 8 | **ALLOW** | ACCOUNTING department match |
| Greg Joswiak | SALES_DOMESTIC | 9 | **ALLOW** | SALES_DOMESTIC is child of SALES (ancestor match) |
| John Ternus | SUPPORT | 9 | **DENY** | SUPPORT not in allowed, level 9 not manager |
| Jane Austen | TECH_DEVOPS | 9 | **DENY** | TECH_DEVOPS not in allowed, level 9 not manager |
| Luca Maestri | TECH_QA | 10 | **DENY** | TECH_QA not in allowed, level 10 not manager |
| Jeff Williams | TECH_DATA | 11 | **DENY** | TECH_DATA not in allowed, level 11 not manager |

### 2.2 DataScope Filter — Ai thấy gì?

| User | Level | DataAccessScope | contextKey | Filter |
|------|-------|-----------------|------------|--------|
| Jony Ive | 1 | ALL_DEPARTMENTS | `all` | `null` (hasFullAccess=true, thấy tất cả) |
| Craig Federighi | 2 | ALL_DEPARTMENTS | `all` | `null` (hasFullAccess=true) |
| Angela Ahrendts | 3 | ALL_DEPARTMENTS | `all` | `null` (hasFullAccess=true) |
| Sarah Chen | 5 | OWN_AND_CHILD_DEPARTMENTS | `department` | `departmentId IN [SALES + child dept IDs]` |
| Emily Wilson | 6 | OWN_AND_CHILD_DEPARTMENTS | `department` | `departmentId IN [ACCOUNTING + child dept IDs]` |
| Dan Riccio | 6 | OWN_AND_CHILD_DEPARTMENTS | `department` | `departmentId IN [SUPPORT + child dept IDs]` |
| Deirdre O'Brien | 7 | OWN_DEPARTMENT_AND_TEAM | `team` | `createdById IN [self + team members]` |
| Tim Apple | 7 | OWN_DEPARTMENT_AND_TEAM | `team` | `createdById IN [self + TECH_BACKEND team]` |
| Eddy Cue | 7 | OWN_DEPARTMENT_AND_TEAM | `team` | `createdById IN [self + SALES team]` |
| Lisa Jackson | 8 | OWN_RECORDS | `own` | `createdById = self OR accountOwnerId = self` |
| Greg Joswiak | 9 | OWN_RECORDS | `own` | `createdById = self OR accountOwnerId = self` |

---

## 3. TC Group 1: getOrderById

### Decorators trên method:
- `@RequireOrderReadAccess()` → Department guard
- `@DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)` → mode: AUTO, audit: medium

### TC-1.1: CEO xem bất kỳ order

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.1 |
| **User** | Jony Ive (CEO, level 1, SALES) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` (MKT-VIRAL-2024-002) |
| **Guard** | ALLOW (executive level 1) |
| **DataScope** | hasFullAccess=true, filter=null |
| **Expected** | Order MKT-VIRAL-2024-002 returned, totalAmount=17,100,000 |

### TC-1.2: Sales Manager xem order của team member

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.2 |
| **User** | Eddy Cue (SALES_MANAGER, level 7, SALES) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` |
| **Guard** | ALLOW (SALES department match) |
| **DataScope** | contextKey=`team`, filter: `createdById IN [self + SALES team members]` |
| **Expected** | Order returned nếu Tim Apple thuộc SALES team members của Eddy Cue. Nếu Tim Apple ở TECH_BACKEND (khác team) → return null |

### TC-1.3: Sales Staff xem order do người khác tạo

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.3 |
| **User** | Greg Joswiak (SALES_STAFF, level 9, SALES_DOMESTIC) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` (created by Tim Apple) |
| **Guard** | ALLOW (SALES_DOMESTIC ancestor match SALES) |
| **DataScope** | contextKey=`own`, filter: `createdById = Greg OR accountOwnerId = Greg` |
| **Expected** | return **null** (order do Tim Apple tạo, không phải Greg) |

### TC-1.4: Sales Staff xem order do mình tạo

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.4 |
| **User** | Greg Joswiak (SALES_STAFF, level 9) |
| **Precondition** | Tạo order với `createdById = f098b41c-242e-4075-b3a7-5063f40a0602` |
| **Input** | `orderId: <new-order-id>` |
| **Guard** | ALLOW |
| **DataScope** | filter: `createdById = Greg` |
| **Expected** | Order returned (createdById match) |

### TC-1.5: TECH staff bị chặn bởi guard

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.5 |
| **User** | Phil Schiler (SENIOR, level 8, TECH_FRONTEND) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` |
| **Guard** | **DENY** (TECH_FRONTEND not in allowed, level 8 not manager) |
| **Expected** | `ForbiddenException: "Only Sales, Accounting, Managers and Executives can view Orders"` |

### TC-1.6: SUPPORT staff bị chặn

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.6 |
| **User** | John Ternus (SUPPORT_STAFF, level 9, SUPPORT) |
| **Input** | `orderId: "642c3b7b-6fff-4fbb-a096-7f5432260ed8"` |
| **Guard** | **DENY** (SUPPORT not in allowed, level 9 not manager) |
| **Expected** | `ForbiddenException` |

### TC-1.7: Accounting staff xem order (read-only filter)

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.7 |
| **User** | Lisa Jackson (ACCOUNTANT_STAFF, level 8, ACCOUNTING) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` (created by Tim Apple) |
| **Guard** | ALLOW (ACCOUNTING department match) |
| **DataScope** | contextKey=`own`, filter: `createdById = Lisa OR accountOwnerId = Lisa` |
| **Expected** | return **null** (Lisa không phải creator hoặc owner) |

### TC-1.8: Intern bị chặn

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.8 |
| **User** | Jeff Williams (INTERN, level 11, TECH_DATA) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` |
| **Guard** | **DENY** (TECH_DATA not in allowed, level 11) |
| **Expected** | `ForbiddenException` |

### TC-1.9: Order không tồn tại

| Field | Value |
|-------|-------|
| **TC ID** | TC-1.9 |
| **User** | Jony Ive (CEO) |
| **Input** | `orderId: "00000000-0000-0000-0000-000000000000"` |
| **Guard** | ALLOW |
| **DataScope** | hasFullAccess=true |
| **Expected** | return **null** (order not found) |

---

## 4. TC Group 2: getOrderByCode

### Decorators: `@RequireOrderReadAccess()` + `@DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)`

### TC-2.1: VP xem order bằng code

| Field | Value |
|-------|-------|
| **TC ID** | TC-2.1 |
| **User** | Angela Ahrendts (VP, level 3, SALES) |
| **Input** | `orderCode: "MKT-PREMIUM-2024-015"` |
| **Guard** | ALLOW (executive level 3) |
| **DataScope** | hasFullAccess=true |
| **Expected** | Order returned, totalAmount=26,500,000 |

### TC-2.2: Sales staff xem order code do người khác tạo

| Field | Value |
|-------|-------|
| **TC ID** | TC-2.2 |
| **User** | Greg Joswiak (SALES_STAFF, level 9) |
| **Input** | `orderCode: "MKT-PREMIUM-2024-015"` |
| **Guard** | ALLOW (SALES_DOMESTIC ancestor match) |
| **DataScope** | contextKey=`own`, filter by self |
| **Expected** | return **null** (not Greg's order) |

### TC-2.3: HR Manager pass guard nhưng filter hạn chế

| Field | Value |
|-------|-------|
| **TC ID** | TC-2.3 |
| **User** | Deirdre O'Brien (MANAGER, level 7, HR) |
| **Input** | `orderCode: "MKT-VIRAL-2024-002"` |
| **Guard** | ALLOW (manager level 7, allowManagers=true) |
| **DataScope** | contextKey=`team`, filter: `createdById IN [self + HR team members]` |
| **Expected** | return **null** (order do Tim Apple tạo, Tim không thuộc HR team) |

---

## 5. TC Group 3: getOrders (paginated)

### Decorators: `@RequireOrderReadAccess()` + `@DataScope(ORDER_DATA_SCOPE.QUERY_LIST)`

### TC-3.1: CEO xem tất cả orders

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.1 |
| **User** | Jony Ive (CEO, level 1) |
| **Input** | `input: null` (default pagination) |
| **Guard** | ALLOW |
| **DataScope** | hasFullAccess=true, filter=null |
| **Expected** | Tất cả orders returned (15 orders), totalCount=15 |

### TC-3.2: CEO filter theo status

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.2 |
| **User** | Jony Ive (CEO) |
| **Input** | `{ filter: { status: "COMPLETED" } }` |
| **Expected** | Tất cả COMPLETED orders (15 orders) |

### TC-3.3: CEO filter theo paymentStatus PENDING

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.3 |
| **User** | Jony Ive (CEO) |
| **Input** | `{ filter: { paymentStatus: "PENDING" } }` |
| **Expected** | 3 orders: MKT-UID-2024-003, MKT-TWITTER-2024-009, MKT-COMBO-2024-013 |

### TC-3.4: Sales Director xem orders của department

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.4 |
| **User** | Sarah Chen (SALES_DIRECTOR, level 5, SALES) |
| **Input** | `input: null` |
| **Guard** | ALLOW (SALES department) |
| **DataScope** | contextKey=`department`, filter: `departmentId IN [SALES + descendants]` |
| **Expected** | Orders có `departmentId` thuộc SALES tree. Vì orders không có `departmentId` trực tiếp mà filter theo department → kết quả phụ thuộc vào implementation filter mapping |

### TC-3.5: Sales Staff chỉ thấy orders của mình

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.5 |
| **User** | Greg Joswiak (SALES_STAFF, level 9) |
| **Input** | `input: null` |
| **Guard** | ALLOW (SALES_DOMESTIC ancestor match) |
| **DataScope** | contextKey=`own`, filter: `createdById = Greg OR accountOwnerId = Greg` |
| **Expected** | Chỉ orders do Greg tạo hoặc Greg là account owner. Hiện tại tất cả orders do Tim Apple tạo → **totalCount=0, orders=[]** |

### TC-3.6: Manager (TECH_BACKEND) thấy orders của team

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.6 |
| **User** | Tim Apple (MANAGER, level 7, TECH_BACKEND) |
| **Input** | `input: null` |
| **Guard** | ALLOW (manager level 7) |
| **DataScope** | contextKey=`team`, filter: `createdById IN [Tim + TECH_BACKEND team]` |
| **Expected** | Tim Apple là creator của tất cả orders → **tất cả orders do Tim tạo returned** (vì Tim's memberId match createdById) |

### TC-3.7: Pagination test

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.7 |
| **User** | Jony Ive (CEO) |
| **Input** | `{ pagination: { page: 1, limit: 5 } }` |
| **Expected** | 5 orders returned, totalCount=15, pageInfo.hasNextPage=true |

### TC-3.8: Sorting test

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.8 |
| **User** | Jony Ive (CEO) |
| **Input** | `{ sort: { field: "totalAmount", direction: "DESC" } }` |
| **Expected** | First order = MKT-PREMIUM-2024-015 (26,500,000) |

### TC-3.9: TECH staff bị chặn

| Field | Value |
|-------|-------|
| **TC ID** | TC-3.9 |
| **User** | Jane Austen (JUNIOR, level 9, TECH_DEVOPS) |
| **Input** | `input: null` |
| **Guard** | **DENY** |
| **Expected** | `ForbiddenException` |

---

## 6. TC Group 4: getOrdersByCustomer

### Decorators: `@RequireOrderReadAccess()` + `@DataScope(ORDER_DATA_SCOPE.QUERY_BY_CUSTOMER)`

### TC-4.1: CEO xem orders của customer

| Field | Value |
|-------|-------|
| **TC ID** | TC-4.1 |
| **User** | Jony Ive (CEO) |
| **Input** | `customerId: "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"` (Trần Thị Bình) |
| **Guard** | ALLOW |
| **DataScope** | hasFullAccess=true |
| **Expected** | 7 orders (MKT-ZALO-007, MKT-GROUP-008, MKT-TWITTER-009, MKT-PAGE-010, MKT-MAPS-011, MKT-MAPS-FOREVER-012, MKT-COMBO-013, MKT-CARE-014, MKT-PREMIUM-015) |

### TC-4.2: Sales Staff chỉ thấy orders mình tạo cho customer

| Field | Value |
|-------|-------|
| **TC ID** | TC-4.2 |
| **User** | Greg Joswiak (SALES_STAFF, level 9) |
| **Input** | `customerId: "1e75547f-3d1c-4da8-99a9-b716f3b17ab9"` |
| **Guard** | ALLOW |
| **DataScope** | contextKey=`own`, filter by self |
| **Expected** | **totalCount=0** (tất cả orders do Tim tạo, không phải Greg) |

### TC-4.3: Accounting Senior Manager xem orders

| Field | Value |
|-------|-------|
| **TC ID** | TC-4.3 |
| **User** | Emily Wilson (FINANCE_ANALYST, level 6, ACCOUNTING) |
| **Input** | `customerId: "9c500415-1e6a-4320-8770-a6a33d03f0a2"` (Lê Minh Cường) |
| **Guard** | ALLOW (ACCOUNTING department) |
| **DataScope** | contextKey=`department`, filter: `departmentId IN [ACCOUNTING + children]` |
| **Expected** | Kết quả phụ thuộc vào orders nào có departmentId/createdBy mapping tới ACCOUNTING tree |

---

## 7. TC Group 5: getOrdersByStatus

### Decorators: `@RequireOrderReadAccess()` + `@DataScope(ORDER_DATA_SCOPE.QUERY_LIST)`

### TC-5.1: CEO filter COMPLETED

| Field | Value |
|-------|-------|
| **TC ID** | TC-5.1 |
| **User** | Jony Ive (CEO) |
| **Input** | `status: "COMPLETED"` |
| **Expected** | Tất cả 15 COMPLETED orders returned |

### TC-5.2: Sales staff filter COMPLETED (chỉ thấy của mình)

| Field | Value |
|-------|-------|
| **TC ID** | TC-5.2 |
| **User** | Greg Joswiak (SALES_STAFF, level 9) |
| **Input** | `status: "COMPLETED"` |
| **Guard** | ALLOW |
| **DataScope** | contextKey=`own` |
| **Expected** | **totalCount=0** (không có order COMPLETED nào do Greg tạo) |

---

## 8. TC Group 6: getOrderPaymentSummary

### Decorators: `@RequireOrderReadAccess()` + `@DataScope(ORDER_DATA_SCOPE.QUERY_PAYMENT_SUMMARY)`

### TC-6.1: CEO xem payment summary

| Field | Value |
|-------|-------|
| **TC ID** | TC-6.1 |
| **User** | Jony Ive (CEO) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` (MKT-VIRAL-2024-002) |
| **Guard** | ALLOW |
| **DataScope** | hasFullAccess=true |
| **Expected** | `{ totalAmount: 17100000, paidAmount: 17100000, remainingAmount: 0, paymentStatus: "PAID", paidPercent: 100 }` |

### TC-6.2: CEO xem order chưa thanh toán

| Field | Value |
|-------|-------|
| **TC ID** | TC-6.2 |
| **User** | Jony Ive (CEO) |
| **Input** | `orderId: "0200e865-6bb2-4645-904c-1ee9fc021c1e"` (MKT-UID-2024-003, PENDING) |
| **Expected** | `{ totalAmount: 6600000, paidAmount: 0, remainingAmount: 6600000, paymentStatus: "PENDING", paidPercent: 0 }` |

### TC-6.3: Sales staff bị filter → null

| Field | Value |
|-------|-------|
| **TC ID** | TC-6.3 |
| **User** | Greg Joswiak (level 9) |
| **Input** | `orderId: "09f33908-d459-44c3-999e-97f42faf6d30"` |
| **Guard** | ALLOW |
| **DataScope** | filter by own |
| **Expected** | return **null** (order không phải của Greg) |

---

## 9. TC Group 7: getCustomerOrderStats

### Decorators: `@RequireOrderReadAccess()` + `@DataScope(ORDER_DATA_SCOPE.QUERY_AGGREGATION)`

**QUERY_AGGREGATION mode = SKIP** → Không apply filter. Tất cả users pass guard đều thấy full statistics.

### TC-7.1: CEO xem stats

| Field | Value |
|-------|-------|
| **TC ID** | TC-7.1 |
| **User** | Jony Ive (CEO) |
| **Input** | `customerId: "9c500415-1e6a-4320-8770-a6a33d03f0a2"` (Lê Minh Cường) |
| **Guard** | ALLOW |
| **DataScope** | mode=SKIP, skipped=true |
| **Expected** | `{ orderCount: >= 4, totalValue: >= 50100000 }` |

### TC-7.2: Sales staff cũng thấy full stats (SKIP mode)

| Field | Value |
|-------|-------|
| **TC ID** | TC-7.2 |
| **User** | Greg Joswiak (SALES_STAFF, level 9) |
| **Input** | `customerId: "9c500415-1e6a-4320-8770-a6a33d03f0a2"` |
| **Guard** | ALLOW |
| **DataScope** | mode=SKIP → **không filter** |
| **Expected** | Same stats as CEO (aggregation không bị filter) |

### TC-7.3: TECH staff bị chặn bởi guard

| Field | Value |
|-------|-------|
| **TC ID** | TC-7.3 |
| **User** | Luca Maestri (JUNIOR, level 10, TECH_QA) |
| **Input** | `customerId: "9c500415-1e6a-4320-8770-a6a33d03f0a2"` |
| **Guard** | **DENY** |
| **Expected** | `ForbiddenException` |

---

## 10. TC Group 8: Edge Cases

### TC-8.1: User không có department

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.1 |
| **User** | User mới, chưa assign department |
| **Input** | Any query |
| **Guard** | DENY (departmentCode=null, không match allowed, không phải executive/manager) |
| **Expected** | `ForbiddenException` |

### TC-8.2: User không có organizationLevel

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.2 |
| **User** | User mới, chưa assign organizationLevel |
| **Input** | Any query |
| **Context** | Default hierarchyLevel=11 (INTERN), dataAccessScope=OWN_RECORDS |
| **Guard** | Depends on department |
| **Expected** | Nếu pass guard → contextKey=`own`, chỉ thấy bản ghi mình |

### TC-8.3: User không authenticated

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.3 |
| **User** | Không có JWT token |
| **Expected** | `UnauthorizedException` từ WorkspaceAuthGuard/UserAuthGuard (trước RBAC) |

### TC-8.4: Manager từ HR department xem orders (cross-department)

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.4 |
| **User** | Deirdre O'Brien (MANAGER, level 7, HR) |
| **Input** | `getOrders()` |
| **Guard** | ALLOW (allowManagers=true, level 7) |
| **DataScope** | contextKey=`team`, filter: `createdById IN [self + HR team]` |
| **Expected** | Chỉ orders do HR team members tạo. Tim Apple ở TECH_BACKEND → Tim's orders **không** trả về |

### TC-8.5: C-Level (TECH) xem orders — cross-department executive

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.5 |
| **User** | Craig Federighi (C_LEVEL, level 2, TECH) |
| **Input** | `getOrders()` |
| **Guard** | ALLOW (executive level 2) |
| **DataScope** | hasFullAccess=true |
| **Expected** | **Tất cả orders** (hasFullAccess bypass filter dù thuộc TECH) |

### TC-8.6: Senior Director (TECH) — level 4 pass manager check

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.6 |
| **User** | Michael Brown (MANAGER template, level 4, TECH) |
| **Input** | `getOrders()` |
| **Guard** | ALLOW (level 4 <= 7, allowManagers=true) |
| **DataScope** | contextKey=`department`, filter: `departmentId IN [TECH + children]` |
| **Expected** | Orders có departmentId thuộc TECH tree |

### TC-8.7: SALES_DOMESTIC staff — ancestor department match

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.7 |
| **User** | Greg Joswiak (level 9, SALES_DOMESTIC) |
| **Input** | `getOrders()` |
| **Guard** | ALLOW (SALES_DOMESTIC is in `combineWithChildTeams([SALES])`) |
| **DataScope** | contextKey=`own` |
| **Expected** | Guard passes via child team match, but DataScope limits to own records |

### TC-8.8: Template priority override — TEAM_LEAD từ SUPPORT

| Field | Value |
|-------|-------|
| **TC ID** | TC-8.8 |
| **User** | Dan Riccio (TEAM_LEAD template priority=600, level 6, SUPPORT) |
| **Input** | `getOrderById("09f33908-...")` |
| **Guard** | ALLOW (level 6 <= 7, allowManagers=true) |
| **DataScope** | contextKey=`department`, filter: departmentId IN [SUPPORT + children] |
| **Expected** | Order returned chỉ nếu order thuộc SUPPORT department tree |

---

## Tóm tắt kết quả mong đợi

### Guard Access Matrix (tổng hợp)

| User | Department | Level | Guard | DataScope |
|------|-----------|-------|-------|-----------|
| Jony Ive | SALES | 1 | ALLOW | ALL (no filter) |
| Craig Federighi | TECH | 2 | ALLOW | ALL (no filter) |
| Angela Ahrendts | SALES | 3 | ALLOW | ALL (no filter) |
| Michael Brown | TECH | 4 | ALLOW | department filter |
| Sarah Chen | SALES | 5 | ALLOW | department filter |
| Emily Wilson | ACCOUNTING | 6 | ALLOW | department filter |
| Dan Riccio | SUPPORT | 6 | ALLOW | department filter |
| Deirdre O'Brien | HR | 7 | ALLOW | team filter |
| Tim Apple | TECH_BACKEND | 7 | ALLOW | team filter |
| Eddy Cue | SALES | 7 | ALLOW | team filter |
| Phil Schiler | TECH_FRONTEND | 8 | **DENY** | - |
| Lisa Jackson | ACCOUNTING | 8 | ALLOW | own records |
| Greg Joswiak | SALES_DOMESTIC | 9 | ALLOW | own records |
| John Ternus | SUPPORT | 9 | **DENY** | - |
| Jane Austen | TECH_DEVOPS | 9 | **DENY** | - |
| Luca Maestri | TECH_QA | 10 | **DENY** | - |
| Jeff Williams | TECH_DATA | 11 | **DENY** | - |

### Thống kê

- **ALLOW:** 10/17 users (59%)
- **DENY:** 7/17 users (41%)
- **Full Access (no filter):** 3 users (level 1-3)
- **Department filter:** 4 users (level 4-6)
- **Team filter:** 3 users (level 7)
- **Own records only:** 2 users (level 8-9 in allowed depts)
- **Total test cases:** 35
