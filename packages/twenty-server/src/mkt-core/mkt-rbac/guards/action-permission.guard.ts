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

import { GraphQLResolveInfo } from 'graphql';

import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import {
  PERMISSION_RESULT_MAPPING,
  USER_EXTRACTION_FIELDS,
} from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import {
  GRAPHQL_PERMISSION_KEY,
  GraphQLPermissionRequirement,
} from 'src/mkt-core/mkt-rbac/decorators/graphql-permission.decorator';
import { GraphQLOperationType } from 'src/mkt-core/mkt-rbac/enums/rbac.enums';
import { PermissionContext } from 'src/mkt-core/mkt-rbac/types/permission-context.type';

/**
 * Guard kiểm tra quyền thực hiện action cụ thể
 * Đây là layer thứ 2 trong hệ thống phân quyền 4 tầng
 */
@Injectable()
export class ActionPermissionGuard implements CanActivate {
  private readonly logger = new Logger(ActionPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: MktRbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra action permission requirement
    const actionPermission =
      this.reflector.getAllAndOverride<GraphQLPermissionRequirement>(
        GRAPHQL_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!actionPermission) {
      return true; // Không có yêu cầu action permission
    }

    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo<GraphQLResolveInfo>();
    const args = gqlContext.getArgs();

    const user = this.extractUserFromContext(gqlContext);

    if (!user) {
      throw new UnauthorizedException('Authentication required for action');
    }

    try {
      const hasActionPermission = await this.checkActionPermission(
        actionPermission,
        user,
        gqlContext,
        info,
        args,
      );

      if (!hasActionPermission) {
        throw new ForbiddenException({
          message: `Action permission denied: ${actionPermission.action} on ${actionPermission.objectName}`,
          action: actionPermission.action,
          objectName: actionPermission.objectName,
          operationName: info.fieldName,
        });
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
        `Action permission check error: ${error.message}`,
        error.stack,
      );

      throw new ForbiddenException('Action permission check failed');
    }
  }

  private async checkActionPermission(
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
        actionPermissionCheck: true,
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
      // Store permission result for later layers
      const { req } = gqlContext.getContext();

      if (req) {
        req['actionPermissionResult'] = result;
      }

      return true;
    }

    if (
      result.result === PERMISSION_RESULT_MAPPING.PARTIAL &&
      requirement.allowPartial
    ) {
      // Store partial permission for data filtering layer
      const { req } = gqlContext.getContext();

      if (req) {
        req['actionPermissionResult'] = result;
        req['partialPermission'] = true;
      }

      return true;
    }

    this.logger.warn(
      `Action permission denied: ${user.workspaceMemberId} -> ${requirement.action} ${requirement.objectName}`,
    );

    return false;
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

  private extractUserFromContext(
    gqlContext: GqlExecutionContext,
  ): { workspaceMemberId: string; workspaceId: string } | null {
    const { req } = gqlContext.getContext();

    // JWT token
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

    // Headers
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

    return null;
  }
}
