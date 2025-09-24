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
      // Build enhanced permission context
      const enhancedContext = await this.buildPermissionContext(
        context,
        permissionMetadata,
      );

      // Execute validation
      const result =
        await this.validationOrchestrator.executeValidation(enhancedContext);

      // Handle result
      return this.handleValidationResult(result, enhancedContext);
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
   */
  private getPermissionMetadata(
    context: ExecutionContext,
  ): PermissionMetadata | null {
    // Check method-level permission first
    const methodPermission = this.reflector.get(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (methodPermission) {
      return methodPermission;
    }

    // Check class-level permission
    const classPermission = this.reflector.get(
      PERMISSION_KEY,
      context.getClass(),
    );

    if (classPermission) {
      return classPermission;
    }

    return null;
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
    const resourceContext: ResourceContext = {
      objectName: metadata.objectName || this.extractObjectName(context),
      recordId: this.extractRecordId(request, gqlContext),
      resourceType: this.determineResourceType(metadata.objectName),
      resourceCategory: 'BUSINESS_DATA',
      ownerId: this.extractOwnerId(request, gqlContext),
      isSystemResource: false,
      isSensitive: this.isSensitiveResource(metadata.objectName),
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
   * Extract record ID from request
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
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    throw new ForbiddenException(
      result.reason || 'Access denied by permission validation',
    );
  }
}
