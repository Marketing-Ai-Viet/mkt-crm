# OAuth2 Client Implementation Roadmap

> Lộ trình triển khai OAuth2 Client Module trong hệ thống Twenty CRM

**Version**: 1.0
**Created**: 2025-11-29
**Reference**: [oauth2-client-implementation-guide.md](./oauth2-client-implementation-guide.md)

---

## Tổng quan

Roadmap này mô tả các phase triển khai OAuth2 Client Module, từ chuẩn bị môi trường đến production deployment.

---

## Phase 1: Chuẩn bị môi trường

**Mục tiêu**: Setup infrastructure và dependencies cần thiết

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 1.1 | Verify Redis connection | DevOps | - | Redis accessible từ development environment |
| 1.2 | Cấu hình environment variables | Backend | 1.1 | `.env` file với OAuth2 config |
| 1.3 | Thêm `MktOAuth2` vào `CacheStorageNamespace` | Backend | - | Updated enum file |
| 1.4 | Install NPM dependencies | Backend | - | `lru-cache`, `luxon`, `zod` installed |

### Environment Variables cần cấu hình

```bash
# OAuth2 Server
MKT_API_BASE_URL=http://localhost:3006
MKT_OAUTH_CLIENT_ID=<client_id>
MKT_OAUTH_CLIENT_SECRET=<client_secret_min_32_chars>
MKT_OAUTH_SCOPES=products:read versions:read licenses:read

# OAuth2 Endpoints
OAUTH2_TOKEN_ENDPOINT=/oauth/token

# Cache Configuration
OAUTH2_CACHE_LRU_MAX=10
OAUTH2_CACHE_LRU_TTL_MS=3600000
OAUTH2_CACHE_REDIS_TTL_SECONDS=3600

# Resilience
OAUTH2_RATE_LIMIT_ENABLED=true
OAUTH2_CIRCUIT_BREAKER_ENABLED=true
```

### Acceptance Criteria

- [ ] Redis connection test pass
- [ ] Environment variables đã được document
- [ ] `CacheStorageNamespace.MktOAuth2` đã được thêm

---

## Phase 2: Core Services Implementation

**Mục tiêu**: Implement các core services của OAuth2 Client

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 2.1 | Tạo module structure | Backend | 1.* | Folder structure theo guide |
| 2.2 | Implement `OAuth2CacheService` | Backend | 2.1 | 2-tier caching (LRU + Redis) |
| 2.3 | Implement `OAuth2LockService` | Backend | 2.1 | Wrapper cho `CacheLockService` |
| 2.4 | Implement `OAuth2RateLimiterService` | Backend | 2.1 | Rate limiting service |
| 2.5 | Implement `OAuth2CircuitBreakerService` | Backend | 2.1 | Circuit breaker pattern |
| 2.6 | Implement `OAuth2ClientService` | Backend | 2.2-2.5 | Core token management |
| 2.7 | Implement `OAuth2HttpService` | Backend | 2.6 | HTTP client với auto token injection |

### Module Structure

```
packages/twenty-server/src/mkt-core/oauth2-client/
├── config/
│   ├── index.ts
│   ├── oauth2-client.config.ts
│   └── oauth2-client.validation.ts
├── constants/
│   ├── index.ts
│   ├── oauth2-client.constant.ts
│   └── oauth2-client-messages.constant.ts
├── services/
│   ├── index.ts
│   ├── oauth2-client.service.ts
│   ├── oauth2-http.service.ts
│   ├── oauth2-cache.service.ts
│   ├── oauth2-lock.service.ts
│   ├── oauth2-rate-limiter.service.ts
│   └── oauth2-circuit-breaker.service.ts
├── types/
│   ├── index.ts
│   ├── oauth2-config.type.ts
│   ├── oauth2-token.type.ts
│   └── oauth2-error.type.ts
├── controllers/
│   ├── index.ts
│   └── oauth2-management.controller.ts
└── oauth2-client.module.ts
```

### Acceptance Criteria

- [ ] Tất cả services đã implement
- [ ] Services inject đúng dependencies từ Twenty CRM
- [ ] Types đã định nghĩa đầy đủ

---

## Phase 3: Management Controller & Health Check

**Mục tiêu**: Implement controller cho monitoring và management

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 3.1 | Implement `OAuth2ManagementController` | Backend | 2.* | REST endpoints |
| 3.2 | Implement health check endpoint | Backend | 3.1 | `GET /rest/mkt-oauth2/health` |
| 3.3 | Implement token status endpoint | Backend | 3.1 | `GET /rest/mkt-oauth2/token/status` |
| 3.4 | Implement token refresh endpoint | Backend | 3.1 | `POST /rest/mkt-oauth2/token/refresh` |
| 3.5 | Implement token invalidate endpoint | Backend | 3.1 | `POST /rest/mkt-oauth2/token/invalidate` |

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/rest/mkt-oauth2/health` | Health check | Yes (JWT) |
| GET | `/rest/mkt-oauth2/token/status` | Token metadata | Yes (JWT) |
| POST | `/rest/mkt-oauth2/token/refresh` | Force refresh token | Yes (JWT) |
| POST | `/rest/mkt-oauth2/token/invalidate` | Invalidate cached token | Yes (JWT) |

### Acceptance Criteria

- [ ] Controller sử dụng `JwtAuthGuard`, `WorkspaceAuthGuard`
- [ ] Health check endpoint trả về status đầy đủ
- [ ] Endpoints hoạt động đúng

---

## Phase 4: Module Integration

**Mục tiêu**: Tích hợp module vào hệ thống

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 4.1 | Tạo `OAuth2ClientModule` | Backend | 2.*, 3.* | Module definition |
| 4.2 | Import vào `mkt-core.module.ts` | Backend | 4.1 | Module registered |
| 4.3 | Verify module khởi động | Backend | 4.2 | No errors on startup |
| 4.4 | Test health check endpoint | QA | 4.3 | Endpoint accessible |

### Module Definition

```typescript
// oauth2-client.module.ts
@Module({
  imports: [
    HttpModule,
    CacheStorageModule,
    CacheLockModule,
  ],
  controllers: [OAuth2ManagementController],
  providers: [
    OAuth2ClientService,
    OAuth2HttpService,
    OAuth2CacheService,
    OAuth2LockService,
    OAuth2RateLimiterService,
    OAuth2CircuitBreakerService,
  ],
  exports: [OAuth2ClientService, OAuth2HttpService],
})
export class OAuth2ClientModule {}
```

### Acceptance Criteria

- [ ] Module import không có circular dependencies
- [ ] Server khởi động thành công
- [ ] Health check endpoint trả về `healthy`

---

## Phase 5: Unit Testing

**Mục tiêu**: Đạt coverage > 80%

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 5.1 | Test `OAuth2CacheService` | Backend | 2.2 | `oauth2-cache.service.spec.ts` |
| 5.2 | Test `OAuth2LockService` | Backend | 2.3 | `oauth2-lock.service.spec.ts` |
| 5.3 | Test `OAuth2RateLimiterService` | Backend | 2.4 | `oauth2-rate-limiter.service.spec.ts` |
| 5.4 | Test `OAuth2CircuitBreakerService` | Backend | 2.5 | `oauth2-circuit-breaker.service.spec.ts` |
| 5.5 | Test `OAuth2ClientService` | Backend | 2.6 | `oauth2-client.service.spec.ts` |
| 5.6 | Test `OAuth2HttpService` | Backend | 2.7 | `oauth2-http.service.spec.ts` |
| 5.7 | Run coverage report | Backend | 5.1-5.6 | Coverage > 80% |

### Test Commands

```bash
# Chạy test
npx nx test twenty-server --testPathPattern=oauth2-client

# Chạy với coverage
npx nx test twenty-server --testPathPattern=oauth2-client --coverage
```

### Acceptance Criteria

- [ ] Tất cả test files đã tạo
- [ ] Coverage >= 80%
- [ ] CI pipeline pass

---

## Phase 6: Integration Testing

**Mục tiêu**: Verify end-to-end flow hoạt động đúng

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 6.1 | Setup test OAuth2 server | DevOps | - | Mock OAuth2 server |
| 6.2 | Test token fetch flow | QA | 6.1 | Token được fetch thành công |
| 6.3 | Test token caching | QA | 6.2 | Cache hit/miss đúng |
| 6.4 | Test token refresh | QA | 6.2 | Auto refresh hoạt động |
| 6.5 | Test circuit breaker | QA | 6.2 | Circuit opens on failures |
| 6.6 | Test rate limiting | QA | 6.2 | Rate limit enforced |
| 6.7 | Test multi-instance locking | QA | 6.2 | No duplicate fetches |

### Test Scenarios

1. **Happy Path**: Request → Token fetch → Cache → Response
2. **Cache Hit**: Request → LRU hit → Response (no API call)
3. **Redis Fallback**: LRU miss → Redis hit → Backfill LRU → Response
4. **Token Expiry**: Expired token → Auto refresh → Response
5. **Circuit Breaker**: Multiple failures → Circuit opens → Fast fail
6. **Rate Limit**: Excessive requests → Rate limit exception

### Acceptance Criteria

- [ ] Tất cả test scenarios pass
- [ ] No race conditions trong multi-instance
- [ ] Graceful degradation khi Redis unavailable

---

## Phase 7: Documentation & Training

**Mục tiêu**: Tài liệu đầy đủ cho team

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 7.1 | Update implementation guide | Backend | 5.*, 6.* | Updated docs |
| 7.2 | Tạo usage examples | Backend | 7.1 | Code examples |
| 7.3 | Tạo troubleshooting guide | Backend | 6.* | Common issues & solutions |
| 7.4 | Training session cho team | Backend | 7.1-7.3 | Training completed |

### Acceptance Criteria

- [ ] Documentation up-to-date
- [ ] Team có thể sử dụng module

---

## Phase 8: Production Deployment

**Mục tiêu**: Deploy lên production environment

### Tasks

| # | Task | Owner | Dependencies | Deliverables |
|---|------|-------|--------------|--------------|
| 8.1 | Configure production env vars | DevOps | 7.* | Production `.env` |
| 8.2 | Setup monitoring alerts | DevOps | 8.1 | Alerting configured |
| 8.3 | Deploy to staging | DevOps | 8.2 | Staging deployment |
| 8.4 | Smoke test on staging | QA | 8.3 | All tests pass |
| 8.5 | Deploy to production | DevOps | 8.4 | Production deployment |
| 8.6 | Verify production health | QA | 8.5 | Health check pass |

### Production Checklist

- [ ] Environment variables configured
- [ ] Redis connection stable
- [ ] Circuit breaker enabled
- [ ] Rate limiting enabled
- [ ] Monitoring alerts setup
- [ ] Health check monitored
- [ ] Rollback plan documented

### Acceptance Criteria

- [ ] Production deployment successful
- [ ] No errors in first 24 hours
- [ ] Health check consistently healthy

---

## Timeline (Ước tính)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Chuẩn bị | 1 ngày | - |
| Phase 2: Core Services | 3-4 ngày | Phase 1 |
| Phase 3: Controller | 1 ngày | Phase 2 |
| Phase 4: Integration | 0.5 ngày | Phase 3 |
| Phase 5: Unit Testing | 2 ngày | Phase 4 |
| Phase 6: Integration Testing | 1-2 ngày | Phase 5 |
| Phase 7: Documentation | 1 ngày | Phase 6 |
| Phase 8: Production | 1-2 ngày | Phase 7 |

**Tổng cộng**: ~10-14 ngày làm việc

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OAuth2 server không sẵn sàng | High | Medium | Sử dụng mock server cho development |
| Redis connection issues | Medium | Low | Graceful degradation (LRU-only mode) |
| Race conditions | High | Low | Distributed locking, thorough testing |
| Token leak | High | Low | Secure storage, audit logging |
| Performance issues | Medium | Medium | Load testing, caching optimization |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit test coverage | >= 80% | Jest coverage report |
| Health check uptime | >= 99.9% | Monitoring dashboard |
| Token fetch latency | < 500ms | Metrics |
| Cache hit rate | >= 90% | Metrics |
| Circuit breaker triggers | < 1/day | Monitoring alerts |

---

## Stakeholders

| Role | Responsibility |
|------|----------------|
| Backend Lead | Technical decisions, code review |
| Backend Developer | Implementation |
| DevOps | Infrastructure, deployment |
| QA | Testing, validation |
| Product Owner | Acceptance, priorities |

---

**Version**: 1.0
**Created**: 2025-11-29
**Author**: Backend Team
