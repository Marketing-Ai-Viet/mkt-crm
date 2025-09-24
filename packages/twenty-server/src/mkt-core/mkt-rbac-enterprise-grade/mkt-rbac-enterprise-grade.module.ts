import { Module, DynamicModule } from '@nestjs/common';

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
import { MinimalEnterpriseRbacGuard } from './guards/minimal-enterprise-rbac.guard';

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
 * Modified to avoid circular dependencies and initialization issues
 */
@Module({})
export class MktRbacEnterpriseGradeModule {
  /**
   * Register the module asynchronously with proper dependency management
   */
  static register(
    options?: Partial<EnterpriseRbacModuleOptions>,
  ): DynamicModule {
    const config = { ...DEFAULT_CONFIG, ...options };

    // Determine which guard to use based on configuration
    const guardToUse = config.enable15StepValidation
      ? EnterpriseRbacGuard
      : MinimalEnterpriseRbacGuard;

    return {
      module: MktRbacEnterpriseGradeModule,
      imports: [
        // Only import TwentyORMModule if actually needed
        ...(config.enablePolicyEngine ? [TwentyORMModule] : []),
        ...(config.enableHierarchyValidation ? [ObjectMetadataModule] : []),
      ],
      providers: [
        // Configuration provider
        {
          provide: 'ENTERPRISE_RBAC_CONFIG',
          useValue: config,
        },

        // Only register services that are actually needed based on config
        ...(config.enable15StepValidation
          ? [Step1PreValidationService, ValidationOrchestratorService]
          : []),

        ...(config.enableHierarchyValidation
          ? [Step2UserContextResolutionService, ResourceIdentificationService]
          : []),

        ...(config.enablePolicyEngine ? [PermissionTemplateService] : []),

        ...(config.enableCaching ? [RbacCacheService] : []),

        ...(config.enableAuditLogging ? [AuditLoggingService] : []),

        // Use appropriate guard based on configuration
        guardToUse,
      ],
      exports: [
        // Only export what's actually provided
        ...(config.enable15StepValidation
          ? [Step1PreValidationService, ValidationOrchestratorService]
          : []),

        ...(config.enableHierarchyValidation
          ? [Step2UserContextResolutionService, ResourceIdentificationService]
          : []),

        ...(config.enablePolicyEngine ? [PermissionTemplateService] : []),

        ...(config.enableCaching ? [RbacCacheService] : []),

        ...(config.enableAuditLogging ? [AuditLoggingService] : []),

        // Export the appropriate guard
        guardToUse,
        'ENTERPRISE_RBAC_CONFIG',
      ],
    };
  }

  /**
   * Register with minimal configuration for development/seeding
   * This version loads only essential services to avoid blocking
   */
  static registerMinimal(): DynamicModule {
    return this.register({
      enable15StepValidation: false,
      enableHierarchyValidation: false,
      enablePolicyEngine: false,
      enableDynamicConditions: false,
      enableSensitiveDataControls: false,
      enableCaching: false,
      enableParallelExecution: false,
      enableAuditLogging: false,
      enableSecurityMonitoring: false,
      enableComplianceChecks: false,
      enableDebugMode: true,
    });
  }
}
