import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { ObjectMetadataModule } from 'src/engine/metadata-modules/object-metadata/object-metadata.module';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';

// Services
import { Step1PreValidationService } from './services/step1-pre-validation.service';
import { ValidationOrchestratorService } from './services/validation-orchestrator.service';
import { Step2UserContextResolutionService } from './services/step2-user-context-resolution.service';
import { Step3ResourceIdentificationService } from './services/step3-resource-identification.service';
import { PermissionTemplateService } from './services/permission-template.service';
import { RbacCacheService } from './services/rbac-cache.service';
import { AuditLoggingService } from './services/audit-logging.service';
import { EnterpriseRbacGuard } from './guards/enterprise-rbac.guard';

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
 * Standard static module with all services enabled
 */
@Module({
  imports: [
    TwentyORMModule,
    ObjectMetadataModule,
    TypeOrmModule.forFeature([ObjectMetadataEntity], 'core'),
  ],
  providers: [
    // Configuration provider
    {
      provide: 'ENTERPRISE_RBAC_CONFIG',
      useValue: DEFAULT_CONFIG,
    },

    // All validation services
    Step1PreValidationService,
    Step2UserContextResolutionService,
    Step3ResourceIdentificationService,
    ValidationOrchestratorService,

    // Supporting services
    PermissionTemplateService,
    RbacCacheService,
    AuditLoggingService,

    // Guard
    EnterpriseRbacGuard,
  ],
  exports: [
    // Export all services
    Step1PreValidationService,
    Step2UserContextResolutionService,
    Step3ResourceIdentificationService,
    ValidationOrchestratorService,
    PermissionTemplateService,
    RbacCacheService,
    AuditLoggingService,
    EnterpriseRbacGuard,
    'ENTERPRISE_RBAC_CONFIG',
  ],
})
export class MktRbacEnterpriseGradeModule {}
