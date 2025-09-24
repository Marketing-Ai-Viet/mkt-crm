import { Module, DynamicModule, Global } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { ObjectMetadataModule } from 'src/engine/metadata-modules/object-metadata/object-metadata.module';

// Services
import { Step1PreValidationService } from './services/step1-pre-validation.service';
import { ValidationOrchestratorService } from './services/validation-orchestrator.service';
import { Step2UserContextResolutionService } from './services/step2-user-context-resolution.service';
import { ResourceIdentificationService } from './services/resource-identification.service';
import { PermissionTemplateService } from './services/permission-template.service';
import { RbacCacheService } from './services/rbac-cache.service';
import { AuditLoggingService } from './services/audit-logging.service';
import { EnterpriseRbacGuard } from './guards/enterprise-rbac.guard';

// Configuration interface
export interface EnterpriseRbacModuleOptions {
  // Feature flags
  enable15StepValidation?: boolean;
  enableHierarchyValidation?: boolean;
  enablePolicyEngine?: boolean;
  enableDynamicConditions?: boolean;
  enableSensitiveDataControls?: boolean;

  // Performance settings
  enableCaching?: boolean;
  enableParallelExecution?: boolean;
  enableEarlyExit?: boolean;

  // Security settings
  enableAuditLogging?: boolean;
  enableSecurityMonitoring?: boolean;
  enableComplianceChecks?: boolean;

  // Development settings
  enableDebugMode?: boolean;
  enableMetrics?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EnterpriseRbacModuleOptions = {
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
};

/**
 * Enterprise RBAC Module
 */
@Global()
@Module({})
export class MktRbacEnterpriseGradeModule {
  /**
   * Register the module synchronously with default configuration
   */
  static register(
    options?: Partial<EnterpriseRbacModuleOptions>,
  ): DynamicModule {
    const config = { ...DEFAULT_CONFIG, ...options };

    return {
      module: MktRbacEnterpriseGradeModule,
      imports: [TwentyORMModule, ObjectMetadataModule],
      providers: [
        // Configuration provider
        {
          provide: 'ENTERPRISE_RBAC_CONFIG',
          useValue: config,
        },

        // Core services
        Step1PreValidationService,
        ValidationOrchestratorService,
        Step2UserContextResolutionService,
        ResourceIdentificationService,
        PermissionTemplateService,
        RbacCacheService,
        AuditLoggingService,

        // Guards
        EnterpriseRbacGuard,
      ],
      exports: [
        // Export main services for use in other modules
        Step1PreValidationService,
        ValidationOrchestratorService,
        Step2UserContextResolutionService,
        ResourceIdentificationService,
        PermissionTemplateService,
        RbacCacheService,
        AuditLoggingService,
        EnterpriseRbacGuard,
        'ENTERPRISE_RBAC_CONFIG',
      ],
    };
  }
}
