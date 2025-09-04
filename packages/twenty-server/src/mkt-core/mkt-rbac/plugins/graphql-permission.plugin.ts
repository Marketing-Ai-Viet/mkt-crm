import { Plugin } from '@nestjs/apollo';
import { Injectable, Logger } from '@nestjs/common';

import { GraphQLRequestContext } from 'apollo-server-core';
import { GraphQLRequestListener } from 'apollo-server-plugin-base';

import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import { PermissionContextService } from 'src/mkt-core/mkt-rbac/services/permission-context.service';
import { PermissionContext } from 'src/mkt-core/mkt-rbac/types/permission-context.type';
import {
  PermissionAction,
  GraphQLOperationType,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

@Injectable()
@Plugin()
export class GraphQLPermissionPlugin {
  private readonly logger = new Logger(GraphQLPermissionPlugin.name);

  constructor(
    private readonly rbacService: MktRbacService,
    private readonly permissionContextService: PermissionContextService,
  ) {}

  requestDidStart(): GraphQLRequestListener {
    return {
      didResolveOperation: async (requestContext: GraphQLRequestContext) => {
        await this.logGraphQLOperation(requestContext);
      },

      didEncounterErrors: async (requestContext: GraphQLRequestContext) => {
        await this.logGraphQLErrors(requestContext);
      },

      willSendResponse: async (requestContext: GraphQLRequestContext) => {
        await this.logGraphQLResponse(requestContext);
      },
    };
  }

  private async logGraphQLOperation(
    requestContext: GraphQLRequestContext,
  ): Promise<void> {
    try {
      const { request, context } = requestContext;

      // Extract user from context
      const user = this.extractUserFromContext(context);

      if (!user) {
        return; // No user, skip logging
      }

      const operation = request.operationName || 'UnnamedOperation';
      const operationType = requestContext.operation?.operation || 'query';

      // Create permission context for logging
      const permissionContext: PermissionContext = {
        action: this.mapOperationTypeToAction(operationType),
        operationType: this.mapStringToGraphQLOperationType(operationType),
        operationName: operation,
        objectName: this.extractObjectNameFromQuery(request.query || ''),
        workspaceMemberId: user.workspaceMemberId,
        workspaceId: user.workspaceId,
        variables: request.variables,
        metadata: {
          plugin: 'GraphQLPermissionPlugin',
          query: request.query,
          operationName: operation,
        },
      };

      // Store context for later use
      this.permissionContextService.setContext(permissionContext);

      this.logger.debug(
        `GraphQL operation started: ${operation} (${operationType}) by user ${user.workspaceMemberId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log GraphQL operation: ${error.message}`);
    }
  }

  private async logGraphQLErrors(
    requestContext: GraphQLRequestContext,
  ): Promise<void> {
    try {
      const { errors, context } = requestContext;
      const user = this.extractUserFromContext(context);

      if (!user || !errors?.length) {
        return;
      }

      // Check for permission-related errors
      const permissionErrors = errors.filter(
        (error) =>
          error.message.includes('permission') ||
          error.message.includes('Forbidden') ||
          error.message.includes('Unauthorized'),
      );

      if (permissionErrors.length > 0) {
        this.logger.warn(
          `GraphQL permission errors for user ${user.workspaceMemberId}: ${permissionErrors.map((e) => e.message).join(', ')}`,
        );

        // Create audit entry for permission denial
        const context = this.permissionContextService.getContext();

        if (context) {
          const auditContext: PermissionContext = {
            ...context,
            metadata: {
              ...context.metadata,
              errorMessages: permissionErrors.map((e) => e.message).join('; '),
              errorCount: permissionErrors.length,
            },
          };

          // Audit the failed permission check
          await this.rbacService.checkPermission(auditContext);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to log GraphQL errors: ${error.message}`);
    }
  }

  private async logGraphQLResponse(
    requestContext: GraphQLRequestContext,
  ): Promise<void> {
    try {
      const { response, context } = requestContext;
      const user = this.extractUserFromContext(context);

      if (!user) {
        return;
      }

      const permissionContext = this.permissionContextService.getContext();

      if (!permissionContext) {
        return;
      }

      // Add response metadata
      if (response) {
        this.permissionContextService.addAuditMetadata(
          'responseSize',
          JSON.stringify(response.data || {}).length,
        );
        this.permissionContextService.addAuditMetadata(
          'hasErrors',
          !!response.errors?.length,
        );
        this.permissionContextService.addAuditMetadata(
          'errorCount',
          response.errors?.length || 0,
        );

        if (response.data) {
          this.permissionContextService.addAuditMetadata(
            'dataKeys',
            Object.keys(response.data).join(', '),
          );
        }
      }

      this.logger.debug(
        `GraphQL operation completed: ${permissionContext.operationName} for user ${user.workspaceMemberId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log GraphQL response: ${error.message}`);
    }
  }

  private extractUserFromContext(context: {
    req?: {
      user?: {
        id?: string;
        workspaceMember?: { id?: string };
        currentWorkspace?: { id?: string };
        currentUserWorkspace?: { workspaceId?: string };
      };
      headers?: Record<string, string>;
    };
    user?: {
      id?: string;
      workspaceMember?: { id?: string };
      currentWorkspace?: { id?: string };
      currentUserWorkspace?: { workspaceId?: string };
    };
  }): { workspaceMemberId: string; workspaceId: string } | null {
    // Try various ways to extract user from GraphQL context
    if (context.req?.user) {
      const workspaceMemberId =
        context.req.user.workspaceMember?.id || context.req.user.id;
      const workspaceId =
        context.req.user.currentWorkspace?.id ||
        context.req.user.currentUserWorkspace?.workspaceId;

      if (workspaceMemberId && workspaceId) {
        return { workspaceMemberId, workspaceId };
      }
    }

    if (context.user) {
      const workspaceMemberId =
        context.user.workspaceMember?.id || context.user.id;
      const workspaceId =
        context.user.currentWorkspace?.id ||
        context.user.currentUserWorkspace?.workspaceId;

      if (workspaceMemberId && workspaceId) {
        return { workspaceMemberId, workspaceId };
      }
    }

    // Check headers
    if (context.req?.headers) {
      const workspaceMemberId = context.req.headers['x-workspace-member-id'];
      const workspaceId = context.req.headers['x-workspace-id'];

      if (workspaceMemberId && workspaceId) {
        return { workspaceMemberId, workspaceId };
      }
    }

    return null;
  }

  private mapOperationTypeToAction(
    operationType: string,
  ): PermissionContext['action'] {
    switch (operationType.toLowerCase()) {
      case 'query':
        return PermissionAction.QUERY;
      case 'mutation':
        return PermissionAction.MUTATION;
      case 'subscription':
        return PermissionAction.SUBSCRIPTION;
      default:
        return PermissionAction.QUERY;
    }
  }

  private mapStringToGraphQLOperationType(
    operationType: string,
  ): GraphQLOperationType {
    switch (operationType.toLowerCase()) {
      case 'query':
        return GraphQLOperationType.QUERY;
      case 'mutation':
        return GraphQLOperationType.MUTATION;
      case 'subscription':
        return GraphQLOperationType.SUBSCRIPTION;
      default:
        return GraphQLOperationType.QUERY;
    }
  }

  private extractObjectNameFromQuery(query: string): string {
    // Simple regex to extract main object from GraphQL query
    // This is a basic implementation - you might want to use a proper GraphQL parser

    // Look for common patterns like "findMktKpis", "createMktKpi", etc.
    const operationMatch = query.match(
      /(?:query|mutation|subscription)\s+\w*\s*\{?\s*(\w+)/,
    );

    if (operationMatch) {
      const operationName = operationMatch[1];

      return this.convertOperationNameToObjectName(operationName);
    }

    // Look for field names that might indicate object type
    const fieldMatch = query.match(/\{\s*(\w+)/);

    if (fieldMatch) {
      return this.convertOperationNameToObjectName(fieldMatch[1]);
    }

    return 'unknown';
  }

  private convertOperationNameToObjectName(operationName: string): string {
    // Convert operation names like "findMktKpis" or "createMktKpi" to "mktKpi"
    const patterns = [
      /^(find|get|list|create|update|delete|remove)(.+?)s?$/i, // Handle plural/singular
      /^(.+)(Query|Mutation|Subscription)$/i,
    ];

    for (const pattern of patterns) {
      const match = operationName.match(pattern);

      if (match) {
        let objectName = match[2] || match[1];

        // Convert to camelCase and ensure it starts with 'mkt' if it's our object
        objectName = objectName.charAt(0).toLowerCase() + objectName.slice(1);

        // Remove plural 's' if present
        if (objectName.endsWith('s') && !objectName.endsWith('ss')) {
          objectName = objectName.slice(0, -1);
        }

        return objectName;
      }
    }

    // Fallback: just convert to camelCase
    return operationName.charAt(0).toLowerCase() + operationName.slice(1);
  }
}
