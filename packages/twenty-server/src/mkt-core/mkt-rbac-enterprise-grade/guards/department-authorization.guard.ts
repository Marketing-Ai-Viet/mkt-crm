/**
 * DepartmentAuthorizationGuard
 *
 * Guard kiểm tra phân quyền dựa trên department và hierarchy level.
 * Sử dụng với @RequireDepartment decorator.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { RbacContextService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';
import {
  DEPARTMENT_AUTH_KEY,
  DepartmentAuthOptions,
  DepartmentAuthResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/department-authorization.types';

// ============================================
// CONSTANTS
// ============================================

const LOG_CONTEXT = 'RBAC:DepartmentAuthGuard';

const HIERARCHY_LEVELS = {
  EXECUTIVE_MAX: 3, // CEO=1, C_LEVEL=2, VP=3
  MANAGER_MAX: 7, // Includes MANAGER level
} as const;

const DEPARTMENT_AUTH_MESSAGES = {
  USER_NOT_FOUND: 'User not authenticated',
  WORKSPACE_NOT_FOUND: 'Workspace not found',
  CONTEXT_NOT_FOUND: 'Unable to resolve user context',
  ACCESS_DENIED: 'Access denied: insufficient department permissions',
  ACCESS_DENIED_CUSTOM: (message: string) => message,
  CHECKING: (userId: string, departments: string[]) =>
    `Checking department auth for user=${userId}, allowedDepartments=${departments.join(',')}`,
  ALLOWED_BY_EXECUTIVE: (userId: string, level: number) =>
    `Access granted: user=${userId} is executive (level=${level})`,
  ALLOWED_BY_MANAGER: (userId: string, level: number) =>
    `Access granted: user=${userId} is manager (level=${level})`,
  ALLOWED_BY_DEPARTMENT: (userId: string, dept: string) =>
    `Access granted: user=${userId} belongs to allowed department=${dept}`,
  DENIED: (userId: string, userDept: string | null, allowed: string[]) =>
    `Access denied: user=${userId}, department=${userDept}, allowedDepartments=${allowed.join(',')}`,
} as const;

// ============================================
// GUARD
// ============================================

@Injectable()
export class DepartmentAuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacContextService: RbacContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy metadata từ @RequireDepartment decorator
    const options = this.reflector.get<DepartmentAuthOptions>(
      DEPARTMENT_AUTH_KEY,
      context.getHandler(),
    );

    // Không có decorator → cho phép truy cập
    if (!options) {
      return true;
    }

    // Extract user và workspace từ context
    const { userId, workspaceId } = this.extractContext(context);

    // Validate required context
    if (!userId) {
      this.logger.warn(DEPARTMENT_AUTH_MESSAGES.USER_NOT_FOUND);
      throw new ForbiddenException(DEPARTMENT_AUTH_MESSAGES.USER_NOT_FOUND);
    }

    if (!workspaceId) {
      this.logger.warn(DEPARTMENT_AUTH_MESSAGES.WORKSPACE_NOT_FOUND);
      throw new ForbiddenException(
        DEPARTMENT_AUTH_MESSAGES.WORKSPACE_NOT_FOUND,
      );
    }

    // Resolve user context từ RbacContextService
    const userContext = await this.rbacContextService.resolveContext(
      userId,
      workspaceId,
    );

    if (!userContext) {
      this.logger.warn(DEPARTMENT_AUTH_MESSAGES.CONTEXT_NOT_FOUND);
      throw new ForbiddenException(DEPARTMENT_AUTH_MESSAGES.CONTEXT_NOT_FOUND);
    }

    this.logger.debug(
      DEPARTMENT_AUTH_MESSAGES.CHECKING(
        userId,
        options.allowedDepartments ?? [],
      ),
    );

    // Kiểm tra authorization
    const result = this.checkAuthorization(
      {
        userId,
        workspaceId,
        workspaceMemberId: userContext.workspaceMemberId,
        departmentCode: userContext.departmentCode,
        departmentAncestorCodes: this.extractAncestorCodes(userContext),
        hierarchyLevel: userContext.hierarchyLevel,
        isManager: userContext.isManager,
      },
      options,
    );

    if (!result.allowed) {
      this.logger.debug(
        DEPARTMENT_AUTH_MESSAGES.DENIED(
          userId,
          userContext.departmentCode,
          options.allowedDepartments ?? [],
        ),
      );

      const message =
        options.deniedMessage ?? DEPARTMENT_AUTH_MESSAGES.ACCESS_DENIED;

      throw new ForbiddenException(message);
    }

    return true;
  }

  /**
   * Kiểm tra authorization dựa trên options
   */
  private checkAuthorization(
    context: {
      userId: string;
      workspaceId: string;
      workspaceMemberId: string;
      departmentCode: string | null;
      departmentAncestorCodes: string[];
      hierarchyLevel: number;
      isManager: boolean;
    },
    options: DepartmentAuthOptions,
  ): DepartmentAuthResult {
    const {
      allowedDepartments,
      allowManagers,
      allowExecutives = true,
    } = options;

    // 1. Kiểm tra executives (default: true)
    if (
      allowExecutives &&
      context.hierarchyLevel <= HIERARCHY_LEVELS.EXECUTIVE_MAX
    ) {
      this.logger.debug(
        DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_EXECUTIVE(
          context.userId,
          context.hierarchyLevel,
        ),
      );

      return {
        allowed: true,
        reason: 'User is executive',
        userDepartment: context.departmentCode ?? undefined,
        userHierarchyLevel: context.hierarchyLevel,
        checkedBy: 'executive',
      };
    }

    // 2. Kiểm tra managers
    if (
      allowManagers &&
      context.hierarchyLevel <= HIERARCHY_LEVELS.MANAGER_MAX
    ) {
      this.logger.debug(
        DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_MANAGER(
          context.userId,
          context.hierarchyLevel,
        ),
      );

      return {
        allowed: true,
        reason: 'User is manager',
        userDepartment: context.departmentCode ?? undefined,
        userHierarchyLevel: context.hierarchyLevel,
        checkedBy: 'manager',
      };
    }

    // 3. Kiểm tra department
    if (allowedDepartments && allowedDepartments.length > 0) {
      // Kiểm tra departmentCode trực tiếp
      if (
        context.departmentCode &&
        allowedDepartments.includes(context.departmentCode)
      ) {
        this.logger.debug(
          DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_DEPARTMENT(
            context.userId,
            context.departmentCode,
          ),
        );

        return {
          allowed: true,
          reason: `User belongs to allowed department: ${context.departmentCode}`,
          userDepartment: context.departmentCode,
          userHierarchyLevel: context.hierarchyLevel,
          checkedBy: 'department',
        };
      }

      // Kiểm tra qua ancestors (user thuộc team con của department được phép)
      for (const ancestorCode of context.departmentAncestorCodes) {
        if (allowedDepartments.includes(ancestorCode)) {
          this.logger.debug(
            DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_DEPARTMENT(
              context.userId,
              ancestorCode,
            ),
          );

          return {
            allowed: true,
            reason: `User belongs to child of allowed department: ${ancestorCode}`,
            userDepartment: context.departmentCode ?? undefined,
            userHierarchyLevel: context.hierarchyLevel,
            checkedBy: 'department',
          };
        }
      }
    }

    // Không thỏa mãn điều kiện nào
    return {
      allowed: false,
      reason: 'User does not meet department authorization requirements',
      userDepartment: context.departmentCode ?? undefined,
      userHierarchyLevel: context.hierarchyLevel,
    };
  }

  /**
   * Extract ancestor department codes từ userContext
   * (Cần implement thêm logic để lấy ancestor codes từ ancestor IDs)
   */
  private extractAncestorCodes(_userContext: {
    departmentCode: string | null;
    departmentAncestorIds: string[];
  }): string[] {
    // TODO: Implement logic để map ancestor IDs sang ancestor codes
    // Hiện tại return empty array, sẽ chỉ check departmentCode trực tiếp
    // Trong tương lai có thể cache ancestor codes trong userContext
    return [];
  }

  /**
   * Extract context từ execution context (GraphQL hoặc HTTP)
   */
  private extractContext(context: ExecutionContext): {
    userId: string | undefined;
    workspaceId: string | undefined;
  } {
    const contextType = context.getType<string>();

    if (contextType === 'graphql') {
      return this.extractGraphQLContext(context);
    }

    return this.extractHttpContext(context);
  }

  /**
   * Extract context từ GraphQL
   */
  private extractGraphQLContext(context: ExecutionContext): {
    userId: string | undefined;
    workspaceId: string | undefined;
  } {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();

    const userId = ctx.req?.user?.id;
    const workspaceId = ctx.req?.workspace?.id ?? ctx.req?.workspaceId;

    return { userId, workspaceId };
  }

  /**
   * Extract context từ HTTP
   */
  private extractHttpContext(context: ExecutionContext): {
    userId: string | undefined;
    workspaceId: string | undefined;
  } {
    const request = context.switchToHttp().getRequest();

    const userId = request.user?.id;
    const workspaceId = request.workspace?.id ?? request.workspaceId;

    return { userId, workspaceId };
  }
}
