import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';
import { MktDepartmentRepository } from 'src/mkt-core/mkt-department/repositories';
import { MktOrganizationLevelModule } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.module';
import { RBAC_COMMANDS } from 'src/mkt-core/mkt-rbac-enterprise-grade/commands';
import {
  ENTERPRISE_RBAC_CONFIG,
  ENTERPRISE_RBAC_CONFIG_TOKEN,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/configs';
import { RBAC_REPOSITORIES } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { RBAC_RESOLVERS } from 'src/mkt-core/mkt-rbac-enterprise-grade/resolvers';
import {
  RbacCacheService,
  RbacContextService,
  RbacEnforcerService,
  HierarchicalAccessEvaluatorService,
  // Phase 2: Services cho PermissionContext flow
  PermissionContextService,
  FilterExpressionResolverService,
  DataAccessPolicyService,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/services';
import { DepartmentAuthorizationGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/guards/department-authorization.guard';
import { DataScopeInterceptor } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/data-scope.interceptor';
import { UserManagementModule } from 'src/mkt-core/user-management/user-management.module';
import { DepartmentTreeService } from 'src/mkt-core/mkt-department/services/department-tree.service';

/**
 * Enterprise RBAC Module
 *
 * Provides template-based role access control:
 * - Multi-tenant authorization with workspace isolation
 * - Template-based permission checks via mktTemplateResourcePermission
 * - Hierarchy-based data scope filtering
 * - Department authorization guard (@RequireDepartment)
 * - Row-level data scope interceptor (@DataScope)
 * - Permission caching via RbacCacheService
 *
 * Configuration:
 * Uses ENTERPRISE_RBAC_CONFIG_TOKEN (Symbol) for type-safe injection:
 * ```typescript
 * constructor(
 *   @Inject(ENTERPRISE_RBAC_CONFIG_TOKEN)
 *   private readonly config: EnterpriseRbacConfigType,
 * ) {}
 * ```
 */
@Global()
@Module({
  imports: [
    TwentyORMModule,
    CacheStorageModule,
    WorkspaceCacheStorageModule, // For JwtAuthGuard (WorkspaceCacheStorageService)
    TokenModule, // For JwtAuthGuard (AccessTokenService)
    MktDepartmentModule,
    MktOrganizationLevelModule,
    UserManagementModule,
  ],
  providers: [
    // Configuration provider (Symbol token for type safety)
    {
      provide: ENTERPRISE_RBAC_CONFIG_TOKEN,
      useValue: ENTERPRISE_RBAC_CONFIG,
    },

    // Repositories for permission template entities
    ...RBAC_REPOSITORIES,

    // Core Services
    DepartmentTreeService,
    RbacCacheService,
    RbacContextService,
    RbacEnforcerService,
    HierarchicalAccessEvaluatorService,
    // Phase 2: Services cho PermissionContext flow
    PermissionContextService,
    FilterExpressionResolverService,
    DataAccessPolicyService,

    // DepartmentAuthorizationGuard - Custom token factory
    //
    // MUST use custom token (not class token) so external-context-creator
    // cannot find the DI instance when @UseGuards(DepartmentAuthorizationGuard).
    // This forces Yoga to create a NEW instance → resolved !== this → delegates
    // to the factory-created instance with fully working DI dependencies.
    //
    // IMPORTANT: Factory sets resolvedInstance IMMEDIATELY at creation time,
    // bypassing onModuleInit timing issues. NestJS creates module instances
    // in parallel (Promise.all), so onModuleInit order is non-deterministic.
    // Injectable instances from other modules' @UseGuards() may call
    // onModuleInit before this factory's instance.
    {
      provide: 'DEPARTMENT_AUTHORIZATION_GUARD_INIT',
      useFactory: (
        reflector: Reflector,
        rbacContextService: RbacContextService,
        cacheService: RbacCacheService,
        departmentRepository: MktDepartmentRepository,
      ) => {
        const guard = new DepartmentAuthorizationGuard(
          reflector,
          rbacContextService,
          cacheService,
          departmentRepository,
        );

        // Set resolvedInstance immediately - before any onModuleInit calls.
        // This guarantees the factory instance (with fully resolved DI deps)
        // is always used, regardless of module initialization order.
        DepartmentAuthorizationGuard.setFactoryInstance(guard);

        return guard;
      },
      inject: [
        Reflector,
        RbacContextService,
        RbacCacheService,
        MktDepartmentRepository,
      ],
    },

    // DataScopeInterceptor - Custom token factory
    //
    // Same pattern as guard: factory sets resolvedInstance immediately.
    {
      provide: 'DATA_SCOPE_INTERCEPTOR_INIT',
      useFactory: (
        reflector: Reflector,
        rbacEnforcerService: RbacEnforcerService,
        rbacContextService: RbacContextService,
        rbacCacheService: RbacCacheService,
      ) => {
        const interceptor = new DataScopeInterceptor(
          reflector,
          rbacEnforcerService,
          rbacContextService,
          rbacCacheService,
        );

        DataScopeInterceptor.setFactoryInstance(interceptor);

        return interceptor;
      },
      inject: [
        Reflector,
        RbacEnforcerService,
        RbacContextService,
        RbacCacheService,
      ],
    },

    // GraphQL Resolvers
    ...RBAC_RESOLVERS,

    // CLI Commands (rbac-seeder:sync, rbac-seeder:check, rbac-seeder:warm-cache)
    ...RBAC_COMMANDS,
  ],
  exports: [
    // Re-export department module (needed by DepartmentAuthorizationGuard, HierarchicalAccessEvaluatorService)
    MktDepartmentModule,

    // Export config token
    ENTERPRISE_RBAC_CONFIG_TOKEN,

    // Export repositories
    ...RBAC_REPOSITORIES,

    // Export core services
    DepartmentTreeService,
    RbacCacheService,
    RbacContextService,
    RbacEnforcerService,
    HierarchicalAccessEvaluatorService,
    // Phase 2: Services cho PermissionContext flow
    PermissionContextService,
    FilterExpressionResolverService,
    DataAccessPolicyService,

    // Guard & Interceptor: NOT exported as class tokens.
    // They use static singleton delegation pattern - no class token needed.
    // Factory instances (custom tokens) handle OnModuleInit → static field.
    // @UseGuards/@UseInterceptors create new instances that delegate to static.
  ],
})
export class MktRbacEnterpriseGradeModule {}
