# Tài liệu Git Flow - Quy trình phát triển dự án

## Tổng quan về Git Flow

Git Flow là một mô hình phân nhánh Git được thiết kế để quản lý quy trình phát triển phần mềm một cách có tổ chức và hiệu quả. Trong dự án của chúng ta, chúng ta sử dụng một phiên bản Git Flow tùy chỉnh với các nhánh chính và quy trình làm việc cụ thể.

## Cấu trúc nhánh

### Nhánh chính (Main Branches)

#### 1. `main` (hoặc `master`)
- **Mục đích**: Chứa code production, luôn ở trạng thái stable và có thể deploy
- **Đặc điểm**:
  - Chỉ merge từ nhánh `release`
  - Mỗi commit trên nhánh này tương ứng với một phiên bản release
  - Được bảo vệ, không được commit trực tiếp

#### 2. `release`
- **Mục đích**: Chuẩn bị cho việc release, tích hợp và kiểm thử cuối cùng
- **Đặc điểm**:
  - Được tạo từ nhánh `develop` khi sẵn sàng release
  - Chỉ nhận bug fixes, không nhận feature mới
  - Merge vào cả `main` và `develop` sau khi hoàn thành

#### 3. `develop`
- **Mục đích**: Nhánh phát triển chính, tích hợp tất cả features
- **Đặc điểm**:
  - Nhận merge từ các nhánh `feature`
  - Luôn chứa code mới nhất cho lần release tiếp theo
  - Được sử dụng làm base cho các nhánh `feature` mới

### Nhánh hỗ trợ (Supporting Branches)

#### 4. `feature/*`
- **Mục đích**: Phát triển các tính năng cụ thể
- **Quy tắc đặt tên**: `feature/[github-username]-[issue-id]-[mô-tả-ngắn]`
- **Chu trình**: Tạo từ `develop` → Merge về `develop`

#### 5. `task/*`
- **Mục đích**: Thực hiện các task cụ thể trong feature
- **Quy tắc đặt tên**: `task/[github-username]-[issue-id]-[mô-tả-ngắn]`
- **Chu trình**: Tạo từ nhánh `feature` → Merge về nhánh `feature`

## Quy trình làm việc chi tiết

### Bước 1: Tạo và quản lý Issue trên GitHub

1. **Tạo issue mới** trên GitHub repository với mô tả chi tiết
   - Sử dụng template issue nếu có
   - Gắn labels phù hợp: `feature`, `bug`, `enhancement`, `task`
   - Assign cho developer phụ trách
   - Đặt milestone cho sprint/release

2. **Ghi nhận Issue ID** (ví dụ: `#123`)
   - GitHub tự động tạo ID số tự tăng
   - Sử dụng ID này trong branch name và commit message

3. **Phân loại issue theo loại:**
   - **Feature Issue**: Issue cha cho một tính năng lớn
   - **Task Issue**: Các nhiệm vụ con thuộc feature
   - **Bug Issue**: Báo cáo và sửa lỗi
   - **Enhancement**: Cải thiện tính năng hiện có

4. **Liên kết các issue liên quan:**
   - Sử dụng "Related to #124" để liên kết
   - Tạo project board để tracking progress

### Bước 2: Tạo nhánh Feature

```bash
# Đảm bảo đang ở nhánh develop và cập nhật
git checkout develop
git pull origin develop

# Tạo nhánh feature mới với tên GitHub và Issue ID
git checkout -b feature/johndoe-123-user-authentication
git push -u origin feature/johndoe-123-user-authentication
```

**Quy tắc đặt tên nhánh Feature:**
- `feature/johndoe-123-user-management` - Quản lý người dùng
- `feature/janesmith-124-api-integration` - Tích hợp API
- `feature/mikewilson-125-dashboard-ui` - Giao diện dashboard
- `feature/alicebrown-126-payment-system` - Hệ thống thanh toán
- `feature/davidlee-127-notification-service` - Dịch vụ thông báo

### Bước 3: Tạo nhánh Task từ Feature

```bash
# Đảm bảo đang ở nhánh feature
git checkout feature/johndoe-123-user-authentication
git pull origin feature/johndoe-123-user-authentication

# Tạo nhánh task với GitHub username và Issue ID
git checkout -b task/johndoe-128-login-validation
git push -u origin task/johndoe-128-login-validation
```

**Quy tắc đặt tên nhánh Task:**
- `task/johndoe-128-login-form` - Form đăng nhập
- `task/janesmith-129-password-reset` - Reset mật khẩu
- `task/mikewilson-130-oauth-integration` - Tích hợp OAuth
- `task/alicebrown-131-user-profile-api` - API thông tin người dùng

### Bước 4: Phát triển và Commit Code

```bash
# Thực hiện thay đổi code
# ...

# Kiểm tra và fix code quality trước commit
yarn run format:check          # Kiểm tra format
yarn run lint                 # Kiểm tra linting
yarn run type-check           # Kiểm tra TypeScript

# Hoặc fix tự động các lỗi có thể fix được
yarn run format              # Format tất cả files
yarn run lint:fix            # Fix ESLint issues tự động
yarn run fix:changed         # Fix chỉ files thay đổi (nhanh hơn)

# Commit với message rõ ràng (Husky sẽ tự động chạy pre-commit hooks)
git add .
git commit -m "feat(auth): implement login validation logic

- Add email format validation
- Add password strength checker  
- Handle authentication errors
- Update tests for login component

Closes #128"

# Đẩy code lên remote
git push origin task/johndoe-128-login-validation
```

**Quy tắc Commit Message:**
```
<type>(<scope>): <subject>

<body>

Closes #<issue-id>
Refs #<parent-feature-issue-id> (nếu là task thuộc feature)
```

**Các loại commit:**
- `feat`: Tính năng mới
- `fix`: Sửa lỗi
- `docs`: Cập nhật tài liệu
- `style`: Thay đổi format, không ảnh hưởng logic
- `refactor`: Tái cấu trúc code
- `test`: Thêm hoặc sửa tests
- `chore`: Cập nhật build tools, dependencies

**Lưu ý về GitHub Issues:**
- Sử dụng `Closes #123` để tự động đóng issue khi merge PR
- Sử dụng `Refs #124` để tham chiếu đến feature issue mà không đóng nó
- Có thể tham chiếu nhiều issue: `Closes #123, Refs #124`

## Code Quality Tools và Pre-commit Hooks

Dự án sử dụng **Husky** để tự động chạy code quality checks trước khi commit:

### Pre-commit Hooks tự động chạy:
1. **Prettier** - Format code tự động
2. **ESLint** - Kiểm tra và fix các lỗi có thể sửa được
3. **TypeScript** - Kiểm tra type checking

### Các script kiểm tra code quality:

```bash
# Sửa tự động
yarn run fix:changed          # Fix chỉ files đã thay đổi (recommend)
```

### Workflow với Code Quality:

```bash
# Trước khi commit (tùy chọn - Husky sẽ tự động chạy)
yarn run fix:changed          # Fix các files thay đổi

# Commit (Husky tự động chạy pre-commit hooks)
git add .
git commit -m "feat: your commit message"

# Nếu commit bị chặn do lỗi ESLint errors:
yarn run lint:fix             # Fix lỗi
git add .                      # Stage lại files đã fix
git commit -m "feat: your commit message"  # Commit lại
```

### Quy tắc chặn commit:
- ✅ **ESLint warnings**: Được phép, không chặn commit
- ❌ **ESLint errors**: Bị chặn, phải fix trước khi commit
- ❌ **Prettier formatting**: Tự động fix, không chặn
- ❌ **TypeScript errors**: Được kiểm tra nhưng không chặn commit

### Troubleshooting - Khi commit bị chặn:

**Lỗi: "ESLint errors found - blocking commit"**
```bash
# Fix lỗi ESLint tự động
yarn run lint:fix

# Hoặc fix chỉ files thay đổi
yarn run fix:changed

# Stage lại và commit
git add .
git commit -m "your message"
```

**Lỗi: "No parser could be inferred for file"**
```bash
# Thường xảy ra với yarn.lock, package-lock.json
# Đã được fix trong script fix:changed
yarn run fix:changed  # Script đã loại trừ các file không cần thiết
```

**Lỗi TypeScript compilation**
```bash
# Kiểm tra lỗi TypeScript
yarn run type-check

# Fix theo từng package
npx nx typecheck twenty-front
npx nx typecheck twenty-server
```

**Skip pre-commit hooks (không khuyến khích)**
```bash
# Chỉ sử dụng trong trường hợp khẩn cấp
git commit -m "emergency fix" --no-verify
```

### Bước 5: Tạo Pull Request và Merge

#### 5.1: Merge Task → Feature

```bash
# Tạo Pull Request từ task về feature
# Review code và merge

# Sau khi merge, xóa nhánh task
git checkout feature/johndoe-123-user-authentication
git pull origin feature/johndoe-123-user-authentication
git branch -d task/johndoe-128-login-validation
git push origin --delete task/johndoe-128-login-validation
```

#### 5.2: Merge Feature → Develop

```bash
# Đảm bảo feature hoàn thành và đã test
git checkout feature/johndoe-123-user-authentication
git pull origin feature/johndoe-123-user-authentication

# Tạo Pull Request từ feature về develop
# Review code, chạy CI/CD và merge

# Sau khi merge, xóa nhánh feature
git checkout develop
git pull origin develop
git branch -d feature/johndoe-123-user-authentication
git push origin --delete feature/johndoe-123-user-authentication
```

#### 5.3: Merge Develop → Release

```bash
# Khi sẵn sàng release
git checkout develop
git pull origin develop

# Tạo nhánh release
git checkout -b release/v1.2.0
git push -u origin release/v1.2.0

# Chỉ sửa bugs trên nhánh release
# Tạo PR merge release → main và release → develop
```

## Quy tắc đặt tên nhánh

### Format chung
```
feature/[github-username]-[issue-id]-[mô-tả-ngắn]
task/[github-username]-[issue-id]-[mô-tả-ngắn]
```

### Quy tắc chi tiết
- **GitHub username**: Tên username chính xác trên GitHub (giữ nguyên format)
- **Issue ID**: Mã ID của GitHub Issue (ví dụ: 123) - chỉ số, không dấu #
- **Mô tả ngắn**: Tóm tắt nội dung bằng tiếng Anh, dùng dấu gạch nối `-`
- **Chữ thường**: Mô tả viết thường, không dấu cách
- **Dấu phân cách**: Sử dụng dấu gạch nối `-` giữa các phần

### Ví dụ GitHub username
- `johndoe` (GitHub: @johndoe)
- `janesmith` (GitHub: @janesmith)
- `mikewilson` (GitHub: @mikewilson)
- `alice-brown` (GitHub: @alice-brown)
- `davidlee91` (GitHub: @davidlee91)
- `nguyenvanan` (GitHub: @nguyenvanan)
- `tran-mai` (GitHub: @tran-mai)

### Ví dụ tên nhánh hoàn chỉnh
**Feature branches:**
- `feature/johndoe-123-user-authentication`
- `feature/janesmith-124-payment-integration`
- `feature/mikewilson-125-dashboard-redesign`

**Task branches:**
- `task/johndoe-128-login-form-validation`
- `task/alice-brown-129-password-reset-api`
- `task/davidlee91-130-oauth-google-integration`

### Quy tắc đặt tên và Lưu ý

### Quy tắc bắt buộc

1. **Không commit trực tiếp** vào `main`, `release`, `develop`
2. **Luôn tạo Pull Request** cho mọi merge
3. **Code review bắt buộc** trước khi merge
4. **Chạy tests** trước khi merge
5. **Xóa nhánh** sau khi merge thành công
6. **Sync thường xuyên** với nhánh base

#### **Khi nào dùng từng phương pháp:**

**🔄 Rebase - Dùng cho:**
- Cập nhật nhánh cá nhân từ base branch
- Đồng bộ với thay đổi mới từ team
- Làm sạch commit history trước khi merge
- Tránh merge commits không cần thiết
- Khi làm việc một mình trên nhánh

**🔀 Merge - Dùng cho:**
- Tích hợp chính thức giữa các nhánh
- Merge thông qua Pull Request
- Giữ lại context và history của feature
- Khi nhiều người cùng làm việc trên nhánh
- Merge vào develop/main

#### **Lưu ý quan trọng:**

**⚠️ Không bao giờ rebase:**
- Nhánh đã được push và có người khác sử dụng
- Nhánh shared như develop, main
- Khi không chắc chắn về tác động

**✅ An toàn khi rebase:**
- Nhánh cá nhân chưa ai khác sử dụng
- Dùng `--force-with-lease` thay vì `--force`
- Backup nhánh trước khi rebase quan trọng

**💡 Best Practice:**
- Rebase thường xuyên để tránh conflicts lớn
- Squash commits liên quan trước khi merge
- Viết commit message rõ ràng sau rebase
- Test kỹ sau mỗi lần rebase

### Xử lý Conflicts trong Merge Request

#### **Tình huống: MR có conflicts với develop**

Khi tạo Merge Request từ feature → develop mà gặp conflicts, **luôn sử dụng REBASE** để giải quyết:

```bash
# Bước 1: Checkout về nhánh feature
git checkout feature/johndoe-123-user-authentication
git fetch origin

# Bước 2: Rebase từ develop để cập nhật
git rebase origin/develop

# Bước 3: Giải quyết conflicts (nếu có)
# Git sẽ dừng tại commit có conflict
# Sửa files có conflict, sau đó:
git add .
git rebase --continue

# Lặp lại bước 3 cho đến khi hoàn thành
# Nếu muốn hủy rebase:
# git rebase --abort

# Bước 4: Force push (sau khi giải quyết hết conflicts)
git push --force-with-lease origin feature/johndoe-12300-user-authentication

# Bước 5: MR sẽ tự động cập nhật và không còn conflicts
```

#### **Tại sao chọn Rebase thay vì Merge:**

**✅ Ưu điểm của Rebase:**
- History tuyến tính, dễ đọc
- Không tạo merge commit thừa
- Conflicts được giải quyết từng commit
- Feature branch được "updated" với latest develop
- Standard practice trong industry

**❌ Nhược điểm của Merge:**
- Tạo merge commit phức tạp
- History bị rối với nhiều nhánh
- Khó debug khi có vấn đề
- Không phù hợp với workflow hiện đại

#### **Chi tiết xử lý Conflicts:**

```bash
# Khi rebase gặp conflict
git status
# Sẽ hiển thị files bị conflict

# Mở file conflict và sửa
# Tìm các đoạn:
# <<<<<<< HEAD
# (code từ develop)
# =======
# (code từ feature branch)
# >>>>>>> commit-hash

# Sau khi sửa xong tất cả conflicts:
git add .
git rebase --continue

# Nếu có nhiều commits bị conflict, lặp lại quá trình
```

#### **Xử lý trường hợp phức tạp:**

```bash
# Nếu quá nhiều conflicts và muốn hủy
git rebase --abort

# Hoặc rebase interactive để squash commits trước
git rebase -i origin/develop
# Chọn "squash" cho các commits liên quan để giảm conflicts

# Backup branch trước khi rebase (an toàn)
git branch backup-feature-johndoe-123
git rebase origin/develop
```

#### **Sau khi giải quyết conflicts:**

```bash
# Kiểm tra log để đảm bảo history đúng
git log --oneline -10

# Test lại application và code quality
yarn run format:check          # Kiểm tra format
yarn run lint                  # Kiểm tra linting  
yarn run type-check            # Kiểm tra TypeScript

# Hoặc sử dụng Nx commands cụ thể cho từng package
npx nx test twenty-front        # Test frontend
npx nx test twenty-server       # Test backend
npx nx build twenty-front       # Build frontend
npx nx build twenty-server      # Build backend

# Push và kiểm tra MR
git push --force-with-lease origin feature/johndoe-123-user-authentication
```

### Cập nhật nhánh từ base

```bash
# Cập nhật task từ feature
git checkout task/johndoe-128-login-validation
git fetch origin
git rebase origin/feature/johndoe-123-user-authentication

# Nếu có conflicts, giải quyết và tiếp tục
git rebase --continue
git push --force-with-lease origin task/johndoe-128-login-validation
```

## Sơ đồ Git Flow

### Workflow chi tiết từ GitHub Issues đến Deploy

```mermaid
flowchart TD
    A[📋 Tạo Issue trên GitHub] --> B[🔍 Lấy Issue ID: #123]
    B --> C{🤔 Task thuộc Feature nào?}
    
    C -->|Feature mới| D[🌿 Tạo Feature Branch<br/>feature/johndoe-123-user-auth]
    C -->|Feature có sẵn| E[🔄 Checkout Feature Branch hiện tại]
    
    D --> F[🌱 Tạo Task Branch<br/>task/johndoe-128-login-form]
    E --> F
    
    F --> G[💻 Phát triển Code]
    G --> H[📝 Commit & Push]
    H --> I{🔄 Cần sync với Feature?}
    
    I -->|Có| J[🔄 Rebase từ Feature Branch]
    I -->|Không| K[🔀 Tạo PR: Task → Feature]
    J --> K
    
    K --> L[👥 Code Review]
    L --> M{✅ Review Pass?}
    
    M -->|❌ Cần sửa| G
    M -->|✅ Approved| N[🔀 Merge Task → Feature]
    
    N --> O[🗑️ Xóa Task Branch]
    O --> P{🤔 Feature hoàn thành?}
    
    P -->|❌ Chưa| Q[🆕 Tạo Task mới]
    P -->|✅ Hoàn thành| R[🔄 Rebase Feature từ Develop]
    Q --> F
    
    R --> S{⚠️ Có Conflicts?}
    S -->|✅ Không| T[🔀 Tạo PR: Feature → Develop]
    S -->|❌ Có| U[🛠️ Giải quyết Conflicts<br/>git rebase origin/develop]
    
    U --> V[📤 Force Push<br/>git push --force-with-lease]
    V --> T
    
    T --> W[👥 Code Review & CI/CD]
    W --> X{✅ All Checks Pass?}
    
    X -->|❌ Fail| Y[🔧 Fix Issues]
    X -->|✅ Pass| Z[🔀 Merge Feature → Develop]
    Y --> R
    
    Z --> AA[🗑️ Xóa Feature Branch]
    AA --> BB{🚀 Sẵn sàng Release?}
    
    BB -->|❌ Chưa| CC[🔄 Tiếp tục phát triển]
    BB -->|✅ Sẵn sàng| DD[🏷️ Tạo Release Branch<br/>release/v1.2.0]
    CC --> A
    
    DD --> EE[🧪 Testing & Bug Fixes]
    EE --> FF[🔀 Merge Release → Main]
    FF --> GG[🔀 Merge Release → Develop]
    GG --> HH[🚀 Deploy to Production]
    
    style A fill:#e1f5fe
    style DD fill:#f3e5f5
    style HH fill:#e8f5e8
    style U fill:#fff3e0
    style Y fill:#ffebee
```

### Quy trình xử lý Conflicts trong MR

```mermaid
flowchart TD
    A[🔀 Tạo MR: Feature → Develop] --> B{⚠️ Có Conflicts?}
    
    B -->|✅ Không| C[✅ MR sẵn sàng Review]
    B -->|❌ Có| D[💾 Backup Branch<br/>git branch backup-feature]
    
    D --> E[🔄 Checkout Feature Branch]
    E --> F[📥 Fetch Latest<br/>git fetch origin]
    F --> G[🔄 Rebase từ Develop<br/>git rebase origin/develop]
    
    G --> H{⚠️ Rebase Conflicts?}
    
    H -->|✅ Không| I[📤 Force Push<br/>git push --force-with-lease]
    H -->|❌ Có| J[🛠️ Giải quyết Conflicts]
    
    J --> K[📝 Edit Conflict Files<br/><<<<<<< HEAD<br/>=======<br/>>>>>>>> commit]
    K --> L[➕ Add Resolved Files<br/>git add .]
    L --> M[▶️ Continue Rebase<br/>git rebase --continue]
    
    M --> N{🔄 Còn Conflicts?}
    N -->|✅ Có| J
    N -->|❌ Không| O[🧪 Test Application<br/>npm test && npm build]
    
    O --> P{✅ Tests Pass?}
    P -->|❌ Fail| Q[🔧 Fix Test Issues]
    P -->|✅ Pass| I
    Q --> O
    
    I --> R[🔄 MR Auto-updated]
    R --> C
    C --> S[👥 Code Review]
    S --> T[✅ Merge to Develop]
    
    subgraph "🆘 Emergency Actions"
        U[❌ Abort Rebase<br/>git rebase --abort]
        V[🔙 Restore Backup<br/>git reset --hard backup-feature]
    end
    
    J -.->|Quá phức tạp| U
    U --> V
    V --> W[💬 Thảo luận với Team]
    
    style A fill:#e3f2fd
    style C fill:#e8f5e8
    style J fill:#fff3e0
    style U fill:#ffebee
    style V fill:#ffebee
    style T fill:#e8f5e8
```

## Workflow Example

### Cấu trúc nhánh và mối quan hệ

```mermaid
graph TB
    subgraph "🏭 Production Environment"
        MAIN[main/master<br/>📦 Production Code]
    end
    
    subgraph "🚀 Release Management"
        REL[release/v1.2.0<br/>🏷️ Release Preparation]
    end
    
    subgraph "🔬 Development Environment"
        DEV[develop<br/>🧪 Integration Branch]
    end
    
    subgraph "👤 johndoe Features"
        F1[feature/johndoe-123-user-auth<br/>🌿 User Authentication]
        F2[feature/johndoe-140-dashboard<br/>🌿 Dashboard UI]
    end
    
    subgraph "👤 janesmith Features"
        F3[feature/janesmith-124-payment<br/>🌿 Payment System]
    end
    
    subgraph "📋 johndoe Tasks"
        T1[task/johndoe-128-login-form<br/>📝 Login Form]
        T2[task/johndoe-129-auth-api<br/>📝 Auth API]
        T3[task/johndoe-130-jwt-logic<br/>📝 JWT Logic]
    end
    
    subgraph "📋 janesmith Tasks"
        T4[task/janesmith-131-stripe-integration<br/>📝 Stripe Integration]
        T5[task/janesmith-132-payment-ui<br/>📝 Payment UI]
    end
    
    %% Flow arrows
    DEV --> F1
    DEV --> F2
    DEV --> F3
    
    F1 --> T1
    F1 --> T2
    F1 --> T3
    
    F3 --> T4
    F3 --> T5
    
    T1 -.->|Merge| F1
    T2 -.->|Merge| F1
    T3 -.->|Merge| F1
    
    T4 -.->|Merge| F3
    T5 -.->|Merge| F3
    
    F1 -.->|Merge Request| DEV
    F2 -.->|Merge Request| DEV
    F3 -.->|Merge Request| DEV
    
    DEV --> REL
    REL --> MAIN
    REL -.->|Hotfix merge| DEV
    
    %% Styling
    classDef mainBranch fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef releaseBranch fill:#845ef7,stroke:#5f3dc4,color:#fff
    classDef devBranch fill:#51cf66,stroke:#37b24d,color:#fff
    classDef featureBranch fill:#339af0,stroke:#1971c2,color:#fff
    classDef taskBranch fill:#ffd43b,stroke:#fab005,color:#000
    
    class MAIN mainBranch
    class REL releaseBranch
    class DEV devBranch
    class F1,F2,F3 featureBranch
    class T1,T2,T3,T4,T5 taskBranch
```


### Quy trình Daily Workflow

```mermaid
sequenceDiagram
  participant GH as 📋 GitHub Issues
  participant DEV as 👨‍💻 Developer
  participant LOCAL as 💻 Local Git
  participant REMOTE as ☁️ Remote Git
  participant TEAM as 👥 Team

  Note over GH,TEAM: 🌅 Morning Routine

  GH->>DEV: Check assigned issues
  DEV->>LOCAL: git checkout task/johndoe-128
  LOCAL->>REMOTE: git fetch origin
  LOCAL->>LOCAL: git rebase origin/feature/johndoe-123

  Note over DEV,LOCAL: 💻 Development Work

  DEV->>LOCAL: Code implementation
  LOCAL->>LOCAL: git add . && git commit
  LOCAL->>REMOTE: git push origin task/johndoe-128

  Note over DEV,TEAM: 🔄 Collaboration

  DEV->>TEAM: Create Pull Request
  TEAM->>DEV: Code Review feedback
  DEV->>LOCAL: Apply feedback
  LOCAL->>REMOTE: git push origin task/johndoe-128

  Note over TEAM,REMOTE: ✅ Integration

  TEAM->>REMOTE: Approve & Merge
  REMOTE->>REMOTE: task → feature → develop
  DEV->>LOCAL: git branch -d task/johndoe-128

  Note over GH,TEAM: 🌆 End of Day

  DEV->>GH: Update issue status
  GH->>TEAM: Progress report
```

## Kết luận

Git Flow này giúp đảm bảo:
- **Tổ chức code rõ ràng** theo từng tính năng và task
- **Truy vết được nguồn gốc** của mỗi thay đổi
- **Kiểm soát chất lượng** thông qua code review
- **Phát triển song song** nhiều tính năng
- **Release ổn định** và có thể rollback

Tuân thủ quy trình này sẽ giúp team làm việc hiệu quả và giảm thiểu conflicts trong quá trình phát triển.