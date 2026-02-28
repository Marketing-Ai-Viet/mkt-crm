/**
 * DepartmentAuthorizationGuard
 *
 * Guard kiểm tra phân quyền dựa trên department, hierarchy level, và assigned templates.
 * Sử dụng với @RequireDepartment decorator.
 *
 * Permission Resolution Flow (theo thứ tự ưu tiên):
 * 1. Assigned Templates (mktUserPermissionTemplate) - priority >= threshold
 * 2. Executive Level (hierarchyLevel <= 3)
 * 3. Manager Level (hierarchyLevel <= 7)
 * 4. Department Membership (departmentCode hoặc ancestors)
 *
 * DI Delegation Pattern:
 * GraphQL Yoga tạo instance mới khi dùng @UseGuards() mà không resolve DI.
 * Guard sử dụng static singleton pattern: instance DI-resolved lưu vào static field,
 * instance không có DI sẽ delegate sang instance đã resolve.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { RbacContextService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
import {
  DEPARTMENT_AUTH_KEY,
  DepartmentAuthOptions,
  DepartmentAuthResult,
  DepartmentAuthContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/department-authorization.types';
import {
  HierarchyLevel,
  TEMPLATE_PRIORITY,
} from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { DEPARTMENT_AUTH_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
import { MktDepartmentRepository } from 'src/mkt-core/mkt-department/repositories';

@Injectable()
export class DepartmentAuthorizationGuard implements CanActivate, OnModuleInit {
  private static readonly HIERARCHY_LEVELS = {
    EXECUTIVE_MAX: HierarchyLevel.VP, // CEO=1, C_LEVEL=2, VP=3
    MANAGER_MAX: HierarchyLevel.MANAGER, // Includes MANAGER level
  } as const;

  /**
   * DI-resolved singleton instance.
   *
   * NestJS external-context-creator (GraphQL Yoga) tạo instance mới qua @UseGuards()
   * với dependencies "broken" (service có nhưng logger undefined).
   * OnModuleInit chỉ được gọi cho DI instance → đánh dấu chính xác instance nào hợp lệ.
   */
  private static resolvedInstance: DepartmentAuthorizationGuard | null = null;

  private readonly logger = new Logger(DepartmentAuthorizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacContextService: RbacContextService,
    private readonly cacheService: RbacCacheService,
    private readonly departmentRepository: MktDepartmentRepository,
  ) {}

  /**
   * OnModuleInit chỉ được NestJS gọi cho instance tạo bởi DI container.
   * Instance tạo bởi external-context-creator (GraphQL Yoga) sẽ KHÔNG trigger hook này.
   */
  onModuleInit() {
    DepartmentAuthorizationGuard.resolvedInstance = this;
    this.logger.log('DepartmentAuthorizationGuard DI instance initialized');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Delegate sang DI instance nếu instance này không phải DI-resolved
    const resolved = DepartmentAuthorizationGuard.resolvedInstance;

    if (resolved && resolved !== this) {
      return resolved.canActivate(context);
    }

    // Lấy metadata từ @RequireDepartment decorator (check cả handler và class level)
    const options = this.reflector.getAllAndOverride<DepartmentAuthOptions>(
      DEPARTMENT_AUTH_KEY,
      [context.getHandler(), context.getClass()],
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

    // Build authorization context with all permission sources
    const ancestorCodes = await this.extractAncestorCodes(
      userContext,
      workspaceId,
    );

    const authContext: DepartmentAuthContext = {
      userId,
      workspaceId,
      workspaceMemberId: userContext.workspaceMemberId,
      departmentCode: userContext.departmentCode,
      departmentAncestorCodes: ancestorCodes,
      hierarchyLevel: userContext.hierarchyLevel,
      isManager: userContext.isManager,
      templates: userContext.templates,
      templateKeys: userContext.templateKeys,
    };

    // Kiểm tra authorization với multi-source resolution
    const result = this.checkAuthorization(authContext, options);

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
   * Kiểm tra authorization dựa trên multi-source resolution
   *
   * Resolution order (theo priority):
   * 1. Assigned Templates - priority from template
   * 2. Executive Level - hierarchyLevel <= 3
   * 3. Manager Level - hierarchyLevel <= 7
   * 4. Department Membership
   */
  private checkAuthorization(
    context: DepartmentAuthContext,
    options: DepartmentAuthOptions,
  ): DepartmentAuthResult {
    const {
      allowedDepartments = [],
      allowManagers = false,
      allowExecutives = true,
      allowHighPriorityTemplates = true,
      minTemplatePriority = TEMPLATE_PRIORITY.MANAGER,
    } = options;

    const checks: Array<() => DepartmentAuthResult | null> = [
      // 1. Check assigned templates
      () =>
        this.checkHighPriorityTemplates(
          context,
          allowHighPriorityTemplates,
          minTemplatePriority,
        ),
      // 2. Check executives
      () => this.checkExecutiveAccess(context, allowExecutives),
      // 3. Check managers
      () => this.checkManagerAccess(context, allowManagers),
      // 4. Check department membership
      () => this.checkDepartmentAccess(context, allowedDepartments),
    ];

    for (const check of checks) {
      const result = check();

      if (result?.allowed) {
        return result;
      }
    }

    return this.createDeniedResult(context);
  }

  /**
   * Check high-priority templates
   */
  private checkHighPriorityTemplates(
    context: DepartmentAuthContext,
    allowHighPriorityTemplates: boolean,
    minTemplatePriority: number,
  ): DepartmentAuthResult | null {
    if (!allowHighPriorityTemplates || context.templates.length === 0) {
      return null;
    }

    const templateResult = this.checkTemplatePermission(
      context,
      minTemplatePriority,
    );

    return templateResult.allowed ? templateResult : null;
  }

  /**
   * Check executive access (hierarchyLevel <= 3)
   */
  private checkExecutiveAccess(
    context: DepartmentAuthContext,
    allowExecutives: boolean,
  ): DepartmentAuthResult | null {
    const isExecutive =
      context.hierarchyLevel <=
      DepartmentAuthorizationGuard.HIERARCHY_LEVELS.EXECUTIVE_MAX;

    if (!allowExecutives || !isExecutive) {
      return null;
    }

    this.logger.debug(
      DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_EXECUTIVE(
        context.userId,
        context.hierarchyLevel,
      ),
    );

    return this.createAllowedResult(context, 'User is executive', 'executive');
  }

  /**
   * Check manager access (hierarchyLevel <= 7)
   */
  private checkManagerAccess(
    context: DepartmentAuthContext,
    allowManagers: boolean,
  ): DepartmentAuthResult | null {
    const isManager =
      context.hierarchyLevel <=
      DepartmentAuthorizationGuard.HIERARCHY_LEVELS.MANAGER_MAX;

    if (!allowManagers || !isManager) {
      return null;
    }

    this.logger.debug(
      DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_MANAGER(
        context.userId,
        context.hierarchyLevel,
      ),
    );

    return this.createAllowedResult(context, 'User is manager', 'manager');
  }

  /**
   * Check department membership (direct or via ancestors)
   */
  private checkDepartmentAccess(
    context: DepartmentAuthContext,
    allowedDepartments: string[],
  ): DepartmentAuthResult | null {
    if (allowedDepartments.length === 0) {
      return null;
    }

    // Check direct department membership
    const directMatch = this.checkDirectDepartment(context, allowedDepartments);

    if (directMatch) {
      return directMatch;
    }

    // Check ancestor departments
    return this.checkAncestorDepartments(context, allowedDepartments);
  }

  /**
   * Check if user's department is directly in allowed list
   */
  private checkDirectDepartment(
    context: DepartmentAuthContext,
    allowedDepartments: string[],
  ): DepartmentAuthResult | null {
    if (
      !context.departmentCode ||
      !allowedDepartments.includes(context.departmentCode)
    ) {
      return null;
    }

    this.logger.debug(
      DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_DEPARTMENT(
        context.userId,
        context.departmentCode,
      ),
    );

    return this.createAllowedResult(
      context,
      `User belongs to allowed department: ${context.departmentCode}`,
      'department',
    );
  }

  /**
   * Check if user belongs to a child of allowed department
   */
  private checkAncestorDepartments(
    context: DepartmentAuthContext,
    allowedDepartments: string[],
  ): DepartmentAuthResult | null {
    const matchedAncestor = context.departmentAncestorCodes.find((code) =>
      allowedDepartments.includes(code),
    );

    if (!matchedAncestor) {
      return null;
    }

    this.logger.debug(
      DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_DEPARTMENT(
        context.userId,
        matchedAncestor,
      ),
    );

    return this.createAllowedResult(
      context,
      `User belongs to child of allowed department: ${matchedAncestor}`,
      'department',
    );
  }

  /**
   * Create allowed result with common fields
   */
  private createAllowedResult(
    context: DepartmentAuthContext,
    reason: string,
    checkedBy: DepartmentAuthResult['checkedBy'],
  ): DepartmentAuthResult {
    return {
      allowed: true,
      reason,
      userDepartment: context.departmentCode ?? undefined,
      userHierarchyLevel: context.hierarchyLevel,
      checkedBy,
    };
  }

  /**
   * Create denied result
   */
  private createDeniedResult(
    context: DepartmentAuthContext,
  ): DepartmentAuthResult {
    return {
      allowed: false,
      reason: 'User does not meet department authorization requirements',
      userDepartment: context.departmentCode ?? undefined,
      userHierarchyLevel: context.hierarchyLevel,
    };
  }

  /**
   * Kiểm tra permission dựa trên assigned templates
   * Templates với priority >= minTemplatePriority sẽ được cho phép
   */
  private checkTemplatePermission(
    context: DepartmentAuthContext,
    minTemplatePriority: number,
  ): DepartmentAuthResult {
    // Sort templates by priority (descending)
    const sortedTemplates = [...context.templates].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );

    // Find highest priority template that meets threshold
    const qualifyingTemplate = sortedTemplates.find(
      (template) => (template.priority ?? 0) >= minTemplatePriority,
    );

    if (qualifyingTemplate) {
      const templateKey = qualifyingTemplate.templateKey ?? 'unknown';
      const templatePriority = qualifyingTemplate.priority ?? 0;

      this.logger.debug(
        DEPARTMENT_AUTH_MESSAGES.ALLOWED_BY_TEMPLATE(
          context.userId,
          templateKey,
          templatePriority,
        ),
      );

      return {
        allowed: true,
        reason: `User has high-priority template: ${templateKey}`,
        userDepartment: context.departmentCode ?? undefined,
        userHierarchyLevel: context.hierarchyLevel,
        checkedBy: 'template',
        grantedByTemplate: {
          templateKey,
          templateName: qualifyingTemplate.templateName ?? templateKey,
          priority: templatePriority,
        },
      };
    }

    // No qualifying template found
    return {
      allowed: false,
      reason: 'No qualifying template found',
      userDepartment: context.departmentCode ?? undefined,
      userHierarchyLevel: context.hierarchyLevel,
    };
  }

  /**
   * RBAC-004: Extract ancestor department codes from userContext
   *
   * Maps departmentAncestorIds to department codes via MktDepartmentRepository.
   * Results are cached in RbacCacheService to avoid repeated DB queries.
   */
  private async extractAncestorCodes(
    userContext: {
      departmentCode: string | null;
      departmentAncestorIds: string[];
    },
    workspaceId: string,
  ): Promise<string[]> {
    if (userContext.departmentAncestorIds.length === 0) {
      return [];
    }

    // Check cache first
    const cacheKey = `__ancestor_codes:${userContext.departmentAncestorIds.join(',')}`;
    const cached = await this.cacheService.getCheckResult(
      cacheKey,
      workspaceId,
      '__dept_ancestor',
      '__codes',
    );

    if (cached?.reason) {
      this.logger.debug(
        DEPARTMENT_AUTH_MESSAGES.ANCESTOR_CODES_CACHE_HIT(
          userContext.departmentAncestorIds.length,
        ),
      );

      return cached.reason.split(',').filter(Boolean);
    }

    // Map ancestor IDs to department codes
    const codes: string[] = [];

    for (const ancestorId of userContext.departmentAncestorIds) {
      const department = await this.departmentRepository.findByIdInWorkspace(
        ancestorId,
        workspaceId,
      );

      if (department?.departmentCode) {
        codes.push(department.departmentCode);
      }
    }

    // Cache the resolved codes
    await this.cacheService.setCheckResult(
      cacheKey,
      workspaceId,
      '__dept_ancestor',
      '__codes',
      {
        allowed: true,
        reason: codes.join(','),
        latencyMs: 0,
        cached: false,
        appliedPolicies: [],
        dataFilter: null,
      },
    );

    this.logger.debug(
      DEPARTMENT_AUTH_MESSAGES.ANCESTOR_CODES_RESOLVED(
        userContext.departmentAncestorIds.length,
        codes.length,
      ),
    );

    return codes;
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
