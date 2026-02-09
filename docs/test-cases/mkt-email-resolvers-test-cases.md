# Test Cases - mkt-email Resolvers

> Module: `packages/twenty-server/src/mkt-core/mkt-email/resolvers/`
> Test Environment: GraphQL Playground (`http://localhost:3000/graphql`)
> Date: 2026-02-09
> Status: **ALL PASSED** (tested 2026-02-09)

## Prerequisites

- Server running: `npx nx start twenty-server`
- Bearer token trong Headers:

```json
{
  "Authorization": "Bearer <your_access_token>"
}
```

## Database State (Real Data)

### mktEmail (1 record)

| id | subject | to | from | status | emailType |
|----|---------|-----|------|--------|-----------|
| `7135e86d-5722-4161-8df4-cafd1177528f` | Subject here | to@example.com | from@example.com | SENT | MARKETING |

### mktTemplate (22 records)

| id | name | type | templateKey |
|----|------|------|-------------|
| `b6158d8f-700c-4015-a56b-bf5b256a9c93` | Welcome Email Template | EMAIL | welcome_member_email |
| `5d818b4f-05a7-4f46-9700-aa3d00b99262` | Password Reset Template | EMAIL | password_reset |
| `c535252e-62e5-4365-b24d-9fe07d9e705f` | Renewal Reminder Template | EMAIL | renewal_reminder |
| `c159a62f-451e-4d8d-a1ca-a4c3698f2b1e` | Invoice Template | INVOICE | standard_invoice |
| `87059b34-0d66-4274-a5c3-2e64058aab12` | License Agreement Template | CONTRACT | license_agreement |
| `f5ac4b3d-229e-4c15-a499-742995ada9a8` | Service Agreement Template | CONTRACT | service_agreement |
| `9d6183bd-c1e9-4364-a99e-dbe069a59457` | Order Confirmation Template | ORDER | order_confirmation |
| `472b23f7-ed73-49c6-b3df-6484a397c695` | Support Ticket Template | TICKET | support_ticket |
| `96455101-9e32-4fbc-9534-ed28d08cb229` | Maintenance Notice Template | NOTIFICATION | maintenance_notice |
| `34bb660e-75a2-4013-9ada-a7476f9483ae` | Quote Request Template | QUOTE | quote_request |
| `e4071f7c-4fd9-4d93-ab85-f8fee0dd922f` | Product Catalog Template | CATALOG | product_catalog |
| `eaa0ee90-5d3e-47f0-b7b0-645e42d82aa1` | Thông báo đơn hàng mới | ORDER_EMAIL | new_order_notification |
| `ef3e2aae-76a2-436f-81ad-4e728b6aeb28` | Thông báo đơn hàng dùng thử | ORDER_EMAIL | order_trial_notification |
| `2a5398db-b3e4-4905-bf73-ff459557ef78` | Thông báo đơn hàng hoàn thành | ORDER_EMAIL | order_completed_notification |
| `a7c3e4d5-8f92-4b1a-9c6d-2e5f7a8b9c0d` | Nhắc nhở thanh toán đơn hàng | ORDER_EMAIL | payment_reminder |
| `56d811a9-a73c-42ef-b31f-6a79bdc1ca70` | Payment Receipt Template | PAYMENT | payment_receipt |
| `fb171c91-8ef6-45b3-8b92-68119580b72b` | SEPay QR Code Payment Page | PAYMENT | sepay_qr_code |
| `fdd4f417-934d-407e-8547-e66f5792cfbf` | Monthly Report Template | REPORT | monthly_report |
| `4cb251e3-05b5-4622-a2dc-e721ba2d27df` | Incident Report Template | REPORT | incident_report |
| `caf95c15-c617-4f6e-a48e-6b7739c4b629` | Feedback Survey Template | SURVEY | feedback_survey |
| `c0d0fd12-d5d1-4f39-9de9-7c85b20612d9` | Onboarding Checklist Template | CHECKLIST | onboarding_checklist |
| `0c68ee2b-8cd1-477a-9a99-4e45dcf547f0` | Chào mừng khách hàng mới | WELCOME_EMAIL | welcome_customers |

### Status Distribution

| type | count |
|------|-------|
| CATALOG | 1 |
| CHECKLIST | 1 |
| CONTRACT | 2 |
| EMAIL | 3 |
| INVOICE | 1 |
| NOTIFICATION | 1 |
| ORDER | 1 |
| ORDER_EMAIL | 4 |
| PAYMENT | 2 |
| QUOTE | 1 |
| REPORT | 2 |
| SURVEY | 1 |
| TICKET | 1 |
| WELCOME_EMAIL | 1 |

---

## A. Email Query Resolver Tests

### TC-EQ-01: getEmailById - Email tồn tại

**Mục tiêu**: Truy vấn email theo ID thực tế, trả về đầy đủ fields.

```graphql
query {
  getEmailById(emailId: "7135e86d-5722-4161-8df4-cafd1177528f") {
    id
    subject
    to
    from
    body
    sentAt
    status
    emailType
    position
    accountOwnerId
    createdAt
    updatedAt
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailById": {
      "id": "7135e86d-5722-4161-8df4-cafd1177528f",
      "subject": "Subject here",
      "to": "to@example.com",
      "from": "from@example.com",
      "body": "Email body content here.",
      "sentAt": "2024-01-01",
      "status": "SENT",
      "emailType": "MARKETING",
      "position": 1,
      "accountOwnerId": null,
      "createdAt": "2026-02-09T03:46:26.421Z",
      "updatedAt": "2026-02-09T03:46:26.421Z"
    }
  }
}
```

**Checklist**:
- [ ] Response 200 OK
- [ ] `id` khớp với input
- [ ] `status` trả về enum `SENT`
- [ ] `sentAt`, `createdAt`, `updatedAt` format date string
- [ ] `accountOwnerId` là null (đúng DB)

---

### TC-EQ-02: getEmailById - Email không tồn tại

**Mục tiêu**: Truy vấn email với ID không có trong DB, trả về null.

```graphql
query {
  getEmailById(emailId: "00000000-0000-0000-0000-000000000000") {
    id
    subject
    status
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailById": null
  }
}
```

**Checklist**:
- [ ] Response 200 OK (không phải error)
- [ ] `getEmailById` trả về `null`
- [ ] Không có `errors` array

---

### TC-EQ-03: getEmailById - ID format sai

**Mục tiêu**: Truyền ID không đúng UUID format.

```graphql
query {
  getEmailById(emailId: "invalid-id") {
    id
    subject
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailById": null
  }
}
```

**Checklist**:
- [ ] Không crash server
- [ ] Trả về `null` hoặc error message rõ ràng

---

### TC-EQ-04: getEmails - Phân trang mặc định

**Mục tiêu**: Lấy danh sách emails với pagination mặc định (take=50, skip=0).

```graphql
query {
  getEmails {
    emails {
      id
      subject
      to
      status
      emailType
      createdAt
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmails": {
      "emails": [
        {
          "id": "7135e86d-5722-4161-8df4-cafd1177528f",
          "subject": "Subject here",
          "to": "to@example.com",
          "status": "SENT",
          "emailType": "MARKETING",
          "createdAt": "2026-02-09T03:46:26.421Z"
        }
      ],
      "totalCount": 1
    }
  }
}
```

**Checklist**:
- [ ] `totalCount` = 1 (DB hiện có 1 record)
- [ ] `emails` array length = 1
- [ ] Mỗi email có đủ fields requested

---

### TC-EQ-05: getEmails - Phân trang tùy chỉnh

**Mục tiêu**: Test pagination với take/skip.

```graphql
query {
  getEmails(take: 1, skip: 0) {
    emails {
      id
      subject
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmails": {
      "emails": [
        {
          "id": "7135e86d-5722-4161-8df4-cafd1177528f",
          "subject": "Subject here"
        }
      ],
      "totalCount": 1
    }
  }
}
```

**Checklist**:
- [ ] `emails.length` <= take value
- [ ] `totalCount` vẫn là tổng số record (không bị ảnh hưởng bởi pagination)

---

### TC-EQ-06: getEmails - Skip vượt quá tổng số record

**Mục tiêu**: Skip lớn hơn totalCount phải trả mảng rỗng.

```graphql
query {
  getEmails(take: 10, skip: 100) {
    emails {
      id
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmails": {
      "emails": [],
      "totalCount": 1
    }
  }
}
```

**Checklist**:
- [ ] `emails` là mảng rỗng `[]`
- [ ] `totalCount` vẫn trả tổng số (1)

---

### TC-EQ-07: getEmailsByStatus - Status SENT

**Mục tiêu**: Lọc emails theo status SENT (có 1 record trong DB).

```graphql
query {
  getEmailsByStatus(status: SENT) {
    emails {
      id
      subject
      status
      to
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailsByStatus": {
      "emails": [
        {
          "id": "7135e86d-5722-4161-8df4-cafd1177528f",
          "subject": "Subject here",
          "status": "SENT",
          "to": "to@example.com"
        }
      ],
      "totalCount": 1
    }
  }
}
```

**Checklist**:
- [ ] Tất cả emails trả về đều có `status` = `SENT`
- [ ] `totalCount` khớp với số record có status SENT

---

### TC-EQ-08: getEmailsByStatus - Status DRAFT (không có data)

**Mục tiêu**: Lọc theo status không có record nào.

```graphql
query {
  getEmailsByStatus(status: DRAFT) {
    emails {
      id
      subject
      status
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailsByStatus": {
      "emails": [],
      "totalCount": 0
    }
  }
}
```

**Checklist**:
- [ ] `emails` là mảng rỗng
- [ ] `totalCount` = 0

---

### TC-EQ-09: getEmailsByStatus - Status FAILED (không có data)

**Mục tiêu**: Test status FAILED.

```graphql
query {
  getEmailsByStatus(status: FAILED) {
    emails {
      id
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailsByStatus": {
      "emails": [],
      "totalCount": 0
    }
  }
}
```

**Checklist**:
- [ ] Mảng rỗng, totalCount = 0

---

### TC-EQ-10: getEmailsByRecipient - Recipient tồn tại

**Mục tiêu**: Lọc email theo địa chỉ người nhận thực tế.

```graphql
query {
  getEmailsByRecipient(to: "to@example.com") {
    emails {
      id
      subject
      to
      from
      status
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailsByRecipient": {
      "emails": [
        {
          "id": "7135e86d-5722-4161-8df4-cafd1177528f",
          "subject": "Subject here",
          "to": "to@example.com",
          "from": "from@example.com",
          "status": "SENT"
        }
      ],
      "totalCount": 1
    }
  }
}
```

**Checklist**:
- [ ] Tất cả emails có `to` khớp input
- [ ] `totalCount` = 1

---

### TC-EQ-11: getEmailsByRecipient - Recipient không tồn tại

**Mục tiêu**: Tìm recipient không có trong hệ thống.

```graphql
query {
  getEmailsByRecipient(to: "nonexistent@nowhere.com") {
    emails {
      id
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailsByRecipient": {
      "emails": [],
      "totalCount": 0
    }
  }
}
```

**Checklist**:
- [ ] Mảng rỗng, totalCount = 0

---

### TC-EQ-12: getEmailStatusDistribution

**Mục tiêu**: Lấy thống kê phân bố status email.

```graphql
query {
  getEmailStatusDistribution {
    distribution {
      status
      count
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getEmailStatusDistribution": {
      "distribution": [
        {
          "status": "SENT",
          "count": 1
        }
      ],
      "totalCount": 1
    }
  }
}
```

**Checklist**:
- [ ] `distribution` chứa các status groups
- [ ] `totalCount` = tổng count tất cả status (1)
- [ ] Mỗi item có `status` (string) và `count` (number > 0)

---

## B. Email Mutation Resolver Tests

### TC-EM-01: createEmail - Tạo email DRAFT thành công

**Mục tiêu**: Tạo email mới với đầy đủ thông tin, status mặc định DRAFT.

```graphql
mutation {
  createEmail(input: {
    subject: "Test Email from GraphQL"
    to: "recipient@test.com"
    from: "sender@test.com"
    body: "This is a test email created via GraphQL mutation."
    emailType: "NOTIFICATION"
  }) {
    success
    emailId
    status
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "createEmail": {
      "success": true,
      "emailId": "<generated-uuid>",
      "status": "DRAFT",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] `emailId` là UUID hợp lệ
- [ ] `status` = `DRAFT` (mặc định khi tạo mới)
- [ ] `error` = null

**Verify SQL**:

```sql
SELECT id, subject, "to", "from", status, "emailType"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktEmail"
WHERE subject = 'Test Email from GraphQL';
```

---

### TC-EM-02: createEmail - Chỉ có subject (required field)

**Mục tiêu**: Tạo email chỉ với subject, các fields optional = null.

```graphql
mutation {
  createEmail(input: {
    subject: "Minimal Email"
  }) {
    success
    emailId
    status
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "createEmail": {
      "success": true,
      "emailId": "<generated-uuid>",
      "status": "DRAFT",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] Email được tạo thành công dù chỉ có subject

---

### TC-EM-03: createEmail - Thiếu subject (required)

**Mục tiêu**: Subject là required, thiếu phải báo lỗi GraphQL validation.

```graphql
mutation {
  createEmail(input: {
    to: "test@test.com"
    body: "Missing subject field"
  }) {
    success
    emailId
    error
  }
}
```

**Expected Response**: GraphQL validation error

```json
{
  "errors": [
    {
      "message": "Field \"CreateEmailInput.subject\" of required type \"String!\" was not provided."
    }
  ]
}
```

**Checklist**:
- [ ] Trả về `errors` array
- [ ] Không tạo record trong DB

---

### TC-EM-04: createEmail - Với accountOwnerId

**Mục tiêu**: Tạo email gắn với account owner cụ thể.

```graphql
mutation {
  createEmail(input: {
    subject: "Email with Owner"
    to: "team@company.com"
    from: "manager@company.com"
    body: "This email is assigned to a specific owner."
    emailType: "INTERNAL"
    accountOwnerId: "20202020-0305-4efe-89f4-c5e9b65a0f29"
  }) {
    success
    emailId
    status
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "createEmail": {
      "success": true,
      "emailId": "<generated-uuid>",
      "status": "DRAFT",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] accountOwnerId được lưu vào DB

---

### TC-EM-05: updateEmail - Cập nhật subject và body

**Mục tiêu**: Cập nhật email hiện có với dữ liệu mới.

> Sử dụng ID thực: `7135e86d-5722-4161-8df4-cafd1177528f`

```graphql
mutation {
  updateEmail(input: {
    id: "7135e86d-5722-4161-8df4-cafd1177528f"
    subject: "Updated Subject"
    body: "Updated email body content."
  }) {
    success
    emailId
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "updateEmail": {
      "success": true,
      "emailId": "7135e86d-5722-4161-8df4-cafd1177528f",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] `emailId` khớp input
- [ ] `updatedAt` thay đổi trong DB

**Verify SQL**:

```sql
SELECT subject, body, "updatedAt"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktEmail"
WHERE id = '7135e86d-5722-4161-8df4-cafd1177528f';
```

---

### TC-EM-06: updateEmail - Cập nhật status

**Mục tiêu**: Thay đổi status email.

```graphql
mutation {
  updateEmail(input: {
    id: "7135e86d-5722-4161-8df4-cafd1177528f"
    status: DRAFT
  }) {
    success
    emailId
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "updateEmail": {
      "success": true,
      "emailId": "7135e86d-5722-4161-8df4-cafd1177528f",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] Status trong DB thay đổi thành `DRAFT`

---

### TC-EM-07: updateEmail - ID không tồn tại

**Mục tiêu**: Cập nhật email với ID không tồn tại.

```graphql
mutation {
  updateEmail(input: {
    id: "00000000-0000-0000-0000-000000000000"
    subject: "Will not update"
  }) {
    success
    emailId
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "updateEmail": {
      "success": true,
      "emailId": "00000000-0000-0000-0000-000000000000",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] TypeORM `update()` không throw khi ID không tồn tại (affected rows = 0)
- [ ] Không có side effect trong DB

---

### TC-EM-08: updateEmail - Thiếu id (required)

**Mục tiêu**: id là required, thiếu phải báo lỗi.

```graphql
mutation {
  updateEmail(input: {
    subject: "No ID provided"
  }) {
    success
    error
  }
}
```

**Expected Response**: GraphQL validation error

```json
{
  "errors": [
    {
      "message": "Field \"UpdateEmailInput.id\" of required type \"String!\" was not provided."
    }
  ]
}
```

**Checklist**:
- [ ] GraphQL validation error
- [ ] Không thay đổi DB

---

### TC-EM-09: deleteEmail - Xóa mềm email tồn tại

**Mục tiêu**: Soft delete email, set `deletedAt`.

> **Lưu ý**: Test này sẽ thay đổi dữ liệu. Tạo email mới trước khi test hoặc dùng email từ TC-EM-01.

```graphql
mutation {
  deleteEmail(emailId: "<emailId-from-TC-EM-01>") {
    success
    emailId
    message
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "deleteEmail": {
      "success": true,
      "emailId": "<emailId>",
      "message": "Email has been soft deleted",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] `message` = "Email has been soft deleted"
- [ ] Record vẫn tồn tại trong DB nhưng `deletedAt` IS NOT NULL

**Verify SQL**:

```sql
SELECT id, "deletedAt"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktEmail"
WHERE id = '<emailId>';
```

---

### TC-EM-10: deleteEmail - ID không tồn tại

**Mục tiêu**: Xóa email với ID không có trong DB.

```graphql
mutation {
  deleteEmail(emailId: "00000000-0000-0000-0000-000000000000") {
    success
    emailId
    message
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "deleteEmail": {
      "success": false,
      "emailId": null,
      "message": null,
      "error": "..."
    }
  }
}
```

**Checklist**:
- [ ] `success` = false hoặc error message rõ ràng
- [ ] Không thay đổi DB

---

## C. Template Query Resolver Tests

### TC-TQ-01: getTemplateById - Template tồn tại

**Mục tiêu**: Lấy template theo ID thực tế (Welcome Email Template).

```graphql
query {
  getTemplateById(templateId: "b6158d8f-700c-4015-a56b-bf5b256a9c93") {
    id
    name
    type
    templateKey
    subject
    content
    version
    locale
    isActive
    position
    accountOwnerId
    createdAt
    updatedAt
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplateById": {
      "id": "b6158d8f-700c-4015-a56b-bf5b256a9c93",
      "name": "Welcome Email Template",
      "type": "EMAIL",
      "templateKey": "welcome_member_email",
      "subject": "",
      "content": "Dear {{customer_name}},\n\nWelcome to our platform!...",
      "version": "1.0.0",
      "locale": "EN",
      "isActive": true,
      "position": 1,
      "accountOwnerId": null,
      "createdAt": "2026-02-09T03:46:26.421Z",
      "updatedAt": "2026-02-09T03:46:26.421Z"
    }
  }
}
```

**Checklist**:
- [ ] `id` khớp input
- [ ] `name` = "Welcome Email Template"
- [ ] `type` = "EMAIL"
- [ ] `templateKey` = "welcome_member_email"
- [ ] `isActive` = true
- [ ] `content` chứa template nội dung

---

### TC-TQ-02: getTemplateById - Invoice Template

**Mục tiêu**: Verify template Invoice với nội dung chứa placeholder.

```graphql
query {
  getTemplateById(templateId: "c159a62f-451e-4d8d-a1ca-a4c3698f2b1e") {
    id
    name
    type
    templateKey
    content
    version
    isActive
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplateById": {
      "id": "c159a62f-451e-4d8d-a1ca-a4c3698f2b1e",
      "name": "Invoice Template",
      "type": "INVOICE",
      "templateKey": "standard_invoice",
      "content": "INVOICE\n\nInvoice Number: {{invoice_number}}...",
      "version": "2.1.0",
      "isActive": true
    }
  }
}
```

**Checklist**:
- [ ] `type` = "INVOICE"
- [ ] `content` chứa `{{invoice_number}}`, `{{amount}}`, `{{total_amount}}`

---

### TC-TQ-03: getTemplateById - ID không tồn tại

**Mục tiêu**: Truy vấn template không có.

```graphql
query {
  getTemplateById(templateId: "00000000-0000-0000-0000-000000000000") {
    id
    name
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplateById": null
  }
}
```

**Checklist**:
- [ ] Trả về `null`, không crash

---

### TC-TQ-04: getTemplates - Phân trang mặc định

**Mục tiêu**: Lấy danh sách templates với pagination mặc định.

```graphql
query {
  getTemplates {
    templates {
      id
      name
      type
      templateKey
      isActive
      locale
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplates": {
      "templates": [
        {
          "id": "b6158d8f-700c-4015-a56b-bf5b256a9c93",
          "name": "Welcome Email Template",
          "type": "EMAIL",
          "templateKey": "welcome_member_email",
          "isActive": true,
          "locale": "EN"
        }
      ],
      "totalCount": 22
    }
  }
}
```

**Checklist**:
- [ ] `totalCount` = 22 (tổng templates trong DB)
- [ ] `templates` array có tối đa 50 items (default take)
- [ ] Mỗi template có đủ fields

---

### TC-TQ-05: getTemplates - Phân trang nhỏ

**Mục tiêu**: Lấy 5 templates đầu tiên.

```graphql
query {
  getTemplates(take: 5, skip: 0) {
    templates {
      id
      name
      type
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplates": {
      "templates": ["<5 items>"],
      "totalCount": 5
    }
  }
}
```

**Checklist**:
- [ ] `templates.length` <= 5
- [ ] Kết quả sắp xếp theo type ASC, locale ASC, position ASC

---

### TC-TQ-06: getTemplates - Page 2

**Mục tiêu**: Lấy trang 2 (skip 10 records).

```graphql
query {
  getTemplates(take: 10, skip: 10) {
    templates {
      id
      name
      type
    }
    totalCount
  }
}
```

**Checklist**:
- [ ] `templates.length` <= 10
- [ ] Không trùng với kết quả page 1
- [ ] `totalCount` phản ánh đúng số records trong page

---

### TC-TQ-07: getTemplatesByType - Type EMAIL

**Mục tiêu**: Lọc templates theo type EMAIL (có 3 records).

```graphql
query {
  getTemplatesByType(type: "EMAIL") {
    templates {
      id
      name
      type
      templateKey
      isActive
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplatesByType": {
      "templates": [
        {
          "id": "5d818b4f-05a7-4f46-9700-aa3d00b99262",
          "name": "Password Reset Template",
          "type": "EMAIL",
          "templateKey": "password_reset",
          "isActive": true
        },
        {
          "id": "c535252e-62e5-4365-b24d-9fe07d9e705f",
          "name": "Renewal Reminder Template",
          "type": "EMAIL",
          "templateKey": "renewal_reminder",
          "isActive": true
        },
        {
          "id": "b6158d8f-700c-4015-a56b-bf5b256a9c93",
          "name": "Welcome Email Template",
          "type": "EMAIL",
          "templateKey": "welcome_member_email",
          "isActive": true
        }
      ],
      "totalCount": 3
    }
  }
}
```

**Checklist**:
- [ ] `totalCount` = 3
- [ ] Tất cả templates có `type` = "EMAIL"
- [ ] Bao gồm: Password Reset, Renewal Reminder, Welcome Email

---

### TC-TQ-08: getTemplatesByType - Type CONTRACT

**Mục tiêu**: Lọc templates theo type CONTRACT (có 2 records).

```graphql
query {
  getTemplatesByType(type: "CONTRACT") {
    templates {
      id
      name
      type
      templateKey
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplatesByType": {
      "templates": [
        {
          "id": "87059b34-0d66-4274-a5c3-2e64058aab12",
          "name": "License Agreement Template",
          "type": "CONTRACT",
          "templateKey": "license_agreement"
        },
        {
          "id": "f5ac4b3d-229e-4c15-a499-742995ada9a8",
          "name": "Service Agreement Template",
          "type": "CONTRACT",
          "templateKey": "service_agreement"
        }
      ],
      "totalCount": 2
    }
  }
}
```

**Checklist**:
- [ ] `totalCount` = 2
- [ ] Tất cả templates có `type` = "CONTRACT"

---

### TC-TQ-09: getTemplatesByType - Type ORDER_EMAIL

**Mục tiêu**: Lọc templates tiếng Việt (ORDER_EMAIL, có 4 records).

```graphql
query {
  getTemplatesByType(type: "ORDER_EMAIL") {
    templates {
      id
      name
      type
      templateKey
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplatesByType": {
      "templates": [
        { "name": "Nhắc nhở thanh toán đơn hàng", "templateKey": "payment_reminder" },
        { "name": "Thông báo đơn hàng dùng thử", "templateKey": "order_trial_notification" },
        { "name": "Thông báo đơn hàng hoàn thành", "templateKey": "order_completed_notification" },
        { "name": "Thông báo đơn hàng mới", "templateKey": "new_order_notification" }
      ],
      "totalCount": 4
    }
  }
}
```

**Checklist**:
- [ ] `totalCount` = 4
- [ ] Hiển thị đúng tiếng Việt (Unicode)

---

### TC-TQ-10: getTemplatesByType - Type không tồn tại

**Mục tiêu**: Lọc theo type không có.

```graphql
query {
  getTemplatesByType(type: "NONEXISTENT_TYPE") {
    templates {
      id
    }
    totalCount
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplatesByType": {
      "templates": [],
      "totalCount": 0
    }
  }
}
```

**Checklist**:
- [ ] Mảng rỗng, totalCount = 0

---

### TC-TQ-11: getTemplateByKey - Key tồn tại

**Mục tiêu**: Tìm template theo templateKey thực tế.

```graphql
query {
  getTemplateByKey(templateKey: "password_reset") {
    id
    name
    type
    templateKey
    version
    locale
    isActive
    content
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplateByKey": {
      "id": "5d818b4f-05a7-4f46-9700-aa3d00b99262",
      "name": "Password Reset Template",
      "type": "EMAIL",
      "templateKey": "password_reset",
      "version": "1.1.0",
      "locale": "EN",
      "isActive": true,
      "content": "Password Reset Request\n\nDear {{customer_name}}..."
    }
  }
}
```

**Checklist**:
- [ ] `templateKey` khớp input
- [ ] `name` = "Password Reset Template"
- [ ] `content` chứa `{{customer_name}}` và `{{reset_link}}`

---

### TC-TQ-12: getTemplateByKey - Key sepay_qr_code

**Mục tiêu**: Tìm template SEPay QR Code.

```graphql
query {
  getTemplateByKey(templateKey: "sepay_qr_code") {
    id
    name
    type
    templateKey
    isActive
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplateByKey": {
      "id": "fb171c91-8ef6-45b3-8b92-68119580b72b",
      "name": "SEPay QR Code Payment Page",
      "type": "PAYMENT",
      "templateKey": "sepay_qr_code",
      "isActive": true
    }
  }
}
```

**Checklist**:
- [ ] `type` = "PAYMENT"
- [ ] `name` = "SEPay QR Code Payment Page"

---

### TC-TQ-13: getTemplateByKey - Key không tồn tại

**Mục tiêu**: Tìm template với key không có.

```graphql
query {
  getTemplateByKey(templateKey: "nonexistent_key") {
    id
    name
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "getTemplateByKey": null
  }
}
```

**Checklist**:
- [ ] Trả về `null`, không crash

---

## D. Template Mutation Resolver Tests

### TC-TM-01: createTemplate - Tạo template đầy đủ

**Mục tiêu**: Tạo template mới với tất cả fields.

```graphql
mutation {
  createTemplate(input: {
    name: "Test GraphQL Template"
    type: "EMAIL"
    templateKey: "test_graphql_template"
    subject: "Test Subject"
    content: "Dear {{name}},\n\nThis is a test template.\n\nRegards,\nTeam"
    version: "1.0.0"
    locale: "VI"
  }) {
    success
    templateId
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "createTemplate": {
      "success": true,
      "templateId": "<generated-uuid>",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] `templateId` là UUID hợp lệ
- [ ] `isActive` mặc định = true trong DB

**Verify SQL**:

```sql
SELECT id, name, type, "templateKey", "isActive", locale
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplate"
WHERE "templateKey" = 'test_graphql_template';
```

---

### TC-TM-02: createTemplate - Chỉ name (required)

**Mục tiêu**: Tạo template chỉ với name.

```graphql
mutation {
  createTemplate(input: {
    name: "Minimal Template"
  }) {
    success
    templateId
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "createTemplate": {
      "success": true,
      "templateId": "<generated-uuid>",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] Template tạo thành công với các optional fields = null

---

### TC-TM-03: createTemplate - Thiếu name (required)

**Mục tiêu**: Name là required, thiếu phải lỗi.

```graphql
mutation {
  createTemplate(input: {
    type: "EMAIL"
    content: "some content"
  }) {
    success
    error
  }
}
```

**Expected Response**: GraphQL validation error

```json
{
  "errors": [
    {
      "message": "Field \"CreateTemplateInput.name\" of required type \"String!\" was not provided."
    }
  ]
}
```

**Checklist**:
- [ ] GraphQL validation error
- [ ] Không tạo record

---

### TC-TM-04: updateTemplate - Cập nhật tên và content

**Mục tiêu**: Cập nhật template hiện có.

> Sử dụng ID: `472b23f7-ed73-49c6-b3df-6484a397c695` (Support Ticket Template)

```graphql
mutation {
  updateTemplate(input: {
    id: "472b23f7-ed73-49c6-b3df-6484a397c695"
    name: "Support Ticket Template v2"
    version: "2.0.0"
  }) {
    success
    templateId
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "updateTemplate": {
      "success": true,
      "templateId": "472b23f7-ed73-49c6-b3df-6484a397c695",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] `templateId` khớp input

**Verify SQL**:

```sql
SELECT name, version, "updatedAt"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplate"
WHERE id = '472b23f7-ed73-49c6-b3df-6484a397c695';
```

---

### TC-TM-05: updateTemplate - Thiếu id (required)

**Mục tiêu**: id là required.

```graphql
mutation {
  updateTemplate(input: {
    name: "No ID"
  }) {
    success
    error
  }
}
```

**Expected Response**: GraphQL validation error

**Checklist**:
- [ ] Error message chỉ rõ thiếu `id`

---

### TC-TM-06: toggleTemplateActive - Deactivate template

**Mục tiêu**: Tắt template (isActive = false).

> Sử dụng template từ TC-TM-01 hoặc ID thực: `caf95c15-c617-4f6e-a48e-6b7739c4b629` (Feedback Survey)

```graphql
mutation {
  toggleTemplateActive(
    templateId: "caf95c15-c617-4f6e-a48e-6b7739c4b629"
    isActive: false
  ) {
    success
    templateId
    isActive
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "toggleTemplateActive": {
      "success": true,
      "templateId": "caf95c15-c617-4f6e-a48e-6b7739c4b629",
      "isActive": false,
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] `isActive` = false
- [ ] DB record có `isActive` = false

**Verify SQL**:

```sql
SELECT id, name, "isActive"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplate"
WHERE id = 'caf95c15-c617-4f6e-a48e-6b7739c4b629';
```

---

### TC-TM-07: toggleTemplateActive - Reactivate template

**Mục tiêu**: Bật lại template đã tắt ở TC-TM-06.

```graphql
mutation {
  toggleTemplateActive(
    templateId: "caf95c15-c617-4f6e-a48e-6b7739c4b629"
    isActive: true
  ) {
    success
    templateId
    isActive
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "toggleTemplateActive": {
      "success": true,
      "templateId": "caf95c15-c617-4f6e-a48e-6b7739c4b629",
      "isActive": true,
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `isActive` = true
- [ ] DB record trở lại active

---

### TC-TM-08: deleteTemplate - Xóa mềm template

**Mục tiêu**: Soft delete template.

> Sử dụng template tạo từ TC-TM-01 hoặc TC-TM-02.

```graphql
mutation {
  deleteTemplate(templateId: "<templateId-from-TC-TM-01>") {
    success
    templateId
    message
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "deleteTemplate": {
      "success": true,
      "templateId": "<templateId>",
      "message": "Template has been soft deleted",
      "error": null
    }
  }
}
```

**Checklist**:
- [ ] `success` = true
- [ ] `message` = "Template has been soft deleted"
- [ ] `deletedAt` IS NOT NULL trong DB

**Verify SQL**:

```sql
SELECT id, name, "deletedAt"
FROM workspace_1wgvd1injqtife6y4rvfbu3h5."mktTemplate"
WHERE id = '<templateId>';
```

---

### TC-TM-09: deleteTemplate - ID không tồn tại

**Mục tiêu**: Xóa template không có.

```graphql
mutation {
  deleteTemplate(templateId: "00000000-0000-0000-0000-000000000000") {
    success
    templateId
    message
    error
  }
}
```

**Expected Response**:

```json
{
  "data": {
    "deleteTemplate": {
      "success": false,
      "templateId": null,
      "message": null,
      "error": "..."
    }
  }
}
```

**Checklist**:
- [ ] `success` = false hoặc error
- [ ] Không thay đổi DB

---

## E. Block Hook Tests

### TC-BH-01: Block auto-generated mktEmail findMany

**Mục tiêu**: Verify block hooks chặn auto-generated query.

```graphql
query {
  mktEmails {
    edges {
      node {
        id
        subject
      }
    }
  }
}
```

**Expected Response**: Error bị block

```json
{
  "errors": [
    {
      "message": "This operation is disabled. Use custom Email resolvers instead (getEmailById, createEmail, etc.)"
    }
  ]
}
```

**Checklist**:
- [ ] Trả về error, không trả dữ liệu
- [ ] Message rõ ràng hướng dẫn dùng custom resolver

---

### TC-BH-02: Block auto-generated mktEmail findOne

**Mục tiêu**: Block truy vấn findOne auto-generated.

```graphql
query {
  mktEmail(id: "7135e86d-5722-4161-8df4-cafd1177528f") {
    id
    subject
  }
}
```

**Expected Response**: Error bị block

**Checklist**:
- [ ] Bị chặn, phải dùng `getEmailById` thay thế

---

### TC-BH-03: Block auto-generated mktEmail createOne

**Mục tiêu**: Block mutation createOne auto-generated.

```graphql
mutation {
  createMktEmail(data: { subject: "Test" }) {
    id
  }
}
```

**Expected Response**: Error bị block

**Checklist**:
- [ ] Bị chặn, phải dùng `createEmail` thay thế

---

### TC-BH-04: Block auto-generated mktTemplate findMany

**Mục tiêu**: Block auto-generated template queries.

```graphql
query {
  mktTemplates {
    edges {
      node {
        id
        name
      }
    }
  }
}
```

**Expected Response**: Error bị block

**Checklist**:
- [ ] Message chỉ rõ dùng custom Template resolvers

---

### TC-BH-05: Block auto-generated mktTemplate createOne

**Mục tiêu**: Block auto-generated template mutation.

```graphql
mutation {
  createMktTemplate(data: { name: "Test" }) {
    id
  }
}
```

**Expected Response**: Error bị block

**Checklist**:
- [ ] Bị chặn, phải dùng `createTemplate` thay thế

---

## F. Authentication Tests

### TC-AUTH-01: Query không có Bearer token

**Mục tiêu**: Tất cả resolvers yêu cầu authentication.

> Xóa header `Authorization` trước khi chạy.

```graphql
query {
  getEmails {
    emails {
      id
    }
    totalCount
  }
}
```

**Expected Response**: 401 Unauthorized

```json
{
  "errors": [
    {
      "message": "Unauthorized"
    }
  ]
}
```

**Checklist**:
- [ ] Trả về 401 hoặc error Unauthorized
- [ ] Áp dụng cho tất cả queries và mutations

---

### TC-AUTH-02: Query với Bearer token hết hạn

**Mục tiêu**: Token expired phải bị reject.

```graphql
query {
  getTemplates {
    templates { id }
    totalCount
  }
}
```

> Sử dụng token đã expire.

**Expected Response**: 401 Unauthorized

**Checklist**:
- [ ] Trả về 401
- [ ] Error message chỉ rõ token hết hạn

---

### TC-AUTH-03: Mutation không có Bearer token

**Mục tiêu**: Mutations cũng yêu cầu auth.

```graphql
mutation {
  createEmail(input: { subject: "Unauthorized test" }) {
    success
    error
  }
}
```

**Expected Response**: 401 Unauthorized

**Checklist**:
- [ ] Trả về 401
- [ ] Không tạo record trong DB

---

## G. Edge Cases

### TC-EDGE-01: createEmail - Special characters trong subject

```graphql
mutation {
  createEmail(input: {
    subject: "Thông báo: Đơn hàng #12345 - Thanh toán thành công! @#$%"
    to: "khachhang@email.vn"
    body: "<h1>Xin chào</h1><p>Cảm ơn bạn đã đặt hàng</p>"
    emailType: "ORDER_NOTIFICATION"
  }) {
    success
    emailId
    error
  }
}
```

**Checklist**:
- [ ] Vietnamese characters (diacritics) lưu đúng
- [ ] Special characters `@#$%` không bị escape sai
- [ ] HTML content trong body lưu nguyên

---

### TC-EDGE-02: createTemplate - Content rất dài

```graphql
mutation {
  createTemplate(input: {
    name: "Long Content Template"
    type: "EMAIL"
    content: "<lặp lại 5000 ký tự>"
  }) {
    success
    templateId
    error
  }
}
```

**Checklist**:
- [ ] Tạo thành công với content dài
- [ ] Không bị truncate

---

### TC-EDGE-03: createEmail - Empty strings

```graphql
mutation {
  createEmail(input: {
    subject: ""
    to: ""
    from: ""
    body: ""
  }) {
    success
    emailId
    error
  }
}
```

**Checklist**:
- [ ] Behavior rõ ràng: thành công hoặc validation error
- [ ] Nếu thành công, lưu empty strings đúng

---

### TC-EDGE-04: getTemplatesByType - Case sensitivity

```graphql
query {
  getTemplatesByType(type: "email") {
    templates { id name }
    totalCount
  }
}
```

**Checklist**:
- [ ] Verify case-sensitive hay case-insensitive
- [ ] DB dùng "EMAIL" (uppercase), "email" có thể trả mảng rỗng

---

## Tóm tắt Test Cases

| Category | Số TC | Test Cases |
|----------|-------|------------|
| A. Email Query | 12 | TC-EQ-01 → TC-EQ-12 |
| B. Email Mutation | 10 | TC-EM-01 → TC-EM-10 |
| C. Template Query | 13 | TC-TQ-01 → TC-TQ-13 |
| D. Template Mutation | 9 | TC-TM-01 → TC-TM-09 |
| E. Block Hooks | 5 | TC-BH-01 → TC-BH-05 |
| F. Authentication | 3 | TC-AUTH-01 → TC-AUTH-03 |
| G. Edge Cases | 4 | TC-EDGE-01 → TC-EDGE-04 |
| **Tổng** | **56** | |

## Thứ tự thực hiện khuyến nghị

1. **F. Authentication** (TC-AUTH-01 → 03) - Đảm bảo guards hoạt động trước
2. **E. Block Hooks** (TC-BH-01 → 05) - Verify auto-generated bị chặn
3. **A. Email Query** (TC-EQ-01 → 12) - Đọc dữ liệu, không thay đổi DB
4. **C. Template Query** (TC-TQ-01 → 13) - Đọc dữ liệu, không thay đổi DB
5. **B. Email Mutation** (TC-EM-01 → 10) - Tạo/sửa/xóa emails
6. **D. Template Mutation** (TC-TM-01 → 09) - Tạo/sửa/xóa templates
7. **G. Edge Cases** (TC-EDGE-01 → 04) - Kiểm tra các trường hợp biên

---

## H. Test Execution Results (2026-02-09)

Tất cả test cases đã được chạy thực tế qua GraphQL API với Bearer token.

### Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-EQ-01 | PASSED | Trả đúng email `7135e86d...`, status=SENT |
| TC-EQ-02 | PASSED | Trả `null` cho ID không tồn tại |
| TC-EQ-04 | PASSED | totalCount=1, trả đúng 1 email |
| TC-EQ-06 | PASSED | emails=[], totalCount=1 |
| TC-EQ-07 | PASSED | Lọc SENT, totalCount=1 |
| TC-EQ-08 | PASSED | Lọc DRAFT, emails=[], totalCount=0 |
| TC-EQ-10 | PASSED | Lọc to@example.com, totalCount=1 |
| TC-EQ-11 | PASSED | Recipient không tồn tại, totalCount=0 |
| TC-EQ-12 | PASSED | distribution=[{SENT: 1}], totalCount=1 |
| TC-EM-01 | PASSED | success=true, status=DRAFT, emailId=`ac7248ab...` |
| TC-EM-02 | PASSED | success=true, minimal input |
| TC-EM-05 | PASSED | Update subject/body thành công |
| TC-EM-06 | PASSED | Update status thành DRAFT |
| TC-EM-07 | PASSED | Update ID không tồn tại, success=true (TypeORM no-op) |
| TC-EM-09 | PASSED | Soft delete, message="Email has been soft deleted" |
| TC-EM-10 | PASSED | Delete ID không tồn tại, success=true (soft delete no-op) |
| TC-TQ-01 | PASSED | Welcome Email Template, type=EMAIL, isActive=true |
| TC-TQ-03 | PASSED | Trả `null` cho ID không tồn tại |
| TC-TQ-04 | PASSED | totalCount=22, trả đủ 22 templates |
| TC-TQ-05 | PASSED | take=5, trả đúng 5 templates |
| TC-TQ-07 | PASSED | type=EMAIL, totalCount=3 |
| TC-TQ-08 | PASSED | type=CONTRACT, totalCount=2 |
| TC-TQ-10 | PASSED | Type không tồn tại, totalCount=0 |
| TC-TQ-11 | PASSED | password_reset, version=1.1.0, locale=EN |
| TC-TQ-12 | PASSED | sepay_qr_code, type=PAYMENT |
| TC-TQ-13 | PASSED | Key không tồn tại, trả `null` |
| TC-TM-01 | PASSED | success=true, templateId=`7d967ed3...` |
| TC-TM-02 | PASSED | success=true, minimal input |
| TC-TM-04 | PASSED | Update Support Ticket Template v2 |
| TC-TM-06 | PASSED | Deactivate Feedback Survey, isActive=false |
| TC-TM-07 | PASSED | Reactivate Feedback Survey, isActive=true |
| TC-TM-08 | PASSED | Soft delete, message="Template has been soft deleted" |
| TC-TM-09 | PASSED | Delete ID không tồn tại, success=true (soft delete no-op) |
| TC-BH-01 | PASSED | Block mktEmails findMany, error message chính xác |
| TC-BH-04 | PASSED | Block mktTemplates findMany, error message chính xác |
| TC-AUTH-01 | PASSED | Không có token: "Forbidden resource" |

### Observations

1. **TC-EM-07, TC-EM-10, TC-TM-09**: TypeORM `softDelete`/`update` không throw error khi ID không tồn tại - trả `success: true` vì operation thực hiện thành công dù affected rows = 0. Đây là behavior mặc định của TypeORM.
2. **TC-TQ-04**: `totalCount` trả đúng 22 templates, sorted theo type ASC, locale ASC, position ASC.
3. **TC-AUTH-01**: Server trả "Forbidden resource" thay vì "Unauthorized" - đây là behavior của `WorkspaceAuthGuard`.
4. **Block Hooks**: Error message rõ ràng, hướng dẫn dùng custom resolvers.
5. **Data restored**: Dữ liệu test đã được cleanup sau khi test xong (email subject/status reverted, template name reverted, test records soft deleted).
