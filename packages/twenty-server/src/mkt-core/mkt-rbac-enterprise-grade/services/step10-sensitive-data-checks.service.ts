/**
 * Step 10: Sensitive Data Checks Service
 * Validates access to sensitive financial and personal data
 * Part of the 15-step Enterprise RBAC validation process
 * Uses workspace entities only, no core module dependencies
 */

import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  EnhancedUserContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  VALIDATION_STEPS,
  STEP_PERFORMANCE_CONFIG,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

/**
 * Sensitive data classification levels
 */
enum SensitiveDataLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}

/**
 * Sensitive data categories
 */
enum SensitiveDataCategory {
  FINANCIAL = 'FINANCIAL',
  PERSONAL_IDENTIFIABLE = 'PERSONAL_IDENTIFIABLE',
  PAYMENT = 'PAYMENT',
  AUTHENTICATION = 'AUTHENTICATION',
  CONTRACT = 'CONTRACT',
  TAX_INFORMATION = 'TAX_INFORMATION',
  CUSTOMER_DATA = 'CUSTOMER_DATA',
}

/**
 * Data access context for sensitive data
 */
type SensitiveDataContext = {
  dataCategory: SensitiveDataCategory;
  sensitivityLevel: SensitiveDataLevel;
  fieldNames: string[];
  requiresSpecialPermission: boolean;
  auditRequired: boolean;
  encryptionRequired: boolean;
  retentionPolicyDays?: number;
  complianceRequirements: string[];
};

/**
 * Sensitive data evaluation result
 */
type SensitiveDataEvaluation = {
  hasAccess: boolean;
  accessLevel: 'FULL' | 'RESTRICTED' | 'MASKED' | 'DENIED';
  sensitiveFields: string[];
  restrictions: string[];
  complianceViolations: string[];
  auditRequired: boolean;
  maskedFields: string[];
  confidence: number;
  metadata: {
    dataCategories: SensitiveDataCategory[];
    highestSensitivityLevel: SensitiveDataLevel;
    appliedRestrictions: string[];
    complianceContext: string[];
  };
};

/**
 * MKT Permission Template Entity
 */
interface MktPermissionTemplateWorkspaceEntity {
  id: string;
  templateKey: string;
  templateName: string;
  description?: string;
  hierarchyLevel: number;
  applicableToLevels: Record<string, unknown>;
  version: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * MKT User Permission Template Entity
 */
interface MktUserPermissionTemplateWorkspaceEntity {
  id: string;
  isActive: boolean;
  assignedAt: Date;
  expiresAt: Date;
  assignmentReason: string;
  templateId?: string;
  workspaceMemberId?: string;
  assignedById?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * MKT Department Entity
 */
interface MktDepartmentWorkspaceEntity {
  id: string;
  departmentCode: string;
  departmentName: string;
  departmentNameEn?: string;
  description?: string;
  requiresKpiTracking?: boolean;
  allowsCrossDepartmentAccess?: boolean;
  displayOrder: number;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Template Permission Analysis Result
 */
type TemplatePermissionResult = {
  canAccessFinancial: boolean;
  canAccessPersonal: boolean;
  canAccessPayment: boolean;
  canAccessAuthentication: boolean;
  canAccessContract: boolean;
  sensitivityClearanceLevel: SensitiveDataLevel;
  restrictions: string[];
  confidence: number;
  appliedTemplates: string[];
};

/**
 * Workspace entity interfaces for sensitive data
 */
interface MktSInvoiceWorkspaceEntity {
  id: string;
  name: string;
  invoiceType?: string;
  currencyCode?: string;
  buyerTaxCode?: string;
  buyerIdNo?: string;
  buyerEmail?: string;
  buyerPhoneNumber?: string;
  totalAmountWithTax?: number;
  totalTaxAmount?: number;
  supplierTaxCode?: string;
  invoiceNo?: string;
  transactionID?: string;
  createdByWorkspaceMemberId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface WorkspaceMemberEntity {
  id: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface EnhancedUserContextWithCompliance extends EnhancedUserContext {
  hasDataDeletionRights?: boolean;
  hasPciCompliantAccess?: boolean;
  hasTaxDataModificationRights?: boolean;
  hasFinancialModificationRights?: boolean;
  hasSecurityClearance?: boolean;
}

interface MktPaymentWorkspaceEntity {
  id: string;
  name: string;
  amount?: number;
  currency: string;
  status?: string;
  paymentDate?: Date;
  invoiceId?: string;
  mktOrderId?: string;
  mktPaymentMethodId?: string;
  createdByWorkspaceMemberId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface MktContractWorkspaceEntity {
  id: string;
  name: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  mktOrderId?: string;
  accountOwnerId?: string;
  createdByWorkspaceMemberId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface ApiKeyWorkspaceEntity {
  id: string;
  name: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

@Injectable()
export class Step10SensitiveDataChecksService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(Step10SensitiveDataChecksService.name);
  readonly stepNumber = VALIDATION_STEPS.SENSITIVE_DATA_CHECKS;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.SENSITIVE_DATA_CHECKS];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.SENSITIVE_DATA_CHECKS];
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 100;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Determine if step should execute based on context
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    // Always execute sensitive data checks for comprehensive security
    return true;
  }

  /**
   * Get estimated execution time for performance planning
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return (
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.SENSITIVE_DATA_CHECKS]
        ?.estimatedExecutionTime || 400
    );
  }

  /**
   * Main validation method
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step ${this.stepNumber}: Starting sensitive data checks validation`,
      );

      // Skip if no user context
      if (!context.userContext) {
        return {
          result: CheckResult.SKIP,
          continue: false,
          reason: 'Missing user context for sensitive data checks',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: { skippedBy: 'missing_user_context' },
        };
      }

      const workspaceId = context.userContext.workspaceId || '';

      // Evaluate sensitive data access
      const evaluation = await this.evaluateSensitiveDataAccess(
        context.userContext as EnhancedUserContextWithCompliance,
        context.resourceContext?.resourceType || '',
        context.resourceContext?.recordId || '',
        context.action || '',
        workspaceId,
      );

      // Log evaluation results
      this.logger.debug('Sensitive data evaluation completed', {
        hasAccess: evaluation.hasAccess,
        accessLevel: evaluation.accessLevel,
        sensitiveFieldsCount: evaluation.sensitiveFields.length,
        complianceViolations: evaluation.complianceViolations.length,
        workspaceId,
      });

      // Determine result based on evaluation
      let result: CheckResult;
      let continueValidation = true;
      let reason: string;

      if (!evaluation.hasAccess) {
        result = CheckResult.FAIL;
        continueValidation = false;
        reason = `Sensitive data access denied: ${evaluation.restrictions.join(', ')}`;
      } else if (evaluation.complianceViolations.length > 0) {
        result = CheckResult.FAIL;
        continueValidation = false;
        reason = `Compliance violations detected: ${evaluation.complianceViolations.join(', ')}`;
      } else if (
        evaluation.accessLevel === 'RESTRICTED' ||
        evaluation.accessLevel === 'MASKED'
      ) {
        result = CheckResult.WARNING;
        continueValidation = true;
        reason = `Sensitive data access granted with restrictions (${evaluation.accessLevel})`;
      } else {
        result = CheckResult.PASS;
        continueValidation = true;
        reason = 'Sensitive data access check passed';
      }

      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      return {
        result,
        continue: continueValidation,
        reason,
        executionTime,
        metadata: {
          accessLevel: evaluation.accessLevel,
          sensitiveFieldsCount: evaluation.sensitiveFields.length,
          maskedFieldsCount: evaluation.maskedFields.length,
          complianceViolationsCount: evaluation.complianceViolations.length,
          auditRequired: evaluation.auditRequired,
          dataCategories: evaluation.metadata.dataCategories.join(','),
          highestSensitivityLevel: evaluation.metadata.highestSensitivityLevel,
          confidence: evaluation.confidence,
        },
      };
    } catch (error) {
      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      this.logger.error('Step 10 validation failed', {
        error: error.message,
        workspaceId: context.userContext?.workspaceId,
        resourceType: context.resourceContext?.resourceType,
        executionTime,
      });

      return {
        result: CheckResult.ERROR,
        continue: false,
        reason: `Sensitive data validation error: ${error.message}`,
        executionTime,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Evaluate sensitive data access permissions
   */
  private async evaluateSensitiveDataAccess(
    userContext: EnhancedUserContextWithCompliance,
    resourceType: string,
    recordId: string,
    requestedAction: string,
    workspaceId: string,
  ): Promise<SensitiveDataEvaluation> {
    // Classify data sensitivity based on resource type
    const dataContext = this.classifyDataSensitivity(resourceType);

    // Get user's sensitive data permissions
    const userPermissions = await this.getUserSensitiveDataPermissions(
      userContext.userId || '',
      userContext.workspaceMemberId,
      workspaceId,
    );

    // Check specific resource sensitivity
    const resourceSensitivity = await this.checkResourceSensitivity(
      resourceType,
      recordId,
      workspaceId,
    );

    // Evaluate access based on data classification
    const accessEvaluation = this.evaluateAccessLevel(
      dataContext,
      userPermissions,
      resourceSensitivity,
      requestedAction,
    );

    // Check compliance requirements
    const complianceCheck = this.checkComplianceRequirements(
      dataContext,
      userContext,
      requestedAction,
    );

    return {
      hasAccess: accessEvaluation.hasAccess,
      accessLevel: accessEvaluation.accessLevel,
      sensitiveFields: resourceSensitivity.sensitiveFields,
      restrictions: accessEvaluation.restrictions,
      complianceViolations: complianceCheck.violations,
      auditRequired: dataContext.auditRequired || complianceCheck.auditRequired,
      maskedFields: accessEvaluation.maskedFields,
      confidence: Math.min(
        accessEvaluation.confidence,
        complianceCheck.confidence,
        resourceSensitivity.confidence,
      ),
      metadata: {
        dataCategories: [dataContext.dataCategory],
        highestSensitivityLevel: dataContext.sensitivityLevel,
        appliedRestrictions: accessEvaluation.appliedRestrictions,
        complianceContext: complianceCheck.requirements,
      },
    };
  }

  /**
   * Classify data sensitivity based on resource type (Updated with real database structure)
   */
  private classifyDataSensitivity(resourceType: string): SensitiveDataContext {
    const sensitivityMap: Record<string, SensitiveDataContext> = {
      // ✅ High-Security Financial Data
      mktSInvoice: {
        dataCategory: SensitiveDataCategory.FINANCIAL,
        sensitivityLevel: SensitiveDataLevel.RESTRICTED,
        fieldNames: [
          'buyerTaxCode',
          'buyerIdNo',
          'buyerEmail',
          'buyerPhoneNumber',
          'buyerLegalName',
          'buyerAddressLine',
          'buyerIdType',
          'totalAmountWithTax',
          'totalTaxAmount',
          'totalAmountWithoutTax',
          'sumOfTotalLineAmountWithoutTax',
          'totalAmountAfterDiscount',
          'discountAmount',
          'supplierTaxCode',
          'invoiceNo',
          'transactionID',
          'transactionUuid',
          'reservationCode',
          'codeOfTax',
          'totalAmountWithTaxInWords',
        ],
        requiresSpecialPermission: true,
        auditRequired: true,
        encryptionRequired: true,
        retentionPolicyDays: 2555, // 7 years for tax compliance
        complianceRequirements: [
          'TAX_COMPLIANCE',
          'FINANCIAL_REPORTING',
          'GDPR',
          'VIETNAM_TAX_LAW',
        ],
      },

      // ✅ Payment Processing Data
      mktPayment: {
        dataCategory: SensitiveDataCategory.PAYMENT,
        sensitivityLevel: SensitiveDataLevel.RESTRICTED,
        fieldNames: [
          'amount',
          'currency',
          'paymentDate',
          'invoiceId',
          'qrCodeUrl',
          'status',
        ],
        requiresSpecialPermission: true,
        auditRequired: true,
        encryptionRequired: true,
        retentionPolicyDays: 2555, // 7 years
        complianceRequirements: [
          'PCI_DSS',
          'FINANCIAL_REPORTING',
          'AML',
          'PAYMENT_SECURITY',
        ],
      },

      // ✅ Customer Personal Data with Enhanced Fields
      mktCustomer: {
        dataCategory: SensitiveDataCategory.PERSONAL_IDENTIFIABLE,
        sensitivityLevel: SensitiveDataLevel.CONFIDENTIAL,
        fieldNames: [
          'personalIdNumber',
          'taxCode',
          'email',
          'phone',
          'companyName',
          'legalRepresentative',
          'bankInfo',
          'billingAddress',
          'address',
          'website',
          'assignedReason',
          'paymentPreferences',
          'socialLinks',
          'mergeSuggestion',
        ],
        requiresSpecialPermission: false,
        auditRequired: true,
        encryptionRequired: true,
        retentionPolicyDays: 2190, // 6 years for customer data
        complianceRequirements: [
          'GDPR',
          'CUSTOMER_PRIVACY',
          'DATA_RETENTION',
          'VIETNAM_PERSONAL_DATA_LAW',
        ],
      },

      // ✅ Contract & Legal Documents
      mktContract: {
        dataCategory: SensitiveDataCategory.CONTRACT,
        sensitivityLevel: SensitiveDataLevel.CONFIDENTIAL,
        fieldNames: ['status', 'startDate', 'endDate'],
        requiresSpecialPermission: false,
        auditRequired: true,
        encryptionRequired: false,
        retentionPolicyDays: 3650, // 10 years for contracts
        complianceRequirements: [
          'CONTRACT_LAW',
          'BUSINESS_RECORDS',
          'VIETNAM_COMMERCIAL_LAW',
        ],
      },

      // ✅ API Keys & Authentication
      apiKey: {
        dataCategory: SensitiveDataCategory.AUTHENTICATION,
        sensitivityLevel: SensitiveDataLevel.TOP_SECRET,
        fieldNames: ['name', 'expiresAt', 'revokedAt'],
        requiresSpecialPermission: true,
        auditRequired: true,
        encryptionRequired: true,
        retentionPolicyDays: 365, // 1 year for API keys
        complianceRequirements: [
          'SECURITY_POLICY',
          'ACCESS_CONTROL',
          'API_SECURITY',
        ],
      },

      // ✅ CRM Standard Data
      person: {
        dataCategory: SensitiveDataCategory.PERSONAL_IDENTIFIABLE,
        sensitivityLevel: SensitiveDataLevel.CONFIDENTIAL,
        fieldNames: ['email', 'phone', 'name'],
        requiresSpecialPermission: false,
        auditRequired: true,
        encryptionRequired: false,
        retentionPolicyDays: 1095, // 3 years
        complianceRequirements: ['GDPR', 'PRIVACY_POLICY'],
      },

      company: {
        dataCategory: SensitiveDataCategory.CUSTOMER_DATA,
        sensitivityLevel: SensitiveDataLevel.INTERNAL,
        fieldNames: ['name', 'domainName', 'address'],
        requiresSpecialPermission: false,
        auditRequired: false,
        encryptionRequired: false,
        retentionPolicyDays: 2190, // 6 years
        complianceRequirements: ['BUSINESS_RECORDS'],
      },

      // ✅ Employee & HR Data
      mktEmploymentStatus: {
        dataCategory: SensitiveDataCategory.PERSONAL_IDENTIFIABLE,
        sensitivityLevel: SensitiveDataLevel.CONFIDENTIAL,
        fieldNames: [
          'statusCode',
          'statusName',
          'description',
          'restrictions',
          'requiresApproval',
          'maxDuration',
        ],
        requiresSpecialPermission: false,
        auditRequired: true,
        encryptionRequired: false,
        retentionPolicyDays: 2555, // 7 years for employment records
        complianceRequirements: ['HR_COMPLIANCE', 'LABOR_LAW', 'GDPR'],
      },

      // ✅ Department & Organization Data
      mktDepartment: {
        dataCategory: SensitiveDataCategory.CUSTOMER_DATA,
        sensitivityLevel: SensitiveDataLevel.INTERNAL,
        fieldNames: [
          'departmentCode',
          'departmentName',
          'budgetCode',
          'costCenter',
          'allowsCrossDepartmentAccess',
        ],
        requiresSpecialPermission: false,
        auditRequired: false,
        encryptionRequired: false,
        retentionPolicyDays: 2555, // 7 years
        complianceRequirements: ['BUSINESS_RECORDS'],
      },

      // ✅ KPI & Performance Data
      mktKpi: {
        dataCategory: SensitiveDataCategory.CUSTOMER_DATA,
        sensitivityLevel: SensitiveDataLevel.CONFIDENTIAL,
        fieldNames: ['value', 'target', 'actual'],
        requiresSpecialPermission: false,
        auditRequired: true,
        encryptionRequired: false,
        retentionPolicyDays: 1095, // 3 years
        complianceRequirements: ['PERFORMANCE_RECORDS'],
      },

      // ✅ Order & Business Transaction Data
      mktOrder: {
        dataCategory: SensitiveDataCategory.FINANCIAL,
        sensitivityLevel: SensitiveDataLevel.CONFIDENTIAL,
        fieldNames: ['totalAmount', 'status', 'customerInfo'],
        requiresSpecialPermission: false,
        auditRequired: true,
        encryptionRequired: false,
        retentionPolicyDays: 2555, // 7 years
        complianceRequirements: ['FINANCIAL_REPORTING', 'BUSINESS_RECORDS'],
      },
    };

    return (
      sensitivityMap[resourceType] || {
        dataCategory: SensitiveDataCategory.CUSTOMER_DATA,
        sensitivityLevel: SensitiveDataLevel.INTERNAL,
        fieldNames: [],
        requiresSpecialPermission: false,
        auditRequired: false,
        encryptionRequired: false,
        retentionPolicyDays: 1095, // Default 3 years
        complianceRequirements: ['BASIC_DATA_PROTECTION'],
      }
    );
  }

  /**
   * Get user's sensitive data permissions
   */
  private async getUserSensitiveDataPermissions(
    userId: string,
    workspaceMemberId: string,
    workspaceId: string,
  ): Promise<{
    canAccessFinancial: boolean;
    canAccessPersonal: boolean;
    canAccessPayment: boolean;
    canAccessAuthentication: boolean;
    canAccessContract: boolean;
    sensitivityClearanceLevel: SensitiveDataLevel;
    restrictions: string[];
  }> {
    try {
      // Get user's permission templates
      const userTemplateRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktUserPermissionTemplateWorkspaceEntity>(
          workspaceId,
          'mktUserPermissionTemplate',
          { shouldBypassPermissionChecks: true },
        );

      const activeUserTemplates = await userTemplateRepo.find({
        where: {
          workspaceMemberId: workspaceMemberId,
          isActive: true,
        },
      });

      if (!activeUserTemplates || activeUserTemplates.length === 0) {
        return {
          canAccessFinancial: false,
          canAccessPersonal: false,
          canAccessPayment: false,
          canAccessAuthentication: false,
          canAccessContract: false,
          sensitivityClearanceLevel: SensitiveDataLevel.PUBLIC,
          restrictions: ['NO_PERMISSION_TEMPLATES'],
        };
      }

      // Filter valid (non-expired) templates
      const validTemplates = activeUserTemplates.filter((userTemplate) => {
        const now = new Date();

        return !userTemplate.expiresAt || userTemplate.expiresAt > now;
      });

      if (validTemplates.length === 0) {
        return {
          canAccessFinancial: false,
          canAccessPersonal: false,
          canAccessPayment: false,
          canAccessAuthentication: false,
          canAccessContract: false,
          sensitivityClearanceLevel: SensitiveDataLevel.PUBLIC,
          restrictions: ['ALL_TEMPLATES_EXPIRED'],
        };
      }

      // Analyze templates to determine permissions
      const permissionAnalysis = await this.analyzeTemplatePermissions(
        validTemplates,
        workspaceId,
      );

      return {
        canAccessFinancial: permissionAnalysis.canAccessFinancial,
        canAccessPersonal: permissionAnalysis.canAccessPersonal,
        canAccessPayment: permissionAnalysis.canAccessPayment,
        canAccessAuthentication: permissionAnalysis.canAccessAuthentication,
        canAccessContract: permissionAnalysis.canAccessContract,
        sensitivityClearanceLevel: permissionAnalysis.sensitivityClearanceLevel,
        restrictions: permissionAnalysis.restrictions,
      };
    } catch (error) {
      this.logger.error('Failed to get user sensitive data permissions', {
        error: error.message,
        userId,
        workspaceId,
      });

      return {
        canAccessFinancial: false,
        canAccessPersonal: false,
        canAccessPayment: false,
        canAccessAuthentication: false,
        canAccessContract: false,
        sensitivityClearanceLevel: SensitiveDataLevel.PUBLIC,
        restrictions: ['PERMISSION_CHECK_FAILED'],
      };
    }
  }

  /**
   * Check specific resource sensitivity
   */
  private async checkResourceSensitivity(
    resourceType: string,
    recordId: string,
    workspaceId: string,
  ): Promise<{
    sensitiveFields: string[];
    hasSensitiveData: boolean;
    dataAge: number;
    confidence: number;
  }> {
    try {
      const dataContext = this.classifyDataSensitivity(resourceType);

      // For demonstration, we'll check if the resource exists and classify its sensitivity
      // In a real implementation, this would analyze the actual data content

      let hasSensitiveData = false;
      let dataAge = 0;

      try {
        const repository =
          await this.twentyORMGlobalManager.getRepositoryForWorkspace(
            workspaceId,
            resourceType,
          );

        const record = await repository.findOne({
          where: { id: recordId },
        });

        if (record) {
          hasSensitiveData = dataContext.fieldNames.length > 0;
          dataAge = record.createdAt
            ? DateTime.now()
                .diff(DateTime.fromJSDate(record.createdAt))
                .as('days')
            : 0;
        }
      } catch (repositoryError) {
        this.logger.warn('Failed to access resource repository', {
          resourceType,
          recordId,
          error: repositoryError.message,
        });
      }

      return {
        sensitiveFields: dataContext.fieldNames,
        hasSensitiveData,
        dataAge,
        confidence: 0.9,
      };
    } catch (error) {
      this.logger.error('Failed to check resource sensitivity', {
        error: error.message,
        resourceType,
        recordId,
      });

      return {
        sensitiveFields: [],
        hasSensitiveData: false,
        dataAge: 0,
        confidence: 0.1,
      };
    }
  }

  /**
   * Evaluate access level based on data classification and user permissions
   */
  private evaluateAccessLevel(
    dataContext: SensitiveDataContext,
    userPermissions: {
      canAccessFinancial: boolean;
      canAccessPersonal: boolean;
      canAccessPayment: boolean;
      canAccessAuthentication: boolean;
      canAccessContract: boolean;
      sensitivityClearanceLevel: SensitiveDataLevel;
      restrictions: string[];
    },
    resourceSensitivity: {
      sensitiveFields: string[];
      hasSensitiveData: boolean;
      dataAge: number;
      confidence: number;
    },
    requestedAction: string,
  ): {
    hasAccess: boolean;
    accessLevel: 'FULL' | 'RESTRICTED' | 'MASKED' | 'DENIED';
    restrictions: string[];
    maskedFields: string[];
    confidence: number;
    appliedRestrictions: string[];
  } {
    const appliedRestrictions: string[] = [];
    const restrictions: string[] = [];
    let maskedFields: string[] = [];

    // Check category-specific permissions
    let categoryAccess = false;

    switch (dataContext.dataCategory) {
      case SensitiveDataCategory.FINANCIAL:
        categoryAccess = userPermissions.canAccessFinancial;
        break;
      case SensitiveDataCategory.PERSONAL_IDENTIFIABLE:
        categoryAccess = userPermissions.canAccessPersonal;
        break;
      case SensitiveDataCategory.PAYMENT:
        categoryAccess = userPermissions.canAccessPayment;
        break;
      case SensitiveDataCategory.AUTHENTICATION:
        categoryAccess = userPermissions.canAccessAuthentication;
        break;
      case SensitiveDataCategory.CONTRACT:
        categoryAccess = userPermissions.canAccessContract;
        break;
      case SensitiveDataCategory.CUSTOMER_DATA:
        categoryAccess = userPermissions.canAccessPersonal;
        break;
      default:
        categoryAccess = true; // Allow access to uncategorized data
    }

    if (!categoryAccess) {
      return {
        hasAccess: false,
        accessLevel: 'DENIED',
        restrictions: [`No permission for ${dataContext.dataCategory} data`],
        maskedFields: [],
        confidence: 0.95,
        appliedRestrictions: ['CATEGORY_ACCESS_DENIED'],
      };
    }

    // Check sensitivity level clearance
    const sensitivityOrder = [
      SensitiveDataLevel.PUBLIC,
      SensitiveDataLevel.INTERNAL,
      SensitiveDataLevel.CONFIDENTIAL,
      SensitiveDataLevel.RESTRICTED,
      SensitiveDataLevel.TOP_SECRET,
    ];

    const userClearanceIndex = sensitivityOrder.indexOf(
      userPermissions.sensitivityClearanceLevel,
    );
    const dataSensitivityIndex = sensitivityOrder.indexOf(
      dataContext.sensitivityLevel,
    );

    if (userClearanceIndex < dataSensitivityIndex) {
      appliedRestrictions.push('INSUFFICIENT_CLEARANCE_LEVEL');

      // Apply masking for sensitive fields
      maskedFields = resourceSensitivity.sensitiveFields;
      restrictions.push(
        `Insufficient clearance for ${dataContext.sensitivityLevel} data`,
      );

      return {
        hasAccess: true,
        accessLevel: 'MASKED',
        restrictions,
        maskedFields,
        confidence: 0.8,
        appliedRestrictions,
      };
    }

    // Apply action-specific restrictions
    if (requestedAction === 'DELETE' && dataContext.retentionPolicyDays) {
      const dataAge = resourceSensitivity.dataAge;

      if (dataAge < dataContext.retentionPolicyDays) {
        appliedRestrictions.push('RETENTION_POLICY_VIOLATION');
        restrictions.push(
          `Data retention policy prevents deletion for ${dataContext.retentionPolicyDays - dataAge} more days`,
        );

        return {
          hasAccess: false,
          accessLevel: 'DENIED',
          restrictions,
          maskedFields: [],
          confidence: 0.9,
          appliedRestrictions,
        };
      }
    }

    // Apply write restrictions for highly sensitive data
    if (
      requestedAction === 'WRITE' &&
      dataContext.sensitivityLevel === SensitiveDataLevel.TOP_SECRET
    ) {
      appliedRestrictions.push('TOP_SECRET_WRITE_RESTRICTION');
      restrictions.push(
        'Write access to top secret data requires additional approval',
      );

      return {
        hasAccess: true,
        accessLevel: 'RESTRICTED',
        restrictions,
        maskedFields: [],
        confidence: 0.85,
        appliedRestrictions,
      };
    }

    // Full access granted
    return {
      hasAccess: true,
      accessLevel: 'FULL',
      restrictions: [],
      maskedFields: [],
      confidence: 0.95,
      appliedRestrictions,
    };
  }

  /**
   * Check compliance requirements
   */
  private checkComplianceRequirements(
    dataContext: SensitiveDataContext,
    userContext: EnhancedUserContextWithCompliance,
    requestedAction: string,
  ): {
    violations: string[];
    auditRequired: boolean;
    confidence: number;
    requirements: string[];
  } {
    const violations: string[] = [];
    const requirements = dataContext.complianceRequirements;
    let auditRequired = false;

    // Check each compliance requirement
    for (const requirement of requirements) {
      switch (requirement) {
        case 'GDPR': {
          const hasDataDeletionRights =
            userContext.hasDataDeletionRights || false;

          if (requestedAction === 'DELETE' && !hasDataDeletionRights) {
            violations.push(
              'GDPR data deletion requires explicit user consent',
            );
          }
          auditRequired = true;
          break;
        }

        case 'PCI_DSS':
          if (
            requestedAction === 'READ' &&
            !userContext.hasPciCompliantAccess
          ) {
            violations.push(
              'PCI DSS compliance required for payment data access',
            );
          }
          auditRequired = true;
          break;

        case 'TAX_COMPLIANCE':
          if (
            requestedAction === 'WRITE' &&
            !userContext.hasTaxDataModificationRights
          ) {
            violations.push(
              'Tax compliance violation: unauthorized tax data modification',
            );
          }
          auditRequired = true;
          break;

        case 'FINANCIAL_REPORTING':
          if (
            requestedAction !== 'READ' &&
            !userContext.hasFinancialModificationRights
          ) {
            violations.push(
              'Financial reporting compliance requires read-only access',
            );
          }
          auditRequired = true;
          break;

        case 'SECURITY_POLICY':
          if (!userContext.hasSecurityClearance) {
            violations.push(
              'Security policy violation: insufficient security clearance',
            );
          }
          auditRequired = true;
          break;

        default:
          // Unknown compliance requirement - log for investigation
          this.logger.warn('Unknown compliance requirement encountered', {
            requirement,
            dataCategory: dataContext.dataCategory,
          });
      }
    }

    return {
      violations,
      auditRequired,
      confidence: 0.9,
      requirements,
    };
  }

  /**
   * Analyze permission templates to determine sensitive data access
   */
  private async analyzeTemplatePermissions(
    userTemplates: MktUserPermissionTemplateWorkspaceEntity[],
    workspaceId: string,
  ): Promise<TemplatePermissionResult> {
    try {
      const templateRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionTemplateWorkspaceEntity>(
          workspaceId,
          'mktPermissionTemplate',
          { shouldBypassPermissionChecks: true },
        );

      const permissions: TemplatePermissionResult = {
        canAccessFinancial: false,
        canAccessPersonal: false,
        canAccessPayment: false,
        canAccessAuthentication: false,
        canAccessContract: false,
        sensitivityClearanceLevel: SensitiveDataLevel.PUBLIC,
        restrictions: [],
        confidence: 0,
        appliedTemplates: [],
      };

      let maxHierarchyLevel = 0;
      const appliedTemplateKeys: string[] = [];

      for (const userTemplate of userTemplates) {
        if (!userTemplate.templateId) continue;

        const template = await templateRepo.findOne({
          where: {
            id: userTemplate.templateId,
            isActive: true,
          },
        });

        if (template) {
          // Apply template permissions based on templateKey
          this.applyTemplatePermissions(template, permissions);

          // Track hierarchy level for clearance determination
          if (template.hierarchyLevel > maxHierarchyLevel) {
            maxHierarchyLevel = template.hierarchyLevel;
          }

          appliedTemplateKeys.push(template.templateKey);
        }
      }

      // Determine sensitivity clearance level based on hierarchy
      permissions.sensitivityClearanceLevel =
        this.determineClearanceLevel(maxHierarchyLevel);
      permissions.appliedTemplates = appliedTemplateKeys;
      permissions.confidence = Math.min(
        0.9,
        0.5 + appliedTemplateKeys.length * 0.1,
      );

      this.logger.debug('Template permission analysis completed', {
        userId: userTemplates[0]?.workspaceMemberId,
        appliedTemplates: appliedTemplateKeys.length,
        clearanceLevel: permissions.sensitivityClearanceLevel,
        workspaceId,
      });

      return permissions;
    } catch (error) {
      this.logger.error('Failed to analyze template permissions', {
        error: error.message,
        workspaceId,
      });

      return {
        canAccessFinancial: false,
        canAccessPersonal: false,
        canAccessPayment: false,
        canAccessAuthentication: false,
        canAccessContract: false,
        sensitivityClearanceLevel: SensitiveDataLevel.PUBLIC,
        restrictions: ['TEMPLATE_ANALYSIS_FAILED'],
        confidence: 0.1,
        appliedTemplates: [],
      };
    }
  }

  /**
   * Apply permissions from a specific template
   */
  private applyTemplatePermissions(
    template: MktPermissionTemplateWorkspaceEntity,
    permissions: TemplatePermissionResult,
  ): void {
    // Analyze templateKey to determine specific permissions
    const templateKey = template.templateKey.toLowerCase();

    // Financial access templates
    if (
      templateKey.includes('financial') ||
      templateKey.includes('accounting') ||
      templateKey.includes('invoice') ||
      templateKey.includes('admin')
    ) {
      permissions.canAccessFinancial = true;
    }

    // Payment access templates
    if (
      templateKey.includes('payment') ||
      templateKey.includes('billing') ||
      templateKey.includes('cashier') ||
      templateKey.includes('admin')
    ) {
      permissions.canAccessPayment = true;
    }

    // Personal data access templates
    if (
      templateKey.includes('hr') ||
      templateKey.includes('personal') ||
      templateKey.includes('employee') ||
      templateKey.includes('manager') ||
      templateKey.includes('admin')
    ) {
      permissions.canAccessPersonal = true;
    }

    // Authentication access templates
    if (
      templateKey.includes('security') ||
      templateKey.includes('admin') ||
      templateKey.includes('system')
    ) {
      permissions.canAccessAuthentication = true;
    }

    // Contract access templates
    if (
      templateKey.includes('contract') ||
      templateKey.includes('legal') ||
      templateKey.includes('manager') ||
      templateKey.includes('admin')
    ) {
      permissions.canAccessContract = true;
    }

    // System templates have higher privileges
    if (template.isSystemTemplate) {
      permissions.canAccessFinancial = true;
      permissions.canAccessPayment = true;
      permissions.canAccessPersonal = true;
      permissions.canAccessAuthentication = true;
      permissions.canAccessContract = true;
    }
  }

  /**
   * Determine clearance level based on hierarchy level
   */
  private determineClearanceLevel(hierarchyLevel: number): SensitiveDataLevel {
    if (hierarchyLevel >= 9) {
      return SensitiveDataLevel.TOP_SECRET; // Executive level
    } else if (hierarchyLevel >= 7) {
      return SensitiveDataLevel.RESTRICTED; // Senior management
    } else if (hierarchyLevel >= 5) {
      return SensitiveDataLevel.CONFIDENTIAL; // Middle management
    } else if (hierarchyLevel >= 3) {
      return SensitiveDataLevel.INTERNAL; // Team leads
    } else {
      return SensitiveDataLevel.PUBLIC; // Regular employees
    }
  }
}
