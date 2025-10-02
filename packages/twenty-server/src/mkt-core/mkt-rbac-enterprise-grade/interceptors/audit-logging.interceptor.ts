/**
 * Audit Logging Interceptor
 * Automatically captures and logs sensitive operations for RBAC audit trail
 * Integrates with Step 14 Audit & Logging Service
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { DateTime } from 'luxon';

import { Step14AuditLoggingService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/step14-audit-logging.service';
import {
  PermissionAction,
  RESOURCE_TYPES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import { EnhancedPermissionContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';

/**
 * Audit configuration for different operation types
 */
type AuditConfiguration = {
  enabled: boolean;
  logLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  captureRequestBody: boolean;
  captureResponseBody: boolean;
  sensitiveDataRedaction: boolean;
  requiresApproval: boolean;
  realTimeAlerts: boolean;
};

/**
 * Operation metadata for audit logging
 */
type OperationMetadata = {
  operationType: string;
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataTypes: string[];
  complianceFrameworks: string[];
  retentionDays: number;
};

/**
 * Interceptor result metadata
 */
type InterceptorResult = {
  success: boolean;
  duration: number;
  statusCode?: number;
  error?: string;
  responseSize?: number;
  cached?: boolean;
};

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(
    private readonly auditLoggingService: Step14AuditLoggingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = DateTime.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract operation metadata
    const operationMetadata = this.extractOperationMetadata(context);

    // Check if auditing is required for this operation
    const auditConfig = this.getAuditConfiguration(operationMetadata);

    if (!auditConfig.enabled) {
      return next.handle();
    }

    // Build enhanced permission context for audit logging
    const permissionContext = this.buildPermissionContext(
      request,
      response,
      context,
      operationMetadata,
    );

    // Log operation start if comprehensive logging is enabled
    if (auditConfig.logLevel === 'COMPREHENSIVE') {
      this.logOperationStart(permissionContext, auditConfig);
    }

    return next.handle().pipe(
      tap((data) => {
        // Log successful operation
        const result: InterceptorResult = {
          success: true,
          duration: DateTime.now().diff(startTime).toMillis(),
          statusCode: response.statusCode,
          responseSize: this.calculateResponseSize(data),
          cached: response.getHeader('x-cache-hit') === 'true',
        };

        this.logOperation(
          permissionContext,
          auditConfig,
          operationMetadata,
          result,
          data,
        );
      }),
      catchError((error) => {
        // Log failed operation
        const result: InterceptorResult = {
          success: false,
          duration: DateTime.now().diff(startTime).toMillis(),
          statusCode: response.statusCode || 500,
          error: error.message || 'Unknown error',
        };

        this.logOperation(
          permissionContext,
          auditConfig,
          operationMetadata,
          result,
          null,
          error,
        );

        throw error;
      }),
    );
  }

  /**
   * Extract operation metadata from execution context
   */
  private extractOperationMetadata(
    context: ExecutionContext,
  ): OperationMetadata {
    const handler = context.getHandler();
    const controller = context.getClass();
    const methodName = handler.name;
    const controllerName = controller.name;

    // Determine operation type and sensitivity based on method and controller
    const operationType = this.determineOperationType(
      methodName,
      controllerName,
    );
    const sensitivity = this.determineSensitivity(methodName, controllerName);
    const dataTypes = this.extractDataTypes(methodName, controllerName);
    const complianceFrameworks = this.getComplianceFrameworks(
      sensitivity,
      dataTypes,
    );
    const retentionDays = this.getRetentionPeriod(sensitivity, dataTypes);

    return {
      operationType,
      sensitivity,
      dataTypes,
      complianceFrameworks,
      retentionDays,
    };
  }

  /**
   * Get audit configuration based on operation metadata
   */
  private getAuditConfiguration(
    metadata: OperationMetadata,
  ): AuditConfiguration {
    // Default configuration
    const defaultConfig: AuditConfiguration = {
      enabled: true,
      logLevel: 'BASIC',
      captureRequestBody: false,
      captureResponseBody: false,
      sensitiveDataRedaction: true,
      requiresApproval: false,
      realTimeAlerts: false,
    };

    // Adjust configuration based on sensitivity
    switch (metadata.sensitivity) {
      case 'CRITICAL':
        return {
          ...defaultConfig,
          logLevel: 'COMPREHENSIVE',
          captureRequestBody: true,
          captureResponseBody: true,
          requiresApproval: true,
          realTimeAlerts: true,
        };

      case 'HIGH':
        return {
          ...defaultConfig,
          logLevel: 'DETAILED',
          captureRequestBody: true,
          captureResponseBody: false,
          realTimeAlerts: true,
        };

      case 'MEDIUM':
        return {
          ...defaultConfig,
          logLevel: 'DETAILED',
          captureRequestBody: false,
          captureResponseBody: false,
        };

      case 'LOW':
      default:
        return defaultConfig;
    }
  }

  /**
   * Build enhanced permission context for audit logging
   */
  private buildPermissionContext(
    request: Request,
    response: Response,
    context: ExecutionContext,
    metadata: OperationMetadata,
  ): EnhancedPermissionContext {
    // Extract user context from request (assuming it's attached by auth middleware)
    const userContext = (request as unknown as { user?: unknown }).user || {};

    // Extract workspace information
    const workspaceId = this.extractWorkspaceId(request);

    // Build resource context
    const resourceContext = {
      resourceType: this.extractResourceType(context),
      objectName: this.extractObjectName(context),
      recordId: this.extractRecordId(request),
      confidentialityLevel: this.mapSensitivityToConfidentiality(
        metadata.sensitivity,
      ),
      isFinancialData: this.isFinancialData(metadata.dataTypes),
      isSensitive: metadata.sensitivity !== 'LOW',
    };

    // Determine action from HTTP method and endpoint
    const action = this.determineAction(request.method, request.path);

    return {
      userContext: {
        workspaceMemberId:
          (userContext as { workspaceMemberId?: string }).workspaceMemberId ||
          '',
        workspaceId,
        id: (userContext as { id?: string }).id || '',
        email: (userContext as { email?: string }).email,
        disabled: false,
        hierarchyLevel:
          (userContext as { hierarchyLevel?: number }).hierarchyLevel || 0,
        departmentId: (userContext as { departmentId?: string }).departmentId,
        isActive: true,
        sessionId: this.extractSessionId(request),
      },
      resourceContext: {
        ...resourceContext,
        resourceCategory: 'BUSINESS_DATA',
        resourceType: (resourceContext.resourceType in RESOURCE_TYPES
          ? resourceContext.resourceType
          : 'BUSINESS_DATA') as keyof typeof RESOURCE_TYPES,
        confidentialityLevel: this.mapSensitivityToConfidentiality(
          metadata.sensitivity,
        ),
      },
      action: action as PermissionAction,
      request,
      requestId: this.extractRequestId(request),
      metadata: {
        operationType: metadata.operationType,
        sensitivity: metadata.sensitivity,
        dataTypes: JSON.stringify(metadata.dataTypes || []),
        complianceFrameworks: JSON.stringify(
          metadata.complianceFrameworks || [],
        ),
        interceptorTimestamp: new Date(),
      },
    };
  }

  /**
   * Log operation start (for comprehensive logging)
   */
  private logOperationStart(
    context: EnhancedPermissionContext,
    config: AuditConfiguration,
  ): void {
    this.logger.debug('Starting operation audit logging', {
      userId: context.userContext?.id,
      action: context.action,
      resourceType: context.resourceContext?.resourceType,
      logLevel: config.logLevel,
      requestId: context.requestId,
    });
  }

  /**
   * Main operation logging method
   */
  private async logOperation(
    context: EnhancedPermissionContext,
    config: AuditConfiguration,
    metadata: OperationMetadata,
    result: InterceptorResult,
    responseData?: unknown,
    error?: Error,
  ): Promise<void> {
    try {
      // Enhance context with operation result
      const enhancedContext = {
        ...context,
        metadata: {
          ...context.metadata,
          operationSuccess: result.success,
          operationDuration: result.duration,
          operationStatusCode: result.statusCode || 200,
          operationError: result.error || '',
          operationResponseSize: result.responseSize || 0,
          operationCached: result.cached || false,
          auditConfigEnabled: config.enabled,
          captureRequestBody: config.captureRequestBody,
          captureResponseBody: config.captureResponseBody,
          interceptorTimestamp: new Date(),
        },
      };

      // Update existing metadata fields based on operation outcome
      if (enhancedContext.metadata) {
        enhancedContext.metadata.operationSuccess = result.success;
        enhancedContext.metadata.operationError = result.success
          ? ''
          : error?.message || 'Unknown error';
      }

      // Perform audit logging through Step 14 service
      await this.auditLoggingService.validate(enhancedContext);

      // Generate real-time alerts if configured
      if (config.realTimeAlerts && this.shouldGenerateAlert(result, metadata)) {
        await this.generateRealTimeAlert(enhancedContext, result, metadata);
      }

      this.logger.debug('Operation audit logging completed', {
        userId: context.userContext?.id,
        action: context.action,
        success: result.success,
        duration: result.duration,
        requestId: context.requestId,
      });
    } catch (auditError) {
      // Log audit failure but don't fail the main operation
      this.logger.error('Failed to perform audit logging', {
        error: auditError.message,
        userId: context.userContext?.id,
        action: context.action,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Helper methods for extracting metadata and context information
   */
  private determineOperationType(
    methodName: string,
    controllerName: string,
  ): string {
    // Map controller and method names to operation types
    const operationMap: Record<string, string> = {
      create: 'CREATE',
      update: 'UPDATE',
      delete: 'DELETE',
      find: 'READ',
      get: 'READ',
      list: 'READ',
      export: 'EXPORT',
      import: 'IMPORT',
      bulk: 'BULK_OPERATION',
      admin: 'ADMIN_OPERATION',
      system: 'SYSTEM_OPERATION',
    };

    for (const [key, value] of Object.entries(operationMap)) {
      if (
        methodName.toLowerCase().includes(key) ||
        controllerName.toLowerCase().includes(key)
      ) {
        return value;
      }
    }

    return 'OPERATION';
  }

  private determineSensitivity(
    methodName: string,
    controllerName: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalPatterns = ['admin', 'system', 'security', 'auth'];
    const highPatterns = [
      'financial',
      'payment',
      'invoice',
      'salary',
      'employee',
    ];
    const mediumPatterns = ['customer', 'personal', 'contract', 'report'];

    const fullName = `${controllerName} ${methodName}`.toLowerCase();

    if (criticalPatterns.some((pattern) => fullName.includes(pattern))) {
      return 'CRITICAL';
    }
    if (highPatterns.some((pattern) => fullName.includes(pattern))) {
      return 'HIGH';
    }
    if (mediumPatterns.some((pattern) => fullName.includes(pattern))) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private extractDataTypes(
    methodName: string,
    controllerName: string,
  ): string[] {
    const dataTypes: string[] = [];
    const fullName = `${controllerName} ${methodName}`.toLowerCase();

    // Map patterns to data types
    const dataTypePatterns: Record<string, string> = {
      financial: 'FINANCIAL_DATA',
      payment: 'PAYMENT_DATA',
      invoice: 'INVOICE_DATA',
      salary: 'SALARY_DATA',
      employee: 'EMPLOYEE_DATA',
      customer: 'CUSTOMER_DATA',
      personal: 'PERSONAL_DATA',
      contract: 'CONTRACT_DATA',
      legal: 'LEGAL_DATA',
      audit: 'AUDIT_DATA',
      security: 'SECURITY_DATA',
    };

    for (const [pattern, dataType] of Object.entries(dataTypePatterns)) {
      if (fullName.includes(pattern)) {
        dataTypes.push(dataType);
      }
    }

    return dataTypes.length > 0 ? dataTypes : ['GENERAL_DATA'];
  }

  private getComplianceFrameworks(
    sensitivity: string,
    dataTypes: string[],
  ): string[] {
    const frameworks: string[] = ['ISO_27001']; // Base framework

    if (sensitivity === 'CRITICAL' || sensitivity === 'HIGH') {
      frameworks.push('SOC_2');
    }

    if (
      dataTypes.some(
        (type) => type.includes('PERSONAL') || type.includes('EMPLOYEE'),
      )
    ) {
      frameworks.push('GDPR', 'VIETNAM_LAW');
    }

    if (
      dataTypes.some(
        (type) => type.includes('FINANCIAL') || type.includes('PAYMENT'),
      )
    ) {
      frameworks.push('SOX', 'PCI_DSS');
    }

    return frameworks;
  }

  private getRetentionPeriod(sensitivity: string, dataTypes: string[]): number {
    if (
      dataTypes.some(
        (type) => type.includes('FINANCIAL') || type.includes('AUDIT'),
      )
    ) {
      return 2555; // 7 years
    }
    if (sensitivity === 'HIGH' || sensitivity === 'CRITICAL') {
      return 1095; // 3 years
    }

    return 365; // 1 year
  }

  private extractWorkspaceId(request: Request): string {
    // Extract workspace ID from various possible sources
    return (request.headers['x-workspace-id'] ||
      request.params.workspaceId ||
      request.query.workspaceId ||
      (request as unknown as { workspace?: { id?: string } }).workspace?.id ||
      'unknown') as string;
  }

  private extractResourceType(context: ExecutionContext): string {
    const controllerName = context.getClass().name;

    // Remove 'Controller' suffix and convert to resource type
    return controllerName.replace(/Controller$/, '').toLowerCase();
  }

  private extractObjectName(context: ExecutionContext): string {
    const controllerName = context.getClass().name;

    return controllerName.replace(/Controller$/, '');
  }

  private extractRecordId(request: Request): string | undefined {
    // Extract record ID from URL parameters
    return (
      request.params.id ||
      request.params.recordId ||
      (request.query.id as string)
    );
  }

  private extractSessionId(request: Request): string | undefined {
    return (request.headers['x-session-id'] ||
      request.sessionID ||
      (request as unknown as { session?: { id?: string } }).session
        ?.id) as string;
  }

  private extractRequestId(request: Request): string | undefined {
    return (request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`) as string;
  }

  private mapSensitivityToConfidentiality(
    sensitivity: string,
  ): 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'TOP_SECRET' {
    const mapping: Record<
      string,
      'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'TOP_SECRET'
    > = {
      CRITICAL: 'TOP_SECRET',
      HIGH: 'RESTRICTED',
      MEDIUM: 'CONFIDENTIAL',
      LOW: 'INTERNAL',
    };

    return mapping[sensitivity] || 'INTERNAL';
  }

  private isFinancialData(dataTypes: string[]): boolean {
    return dataTypes.some(
      (type) =>
        type.includes('FINANCIAL') ||
        type.includes('PAYMENT') ||
        type.includes('INVOICE') ||
        type.includes('SALARY'),
    );
  }

  private determineAction(method: string, path: string): string {
    const methodMap: Record<string, string> = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    let action = methodMap[method.toUpperCase()] || 'OPERATION';

    // Refine action based on path
    if (path.includes('/export')) {
      action = 'EXPORT';
    } else if (path.includes('/import')) {
      action = 'IMPORT';
    } else if (path.includes('/bulk')) {
      action = `BULK_${action}`;
    } else if (path.includes('/admin')) {
      action = `ADMIN_${action}`;
    }

    return action.toUpperCase();
  }

  private calculateResponseSize(data: unknown): number {
    if (!data) return 0;
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private sanitizeData(data: unknown, redactSensitive: boolean): unknown {
    if (!redactSensitive || !data) return data;

    // Simple redaction for sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'ssn',
      'taxId',
      'creditCard',
      'bankAccount',
      'salary',
      'personalId',
    ];

    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data } as Record<string, unknown>;

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    }

    return data;
  }

  private shouldGenerateAlert(
    result: InterceptorResult,
    metadata: OperationMetadata,
  ): boolean {
    return (
      !result.success ||
      metadata.sensitivity === 'CRITICAL' ||
      (metadata.sensitivity === 'HIGH' && result.duration > 5000) // High-sensitivity operations taking over 5 seconds
    );
  }

  private async generateRealTimeAlert(
    context: EnhancedPermissionContext,
    result: InterceptorResult,
    metadata: OperationMetadata,
  ): Promise<void> {
    try {
      this.logger.warn('Generating real-time alert for operation', {
        userId: context.userContext?.id,
        action: context.action,
        success: result.success,
        sensitivity: metadata.sensitivity,
        duration: result.duration,
        requestId: context.requestId,
      });

      // In a real implementation, this would send alerts to monitoring systems,
      // Slack channels, email notifications, etc.
      // For now, we'll just log the alert
    } catch (error) {
      this.logger.error('Failed to generate real-time alert', {
        error: error.message,
        requestId: context.requestId,
      });
    }
  }
}
