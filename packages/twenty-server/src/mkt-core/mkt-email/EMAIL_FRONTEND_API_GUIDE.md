# Email & Template API - Frontend Developer Guide

## Overview

API GraphQL de quan ly email va template trong he thong CRM. Module ho tro toan bo lifecycle cua email (tao, cap nhat, xoa mem) va template (tao, cap nhat, bat/tat, xoa mem).

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## API Categories

### Email Query APIs (Doc du lieu Email)
- `getEmailById` - Lay email theo ID
- `getEmails` - Lay danh sach email (co phan trang)
- `getEmailsByStatus` - Lay danh sach email theo trang thai
- `getEmailsByRecipient` - Lay danh sach email theo nguoi nhan
- `getEmailStatusDistribution` - Thong ke phan bo trang thai email

### Email Mutation APIs (Ghi du lieu Email)
- `createEmail` - Tao email moi
- `updateEmail` - Cap nhat thong tin email
- `deleteEmail` - Xoa mem email

### Template Query APIs (Doc du lieu Template)
- `getTemplateById` - Lay template theo ID
- `getTemplates` - Lay danh sach template (co phan trang)
- `getTemplatesByType` - Lay danh sach template theo loai
- `getTemplateByKey` - Lay template theo template key

### Template Mutation APIs (Ghi du lieu Template)
- `createTemplate` - Tao template moi
- `updateTemplate` - Cap nhat thong tin template
- `toggleTemplateActive` - Bat/tat trang thai template
- `deleteTemplate` - Xoa mem template

---

## Email Queries

### 1. getEmailById

Lay thong tin chi tiet mot email theo ID.

**Query:**
```graphql
query GetEmailById($emailId: String!) {
  getEmailById(emailId: $emailId) {
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

**Variables:**
```json
{
  "emailId": "7135e86d-5722-4161-8df4-cafd1177528f"
}
```

**Response Success:**
```json
{
  "data": {
    "getEmailById": {
      "id": "7135e86d-5722-4161-8df4-cafd1177528f",
      "subject": "Subject here",
      "to": "to@example.com",
      "from": "from@example.com",
      "body": "Email body content here.",
      "sentAt": null,
      "status": "SENT",
      "emailType": "notification",
      "position": 1,
      "accountOwnerId": "20202020-0687-4c41-b707-ed1bfca972a7",
      "createdAt": "2025-06-03 17:00:00",
      "updatedAt": "2025-06-03 17:00:00"
    }
  }
}
```

**Response null (khong tim thay):**
```json
{
  "data": {
    "getEmailById": null
  }
}
```

---

### 2. getEmails

Lay danh sach email voi phan trang.

**Query:**
```graphql
query GetEmails($take: Float, $skip: Float) {
  getEmails(take: $take, skip: $skip) {
    emails {
      id
      subject
      to
      status
      emailType
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

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `take` | Float | No | `50` | So luong ban ghi toi da |
| `skip` | Float | No | `0` | So ban ghi bo qua (offset) |

**Response Success:**
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
          "emailType": "notification"
        }
      ],
      "totalCount": 1
    }
  }
}
```

---

### 3. getEmailsByStatus

Lay danh sach email theo trang thai.

**Query:**
```graphql
query GetEmailsByStatus($status: EmailStatus!) {
  getEmailsByStatus(status: $status) {
    emails {
      id
      subject
      status
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "status": "SENT"
}
```

**Cac gia tri EmailStatus hop le:**

| Value | Mo ta (VI) | Mo ta (EN) |
|-------|------------|------------|
| `DRAFT` | Ban nhap | Draft |
| `SENT` | Da gui | Sent |
| `FAILED` | That bai | Failed |

**Response Success:**
```json
{
  "data": {
    "getEmailsByStatus": {
      "emails": [
        {
          "id": "7135e86d-5722-4161-8df4-cafd1177528f",
          "subject": "Subject here",
          "status": "SENT"
        }
      ],
      "totalCount": 1
    }
  }
}
```

---

### 4. getEmailsByRecipient

Lay danh sach email theo dia chi nguoi nhan.

**Query:**
```graphql
query GetEmailsByRecipient($to: String!) {
  getEmailsByRecipient(to: $to) {
    emails {
      id
      subject
      to
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "to": "to@example.com"
}
```

**Response Success:**
```json
{
  "data": {
    "getEmailsByRecipient": {
      "emails": [
        {
          "id": "7135e86d-5722-4161-8df4-cafd1177528f",
          "subject": "Subject here",
          "to": "to@example.com"
        }
      ],
      "totalCount": 1
    }
  }
}
```

**Response - Khong tim thay:**
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

---

### 5. getEmailStatusDistribution

Thong ke phan bo email theo trang thai. Huu ich de hien thi chart/dashboard.

**Query:**
```graphql
query GetEmailStatusDistribution {
  getEmailStatusDistribution {
    distribution {
      status
      count
    }
    totalCount
  }
}
```

**Response Success:**
```json
{
  "data": {
    "getEmailStatusDistribution": {
      "distribution": [
        { "status": "SENT", "count": 1 },
        { "status": "DRAFT", "count": 0 },
        { "status": "FAILED", "count": 0 }
      ],
      "totalCount": 1
    }
  }
}
```

---

## Email Mutations

### 1. createEmail

Tao email moi. Trang thai mac dinh la `DRAFT`. Truong `accountOwnerId` tu dong lay tu token cua user dang dang nhap neu khong truyen vao.

**Mutation:**
```graphql
mutation CreateEmail($input: CreateEmailInput!) {
  createEmail(input: $input) {
    success
    emailId
    status
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "subject": "Test Email from GraphQL",
    "to": "recipient@test.com",
    "from": "sender@test.com",
    "body": "Test body content",
    "emailType": "NOTIFICATION"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `subject` | String | **Yes** | - | Tieu de email |
| `to` | String | No | - | Dia chi nguoi nhan |
| `from` | String | No | - | Dia chi nguoi gui |
| `body` | String | No | - | Noi dung email |
| `emailType` | String | No | - | Loai email |
| `accountOwnerId` | String (UUID) | No | Tu dong (workspaceMemberId) | ID nguoi so huu |

**Response Success:**
```json
{
  "data": {
    "createEmail": {
      "success": true,
      "emailId": "ac7248ab-1b21-4ac8-8e50-d34103a99f15",
      "status": "DRAFT",
      "error": null
    }
  }
}
```

**Response Error:**
```json
{
  "data": {
    "createEmail": {
      "success": false,
      "emailId": null,
      "status": null,
      "error": "Failed to create email"
    }
  }
}
```

---

### 2. updateEmail

Cap nhat thong tin email. Chi cap nhat cac truong duoc truyen vao, cac truong khong truyen se giu nguyen.

**Mutation:**
```graphql
mutation UpdateEmail($input: UpdateEmailInput!) {
  updateEmail(input: $input) {
    success
    emailId
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "7135e86d-5722-4161-8df4-cafd1177528f",
    "subject": "Updated Subject",
    "body": "Updated body"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (UUID) | **Yes** | ID email can cap nhat |
| `subject` | String | No | Tieu de email |
| `to` | String | No | Dia chi nguoi nhan |
| `from` | String | No | Dia chi nguoi gui |
| `body` | String | No | Noi dung email |
| `status` | EmailStatus | No | Trang thai email |
| `emailType` | String | No | Loai email |
| `accountOwnerId` | String (UUID) | No | ID nguoi so huu |

**Response Success:**
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

**Response Error - Loi he thong:**
```json
{
  "data": {
    "updateEmail": {
      "success": false,
      "emailId": null,
      "error": "Failed to update email"
    }
  }
}
```

---

### 3. deleteEmail

Xoa mem email (soft delete).

**Mutation:**
```graphql
mutation DeleteEmail($emailId: String!) {
  deleteEmail(emailId: $emailId) {
    success
    emailId
    message
    error
  }
}
```

**Variables:**
```json
{
  "emailId": "ac7248ab-1b21-4ac8-8e50-d34103a99f15"
}
```

**Response Success:**
```json
{
  "data": {
    "deleteEmail": {
      "success": true,
      "emailId": "ac7248ab-1b21-4ac8-8e50-d34103a99f15",
      "message": "Email has been soft deleted",
      "error": null
    }
  }
}
```

**Response Error:**
```json
{
  "data": {
    "deleteEmail": {
      "success": false,
      "emailId": null,
      "message": null,
      "error": "Failed to delete email"
    }
  }
}
```

---

## Template Queries

### 1. getTemplateById

Lay thong tin chi tiet mot template theo ID.

**Query:**
```graphql
query GetTemplateById($templateId: String!) {
  getTemplateById(templateId: $templateId) {
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

**Variables:**
```json
{
  "templateId": "b6158d8f-700c-4015-a56b-bf5b256a9c93"
}
```

**Response Success:**
```json
{
  "data": {
    "getTemplateById": {
      "id": "b6158d8f-700c-4015-a56b-bf5b256a9c93",
      "name": "Welcome Email Template",
      "type": "EMAIL",
      "templateKey": "welcome_email",
      "subject": "Welcome to our platform!",
      "content": "Dear {{customerName}}, Welcome to our platform...",
      "version": "1.0.0",
      "locale": "EN",
      "isActive": true,
      "position": 1,
      "accountOwnerId": "20202020-0687-4c41-b707-ed1bfca972a7",
      "createdAt": "2025-06-03 17:00:00",
      "updatedAt": "2025-06-03 17:00:00"
    }
  }
}
```

**Response null (khong tim thay):**
```json
{
  "data": {
    "getTemplateById": null
  }
}
```

---

### 2. getTemplates

Lay danh sach template voi phan trang.

**Query:**
```graphql
query GetTemplates($take: Float, $skip: Float) {
  getTemplates(take: $take, skip: $skip) {
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

**Variables:**
```json
{
  "take": 10,
  "skip": 0
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `take` | Float | No | `50` | So luong ban ghi toi da |
| `skip` | Float | No | `0` | So ban ghi bo qua (offset) |

**Response Success:**
```json
{
  "data": {
    "getTemplates": {
      "templates": [
        {
          "id": "b6158d8f-700c-4015-a56b-bf5b256a9c93",
          "name": "Welcome Email Template",
          "type": "EMAIL",
          "templateKey": "welcome_email",
          "isActive": true
        },
        {
          "id": "472b23f7-ed73-49c6-b3df-6484a397c695",
          "name": "Support Ticket Template",
          "type": "EMAIL",
          "templateKey": "support_ticket",
          "isActive": true
        },
        {
          "id": "caf95c15-c617-4f6e-a48e-6b7739c4b629",
          "name": "Password Reset Template",
          "type": "EMAIL",
          "templateKey": "password_reset",
          "isActive": true
        }
      ],
      "totalCount": 22
    }
  }
}
```

---

### 3. getTemplatesByType

Lay danh sach template theo loai (type).

**Query:**
```graphql
query GetTemplatesByType($type: String!) {
  getTemplatesByType(type: $type) {
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

**Variables:**
```json
{
  "type": "EMAIL"
}
```

**Cac gia tri type thuong dung:**

| Value | Mo ta (VI) | Mo ta (EN) |
|-------|------------|------------|
| `EMAIL` | Template email | Email Template |
| `CONTRACT` | Template hop dong | Contract Template |
| `INVOICE` | Template hoa don | Invoice Template |
| `REPORT` | Template bao cao | Report Template |
| `SMS` | Template SMS | SMS Template |

**Response Success:**
```json
{
  "data": {
    "getTemplatesByType": {
      "templates": [
        {
          "id": "b6158d8f-700c-4015-a56b-bf5b256a9c93",
          "name": "Welcome Email Template",
          "type": "EMAIL",
          "templateKey": "welcome_email"
        },
        {
          "id": "472b23f7-ed73-49c6-b3df-6484a397c695",
          "name": "Support Ticket Template",
          "type": "EMAIL",
          "templateKey": "support_ticket"
        }
      ],
      "totalCount": 6
    }
  }
}
```

**Response - Khong tim thay:**
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

---

### 4. getTemplateByKey

Lay template theo template key. Template key la dinh danh duy nhat cua template (vd: `welcome_email`, `password_reset`).

**Query:**
```graphql
query GetTemplateByKey($templateKey: String!) {
  getTemplateByKey(templateKey: $templateKey) {
    id
    name
    type
    templateKey
    version
    locale
    isActive
  }
}
```

**Variables:**
```json
{
  "templateKey": "password_reset"
}
```

**Response Success:**
```json
{
  "data": {
    "getTemplateByKey": {
      "id": "caf95c15-c617-4f6e-a48e-6b7739c4b629",
      "name": "Password Reset Template",
      "type": "EMAIL",
      "templateKey": "password_reset",
      "version": "1.0.0",
      "locale": "EN",
      "isActive": true
    }
  }
}
```

**Response null (khong tim thay):**
```json
{
  "data": {
    "getTemplateByKey": null
  }
}
```

---

## Template Mutations

### 1. createTemplate

Tao template moi.

**Mutation:**
```graphql
mutation CreateTemplate($input: CreateTemplateInput!) {
  createTemplate(input: $input) {
    success
    templateId
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Test GraphQL Template",
    "type": "EMAIL",
    "templateKey": "test_graphql_template",
    "subject": "Test Subject",
    "content": "Test content body",
    "version": "1.0.0",
    "locale": "VI"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | **Yes** | - | Ten template |
| `type` | String | No | - | Loai template (EMAIL, CONTRACT, INVOICE, ...) |
| `templateKey` | String | No | - | Key duy nhat cua template |
| `subject` | String | No | - | Tieu de (cho email template) |
| `content` | String | No | - | Noi dung template |
| `version` | String | No | - | Phien ban (vd: "1.0.0") |
| `locale` | String | No | - | Ngon ngu (vd: "VI", "EN") |
| `accountOwnerId` | String (UUID) | No | - | ID nguoi so huu |

**Response Success:**
```json
{
  "data": {
    "createTemplate": {
      "success": true,
      "templateId": "7d967ed3-4f70-4131-97e0-a178b50f8b8b",
      "error": null
    }
  }
}
```

**Response Error:**
```json
{
  "data": {
    "createTemplate": {
      "success": false,
      "templateId": null,
      "error": "Failed to create template"
    }
  }
}
```

---

### 2. updateTemplate

Cap nhat thong tin template. Chi cap nhat cac truong duoc truyen vao.

**Mutation:**
```graphql
mutation UpdateTemplate($input: UpdateTemplateInput!) {
  updateTemplate(input: $input) {
    success
    templateId
    error
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "472b23f7-ed73-49c6-b3df-6484a397c695",
    "name": "Support Ticket Template v2",
    "version": "2.0.0"
  }
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (UUID) | **Yes** | ID template can cap nhat |
| `name` | String | No | Ten template |
| `type` | String | No | Loai template |
| `templateKey` | String | No | Key duy nhat |
| `subject` | String | No | Tieu de |
| `content` | String | No | Noi dung |
| `version` | String | No | Phien ban |
| `locale` | String | No | Ngon ngu |
| `accountOwnerId` | String (UUID) | No | ID nguoi so huu |

**Response Success:**
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

**Response Error:**
```json
{
  "data": {
    "updateTemplate": {
      "success": false,
      "templateId": null,
      "error": "Failed to update template"
    }
  }
}
```

---

### 3. toggleTemplateActive

Bat/tat trang thai hoat dong cua template.

**Mutation:**
```graphql
mutation ToggleTemplateActive($templateId: String!, $isActive: Boolean!) {
  toggleTemplateActive(templateId: $templateId, isActive: $isActive) {
    success
    templateId
    isActive
    error
  }
}
```

**Variables (tat template):**
```json
{
  "templateId": "caf95c15-c617-4f6e-a48e-6b7739c4b629",
  "isActive": false
}
```

**Variables (bat template):**
```json
{
  "templateId": "caf95c15-c617-4f6e-a48e-6b7739c4b629",
  "isActive": true
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templateId` | String (UUID) | **Yes** | ID template |
| `isActive` | Boolean | **Yes** | `true` = kich hoat, `false` = vo hieu hoa |

**Response Success:**
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

**Response Error:**
```json
{
  "data": {
    "toggleTemplateActive": {
      "success": false,
      "templateId": null,
      "isActive": null,
      "error": "Failed to toggle template active status"
    }
  }
}
```

---

### 4. deleteTemplate

Xoa mem template (soft delete).

**Mutation:**
```graphql
mutation DeleteTemplate($templateId: String!) {
  deleteTemplate(templateId: $templateId) {
    success
    templateId
    message
    error
  }
}
```

**Variables:**
```json
{
  "templateId": "7d967ed3-4f70-4131-97e0-a178b50f8b8b"
}
```

**Response Success:**
```json
{
  "data": {
    "deleteTemplate": {
      "success": true,
      "templateId": "7d967ed3-4f70-4131-97e0-a178b50f8b8b",
      "message": "Template has been soft deleted",
      "error": null
    }
  }
}
```

**Response Error:**
```json
{
  "data": {
    "deleteTemplate": {
      "success": false,
      "templateId": null,
      "message": null,
      "error": "Failed to delete template"
    }
  }
}
```

---

## Types

### EmailOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Email ID (UUID) |
| `subject` | String | Yes | Tieu de email |
| `to` | String | Yes | Dia chi nguoi nhan |
| `from` | String | Yes | Dia chi nguoi gui |
| `body` | String | Yes | Noi dung email |
| `sentAt` | String | Yes | Thoi gian gui |
| `status` | EmailStatus | Yes | Trang thai email |
| `emailType` | String | Yes | Loai email |
| `position` | Number | Yes | Vi tri sap xep |
| `accountOwnerId` | String | Yes | ID nguoi so huu |
| `createdAt` | String | Yes | Ngay tao |
| `updatedAt` | String | Yes | Ngay cap nhat |

### EmailListOutput

| Field | Type | Description |
|-------|------|-------------|
| `emails` | [EmailOutput] | Danh sach email |
| `totalCount` | Number | Tong so email |

### EmailStatusDistributionOutput

| Field | Type | Description |
|-------|------|-------------|
| `distribution` | [EmailStatusDistributionItem] | Danh sach phan bo |
| `totalCount` | Number | Tong so email |

### EmailStatusDistributionItem

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Trang thai email |
| `count` | Number | So luong email |

### TemplateOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String | No | Template ID (UUID) |
| `name` | String | Yes | Ten template |
| `type` | String | Yes | Loai template |
| `templateKey` | String | Yes | Key duy nhat cua template |
| `subject` | String | Yes | Tieu de (cho email) |
| `content` | String | Yes | Noi dung template |
| `version` | String | Yes | Phien ban (vd: "1.0.0") |
| `locale` | String | Yes | Ngon ngu (vd: "VI", "EN") |
| `isActive` | Boolean | Yes | Trang thai kich hoat |
| `position` | Number | Yes | Vi tri sap xep |
| `accountOwnerId` | String | Yes | ID nguoi so huu |
| `createdAt` | String | Yes | Ngay tao |
| `updatedAt` | String | Yes | Ngay cap nhat |

### TemplateListOutput

| Field | Type | Description |
|-------|------|-------------|
| `templates` | [TemplateOutput] | Danh sach template |
| `totalCount` | Number | Tong so template |

### CreateEmailResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `emailId` | String | Yes | ID email da tao |
| `status` | EmailStatus | Yes | Trang thai email (DRAFT) |
| `error` | String | Yes | Thong bao loi (neu co) |

### UpdateEmailResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `emailId` | String | Yes | ID email |
| `error` | String | Yes | Thong bao loi (neu co) |

### DeleteEmailResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `emailId` | String | Yes | ID email |
| `message` | String | Yes | Thong bao ket qua |
| `error` | String | Yes | Thong bao loi (neu co) |

### CreateTemplateResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `templateId` | String | Yes | ID template da tao |
| `error` | String | Yes | Thong bao loi (neu co) |

### UpdateTemplateResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `templateId` | String | Yes | ID template |
| `error` | String | Yes | Thong bao loi (neu co) |

### ToggleTemplateActiveResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `templateId` | String | Yes | ID template |
| `isActive` | Boolean | Yes | Trang thai sau khi thay doi |
| `error` | String | Yes | Thong bao loi (neu co) |

### DeleteTemplateResponseDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Ket qua thao tac |
| `templateId` | String | Yes | ID template |
| `message` | String | Yes | Thong bao ket qua |
| `error` | String | Yes | Thong bao loi (neu co) |

### Enums

#### EmailStatus

| Value | Mo ta (VI) | Mo ta (EN) |
|-------|------------|------------|
| `DRAFT` | Ban nhap | Draft |
| `SENT` | Da gui | Sent |
| `FAILED` | That bai | Failed |

---

## Security Notes

### 2-Layer Access Control

Module Email/Template ap dung 2 lop bao mat (khong co RBAC vi la tai nguyen chung):

```
Layer 1: Guards (WorkspaceAuthGuard + UserAuthGuard)
    |
Layer 2: Block Hooks (chan 26 auto-generated operations)
```

#### Layer 1 - Authentication Guards

| Guard | Chuc nang |
|-------|-----------|
| `WorkspaceAuthGuard` | Xac thuc workspace tu token |
| `UserAuthGuard` | Xac thuc user tu token |

**Luu y:** Module nay **khong** ap dung RBAC hoac DataScope. Tat ca user da xac thuc deu co the truy cap email va template trong workspace cua minh.

#### Layer 2 - Block Hooks

Module chan **26 GraphQL operations tu dong sinh** boi Twenty CRM engine (13 cho mktEmail + 13 cho mktTemplate). Tat ca thao tac **bat buoc** phai di qua cac custom resolver.

**Cac operations bi chan cho moi entity:**

| # | Operation | Mo ta |
|---|-----------|-------|
| 1 | `findMany` | Lay danh sach |
| 2 | `findOne` | Lay 1 ban ghi |
| 3 | `findDuplicates` | Tim ban ghi trung |
| 4 | `createMany` | Tao nhieu ban ghi |
| 5 | `createOne` | Tao 1 ban ghi |
| 6 | `updateMany` | Cap nhat nhieu ban ghi |
| 7 | `updateOne` | Cap nhat 1 ban ghi |
| 8 | `deleteMany` | Xoa nhieu ban ghi |
| 9 | `deleteOne` | Xoa 1 ban ghi |
| 10 | `destroyMany` | Xoa vinh vien nhieu ban ghi |
| 11 | `destroyOne` | Xoa vinh vien 1 ban ghi |
| 12 | `restoreMany` | Khoi phuc nhieu ban ghi |
| 13 | `restoreOne` | Khoi phuc 1 ban ghi |

**Vi du operations bi chan:**
```graphql
# Bi chan - KHONG su dung
query { mktEmails { edges { node { id subject } } } }
query { mktTemplates { edges { node { id name } } } }

# Su dung custom resolvers thay the
query { getEmails { emails { id subject } totalCount } }
query { getTemplates { templates { id name } totalCount } }
```

---

## Error Handling

### Common Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| `UNAUTHENTICATED` | Forbidden resource | Chua dang nhap hoac token het han |
| - | Failed to create email | Loi khi tao email |
| - | Failed to update email | Loi khi cap nhat email |
| - | Failed to delete email | Loi khi xoa email |
| - | Failed to create template | Loi khi tao template |
| - | Failed to update template | Loi khi cap nhat template |
| - | Failed to toggle template active status | Loi khi bat/tat template |
| - | Failed to delete template | Loi khi xoa template |

### Mutation Response Pattern

Tat ca mutation tra ve pattern `{ success, error }` thay vi throw exception:

```typescript
// Kiem tra ket qua
const result = await createEmail({ variables: { input } });
const data = result.data.createEmail;

if (data.success) {
  // Thanh cong
  console.log('Email ID:', data.emailId);
  console.log('Status:', data.status); // DRAFT
} else {
  // That bai - hien thi loi
  showError(data.error);
}
```

### Query null Pattern

Cac query tra ve don le (getEmailById, getTemplateById, getTemplateByKey) tra ve `null` khi khong tim thay:

```typescript
const result = await getEmailById({ variables: { emailId } });

if (result.data.getEmailById) {
  // Tim thay email
  showEmailDetail(result.data.getEmailById);
} else {
  // Khong tim thay
  showNotFound('Email khong ton tai');
}
```

---

## Best Practices

### 1. Su dung getEmails voi pagination

```graphql
# Lay 10 email dau tien
query { getEmails(take: 10, skip: 0) { emails { ... } totalCount } }

# Lay trang tiep theo
query { getEmails(take: 10, skip: 10) { emails { ... } totalCount } }
```

### 2. Kiem tra ket qua mutation truoc khi xu ly

```typescript
const result = await updateEmail({
  variables: {
    input: { id: emailId, subject: 'New Subject' }
  }
});

const data = result.data.updateEmail;

if (data.success) {
  showSuccess('Email da duoc cap nhat');
  refetchEmails(); // Reload danh sach
} else {
  showError(data.error);
}
```

### 3. Su dung getEmailStatusDistribution cho dashboard

```typescript
const result = await getEmailStatusDistribution();
const { distribution, totalCount } = result.data.getEmailStatusDistribution;

// Hien thi pie chart / bar chart
for (const item of distribution) {
  console.log(`${item.status}: ${item.count} (${(item.count / totalCount * 100).toFixed(1)}%)`);
}
```

### 4. Flow tao email day du

```typescript
// Buoc 1: Tao email (trang thai mac dinh DRAFT)
const createResult = await createEmail({
  variables: {
    input: {
      subject: 'Order Confirmation',
      to: 'customer@example.com',
      from: 'noreply@company.com',
      body: 'Thank you for your order...',
      emailType: 'ORDER_NOTIFICATION'
    }
  }
});

if (!createResult.data.createEmail.success) {
  showError(createResult.data.createEmail.error);
  return;
}

const emailId = createResult.data.createEmail.emailId;
console.log('Created email:', emailId, 'Status:', createResult.data.createEmail.status);

// Buoc 2: Cap nhat trang thai SENT sau khi gui
const updateResult = await updateEmail({
  variables: {
    input: {
      id: emailId,
      status: 'SENT'
    }
  }
});
```

### 5. Tim template theo key de render email

```typescript
// Lay template theo key (khong can biet ID)
const templateResult = await getTemplateByKey({
  variables: { templateKey: 'welcome_email' }
});

const template = templateResult.data.getTemplateByKey;

if (template && template.isActive) {
  // Su dung template content de render email
  const emailContent = template.content
    .replace('{{customerName}}', customer.name)
    .replace('{{companyName}}', company.name);

  // Tao email voi noi dung da render
  await createEmail({
    variables: {
      input: {
        subject: template.subject,
        to: customer.email,
        body: emailContent,
        emailType: template.type
      }
    }
  });
} else {
  showError('Template khong ton tai hoac da bi vo hieu hoa');
}
```

### 6. Quan ly template lifecycle

```typescript
// Tao template moi
const createResult = await createTemplate({
  variables: {
    input: {
      name: 'Invoice Reminder',
      type: 'EMAIL',
      templateKey: 'invoice_reminder',
      subject: 'Payment Reminder - Invoice #{{invoiceNumber}}',
      content: 'Dear {{customerName}}, This is a reminder...',
      version: '1.0.0',
      locale: 'VI'
    }
  }
});

// Vo hieu hoa template cu
await toggleTemplateActive({
  variables: {
    templateId: 'old-template-id',
    isActive: false
  }
});

// Cap nhat version khi thay doi noi dung
await updateTemplate({
  variables: {
    input: {
      id: createResult.data.createTemplate.templateId,
      content: 'Updated content...',
      version: '1.1.0'
    }
  }
});
```

### 7. Loc template theo loai

```typescript
// Lay tat ca email templates
const emailTemplates = await getTemplatesByType({
  variables: { type: 'EMAIL' }
});

// Lay tat ca contract templates
const contractTemplates = await getTemplatesByType({
  variables: { type: 'CONTRACT' }
});

// Hien thi danh sach cho user chon
const allTemplates = [
  ...emailTemplates.data.getTemplatesByType.templates,
  ...contractTemplates.data.getTemplatesByType.templates
];
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-09 | Initial release - 5 email queries, 3 email mutations, 4 template queries, 4 template mutations voi 2-layer security |
