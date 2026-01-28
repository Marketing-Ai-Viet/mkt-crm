# Tài liệu: Luồng Đăng Nhập và Đăng Ký User

## 1. Tổng quan

### 1.1. Kiến trúc Authentication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐    ┌────────────┐ │
│  │  Client  │───▶│ AuthResolver │───▶│   AuthService   │───▶│ SignInUp   │ │
│  │ (Frontend)│    │              │    │                 │    │  Service   │ │
│  └──────────┘    └──────────────┘    └─────────────────┘    └────────────┘ │
│                         │                     │                     │       │
│                         ▼                     ▼                     ▼       │
│                  ┌──────────────┐    ┌─────────────────┐    ┌────────────┐ │
│                  │ Token Services│    │ UserWorkspace   │    │   User     │ │
│                  │ - LoginToken │    │    Service      │    │  Service   │ │
│                  │ - AccessToken│    │                 │    │            │ │
│                  │ - RefreshToken│   └─────────────────┘    └────────────┘ │
│                  └──────────────┘                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2. Token Types

| Token Type | Mục đích | TTL |
|------------|----------|-----|
| `LOGIN` | Short-lived token sau khi verify credentials | 5 phút |
| `ACCESS` | Token để gọi API (gắn với workspace) | Cấu hình |
| `REFRESH` | Renew access token | Cấu hình |
| `WORKSPACE_AGNOSTIC` | Token cho user chưa chọn workspace | Cấu hình |

### 1.3. Entities liên quan

| Entity | Mô tả | Database |
|--------|-------|----------|
| `User` | Thông tin core user (email, passwordHash) | Core |
| `Workspace` | Không gian làm việc | Core |
| `UserWorkspace` | Liên kết User với Workspace | Core |
| `WorkspaceMember` | Thông tin member trong workspace | Workspace Schema |
| `AppToken` | Các loại tokens (invitation, auth code) | Core |

---

## 2. Luồng Đăng Nhập (Sign In)

### 2.1. Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              SIGN IN FLOW                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User nhập email/password                                                │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────┐                                                   │
│  │ signIn(credentials) │ ◀── GraphQL Mutation                              │
│  └─────────────────────┘                                                   │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ validateLoginWithPassword()     │ ◀── Check email, password, verify     │
│  │ - Check user exists             │                                       │
│  │ - Compare password hash         │                                       │
│  │ - Check email verification      │                                       │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ findAvailableWorkspacesByEmail()│ ◀── Tìm workspaces user có thể access │
│  │ - Already member workspaces     │                                       │
│  │ - Approved domain workspaces    │                                       │
│  │ - Invitation workspaces         │                                       │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ Generate Tokens                 │                                       │
│  │ - workspaceAgnosticToken        │ ◀── Token chưa gắn workspace          │
│  │ - refreshToken                  │                                       │
│  │ - loginToken (per workspace)    │                                       │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  Return AvailableWorkspacesAndAccessTokensOutput                           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. GraphQL API

#### Mutation: signIn

```graphql
mutation SignIn($email: String!, $password: String!) {
  signIn(email: $email, password: $password) {
    availableWorkspaces {
      availableWorkspacesForSignIn {
        id
        displayName
        logo
        loginToken      # Token để đăng nhập vào workspace này
        workspaceUrls {
          customUrl
          subdomainUrl
        }
        sso {
          id
          name
          type
        }
      }
      availableWorkspacesForSignUp {
        id
        displayName
        personalInviteToken  # Token mời tham gia workspace
      }
    }
    tokens {
      accessToken       # Workspace-agnostic access token
      refreshToken      # Để renew tokens
    }
  }
}
```

#### Mutation: getAuthTokensFromLoginToken

Sau khi user chọn workspace, sử dụng `loginToken` để lấy access token thực sự.

```graphql
mutation GetAuthTokens($loginToken: String!, $origin: String!) {
  getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) {
    tokens {
      accessToken       # Access token cho workspace cụ thể
      refreshToken
    }
  }
}
```

### 2.3. Service Implementation

**File:** `auth.service.ts:129-189`

```typescript
async validateLoginWithPassword(
  input: UserCredentialsInput,
  targetWorkspace?: Workspace,
) {
  // 1. Check workspace cho phép password auth
  if (targetWorkspace && !targetWorkspace.isPasswordAuthEnabled) {
    throw new AuthException('Email/Password auth is not enabled');
  }

  // 2. Tìm user theo email
  const user = await this.userRepository.findOne({
    where: { email: input.email },
    relations: { userWorkspaces: true },
  });

  if (!user) {
    throw new AuthException('User not found');
  }

  // 3. Check access nếu có target workspace
  if (targetWorkspace) {
    await this.checkAccessAndUseInvitationOrThrow(targetWorkspace, user);
  }

  // 4. Verify password
  const isValid = await compareHash(input.password, user.passwordHash);
  if (!isValid) {
    throw new AuthException('Wrong password');
  }

  // 5. Check email verification (nếu required)
  if (isEmailVerificationRequired && !user.isEmailVerified) {
    throw new AuthException('Email is not verified');
  }

  return user;
}
```

### 2.4. Login Flow với 2FA

```
┌─────────────────────────────────────────────────────────────────┐
│                        2FA LOGIN FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. signIn() → Trả về loginToken + danh sách workspaces         │
│            │                                                     │
│            ▼                                                     │
│  2. Frontend chọn workspace, gọi getAuthTokensFromLoginToken()  │
│            │                                                     │
│            ▼                                                     │
│  3. Backend check 2FA requirement                               │
│     - Nếu workspace yêu cầu 2FA → throw exception                │
│            │                                                     │
│            ▼                                                     │
│  4. Frontend hiển thị form nhập OTP                             │
│            │                                                     │
│            ▼                                                     │
│  5. Gọi getAuthTokensFromOTP(loginToken, otp)                   │
│     - Validate OTP với TOTP strategy                            │
│     - Trả về access + refresh tokens                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Luồng Đăng Ký (Sign Up)

### 3.1. Các Kịch bản Sign Up

| Kịch bản | Mutation | Mô tả |
|----------|----------|-------|
| 1. Đăng ký không có workspace | `signUp` | Tạo user, chưa join workspace nào |
| 2. Đăng ký vào workspace có sẵn | `signUpInWorkspace` | Join workspace qua invite link/token |
| 3. Tạo workspace mới (existing user) | `signUpInNewWorkspace` | User đã có tạo thêm workspace |

### 3.2. Flow Diagram - signUpInWorkspace

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        SIGN UP IN WORKSPACE FLOW                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: email, password, workspaceInviteHash/workspacePersonalInviteToken  │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ findWorkspaceForSignInUp()      │ ◀── Tìm workspace từ invite hash      │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ checkAccessForSignIn()          │ ◀── Validate quyền truy cập           │
│  │ - Public invite link enabled?   │                                       │
│  │ - Personal invitation valid?    │                                       │
│  │ - Approved access domain?       │                                       │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ signInUp()                      │                                       │
│  │ - Hash password                 │                                       │
│  │ - Create/Get User               │                                       │
│  │ - Add to workspace              │                                       │
│  │ - Create WorkspaceMember        │                                       │
│  │ - Assign default role           │                                       │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ sendVerificationEmail()         │ ◀── Optional, nếu cần verify email    │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  ┌─────────────────────────────────┐                                       │
│  │ generateLoginToken()            │ ◀── Tạo login token cho workspace     │
│  └─────────────────────────────────┘                                       │
│            │                                                                │
│            ▼                                                                │
│  Return SignUpOutput { loginToken, workspace }                             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.3. GraphQL API

#### Mutation: signUp (không có workspace)

```graphql
mutation SignUp($email: String!, $password: String!) {
  signUp(email: $email, password: $password) {
    availableWorkspaces {
      availableWorkspacesForSignIn { ... }
      availableWorkspacesForSignUp { ... }
    }
    tokens {
      accessToken     # Workspace-agnostic token
      refreshToken
    }
  }
}
```

#### Mutation: signUpInWorkspace

```graphql
mutation SignUpInWorkspace($input: SignUpInput!) {
  signUpInWorkspace(
    email: $input.email
    password: $input.password
    workspaceInviteHash: $input.workspaceInviteHash        # Public invite link
    workspacePersonalInviteToken: $input.personalToken    # Personal invitation
    workspaceId: $input.workspaceId
    locale: "vi"
  ) {
    loginToken          # Token để đăng nhập vào workspace
    workspace {
      id
      workspaceUrls {
        customUrl
        subdomainUrl
      }
    }
  }
}
```

### 3.4. Service Implementation - signInUp

**File:** `sign-in-up.service.ts:84-109`

```typescript
async signInUp(params: SignInUpBaseParams & ...) {
  // Case 1: Có invitation cá nhân
  if (params.workspace && params.invitation) {
    return {
      workspace: params.workspace,
      user: await this.signInUpWithPersonalInvitation({
        invitation: params.invitation,
        userData: params.userData,
      }),
    };
  }

  // Case 2: Join workspace có sẵn (qua public invite)
  if (params.workspace) {
    const updatedUser = await this.signInUpOnExistingWorkspace({
      workspace: params.workspace,
      userData: params.userData,
    });
    return { user: updatedUser, workspace: params.workspace };
  }

  // Case 3: Tạo workspace mới
  return await this.signUpOnNewWorkspace(params.userData);
}
```

### 3.5. Tạo Workspace Mới

**File:** `sign-in-up.service.ts:350-424`

```typescript
async signUpOnNewWorkspace(userData) {
  // 1. Check multi-workspace enabled
  const { canImpersonate, canAccessFullAdminPanel } =
    await this.setDefaultImpersonateAndAccessFullAdminPanel();

  // 2. Generate subdomain từ email
  const subdomain = await this.domainManagerService.generateSubdomain(
    isWorkEmailFound ? { email } : {},
  );

  // 3. Tạo workspace
  const workspace = await this.workspaceRepository.save({
    subdomain,
    displayName: '',
    inviteHash: v4(),
    activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    logo,
  });

  // 4. Tạo hoặc lấy user
  const user = isExistingUser
    ? userData.existingUser
    : await this.saveNewUser(userData.newUserWithPicture, { ... });

  // 5. Tạo UserWorkspace
  await this.userWorkspaceService.create({
    userId: user.id,
    workspaceId: workspace.id,
    isExistingUser,
  });

  // 6. Activate onboarding
  await this.activateOnboardingForUser(user, workspace);

  return { user, workspace };
}
```

---

## 4. Add User to Workspace

### 4.1. Flow khi user join workspace

**File:** `user-workspace.service.ts:123-161`

```typescript
async addUserToWorkspaceIfUserNotInWorkspace(user: User, workspace: Workspace) {
  // 1. Check đã có UserWorkspace chưa
  let userWorkspace = await this.checkUserWorkspaceExists(user.id, workspace.id);

  if (!userWorkspace) {
    // 2. Tạo UserWorkspace record
    userWorkspace = await this.create({
      userId: user.id,
      workspaceId: workspace.id,
      isExistingUser: true,
    });

    // 3. Tạo WorkspaceMember trong workspace schema
    await this.createWorkspaceMember(workspace.id, user);

    // 4. Gán default role
    const defaultRoleId = workspace.defaultRoleId;
    if (!isDefined(defaultRoleId)) {
      throw new PermissionsException('Default role not found');
    }

    await this.userRoleService.assignRoleToUserWorkspace({
      workspaceId: workspace.id,
      userWorkspaceId: userWorkspace.id,
      roleId: defaultRoleId,
    });

    // 5. Invalidate invitation (nếu có)
    await this.workspaceInvitationService.invalidateWorkspaceInvitation(
      workspace.id,
      user.email,
    );
  }
}
```

### 4.2. Tạo WorkspaceMember

**File:** `user-workspace.service.ts:85-121`

```typescript
async createWorkspaceMember(workspaceId: string, user: User) {
  const workspaceMemberRepository =
    await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
      workspaceId,
      'workspaceMember',
    );

  const userWorkspace = await this.userWorkspaceRepository.findOneOrFail({
    where: { userId: user.id, workspaceId },
  });

  await workspaceMemberRepository.insert({
    name: {
      firstName: user.firstName,
      lastName: user.lastName,
    },
    colorScheme: 'System',
    userId: user.id,
    userEmail: user.email,
    avatarUrl: userWorkspace.defaultAvatarUrl ?? '',
    locale: user.locale ?? SOURCE_LOCALE,
  });
}
```

---

## 5. Token Generation và Verification

### 5.1. Login Token

**File:** `login-token.service.ts`

```typescript
// Generate
async generateLoginToken(email: string, workspaceId: string, authProvider?: AuthProviderEnum) {
  const jwtPayload: LoginTokenJwtPayload = {
    type: JwtTokenTypeEnum.LOGIN,
    sub: email,               // Email làm subject
    workspaceId,              // Workspace đích
    authProvider,             // Password/Google/Microsoft
  };

  return {
    token: this.jwtWrapperService.sign(jwtPayload, { secret, expiresIn }),
    expiresAt,
  };
}

// Verify
async verifyLoginToken(loginToken: string): Promise<LoginTokenJwtPayload> {
  await this.jwtWrapperService.verifyJwtToken(loginToken, JwtTokenTypeEnum.LOGIN);
  return this.jwtWrapperService.decode(loginToken, { json: true });
}
```

### 5.2. Access Token

**File:** `access-token.service.ts`

```typescript
async generateAccessToken({ userId, workspaceId, authProvider }) {
  // 1. Get user
  const user = await this.userRepository.findOne({ where: { id: userId } });

  // 2. Get workspace member
  const workspaceMember = await workspaceMemberRepository.findOne({
    where: { userId: user.id },
  });

  // 3. Get user workspace
  const userWorkspace = await this.userWorkspaceRepository.findOne({
    where: { userId: user.id, workspaceId },
  });

  // 4. Build JWT payload
  const jwtPayload: AccessTokenJwtPayload = {
    sub: user.id,
    userId: user.id,
    workspaceId,
    workspaceMemberId: workspaceMember.id,
    userWorkspaceId: userWorkspace.id,
    type: JwtTokenTypeEnum.ACCESS,
    authProvider,
  };

  return {
    token: this.jwtWrapperService.sign(jwtPayload, { secret, expiresIn }),
    expiresAt,
  };
}
```

---

## 6. Error Handling

### 6.1. Auth Exceptions

| Error Code | Message | Khi nào xảy ra |
|------------|---------|----------------|
| `USER_NOT_FOUND` | User not found | Email không tồn tại |
| `FORBIDDEN_EXCEPTION` | Wrong password | Sai mật khẩu |
| `FORBIDDEN_EXCEPTION` | Email/Password auth disabled | Workspace tắt auth |
| `EMAIL_NOT_VERIFIED` | Email is not verified | Chưa verify email |
| `WORKSPACE_NOT_FOUND` | Workspace not found | Workspace không tồn tại |
| `INVALID_INPUT` | Password too weak | Mật khẩu không đủ mạnh |
| `SIGNUP_DISABLED` | New workspace setup disabled | Multi-workspace bị tắt |

### 6.2. Password Requirements

**File:** `auth.util.ts`

```typescript
export const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,16}$/;
// - 8-16 ký tự
// - Ít nhất 1 chữ hoa
// - Ít nhất 1 chữ thường
// - Ít nhất 1 số
// - Ít nhất 1 ký tự đặc biệt
```

---

## 7. Sequence Diagram

### 7.1. Full Sign In Flow

```
┌────────┐       ┌──────────────┐    ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Client │       │ AuthResolver │    │ AuthService │    │UserWorkspaceService│    │ TokenServices │
└────┬───┘       └──────┬───────┘    └──────┬──────┘    └────────┬────────┘    └────────┬────────┘
     │                  │                   │                    │                      │
     │ signIn(email,pwd)│                   │                    │                      │
     │─────────────────▶│                   │                    │                      │
     │                  │validateLogin(cred)│                    │                      │
     │                  │──────────────────▶│                    │                      │
     │                  │                   │ compareHash()      │                      │
     │                  │                   │───────┐            │                      │
     │                  │                   │◀──────┘            │                      │
     │                  │         user      │                    │                      │
     │                  │◀──────────────────│                    │                      │
     │                  │                   │                    │                      │
     │                  │     findAvailableWorkspaces(email)     │                      │
     │                  │───────────────────────────────────────▶│                      │
     │                  │          availableWorkspaces           │                      │
     │                  │◀───────────────────────────────────────│                      │
     │                  │                   │                    │                      │
     │                  │       setLoginTokenToWorkspaces()      │                      │
     │                  │───────────────────────────────────────▶│                      │
     │                  │                   │         generateLoginToken(email, wsId)  │
     │                  │                   │                    │─────────────────────▶│
     │                  │                   │                    │        loginToken   │
     │                  │                   │                    │◀─────────────────────│
     │                  │      workspaces with loginTokens       │                      │
     │                  │◀───────────────────────────────────────│                      │
     │                  │                   │                    │                      │
     │                  │     generateWorkspaceAgnosticToken()   │                      │
     │                  │───────────────────────────────────────────────────────────────▶
     │                  │               accessToken, refreshToken                       │
     │                  │◀──────────────────────────────────────────────────────────────│
     │                  │                   │                    │                      │
     │ AvailableWorkspacesAndTokens         │                    │                      │
     │◀─────────────────│                   │                    │                      │
     │                  │                   │                    │                      │
```

### 7.2. Get Auth Tokens from Login Token

```
┌────────┐       ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Client │       │ AuthResolver │    │ LoginTokenService│    │ AccessTokenService│
└────┬───┘       └──────┬───────┘    └────────┬────────┘    └────────┬────────┘
     │                  │                     │                      │
     │getAuthTokensFromLoginToken(token)      │                      │
     │─────────────────▶│                     │                      │
     │                  │verifyLoginToken()   │                      │
     │                  │────────────────────▶│                      │
     │                  │  {sub, workspaceId} │                      │
     │                  │◀────────────────────│                      │
     │                  │                     │                      │
     │                  │      check2FARequirement()                 │
     │                  │───────────────────────────────┐            │
     │                  │◀──────────────────────────────┘            │
     │                  │                     │                      │
     │                  │         generateAccessToken()              │
     │                  │───────────────────────────────────────────▶│
     │                  │                   accessToken              │
     │                  │◀───────────────────────────────────────────│
     │                  │                     │                      │
     │                  │         generateRefreshToken()             │
     │                  │───────────────────────────────────────────▶│
     │                  │                   refreshToken             │
     │                  │◀───────────────────────────────────────────│
     │                  │                     │                      │
     │  AuthTokens { accessToken, refreshToken }                     │
     │◀─────────────────│                     │                      │
```

---

## 8. Files Reference

```
packages/twenty-server/src/engine/core-modules/
├── auth/
│   ├── auth.resolver.ts              # GraphQL endpoints
│   ├── auth.exception.ts             # Exception definitions
│   ├── auth.util.ts                  # Password regex, hash functions
│   ├── dto/
│   │   ├── user-credentials.input.ts # Login input
│   │   ├── sign-up.input.ts          # SignUp input
│   │   ├── token.entity.ts           # Token outputs
│   │   └── available-workspaces.output.ts
│   ├── services/
│   │   ├── auth.service.ts           # Main auth logic
│   │   └── sign-in-up.service.ts     # SignIn/SignUp logic
│   ├── token/services/
│   │   ├── login-token.service.ts    # Login token
│   │   ├── access-token.service.ts   # Access token
│   │   ├── refresh-token.service.ts  # Refresh token
│   │   └── workspace-agnostic-token.service.ts
│   └── types/
│       └── auth-context.type.ts      # JWT payload types
├── user-workspace/
│   └── user-workspace.service.ts     # User-Workspace operations
└── user/
    └── services/user.service.ts      # User operations
```

---

## 9. Environment Variables

| Variable | Mô tả | Default |
|----------|-------|---------|
| `ACCESS_TOKEN_EXPIRES_IN` | TTL của access token | `30m` |
| `REFRESH_TOKEN_EXPIRES_IN` | TTL của refresh token | `30d` |
| `LOGIN_TOKEN_EXPIRES_IN` | TTL của login token | `5m` |
| `IS_EMAIL_VERIFICATION_REQUIRED` | Yêu cầu verify email | `false` |
| `IS_MULTIWORKSPACE_ENABLED` | Cho phép nhiều workspace | `true` |

---

## 10. Related Documents

- [User Creation Refactor](./user-creation-refactor.md) - Quy trình tạo user với permission template
- [RBAC Enterprise Grade](../../mkt-rbac-enterprise-grade/) - Hệ thống phân quyền
