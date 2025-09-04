import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { GraphQLResolveInfo } from 'graphql';

import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import {
  PERMISSION_RESULT_MAPPING,
  USER_EXTRACTION_FIELDS,
} from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import {
  GRAPHQL_FIELD_PERMISSION_KEY,
  GRAPHQL_PERMISSION_KEY,
  GraphQLFieldPermissionRequirement,
  GraphQLPermissionRequirement,
} from 'src/mkt-core/mkt-rbac/decorators/graphql-permission.decorator';
import {
  GraphQLOperationType,
  PermissionContext,
} from 'src/mkt-core/mkt-rbac/types/permission-context.type';

@Injectable()
export class GraphQLPermissionGuard implements CanActivate {
  private readonly logger = new Logger(GraphQLPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: MktRbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for GraphQL permission requirement
    const graphqlPermission =
      this.reflector.getAllAndOverride<GraphQLPermissionRequirement>(
        GRAPHQL_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    // Check for field permission requirement
    const fieldPermission =
      this.reflector.getAllAndOverride<GraphQLFieldPermissionRequirement>(
        GRAPHQL_FIELD_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    // If no permission requirement, allow access
    if (!graphqlPermission && !fieldPermission) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo<GraphQLResolveInfo>();
    const args = gqlContext.getArgs();
    const parent = gqlContext.getRoot();

    // Extract user information from GraphQL context
    const user = this.extractUserFromGraphQLContext(gqlContext);

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      if (fieldPermission) {
        return await this.checkFieldPermission(
          fieldPermission,
          user,
          gqlContext,
          info,
          parent,
        );
      }

      if (graphqlPermission) {
        return await this.checkGraphQLPermission(
          graphqlPermission,
          user,
          gqlContext,
          info,
          args,
        );
      }

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error(
        `GraphQL permission check error: ${error.message}`,
        error.stack,
      );
      throw new ForbiddenException('Permission check failed');
    }
  }

  private async checkGraphQLPermission(
    requirement: GraphQLPermissionRequirement,
    user: { workspaceMemberId: string; workspaceId: string },
    gqlContext: GqlExecutionContext,
    info: GraphQLResolveInfo,
    args: Record<string, unknown>,
  ): Promise<boolean> {
    // Build permission context
    const permissionContext: PermissionContext = {
      action: requirement.action,
      operationType: this.detectOperationType(info),
      operationName: info.fieldName,
      objectName: requirement.objectName,
      workspaceMemberId: user.workspaceMemberId,
      workspaceId: user.workspaceId,
      gqlContext,
      variables: args,
      selectionSet: this.extractSelectionSet(info),
      metadata: {
        operationPath: info.path ? String(info.path.key) : undefined,
        parentType: info.parentType.name,
      },
    };

    // Extract record ID if specified
    if (requirement.recordIdVariable && args[requirement.recordIdVariable]) {
      permissionContext.recordId = String(args[requirement.recordIdVariable]);
    }

    // Check permission
    const result = await this.rbacService.checkPermission(permissionContext);

    // Handle result
    if (result.result === PERMISSION_RESULT_MAPPING.GRANTED) {
      // Store permission result in context for later use
      const { req } = gqlContext.getContext();

      if (req) {
        req['permissionResult'] = result;
      }

      return true;
    }

    if (
      result.result === PERMISSION_RESULT_MAPPING.PARTIAL &&
      requirement.allowPartial
    ) {
      // Store partial permission info for resolver to handle
      const { req } = gqlContext.getContext();

      if (req) {
        req['permissionResult'] = result;
      }

      return true;
    }

    // Permission denied
    this.logger.warn(
      `GraphQL permission denied for user ${user.workspaceMemberId} on ${requirement.objectName}:${requirement.action} - ${result.reason}`,
    );

    throw new ForbiddenException({
      message: 'Insufficient permissions',
      reason: result.reason,
      action: requirement.action,
      objectName: requirement.objectName,
      operationName: info.fieldName,
    });
  }

  private async checkFieldPermission(
    requirement: GraphQLFieldPermissionRequirement,
    user: { workspaceMemberId: string; workspaceId: string },
    gqlContext: GqlExecutionContext,
    info: GraphQLResolveInfo,
    parent: Record<string, unknown>,
  ): Promise<boolean> {
    // Build field permission context
    const permissionContext: PermissionContext = {
      action: requirement.action,
      operationType: this.detectOperationType(info),
      operationName: info.fieldName,
      objectName: requirement.objectName,
      fieldName: requirement.fieldName,
      parentType: info.parentType.name,
      workspaceMemberId: user.workspaceMemberId,
      workspaceId: user.workspaceId,
      gqlContext,
      metadata: {
        parentData: JSON.stringify(parent),
        fieldPath: info.path ? String(info.path.key) : undefined,
      },
    };

    // Extract record ID from parent object if available
    if (parent && (parent.id || parent._id)) {
      permissionContext.recordId =
        (parent.id as string) || (parent._id as string);
    }

    // Check field permission
    const result = await this.rbacService.checkPermission(permissionContext);

    if (result.result === PERMISSION_RESULT_MAPPING.GRANTED) {
      return true;
    }

    // Handle field permission denial based on configuration
    if (requirement.allowNull) {
      // Store null result for resolver to handle
      const { req } = gqlContext.getContext();

      if (req) {
        req['fieldPermissionDenied'] = {
          fieldName: requirement.fieldName,
          defaultValue: requirement.defaultValue,
          reason: result.reason,
        };
      }

      return true; // Allow resolver to continue but return null/default value
    }

    // Field permission denied - throw error
    throw new ForbiddenException({
      message: `Access denied to field: ${requirement.fieldName}`,
      reason: result.reason,
      fieldName: requirement.fieldName,
      objectName: requirement.objectName,
    });
  }

  private extractUserFromGraphQLContext(
    gqlContext: GqlExecutionContext,
  ): { workspaceMemberId: string; workspaceId: string } | null {
    const { req } = gqlContext.getContext();

    // 1. JWT token in user property
    if (req?.user) {
      const workspaceMemberId =
        req.user['workspaceMember']?.['id'] || req.user['id'];
      const workspaceId =
        req.user['currentWorkspace']?.['id'] ||
        req.user['currentUserWorkspace']?.['workspaceId'];

      if (workspaceMemberId && workspaceId) {
        return { workspaceMemberId, workspaceId };
      }
    }

    // 2. Headers
    if (req?.headers) {
      const workspaceMemberId = req.headers[
        USER_EXTRACTION_FIELDS.WORKSPACE_MEMBER_ID
      ] as string;
      const workspaceId = req.headers[
        USER_EXTRACTION_FIELDS.WORKSPACE_ID
      ] as string;

      if (workspaceMemberId && workspaceId) {
        return { workspaceMemberId, workspaceId };
      }
    }

    // 3. GraphQL context (custom authentication)
    const context = gqlContext.getContext();

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

    return null;
  }

  private detectOperationType(info: GraphQLResolveInfo): GraphQLOperationType {
    const operationType = info.operation.operation;

    switch (operationType) {
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

  private extractSelectionSet(info: GraphQLResolveInfo): string[] {
    const selections: string[] = [];

    type SelectionSetType = {
      selections?: readonly {
        kind: string;
        name: { value: string };
        selectionSet?: SelectionSetType;
      }[];
    };

    const extractFields = (
      selectionSet: SelectionSetType,
      prefix = '',
    ): void => {
      if (!selectionSet?.selections) return;

      for (const selection of selectionSet.selections) {
        if (selection.kind === 'Field') {
          const fieldName = prefix
            ? `${prefix}.${selection.name.value}`
            : selection.name.value;

          selections.push(fieldName);

          if (selection.selectionSet) {
            extractFields(selection.selectionSet, fieldName);
          }
        }
      }
    };

    if (info.fieldNodes[0]?.selectionSet) {
      extractFields(info.fieldNodes[0].selectionSet as SelectionSetType);
    }

    return selections;
  }
}
