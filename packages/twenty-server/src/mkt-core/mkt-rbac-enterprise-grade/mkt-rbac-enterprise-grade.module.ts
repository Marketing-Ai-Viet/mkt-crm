import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { EnterpriseRbacGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/guards/enterprise-rbac.guard';
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
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache-manager.service';
import { ValidationOrchestratorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/validation-orchestrator.service';
import { AuditLoggingInterceptor } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/audit-logging.interceptor';

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
 * Updated with proper cache lifecycle management
 */
@Module({
  imports: [TwentyORMModule, CacheStorageModule],
  providers: [
    // Configuration provider
    {
      provide: 'ENTERPRISE_RBAC_CONFIG',
      useValue: DEFAULT_CONFIG,
    },

    // Cache services
    RbacCacheManagerService,

    // Other services
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
    ValidationOrchestratorService,
    AuditLoggingInterceptor,
    EnterpriseRbacGuard,
  ],
  exports: [
    // Export services
    'ENTERPRISE_RBAC_CONFIG',
    RbacCacheManagerService,

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
    ValidationOrchestratorService,
    AuditLoggingInterceptor,
    EnterpriseRbacGuard,
  ],
})
export class MktRbacEnterpriseGradeModule {}
