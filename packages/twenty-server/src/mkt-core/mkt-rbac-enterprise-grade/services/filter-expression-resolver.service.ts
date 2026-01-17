/**
 * FilterExpressionResolverService - Resolves template variables in filter expressions
 *
 * Converts PermissionContext.filterExpression (with $user.* variables)
 * to resolved filter conditions (with actual values).
 *
 * Flow:
 * 1. Nhận filterExpression từ PermissionContext (chứa template variables)
 * 2. Nhận RBACUserContext (chứa thông tin user hiện tại)
 * 3. Replace tất cả template variables thành actual values
 * 4. Trả về ResolvedFilterConditions sẵn sàng để apply vào query
 *
 * @example
 * Input: { createdById: '$user.workspaceMemberId' }
 * UserContext: { workspaceMemberId: 'member-uuid-123' }
 * Output: { createdById: 'member-uuid-123' }
 *
 * @see /docs/RBAC-REFACTOR-PLAN.md
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  TemplateFilterExpression,
  ResolvedFilterConditions,
  FilterResolutionContext,
  FilterResolutionResult,
  isTemplateVariable,
  hasTemplateVariables,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/filter-expression.types';
import { RBACUserContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/rbac-context.types';

@Injectable()
export class FilterExpressionResolverService {
  private readonly logger = new Logger(FilterExpressionResolverService.name);

  /**
   * Resolve template filter expression to actual values
   *
   * @param templateFilter - Filter expression với template variables ($user.*, $context.*)
   * @param userContext - RBACUserContext chứa thông tin user hiện tại
   * @param additionalContext - Context bổ sung (optional)
   * @returns FilterResolutionResult với resolvedFilter hoặc errors
   *
   * @example
   * resolveFilterExpression(
   *   { createdById: '$user.workspaceMemberId' },
   *   userContext,
   * )
   * // → { success: true, resolvedFilter: { createdById: 'member-uuid-123' }, ... }
   */
  resolveFilterExpression(
    templateFilter: TemplateFilterExpression,
    userContext: RBACUserContext,
    additionalContext?: Record<string, unknown>,
  ): FilterResolutionResult {
    const unresolvedVariables: string[] = [];
    const errors: string[] = [];

    try {
      // Build resolution context từ RBACUserContext
      const resolutionContext: FilterResolutionContext = {
        user: {
          userId: userContext.userId,
          workspaceMemberId: userContext.workspaceMemberId,
          workspaceId: userContext.workspaceId,
          departmentId: userContext.departmentId,
          departmentAncestorIds: userContext.departmentAncestorIds,
          departmentDescendantIds: userContext.departmentDescendantIds,
          teamMemberIds: userContext.teamMemberIds,
          subordinateMemberIds: userContext.subordinateMemberIds,
          supportingMemberIds: userContext.supportingMemberIds,
          hierarchyLevel: userContext.hierarchyLevel,
          organizationLevelId: userContext.organizationLevelId,
        },
        context: additionalContext,
      };

      // Resolve the filter recursively
      const resolvedFilter = this.resolveObject(
        templateFilter,
        resolutionContext,
        unresolvedVariables,
      );

      // Check for empty filter (ALL_RECORDS case - không filter = full access)
      if (Object.keys(resolvedFilter).length === 0) {
        return {
          success: true,
          resolvedFilter: null, // null means no filter (all access)
          unresolvedVariables: [],
          errors: [],
        };
      }

      // Log warnings nếu có unresolved variables
      if (unresolvedVariables.length > 0) {
        this.logger.warn(
          `Unresolved template variables: ${unresolvedVariables.join(', ')}`,
        );
      }

      return {
        success: unresolvedVariables.length === 0,
        resolvedFilter: resolvedFilter as ResolvedFilterConditions,
        unresolvedVariables,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Filter resolution failed: ${errorMessage}`);

      return {
        success: false,
        resolvedFilter: null,
        unresolvedVariables,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Check xem filter expression có cần resolve không
   * (có chứa template variables hay không)
   *
   * @param filter - Filter expression cần kiểm tra
   * @returns true nếu filter chứa template variables cần resolve
   */
  needsResolution(filter: unknown): boolean {
    return hasTemplateVariables(filter);
  }

  /**
   * Validate filter expression syntax
   * Kiểm tra xem filter expression có hợp lệ không
   *
   * @param filter - Filter expression cần validate
   * @returns true nếu filter hợp lệ
   */
  validateFilterExpression(filter: unknown): boolean {
    if (filter === null || filter === undefined) {
      return true; // Empty filter is valid (means all access)
    }

    if (typeof filter !== 'object') {
      return false;
    }

    // Recursive validation cho nested objects
    return this.validateObject(filter as Record<string, unknown>);
  }

  // ============================================
  // PRIVATE RESOLUTION METHODS
  // ============================================

  /**
   * Resolve object recursively
   */
  private resolveObject(
    obj: Record<string, unknown>,
    context: FilterResolutionContext,
    unresolvedVars: string[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.resolveValue(value, context, unresolvedVars);
    }

    return result;
  }

  /**
   * Resolve single value - có thể là string, array, object, hoặc primitive
   */
  private resolveValue(
    value: unknown,
    context: FilterResolutionContext,
    unresolvedVars: string[],
  ): unknown {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle template variable string (e.g., '$user.workspaceMemberId')
    if (typeof value === 'string') {
      if (isTemplateVariable(value)) {
        return this.resolveTemplateVariable(value, context, unresolvedVars);
      }

      return value;
    }

    // Handle arrays - resolve mỗi item
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.resolveValue(item, context, unresolvedVars),
      );
    }

    // Handle objects (including operators như $in, $or, etc.)
    if (typeof value === 'object') {
      return this.resolveObject(
        value as Record<string, unknown>,
        context,
        unresolvedVars,
      );
    }

    // Return primitives as-is (number, boolean)
    return value;
  }

  /**
   * Resolve template variable to actual value
   *
   * @example
   * '$user.workspaceMemberId' → 'member-uuid-123'
   * '$user.teamMemberIds' → ['member-1', 'member-2']
   * '$context.value' → value từ additionalContext
   */
  private resolveTemplateVariable(
    variable: string,
    context: FilterResolutionContext,
    unresolvedVars: string[],
  ): unknown {
    const { root, path } = this.parseVariablePath(variable);

    const rootObject = this.getRootObject(root, context);

    if (rootObject === undefined) {
      unresolvedVars.push(variable);

      return variable;
    }

    const navigateResult = this.navigatePath(rootObject, path);

    if (!navigateResult.found) {
      unresolvedVars.push(variable);

      return variable;
    }

    return this.handleResolvedValue(
      navigateResult.value,
      path,
      variable,
      unresolvedVars,
    );
  }

  /**
   * Parse variable path từ template variable string
   * @example "$user.workspaceMemberId" → { root: "user", path: ["workspaceMemberId"] }
   */
  private parseVariablePath(variable: string): {
    root: string;
    path: string[];
  } {
    const parts = variable.replace('$', '').split('.');

    return {
      root: parts[0],
      path: parts.slice(1),
    };
  }

  /**
   * Get root object từ context dựa trên root key
   * @returns undefined nếu root không hợp lệ
   */
  private getRootObject(
    root: string,
    context: FilterResolutionContext,
  ): unknown {
    const rootMap: Record<string, unknown> = {
      user: context.user,
      context: context.context,
    };

    return rootMap[root];
  }

  /**
   * Navigate qua path để lấy value từ object
   */
  private navigatePath(
    rootObject: unknown,
    path: string[],
  ): { found: boolean; value: unknown } {
    let current = rootObject;

    for (const key of path) {
      if (current === null || current === undefined) {
        return { found: false, value: undefined };
      }

      if (
        typeof current !== 'object' ||
        !(key in (current as Record<string, unknown>))
      ) {
        return { found: false, value: undefined };
      }

      current = (current as Record<string, unknown>)[key];
    }

    return { found: true, value: current };
  }

  /**
   * Handle resolved value - xử lý null case và trả về giá trị phù hợp
   */
  private handleResolvedValue(
    value: unknown,
    path: string[],
    variable: string,
    unresolvedVars: string[],
  ): unknown {
    if (value !== null) {
      return value;
    }

    // Nếu là array type (ends with Ids), trả về empty array
    const lastKey = path[path.length - 1];

    if (lastKey?.endsWith('Ids')) {
      return [];
    }

    // Nếu là single value null, mark as unresolved
    unresolvedVars.push(variable);

    return variable;
  }

  // ============================================
  // PRIVATE VALIDATION METHODS
  // ============================================

  /**
   * Validate object structure recursively
   */
  private validateObject(obj: Record<string, unknown>): boolean {
    for (const [, value] of Object.entries(obj)) {
      if (!this.validateValue(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate single value
   */
  private validateValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      // Template variables phải bắt đầu bằng $user. hoặc $context.
      return !value.startsWith('$') || isTemplateVariable(value);
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.validateValue(item));
    }

    if (typeof value === 'object') {
      return this.validateObject(value as Record<string, unknown>);
    }

    // Primitives are valid
    return true;
  }
}
