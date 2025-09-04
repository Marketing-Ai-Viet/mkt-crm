import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';

import {
  SKIP_LOGGING_PATHS,
  SKIP_LOGGING_PATTERNS,
  GRAPHQL_ENDPOINT,
  HTTP_STATUS_CODES,
  USER_EXTRACTION_FIELDS,
  AUDIT_METADATA_KEYS,
} from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import {
  PermissionAction,
  GraphQLOperationType,
  PermissionContext,
} from 'src/mkt-core/mkt-rbac';

@Injectable()
export class GraphQLLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GraphQLLoggingMiddleware.name);

  constructor(private readonly rbacService: MktRbacService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Skip permission logging for certain paths
    if (this.shouldSkipLogging(req)) {
      return next();
    }

    // Extract user information
    const user = this.extractUserFromRequest(req);

    if (!user) {
      return next(); // Not authenticated, skip logging
    }

    // Detect the GraphQL operation from the request
    const operation = this.parseGraphQLOperation(req);

    if (!operation) {
      return next(); // Cannot determine operation
    }

    // Create permission context for logging
    const context: PermissionContext = {
      action: operation.action,
      operationType: operation.operationType,
      operationName: operation.operationName,
      objectName: operation.objectName,
      recordId: operation.recordId,
      workspaceMemberId: user.workspaceMemberId,
      workspaceId: user.workspaceId,
      variables: operation.variables,
      request: req,
      metadata: {
        [AUDIT_METADATA_KEYS.MIDDLEWARE]: true,
        [AUDIT_METADATA_KEYS.ENDPOINT]: `${req.method} ${req.path}`,
        [AUDIT_METADATA_KEYS.QUERY]: operation.query,
      },
    };

    // Log the request start
    this.logger.debug(
      `GraphQL operation initiated: ${user.workspaceMemberId} -> ${operation.action} ${operation.objectName}${operation.recordId ? `/${operation.recordId}` : ''}`,
    );

    // Continue with the request
    next();

    // Log after response (in next tick to allow response to complete)
    setImmediate(() => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      this.logger.debug(
        `GraphQL request completed: ${req.method} ${req.path} - ${statusCode} (${duration}ms)`,
      );

      // For failed requests, we might want to audit the failure
      if (statusCode >= 400) {
        this.auditFailedRequest(context, statusCode, duration);
      }
    });
  }

  private shouldSkipLogging(req: Request): boolean {
    // Skip by exact path
    if ((SKIP_LOGGING_PATHS as readonly string[]).includes(req.path)) {
      return true;
    }

    // Skip by pattern
    return SKIP_LOGGING_PATTERNS.some((pattern) => pattern.test(req.path));
  }

  private extractUserFromRequest(
    req: Request,
  ): { workspaceMemberId: string; workspaceId: string } | null {
    // Same logic as in GraphQLPermissionGuard
    if (req.user) {
      const workspaceMemberId =
        req.user['workspaceMember']?.['id'] || req.user['id'];
      const workspaceId =
        req.user['currentWorkspace']?.['id'] ||
        req.user['currentUserWorkspace']?.['workspaceId'];

      if (workspaceMemberId && workspaceId) {
        return { workspaceMemberId, workspaceId };
      }
    }

    const workspaceMemberId = req.headers[
      USER_EXTRACTION_FIELDS.WORKSPACE_MEMBER_ID
    ] as string;
    const workspaceId = req.headers[
      USER_EXTRACTION_FIELDS.WORKSPACE_ID
    ] as string;

    if (workspaceMemberId && workspaceId) {
      return { workspaceMemberId, workspaceId };
    }

    return null;
  }

  private parseGraphQLOperation(req: Request): {
    action: PermissionAction;
    operationType: GraphQLOperationType;
    operationName: string;
    objectName: string;
    recordId?: string;
    variables?: Record<string, string | number | boolean | null>;
    query?: string;
  } | null {
    // Only handle GraphQL requests
    if (req.path !== GRAPHQL_ENDPOINT || req.method.toUpperCase() !== 'POST') {
      return null;
    }

    try {
      const { query, variables } = req.body;

      if (!query) return null;

      // Basic GraphQL query parsing
      const operationMatch = query.match(
        /(query|mutation|subscription)\s+\w*\s*\{?\s*(\w+)/,
      );

      if (!operationMatch) return null;

      const operationType = operationMatch[1] as GraphQLOperationType;
      const operationName = operationMatch[2];

      // Map GraphQL operations to RBAC actions
      let action: PermissionAction;

      if (operationType === GraphQLOperationType.QUERY) {
        action = PermissionAction.QUERY;
      } else if (operationType === GraphQLOperationType.MUTATION) {
        action = PermissionAction.MUTATION;
      } else {
        action = PermissionAction.SUBSCRIPTION;
      }

      // Extract object name from operation name
      const objectName = this.extractObjectNameFromGraphQL(operationName);

      if (!objectName) return null;

      // Extract record ID from variables if available
      const recordId = variables?.id || variables?.recordId;

      return {
        action,
        operationType,
        operationName,
        objectName,
        recordId,
        variables,
        query,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse GraphQL operation: ${error.message}`);

      return null;
    }
  }

  private extractObjectNameFromGraphQL(operationName: string): string | null {
    // Convert operation names like "findMktKpis" or "createMktKpi" to "mktKpi"
    const patterns = [
      /^(find|get|list|create|update|delete)(.+?)s?$/i, // Handle plural/singular
      /^(.+)(Query|Mutation|Subscription)$/i,
    ];

    for (const pattern of patterns) {
      const match = operationName.match(pattern);

      if (match) {
        let objectName = match[2] || match[1];

        // Convert to camelCase
        objectName = objectName.charAt(0).toLowerCase() + objectName.slice(1);

        // Remove plural 's' if present
        if (objectName.endsWith('s') && !objectName.endsWith('ss')) {
          objectName = objectName.slice(0, -1);
        }

        return objectName;
      }
    }

    return null;
  }

  private async auditFailedRequest(
    context: PermissionContext,
    statusCode: number,
    duration: number,
  ): Promise<void> {
    try {
      // Only audit security-related failures
      if (
        statusCode === HTTP_STATUS_CODES.UNAUTHORIZED ||
        statusCode === HTTP_STATUS_CODES.FORBIDDEN
      ) {
        // const result = {
        //   result: PERMISSION_RESULT_MAPPING.DENIED,
        //   source: PERMISSION_SOURCE_MAPPING.ROLE_BASED,
        //   reason: `HTTP ${statusCode} - ${statusCode === HTTP_STATUS_CODES.UNAUTHORIZED ? 'Unauthorized' : 'Forbidden'}`,
        //   metadata: {
        //     httpStatusCode: statusCode,
        //     endpoint: `${context.request?.method} ${context.request?.path}`,
        //   },
        // };

        // Use the RBAC service to audit this failed request
        await this.rbacService.checkPermission({
          ...context,
          metadata: {
            ...context.metadata,
            [AUDIT_METADATA_KEYS.AUDIT_ONLY]: true, // Special flag to indicate this is audit-only
            [AUDIT_METADATA_KEYS.FAILURE_STATUS_CODE]: statusCode,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to audit failed request: ${error.message}`);
    }
  }
}
