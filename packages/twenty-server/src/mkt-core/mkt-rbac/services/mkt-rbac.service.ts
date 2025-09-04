import { Injectable, Logger } from '@nestjs/common';

import { MoreThanOrEqual, Not, IsNull } from 'typeorm';

import { IRbacService } from 'src/mkt-core/mkt-rbac/interfaces/rbac-service.interface';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-data-access-policy/mkt-data-access-policy.workspace-entity';
import { MktTemporaryPermissionWorkspaceEntity } from 'src/mkt-core/mkt-temporary-permission/mkt-temporary-permission.workspace-entity';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-permission-audit/mkt-permission-audit.workspace-entity';
import {
  PERMISSION_SOURCE_MAPPING,
  PERMISSION_RESULT_MAPPING,
  DEFAULT_PERMISSION_SETTINGS,
  GRAPHQL_OPERATIONS,
} from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import {
  AuditContext,
  PermissionAction,
  PermissionCheckResult,
  PermissionContext,
  PermissionResult,
} from 'src/mkt-core/mkt-rbac/types/permission-context.type';
import {
  RbacEnumMapper,
  PermissionAuditAction,
  PermissionSource as DbPermissionSource,
  CheckResult,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

@Injectable()
export class MktRbacService implements IRbacService {
  private readonly logger = new Logger(MktRbacService.name);

  constructor(private readonly twentyORMManager: TwentyORMManager) {}

  async checkPermission(context: PermissionContext): Promise<PermissionResult> {
    const startTime = Date.now();

    try {
      // Get workspace repositories
      const dataAccessPolicyRepository =
        await this.twentyORMManager.getRepository<MktDataAccessPolicyWorkspaceEntity>(
          'mktDataAccessPolicy',
        );
      const temporaryPermissionRepository =
        await this.twentyORMManager.getRepository<MktTemporaryPermissionWorkspaceEntity>(
          'mktTemporaryPermission',
        );
      const permissionAuditRepository =
        await this.twentyORMManager.getRepository<MktPermissionAuditWorkspaceEntity>(
          'mktPermissionAudit',
        );

      let result: PermissionResult;

      // 1. Check temporary permissions first (highest priority)
      const tempPermission = await this.checkTemporaryPermissions(
        temporaryPermissionRepository,
        context,
      );

      if (tempPermission) {
        result = tempPermission;
      } else {
        // 2. Check data access policies
        const policyPermission = await this.checkDataAccessPolicies(
          dataAccessPolicyRepository,
          context,
        );

        if (policyPermission) {
          result = policyPermission;
        } else {
          // 3. Default deny
          result = {
            result: PERMISSION_RESULT_MAPPING.DENIED,
            source: PERMISSION_SOURCE_MAPPING.ROLE_BASED,
            reason: DEFAULT_PERMISSION_SETTINGS.DEFAULT_DENIAL_REASON,
          };
        }
      }

      // Audit the permission check
      await this.auditPermissionCheck(
        permissionAuditRepository,
        context,
        result,
        Date.now() - startTime,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Permission check failed: ${error.message}`,
        error.stack,
      );

      // Audit the failed check and return error result
      const errorResult: PermissionResult = {
        result: PERMISSION_RESULT_MAPPING.DENIED,
        source: PERMISSION_SOURCE_MAPPING.ROLE_BASED,
        reason: `Permission check error: ${error.message}`,
      };

      const permissionAuditRepository =
        await this.twentyORMManager.getRepository<MktPermissionAuditWorkspaceEntity>(
          'mktPermissionAudit',
        );

      await this.auditPermissionCheck(
        permissionAuditRepository,
        context,
        errorResult,
        Date.now() - startTime,
      );

      return errorResult;
    }
  }

  async checkMultiplePermissions(
    contexts: PermissionContext[],
  ): Promise<PermissionResult[]> {
    const results = await Promise.allSettled(
      contexts.map((context) => this.checkPermission(context)),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error(
          `Bulk permission check failed for context ${index}: ${result.reason}`,
        );

        return {
          result: PERMISSION_RESULT_MAPPING.DENIED,
          source: PERMISSION_SOURCE_MAPPING.ROLE_BASED,
          reason: `${DEFAULT_PERMISSION_SETTINGS.BULK_ERROR_REASON_PREFIX}: ${result.reason}`,
        };
      }
    });
  }

  async getPermissionsForObject(
    workspaceMemberId: string,
    workspaceId: string,
    objectName: string,
    recordId?: string,
  ): Promise<PermissionResult[]> {
    const actions: Array<PermissionAction> = [
      PermissionAction.QUERY,
      PermissionAction.MUTATION,
      PermissionAction.SUBSCRIPTION,
      PermissionAction.FIELD_READ,
      PermissionAction.FIELD_WRITE,
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.LIST,
      PermissionAction.EXPORT,
    ];

    const contexts: PermissionContext[] = actions.map((action) => ({
      action,
      operationType:
        action === PermissionAction.QUERY
          ? GRAPHQL_OPERATIONS.QUERY
          : action === PermissionAction.MUTATION
            ? GRAPHQL_OPERATIONS.MUTATION
            : GRAPHQL_OPERATIONS.SUBSCRIPTION,
      operationName: `${action.toLowerCase()}${objectName}`,
      objectName,
      recordId,
      workspaceMemberId,
      workspaceId,
    }));

    return this.checkMultiplePermissions(contexts);
  }

  shouldCachePermission(context: PermissionContext): boolean {
    // Don't cache temporary permissions, field-specific permissions, or record-specific permissions
    return (
      !context.recordId &&
      !context.fieldName &&
      context.action !== 'FIELD_WRITE'
    );
  }

  async clearPermissionCache(
    workspaceMemberId?: string,
    workspaceId?: string,
    objectName?: string,
  ): Promise<void> {
    // Implementation would depend on caching strategy (Redis, in-memory, etc.)
    this.logger.log(
      `Clearing permission cache for user: ${workspaceMemberId}, workspace: ${workspaceId}, object: ${objectName}`,
    );
  }

  private async checkTemporaryPermissions(
    repository: WorkspaceRepository<MktTemporaryPermissionWorkspaceEntity>,
    context: PermissionContext,
  ): Promise<PermissionResult | null> {
    const now = new Date();

    const temporaryPermissions = await repository.find({
      where: {
        granteeWorkspaceMemberId: context.workspaceMemberId,
        objectName: context.objectName,
        ...(context.recordId && { recordId: context.recordId }),
        isActive: true,
        expiresAt: MoreThanOrEqual(now),
      },
      order: { createdAt: 'DESC' },
    });

    for (const permission of temporaryPermissions) {
      const hasPermission = this.checkActionPermission(
        permission,
        context.action,
      );

      if (hasPermission) {
        return {
          result: PERMISSION_RESULT_MAPPING.GRANTED,
          source: PERMISSION_SOURCE_MAPPING.TEMPORARY_PERMISSION,
          reason: `Temporary permission granted: ${permission.reason}`,
          metadata: {
            permissionId: permission.id,
            expiresAt: permission.expiresAt.toISOString(),
            purpose: permission.purpose,
          },
        };
      }
    }

    return null;
  }

  private async checkDataAccessPolicies(
    repository: WorkspaceRepository<MktDataAccessPolicyWorkspaceEntity>,
    context: PermissionContext,
  ): Promise<PermissionResult | null> {
    const policies = await repository.find({
      where: [
        {
          objectName: context.objectName,
          isActive: true,
          specificMemberId: context.workspaceMemberId,
        },
        {
          objectName: context.objectName,
          isActive: true,
          departmentId: Not(IsNull()),
        },
      ],
      order: { priority: 'DESC' },
      relations: ['department', 'specificMember'],
    });

    // TODO: Implement policy evaluation based on filterConditions
    // This would involve parsing the JSON conditions and applying them

    for (const policy of policies) {
      if (policy.specificMemberId === context.workspaceMemberId) {
        return {
          result: PERMISSION_RESULT_MAPPING.GRANTED,
          source: PERMISSION_SOURCE_MAPPING.DATA_ACCESS_POLICY,
          reason: `Direct policy match: ${policy.name}`,
          metadata: {
            policyId: policy.id,
            policyName: policy.name,
          },
        };
      }
    }

    return null;
  }

  private checkActionPermission(
    permission: MktTemporaryPermissionWorkspaceEntity,
    action: PermissionAction,
  ): boolean {
    switch (action) {
      // Read-based actions
      case PermissionAction.QUERY:
      case PermissionAction.FIELD_READ:
      case PermissionAction.LIST:
      case PermissionAction.EXPORT:
        return permission.canRead;

      // Write-based actions
      case PermissionAction.MUTATION:
      case PermissionAction.FIELD_WRITE:
      case PermissionAction.CREATE:
      case PermissionAction.UPDATE:
      case PermissionAction.IMPORT:
      case PermissionAction.BULK_UPDATE:
      case PermissionAction.RESTORE:
      case PermissionAction.ARCHIVE:
        return permission.canUpdate;

      // Delete-based actions
      case PermissionAction.DELETE:
      case PermissionAction.BULK_DELETE:
        return permission.canDelete;

      // Subscription actions
      case PermissionAction.SUBSCRIPTION:
        return permission.canRead;

      // Module access
      case PermissionAction.MODULE_ACCESS:
        // Module access requires either read or update permission
        return permission.canRead || permission.canUpdate;

      default:
        this.logger.warn(`Unknown action type: ${action}`);

        return false;
    }
  }

  private async auditPermissionCheck(
    repository: WorkspaceRepository<MktPermissionAuditWorkspaceEntity>,
    context: PermissionContext,
    result: PermissionResult,
    checkDurationMs: number,
  ): Promise<void> {
    try {
      const auditContext = this.extractAuditContext(context);

      const audit = repository.create({
        workspaceMemberId: context.workspaceMemberId,
        action: this.mapToAuditAction(context.action),
        objectName: context.objectName,
        recordId: context.recordId,
        permissionSource: this.mapToAuditSource(result.source),
        checkResult: this.mapToAuditResult(result.result),
        checkDurationMs,
        denialReason: result.reason,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        requestContext: {
          method: auditContext.requestMethod,
          path: auditContext.requestPath,
          sessionId: auditContext.sessionId,
          metadata: context.metadata,
          resultMetadata: result.metadata,
          ...auditContext.additionalMetadata,
        },
      });

      console.log('audit', audit);
      await repository.save(audit);
    } catch (error) {
      this.logger.error(
        `Failed to audit permission check: ${error.message}`,
        error.stack,
      );
      // Don't throw here to avoid breaking the permission check
    }
  }

  private extractAuditContext(context: PermissionContext): AuditContext {
    // Handle GraphQL context
    if (context.gqlContext && !context.request) {
      const { req } = context.gqlContext.getContext();

      return {
        ipAddress: req?.ip || req?.socket?.remoteAddress,
        userAgent: req?.get?.('User-Agent'),
        operationType: context.operationType,
        operationName: context.operationName,
        variables: context.variables,
        sessionId: req?.sessionID,
        additionalMetadata: {
          selectionSet: context.selectionSet?.join(', '),
          fieldName: context.fieldName,
          parentType: context.parentType,
        },
      };
    }

    // Handle REST context
    if (context.request) {
      const req = context.request;

      return {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
        sessionId: req.sessionID,
      };
    }

    return {
      operationType: context.operationType,
      operationName: context.operationName,
      variables: context.variables,
    };
  }

  private mapToAuditAction(action: PermissionAction): PermissionAuditAction {
    const actionMap: Record<PermissionAction, PermissionAuditAction> = {
      QUERY: PermissionAuditAction.READ,
      MUTATION: PermissionAuditAction.UPDATE,
      SUBSCRIPTION: PermissionAuditAction.READ,
      FIELD_READ: PermissionAuditAction.READ,
      FIELD_WRITE: PermissionAuditAction.UPDATE,
      MODULE_ACCESS: PermissionAuditAction.READ,
      CREATE: PermissionAuditAction.CREATE,
      UPDATE: PermissionAuditAction.UPDATE,
      DELETE: PermissionAuditAction.DELETE,
      LIST: PermissionAuditAction.READ,
      EXPORT: PermissionAuditAction.READ,
      IMPORT: PermissionAuditAction.CREATE,
      BULK_UPDATE: PermissionAuditAction.UPDATE,
      BULK_DELETE: PermissionAuditAction.DELETE,
      RESTORE: PermissionAuditAction.UPDATE,
      ARCHIVE: PermissionAuditAction.UPDATE,
    };

    return actionMap[action];
  }

  private mapToAuditSource(
    source: PermissionResult['source'],
  ): DbPermissionSource {
    return RbacEnumMapper.toPermissionSource(source);
  }

  private mapToAuditResult(result: PermissionCheckResult): CheckResult {
    // PermissionCheckResult is already CheckResult type
    return result;
  }
}
