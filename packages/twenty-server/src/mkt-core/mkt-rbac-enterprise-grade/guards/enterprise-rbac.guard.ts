/**
 * Basic Enterprise RBAC Guard
 * Provides simplified permission checking using the Enterprise RBAC system
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Request } from 'express';

import { ValidationOrchestratorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/validation-orchestrator.service';
import {
  EnhancedPermissionContext,
  EnhancedPermissionResult,
  EnhancedUserContext,
  ResourceContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  GraphQLOperationType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  PERMISSION_KEY,
  PermissionMetadata,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators/permission.decorator';

/**
 * Basic Enterprise RBAC Guard
 */
@Injectable()
export class EnterpriseRbacGuard implements CanActivate {
  private readonly logger = new Logger(EnterpriseRbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly validationOrchestrator: ValidationOrchestratorService,
  ) {}

  /**
   * Main guard method
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Get permission metadata from decorator
      const permissionMetadata = this.getPermissionMetadata(context);

      if (!permissionMetadata) {
        // No permission required
        return true;
      }

      // Skip validation if specified
      if (permissionMetadata.skipValidation) {
        return true;
      }

      // Allow anonymous access if specified
      if (permissionMetadata.allowAnonymous) {
        this.logger.debug('Anonymous access allowed for this endpoint');

        return true;
      }

      // Build enhanced permission context
      const enhancedContext = await this.buildPermissionContext(
        context,
        permissionMetadata,
      );

      // Execute validation
      const result =
        await this.validationOrchestrator.executeValidation(enhancedContext);

      // Handle result with custom error message if provided
      return this.handleValidationResult(
        result,
        enhancedContext,
        permissionMetadata.errorMessage,
      );
    } catch (error) {
      this.logger.error(
        `Enterprise RBAC Guard error: ${error.message}`,
        error.stack,
      );

      // Fail securely - deny access on errors
      throw new ForbiddenException(
        'Access denied due to permission validation error',
      );
    }
  }

  /**
   * Get permission metadata from reflection
   * Merges class-level and method-level metadata, with method-level taking precedence
   */
  private getPermissionMetadata(
    context: ExecutionContext,
  ): PermissionMetadata | null {
    // Get class-level permission
    const classPermission = this.reflector.get<PermissionMetadata>(
      PERMISSION_KEY,
      context.getClass(),
    );

    // Get method-level permission
    const methodPermission = this.reflector.get<PermissionMetadata>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    // No permissions defined at all
    if (!classPermission && !methodPermission) {
      return null;
    }

    // Only class-level defined
    if (classPermission && !methodPermission) {
      return classPermission;
    }

    // Only method-level defined
    if (!classPermission && methodPermission) {
      return methodPermission;
    }

    // Both defined - merge with method-level taking precedence
    return {
      ...classPermission,
      ...methodPermission,
      // Ensure resource is inherited if not overridden
      resource: methodPermission.resource || classPermission.resource,
    };
  }

  /**
   * Build enhanced permission context from execution context
   */
  private async buildPermissionContext(
    context: ExecutionContext,
    metadata: PermissionMetadata,
  ): Promise<EnhancedPermissionContext> {
    const { request, gqlContext } = this.extractRequestInfo(context);
    // Get basic user info from request
    const workspaceMemberId = this.extractWorkspaceMemberId(request);
    const workspaceId = this.extractWorkspaceId(request);

    if (!workspaceMemberId || !workspaceId) {
      throw new UnauthorizedException(
        'Missing workspace member or workspace ID',
      );
    }

    // Build basic user context - Step 2 will handle enrichment
    const basicUserContext: Partial<EnhancedUserContext> = {
      ...request.user,
      workspaceMemberId,
      workspaceId,
      userAgent: request.get('User-Agent'),
      sessionId: request.sessionID,
      deviceFingerprint: this.generateDeviceFingerprint(request),

      // Basic flags for Step 2 to know enrichment is needed
      isEnriched: false,
    };

    // Build resource context
    const resourceName =
      metadata.resource ||
      metadata.objectName ||
      this.extractObjectName(context);
    const resourceContext: ResourceContext = {
      objectName: resourceName,
      recordId: this.extractRecordIdFromMetadata(request, gqlContext, metadata),
      resourceType: this.determineResourceType(resourceName),
      resourceCategory: 'BUSINESS_DATA',
      ownerId: this.extractOwnerId(request, gqlContext),
      isSystemResource: false,
      isSensitive: this.isSensitiveResource(resourceName),
      confidentialityLevel: 'INTERNAL',
      isActive: true,
    };

    return {
      action: metadata.action,
      operationType: gqlContext
        ? this.mapToGraphQLOperationType(
            this.getGraphQLOperationType(gqlContext),
          )
        : undefined,
      operationName: gqlContext ? this.getOperationName(gqlContext) : undefined,
      requestId: this.generateRequestId(),

      userContext: basicUserContext as EnhancedUserContext,
      resourceContext,

      request,
      gqlContext,

      // Cache control from decorator
      cacheContext: {
        enabled: metadata.enableCache ?? true, // Default: true
        ttl: metadata.cacheTTL,
        forceRefresh: false,
      },

      // Performance settings for basic validation
      validationMode: 'PERMISSIVE',
      failFast: true,
      skipSteps: [
        // Skip advanced steps for basic validation
        6,
        7,
        8,
        9,
        10,
        11,
        12, // Skip hierarchy, policy, special permissions, etc.
      ],
      timeoutMs: 5000, // 5 second timeout
      priorityLevel: 'NORMAL',
      executionMode: 'SYNC',

      startTime: Date.now(),
    };
  }

  /**
   * Extract request information from execution context
   */
  private extractRequestInfo(context: ExecutionContext): {
    request: Request;
    gqlContext?: GqlExecutionContext;
  } {
    if (context.getType() === 'http') {
      // REST API context
      const request = context.switchToHttp().getRequest<Request>();

      return { request };
    } else if (context.getType<string>() === 'graphql') {
      // GraphQL context
      const gqlContext = GqlExecutionContext.create(context);
      const request = gqlContext.getContext().req;

      return { request, gqlContext };
    } else {
      throw new Error('Unsupported execution context type');
    }
  }

  /**
   * Extract workspace member ID from request
   */
  private extractWorkspaceMemberId(request: Request): string | undefined {
    return (
      request?.workspaceMemberId ||
      (request.headers['x-workspace-member-id'] as string) ||
      (request.query.workspaceMemberId as string)
    );
  }

  /**
   * Extract workspace ID from request
   */
  private extractWorkspaceId(request: Request): string | undefined {
    return (
      request?.workspaceId ||
      (request.headers['x-workspace-id'] as string) ||
      (request.query.workspaceId as string)
    );
  }

  /**
   * Extract object name from execution context
   */
  private extractObjectName(context: ExecutionContext): string {
    // Try to get from GraphQL info
    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const info = gqlContext.getInfo();

      return info?.parentType?.name || 'unknown';
    }

    // For REST, try to extract from URL or controller name
    const controllerName = context.getClass().name;

    return controllerName.replace(/Controller$/, '').toLowerCase();
  }

  /**
   * Extract record ID from request based on permission metadata
   * Supports recordIdParam and recordIdPath from @Permission decorator
   */
  private extractRecordIdFromMetadata(
    request: Request,
    gqlContext: GqlExecutionContext | undefined,
    metadata: PermissionMetadata,
  ): string | undefined {
    // 1. Check if recordIdParam is specified (e.g., 'id', 'orderId')
    if (metadata.recordIdParam && gqlContext) {
      const variables = gqlContext.getArgs();
      const recordId = variables[metadata.recordIdParam];

      if (recordId) {
        this.logger.debug(
          `RecordId extracted from param: ${metadata.recordIdParam}`,
          {
            recordId,
          },
        );

        return recordId;
      }
    }

    // 2. Check if recordIdPath is specified (e.g., 'input.id', 'input.data.orderId')
    if (metadata.recordIdPath && gqlContext) {
      const variables = gqlContext.getArgs();
      const recordIdValue = this.extractValueByPath(
        variables,
        metadata.recordIdPath,
      );

      // Type guard: ensure the value is a string
      if (recordIdValue && typeof recordIdValue === 'string') {
        this.logger.debug(
          `RecordId extracted from path: ${metadata.recordIdPath}`,
          {
            recordId: recordIdValue,
          },
        );

        return recordIdValue;
      }
    }

    // 3. Fallback to default extraction logic
    return this.extractRecordId(request, gqlContext);
  }

  /**
   * Extract record ID from request (legacy/default method)
   */
  private extractRecordId(
    request: Request,
    gqlContext?: GqlExecutionContext,
  ): string | undefined {
    // From URL params
    if (request.params?.id) {
      return request.params.id;
    }

    // From GraphQL variables
    if (gqlContext) {
      const variables = gqlContext.getArgs();

      return variables?.id || variables?.recordId || variables?.filter?.id;
    }

    // From query parameters
    return request.query.id as string;
  }

  /**
   * Extract value from object by path (e.g., 'input.id', 'data.user.id')
   */
  private extractValueByPath(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    if (!obj || !path) return undefined;

    const keys = path.split('.');
    let value: unknown = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }

      // Type guard to ensure value is object before accessing property
      if (typeof value !== 'object') {
        return undefined;
      }

      value = (value as Record<string, unknown>)[key];
    }

    return value;
  }

  /**
   * Extract owner ID from request
   */
  private extractOwnerId(
    request: Request,
    gqlContext?: GqlExecutionContext,
  ): string | undefined {
    // From GraphQL variables
    if (gqlContext) {
      const variables = gqlContext.getArgs();

      return variables?.ownerId || variables?.createdBy;
    }

    // From request body
    return request.body?.ownerId || request.body?.createdBy;
  }

  /**
   * Determine resource type based on object name
   */
  private determineResourceType(
    objectName?: string,
  ): ResourceContext['resourceType'] {
    if (!objectName) return 'BUSINESS_DATA';

    const lowerName = objectName.toLowerCase();

    if (lowerName.includes('user') || lowerName.includes('member')) {
      return 'USER_MGMT';
    }
    if (lowerName.includes('financial') || lowerName.includes('payment')) {
      return 'FINANCIAL';
    }
    if (lowerName.includes('config') || lowerName.includes('setting')) {
      return 'SYSTEM_CONFIG';
    }
    if (lowerName.includes('report') || lowerName.includes('analytics')) {
      return 'REPORTING';
    }

    return 'BUSINESS_DATA';
  }

  /**
   * Check if resource is sensitive
   */
  private isSensitiveResource(objectName?: string): boolean {
    if (!objectName) return false;

    const sensitivePatterns = [
      'salary',
      'payment',
      'financial',
      'personal',
      'medical',
      'legal',
      'audit',
    ];

    const lowerName = objectName.toLowerCase();

    return sensitivePatterns.some((pattern) => lowerName.includes(pattern));
  }

  /**
   * Get GraphQL operation type
   */
  private getGraphQLOperationType(gqlContext: GqlExecutionContext): string {
    const info = gqlContext.getInfo();

    return info?.operation?.operation || 'query';
  }

  /**
   * Map string operation type to GraphQLOperationType enum
   */
  private mapToGraphQLOperationType(
    operationType: string,
  ): GraphQLOperationType {
    switch (operationType.toUpperCase()) {
      case 'QUERY':
        return GraphQLOperationType.QUERY;
      case 'MUTATION':
        return GraphQLOperationType.MUTATION;
      case 'SUBSCRIPTION':
        return GraphQLOperationType.SUBSCRIPTION;
      default:
        return GraphQLOperationType.QUERY;
    }
  }

  /**
   * Get operation name
   */
  private getOperationName(gqlContext: GqlExecutionContext): string {
    const info = gqlContext.getInfo();

    return info?.operation?.name?.value || info?.fieldName || 'unknown';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate device fingerprint from request headers
   */
  private generateDeviceFingerprint(request: Request): string {
    const components = [
      request.get('User-Agent') || '',
      request.get('Accept-Language') || '',
      request.get('Accept-Encoding') || '',
      request.ip || '',
    ];

    // Simple hash of request characteristics
    const fingerprint = components.join('|');

    return Buffer.from(fingerprint).toString('base64').slice(0, 32);
  }

  /**
   * Handle validation result
   */
  private handleValidationResult(
    result: EnhancedPermissionResult,
    context: EnhancedPermissionContext,
    customErrorMessage?: string,
  ): boolean {
    if (result.result === CheckResult.PASS) {
      this.logger.debug(
        `Access granted for action ${context.action} on ${context.resourceContext.objectName}`,
      );

      return true;
    }

    this.logger.warn(
      `Access denied for action ${context.action} on ${context.resourceContext.objectName}: ${result.reason}`,
    );

    // Log additional details for debugging
    if (result.warnings && result.warnings.length > 0) {
      this.logger.warn(
        `Validation warnings: ${JSON.stringify(result.warnings)}`,
      );
    }

    // Use custom error message if provided, otherwise use default
    const errorMessage =
      customErrorMessage ||
      result.reason ||
      'Access denied by permission validation';

    throw new ForbiddenException(errorMessage);
  }
}
