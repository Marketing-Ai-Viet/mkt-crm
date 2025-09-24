import { Injectable, Logger } from '@nestjs/common';

import { Request } from 'express';

import {
  AuditLoggingStep,
  ComplianceReportData,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  ValidationStepResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  AuditLogEntry,
  AuditFilter,
  SecurityAlert,
  ComplianceReport,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/audit.types';
import {
  VALIDATION_STEPS,
  AUDIT_EVENT_TYPES,
  SECURITY_ALERT_TYPES,
  COMPLIANCE_FRAMEWORKS,
  SENSITIVE_DATA_TYPES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

/**
 * Enterprise RBAC Audit Logging Service - Step 14
 */
@Injectable()
export class AuditLoggingService implements AuditLoggingStep {
  private readonly logger = new Logger(AuditLoggingService.name);

  readonly stepNumber = VALIDATION_STEPS.AUDIT_LOGGING;
  readonly stepName = 'Audit & Logging';
  readonly description =
    'Maintain comprehensive audit trail for security and compliance';
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 30;
  readonly maxExecutionTime = 300;
  readonly enableCaching = false;

  // In-memory stores (would be replaced with persistent storage)
  private auditLogs: AuditLogEntry[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private complianceReports: ComplianceReport[] = [];

  constructor() {
    this.logger.log('Enterprise RBAC Audit Logging Service initialized');
  }

  /**
   * Main validation method
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Starting audit logging for user: ${context.userContext?.userId}`,
      );

      // Log the permission check
      await this.logPermissionCheck(context, {
        step: this.stepNumber,
        name: this.stepName,
        result: 'PASS',
        reason: 'Audit logging in progress',
        duration: 0,
        details: {
          status: 'IN_PROGRESS',
          cacheHit: false,
        },
      });

      // Check if sensitive access should be audited
      if (await this.shouldAuditSensitiveAccess(context)) {
        await this.auditSensitiveAccess(context);
      }

      // Track security events
      await this.trackSecurityEvents(context);

      const executionTime = Date.now() - startTime;

      return {
        result: 'PASS',
        reason: 'Audit logging completed successfully',
        continue: true,
        executionTime,
        stepData: {
          logsCreated: 1,
          alertsGenerated: 0,
          complianceChecks: await this.getActiveComplianceFrameworks(context),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error in audit logging: ${error.message}`,
        error.stack,
      );

      return this.createErrorResult(error.message, startTime);
    }
  }

  /**
   * Determine if this step should be executed
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    // Always execute audit logging unless explicitly disabled
    return true;
  }

  /**
   * Get estimated execution time
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return this.maxExecutionTime || 300;
  }

  /**
   * Log permission check event
   */
  async logPermissionCheck(
    context: EnhancedPermissionContext,
    result: ValidationStepResult,
  ): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        eventType: AUDIT_EVENT_TYPES.PERMISSION_CHECK,
        eventCategory: 'PERMISSION',
        severity: this.determineEventSeverity(context, result),

        // Context
        userId: context.userContext?.userId || 'unknown',
        workspaceId: context.userContext?.workspaceId,
        workspaceMemberId: context.userContext?.workspaceMemberId,
        sessionId: context.userContext?.sessionId,
        requestId: context.requestId,

        // Action
        action: context.action,
        resource: context.resourceContext?.objectName,
        resourceId: context.resourceContext?.recordId,

        // Result
        result: result.result === 'PASS' ? 'GRANTED' : 'DENIED',
        reason: result.reason,
        riskScore: await this.calculateRiskScore(context, result),

        // Details
        details: {
          stepNumber: result.step || 14,
          stepName: result.name || 'Audit & Logging',
          duration: result.duration || 0,
          stepDetails: JSON.stringify(result.details || {}),
        },

        metadata: {
          ipAddress: (context.request as Request)?.ip || 'unknown',
          userAgent: context.request?.headers?.['user-agent'] || 'unknown',
          timestamp: new Date(),
          executionTime: result.duration || 0,
        },

        // Compliance
        complianceFrameworks: await this.getActiveComplianceFrameworks(context),
        retentionPeriod: this.determineRetentionPeriod(context),
        sensitiveData: await this.involvesSensitiveData(context),
        personalData: await this.involvesPersonalData(context),

        processed: false,
        createdAt: new Date(),
      };

      // Store audit entry
      this.auditLogs.push(auditEntry);

      // Check if alert should be generated
      if (await this.shouldGenerateAlert(auditEntry)) {
        await this.generateSecurityAlert(auditEntry);
        auditEntry.alertGenerated = true;
      }

      this.logger.debug(
        `Permission check logged: ${auditEntry.eventType} - ${auditEntry.result}`,
      );
    } catch (error) {
      this.logger.error(
        `Error logging permission check: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Audit sensitive data access
   */
  async auditSensitiveAccess(
    context: EnhancedPermissionContext,
  ): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        eventType: AUDIT_EVENT_TYPES.SENSITIVE_DATA_ACCESS,
        eventCategory: 'SECURITY',
        severity: 'HIGH',

        userId: context.userContext?.userId || 'unknown',
        workspaceId: context.userContext?.workspaceId,
        workspaceMemberId: context.userContext?.workspaceMemberId,
        sessionId: context.userContext?.sessionId,
        requestId: context.requestId,

        action: context.action,
        resource: context.resourceContext?.objectName,
        resourceId: context.resourceContext?.recordId,

        result: 'GRANTED', // Assuming access was granted if we're auditing
        reason: 'Sensitive data access granted',

        details: {
          sensitiveDataType: await this.identifySensitiveDataType(context),
          dataClassification: 'UNKNOWN',
          approvalRequired: false,
          auditLevel: 'COMPREHENSIVE',
        },

        metadata: {
          timestamp: new Date(),
          ipAddress: (context.request as Request)?.ip || 'unknown',
          userAgent: context.request?.headers?.['user-agent'] || 'unknown',
        },

        complianceFrameworks: await this.getActiveComplianceFrameworks(context),
        retentionPeriod: 2555, // 7 years for sensitive data
        sensitiveData: true,
        personalData: await this.involvesPersonalData(context),

        processed: false,
        createdAt: new Date(),
      };

      this.auditLogs.push(auditEntry);
      this.logger.warn(
        `Sensitive data access audited for user ${context.userContext?.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error auditing sensitive access: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Track security events and patterns
   */
  async trackSecurityEvents(context: EnhancedPermissionContext): Promise<void> {
    try {
      // Check for suspicious patterns
      if (await this.detectSuspiciousActivity(context)) {
        await this.logSecurityEvent(
          context,
          SECURITY_ALERT_TYPES.SUSPICIOUS_ACTIVITY,
        );
      }

      // Check for privilege escalation attempts
      if (await this.detectPrivilegeEscalation(context)) {
        await this.logSecurityEvent(
          context,
          SECURITY_ALERT_TYPES.PRIVILEGE_ESCALATION,
        );
      }

      // Check for policy violations
      if (await this.detectPolicyViolation(context)) {
        await this.logSecurityEvent(
          context,
          SECURITY_ALERT_TYPES.POLICY_VIOLATION,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error tracking security events: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    context: EnhancedPermissionContext,
  ): Promise<ComplianceReportData> {
    try {
      const frameworks = await this.getActiveComplianceFrameworks(context);
      const report: ComplianceReportData = {
        reportId: `audit_${Date.now()}_${context.userContext?.userId}`,
        reportType: 'AUDIT_TRAIL',
        period: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          endDate: new Date(),
        },
        generatedAt: new Date(),
        generatedBy: context.userContext?.userId || 'system',
        data: {
          frameworks: frameworks,
          complianceChecks: [],
        },
        summary: {},
      };

      // Calculate statistics
      const recentLogs = this.auditLogs.filter(
        (log) =>
          log.createdAt >= report.period.startDate &&
          log.createdAt <= report.period.endDate,
      );

      const totalPermissionChecks = recentLogs.filter(
        (log) => log.eventType === AUDIT_EVENT_TYPES.PERMISSION_CHECK,
      ).length;

      const totalDenials = recentLogs.filter(
        (log) => log.result === 'DENIED',
      ).length;

      const totalErrors = recentLogs.filter(
        (log) => log.result === 'ERROR',
      ).length;

      const totalSensitiveDataAccess = recentLogs.filter(
        (log) => log.sensitiveData,
      ).length;

      report.summary = {
        totalPermissionChecks,
        totalDenials,
        totalErrors,
        totalSensitiveDataAccess,
      };

      // Generate compliance score (simplified)
      const violations = totalDenials + totalErrors;
      const complianceScore =
        totalPermissionChecks > 0
          ? ((totalPermissionChecks - violations) / totalPermissionChecks) * 100
          : 100;

      report.data.complianceScore = complianceScore;
      report.data.violations = violations;

      return report;
    } catch (error) {
      this.logger.error(
        `Error generating compliance report: ${error.message}`,
        error.stack,
      );

      return {
        reportId: 'error_report',
        reportType: 'AUDIT_TRAIL',
        period: {
          startDate: new Date(),
          endDate: new Date(),
        },
        generatedBy: 'system',
        generatedAt: new Date(),
        data: { error: error.message },
        summary: {},
      };
    }
  }

  /**
   * Helper methods
   */
  private async shouldAuditSensitiveAccess(
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    return (
      (await this.involvesSensitiveData(context)) ||
      (await this.involvesPersonalData(context)) ||
      context.resourceContext?.confidentialityLevel === 'TOP_SECRET'
    );
  }

  private async involvesSensitiveData(
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    const sensitivePatterns = Object.values(SENSITIVE_DATA_TYPES);
    const objectName = context.resourceContext?.objectName.toLowerCase();

    return sensitivePatterns.some((pattern) =>
      objectName.includes(pattern.toLowerCase()),
    );
  }

  private async involvesPersonalData(
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    const personalPatterns = ['personal', 'profile', 'contact', 'employee'];
    const objectName = context.resourceContext?.objectName.toLowerCase();

    return personalPatterns.some((pattern) => objectName.includes(pattern));
  }

  private async getActiveComplianceFrameworks(
    context: EnhancedPermissionContext,
  ): Promise<string[]> {
    const frameworks: string[] = [];

    // Default frameworks based on data type
    if (await this.involvesSensitiveData(context)) {
      frameworks.push(COMPLIANCE_FRAMEWORKS.GDPR, COMPLIANCE_FRAMEWORKS.SOC_2);
    }

    if (await this.involvesFinancialData(context)) {
      frameworks.push(COMPLIANCE_FRAMEWORKS.SOX, COMPLIANCE_FRAMEWORKS.PCI_DSS);
    }

    return frameworks.length > 0
      ? frameworks
      : [COMPLIANCE_FRAMEWORKS.ISO_27001];
  }

  private async involvesFinancialData(
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    const financialPatterns = [
      'invoice',
      'payment',
      'salary',
      'budget',
      'financial',
    ];
    const objectName = context.resourceContext?.objectName.toLowerCase();

    return financialPatterns.some((pattern) => objectName.includes(pattern));
  }

  private determineEventSeverity(
    _context: EnhancedPermissionContext,
    result: ValidationStepResult,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (result.result === 'FAIL' && _context.resourceContext?.isFinancialData)
      return 'HIGH';
    if (result.result === 'FAIL') return 'MEDIUM';
    if (result.result === 'WARNING') return 'MEDIUM';

    return 'LOW';
  }

  private async calculateRiskScore(
    context: EnhancedPermissionContext,
    result: ValidationStepResult,
  ): Promise<number> {
    let score = 0;

    // Base risk on action type
    if (['DELETE', 'BULK_OPERATION', 'EXPORT'].includes(context.action)) {
      score += 30;
    } else if (['UPDATE', 'CREATE'].includes(context.action)) {
      score += 10;
    }

    // Add risk for sensitive data
    if (await this.involvesSensitiveData(context)) {
      score += 40;
    }

    // Add risk for denied access
    if (result.result === 'FAIL') {
      score += 20;
    }

    return Math.min(score, 100);
  }

  private determineRetentionPeriod(context: EnhancedPermissionContext): number {
    // Default retention periods based on data sensitivity
    if (context.resourceContext?.isFinancialData) {
      return 2555; // 7 years for financial data
    }

    if (context.resourceContext?.isSensitive) {
      return 1095; // 3 years for sensitive data
    }

    return 365; // 1 year for general data
  }

  private async identifySensitiveDataType(
    context: EnhancedPermissionContext,
  ): Promise<string> {
    const objectName = context.resourceContext?.objectName.toLowerCase();

    if (objectName.includes('salary')) return SENSITIVE_DATA_TYPES.SALARY_DATA;
    if (objectName.includes('financial'))
      return SENSITIVE_DATA_TYPES.FINANCIAL_DATA;
    if (objectName.includes('personal'))
      return SENSITIVE_DATA_TYPES.PERSONAL_DATA;
    if (objectName.includes('legal')) return SENSITIVE_DATA_TYPES.LEGAL_DATA;
    if (objectName.includes('audit')) return SENSITIVE_DATA_TYPES.AUDIT_DATA;
    if (objectName.includes('security'))
      return SENSITIVE_DATA_TYPES.SECURITY_DATA;

    return 'UNKNOWN';
  }

  private async shouldGenerateAlert(
    auditEntry: AuditLogEntry,
  ): Promise<boolean> {
    return (
      auditEntry.severity === 'CRITICAL' ||
      (auditEntry.severity === 'HIGH' && auditEntry.result === 'DENIED') ||
      (auditEntry.riskScore || 0) > 70
    );
  }

  private async generateSecurityAlert(
    auditEntry: AuditLogEntry,
  ): Promise<void> {
    try {
      const alert: SecurityAlert = {
        alertType: this.mapEventToAlertType(auditEntry.eventType),
        severity: auditEntry.severity,
        title: `Security Alert: ${auditEntry.eventType}`,
        description: `${auditEntry.result} ${auditEntry.action} on ${auditEntry.resource}`,
        recommendation: this.generateAlertRecommendation(auditEntry),
        userId: auditEntry.userId,
        workspaceId: auditEntry.workspaceId,
        relatedLogIds: [auditEntry.id || 'unknown'],
        status: 'OPEN',
        metadata: {
          riskScore: auditEntry.riskScore || 0,
          automaticallyGenerated: true,
        },
        createdAt: new Date(),
      };

      this.securityAlerts.push(alert);
      this.logger.warn(
        `Security alert generated: ${alert.alertType} for user ${alert.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating security alert: ${error.message}`,
        error.stack,
      );
    }
  }

  private mapEventToAlertType(eventType: string): string {
    const mapping: Record<string, string> = {
      [AUDIT_EVENT_TYPES.PERMISSION_DENIED]:
        SECURITY_ALERT_TYPES.UNAUTHORIZED_ACCESS,
      [AUDIT_EVENT_TYPES.SENSITIVE_DATA_ACCESS]:
        SECURITY_ALERT_TYPES.SUSPICIOUS_ACTIVITY,
      [AUDIT_EVENT_TYPES.EMERGENCY_ACCESS]:
        SECURITY_ALERT_TYPES.PRIVILEGE_ESCALATION,
      [AUDIT_EVENT_TYPES.SYSTEM_OVERRIDE]:
        SECURITY_ALERT_TYPES.POLICY_VIOLATION,
    };

    return mapping[eventType] || SECURITY_ALERT_TYPES.SUSPICIOUS_ACTIVITY;
  }

  private generateAlertRecommendation(auditEntry: AuditLogEntry): string {
    if (auditEntry.result === 'DENIED' && (auditEntry.riskScore || 0) > 70) {
      return 'High-risk access attempt denied. Review user permissions and investigate potential security threat.';
    }

    if (auditEntry.sensitiveData) {
      return 'Sensitive data accessed. Verify authorization and ensure compliance with data protection policies.';
    }

    return 'Review security event and take appropriate action if necessary.';
  }

  private async detectSuspiciousActivity(
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    // Simple pattern detection - in real implementation would be more sophisticated
    const recentLogs = this.auditLogs.filter(
      (log) =>
        log.userId === context.userContext?.userId &&
        log.createdAt > new Date(Date.now() - 60000), // Last minute
    );

    return recentLogs.length > 10; // More than 10 requests per minute
  }

  private async detectPrivilegeEscalation(
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    // Check if user is trying to access resources above their hierarchy level
    return (
      context.userContext?.hierarchyLevel > 7 && // Below manager level
      ['MANAGE_USERS', 'SYSTEM_CONFIG', 'SECURITY_ADMIN'].includes(
        context.action,
      )
    );
  }

  private async detectPolicyViolation(
    _context: EnhancedPermissionContext,
  ): Promise<boolean> {
    // Check for policy violations based on context
    return false; // TODO: Implement policy violations detection
  }

  private async logSecurityEvent(
    context: EnhancedPermissionContext,
    alertType: string,
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      eventType: alertType,
      eventCategory: 'SECURITY',
      severity: 'HIGH',
      userId: context.userContext?.userId || 'unknown',
      workspaceId: context.userContext?.workspaceId,
      workspaceMemberId: context.userContext?.workspaceMemberId,
      action: context.action,
      resource: context.resourceContext?.objectName,
      result: 'WARNING',
      details: { alertType, detectedAt: new Date() },
      metadata: { timestamp: new Date() },
      processed: false,
      createdAt: new Date(),
    };

    this.auditLogs.push(auditEntry);
    await this.generateSecurityAlert(auditEntry);
  }

  private generateComplianceRecommendations(
    _report: ComplianceReportData,
  ): string[] {
    const recommendations: string[] = [];

    // TODO: Implement recommendations based on report data
    recommendations.push(
      'Regular security audit and access review recommended',
    );

    return recommendations;
  }

  /**
   * Helper methods for creating results
   */
  private createErrorResult(
    error: string,
    startTime: number,
  ): StepValidationResult {
    return {
      result: 'ERROR',
      reason: `Audit logging error: ${error}`,
      continue: true, // Continue even if audit fails
      executionTime: Date.now() - startTime,
      errors: [error],
    };
  }

  /**
   * Public methods for accessing audit data
   */
  getAuditLogs(_filters?: AuditFilter): AuditLogEntry[] {
    return this.auditLogs; // In real implementation, would apply filters
  }

  getSecurityAlerts(_filters?: AuditFilter): SecurityAlert[] {
    return this.securityAlerts; // In real implementation, would apply filters
  }

  getComplianceReports(_filters?: AuditFilter): ComplianceReportData[] {
    return []; // In real implementation, would return compliance reports
  }
}
