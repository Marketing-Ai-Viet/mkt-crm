import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GraphQLResolveInfo } from 'graphql';

import {
  PERMISSION_RESULT_MAPPING,
  SAFE_FIELDS,
  DEFAULT_VALUES,
} from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import { PermissionContext } from 'src/mkt-core/mkt-rbac/types/permission-context.type';
import {
  PermissionAction,
  GraphQLOperationType,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

@Injectable()
export class GraphQLFieldPermissionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GraphQLFieldPermissionInterceptor.name);

  constructor(private readonly rbacService: MktRbacService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo<GraphQLResolveInfo>();
    const { req } = gqlContext.getContext();

    // Check if field permission was denied
    const fieldPermissionDenied = req?.['fieldPermissionDenied'];

    if (fieldPermissionDenied) {
      return next.handle().pipe(
        map(() => {
          this.logger.debug(
            `Field permission denied, returning default value: ${fieldPermissionDenied.fieldName}`,
          );

          return fieldPermissionDenied.defaultValue;
        }),
        catchError((error) => {
          this.logger.debug(
            `Field permission denied with error, returning default value: ${fieldPermissionDenied.fieldName}`,
          );
          throw fieldPermissionDenied.defaultValue;
        }),
      );
    }

    return next.handle().pipe(
      map((data) => {
        // Filter response data based on field permissions
        return this.filterResponseByFieldPermissions(data, context, info);
      }),
    );
  }

  private async filterResponseByFieldPermissions(
    data: unknown,
    context: ExecutionContext,
    info: GraphQLResolveInfo,
  ): Promise<unknown> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const user = this.extractUserFromGraphQLContext(gqlContext);

    if (!user) {
      return data;
    }

    // Handle array data
    if (Array.isArray(data)) {
      return Promise.all(
        data.map((item) =>
          this.filterObjectFields(
            item as Record<string, unknown>,
            user,
            info,
            gqlContext,
          ),
        ),
      );
    }

    // Handle single object
    return this.filterObjectFields(
      data as Record<string, unknown>,
      user,
      info,
      gqlContext,
    );
  }

  private async filterObjectFields(
    obj: Record<string, unknown>,
    user: { workspaceMemberId: string; workspaceId: string },
    info: GraphQLResolveInfo,
    gqlContext: GqlExecutionContext,
  ): Promise<Record<string, unknown>> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const filteredObj = { ...obj };
    const objectType = this.detectObjectType(obj);

    // Get selected fields from GraphQL query
    const selectedFields = this.extractRequestedFields(info);

    for (const fieldName of selectedFields) {
      if (fieldName in obj) {
        const hasFieldPermission = await this.checkFieldPermission(
          user,
          objectType,
          fieldName,
          obj,
          gqlContext,
        );

        if (!hasFieldPermission) {
          delete filteredObj[fieldName];
          this.logger.debug(
            `Field ${fieldName} filtered out due to permission denial`,
          );
        }
      }
    }

    return filteredObj;
  }

  private async checkFieldPermission(
    user: { workspaceMemberId: string; workspaceId: string },
    objectType: string,
    fieldName: string,
    parentObj: Record<string, unknown>,
    gqlContext: GqlExecutionContext,
  ): Promise<boolean> {
    // Skip permission check for safe fields
    if ((SAFE_FIELDS as readonly string[]).includes(fieldName)) {
      return true;
    }

    const permissionContext: PermissionContext = {
      action: PermissionAction.FIELD_READ,
      operationType: GraphQLOperationType.QUERY,
      operationName: `read${objectType}Field`,
      objectName: objectType,
      fieldName,
      recordId: (parentObj.id as string) || (parentObj._id as string),
      workspaceMemberId: user.workspaceMemberId,
      workspaceId: user.workspaceId,
      gqlContext,
      metadata: {
        parentObject: objectType,
        fieldAccess: true,
      },
    };

    try {
      const result = await this.rbacService.checkPermission(permissionContext);

      return result.result === PERMISSION_RESULT_MAPPING.GRANTED;
    } catch (error) {
      this.logger.warn(
        `Field permission check failed for ${fieldName}: ${error.message}`,
      );

      return false; // Deny access on error
    }
  }

  private extractUserFromGraphQLContext(
    gqlContext: GqlExecutionContext,
  ): { workspaceMemberId: string; workspaceId: string } | null {
    const { req } = gqlContext.getContext();

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

  private detectObjectType(obj: Record<string, unknown>): string {
    // Try to detect object type from various sources
    if (obj.__typename) {
      return this.convertGraphQLTypeToObjectName(obj.__typename as string);
    }

    if (obj.constructor && obj.constructor.name) {
      return this.convertClassNameToObjectName(obj.constructor.name);
    }

    // Default fallback
    return DEFAULT_VALUES.UNKNOWN_OBJECT_TYPE;
  }

  private convertGraphQLTypeToObjectName(typeName: string): string {
    // Convert GraphQL type names like "MktKpi" to "mktKpi"
    return typeName.charAt(0).toLowerCase() + typeName.slice(1);
  }

  private convertClassNameToObjectName(className: string): string {
    // Convert class names like "MktKpiWorkspaceEntity" to "mktKpi"
    const cleaned = className
      .replace(/WorkspaceEntity$/, '')
      .replace(/Entity$/, '');

    return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }

  private extractRequestedFields(info: GraphQLResolveInfo): string[] {
    const fields: string[] = [];

    const extractFields = (selectionSet: {
      selections?: readonly { kind: string; name: { value: string } }[];
    }): void => {
      if (!selectionSet?.selections) return;

      for (const selection of selectionSet.selections) {
        if (selection.kind === 'Field') {
          fields.push(selection.name.value);
        }
      }
    };

    if (info.fieldNodes[0]?.selectionSet) {
      extractFields(
        info.fieldNodes[0].selectionSet as {
          selections?: readonly { kind: string; name: { value: string } }[];
        },
      );
    }

    return fields;
  }
}
