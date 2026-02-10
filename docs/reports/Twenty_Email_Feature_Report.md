# BÁO CÁO CHI TIẾT: FEATURE EMAIL TRONG TWENTY CRM

> Ngày tạo: 2026-02-10
> Phạm vi: Toàn bộ codebase CRM (fork từ Twenty CRM + mkt-core module)

---

## MỤC LỤC

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Hệ Thống Gửi Email Transactional](#2-hệ-thống-gửi-email-transactional)
3. [Hệ Thống Đồng Bộ Email (Messaging Module)](#3-hệ-thống-đồng-bộ-email-messaging-module)
4. [Connected Accounts](#4-connected-accounts)
5. [Workspace Entities](#5-workspace-entities)
6. [Email Templates (twenty-emails)](#6-email-templates-twenty-emails)
7. [MKT Email Module (Custom)](#7-mkt-email-module-custom)
8. [Cron Jobs & Background Workers](#8-cron-jobs--background-workers)
9. [Calendar Integration](#9-calendar-integration)
10. [Cấu Hình & Biến Môi Trường](#10-cấu-hình--biến-môi-trường)
11. [Frontend Settings](#11-frontend-settings)
12. [Sơ Đồ Kiến Trúc](#12-sơ-đồ-kiến-trúc)

---

## 1. Tổng Quan Kiến Trúc

Feature email trong Twenty CRM được chia thành **3 hệ thống chính**:

| Hệ thống | Mục đích | Vị trí |
|-----------|----------|--------|
| **Transactional Email** | Gửi email hệ thống (invite, password reset, notifications) | `engine/core-modules/email/` |
| **Messaging Module** | Đồng bộ & quản lý email từ Gmail/Microsoft/IMAP | `modules/messaging/` |
| **MKT Email Module** | Email marketing tùy biến (order notifications, templates) | `mkt-core/mkt-email/` |

---

## 2. Hệ Thống Gửi Email Transactional

### 2.1 Kiến Trúc Module

```
packages/twenty-server/src/engine/core-modules/email/
├── email.module.ts              # @Global() DynamicModule
├── email.service.ts             # Async email via BullMQ queue
├── email-sender.service.ts      # Sync email driver wrapper
├── email-sender.job.ts          # BullMQ job processor (emailQueue)
├── email-driver.factory.ts      # Factory pattern - LOGGER | SMTP
├── enums/
│   └── email-driver.enum.ts     # EmailDriver { LOGGER, SMTP }
├── drivers/
│   ├── interfaces/
│   │   └── email-driver.interface.ts
│   ├── logger.driver.ts         # Dev mode - log to console
│   └── smtp.driver.ts           # Production - nodemailer SMTP
└── __tests__/
```

### 2.2 Flow Gửi Email

```
EmailService.send(mailOptions)
  → MessageQueueService.add(EmailSenderJob, mailOptions, { retryLimit: 3 })
    → [BullMQ emailQueue]
      → EmailSenderJob.handle(data)
        → EmailSenderService.send(data)
          → EmailDriverFactory.getCurrentDriver()
            → SmtpDriver.send() | LoggerDriver.send()
```

**File:** `email.service.ts:17` - Sử dụng `MessageQueue.emailQueue` với retry 3 lần.

### 2.3 Email Drivers

| Driver | Class | Mô tả |
|--------|-------|-------|
| `LOGGER` | `LoggerDriver` | Chỉ log nội dung email ra console. Default cho development |
| `SMTP` | `SmtpDriver` | Sử dụng nodemailer để gửi qua SMTP server |

**SmtpDriver** (`drivers/smtp.driver.ts`):
- Sử dụng `nodemailer.createTransport(options)`
- Options: `host`, `port`, `auth` (user/pass), `secure`, `ignoreTLS`
- Send bất đồng bộ (fire-and-forget với logging)

### 2.4 EmailModule Registration

```typescript
// email.module.ts - @Global() module
@Global()
export class EmailModule {
  static forRoot(): DynamicModule {
    return {
      module: EmailModule,
      providers: [EmailDriverFactory, EmailSenderService, EmailService],
      exports: [EmailSenderService, EmailService],
    };
  }
}
```

- `EmailSenderService`: Gửi email **đồng bộ** (dùng trực tiếp driver)
- `EmailService`: Gửi email **bất đồng bộ** (qua BullMQ queue, có retry)

---

## 3. Hệ Thống Đồng Bộ Email (Messaging Module)

### 3.1 Cấu Trúc Module

```
packages/twenty-server/src/modules/messaging/
├── common/
│   ├── messaging-common.module.ts
│   ├── services/
│   │   └── message-channel-sync-status.service.ts
│   ├── standard-objects/
│   │   ├── message.workspace-entity.ts
│   │   ├── message-thread.workspace-entity.ts
│   │   ├── message-participant.workspace-entity.ts
│   │   ├── message-channel.workspace-entity.ts
│   │   ├── message-channel-message-association.workspace-entity.ts
│   │   └── message-folder.workspace-entity.ts
│   ├── query-hooks/          # Visibility restrictions
│   └── enums/
│       └── message-direction.enum.ts    # INCOMING | OUTGOING
│
├── message-import-manager/
│   ├── messaging-import-manager.module.ts
│   ├── drivers/
│   │   ├── gmail/            # Google Gmail API driver
│   │   ├── microsoft/        # Microsoft Graph API driver
│   │   ├── imap/             # Generic IMAP driver
│   │   ├── smtp/             # SMTP sending driver
│   │   └── exceptions/
│   ├── services/
│   │   ├── messaging-send-message.service.ts      # Gửi email
│   │   ├── messaging-messages-import.service.ts    # Import messages
│   │   ├── messaging-message-list-fetch.service.ts # Fetch message list
│   │   ├── messaging-get-message-list.service.ts
│   │   ├── messaging-get-messages.service.ts
│   │   ├── messaging-message.service.ts
│   │   ├── messaging-cursor.service.ts
│   │   └── messaging-save-messages-and-enqueue-contact-creation.service.ts
│   ├── crons/
│   │   ├── commands/         # NestJS CLI commands
│   │   └── jobs/             # Cron job processors
│   ├── jobs/                 # BullMQ job definitions
│   ├── listeners/
│   └── constants/
│
├── message-participant-manager/
├── message-cleaner/
├── blocklist-manager/
└── monitoring/
```

### 3.2 Providers (Drivers)

#### Gmail Driver
```
drivers/gmail/
├── messaging-gmail-driver.module.ts
├── providers/
│   ├── gmail-client.provider.ts     # Google Gmail API client
│   └── oauth2-client.provider.ts    # Google OAuth2 client
├── services/
│   ├── gmail-get-message-list.service.ts
│   ├── gmail-get-messages.service.ts
│   ├── gmail-get-history.service.ts
│   ├── gmail-fetch-by-batch.service.ts
│   └── gmail-handle-error.service.ts
├── utils/
│   ├── parse-gmail-message.util.ts
│   ├── compute-message-direction.util.ts
│   └── ...
└── constants/
    ├── messaging-gmail-users-messages-list-max-result.constant.ts
    └── messaging-gmail-users-messages-get-batch-size.constant.ts
```

#### Microsoft Driver
```
drivers/microsoft/
├── messaging-microsoft-driver.module.ts
├── providers/
│   └── microsoft-client.provider.ts   # Microsoft Graph API client
├── services/
│   ├── microsoft-get-messages.service.ts
│   ├── microsoft-get-message-list.service.ts
│   ├── microsoft-fetch-by-batch.service.ts
│   └── microsoft-handle-error.service.ts
└── utils/
    ├── parse-microsoft-messages-import.util.ts
    └── is-temporary-error.utils.ts
```

#### IMAP Driver
```
drivers/imap/
├── messaging-imap-driver.module.ts
├── providers/
│   └── imap-client.provider.ts
├── services/
│   ├── imap-get-message-list.service.ts
│   ├── imap-get-messages.service.ts
│   ├── imap-message-processor.service.ts
│   ├── imap-message-locator.service.ts
│   ├── imap-fetch-by-batch.service.ts
│   └── imap-handle-error.service.ts
└── types/
    └── imap-error.type.ts
```

#### SMTP Driver (Sending)
```
drivers/smtp/
├── messaging-smtp-driver.module.ts
└── providers/
    └── smtp-client.provider.ts
```

### 3.3 MessagingSendMessageService

**File:** `services/messaging-send-message.service.ts`

Hỗ trợ gửi email qua 3 provider:

| Provider | Method |
|----------|--------|
| `GOOGLE` | Gmail API (`gmailClient.users.messages.send`) |
| `MICROSOFT` | Microsoft Graph API (`/me/messages` + `/me/messages/{id}/send`) |
| `IMAP_SMTP_CALDAV` | Nodemailer SMTP (`smtpClient.sendMail`) |

### 3.4 Sync Pipeline

```
[Cron Job: mỗi 5 phút]
  → MessagingMessageListFetchCronJob
    → Quét tất cả active workspaces
    → Tìm messageChannels có syncStage = FULL/PARTIAL_MESSAGE_LIST_FETCH_PENDING
    → Enqueue MessagingMessageListFetchJob cho mỗi channel

[MessagingMessageListFetchJob]
  → MessagingMessageListFetchService
    → Gmail/Microsoft/IMAP driver → Fetch message list (IDs)
    → Update syncStage → MESSAGES_IMPORT_PENDING

[Cron Job: mỗi 5 phút]
  → MessagingMessagesImportCronJob
    → Tìm channels có syncStage = MESSAGES_IMPORT_PENDING
    → Enqueue MessagingMessagesImportJob

[MessagingMessagesImportJob]
  → MessagingMessagesImportService
    → Fetch full message content
    → Save messages + Enqueue contact creation
    → Update syncStage → FULL_MESSAGE_LIST_FETCH_PENDING (loop lại)
```

### 3.5 Sync Stages

```
FULL_MESSAGE_LIST_FETCH_PENDING
  → MESSAGE_LIST_FETCH_ONGOING
    → MESSAGES_IMPORT_PENDING
      → MESSAGES_IMPORT_ONGOING
        → (quay lại FULL_MESSAGE_LIST_FETCH_PENDING)

FAILED (khi gặp lỗi)
```

### 3.6 Sync Statuses

| Status | Mô tả |
|--------|-------|
| `NOT_SYNCED` | Chưa đồng bộ |
| `ONGOING` | Đang đồng bộ |
| `ACTIVE` | Đã đồng bộ thành công |
| `FAILED_INSUFFICIENT_PERMISSIONS` | Thiếu quyền (OAuth scope) |
| `FAILED_UNKNOWN` | Lỗi không xác định |

---

## 4. Connected Accounts

### 4.1 Entity

**File:** `modules/connected-account/standard-objects/connected-account.workspace-entity.ts`

| Field | Type | Mô tả |
|-------|------|-------|
| `handle` | TEXT | Email/username của account |
| `provider` | TEXT | `google` \| `microsoft` \| `imap-smtp-caldav` |
| `accessToken` | TEXT | OAuth2 access token |
| `refreshToken` | TEXT | OAuth2 refresh token |
| `lastSyncHistoryId` | TEXT | ID sync cuối cùng |
| `authFailedAt` | DATE_TIME | Thời điểm auth bị lỗi |
| `handleAliases` | TEXT | Email aliases |
| `scopes` | ARRAY | OAuth scopes đã cấp |
| `connectionParameters` | RAW_JSON | IMAP/SMTP/CalDAV connection params |
| `accountOwnerId` | FK | → WorkspaceMember |

**Relations:**
- `messageChannels` → MessageChannel[] (1:N)
- `calendarChannels` → CalendarChannel[] (1:N)
- `accountOwner` → WorkspaceMember (N:1)

### 4.2 Module Structure

```
modules/connected-account/
├── connected-account.module.ts
├── standard-objects/
│   └── connected-account.workspace-entity.ts
├── services/
│   ├── imap-smtp-caldav-apis.service.ts    # Setup IMAP/SMTP/CalDAV accounts
│   └── accounts-to-reconnect.service.ts
├── listeners/
│   ├── connected-account.listener.ts
│   └── connected-account-workspace-member.listener.ts
├── query-hooks/
├── jobs/
│   └── delete-workspace-member-connected-accounts.job.ts
├── refresh-tokens-manager/
│   ├── services/
│   │   └── connected-account-refresh-tokens.service.ts
│   └── drivers/
│       ├── google/     # Google token refresh
│       └── microsoft/  # Microsoft token refresh
├── email-alias-manager/
│   ├── services/
│   │   └── email-alias-manager.service.ts
│   └── drivers/
│       ├── google/     # Google email aliases
│       └── microsoft/  # Microsoft email aliases
├── oauth2-client-manager/
│   ├── services/
│   │   └── oauth2-client-manager.service.ts
│   └── drivers/
│       ├── google/     # Google OAuth2 client
│       └── microsoft/  # Microsoft OAuth2 client
└── imap-api/
    └── imap-apis.module.ts
```

### 4.3 Supported Providers

| Provider | Auth Method | Features |
|----------|------------|----------|
| **Google** | OAuth2 (Google APIs) | Gmail sync, Calendar sync, Send email |
| **Microsoft** | OAuth2 (Microsoft Graph) | Outlook sync, Calendar sync, Send email |
| **IMAP/SMTP/CalDAV** | Username/Password | IMAP receive, SMTP send, CalDAV calendar |

---

## 5. Workspace Entities

### 5.1 Entity Relationship Diagram

```
ConnectedAccount (1) ──→ (N) MessageChannel (1) ──→ (N) MessageChannelMessageAssociation
                                    │                              │
                                    │                              │
                                    ▼                              ▼
                            MessageFolder            Message (1) ──→ (N) MessageParticipant
                                                       │                      │
                                                       │                      │
                                                       ▼                      ▼
                                                 MessageThread          Person / WorkspaceMember
```

### 5.2 Chi tiết Entities

#### Message
**File:** `messaging/common/standard-objects/message.workspace-entity.ts`

| Field | Type | Mô tả |
|-------|------|-------|
| `headerMessageId` | TEXT | Message-ID từ email header |
| `subject` | TEXT | Tiêu đề email |
| `text` | TEXT | Nội dung text |
| `receivedAt` | DATE_TIME | Ngày nhận |

**Relations:** `messageThread` (N:1), `messageParticipants` (1:N), `messageChannelMessageAssociations` (1:N)

#### MessageThread
**File:** `messaging/common/standard-objects/message-thread.workspace-entity.ts`

- Nhóm các messages liên quan (email thread)
- **Relations:** `messages` (1:N)

#### MessageParticipant
**File:** `messaging/common/standard-objects/message-participant.workspace-entity.ts`

| Field | Type | Options |
|-------|------|---------|
| `role` | SELECT | `from`, `to`, `cc`, `bcc` |
| `handle` | TEXT | Email address |
| `displayName` | TEXT | Tên hiển thị |

**Relations:** `message` (N:1), `person` (N:1), `workspaceMember` (N:1)

#### MessageChannel
**File:** `messaging/common/standard-objects/message-channel.workspace-entity.ts`

| Field | Type | Mô tả |
|-------|------|-------|
| `visibility` | SELECT | `METADATA` \| `SUBJECT` \| `SHARE_EVERYTHING` |
| `handle` | TEXT | Email address |
| `type` | SELECT | `email` \| `sms` |
| `isSyncEnabled` | BOOLEAN | Bật/tắt sync |
| `syncCursor` | TEXT | Cursor đồng bộ |
| `syncedAt` | DATE_TIME | Lần sync cuối |
| `syncStatus` | SELECT | `NOT_SYNCED` \| `ONGOING` \| `ACTIVE` \| `FAILED_*` |
| `syncStage` | SELECT | Pipeline stage hiện tại |
| `contactAutoCreationPolicy` | SELECT | `SENT_AND_RECEIVED` \| `SENT` \| `NONE` |
| `excludeNonProfessionalEmails` | BOOLEAN | Loại trừ email cá nhân |
| `excludeGroupEmails` | BOOLEAN | Loại trừ group emails |
| `throttleFailureCount` | NUMBER | Đếm lỗi throttle |

#### MessageChannelMessageAssociation
**File:** `messaging/common/standard-objects/message-channel-message-association.workspace-entity.ts`

- Bảng trung gian giữa MessageChannel và Message
- Lưu `messageExternalId`, `messageThreadExternalId`, `direction` (INCOMING/OUTGOING)
- Unique index: `[messageChannelId, messageId]`

#### MessageFolder
**File:** `messaging/common/standard-objects/message-folder.workspace-entity.ts`

- Folder của MessageChannel (Inbox, Sent, etc.)
- Fields: `name`, `syncCursor`

---

## 6. Email Templates (twenty-emails)

### 6.1 Cấu Trúc Package

```
packages/twenty-emails/
├── src/
│   ├── index.ts               # Export all email templates
│   ├── common-style.ts        # Shared email theme/styles
│   ├── components/            # Reusable email components
│   │   ├── BaseEmail.tsx
│   │   ├── BaseHead.tsx
│   │   ├── Title.tsx
│   │   ├── SubTitle.tsx
│   │   ├── MainText.tsx
│   │   ├── ShadowText.tsx
│   │   ├── HighlightedText.tsx
│   │   ├── HighlightedContainer.tsx
│   │   ├── CallToAction.tsx
│   │   ├── Logo.tsx
│   │   ├── Link.tsx
│   │   ├── Footer.tsx
│   │   └── WhatIsTwenty.tsx
│   ├── emails/                # Email templates
│   │   ├── send-invite-link.email.tsx
│   │   ├── password-reset-link.email.tsx
│   │   ├── password-update-notify.email.tsx
│   │   ├── send-email-verification-link.email.tsx
│   │   ├── validate-approved-access-domain.email.tsx
│   │   ├── warn-suspended-workspace.email.tsx
│   │   ├── clean-suspended-workspace.email.tsx
│   │   └── test.email.tsx
│   ├── constants/
│   │   └── DefaultWorkspaceLogo.ts
│   ├── utils/
│   │   └── capitalize.ts
│   └── locales/               # i18n translations (20+ locales)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 6.2 Available Templates

| Template | Mục đích | Props |
|----------|----------|-------|
| `SendInviteLinkEmail` | Mời user vào workspace | `link`, `workspace`, `sender`, `serverUrl`, `locale` |
| `PasswordResetLinkEmail` | Reset password | `link`, `duration`, `locale` |
| `PasswordUpdateNotifyEmail` | Thông báo password đã đổi | `locale` |
| `SendEmailVerificationLinkEmail` | Xác thực email | `link`, `locale` |
| `ValidateApprovedAccessDomainEmail` | Xác thực domain | `link`, `locale` |
| `WarnSuspendedWorkspaceEmail` | Cảnh báo workspace sắp bị xóa | `locale` |
| `CleanSuspendedWorkspaceEmail` | Thông báo workspace đã bị xóa | `locale` |
| `TestEmail` | Email test | - |

### 6.3 Technology

- **React Email** (`@react-email/components`) - Render email HTML từ React components
- **Lingui** (`@lingui/react`) - i18n support (20+ languages)
- **Vite** - Build tool

---

## 7. MKT Email Module (Custom)

### 7.1 Cấu Trúc Module

```
packages/twenty-server/src/mkt-core/mkt-email/
├── mkt-email.module.ts          # Module definition
├── workspace-entities/
│   ├── mkt-email.workspace-entity.ts      # MktEmail entity
│   └── mkt-template.workspace-entity.ts   # MktTemplate entity (unified)
├── repositories/
│   ├── mkt-email.repository.ts
│   └── mkt-template.repository.ts
├── services/
│   └── mkt-email.service.ts     # Business logic (order emails, template processing)
├── resolvers/
│   ├── email-query.resolver.ts
│   ├── email-mutation.resolver.ts
│   ├── template-query.resolver.ts
│   └── template-mutation.resolver.ts
├── dto/
│   ├── email-request.input.ts
│   ├── email-response.output.ts
│   ├── template-request.input.ts
│   └── template-response.output.ts
├── hooks/
│   ├── email-block.pre-query.hook.ts
│   └── template-block.pre-query.hook.ts
├── constants/
│   └── mkt-email.constant.ts
├── types/
│   └── mkt-email.types.ts
├── messages/
│   └── index.ts
└── EMAIL_FRONTEND_API_GUIDE.md
```

### 7.2 MktEmailWorkspaceEntity

**File:** `workspace-entities/mkt-email.workspace-entity.ts`

| Field | Type | Mô tả |
|-------|------|-------|
| `subject` | TEXT | Tiêu đề email |
| `to` | TEXT | Người nhận |
| `from` | TEXT | Người gửi |
| `body` | TEXT | Nội dung HTML |
| `sentAt` | DATE | Ngày gửi |
| `status` | TEXT | Trạng thái (SENT, FAILED, ...) |
| `emailType` | TEXT | Loại email |
| `position` | POSITION | Vị trí |
| `createdBy` | ACTOR | Người tạo |
| `accountOwnerId` | FK | → WorkspaceMember |
| `searchVector` | TS_VECTOR | Full-text search (subject, body, to) |

### 7.3 MktTemplateWorkspaceEntity (Unified)

**File:** `workspace-entities/mkt-template.workspace-entity.ts`

Entity template đa năng cho nhiều loại document:

| Field | Type | Mô tả |
|-------|------|-------|
| `name` | TEXT | Tên template |
| `type` | TEXT | Loại template (xem bảng dưới) |
| `templateKey` | TEXT | Key duy nhất |
| `subject` | TEXT | Subject cho email templates |
| `content` | TEXT | Nội dung template |
| `version` | TEXT | Version |
| `locale` | TEXT | Ngôn ngữ |
| `metadata` | RAW_JSON | Metadata bổ sung |
| `isActive` | BOOLEAN | Active/inactive |

**Template Types:**

| Type | Mô tả |
|------|-------|
| `EMAIL` | Email chung |
| `WELCOME_EMAIL` | Email chào mừng |
| `TWO_FACTOR_AUTH` | OTP 2FA |
| `ACCOUNT_UPDATE_EMAIL` | Cập nhật tài khoản |
| `PASSWORD_RESET` | Reset mật khẩu |
| `INVOICE` | Hóa đơn |
| `CONTRACT` | Hợp đồng |
| `ORDER` | Đơn hàng |
| `QUOTE` | Báo giá |
| `NOTIFICATION` | Thông báo |
| `TICKET` | Ticket |
| `CATALOG` | Catalogue |

**Relations:**
- `mktInvoices` → MktInvoice[] (1:N)
- `mktPayments` → MktPayment[] (1:N)
- `accountOwner` → WorkspaceMember (N:1)

### 7.4 MktEmailService

**File:** `services/mkt-email.service.ts`

Chức năng chính:

1. **`sendOrderEmail(fullOrder)`** - Gửi email thông báo đơn hàng:
   - Xác định template key từ order status (ORDER_STATUS_TEMPLATE_MAP)
   - Validate order có customer email
   - Tìm template từ DB (`MktTemplateRepository.findByKey`)
   - Build template variables (customer info, order info, payment info)
   - Replace placeholders (`{{ variable }}`) và conditionals (`{{#if ...}}`)
   - Gửi qua `EmailService` (BullMQ queue)
   - Lưu record vào `MktEmail` entity

2. **Template Processing:**
   - Hỗ trợ conditional blocks: `{{#if qr_code_url}}...{{/if}}`
   - Hỗ trợ variable replacement: `{{ customer_name }}`
   - Format VND currency, Vietnamese date

3. **Dependencies:**
   - `EmailService` (core) - để gửi email thực tế
   - `MktEmailRepository` - lưu email records
   - `MktTemplateRepository` - truy vấn templates
   - `MktOptionRepository` - lấy cấu hình (trial period)
   - `TwentyConfigService` - lấy EMAIL_FROM_NAME, EMAIL_FROM_ADDRESS, FRONTEND_URL

---

## 8. Cron Jobs & Background Workers

### 8.1 Messaging Cron Jobs

| Cron Job | Schedule | Queue | Mô tả |
|----------|----------|-------|-------|
| `MessagingMessageListFetchCronJob` | `*/5 * * * *` (5 phút) | `messagingQueue` | Fetch danh sách message IDs từ providers |
| `MessagingMessagesImportCronJob` | `*/5 * * * *` (5 phút) | `messagingQueue` | Import nội dung messages |
| `MessagingOngoingStaleCronJob` | Periodic | `messagingQueue` | Xử lý sync bị treo (stale) |

### 8.2 Messaging BullMQ Jobs

| Job | Queue | Mô tả |
|-----|-------|-------|
| `MessagingMessageListFetchJob` | `messagingQueue` | Fetch message list cho 1 channel |
| `MessagingMessagesImportJob` | `messagingQueue` | Import messages cho 1 channel |
| `MessagingOngoingStaleJob` | `messagingQueue` | Reset sync bị treo |
| `MessagingAddSingleMessageToCacheForImportJob` | `messagingQueue` | Thêm 1 message vào cache |
| `MessagingCleanCacheJob` | `messagingQueue` | Dọn cache |

### 8.3 Email Sending Job

| Job | Queue | Mô tả |
|-----|-------|-------|
| `EmailSenderJob` | `emailQueue` | Gửi email transactional (retry 3 lần) |

### 8.4 Calendar Cron Jobs

| Cron Job | Queue | Mô tả |
|----------|-------|-------|
| `CalendarEventListFetchCronJob` | `calendarQueue` | Fetch calendar events |
| `CalendarEventsImportCronJob` | `calendarQueue` | Import calendar events |
| `CalendarOngoingStaleCronJob` | `calendarQueue` | Xử lý sync bị treo |

### 8.5 Blocklist Jobs

| Job | Queue | Mô tả |
|-----|-------|-------|
| `MessagingBlocklistItemDeleteMessagesJob` | `messagingQueue` | Xóa messages từ blocklist |
| `MessagingBlocklistReimportMessagesJob` | `messagingQueue` | Re-import sau khi bỏ blocklist |

---

## 9. Calendar Integration

### 9.1 Module Structure

```
modules/calendar/
├── calendar.module.ts
├── common/
│   ├── standard-objects/
│   │   ├── calendar-event.workspace-entity.ts
│   │   ├── calendar-channel.workspace-entity.ts
│   │   ├── calendar-event-participant.workspace-entity.ts
│   │   └── calendar-channel-event-association.workspace-entity.ts
│   ├── services/
│   └── query-hooks/
├── calendar-event-import-manager/
│   ├── drivers/
│   │   ├── google-calendar/    # Google Calendar API
│   │   ├── microsoft-calendar/ # Microsoft Graph Calendar API
│   │   └── caldav/             # CalDAV protocol
│   ├── services/
│   ├── crons/
│   └── jobs/
├── calendar-event-participant-manager/
├── calendar-event-cleaner/
└── blocklist-manager/
```

### 9.2 Calendar liên quan email

- Calendar channels được tạo cùng lúc với email account connection
- Chia sẻ `ConnectedAccount` entity
- Google: Calendar sync cùng OAuth2 scope
- Microsoft: Calendar sync qua Graph API
- IMAP/SMTP/CalDAV: CalDAV protocol riêng

---

## 10. Cấu Hình & Biến Môi Trường

### 10.1 Email Sending (Transactional)

| Variable | Default | Mô tả |
|----------|---------|-------|
| `EMAIL_DRIVER` | `LOGGER` | `LOGGER` (dev) hoặc `SMTP` (production) |
| `EMAIL_FROM_ADDRESS` | `noreply@yourdomain.com` | Địa chỉ người gửi |
| `EMAIL_FROM_NAME` | `Felix from Twenty` | Tên người gửi |
| `EMAIL_SYSTEM_ADDRESS` | `system@yourdomain.com` | Email hệ thống |
| `EMAIL_SMTP_HOST` | - | SMTP server host |
| `EMAIL_SMTP_PORT` | `587` | SMTP port |
| `EMAIL_SMTP_USER` | - | SMTP username (sensitive) |
| `EMAIL_SMTP_PASSWORD` | - | SMTP password (sensitive) |
| `EMAIL_SMTP_NO_TLS` | `false` | Tắt TLS (cho local testing) |

### 10.2 Google Integration

| Variable | Default | Mô tả |
|----------|---------|-------|
| `AUTH_GOOGLE_ENABLED` | `false` | Bật Google SSO |
| `AUTH_GOOGLE_CLIENT_ID` | - | Google OAuth Client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` | - | Google OAuth Client Secret (sensitive) |
| `AUTH_GOOGLE_CALLBACK_URL` | - | Callback URL cho Google Auth |
| `AUTH_GOOGLE_APIS_CALLBACK_URL` | - | Callback URL cho Google APIs (email/calendar) |
| `MESSAGING_PROVIDER_GMAIL_ENABLED` | `false` | **Bật Gmail messaging integration** |
| `CALENDAR_PROVIDER_GOOGLE_ENABLED` | `false` | **Bật Google Calendar integration** |

### 10.3 Microsoft Integration

| Variable | Default | Mô tả |
|----------|---------|-------|
| `AUTH_MICROSOFT_ENABLED` | `false` | Bật Microsoft SSO |
| `AUTH_MICROSOFT_CLIENT_ID` | - | Microsoft OAuth Client ID |
| `AUTH_MICROSOFT_CLIENT_SECRET` | - | Microsoft OAuth Client Secret (sensitive) |
| `AUTH_MICROSOFT_CALLBACK_URL` | - | Callback URL cho Microsoft Auth |
| `AUTH_MICROSOFT_APIS_CALLBACK_URL` | - | Callback URL cho Microsoft APIs |
| `MESSAGING_PROVIDER_MICROSOFT_ENABLED` | `false` | **Bật Microsoft messaging** |
| `CALENDAR_PROVIDER_MICROSOFT_ENABLED` | `false` | **Bật Microsoft Calendar** |

### 10.4 IMAP/SMTP/CalDAV

| Variable | Default | Mô tả |
|----------|---------|-------|
| `IS_IMAP_SMTP_CALDAV_ENABLED` | `false` | **Bật IMAP/SMTP/CalDAV integration** |

### 10.5 Client Config (Frontend Flags)

Các biến trên được expose cho frontend qua `ClientConfigService`:

```typescript
{
  isMicrosoftMessagingEnabled: MESSAGING_PROVIDER_MICROSOFT_ENABLED,
  isGoogleMessagingEnabled: MESSAGING_PROVIDER_GMAIL_ENABLED,
  isMicrosoftCalendarEnabled: CALENDAR_PROVIDER_MICROSOFT_ENABLED,
  isGoogleCalendarEnabled: CALENDAR_PROVIDER_GOOGLE_ENABLED,
}
```

---

## 11. Frontend Settings

### 11.1 Settings Pages

| Page | Path | Mô tả |
|------|------|-------|
| `SettingsAccounts` | `/settings/accounts` | Trang quản lý accounts |

### 11.2 Components

```
packages/twenty-front/src/
├── pages/settings/accounts/
│   └── SettingsAccounts.tsx
├── modules/settings/
│   ├── components/
│   │   └── SettingsConnectedAccountsTableRow.tsx
│   └── accounts/components/
│       ├── SettingsAccountsConnectedAccountsListCard.tsx
│       └── SettingsAccountsConnectedAccountsRowRightContainer.tsx
└── modules/accounts/
    ├── types/
    │   ├── ConnectedAccount.ts
    │   ├── MessageChannel.ts
    │   ├── CalendarChannel.ts
    │   ├── BlocklistItem.ts
    │   └── ImapSmtpCaldavAccount.ts
    └── constants/
        ├── GmailSendScope.ts
        └── MicrosoftSendScope.ts
```

---

## 12. Sơ Đồ Kiến Trúc

### 12.1 Tổng Quan Hệ Thống Email

```
┌─────────────────────────────────────────────────────────────────┐
│                        TWENTY CRM                                │
│                                                                  │
│  ┌──────────────────────┐    ┌─────────────────────────────┐    │
│  │  Transactional Email │    │     Messaging Module         │    │
│  │  (System Emails)     │    │  (Email Sync & Management)   │    │
│  │                      │    │                              │    │
│  │  EmailModule         │    │  ┌──────────┐ ┌──────────┐  │    │
│  │    ├── SMTP Driver   │    │  │  Gmail   │ │Microsoft │  │    │
│  │    └── Logger Driver │    │  │  Driver  │ │  Driver  │  │    │
│  │                      │    │  └────┬─────┘ └────┬─────┘  │    │
│  │  Uses: BullMQ        │    │       │            │         │    │
│  │    emailQueue        │    │  ┌────┴────┐ ┌────┴─────┐   │    │
│  │                      │    │  │  IMAP   │ │  SMTP    │   │    │
│  └──────────┬───────────┘    │  │  Driver │ │  Driver  │   │    │
│             │                │  └─────────┘ └──────────┘   │    │
│             │                │                              │    │
│             │                │  Uses: BullMQ                │    │
│             │                │    messagingQueue             │    │
│             │                └─────────────┬────────────────┘    │
│             │                              │                     │
│  ┌──────────┴──────────────────────────────┴───────────┐        │
│  │              MKT Email Module (Custom)               │        │
│  │                                                      │        │
│  │  MktEmailService                                     │        │
│  │    ├── sendOrderEmail() → uses EmailService          │        │
│  │    ├── Template processing ({{ vars }}, {{#if}})     │        │
│  │    └── Save records to MktEmail entity               │        │
│  │                                                      │        │
│  │  Entities:                                           │        │
│  │    ├── MktEmailWorkspaceEntity (email records)       │        │
│  │    └── MktTemplateWorkspaceEntity (email templates)  │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐        │
│  │              Shared Infrastructure                    │        │
│  │                                                      │        │
│  │  ConnectedAccount → MessageChannel → Message          │        │
│  │       │                                 │             │        │
│  │       └── CalendarChannel → CalendarEvent             │        │
│  │                                                      │        │
│  │  BullMQ Queues: emailQueue, messagingQueue,          │        │
│  │                 calendarQueue, cronQueue              │        │
│  └──────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘

External Services:
  ├── Gmail API (googleapis)
  ├── Microsoft Graph API (@microsoft/microsoft-graph-client)
  ├── IMAP Server (imapflow)
  ├── SMTP Server (nodemailer)
  └── CalDAV Server (tsdav)
```

### 12.2 Flow Kết Nối Email Account

```
[User] → Settings → Connect Account
  │
  ├─ Google ─→ OAuth2 Flow ─→ GoogleAPIsService
  │              │                ├── createConnectedAccount()
  │              │                ├── createMessageChannel()
  │              │                ├── createCalendarChannel()
  │              │                └── enqueue initial sync jobs
  │              │
  ├─ Microsoft → OAuth2 Flow → MicrosoftAPIsService
  │              │                ├── (same as above)
  │              │
  └─ IMAP/SMTP → Form Input → ImapSmtpCalDavAPIService
                 │                ├── setupCompleteAccount()
                 │                ├── createConnectedAccount()
                 │                ├── createMessageChannel()
                 │                ├── createCalendarChannel()
                 │                └── enqueue initial sync jobs
```

---

## Tóm Tắt

### Để bật đầy đủ feature email, cần cấu hình:

1. **Email gửi đi (transactional):**
   ```env
   EMAIL_DRIVER=SMTP
   EMAIL_SMTP_HOST=smtp.example.com
   EMAIL_SMTP_PORT=587
   EMAIL_SMTP_USER=user@example.com
   EMAIL_SMTP_PASSWORD=your-password
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   EMAIL_FROM_NAME=Your Company
   ```

2. **Gmail Integration:**
   ```env
   AUTH_GOOGLE_ENABLED=true
   AUTH_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   AUTH_GOOGLE_CLIENT_SECRET=xxx
   AUTH_GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/redirect
   AUTH_GOOGLE_APIS_CALLBACK_URL=http://localhost:3000/auth/google-apis/get-access-token
   MESSAGING_PROVIDER_GMAIL_ENABLED=true
   CALENDAR_PROVIDER_GOOGLE_ENABLED=true
   ```

3. **Microsoft Integration:**
   ```env
   AUTH_MICROSOFT_ENABLED=true
   AUTH_MICROSOFT_CLIENT_ID=xxx
   AUTH_MICROSOFT_CLIENT_SECRET=xxx
   AUTH_MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/redirect
   AUTH_MICROSOFT_APIS_CALLBACK_URL=http://localhost:3000/auth/microsoft-apis/get-access-token
   MESSAGING_PROVIDER_MICROSOFT_ENABLED=true
   CALENDAR_PROVIDER_MICROSOFT_ENABLED=true
   ```

4. **IMAP/SMTP/CalDAV:**
   ```env
   IS_IMAP_SMTP_CALDAV_ENABLED=true
   ```
