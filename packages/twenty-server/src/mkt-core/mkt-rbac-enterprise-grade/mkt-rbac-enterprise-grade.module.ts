import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';
import { MktOrganizationLevelModule } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.module';
import { CasbinModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/casbin.module';
import { RBAC_COMMANDS } from 'src/mkt-core/mkt-rbac-enterprise-grade/commands';
import {
  ENTERPRISE_RBAC_CONFIG,
  ENTERPRISE_RBAC_CONFIG_TOKEN,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/configs';
import {
  RBAC_REPOSITORIES,
  MktUserPermissionOverrideRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktDepartmentRepository } from 'src/mkt-core/mkt-department/repositories';
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
 * Provides comprehensive role-based access control powered by Casbin:
 * - Multi-tenant authorization with workspace isolation
 * - Role-based and attribute-based access control
 * - Policy sync from permission templates
 * - Real-time policy updates via PostgreSQL NOTIFY
 * - Permission caching for performance
 * - Audit logging and metrics
 * - CLI commands for management
 *
 * Configuration:
 * Uses ENTERPRISE_RBAC_CONFIG_TOKEN (Symbol) for type-safe injection:
 * ```typescript
 * constructor(
 *   @Inject(ENTERPRISE_RBAC_CONFIG_TOKEN)
 *   private readonly config: EnterpriseRbacConfigType,
 * ) {}
 * ```
 *
 * Usage:
 * ```typescript
 * // In resolver
 * @RequirePermission('mktCustomer', 'read')
 * async mktCustomers(): Promise<MktCustomer[]> { ... }
 * ```
 */
@Global()
@Module({
  imports: [
    TwentyORMModule,
    CacheStorageModule,
    WorkspaceCacheStorageModule, // For JwtAuthGuard (WorkspaceCacheStorageService)
    TokenModule, // For JwtAuthGuard (AccessTokenService)
    CasbinModule,
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

    // Global Guard for @RequireDepartment decorator
    // Using APP_GUARD with factory to ensure proper dependency injection
    // The guard checks for DEPARTMENT_AUTH_KEY metadata and skips if not present
    {
      provide: APP_GUARD,
      useFactory: (
        reflector: Reflector,
        rbacContextService: RbacContextService,
        overrideRepository: MktUserPermissionOverrideRepository,
        cacheService: RbacCacheService,
        departmentRepository: MktDepartmentRepository,
      ) =>
        new DepartmentAuthorizationGuard(
          reflector,
          rbacContextService,
          overrideRepository,
          cacheService,
          departmentRepository,
        ),
      inject: [
        Reflector,
        RbacContextService,
        MktUserPermissionOverrideRepository,
        RbacCacheService,
        MktDepartmentRepository,
      ],
    },

    // Global Interceptor for @DataScope decorator
    // Using factory provider to explicitly inject all dependencies
    // The interceptor checks for @DataScope metadata and skips if not present
    {
      provide: APP_INTERCEPTOR,
      useFactory: (
        reflector: Reflector,
        rbacEnforcerService: RbacEnforcerService,
        rbacContextService: RbacContextService,
        rbacCacheService: RbacCacheService,
      ) =>
        new DataScopeInterceptor(
          reflector,
          rbacEnforcerService,
          rbacContextService,
          rbacCacheService,
        ),
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
    // Export Casbin module (guards, decorators, services)
    CasbinModule,

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

    // Note: DepartmentAuthorizationGuard is now a global guard via APP_GUARD
    // Note: DataScopeInterceptor is now a global interceptor via APP_INTERCEPTOR
    // No need to export it - it will automatically run for methods with @DataScope decorator
  ],
})
export class MktRbacEnterpriseGradeModule {}
