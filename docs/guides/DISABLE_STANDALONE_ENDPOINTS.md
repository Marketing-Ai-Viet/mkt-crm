# Hướng dẫn tắt Standalone Endpoints

## Mục đích

Khi business flow thay đổi, một số endpoint standalone có thể không còn cần thiết hoặc cần được tắt để tránh bypass flow chính.

**Ví dụ:** `mktCreateTrialLicense` mutation có thể cần tắt nếu trial chỉ được tạo thông qua order flow.

## Các phương pháp

### 1. Feature Flag (Khuyến nghị)

Sử dụng environment variable để bật/tắt endpoint mà không cần deploy lại code.

```typescript
// .env
MKT_STANDALONE_TRIAL_ENABLED=false

// resolver
@Mutation(() => MktTrialLicenseActionOutput)
async mktCreateTrialLicense(
  @AuthWorkspace() { id: workspaceId }: Workspace,
  @Args('input') input: MktCreateTrialLicenseInput,
): Promise<MktTrialLicenseActionOutput> {
  // Check feature flag
  if (!this.configService.get<boolean>('MKT_STANDALONE_TRIAL_ENABLED', true)) {
    throw new ForbiddenException(
      'Standalone trial creation is disabled. Please use order flow.',
    );
  }

  // ... existing logic
}
```

**Ưu điểm:**
- Không cần deploy lại code
- Có thể bật/tắt theo môi trường (dev/staging/prod)
- Dễ rollback

**Nhược điểm:**
- Endpoint vẫn hiển thị trong GraphQL schema

---

### 2. Custom Guard

Tạo guard để kiểm soát access theo điều kiện.

```typescript
// guards/standalone-endpoint.guard.ts
@Injectable()
export class StandaloneEndpointGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const isEnabled = this.configService.get<boolean>(
      'MKT_STANDALONE_ENDPOINTS_ENABLED',
      true,
    );

    if (!isEnabled) {
      throw new ForbiddenException('Standalone endpoints are disabled.');
    }

    return true;
  }
}

// resolver
@Mutation(() => MktTrialLicenseActionOutput)
@UseGuards(StandaloneEndpointGuard)
async mktCreateTrialLicense(...) { ... }
```

**Ưu điểm:**
- Reusable cho nhiều endpoints
- Có thể thêm logic phức tạp (theo role, workspace, etc.)

---

### 3. Deprecation + Removal

Đánh dấu deprecated trước khi remove hoàn toàn.

```typescript
// Phase 1: Deprecate
@Mutation(() => MktTrialLicenseActionOutput, {
  deprecationReason: 'Use order flow instead. Will be removed in v2.0',
})
async mktCreateTrialLicense(...) { ... }

// Phase 2: Remove (sau 1-2 releases)
// Xóa method khỏi resolver
```

**Ưu điểm:**
- Client có thời gian migrate
- GraphQL tools sẽ cảnh báo khi sử dụng deprecated endpoint

---

### 4. Xóa hoàn toàn

Nếu chắc chắn không cần endpoint, xóa khỏi resolver.

```typescript
// Xóa method mktCreateTrialLicense khỏi mkt-license.resolver.ts
```

**Ưu điểm:**
- Clean code
- Không còn trong schema

**Nhược điểm:**
- Breaking change
- Cần deploy để rollback

---

## Áp dụng cho mktCreateTrialLicense

### Option A: Giữ lại với Feature Flag

```typescript
// packages/twenty-server/src/mkt-core/mkt-license-integration/resolvers/mkt-license.resolver.ts

import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';

@Resolver()
@UseGuards(UserAuthGuard)
export class MktLicenseResolver {
  constructor(
    private readonly licenseProxyService: MktLicenseProxyService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => MktTrialLicenseActionOutput, {
    description: 'Create trial license (standalone). Can be disabled via MKT_STANDALONE_TRIAL_ENABLED=false',
  })
  async mktCreateTrialLicense(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: MktCreateTrialLicenseInput,
  ): Promise<MktTrialLicenseActionOutput> {
    // Check if standalone trial is enabled
    const isEnabled = this.configService.get<boolean>(
      'MKT_STANDALONE_TRIAL_ENABLED',
      true, // default: enabled
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        'Standalone trial creation is disabled. Please create trial through order flow.',
      );
    }

    // ... existing logic
  }
}
```

### Option B: Xóa hoàn toàn

Nếu trial chỉ được tạo qua order flow:

1. Xóa `mktCreateTrialLicense` method khỏi `mkt-license.resolver.ts`
2. Xóa `MktCreateTrialLicenseInput` và `MktTrialLicenseActionOutput` từ DTOs (nếu không dùng elsewhere)
3. Xóa `createOrReuseTrial` method từ service (nếu không dùng trong order flow)

---

## Environment Variables

```bash
# .env.development
MKT_STANDALONE_TRIAL_ENABLED=true   # Enable for dev/testing

# .env.production
MKT_STANDALONE_TRIAL_ENABLED=false  # Disable in production
```

---

## Checklist khi tắt endpoint

- [ ] Thông báo cho team/client về việc deprecate
- [ ] Kiểm tra không có code nào đang gọi endpoint
- [ ] Update documentation
- [ ] Test flow chính vẫn hoạt động
- [ ] Monitor logs sau khi deploy

---

## Related Files

- `packages/twenty-server/src/mkt-core/mkt-license-integration/resolvers/mkt-license.resolver.ts`
- `packages/twenty-server/src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service.ts`
- `packages/twenty-server/src/mkt-core/mkt-license-integration/dto/mkt-license-graphql.output.ts`
