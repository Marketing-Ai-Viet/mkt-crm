# Client Login Flow Investigation Report

> **Report Date**: 2026-02-03
> **Target Operations**: `CheckUserExists`, `GetLoginTokenFromCredentials`, `GetAuthTokensFromLoginToken`

## Table of Contents

1. [Overview](#overview)
2. [Single-Endpoint Login (NEW)](#single-endpoint-login-new)
3. [Authentication Flow Diagram](#authentication-flow-diagram)
4. [GraphQL Operations](#graphql-operations)
5. [Backend Implementation](#backend-implementation)
6. [Service Layer](#service-layer)
7. [Token Types & Configuration](#token-types--configuration)
8. [Security Features](#security-features)
9. [Key Files Reference](#key-files-reference)

---

## Overview

Khi client đăng nhập, authentication flow được thực hiện qua 3 bước tuần tự:

| Step | Operation | Purpose |
|------|-----------|---------|
| 1 | `CheckUserExists` | Kiểm tra user tồn tại và trạng thái email verification |
| 2 | `GetLoginTokenFromCredentials` | Xác thực email/password, nhận login token tạm thời |
| 3 | `GetAuthTokensFromLoginToken` | Đổi login token lấy access token + refresh token |

---

## Single-Endpoint Login (NEW)

> **Mutation**: `loginWithCredentials`
> **File**: `packages/twenty-server/src/engine/core-modules/auth/auth.resolver.ts`

### GraphQL Mutation

```graphql
mutation LoginWithCredentials(
  $email: String!
  $password: String!
  $captchaToken: String
  $origin: String!
) {
  loginWithCredentials(
    email: $email
    password: $password
    captchaToken: $captchaToken
    origin: $origin
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

### Flow Diagram

```
Frontend                          Backend
   │                                 │
   │── loginWithCredentials ────────→│
   │   (email, password, origin)     │
   │                                 │ ● CaptchaGuard validates
   │                                 │ ● Validate password regex
   │                                 │ ● Get workspace by origin
   │                                 │ ● Validate credentials (bcrypt)
   │                                 │ ● Check email verified
   │                                 │ ● Check 2FA requirement
   │                                 │ ● Generate ACCESS token (30min)
   │                                 │ ● Generate REFRESH token (60d)
   │ ←─ { accessToken, refreshToken }│
   │                                 │
   │ ● Store tokens                  │
   │ ● Redirect to workspace         │
   └─────────────────────────────────┘
```

### So sánh với 3-step flow

| Feature | `loginWithCredentials` (1-step) | 3-step flow |
|---------|--------------------------------|-------------|
| Số requests | 1 | 2-3 |
| Hỗ trợ 2FA | ❌ Throw exception nếu 2FA required | ✅ Full support |
| Multi-workspace | ❌ Cần biết workspace từ origin | ✅ Có thể chọn workspace |
| Độ phức tạp client | Đơn giản | Phức tạp hơn |
| Security | Tương đương | Tương đương |

### Khi nào dùng

**Dùng `loginWithCredentials` khi:**
- Workspace không bật 2FA
- Client đã biết workspace (single-tenant)
- Cần tích hợp đơn giản (API, mobile app)

**Dùng 3-step flow khi:**
- Cần hỗ trợ 2FA
- User có thể thuộc nhiều workspaces
- Cần UX phức tạp (chọn workspace sau login)

### Example Response

```json
{
  "data": {
    "loginWithCredentials": {
      "tokens": {
        "accessToken": {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "expiresAt": "2026-02-03T11:30:00.000Z"
        },
        "refreshToken": {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "expiresAt": "2026-04-04T11:00:00.000Z"
        }
      }
    }
  }
}
```

### Error Cases

| Error | Condition |
|-------|-----------|
| `Password is too weak` | Password không match regex |
| `Workspace not found` | Origin không map được workspace |
| `User not found` | Email không tồn tại |
| `Wrong password` | Password không đúng |
| `Email is not verified` | Email chưa verify (nếu required) |
| `TWO_FACTOR_AUTHENTICATION_REQUIRED` | Workspace yêu cầu 2FA |

---

## Authentication Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LOGIN FLOW                                   │
└────────────────────────────────────────────────────────────────────────────┘

Frontend                          Backend                         Database
   │                                 │                                │
   │──── CheckUserExists ──────────→ │                                │
   │     (email, captchaToken)       │──── query user by email ─────→ │
   │                                 │ ←─── user record ─────────────│
   │ ←── { exists, isEmailVerified } │                                │
   │                                 │                                │
   ├─────────────────────────────────┼────────────────────────────────┤
   │                                 │                                │
   │── GetLoginTokenFromCredentials→ │                                │
   │   (email, password, origin)     │                                │
   │                                 │ ● CaptchaGuard validates       │
   │                                 │ ● Validate password regex      │
   │                                 │ ● Get workspace by origin      │
   │                                 │──── find user ────────────────→│
   │                                 │ ←── user with passwordHash ───│
   │                                 │ ● bcrypt.compare(password)     │
   │                                 │ ● Check email verified         │
   │                                 │ ● Generate LOGIN JWT (15min)   │
   │ ←───── { loginToken } ─────────│                                │
   │                                 │                                │
   ├─────────────────────────────────┼────────────────────────────────┤
   │                                 │                                │
   │── GetAuthTokensFromLoginToken →│                                │
   │   (loginToken, origin)          │                                │
   │                                 │ ● Verify loginToken JWT        │
   │                                 │ ● Validate workspace match     │
   │                                 │──── get userWorkspace ────────→│
   │                                 │ ←─ userWorkspace record ──────│
   │                                 │ ● Check 2FA requirement        │
   │                                 │ ● Generate ACCESS JWT (30min)  │
   │                                 │ ● Generate REFRESH JWT (60d)   │
   │                                 │──── save refreshToken ────────→│
   │                                 │ ←─ AppToken saved ────────────│
   │ ←─ { accessToken, refreshToken }│                                │
   │                                 │                                │
   │ ● Store tokens in cookie        │                                │
   │ ● Load current user             │                                │
   │ ● Redirect to workspace         │                                │
   └─────────────────────────────────┴────────────────────────────────┘
```

---

## GraphQL Operations

### 1. CheckUserExists Query

**Frontend Definition**: `packages/twenty-front/src/modules/auth/graphql/queries/checkUserExists.ts`

```graphql
query CheckUserExists($email: String!, $captchaToken: String) {
  checkUserExists(email: $email, captchaToken: $captchaToken) {
    exists
    availableWorkspacesCount
    isEmailVerified
  }
}
```

**Response Type**:
```typescript
type CheckUserExistOutput = {
  exists: boolean;
  availableWorkspacesCount: number;
  isEmailVerified: boolean;
};
```

---

### 2. GetLoginTokenFromCredentials Mutation

**Frontend Definition**: `packages/twenty-front/src/modules/auth/graphql/mutations/getLoginTokenFromCredentials.ts`

```graphql
mutation GetLoginTokenFromCredentials(
  $email: String!
  $password: String!
  $captchaToken: String
  $origin: String!
) {
  getLoginTokenFromCredentials(
    email: $email
    password: $password
    captchaToken: $captchaToken
    origin: $origin
  ) {
    loginToken {
      ...AuthTokenFragment
    }
  }
}

fragment AuthTokenFragment on AuthToken {
  token
  expiresAt
}
```

**Input Type**:
```typescript
type UserCredentialsInput = {
  email: string;       // @IsEmail
  password: string;    // Must match PASSWORD_REGEX
  captchaToken?: string;
};
```

**Password Requirements** (PASSWORD_REGEX):
- 8-16 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

---

### 3. GetAuthTokensFromLoginToken Mutation

**Frontend Definition**: `packages/twenty-front/src/modules/auth/graphql/mutations/getAuthTokensFromLoginToken.ts`

```graphql
mutation GetAuthTokensFromLoginToken($loginToken: String!, $origin: String!) {
  getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) {
    tokens {
      ...AuthTokensFragment
    }
  }
}

fragment AuthTokensFragment on AuthTokenPair {
  accessToken {
    ...AuthTokenFragment
  }
  refreshToken {
    ...AuthTokenFragment
  }
}
```

**Response Type**:
```typescript
type AuthTokens = {
  tokens: {
    accessToken: AuthToken;
    refreshToken: AuthToken;
  };
};

type AuthToken = {
  token: string;
  expiresAt: Date;
};
```

---

## Backend Implementation

### Auth Resolver

**File**: `packages/twenty-server/src/engine/core-modules/auth/auth.resolver.ts`

#### CheckUserExists Handler (Lines 119-127)

```typescript
@UseGuards(CaptchaGuard, PublicEndpointGuard)
@Query(() => CheckUserExistOutput)
async checkUserExists(
  @Args() checkUserExistsInput: EmailAndCaptchaInput,
): Promise<CheckUserExistOutput> {
  return await this.authService.checkUserExists(
    checkUserExistsInput.email.toLowerCase(),
  );
}
```

**Guards Applied**:
- `CaptchaGuard` - Validates captcha token
- `PublicEndpointGuard` - Marks endpoint as public

---

#### GetLoginTokenFromCredentials Handler (Lines 160-204)

```typescript
@Mutation(() => LoginToken)
@UseGuards(CaptchaGuard, PublicEndpointGuard)
async getLoginTokenFromCredentials(
  @Args() getLoginTokenFromCredentialsInput: UserCredentialsInput,
  @Args('origin') origin: string,
): Promise<LoginToken> {
  // 1. Validate password format
  const isPasswordValid = PASSWORD_REGEX.test(
    getLoginTokenFromCredentialsInput.password,
  );
  if (!isPasswordValid) {
    throw new AuthException('Password is too weak', AuthExceptionCode.INVALID_INPUT);
  }

  // 2. Get workspace by origin
  const workspace = await this.domainManagerService
    .getWorkspaceByOriginOrDefaultWorkspace(origin);

  // 3. Validate credentials
  const user = await this.authService.validateLoginWithPassword(
    getLoginTokenFromCredentialsInput,
    workspace,
  );

  // 4. Generate login token
  const loginToken = await this.loginTokenService.generateLoginToken(
    user.email,
    workspace.id,
    AuthProviderEnum.Password,
  );

  return { loginToken };
}
```

---

#### GetAuthTokensFromLoginToken Handler (Lines 493-535)

```typescript
@Mutation(() => AuthTokens)
@UseGuards(PublicEndpointGuard)
async getAuthTokensFromLoginToken(
  @Args() getAuthTokensFromLoginTokenInput: GetAuthTokensFromLoginTokenInput,
  @Args('origin') origin: string,
): Promise<AuthTokens> {
  // 1. Verify and decode login token
  const { sub: email, workspaceId, authProvider } =
    await this.loginTokenService.verifyLoginToken(
      getAuthTokensFromLoginTokenInput.loginToken,
    );

  // 2. Validate workspace
  const workspace = await this.domainManagerService
    .getWorkspaceByOriginOrDefaultWorkspace(origin);

  if (workspaceId !== workspace.id) {
    throw new AuthException(
      'Token is not valid for this workspace',
      AuthExceptionCode.FORBIDDEN_EXCEPTION,
    );
  }

  // 3. Get user and workspace membership
  const user = await this.userService.getUserByEmail(email);
  const currentUserWorkspace = await this.userWorkspaceService
    .getUserWorkspaceForUserOrThrow({ userId: user.id, workspaceId });

  // 4. Check 2FA requirement
  await this.twoFactorAuthenticationService
    .validateTwoFactorAuthenticationRequirement(
      workspace,
      currentUserWorkspace.twoFactorAuthenticationMethods,
    );

  // 5. Generate access + refresh tokens
  return await this.authService.verify(email, workspace.id, authProvider);
}
```

---

## Service Layer

### AuthService

**File**: `packages/twenty-server/src/engine/core-modules/auth/services/auth.service.ts`

#### checkUserExists()

```typescript
async checkUserExists(email: string): Promise<CheckUserExistOutput> {
  const user = await this.userRepository.findOneBy({ email });
  const isUserExist = userValidator.isDefined(user);

  return {
    exists: isUserExist,
    availableWorkspacesCount: await this.countAvailableWorkspacesByEmail(email),
    isEmailVerified: isUserExist ? user.isEmailVerified : false,
  };
}
```

#### validateLoginWithPassword()

```typescript
async validateLoginWithPassword(
  input: UserCredentialsInput,
  targetWorkspace?: Workspace,
) {
  // Check password auth enabled for workspace
  if (targetWorkspace && !targetWorkspace.isPasswordAuthEnabled) {
    throw new AuthException(
      'Password authentication is not enabled for this workspace',
      AuthExceptionCode.FORBIDDEN_EXCEPTION,
    );
  }

  // Find user
  const user = await this.userRepository.findOne({
    where: { email: input.email },
    relations: { userWorkspaces: true },
  });

  if (!user) {
    throw new AuthException('User not found', AuthExceptionCode.USER_NOT_FOUND);
  }

  // Check password hash exists
  if (!user.passwordHash) {
    throw new AuthException(
      'Incorrect login method',
      AuthExceptionCode.INVALID_INPUT,
    );
  }

  // Compare password with bcrypt
  const isValid = await compareHash(input.password, user.passwordHash);
  if (!isValid) {
    throw new AuthException('Wrong password', AuthExceptionCode.FORBIDDEN_EXCEPTION);
  }

  // Check email verification if required
  const isEmailVerificationRequired = this.twentyConfigService.get(
    'IS_EMAIL_VERIFICATION_REQUIRED',
  );
  if (isEmailVerificationRequired && !user.isEmailVerified) {
    throw new AuthException(
      'Email is not verified',
      AuthExceptionCode.EMAIL_NOT_VERIFIED,
    );
  }

  return user;
}
```

#### verify() - Generate Auth Tokens

```typescript
async verify(
  email: string,
  workspaceId: string,
  authProvider?: AuthProviderEnum,
): Promise<AuthTokens> {
  const user = await this.userRepository.findOne({ where: { email } });

  // Generate access token
  const accessToken = await this.accessTokenService.generateAccessToken({
    userId: user.id,
    workspaceId,
    authProvider,
  });

  // Generate refresh token
  const refreshToken = await this.refreshTokenService.generateRefreshToken({
    userId: user.id,
    workspaceId,
    authProvider,
    targetedTokenType: JwtTokenTypeEnum.ACCESS,
  });

  return {
    tokens: { accessToken, refreshToken },
  };
}
```

---

### LoginTokenService

**File**: `packages/twenty-server/src/engine/core-modules/auth/token/services/login-token.service.ts`

```typescript
async generateLoginToken(
  email: string,
  workspaceId: string,
  authProvider?: AuthProviderEnum,
): Promise<AuthToken> {
  const jwtPayload: LoginTokenJwtPayload = {
    type: JwtTokenTypeEnum.LOGIN,
    sub: email,
    workspaceId,
    authProvider,
  };

  const secret = this.jwtWrapperService.generateAppSecret(
    jwtPayload.type,
    workspaceId,
  );

  const expiresIn = this.twentyConfigService.get('LOGIN_TOKEN_EXPIRES_IN');
  const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));

  return {
    token: this.jwtWrapperService.sign(jwtPayload, { secret, expiresIn }),
    expiresAt,
  };
}

async verifyLoginToken(loginToken: string): Promise<LoginTokenJwtPayload> {
  await this.jwtWrapperService.verifyJwtToken(loginToken, JwtTokenTypeEnum.LOGIN);
  return this.jwtWrapperService.decode(loginToken, { json: true });
}
```

---

### AccessTokenService

**File**: `packages/twenty-server/src/engine/core-modules/auth/token/services/access-token.service.ts`

```typescript
async generateAccessToken({
  userId,
  workspaceId,
  authProvider,
}): Promise<AuthToken> {
  const expiresIn = this.twentyConfigService.get('ACCESS_TOKEN_EXPIRES_IN');
  const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));

  const user = await this.userRepository.findOne({ where: { id: userId } });
  const workspace = await this.workspaceRepository.findOne({
    where: { id: workspaceId },
  });

  // Get workspace member ID
  let tokenWorkspaceMemberId: string | undefined;
  if (isWorkspaceActiveOrSuspended(workspace)) {
    const workspaceMember = await workspaceMemberRepository.findOne({
      where: { userId: user.id },
    });
    tokenWorkspaceMemberId = workspaceMember?.id;
  }

  const userWorkspace = await this.userWorkspaceRepository.findOne({
    where: { userId: user.id, workspaceId },
  });

  const jwtPayload: AccessTokenJwtPayload = {
    sub: user.id,
    userId: user.id,
    workspaceId,
    workspaceMemberId: tokenWorkspaceMemberId,
    userWorkspaceId: userWorkspace.id,
    type: JwtTokenTypeEnum.ACCESS,
    authProvider,
  };

  return {
    token: this.jwtWrapperService.sign(jwtPayload, {
      secret: this.jwtWrapperService.generateAppSecret(
        JwtTokenTypeEnum.ACCESS,
        workspaceId,
      ),
      expiresIn,
    }),
    expiresAt,
  };
}
```

---

### RefreshTokenService

**File**: `packages/twenty-server/src/engine/core-modules/auth/token/services/refresh-token.service.ts`

```typescript
async generateRefreshToken(
  payload: Omit<RefreshTokenJwtPayload, 'type' | 'sub' | 'jti'>,
): Promise<AuthToken> {
  const expiresIn = this.twentyConfigService.get('REFRESH_TOKEN_EXPIRES_IN');
  const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));

  // Store refresh token in database for revocation tracking
  const refreshToken = this.appTokenRepository.create({
    ...payload,
    expiresAt,
    type: AppTokenType.RefreshToken,
  });
  await this.appTokenRepository.save(refreshToken);

  const secret = this.jwtWrapperService.generateAppSecret(
    JwtTokenTypeEnum.REFRESH,
    payload.workspaceId ?? payload.userId,
  );

  return {
    token: this.jwtWrapperService.sign(
      {
        ...payload,
        sub: payload.userId,
        type: JwtTokenTypeEnum.REFRESH,
      },
      { secret, expiresIn, jwtid: refreshToken.id },
    ),
    expiresAt,
  };
}
```

---

## Token Types & Configuration

### JWT Token Types

```typescript
enum JwtTokenTypeEnum {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  LOGIN = 'LOGIN',
  WORKSPACE_AGNOSTIC = 'WORKSPACE_AGNOSTIC',
  FILE = 'FILE',
  API_KEY = 'API_KEY',
  POSTGRES_PROXY = 'POSTGRES_PROXY',
  REMOTE_SERVER = 'REMOTE_SERVER',
  KEY_ENCRYPTION_KEY = 'KEY_ENCRYPTION_KEY',
}
```

### Token Payload Structures

| Token Type | Payload Fields |
|------------|----------------|
| **LOGIN** | `type`, `sub` (email), `workspaceId`, `authProvider` |
| **ACCESS** | `type`, `sub`, `userId`, `workspaceId`, `workspaceMemberId`, `userWorkspaceId`, `authProvider` |
| **REFRESH** | `type`, `sub`, `userId`, `workspaceId`, `jti`, `authProvider`, `targetedTokenType` |

### Token Expiration Configuration

| Token | Duration | Config Variable |
|-------|----------|-----------------|
| Login Token | **15 minutes** | `LOGIN_TOKEN_EXPIRES_IN` |
| Access Token | **30 minutes** | `ACCESS_TOKEN_EXPIRES_IN` |
| Refresh Token | **60 days** | `REFRESH_TOKEN_EXPIRES_IN` |

### JWT Secret Generation

**File**: `packages/twenty-server/src/engine/core-modules/jwt/services/jwt-wrapper.service.ts`

```typescript
generateAppSecret(type: JwtTokenTypeEnum, appSecretBody: string): string {
  const appSecret = this.twentyConfigService.get('APP_SECRET');

  return createHash('sha256')
    .update(`${appSecret}${appSecretBody}${type}`)
    .digest('hex');
}
```

**Secret Components**:
- `APP_SECRET` - Environment variable (master secret)
- `appSecretBody` - workspaceId hoặc userId
- `type` - JwtTokenTypeEnum

---

## Security Features

### Password Security

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt với 10 salt rounds |
| Password Validation | Regex: 8-16 chars, upper, lower, number, special char |
| Password Storage | Chỉ lưu hash, không bao giờ lưu plaintext |

### Token Security

| Feature | Implementation |
|---------|----------------|
| Per-workspace secrets | SHA256(APP_SECRET + workspaceId + tokenType) |
| Short-lived login token | 15 minutes |
| Refresh token in DB | Có thể revoke bất kỳ lúc nào |
| Suspicious activity detection | Phát hiện reuse revoked token → revoke all tokens |

### Request Security

| Feature | Implementation |
|---------|----------------|
| Captcha validation | CaptchaGuard trên public endpoints |
| Email verification | Configurable requirement |
| 2FA support | TOTP-based authentication |
| Workspace origin validation | Kiểm tra token thuộc đúng workspace |

### Suspicious Activity Detection (Refresh Token)

```typescript
// Nếu token đã bị revoke và vượt quá cooldown period
if (token.revokedAt && token.revokedAt.getTime() <= Date.now() - ms(coolDown)) {
  // Revoke TẤT CẢ tokens của user
  await Promise.all(
    user.appTokens.map(async ({ id, type }) => {
      if (type === AppTokenType.RefreshToken) {
        await this.appTokenRepository.update({ id }, { revokedAt: new Date() });
      }
    }),
  );

  throw new AuthException(
    'Suspicious activity detected, this refresh token has been revoked. All tokens have been revoked.',
    AuthExceptionCode.FORBIDDEN_EXCEPTION,
  );
}
```

---

## Key Files Reference

### Frontend

| File | Purpose |
|------|---------|
| `packages/twenty-front/src/modules/auth/graphql/queries/checkUserExists.ts` | CheckUserExists query |
| `packages/twenty-front/src/modules/auth/graphql/mutations/getLoginTokenFromCredentials.ts` | GetLoginTokenFromCredentials mutation |
| `packages/twenty-front/src/modules/auth/graphql/mutations/getAuthTokensFromLoginToken.ts` | GetAuthTokensFromLoginToken mutation |
| `packages/twenty-front/src/modules/auth/graphql/fragments/authFragments.ts` | Shared auth fragments |
| `packages/twenty-front/src/modules/auth/hooks/useAuth.ts` | Auth hook với token management |
| `packages/twenty-front/src/modules/auth/hooks/useVerifyLogin.ts` | Login verification hook |

### Backend

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/engine/core-modules/auth/auth.resolver.ts` | GraphQL resolvers |
| `packages/twenty-server/src/engine/core-modules/auth/services/auth.service.ts` | Core auth logic |
| `packages/twenty-server/src/engine/core-modules/auth/token/services/login-token.service.ts` | Login token generation/verification |
| `packages/twenty-server/src/engine/core-modules/auth/token/services/access-token.service.ts` | Access token generation |
| `packages/twenty-server/src/engine/core-modules/auth/token/services/refresh-token.service.ts` | Refresh token generation/verification |
| `packages/twenty-server/src/engine/core-modules/jwt/services/jwt-wrapper.service.ts` | JWT utilities |
| `packages/twenty-server/src/engine/guards/public-endpoint.guard.ts` | Public endpoint guard |
| `packages/twenty-server/src/engine/core-modules/captcha/captcha.guard.ts` | Captcha validation |

### Configuration

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` | Token expiration config |
| Environment variable `APP_SECRET` | Master secret for JWT |

---

## Summary

Login flow sử dụng mô hình **3-step authentication** với intermediate login token:

1. **CheckUserExists** - Kiểm tra user, không leak thông tin password
2. **GetLoginTokenFromCredentials** - Validate credentials, trả về short-lived login token (15min)
3. **GetAuthTokensFromLoginToken** - Exchange login token → access token (30min) + refresh token (60 days)

Thiết kế này cung cấp:
- **Security**: Tách biệt credential validation và token issuance
- **Flexibility**: Hỗ trợ 2FA giữa step 2 và 3
- **Auditability**: Refresh token được lưu trong DB để tracking và revocation
