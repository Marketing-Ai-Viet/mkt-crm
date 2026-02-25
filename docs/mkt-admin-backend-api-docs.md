# MKT Admin Backend - API Documentation

> Auto-generated from Swagger spec at `https://mkt-admin-be.local/swagger/`
>
> **Version**: 1.0 | **OpenAPI**: 3.0.0 | **Auth**: Better Auth 1.1.0
>
> **Generated**: 2026-02-25

---

## Table of Contents

- [Overview](#overview)
- [Statistics](#statistics)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Health & Metrics](#1-health--metrics)
  - [User Management](#2-user-management)
  - [Device Management](#3-device-management)
  - [File Upload](#4-file-upload)
  - [Product Management](#5-product-management)
  - [Plan Management](#6-plan-management)
  - [Quota Management](#7-quota-management)
  - [Usage Tracking](#8-usage-tracking)
  - [Subscription Management](#9-subscription-management)
  - [Webhooks](#10-webhooks)
- [Auth Endpoints (Better Auth)](#auth-endpoints-better-auth)
- [Data Schemas](#data-schemas)
- [Pagination](#pagination)
- [Error Handling](#error-handling)

---

## Overview

| Property | Value |
|----------|-------|
| **Title** | MKT Admin Backend |
| **Base URL** | `https://mkt-admin-be.local` |
| **Swagger UI** | `https://mkt-admin-be.local/swagger/` |
| **Auth Reference** | `https://mkt-admin-be.local/api/auth/reference` |
| **Authentication** | Bearer Token (Better Auth) |
| **API Version** | 1.0 |
| **OpenAPI Spec** | 3.0.0 |

---

## Statistics

| Metric | Count |
|--------|-------|
| **Total REST Endpoints** | 50 |
| **Total Auth Endpoints** | 45 |
| **Grand Total** | 95 |
| **API Tags (Groups)** | 11 |
| **DTO Schemas** | 58 |
| **Auth Schemas** | 6 |

### Endpoints by Tag

| Tag | Endpoints | Methods |
|-----|-----------|---------|
| subscriptions | 22 | GET(7), POST(13), PATCH(1), DELETE(1) |
| products | 13 | GET(7), POST(2), PATCH(2), DELETE(2) |
| plans | 10 | GET(4), POST(3), PATCH(2), DELETE(2) |
| user | 6 | GET(4), PATCH(1), DELETE(1) |
| quotas | 5 | GET(2), POST(3) |
| usage | 3 | GET(2), POST(1) |
| devices | 2 | GET(1), DELETE(1) |
| file | 2 | POST(2) |
| health | 1 | GET(1) |
| Webhooks | 1 | POST(1) |
| untagged (metrics) | 1 | GET(1) |

### HTTP Methods Distribution

| Method | Count | Percentage |
|--------|-------|------------|
| GET | 27 | 54% |
| POST | 25 | 50% |
| PATCH | 4 | 8% |
| DELETE | 4 | 8% |

> Note: Some endpoints support multiple methods.

---

## Authentication

The API uses **Better Auth** (v1.1.0) for authentication with multiple strategies:

| Strategy | Description |
|----------|-------------|
| **Email/Password** | `POST /api/auth/sign-in/email` |
| **Username/Password** | `POST /api/auth/sign-in/username` |
| **Social Login** | `POST /api/auth/sign-in/social` |
| **Magic Link** | `POST /api/auth/sign-in/magic-link` |
| **Passkey** | WebAuthn-based passkey authentication |

**Security Schemes:**
- `Bearer Token` - Include in header: `Authorization: Bearer <token>`
- `Cookie` - API key via cookie

**Token Refresh:** `POST /api/auth/refresh-token`

---

## API Endpoints

### 1. Health & Metrics

| Method | Path | Summary |
|--------|------|---------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/metrics` | Prometheus metrics |

---

### 2. User Management

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `GET` | `/api/v1/user/whoami` | Get current user | Bearer |
| `GET` | `/api/v1/user/all` | List users (offset pagination) | Bearer |
| `GET` | `/api/v1/user/all/cursor` | List users (cursor pagination) | Bearer |
| `GET` | `/api/v1/user/{id}` | Find user by ID | Bearer |
| `PATCH` | `/api/v1/user/profile` | Update user's profile | Bearer |
| `DELETE` | `/api/v1/user/{id}` | Delete a user | Bearer |

**Response: UserDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| role | string (enum) | Yes | `User`, `Admin` |
| username | string | Yes | |
| email | string | Yes | |
| firstName | string | No | |
| lastName | string | No | |
| image | string | No | |
| bio | string | No | |
| createdAt | date-time | Yes | |
| updatedAt | date-time | Yes | |

**Update: UpdateUserProfileDto**

| Field | Type | Required |
|-------|------|----------|
| username | string | No |
| firstName | string | No |
| lastName | string | No |
| image | string | No |

---

### 3. Device Management

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `GET` | `/api/v1/devices/users/{userId}/devices` | Get all devices for a user | Bearer |
| `DELETE` | `/api/v1/devices/{id}` | Delete device (Admin role only) | Bearer |

**Response: DeviceDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | Yes | |
| userId | uuid | Yes | |
| subscriptionId | uuid | No | |
| deviceId | string | Yes | Hardware device identifier |
| deviceName | string | No | |
| deviceInfo | object | No | Extra device metadata |
| activatedAt | date-time | Yes | |
| deactivatedAt | date-time | No | |
| isActive | boolean | Yes | |

---

### 4. File Upload

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/file/upload/single` | Upload single file | Bearer |
| `POST` | `/api/v1/file/upload/multiple` | Upload multiple files | Bearer |

**Content-Type:** `multipart/form-data`

**Response: FileDto**

| Field | Type | Required |
|-------|------|----------|
| originalname | string | Yes |
| filename | string | Yes |
| mimetype | string | Yes |
| size | string | Yes |
| path | string | Yes |

---

### 5. Product `Management`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/products` | Create a new product | Bearer |
| `GET` | `/api/v1/products` | List all products (offset pagination) | Bearer |
| `GET` | `/api/v1/products/cursor` | List all products (cursor pagination) | Bearer |
| `GET` | `/api/v1/products/search` | Search products by name/description | Bearer |
| `GET` | `/api/v1/products/{id}` | Get a product by ID | Bearer |
| `PATCH` | `/api/v1/products/{id}` | Update a product | Bearer |
| `DELETE` | `/api/v1/products/{id}` | Delete product (soft delete) | Bearer |
| `POST` | `/api/v1/products/{productId}/features` | Create feature for product | Bearer |
| `GET` | `/api/v1/products/{productId}/features` | List features for product | Bearer |
``| `GET` | `/api/v1/products/{productId}/plans` | Load all plans for product | Bearer |
``| `GET` | `/api/v1/products/features/{id}` | Get feature by ID | Bearer |
| `PATCH` | `/api/v1/products/features/{id}` | Update a feature | Bearer |
| `DELETE` | `/api/v1/products/features/{id}` | Delete feature (soft delete) | Bearer |

**Create: CreateProductDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | |
| code | string | Yes | Unique product code |
| description | string | No | |
| version | string | No | |
| status | enum | No | `Draft`, `Active`, `Deprecated`, `Archived` |
| icon | string | No | |
| banner | string | No | |
| metadata | object | No | |
| features | array | No | Features to sync-create with product |

**Response: ProductDto**

| Field | Type | Required | Enum |
|-------|------|----------|------|
| id | string | Yes | |
| name | string | Yes | |
| code | string | Yes | |
| description | string | No | |
| version | string | No | |
| status | string | Yes | `Draft`, `Active`, `Deprecated`, `Archived` |
| icon | string | No | |
| banner | string | No | |
| metadata | object | No | |
| createdAt | date-time | Yes | |
| updatedAt | date-time | Yes | |

**Feature DTOs:**

| Field (CreateFeatureDto) | Type | Required | Enum |
|--------------------------|------|----------|------|
| name | string | Yes | |
| description | string | No | |
| type | enum | Yes | `Core`, `Premium`, `Beta`, `Addon` |
| status | enum | No | `Active`, `Inactive`, `Beta` |

---

### 6. Plan Management

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/plans` | Create a new plan | Bearer |
| `GET` | `/api/v1/plans` | List all plans (pagination + filters) | Bearer |
| `GET` | `/api/v1/plans/{id}` | Get plan by ID | Bearer |
| `PATCH` | `/api/v1/plans/{id}` | Update a plan | Bearer |
| `DELETE` | `/api/v1/plans/{id}` | Delete plan (soft delete + cascade) | Bearer |
| `POST` | `/api/v1/plans/{planId}/features` | Add feature to plan with limits | Bearer |
| `GET` | `/api/v1/plans/{planId}/features` | List features for plan | Bearer |
| `GET` | `/api/v1/plans/features/{id}` | Get plan feature by ID | Bearer |
| `PATCH` | `/api/v1/plans/features/{id}` | Update plan feature limits | Bearer |
| `DELETE` | `/api/v1/plans/features/{id}` | Remove feature from plan | Bearer |

**Create: CreatePlanDto**

| Field | Type | Required | Enum/Default |
|-------|------|----------|--------------|
| name | string | Yes | |
| code | string | Yes | |
| description | string | No | |
| tier | enum | Yes | `Free`, `Pro`, `Enterprise` |
| status | enum | No | `Draft`, `Active`, `Deprecated`, `Archived` |
| price | number | Yes | |
| currency | string | No | |
| billingPeriod | enum | No | `Monthly` |
| trialDays | number | No | |
| metadata | object | No | |

**Response: PlanDto**

| Field | Type | Required | Enum |
|-------|------|----------|------|
| id | string | Yes | |
| name | string | Yes | |
| code | string | Yes | |
| description | string | No | |
| tier | enum | Yes | `Free`, `Pro`, `Enterprise` |
| status | enum | Yes | `Draft`, `Active`, `Deprecated`, `Archived` |
| price | number | Yes | |
| currency | string | Yes | |
| billingPeriod | enum | Yes | `Monthly` |
| trialDays | number | Yes | |
| metadata | object | No | |
| createdAt | date-time | Yes | |
| updatedAt | date-time | Yes | |

**Plan Feature: CreatePlanFeatureDto**

| Field | Type | Required | Enum |
|-------|------|----------|------|
| featureId | uuid | Yes | |
| limitType | enum | Yes | `Numeric`, `Boolean`, `Tiered` |
| limitValue | number | No | |
| booleanValue | boolean | No | |
| tierLevel | enum | No | `Basic`, `Advanced`, `Full` |
| isUnlimited | boolean | No | |
| metadata | object | No | |

---

### 7. Quota Management

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/quotas/initialize` | Initialize quotas for user based on plan | Bearer |
| `GET` | `/api/v1/quotas/user/{userId}` | Get all quotas for a user | Bearer |
| `GET` | `/api/v1/quotas/check/{userId}/{featureId}` | Check quota availability | Bearer |
| `POST` | `/api/v1/quotas/increment` | Atomically check and increment usage | Bearer |
| `POST` | `/api/v1/quotas/reset/{userId}` | Manually reset quotas for user | Bearer |

**Initialize: InitializeQuotasDto**

| Field | Type | Required |
|-------|------|----------|
| userId | uuid | Yes |
| planId | uuid | Yes |

**Response: QuotaDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | |
| userId | string | Yes | |
| planId | string | Yes | |
| featureId | string | Yes | |
| currentUsage | number | Yes | |
| limitValue | number | No | |
| limitType | enum | Yes | `Numeric`, `Boolean`, `Tiered` |
| isUnlimited | boolean | Yes | |
| periodStart | date-time | Yes | |
| periodEnd | date-time | Yes | |
| remaining | number | No | Computed |
| percentUsed | number | Yes | Computed |

**Check: QuotaCheckDto**

| Field | Type | Required |
|-------|------|----------|
| allowed | boolean | Yes |
| remaining | number | No |
| limit | number | No |
| limitType | enum | Yes |
| isUnlimited | boolean | Yes |

**Increment: QuotaIncrementDto**

| Field | Type | Required |
|-------|------|----------|
| userId | uuid | Yes |
| featureId | uuid | Yes |
| amount | number | Yes |

---

### 8. Usage Tracking

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/usage` | Record a usage event | Bearer |
| `GET` | `/api/v1/usage/user/{userId}` | Get paginated usage history | Bearer |
| `GET` | `/api/v1/usage/summary/{userId}` | Get usage summary by feature/period | Bearer |

**Record: UsageIncrementDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | uuid | Yes | |
| featureId | uuid | Yes | |
| amount | number | Yes | |
| source | string | Yes | Source of usage event |
| metadata | object | No | |

---

### 9. Subscription Management

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/subscriptions` | Create a new subscription | Bearer |
| `GET` | `/api/v1/subscriptions` | List all subscriptions (pagination + filters) | Bearer |
| `GET` | `/api/v1/subscriptions/{id}` | Get subscription by ID | Bearer |
| `PATCH` | `/api/v1/subscriptions/{id}` | Update a subscription | Bearer |
| `GET` | `/api/v1/subscriptions/user/{userId}` | Get subscription by user ID | Bearer |
| `GET` | `/api/v1/subscriptions/available-by-product/{productCode}` | Find available subscription by product code | Bearer |

#### Lifecycle Management

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/subscriptions/{id}/activate` | Activate a subscription | Bearer |
| `POST` | `/api/v1/subscriptions/{id}/pause` | Pause a subscription | Bearer |
| `POST` | `/api/v1/subscriptions/{id}/resume` | Resume a paused subscription | Bearer |
| `POST` | `/api/v1/subscriptions/{id}/cancel` | Cancel a subscription | Bearer |
| `GET` | `/api/v1/subscriptions/{id}/history` | Get state transition history | Bearer |

#### Plan Changes & Proration

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/subscriptions/{id}/change-plan` | Change subscription plan | Bearer |
| `GET` | `/api/v1/subscriptions/{id}/preview-change/{newPlanId}` | Preview proration calculation | Bearer |
| `DELETE` | `/api/v1/subscriptions/{id}/pending-change` | Cancel pending plan change | Bearer |
| `GET` | `/api/v1/subscriptions/{id}/proration-history` | Get proration history | Bearer |

#### Trial Management

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/subscriptions/{id}/extend-trial` | Extend trial period | Bearer |
| `POST` | `/api/v1/subscriptions/{id}/convert-trial` | Convert trial to active subscription | Bearer |

#### License Activation (Device Management)

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/subscriptions/activate` | Activate license on device | Bearer |
| `POST` | `/api/v1/subscriptions/{id}/deactivate` | Deactivate device (24h cooldown) | Bearer |
| `GET` | `/api/v1/subscriptions/{id}/activation-status` | Get activation status with device history | Bearer |
| `POST` | `/api/v1/subscriptions/validate` | Validate activation (no auth required) | **None** |

**Create: CreateSubscriptionDto**

| Field | Type | Required |
|-------|------|----------|
| userId | uuid | Yes |
| planId | uuid | Yes |
| externalId | string | No |
| metadata | object | No |

**Response: SubscriptionDto**

| Field | Type | Required | Enum/Description |
|-------|------|----------|------------------|
| id | string | Yes | |
| userId | string | Yes | |
| planId | string | Yes | |
| plan | PlanDto | No | Populated plan object |
| state | enum | Yes | `Trial`, `Active`, `PastDue`, `Paused`, `Canceled`, `Expired` |
| currentPeriodStart | date-time | Yes | |
| currentPeriodEnd | date-time | Yes | |
| trialEndDate | date-time | No | |
| canceledAt | date-time | No | |
| cancelAtPeriodEnd | boolean | Yes | |
| pausedAt | date-time | No | |
| pauseResumeDate | date-time | No | |
| pendingPlanId | string | No | |
| pendingPlan | PlanDto | No | |
| pendingChangeDate | date-time | No | |
| externalId | string | No | External billing provider ID |
| metadata | object | No | |
| createdAt | date-time | Yes | |
| updatedAt | date-time | Yes | |

**Subscription State Machine:**

```
  Trial ──────► Active ──────► PastDue
    │              │               │
    │              ▼               │
    │           Paused ────────────┤
    │              │               │
    │              ▼               ▼
    └──────► Canceled ◄──────── Expired
```

**License Activation:**

| DTO | Field | Type | Required |
|-----|-------|------|----------|
| ActivateLicenseDto | fingerprint | string | Yes |
| | deviceName | string | No |
| ValidateActivationDto | fingerprint | string | Yes |

**Validation Error Codes:**

| Code | Description |
|------|-------------|
| `INVALID_LICENSE` | License key is invalid |
| `ALREADY_ACTIVATED` | License already activated on another device |
| `SUBSCRIPTION_INACTIVE` | Subscription is not active |
| `WRONG_DEVICE` | Device mismatch |
| `FINGERPRINT_MISMATCH` | Fingerprint does not match |
| `TRANSFER_COOLDOWN` | Device transfer cooldown period (24h) |
| `INVALID_SIGNATURE` | Crypto signature invalid |
| `EXPIRED_TIMESTAMP` | Timestamp expired |
| `DECRYPTION_FAILED` | Decryption failed |
| `INVALID_IV` | Invalid initialization vector |
| `INVALID_AUTH_TAG` | Invalid auth tag |
| `INVALID_ENCRYPTION_FORMAT` | Invalid encryption format |
| `MISSING_CRYPTO_HEADER` | Missing crypto header |

---

### 10. Webhooks

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| `POST` | `/api/v1/webhooks/subscriptions/{provider}` | Receive webhook events from billing provider | None |

---

## Auth Endpoints (Better Auth)

> Base path: `/api/auth` | Spec version: Better Auth 1.1.0

### Sign In / Sign Up

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/sign-up/email` | Sign up with email and password |
| `POST` | `/api/auth/sign-in/email` | Sign in with email and password |
| `POST` | `/api/auth/sign-in/username` | Sign in with username |
| `POST` | `/api/auth/sign-in/social` | Sign in with social provider |
| `POST` | `/api/auth/sign-in/magic-link` | Sign in with magic link |
| `GET` | `/api/auth/magic-link/verify` | Verify magic link |

### Session Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/get-session` | Get current session |
| `GET` | `/api/auth/list-sessions` | List all active sessions |
| `POST` | `/api/auth/revoke-session` | Revoke a single session |
| `POST` | `/api/auth/revoke-sessions` | Revoke all sessions |
| `POST` | `/api/auth/revoke-other-sessions` | Revoke all other sessions |
| `POST` | `/api/auth/sign-out` | Sign out current user |

### Token Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/token` | Get a JWT token |
| `POST` | `/api/auth/refresh-token` | Refresh access token |
| `GET` | `/api/auth/jwks` | Get JSON Web Key Set |

### User Management

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/update-user` | Update current user |
| `POST` | `/api/auth/change-email` | Change email |
| `POST` | `/api/auth/change-password` | Change password |
| `POST` | `/api/auth/delete-user` | Delete user |
| `GET` | `/api/auth/delete-user/callback` | Complete deletion with verification |

### Password Reset

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/forget-password` | Send password reset email |
| `POST` | `/api/auth/reset-password` | Reset password |
| `GET` | `/api/auth/reset-password/{token}` | Redirect with reset token |

### Email Verification

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/send-verification-email` | Send verification email |
| `GET` | `/api/auth/verify-email` | Verify email |

### Two-Factor Authentication (2FA)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/two-factor/enable` | Enable 2FA (generates TOTP URI + backup codes) |
| `POST` | `/api/auth/two-factor/disable` | Disable 2FA |
| `POST` | `/api/auth/two-factor/get-totp-uri` | Get TOTP URI |
| `POST` | `/api/auth/two-factor/verify-totp` | Verify TOTP code |
| `POST` | `/api/auth/two-factor/send-otp` | Send OTP to user |
| `POST` | `/api/auth/two-factor/verify-otp` | Verify OTP |
| `POST` | `/api/auth/two-factor/verify-backup-code` | Verify backup code |
| `POST` | `/api/auth/two-factor/generate-backup-codes` | Generate new backup codes |

### Passkey (WebAuthn)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/passkey/generate-register-options` | Generate registration options |
| `POST` | `/api/auth/passkey/verify-registration` | Verify passkey registration |
| `POST` | `/api/auth/passkey/generate-authenticate-options` | Generate authentication options |
| `POST` | `/api/auth/passkey/verify-authentication` | Verify passkey authentication |
| `GET` | `/api/auth/passkey/list-user-passkeys` | List user's passkeys |
| `POST` | `/api/auth/passkey/update-passkey` | Update passkey name |
| `POST` | `/api/auth/passkey/delete-passkey` | Delete passkey |

### Account Linking

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/link-social` | Link social account |
| `POST` | `/api/auth/unlink-account` | Unlink account |
| `GET` | `/api/auth/list-accounts` | List linked accounts |

### Misc

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/ok` | Health check |
| `GET` | `/api/auth/error` | Error page |

### Auth Schemas

| Schema | Fields |
|--------|--------|
| **User** | id, name, email, emailVerified, image, createdAt, updatedAt, username, displayUsername, twoFactorEnabled |
| **Account** | id, accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt |
| **Verification** | id, identifier, value, expiresAt, createdAt, updatedAt |
| **TwoFactor** | id, secret, backupCodes, userId |
| **Passkey** | id, name, publicKey, userId, credentialID, counter, deviceType, backedUp, transports, createdAt |
| **Jwks** | id, publicKey, privateKey, createdAt |

---

## Data Schemas

### Enums Summary

| Enum | Values | Used In |
|------|--------|---------|
| **UserRole** | `User`, `Admin` | UserDto |
| **ProductStatus** | `Draft`, `Active`, `Deprecated`, `Archived` | ProductDto, PlanDto |
| **FeatureType** | `Core`, `Premium`, `Beta`, `Addon` | FeatureDto |
| **FeatureStatus** | `Active`, `Inactive`, `Beta` | FeatureDto |
| **PlanTier** | `Free`, `Pro`, `Enterprise` | PlanDto |
| **BillingPeriod** | `Monthly` | PlanDto |
| **LimitType** | `Numeric`, `Boolean`, `Tiered` | PlanFeatureDto, QuotaDto |
| **TierLevel** | `Basic`, `Advanced`, `Full` | PlanFeatureDto |
| **SubscriptionState** | `Trial`, `Active`, `PastDue`, `Paused`, `Canceled`, `Expired` | SubscriptionDto |
| **ChangePlanTiming** | `Immediate`, `EndOfPeriod` | ChangePlanDto |

### Key DTOs

#### ProrationPreviewDto

| Field | Type | Description |
|-------|------|-------------|
| currentPlan | PlanDto | Current plan details |
| newPlan | PlanDto | Target plan details |
| daysRemaining | number | Days left in current period |
| totalDays | number | Total days in period |
| creditAmount | number | Credit from unused current plan |
| chargeAmount | number | Charge for new plan |
| netAmount | number | Net amount (charge - credit) |
| effectiveDate | date-time | When change takes effect |
| quotaChanges | QuotaChangeDto[] | Per-feature quota adjustments |

#### PlanChangeResultDto

| Field | Type | Description |
|-------|------|-------------|
| subscription | SubscriptionDto | Updated subscription |
| proration | ProrationRecordDto | Proration record (if applicable) |
| quotasUpdated | boolean | Whether quotas were adjusted |
| effectiveDate | date-time | When change is effective |

#### ActivationStatusDto

| Field | Type | Description |
|-------|------|-------------|
| isActivated | boolean | Whether license is activated |
| currentDevice | DeviceDto | Current active device |
| deviceHistory | array | Historical devices |
| canTransfer | boolean | Whether device transfer is allowed |
| nextTransferAt | date-time | Next available transfer time |

---

## Pagination

The API supports two pagination strategies:

### Offset Pagination

```
GET /api/v1/products?page=1&limit=20
```

**Response wrapper: OffsetPaginationDto**

| Field | Type | Description |
|-------|------|-------------|
| limit | number | Items per page |
| currentPage | number | Current page number |
| nextPage | number | Next page number |
| previousPage | number | Previous page number |
| totalRecords | number | Total items count |
| totalPages | number | Total pages count |

### Cursor Pagination

```
GET /api/v1/products/cursor?limit=20&afterCursor=<cursor>
```

**Response wrapper: CursorPaginationDto**

| Field | Type | Description |
|-------|------|-------------|
| limit | number | Items per page |
| afterCursor | string | Cursor for next page |
| beforeCursor | string | Cursor for previous page |
| totalRecords | number | Total items count |

---

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "code": "invalid_type",
      "message": "Expected string, received number",
      "property": "name"
    }
  ]
}
```

### Standard HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | OK - Successful request |
| `201` | Created - Resource created successfully |
| `400` | Bad Request - Validation error |
| `401` | Unauthorized - Missing or invalid token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource not found |
| `409` | Conflict - Resource already exists |
| `500` | Internal Server Error |

---

## All 58 DTO Schemas

<details>
<summary>Click to expand full schema list</summary>

| # | Schema | Purpose |
|---|--------|---------|
| 1 | ErrorDetailDto | Error detail item |
| 2 | ErrorDto | Standard error response |
| 3 | DeviceDto | Device information |
| 4 | HealthCheckDto | Health check response |
| 5 | UserDto | User information |
| 6 | OffsetPaginationDto | Offset pagination metadata |
| 7 | OffsetPaginatedUserDto | Paginated user list |
| 8 | CursorPaginationDto | Cursor pagination metadata |
| 9 | CursorPaginatedUserDto | Cursor-paginated user list |
| 10 | UpdateUserProfileDto | Update user profile input |
| 11 | FileDto | Uploaded file info |
| 12 | CreateFeatureDto | Create feature input |
| 13 | CreateProductDto | Create product input |
| 14 | ProductDto | Product response |
| 15 | OffsetPaginatedProductDto | Paginated product list |
| 16 | CursorPaginatedProductDto | Cursor-paginated product list |
| 17 | FeatureDto | Feature response |
| 18 | UpdateFeatureDto | Update feature input |
| 19 | SyncFeatureDto | Sync feature input |
| 20 | UpdateProductDto | Update product input |
| 21 | OffsetPaginatedFeatureDto | Paginated feature list |
| 22 | FeatureInfoDto | Minimal feature info |
| 23 | PlanFeatureMinimalDto | Minimal plan-feature info |
| 24 | PlanWithFeaturesDto | Plan with resolved features |
| 25 | ProductPlansDto | Product with its plans |
| 26 | CreatePlanDto | Create plan input |
| 27 | PlanDto | Plan response |
| 28 | OffsetPaginatedPlanDto | Paginated plan list |
| 29 | PlanFeatureDto | Plan feature response |
| 30 | UpdatePlanFeatureDto | Update plan feature input |
| 31 | UpdatePlanDto | Update plan input |
| 32 | CreatePlanFeatureDto | Add feature to plan input |
| 33 | InitializeQuotasDto | Initialize quotas input |
| 34 | QuotaDto | Quota response |
| 35 | QuotaCheckDto | Quota check result |
| 36 | QuotaIncrementDto | Quota increment input |
| 37 | QuotaIncrementResultDto | Quota increment result |
| 38 | UsageIncrementDto | Usage record input |
| 39 | UsageRecordDto | Usage record response |
| 40 | UsageSummaryDto | Usage summary response |
| 41 | SubscriptionDto | Subscription response |
| 42 | CreateSubscriptionDto | Create subscription input |
| 43 | OffsetPaginatedSubscriptionDto | Paginated subscription list |
| 44 | UpdateSubscriptionDto | Update subscription input |
| 45 | PauseSubscriptionDto | Pause subscription input |
| 46 | CancelSubscriptionDto | Cancel subscription input |
| 47 | ChangePlanDto | Change plan input |
| 48 | ProrationRecordDto | Proration record |
| 49 | PlanChangeResultDto | Plan change result |
| 50 | QuotaChangeDto | Quota change per feature |
| 51 | ProrationPreviewDto | Proration preview |
| 52 | ExtendTrialDto | Extend trial input |
| 53 | ActivateLicenseDto | License activation input |
| 54 | ActivationResultDto | Activation result |
| 55 | ActivationStatusDto | Activation status |
| 56 | ValidateActivationDto | Validate activation input |
| 57 | ValidationResultDto | Validation result |
| 58 | WebhookReceivedDto | Webhook payload |

</details>
