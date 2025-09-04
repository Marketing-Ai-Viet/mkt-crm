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

import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import { USER_EXTRACTION_FIELDS } from 'src/mkt-core/mkt-rbac/constants/rbac.constants';
import {
  PermissionAction,
  GraphQLOperationType,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

// Decorator để định nghĩa ownership rules
export const DATA_OWNERSHIP_KEY = 'data_ownership';

export interface DataOwnershipRule {
  objectName: string;
  ownerField: string; // field chứa owner ID (e.g., 'createdById', 'assignedToId')
  allowDepartmentAccess?: boolean; // cho phép access trong cùng department
  allowManagerAccess?: boolean; // cho phép manager access data của team
  allowPartialData?: boolean; // cho phép trả về data đã filter
}

export const RequireDataOwnership = (rule: DataOwnershipRule) =>
  SetMetadata(DATA_OWNERSHIP_KEY, rule);

/**
 * Interceptor lọc data theo ownership
 * Đây là layer thứ 3 trong hệ thống phân quyền 4 tầng
 */
@Injectable()
export class DataOwnershipInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DataOwnershipInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: MktRbacService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ownershipRule = this.reflector.getAllAndOverride<DataOwnershipRule>(
      DATA_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ownershipRule) {
      return next.handle(); // Không có ownership rules
    }

    const gqlContext = GqlExecutionContext.create(context);
    const user = this.extractUserFromContext(gqlContext);

    if (!user) {
      return next.handle(); // Không có user context
    }

    // Kiểm tra xem có partial permission không
    const { req } = gqlContext.getContext();
    const hasPartialPermission = req?.['partialPermission'];

    return next.handle().pipe(
      map((data) => {
        if (hasPartialPermission || ownershipRule.allowPartialData) {
          return this.filterDataByOwnership(data, user, ownershipRule);
        }

        return this.validateDataOwnership(data, user, ownershipRule);
      }),
    );
  }

  private filterDataByOwnership(
    data: unknown,
    user: { workspaceMemberId: string; workspaceId: string },
    rule: DataOwnershipRule,
  ): unknown {
    if (!data) return data;

    this.logger.debug(
      `Filtering data by ownership: ${rule.objectName} for user ${user.workspaceMemberId}`,
    );

    // Handle array data
    if (Array.isArray(data)) {
      return data.filter((item) => this.checkItemOwnership(item, user, rule));
    }

    // Handle single object
    if (typeof data === 'object') {
      if (this.checkItemOwnership(data, user, rule)) {
        return data;
      }

      // If not owned and allowPartialData, return null or empty
      return rule.allowPartialData ? null : data;
    }

    return data;
  }

  private validateDataOwnership(
    data: unknown,
    user: { workspaceMemberId: string; workspaceId: string },
    rule: DataOwnershipRule,
  ): unknown {
    if (!data) return data;

    // Handle array data - validate all items
    if (Array.isArray(data)) {
      const unauthorizedItems = data.filter(
        (item) => !this.checkItemOwnership(item, user, rule),
      );

      if (unauthorizedItems.length > 0) {
        this.logger.warn(
          `Data ownership violation: User ${user.workspaceMemberId} accessing non-owned ${rule.objectName} items`,
        );

        // Log audit for unauthorized access attempt
        this.auditOwnershipViolation(user, rule, unauthorizedItems.length);
      }

      // Return only owned items
      return data.filter((item) => this.checkItemOwnership(item, user, rule));
    }

    // Handle single object
    if (typeof data === 'object') {
      if (!this.checkItemOwnership(data, user, rule)) {
        this.logger.warn(
          `Data ownership violation: User ${user.workspaceMemberId} accessing non-owned ${rule.objectName}`,
        );

        this.auditOwnershipViolation(user, rule, 1);

        return null; // Return null for non-owned single item
      }
    }

    return data;
  }

  private checkItemOwnership(
    item: unknown,
    user: { workspaceMemberId: string; workspaceId: string },
    rule: DataOwnershipRule,
  ): boolean {
    if (!item || typeof item !== 'object') {
      return true; // Allow non-objects
    }

    const itemObj = item as Record<string, unknown>;

    // Check direct ownership
    const ownerId = itemObj[rule.ownerField];

    if (ownerId === user.workspaceMemberId) {
      return true;
    }

    // Check workspace ownership
    const itemWorkspaceId = itemObj['workspaceId'];

    if (itemWorkspaceId && itemWorkspaceId !== user.workspaceId) {
      return false; // Different workspace = no access
    }

    // Check department access (if enabled)
    if (rule.allowDepartmentAccess) {
      const userDepartmentId = this.getUserDepartmentId(user);
      const itemDepartmentId = this.getItemDepartmentId(itemObj);

      if (userDepartmentId && itemDepartmentId === userDepartmentId) {
        return true;
      }
    }

    // Check manager access (if enabled)
    if (rule.allowManagerAccess) {
      const isManager = this.checkIfUserIsManager(user, itemObj);

      if (isManager) {
        return true;
      }
    }

    return false; // Default deny
  }

  private getUserDepartmentId(user: {
    workspaceMemberId: string;
  }): string | null {
    // TODO: Implement logic to get user's department ID
    // This would typically come from user context or database lookup
    return null;
  }

  private getItemDepartmentId(item: Record<string, unknown>): string | null {
    // Try to get department from various possible fields
    return (
      (item['departmentId'] as string) ||
      (item['ownerDepartmentId'] as string) ||
      (item['assignedDepartmentId'] as string) ||
      null
    );
  }

  private checkIfUserIsManager(
    user: { workspaceMemberId: string },
    item: Record<string, unknown>,
  ): boolean {
    // TODO: Implement logic to check if user is manager of the item owner
    // This would typically involve checking user roles and team hierarchy
    return false;
  }

  private async auditOwnershipViolation(
    user: { workspaceMemberId: string; workspaceId: string },
    rule: DataOwnershipRule,
    itemCount: number,
  ): Promise<void> {
    try {
      await this.rbacService.checkPermission({
        action: PermissionAction.QUERY,
        operationType: GraphQLOperationType.QUERY,
        operationName: `ownership_violation_${rule.objectName}`,
        objectName: rule.objectName,
        workspaceMemberId: user.workspaceMemberId,
        workspaceId: user.workspaceId,
        metadata: {
          ownershipViolation: true,
          violatedRule: rule.objectName,
          attemptedItemCount: itemCount,
          auditOnly: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to audit ownership violation: ${error.message}`,
      );
    }
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
