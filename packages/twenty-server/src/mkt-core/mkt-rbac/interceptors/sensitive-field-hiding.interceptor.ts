import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphQLResolveInfo } from 'graphql';

import {
  PermissionAction,
  GraphQLOperationType,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';
import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import {
  PERMISSION_RESULT_MAPPING,
  SAFE_FIELDS,
  USER_EXTRACTION_FIELDS,
} from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import { PermissionContext } from 'src/mkt-core/mkt-rbac/types/permission-context.type';

// Decorator để định nghĩa sensitive fields
export const SENSITIVE_FIELDS_KEY = 'sensitive_fields';

export interface SensitiveFieldRule {
  objectName: string;
  fields: {
    [fieldName: string]: {
      requirePermission?: string; // specific permission required
      defaultValue?: unknown; // value to return when access denied
      allowNull?: boolean; // allow returning null instead of error
      redactPartially?: boolean; // partially hide value (e.g., email@***.com)
      logAccess?: boolean; // log all access to this field
    };
  };
}

export const RequireSensitiveFieldProtection = (rule: SensitiveFieldRule) =>
  SetMetadata(SENSITIVE_FIELDS_KEY, rule);

/**
 * Interceptor ẩn sensitive fields
 * Đây là layer thứ 4 (cuối cùng) trong hệ thống phân quyền 4 tầng
 */
@Injectable()
export class SensitiveFieldHidingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SensitiveFieldHidingInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: MktRbacService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const sensitiveRule = this.reflector.getAllAndOverride<SensitiveFieldRule>(
      SENSITIVE_FIELDS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!sensitiveRule) {
      return next.handle(); // Không có sensitive field rules
    }

    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo<GraphQLResolveInfo>();
    const user = this.extractUserFromContext(gqlContext);

    if (!user) {
      return next.handle(); // Không có user context
    }

    return next.handle().pipe(
      map(async (data) => {
        return await this.processSensitiveFields(
          data,
          user,
          sensitiveRule,
          info,
          gqlContext,
        );
      }),
    );
  }

  private async processSensitiveFields(
    data: unknown,
    user: { workspaceMemberId: string; workspaceId: string },
    rule: SensitiveFieldRule,
    info: GraphQLResolveInfo,
    gqlContext: GqlExecutionContext,
  ): Promise<unknown> {
    if (!data) return data;

    this.logger.debug(
      `Processing sensitive fields for ${rule.objectName} (user: ${user.workspaceMemberId})`,
    );

    // Handle array data
    if (Array.isArray(data)) {
      return Promise.all(
        data.map((item) =>
          this.processObjectSensitiveFields(
            item as Record<string, unknown>,
            user,
            rule,
            info,
            gqlContext,
          ),
        ),
      );
    }

    // Handle single object
    if (typeof data === 'object') {
      return this.processObjectSensitiveFields(
        data as Record<string, unknown>,
        user,
        rule,
        info,
        gqlContext,
      );
    }

    return data;
  }

  private async processObjectSensitiveFields(
    obj: Record<string, unknown>,
    user: { workspaceMemberId: string; workspaceId: string },
    rule: SensitiveFieldRule,
    info: GraphQLResolveInfo,
    gqlContext: GqlExecutionContext,
  ): Promise<Record<string, unknown>> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const processedObj = { ...obj };
    const requestedFields = this.extractRequestedFields(info);

    // Process each sensitive field
    for (const [fieldName, fieldRule] of Object.entries(rule.fields)) {
      // Skip if field not requested in GraphQL query
      if (!requestedFields.includes(fieldName)) {
        continue;
      }

      // Skip if field not present in data
      if (!(fieldName in obj)) {
        continue;
      }

      // Check if user has permission to access this field
      const hasFieldAccess = await this.checkFieldAccess(
        user,
        rule.objectName,
        fieldName,
        fieldRule,
        obj,
        gqlContext,
      );

      if (!hasFieldAccess) {
        // Handle denied access based on field rule
        if (fieldRule.allowNull) {
          processedObj[fieldName] = null;
        } else if (fieldRule.defaultValue !== undefined) {
          processedObj[fieldName] = fieldRule.defaultValue;
        } else {
          // Remove field entirely
          delete processedObj[fieldName];
        }

        this.logger.debug(
          `Sensitive field hidden: ${fieldName} for user ${user.workspaceMemberId}`,
        );
      } else {
        // User has access, but may need redaction
        if (fieldRule.redactPartially) {
          processedObj[fieldName] = this.redactFieldValue(
            obj[fieldName],
            fieldName,
          );
        }

        // Log access if required
        if (fieldRule.logAccess) {
          this.logSensitiveFieldAccess(user, rule.objectName, fieldName, obj);
        }
      }
    }

    return processedObj;
  }

  private async checkFieldAccess(
    user: { workspaceMemberId: string; workspaceId: string },
    objectName: string,
    fieldName: string,
    fieldRule: SensitiveFieldRule['fields'][string],
    parentObj: Record<string, unknown>,
    gqlContext: GqlExecutionContext,
  ): Promise<boolean> {
    // Skip permission check for safe fields
    if ((SAFE_FIELDS as readonly string[]).includes(fieldName)) {
      return true;
    }

    // Build permission context
    const permissionContext: PermissionContext = {
      action: PermissionAction.FIELD_READ,
      operationType: GraphQLOperationType.QUERY,
      operationName: `read${objectName}${fieldName}`,
      objectName,
      fieldName,
      recordId: (parentObj.id as string) || (parentObj._id as string),
      workspaceMemberId: user.workspaceMemberId,
      workspaceId: user.workspaceId,
      gqlContext,
      metadata: {
        sensitiveFieldCheck: true,
        parentObject: objectName,
        specificPermission: fieldRule.requirePermission,
      },
    };

    try {
      const result = await this.rbacService.checkPermission(permissionContext);

      return result.result === PERMISSION_RESULT_MAPPING.GRANTED;
    } catch (error) {
      this.logger.warn(
        `Sensitive field permission check failed for ${fieldName}: ${error.message}`,
      );

      return false; // Deny access on error (fail-safe)
    }
  }

  private redactFieldValue(value: unknown, fieldName: string): unknown {
    if (typeof value === 'string') {
      // Email redaction: user@example.com -> u***@***.com
      if (fieldName.toLowerCase().includes('email') && value.includes('@')) {
        const [username, domain] = value.split('@');
        const maskedUsername = username.charAt(0) + '***';
        const maskedDomain = '***.' + domain.split('.').pop();

        return `${maskedUsername}@${maskedDomain}`;
      }

      // Phone number redaction: +1234567890 -> +123***7890
      if (fieldName.toLowerCase().includes('phone') && value.length > 6) {
        const start = value.slice(0, 3);
        const end = value.slice(-4);

        return `${start}***${end}`;
      }

      // Address redaction: show only city/state
      if (fieldName.toLowerCase().includes('address')) {
        const parts = value.split(',');

        if (parts.length >= 2) {
          return `***,${parts.slice(-2).join(',')}`;
        }

        return '***';
      }

      // General string redaction for long values
      if (value.length > 10) {
        return value.slice(0, 3) + '***' + value.slice(-2);
      }

      return '***';
    }

    // Number redaction
    if (typeof value === 'number') {
      // For financial fields, show order of magnitude
      if (
        fieldName.toLowerCase().includes('amount') ||
        fieldName.toLowerCase().includes('price') ||
        fieldName.toLowerCase().includes('salary')
      ) {
        const magnitude = Math.floor(Math.log10(Math.abs(value)));

        return `~10^${magnitude}`;
      }

      return 0;
    }

    // For other types, return redacted placeholder
    return '[REDACTED]';
  }

  private async logSensitiveFieldAccess(
    user: { workspaceMemberId: string; workspaceId: string },
    objectName: string,
    fieldName: string,
    parentObj: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.rbacService.checkPermission({
        action: PermissionAction.FIELD_READ,
        operationType: GraphQLOperationType.QUERY,
        operationName: `audit_${objectName}_${fieldName}`,
        objectName,
        fieldName,
        recordId: (parentObj.id as string) || (parentObj._id as string),
        workspaceMemberId: user.workspaceMemberId,
        workspaceId: user.workspaceId,
        metadata: {
          sensitiveFieldAccess: true,
          accessedField: fieldName,
          auditOnly: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log sensitive field access: ${error.message}`,
      );
    }
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
