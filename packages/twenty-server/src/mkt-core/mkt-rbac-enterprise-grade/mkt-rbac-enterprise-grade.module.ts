import { Module } from '@nestjs/common';

// import { ScheduleModule } from '@nestjs/schedule'; // Enable when jobs are activated
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
// Guards & Interceptors
import { EnterpriseRbacGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/guards/enterprise-rbac.guard';
import { AuditLoggingInterceptor } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/audit-logging.interceptor';
// Validation Step Services
import { Step1PreValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step1-pre-validation.service';
import { Step2UserContextResolutionService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step2-user-context-resolution.service';
import { Step3ResourceIdentificationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step3-resource-identification.service';
import { Step4PermissionTemplateCheckService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step4-permission-template-check.service';
import { Step5ActionPermissionValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step5-action-permission-validation.service';
import { Step6ResourcePermissionCheckService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step6-resource-permission-check.service';
import { Step7HierarchyValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step7-hierarchy-validation.service';
import { Step8DataAccessPolicyCheckService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step8-data-access-policy-check.service';
import { Step9SpecialPermissionsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step9-special-permissions.service';
import { Step10SensitiveDataChecksService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step10-sensitive-data-checks.service';
import { Step11DepartmentRestrictionsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step11-department-restrictions.service';
import { Step12DynamicConditionsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step12-dynamic-conditions.service';
import { Step13CachePerformanceService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step13-cache-performance.service';
import { Step14AuditLoggingService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step14-audit-logging.service';
import { Step15FinalDecisionService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step15-final-decision.service';
// Core Services
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache-manager.service';
import { ValidationOrchestratorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/validation-orchestrator.service';
import { HierarchyLevelService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/hierarchy-level.service';
// Infrastructure Services
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/infrastructure/rbac-cache.service';
// Repositories
import { RBAC_REPOSITORIES } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';

// Hooks - currently disabled
// import { RBAC_HOOKS } from 'src/mkt-core/mkt-rbac-enterprise-grade/hooks';

// Listeners - currently disabled
// import { RBAC_LISTENERS } from 'src/mkt-core/mkt-rbac-enterprise-grade/listeners';

// Jobs - currently disabled
// import { RBAC_JOBS } from 'src/mkt-core/mkt-rbac-enterprise-grade/jobs';

// Resolvers - currently disabled
// import { RBAC_RESOLVERS } from 'src/mkt-core/mkt-rbac-enterprise-grade/resolvers';

/**
 * Default configuration for Enterprise RBAC
 */
const DEFAULT_CONFIG = {
  // Feature flags
  enable15StepValidation: true,
  enableHierarchyValidation: true,
  enablePolicyEngine: true,
  enableDynamicConditions: true,
  enableSensitiveDataControls: true,

  // Performance settings
  enableCaching: true,
  enableParallelExecution: true,
  enableEarlyExit: true,

  // Security settings
  enableAuditLogging: true,
  enableSecurityMonitoring: true,
  enableComplianceChecks: true,

  // Development settings
  enableDebugMode: false,
  enableMetrics: true,
} as const;

/**
 * Enterprise RBAC Module
 *
 * Provides comprehensive role-based access control with:
 * - 15-step validation pipeline (simplified 5-step mode available)
 * - Organizational hierarchy support
 * - Data access policies
 * - Audit logging
 * - Cache management
 * - Background jobs for cleanup
 */
@Module({
  imports: [
    TwentyORMModule,
    CacheStorageModule,
    // ScheduleModule.forRoot(), // Enable when jobs are activated
  ],
  providers: [
    // Configuration provider
    {
      provide: 'ENTERPRISE_RBAC_CONFIG',
      useValue: DEFAULT_CONFIG,
    },

    // Cache services
    RbacCacheManagerService,
    RbacCacheService,

    // Step services
    Step1PreValidationService,
    Step2UserContextResolutionService,
    Step3ResourceIdentificationService,
    Step4PermissionTemplateCheckService,
    Step5ActionPermissionValidationService,
    Step6ResourcePermissionCheckService,
    Step7HierarchyValidationService,
    Step8DataAccessPolicyCheckService,
    Step9SpecialPermissionsService,
    Step10SensitiveDataChecksService,
    Step11DepartmentRestrictionsService,
    Step12DynamicConditionsService,
    Step13CachePerformanceService,
    Step14AuditLoggingService,
    Step15FinalDecisionService,

    // Orchestrator
    ValidationOrchestratorService,

    // Interceptors and Guards
    AuditLoggingInterceptor,
    EnterpriseRbacGuard,

    // Hierarchy level service
    HierarchyLevelService,

    // Repositories
    ...RBAC_REPOSITORIES,

    // Hooks - currently disabled, enable when repository methods are implemented
    // ...RBAC_HOOKS,

    // Listeners - currently disabled, enable when service methods are implemented
    // ...RBAC_LISTENERS,

    // Jobs - currently disabled, enable when repository methods are implemented
    // ...RBAC_JOBS,

    // Resolvers - currently disabled, enable when service methods are implemented
    // ...RBAC_RESOLVERS,
  ],
  exports: [
    // Export config
    'ENTERPRISE_RBAC_CONFIG',

    // Export services
    RbacCacheManagerService,
    RbacCacheService,

    // Export step services
    Step1PreValidationService,
    Step2UserContextResolutionService,
    Step3ResourceIdentificationService,
    Step4PermissionTemplateCheckService,
    Step5ActionPermissionValidationService,
    Step6ResourcePermissionCheckService,
    Step7HierarchyValidationService,
    Step8DataAccessPolicyCheckService,
    Step9SpecialPermissionsService,
    Step10SensitiveDataChecksService,
    Step11DepartmentRestrictionsService,
    Step12DynamicConditionsService,
    Step13CachePerformanceService,
    Step14AuditLoggingService,
    Step15FinalDecisionService,

    // Export orchestrator
    ValidationOrchestratorService,

    // Export interceptors and guards
    AuditLoggingInterceptor,
    EnterpriseRbacGuard,

    // Export repositories
    ...RBAC_REPOSITORIES,
  ],
})
export class MktRbacEnterpriseGradeModule {}
