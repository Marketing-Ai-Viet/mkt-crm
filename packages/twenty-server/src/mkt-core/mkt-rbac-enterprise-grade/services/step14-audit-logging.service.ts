/**
 * Step 14: Audit & Logging Service
 * Comprehensive audit trail and security logging for RBAC operations
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
  PermissionAction,
  PermissionSource,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-permission-audit/mkt-permission-audit.workspace-entity';

/**
 * Audit event severity levels
 */
enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit event categories
 */
enum AuditEventCategory {
  PERMISSION = 'PERMISSION',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  SYSTEM = 'SYSTEM',
  DATA_ACCESS = 'DATA_ACCESS',
}

/**
 * Audit event types
 */
enum AuditEventType {
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE',
  BULK_OPERATION = 'BULK_OPERATION',
}

/**
 * Compliance frameworks
 */
enum ComplianceFramework {
  GDPR = 'GDPR',
  SOX = 'SOX',
  PCI_DSS = 'PCI_DSS',
  SOC_2 = 'SOC_2',
  ISO_27001 = 'ISO_27001',
  VIETNAM_LAW = 'VIETNAM_LAW',
}

/**
 * Risk assessment levels
 */
enum RiskLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit log entry structure
 */
type AuditLogEntry = {
  id: string;
  eventType: AuditEventType;
  eventCategory: AuditEventCategory;
  severity: AuditSeverity;
  riskLevel: RiskLevel;

  // Context information
  userId: string;
  workspaceId: string;
  workspaceMemberId: string;
  sessionId?: string;
  requestId?: string;

  // Action details
  action: string;
  resourceType: string;
  resourceId?: string;
  recordId?: string;

  // Result information
  result: 'GRANTED' | 'DENIED' | 'ERROR' | 'WARNING';
  reason: string;
  riskScore: number;

  // Sensitive data flags
  involvesSensitiveData: boolean;
  involvesPersonalData: boolean;
  involvesFinancialData: boolean;
  dataClassification: string;

  // Compliance tracking
  complianceFrameworks: ComplianceFramework[];
  requiresApproval: boolean;
  retentionPeriodDays: number;

  // Security context
  ipAddress: string;
  userAgent: string;
  geolocation?: string;
  deviceFingerprint?: string;

  // Validation details
  validationSteps: string[];
  failedSteps: string[];
  executionTimeMs: number;

  // Additional metadata
  metadata: Record<string, unknown>;
  details: Record<string, unknown>;

  // Timestamps
  timestamp: Date;
  createdAt: Date;
  updatedAt?: Date;

  // Processing status
  processed: boolean;
  alertGenerated: boolean;
  notificationSent: boolean;
  archived: boolean;
};

/**
 * Security alert structure (stored in audit log requestContext)
 */
type SecurityAlert = {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  userId: string;
  riskScore: number;
  businessImpact: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  relatedAuditIds: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
};

/**
 * Compliance report structure
 */
type ComplianceReport = {
  id: string;
  reportType: 'PERIODIC' | 'ON_DEMAND' | 'INCIDENT';
  framework: ComplianceFramework;
  period: {
    startDate: Date;
    endDate: Date;
  };

  // Statistics
  totalAuditEntries: number;
  totalPermissionChecks: number;
  totalDenials: number;
  totalErrors: number;
  totalSensitiveDataAccess: number;

  // Compliance metrics
  complianceScore: number;
  violations: string[];
  recommendations: string[];

  // Generation metadata
  generatedAt: Date;
  generatedBy: string;
  dataRetentionDays: number;
};

/**
 * Enhanced audit entry structure for comprehensive logging
 * Maps to MktPermissionAuditWorkspaceEntity
 */
type EnhancedAuditEntry = {
  // Core audit data that maps to MktPermissionAuditWorkspaceEntity
  workspaceMemberId: string;
  userId?: string;
  action: string;
  objectName: string;
  recordId?: string;
  permissionSource?: string;
  checkResult: CheckResult;
  denialReason?: string;
  ipAddress?: string;
  userAgent?: string;
  checkDurationMs?: number;

  // Enhanced context stored in requestContext JSON field
  requestContext: {
    requestId?: string;
    sessionId?: string;
    resourceType: string;
    riskScore: number;
    severity: string;
    eventType: string;
    eventCategory: string;
    involvesSensitiveData: boolean;
    involvesPersonalData: boolean;
    involvesFinancialData: boolean;
    complianceFrameworks: string[];
    validationSteps: string[];
    failedSteps: string[];
    metadata: Record<string, unknown>;
    securityAlert?: SecurityAlert;
  };
};

/**
 * Pattern detection result
 */
type PatternDetectionResult = {
  detected: boolean;
  patternType: string;
  confidence: number;
  riskIncrease: number;
  details: Record<string, unknown>;
};

@Injectable()
export class Step14AuditLoggingService implements PermissionValidationStep {
  private readonly logger = new Logger(Step14AuditLoggingService.name);
  readonly stepNumber = VALIDATION_STEPS.AUDIT_LOGGING;
  readonly stepName = VALIDATION_STEP_NAMES[VALIDATION_STEPS.AUDIT_LOGGING];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.AUDIT_LOGGING];
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 10; // High priority for audit logging

  // Configuration constants
  private readonly MAX_RISK_SCORE = 100;
  private readonly HIGH_RISK_THRESHOLD = 70;
  private readonly CRITICAL_RISK_THRESHOLD = 90;
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10; // requests per minute
  private readonly DEFAULT_RETENTION_DAYS = 365;
  private readonly SENSITIVE_DATA_RETENTION_DAYS = 2555; // 7 years
  private readonly FINANCIAL_DATA_RETENTION_DAYS = 2555; // 7 years

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Determine if step should execute based on context
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    // Always execute audit logging for comprehensive security tracking
    return true;
  }

  /**
   * Get estimated execution time for performance planning
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return (
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.AUDIT_LOGGING]
        ?.estimatedExecutionTime || 200
    );
  }

  /**
   * Main validation method - performs audit logging
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step ${this.stepNumber}: Starting audit logging for user ${context.userContext?.userId}`,
      );

      // Skip if no user context
      if (!context.userContext) {
        return {
          result: CheckResult.SKIP,
          continue: true,
          reason: 'Missing user context for audit logging',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: { skippedBy: 'missing_user_context' },
        };
      }

      const workspaceId = context.userContext.workspaceId || '';

      // Create comprehensive audit log entry
      const auditEntry = await this.createAuditLogEntry(context, stepStartTime);

      // Store audit log in workspace database
      const auditLogId = await this.storeAuditLog(auditEntry, workspaceId);

      // Analyze patterns and generate alerts if necessary
      const alertGenerated = await this.analyzeAndGenerateAlerts(
        auditEntry,
        context,
        workspaceId,
        auditLogId,
      );

      // Check compliance requirements
      const complianceChecks = await this.performComplianceChecks(
        auditEntry,
        context,
      );

      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      this.logger.debug('Audit logging completed successfully', {
        userId: context.userContext.userId,
        workspaceId,
        alertGenerated,
        complianceFrameworks:
          auditEntry.requestContext.complianceFrameworks.length,
        riskScore: auditEntry.requestContext.riskScore,
        executionTime,
      });

      return {
        result: CheckResult.PASS,
        continue: true,
        reason: 'Audit logging completed successfully',
        executionTime,
        metadata: {
          auditLogId,
          riskScore: auditEntry.requestContext.riskScore,
          alertGenerated,
          complianceFrameworks:
            auditEntry.requestContext.complianceFrameworks.join(','),
          involvesSensitiveData:
            auditEntry.requestContext.involvesSensitiveData,
          complianceChecks: complianceChecks.length,
          retentionDays: auditEntry.requestContext.metadata
            .retentionPeriodDays as number,
        },
      };
    } catch (error) {
      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      this.logger.error('Step 14 audit logging failed', {
        error: error.message,
        workspaceId: context.userContext?.workspaceId,
        userId: context.userContext?.userId,
        executionTime,
      });

      // Even if audit logging fails, continue with permission validation
      return {
        result: CheckResult.WARNING,
        continue: true,
        reason: `Audit logging error: ${error.message}`,
        executionTime,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Create comprehensive audit log entry
   */
  private async createAuditLogEntry(
    context: EnhancedPermissionContext,
    startTime: DateTime,
  ): Promise<EnhancedAuditEntry> {
    const userContext = context.userContext as EnhancedUserContext;
    const resourceContext = context.resourceContext;

    // Determine event type and category
    const eventType = this.determineEventType(context);
    const eventCategory = this.determineEventCategory(eventType);

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(context);

    // Determine severity
    const severity = this.determineSeverity(riskScore, context);

    // Analyze data sensitivity
    const sensitivityAnalysis = await this.analyzeSensitiveData(context);

    // Get compliance frameworks
    const complianceFrameworks = await this.getApplicableComplianceFrameworks(
      context,
      sensitivityAnalysis,
    );

    // Extract validation steps from context
    const validationSteps = this.extractValidationSteps(context);
    const failedSteps = this.extractFailedSteps(context);

    // Build enhanced audit entry
    const auditEntry: EnhancedAuditEntry = {
      workspaceMemberId: userContext.workspaceMemberId || '',
      userId: userContext.userId,
      action: context.action || 'UNKNOWN',
      objectName:
        resourceContext?.objectName ||
        resourceContext?.resourceType ||
        'UNKNOWN',
      recordId: resourceContext?.recordId,
      permissionSource: 'RBAC_VALIDATION',
      checkResult: CheckResult.PASS, // Default, will be updated
      denialReason: undefined,
      ipAddress: this.extractIpAddress(context),
      userAgent: this.extractUserAgent(context),
      checkDurationMs: DateTime.now().diff(startTime).toMillis(),

      requestContext: {
        requestId: context.requestId,
        sessionId: userContext.sessionId,
        resourceType: resourceContext?.resourceType || 'UNKNOWN',
        riskScore,
        severity,
        eventType,
        eventCategory,
        involvesSensitiveData: sensitivityAnalysis.involvesSensitiveData,
        involvesPersonalData: sensitivityAnalysis.involvesPersonalData,
        involvesFinancialData: sensitivityAnalysis.involvesFinancialData,
        complianceFrameworks: complianceFrameworks.map((f) => f.toString()),
        validationSteps,
        failedSteps,
        metadata: {
          hierarchyLevel: userContext.hierarchyLevel,
          departmentId: userContext.departmentId,
          stepNumber: this.stepNumber,
          stepName: this.stepName,
          dataClassification: sensitivityAnalysis.classification,
          requiresApproval: this.requiresApproval(context, sensitivityAnalysis),
          retentionPeriodDays:
            this.determineRetentionPeriod(sensitivityAnalysis),
          geolocation: this.extractGeolocation(context),
          deviceFingerprint: this.generateDeviceFingerprint(context),
          requestHeaders: this.extractRequestHeaders(context),
        },
      },
    };

    return auditEntry;
  }

  /**
   * Store audit log in workspace database
   */
  private async storeAuditLog(
    auditEntry: EnhancedAuditEntry,
    workspaceId: string,
  ): Promise<string> {
    try {
      const auditLogRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionAuditWorkspaceEntity>(
          workspaceId,
          'mktPermissionAudit',
          { shouldBypassPermissionChecks: true },
        );

      const auditLogEntity: Partial<MktPermissionAuditWorkspaceEntity> = {
        workspaceMemberId: auditEntry.workspaceMemberId,
        userId: auditEntry.userId,
        action: auditEntry.action as PermissionAction,
        objectName: auditEntry.objectName,
        recordId: auditEntry.recordId,
        permissionSource: auditEntry.permissionSource as PermissionSource,
        checkResult: auditEntry.checkResult,
        denialReason: auditEntry.denialReason,
        requestContext: auditEntry.requestContext as object,
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent,
        checkDurationMs: auditEntry.checkDurationMs,
      };

      const savedEntry = await auditLogRepo.save(auditLogEntity);

      this.logger.debug('Audit log stored successfully', {
        auditId: savedEntry.id,
        workspaceId,
        riskScore: auditEntry.requestContext.riskScore,
      });

      return savedEntry.id;
    } catch (error) {
      this.logger.error('Failed to store audit log', {
        error: error.message,
        workspaceId,
      });
      throw new Error(`Audit log storage failed: ${error.message}`);
    }
  }

  /**
   * Analyze patterns and generate security alerts if necessary
   */
  private async analyzeAndGenerateAlerts(
    auditEntry: EnhancedAuditEntry,
    context: EnhancedPermissionContext,
    workspaceId: string,
    auditLogId: string,
  ): Promise<boolean> {
    try {
      let alertGenerated = false;

      // Check if alert should be generated based on risk score
      if (auditEntry.requestContext.riskScore >= this.HIGH_RISK_THRESHOLD) {
        await this.generateSecurityAlert(
          auditEntry,
          context,
          workspaceId,
          auditLogId,
        );
        alertGenerated = true;
      }

      // Detect suspicious activity patterns
      const suspiciousPattern = await this.detectSuspiciousPatterns(
        auditEntry,
        workspaceId,
      );

      if (suspiciousPattern.detected) {
        await this.generatePatternAlert(
          auditEntry,
          suspiciousPattern,
          context,
          workspaceId,
          auditLogId,
        );
        alertGenerated = true;
      }

      // Check for privilege escalation attempts
      const privilegeEscalation = await this.detectPrivilegeEscalation(
        auditEntry,
        context,
      );

      if (privilegeEscalation) {
        await this.generatePrivilegeEscalationAlert(
          auditEntry,
          context,
          workspaceId,
          auditLogId,
        );
        alertGenerated = true;
      }

      return alertGenerated;
    } catch (error) {
      this.logger.error('Failed to analyze patterns and generate alerts', {
        error: error.message,
        auditLogId,
        workspaceId,
      });

      return false;
    }
  }

  /**
   * Generate security alert (stored in audit log requestContext)
   */
  private async generateSecurityAlert(
    auditEntry: EnhancedAuditEntry,
    context: EnhancedPermissionContext,
    workspaceId: string,
    auditLogId: string,
  ): Promise<void> {
    try {
      const alertId = `alert_${Date.now()}_${auditEntry.userId}_${Math.random().toString(36).substr(2, 6)}`;

      const alert: SecurityAlert = {
        id: alertId,
        alertType: this.mapEventToAlertType(
          auditEntry.requestContext.eventType,
        ),
        severity: auditEntry.requestContext.severity,
        title: `High Risk Security Event: ${auditEntry.requestContext.eventType}`,
        description: `${auditEntry.action} on ${auditEntry.objectName} (Risk Score: ${auditEntry.requestContext.riskScore})`,
        recommendation: this.generateAlertRecommendation(auditEntry),
        userId: auditEntry.userId || 'unknown',
        riskScore: auditEntry.requestContext.riskScore,
        businessImpact: this.assessBusinessImpact(auditEntry),
        status: 'OPEN',
        relatedAuditIds: [auditLogId],
        metadata: {
          automaticallyGenerated: true,
          detectionConfidence: 0.85,
          requiresImmedateAction:
            auditEntry.requestContext.riskScore >= this.CRITICAL_RISK_THRESHOLD,
        },
        createdAt: new Date(),
      };

      await this.storeSecurityAlert(alert, workspaceId, auditLogId);

      this.logger.warn('Security alert generated', {
        alertId,
        alertType: alert.alertType,
        severity: alert.severity,
        userId: auditEntry.userId,
        riskScore: auditEntry.requestContext.riskScore,
      });
    } catch (error) {
      this.logger.error('Failed to generate security alert', {
        error: error.message,
        auditLogId,
        workspaceId,
      });
    }
  }

  /**
   * Store security alert in audit log requestContext
   */
  private async storeSecurityAlert(
    alert: SecurityAlert,
    workspaceId: string,
    auditLogId: string,
  ): Promise<void> {
    try {
      const auditLogRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionAuditWorkspaceEntity>(
          workspaceId,
          'mktPermissionAudit',
          { shouldBypassPermissionChecks: true },
        );

      // Get existing audit log and update with security alert
      const existingAudit = await auditLogRepo.findOne({
        where: { id: auditLogId },
      });

      if (existingAudit) {
        const updatedContext = {
          ...existingAudit.requestContext,
          securityAlert: alert,
        };

        await auditLogRepo.update(
          { id: auditLogId },
          { requestContext: updatedContext },
        );
      }
    } catch (error) {
      this.logger.error('Failed to store security alert', {
        error: error.message,
        alertId: alert.id,
        workspaceId,
        auditLogId,
      });
      throw error;
    }
  }

  /**
   * Perform compliance checks
   */
  private async performComplianceChecks(
    auditEntry: EnhancedAuditEntry,
    context: EnhancedPermissionContext,
  ): Promise<string[]> {
    const complianceChecks: string[] = [];

    for (const framework of auditEntry.requestContext.complianceFrameworks) {
      switch (framework) {
        case 'GDPR':
          if (auditEntry.requestContext.involvesPersonalData) {
            complianceChecks.push('GDPR_PERSONAL_DATA_ACCESS_LOGGED');
          }
          break;

        case 'SOX':
          if (auditEntry.requestContext.involvesFinancialData) {
            complianceChecks.push('SOX_FINANCIAL_DATA_ACCESS_LOGGED');
          }
          break;

        case 'PCI_DSS':
          if (this.involvesPaymentData(context)) {
            complianceChecks.push('PCI_DSS_PAYMENT_DATA_ACCESS_LOGGED');
          }
          break;

        case 'SOC_2':
          complianceChecks.push('SOC_2_SECURITY_CONTROLS_LOGGED');
          break;

        case 'ISO_27001':
          complianceChecks.push('ISO_27001_INFORMATION_SECURITY_LOGGED');
          break;

        case 'VIETNAM_LAW':
          complianceChecks.push('VIETNAM_DATA_PROTECTION_LAW_LOGGED');
          break;
      }
    }

    return complianceChecks;
  }

  /**
   * Helper methods for risk assessment and pattern detection
   */
  private async calculateRiskScore(
    context: EnhancedPermissionContext,
  ): Promise<number> {
    let riskScore = 0;

    // Base risk from action type
    const actionRisk = this.getActionRisk(context.action || '');

    riskScore += actionRisk;

    // Resource sensitivity risk
    const resourceRisk = await this.getResourceRisk(context);

    riskScore += resourceRisk;

    // User context risk
    const userRisk = this.getUserRisk(context.userContext);

    riskScore += userRisk;

    // Time-based risk (off-hours access)
    const timeRisk = this.getTimeBasedRisk();

    riskScore += timeRisk;

    // Historical pattern risk
    const patternRisk = await this.getPatternRisk(context);

    riskScore += patternRisk;

    return Math.min(riskScore, this.MAX_RISK_SCORE);
  }

  private getActionRisk(action: string): number {
    const riskMap: Record<string, number> = {
      DELETE: 30,
      BULK_DELETE: 40,
      EXPORT: 25,
      BULK_EXPORT: 35,
      ADMIN_OVERRIDE: 45,
      SYSTEM_CONFIG: 35,
      USER_MANAGEMENT: 30,
      UPDATE: 15,
      CREATE: 10,
      READ: 5,
    };

    return riskMap[action.toUpperCase()] || 10;
  }

  private async getResourceRisk(
    context: EnhancedPermissionContext,
  ): Promise<number> {
    const resourceType =
      context.resourceContext?.resourceType?.toLowerCase() || '';

    // High-risk resources
    if (resourceType.includes('invoice') || resourceType.includes('payment')) {
      return 30;
    }
    if (resourceType.includes('employee') || resourceType.includes('salary')) {
      return 25;
    }
    if (resourceType.includes('contract') || resourceType.includes('legal')) {
      return 20;
    }
    if (
      resourceType.includes('customer') ||
      resourceType.includes('personal')
    ) {
      return 15;
    }

    return 5;
  }

  private getUserRisk(userContext: EnhancedUserContext | undefined): number {
    if (!userContext) return 20;

    let risk = 0;

    // Low hierarchy users accessing high-level resources
    if ((userContext.hierarchyLevel || 0) < 3) {
      risk += 15;
    }

    // Users with low hierarchy or unknown status
    if ((userContext.hierarchyLevel || 0) > 8) {
      risk += 20;
    }

    // Users with active status but no clear role
    if (!userContext.isActive) {
      risk += 10;
    }

    return risk;
  }

  private getTimeBasedRisk(): number {
    const now = new Date();
    const hour = now.getHours();

    // Off-hours access (before 6 AM or after 10 PM)
    if (hour < 6 || hour > 22) {
      return 15;
    }

    // Weekend access
    const day = now.getDay();

    if (day === 0 || day === 6) {
      return 10;
    }

    return 0;
  }

  private async getPatternRisk(
    context: EnhancedPermissionContext,
  ): Promise<number> {
    // In a real implementation, this would analyze historical patterns
    // For now, return a base pattern risk
    return 5;
  }

  private determineEventType(
    context: EnhancedPermissionContext,
  ): AuditEventType {
    const action = context.action?.toUpperCase() || '';

    if (action.includes('DELETE')) {
      return AuditEventType.ACCESS_DENIED; // Default to denied, will be updated
    }
    if (action.includes('ADMIN') || action.includes('OVERRIDE')) {
      return AuditEventType.ADMIN_OVERRIDE;
    }
    if (action.includes('BULK')) {
      return AuditEventType.BULK_OPERATION;
    }

    return AuditEventType.PERMISSION_CHECK;
  }

  private determineEventCategory(
    eventType: AuditEventType,
  ): AuditEventCategory {
    if (
      [
        AuditEventType.SENSITIVE_DATA_ACCESS,
        AuditEventType.PRIVILEGE_ESCALATION,
        AuditEventType.SUSPICIOUS_ACTIVITY,
      ].includes(eventType)
    ) {
      return AuditEventCategory.SECURITY;
    }

    if (eventType === AuditEventType.ADMIN_OVERRIDE) {
      return AuditEventCategory.SYSTEM;
    }

    return AuditEventCategory.PERMISSION;
  }

  private determineSeverity(
    riskScore: number,
    context: EnhancedPermissionContext,
  ): AuditSeverity {
    if (riskScore >= this.CRITICAL_RISK_THRESHOLD) {
      return AuditSeverity.CRITICAL;
    }
    if (riskScore >= this.HIGH_RISK_THRESHOLD) {
      return AuditSeverity.HIGH;
    }
    if (riskScore >= 40 || this.involvesSensitiveData(context)) {
      return AuditSeverity.MEDIUM;
    }

    return AuditSeverity.LOW;
  }

  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 90) return RiskLevel.CRITICAL;
    if (riskScore >= 70) return RiskLevel.VERY_HIGH;
    if (riskScore >= 50) return RiskLevel.HIGH;
    if (riskScore >= 30) return RiskLevel.MEDIUM;
    if (riskScore >= 10) return RiskLevel.LOW;

    return RiskLevel.VERY_LOW;
  }

  private async analyzeSensitiveData(
    context: EnhancedPermissionContext,
  ): Promise<{
    involvesSensitiveData: boolean;
    involvesPersonalData: boolean;
    involvesFinancialData: boolean;
    classification: string;
  }> {
    const resourceType =
      context.resourceContext?.resourceType?.toLowerCase() || '';

    const involvesSensitiveData = this.involvesSensitiveData(context);
    const involvesPersonalData = this.involvesPersonalData(context);
    const involvesFinancialData = this.involvesFinancialData(context);

    let classification = 'PUBLIC';

    if (
      involvesFinancialData ||
      resourceType.includes('invoice') ||
      resourceType.includes('payment')
    ) {
      classification = 'RESTRICTED';
    } else if (involvesSensitiveData || involvesPersonalData) {
      classification = 'CONFIDENTIAL';
    } else if (
      resourceType.includes('internal') ||
      resourceType.includes('department')
    ) {
      classification = 'INTERNAL';
    }

    return {
      involvesSensitiveData,
      involvesPersonalData,
      involvesFinancialData,
      classification,
    };
  }

  private involvesSensitiveData(context: EnhancedPermissionContext): boolean {
    const resourceType =
      context.resourceContext?.resourceType?.toLowerCase() || '';
    const sensitivePatterns = [
      'salary',
      'ssn',
      'tax',
      'credential',
      'password',
      'secret',
      'key',
      'invoice',
      'payment',
      'financial',
      'banking',
      'personal',
    ];

    return sensitivePatterns.some((pattern) => resourceType.includes(pattern));
  }

  private involvesPersonalData(context: EnhancedPermissionContext): boolean {
    const resourceType =
      context.resourceContext?.resourceType?.toLowerCase() || '';
    const personalPatterns = [
      'personal',
      'employee',
      'contact',
      'profile',
      'customer',
      'user',
      'phone',
      'email',
      'address',
      'identity',
    ];

    return personalPatterns.some((pattern) => resourceType.includes(pattern));
  }

  private involvesFinancialData(context: EnhancedPermissionContext): boolean {
    const resourceType =
      context.resourceContext?.resourceType?.toLowerCase() || '';
    const financialPatterns = [
      'invoice',
      'payment',
      'salary',
      'budget',
      'financial',
      'accounting',
      'tax',
      'billing',
      'revenue',
      'cost',
    ];

    return financialPatterns.some((pattern) => resourceType.includes(pattern));
  }

  private involvesPaymentData(context: EnhancedPermissionContext): boolean {
    const resourceType =
      context.resourceContext?.resourceType?.toLowerCase() || '';

    return (
      resourceType.includes('payment') ||
      resourceType.includes('card') ||
      resourceType.includes('billing')
    );
  }

  private async getApplicableComplianceFrameworks(
    context: EnhancedPermissionContext,
    sensitivityAnalysis: {
      involvesSensitiveData: boolean;
      involvesPersonalData: boolean;
      involvesFinancialData: boolean;
    },
  ): Promise<ComplianceFramework[]> {
    const frameworks: ComplianceFramework[] = [];

    // Always apply base compliance
    frameworks.push(ComplianceFramework.ISO_27001);

    if (sensitivityAnalysis.involvesPersonalData) {
      frameworks.push(ComplianceFramework.GDPR);
      frameworks.push(ComplianceFramework.VIETNAM_LAW);
    }

    if (sensitivityAnalysis.involvesFinancialData) {
      frameworks.push(ComplianceFramework.SOX);
    }

    if (this.involvesPaymentData(context)) {
      frameworks.push(ComplianceFramework.PCI_DSS);
    }

    if (sensitivityAnalysis.involvesSensitiveData) {
      frameworks.push(ComplianceFramework.SOC_2);
    }

    return frameworks;
  }

  private determineRetentionPeriod(sensitivityAnalysis: {
    involvesFinancialData: boolean;
    involvesSensitiveData: boolean;
  }): number {
    if (sensitivityAnalysis.involvesFinancialData) {
      return this.FINANCIAL_DATA_RETENTION_DAYS;
    }
    if (sensitivityAnalysis.involvesSensitiveData) {
      return this.SENSITIVE_DATA_RETENTION_DAYS;
    }

    return this.DEFAULT_RETENTION_DAYS;
  }

  private requiresApproval(
    context: EnhancedPermissionContext,
    sensitivityAnalysis: {
      involvesFinancialData: boolean;
      involvesSensitiveData: boolean;
    },
  ): boolean {
    // High-risk actions on sensitive data require approval
    const highRiskActions = ['DELETE', 'BULK_DELETE', 'EXPORT', 'BULK_EXPORT'];
    const action = context.action?.toUpperCase() || '';

    return (
      highRiskActions.includes(action) &&
      (sensitivityAnalysis.involvesFinancialData ||
        sensitivityAnalysis.involvesSensitiveData)
    );
  }

  private extractValidationSteps(context: EnhancedPermissionContext): string[] {
    // Extract validation steps from context metadata
    const steps = context.metadata?.validationSteps;

    if (Array.isArray(steps)) {
      return steps.map((step) => String(step));
    }

    return [];
  }

  private extractFailedSteps(context: EnhancedPermissionContext): string[] {
    // Extract failed steps from context metadata
    const steps = context.metadata?.failedSteps;

    if (Array.isArray(steps)) {
      return steps.map((step) => String(step));
    }

    return [];
  }

  private extractIpAddress(context: EnhancedPermissionContext): string {
    return (
      context.request?.ip ||
      context.request?.connection?.remoteAddress ||
      'unknown'
    );
  }

  private extractUserAgent(context: EnhancedPermissionContext): string {
    return context.request?.headers?.['user-agent'] || 'unknown';
  }

  private extractGeolocation(
    context: EnhancedPermissionContext,
  ): string | undefined {
    // In a real implementation, this would use IP geolocation services
    const forwarded = context.request?.headers?.['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded;
    }

    return undefined;
  }

  private generateDeviceFingerprint(
    context: EnhancedPermissionContext,
  ): string | undefined {
    // Generate a simple device fingerprint based on available headers
    const userAgent = this.extractUserAgent(context);
    const acceptLanguage = context.request?.headers?.['accept-language'] || '';
    const acceptEncoding = context.request?.headers?.['accept-encoding'] || '';

    if (userAgent !== 'unknown') {
      const fingerprint = Buffer.from(
        `${userAgent}:${acceptLanguage}:${acceptEncoding}`,
      )
        .toString('base64')
        .substr(0, 16);

      return fingerprint;
    }

    return undefined;
  }

  private extractRequestHeaders(
    context: EnhancedPermissionContext,
  ): Record<string, string> {
    const headers = context.request?.headers || {};
    // Filter out sensitive headers
    const filteredHeaders: Record<string, string> = {};

    const allowedHeaders = [
      'user-agent',
      'accept',
      'accept-language',
      'accept-encoding',
      'content-type',
      'origin',
      'referer',
      'x-forwarded-for',
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (
        allowedHeaders.includes(key.toLowerCase()) &&
        typeof value === 'string'
      ) {
        filteredHeaders[key] = value;
      }
    }

    return filteredHeaders;
  }

  private async detectSuspiciousPatterns(
    auditEntry: EnhancedAuditEntry,
    workspaceId: string,
  ): Promise<PatternDetectionResult> {
    try {
      // Get recent audit logs for the same user
      const auditLogRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionAuditWorkspaceEntity>(
          workspaceId,
          'mktPermissionAudit',
          { shouldBypassPermissionChecks: true },
        );

      const recentLogs = await auditLogRepo.find({
        where: {
          userId: auditEntry.userId,
        },
        order: { createdAt: 'DESC' },
        take: 20,
      });

      // Check for suspicious activity (too many requests)
      if (recentLogs.length >= this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        return {
          detected: true,
          patternType: 'EXCESSIVE_REQUESTS',
          confidence: 0.9,
          riskIncrease: 25,
          details: {
            requestCount: recentLogs.length,
            timeWindow: '1 minute',
            threshold: this.SUSPICIOUS_ACTIVITY_THRESHOLD,
          },
        };
      }

      // Check for failed permission attempts
      const failedAttempts = recentLogs.filter(
        (log) => log.checkResult === CheckResult.FAIL,
      ).length;

      if (failedAttempts >= 5) {
        return {
          detected: true,
          patternType: 'MULTIPLE_FAILED_ATTEMPTS',
          confidence: 0.85,
          riskIncrease: 20,
          details: {
            failedAttempts,
            timeWindow: '1 minute',
          },
        };
      }

      return {
        detected: false,
        patternType: 'NONE',
        confidence: 0,
        riskIncrease: 0,
        details: {},
      };
    } catch (error) {
      this.logger.error('Failed to detect suspicious patterns', {
        error: error.message,
        userId: auditEntry.userId,
        workspaceId,
      });

      return {
        detected: false,
        patternType: 'ERROR',
        confidence: 0,
        riskIncrease: 0,
        details: { error: error.message },
      };
    }
  }

  private async detectPrivilegeEscalation(
    auditEntry: EnhancedAuditEntry,
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    const userHierarchy = context.userContext?.hierarchyLevel || 0;
    const action = context.action?.toUpperCase() || '';

    // Users with low hierarchy accessing high-privilege actions
    const highPrivilegeActions = [
      'ADMIN_OVERRIDE',
      'USER_MANAGEMENT',
      'SYSTEM_CONFIG',
      'SECURITY_ADMIN',
      'BULK_DELETE',
      'EXPORT_ALL',
    ];

    return userHierarchy < 5 && highPrivilegeActions.includes(action);
  }

  private async generatePatternAlert(
    auditEntry: EnhancedAuditEntry,
    pattern: PatternDetectionResult,
    context: EnhancedPermissionContext,
    workspaceId: string,
    auditLogId: string,
  ): Promise<void> {
    const alertId = `pattern_alert_${Date.now()}_${auditEntry.userId}`;

    const alert: SecurityAlert = {
      id: alertId,
      alertType: `PATTERN_${pattern.patternType}`,
      severity: pattern.confidence > 0.8 ? 'HIGH' : 'MEDIUM',
      title: `Suspicious Pattern Detected: ${pattern.patternType}`,
      description: `Pattern detection confidence: ${(pattern.confidence * 100).toFixed(1)}%`,
      recommendation: this.getPatternRecommendation(pattern),
      userId: auditEntry.userId || 'unknown',
      riskScore: auditEntry.requestContext.riskScore + pattern.riskIncrease,
      businessImpact: 'Potential security threat requiring investigation',
      status: 'OPEN',
      relatedAuditIds: [auditLogId],
      metadata: {
        patternType: pattern.patternType,
        confidence: pattern.confidence,
        riskIncrease: pattern.riskIncrease,
        patternDetails: pattern.details,
      },
      createdAt: new Date(),
    };

    await this.storeSecurityAlert(alert, workspaceId, auditLogId);
  }

  private async generatePrivilegeEscalationAlert(
    auditEntry: EnhancedAuditEntry,
    context: EnhancedPermissionContext,
    workspaceId: string,
    auditLogId: string,
  ): Promise<void> {
    const alertId = `privilege_alert_${Date.now()}_${auditEntry.userId}`;

    const alert: SecurityAlert = {
      id: alertId,
      alertType: 'PRIVILEGE_ESCALATION',
      severity: 'HIGH',
      title: 'Potential Privilege Escalation Attempt',
      description: `User with hierarchy level ${context.userContext?.hierarchyLevel} attempting ${context.action}`,
      recommendation:
        'Review user permissions and investigate potential unauthorized access attempt',
      userId: auditEntry.userId || 'unknown',
      riskScore: auditEntry.requestContext.riskScore + 30,
      businessImpact:
        'High - Potential unauthorized access to privileged functions',
      status: 'OPEN',
      relatedAuditIds: [auditLogId],
      metadata: {
        userHierarchy: context.userContext?.hierarchyLevel,
        attemptedAction: context.action,
        resourceType: context.resourceContext?.resourceType,
      },
      createdAt: new Date(),
    };

    await this.storeSecurityAlert(alert, workspaceId, auditLogId);
  }

  private mapEventToAlertType(eventType: string): string {
    const mapping: Record<string, string> = {
      ACCESS_DENIED: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
      PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',
      SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
      POLICY_VIOLATION: 'POLICY_VIOLATION',
      ADMIN_OVERRIDE: 'ADMIN_OVERRIDE',
      BULK_OPERATION: 'BULK_OPERATION',
      PERMISSION_CHECK: 'SECURITY_EVENT',
      ACCESS_GRANTED: 'SECURITY_EVENT',
    };

    return mapping[eventType] || 'SECURITY_EVENT';
  }

  private generateAlertRecommendation(auditEntry: EnhancedAuditEntry): string {
    if (auditEntry.requestContext.riskScore >= this.CRITICAL_RISK_THRESHOLD) {
      return 'CRITICAL: Immediate investigation required. Consider temporarily suspending user access.';
    }
    if (auditEntry.requestContext.riskScore >= this.HIGH_RISK_THRESHOLD) {
      return 'HIGH RISK: Review user permissions and validate business justification for this access.';
    }
    if (auditEntry.requestContext.involvesSensitiveData) {
      return 'Sensitive data access detected. Verify authorization and ensure compliance with data protection policies.';
    }

    return 'Monitor user activity and review if pattern continues.';
  }

  private assessBusinessImpact(auditEntry: EnhancedAuditEntry): string {
    if (auditEntry.requestContext.involvesFinancialData) {
      return 'High - Financial data at risk';
    }
    if (auditEntry.requestContext.involvesPersonalData) {
      return 'Medium - Personal data privacy concerns';
    }
    if (auditEntry.requestContext.involvesSensitiveData) {
      return 'Medium - Sensitive information exposure risk';
    }

    return 'Low - Standard business data';
  }

  private getPatternRecommendation(pattern: PatternDetectionResult): string {
    switch (pattern.patternType) {
      case 'EXCESSIVE_REQUESTS':
        return 'Investigate potential automated attack or system malfunction. Consider rate limiting.';
      case 'MULTIPLE_FAILED_ATTEMPTS':
        return 'Possible brute force attack. Consider temporarily locking account and requiring password reset.';
      default:
        return 'Review user activity pattern and investigate if suspicious behavior continues.';
    }
  }
}
