import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { AuditLoggingService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/audit-logging.service';
import { EnterpriseRbacGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/guards/enterprise-rbac.guard';
import { PermissionTemplateService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/permission-template.service';
import { Step1PreValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step1-pre-validation.service';
import { Step2UserContextResolutionService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step2-user-context-resolution.service';
import { Step3ResourceIdentificationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step3-resource-identification.service';
import { Step4PermissionTemplateCheckService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step4-permission-template-check.service';
import { Step5ActionPermissionValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step5-action-permission-validation.service';
import { Step6ResourcePermissionCheckService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step6-resource-permission-check.service';
import { Step7HierarchyValidationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step7-hierarchy-validation.service';
import { ValidationOrchestratorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/validation-orchestrator.service';

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
  imports: [TwentyORMModule],
  providers: [
    // Configuration provider
    {
      provide: 'ENTERPRISE_RBAC_CONFIG',
      useValue: DEFAULT_CONFIG,
    },

    // Safe cache provider that won't hang seed operations,

    // Other services
    Step1PreValidationService,
    Step2UserContextResolutionService,
    Step3ResourceIdentificationService,
    Step4PermissionTemplateCheckService,
    Step5ActionPermissionValidationService,
    Step6ResourcePermissionCheckService,
    Step7HierarchyValidationService,
    ValidationOrchestratorService,
    PermissionTemplateService,
    AuditLoggingService,
    EnterpriseRbacGuard,
  ],
  exports: [
    // Export services
    // RbacCacheService,
    'ENTERPRISE_RBAC_CONFIG',

    Step1PreValidationService,
    Step2UserContextResolutionService,
    Step3ResourceIdentificationService,
    Step4PermissionTemplateCheckService,
    Step5ActionPermissionValidationService,
    Step6ResourcePermissionCheckService,
    Step7HierarchyValidationService,
    ValidationOrchestratorService,
    PermissionTemplateService,
    AuditLoggingService,
    EnterpriseRbacGuard,
  ],
})
export class MktRbacEnterpriseGradeModule {}
