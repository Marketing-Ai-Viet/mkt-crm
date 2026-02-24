/**
 * @RequireDepartment Decorator for Department-Based Authorization
 *
 * Apply to resolver methods or controllers to require specific department
 * membership or hierarchy level for access.
 *
 * Works with DepartmentAuthorizationGuard.
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';

import { DEPARTMENT } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import {
  DEPARTMENT_AUTH_KEY,
  DepartmentAuthOptions,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/department-authorization.types';

/**
 * @RequireDepartment decorator for department-based authorization
 *
 * Checks user's department and hierarchy level to determine access.
 * Automatically applies DepartmentAuthorizationGuard.
 *
 * ## Basic Usage - Department Only
 *
 * @example
 * ```typescript
 * // Only ACCOUNTING department can confirm orders
 * @Mutation(() => ConfirmOrderResponse)
 * @RequireDepartment({ allowedDepartments: ['ACCOUNTING'] })
 * async confirmOrder(@Args('input') input: ConfirmOrderInput) {
 *   return this.orderService.confirm(input);
 * }
 * ```
 *
 * ## With Manager Access
 *
 * @example
 * ```typescript
 * // SALES department OR any manager can create orders
 * @Mutation(() => CreateOrderResponse)
 * @RequireDepartment({
 *   allowedDepartments: ['SALES'],
 *   allowManagers: true,
 * })
 * async createOrder(@Args('input') input: CreateOrderInput) {
 *   return this.orderService.create(input);
 * }
 * ```
 *
 * ## Multiple Departments
 *
 * @example
 * ```typescript
 * // SALES or ACCOUNTING can update order status
 * @Mutation(() => UpdateStatusResponse)
 * @RequireDepartment({
 *   allowedDepartments: ['SALES', 'ACCOUNTING'],
 *   allowManagers: true,
 * })
 * async updateOrderStatus(@Args('input') input: UpdateStatusInput) {
 *   return this.orderService.updateStatus(input);
 * }
 * ```
 *
 * ## With Custom Error Message
 *
 * @example
 * ```typescript
 * @Mutation(() => RefundResponse)
 * @RequireDepartment({
 *   allowedDepartments: ['ACCOUNTING'],
 *   deniedMessage: 'Chỉ phòng kế toán mới có quyền hoàn tiền',
 * })
 * async refundOrder(@Args('input') input: RefundInput) {
 *   return this.orderService.refund(input);
 * }
 * ```
 *
 * ## Disable Executive Bypass
 *
 * @example
 * ```typescript
 * // Even executives must be in ACCOUNTING to access
 * @Mutation(() => AuditResponse)
 * @RequireDepartment({
 *   allowedDepartments: ['ACCOUNTING'],
 *   allowExecutives: false,
 * })
 * async sensitiveAudit(@Args('input') input: AuditInput) {
 *   return this.auditService.runSensitiveAudit(input);
 * }
 * ```
 *
 * @param options Department authorization options
 */
export const RequireDepartment = (
  options: DepartmentAuthOptions,
): MethodDecorator => {
  // Validate: phải có ít nhất một điều kiện cho phép
  if (
    (!options.allowedDepartments || options.allowedDepartments.length === 0) &&
    !options.allowManagers &&
    options.allowExecutives === false
  ) {
    throw new Error(
      '@RequireDepartment requires at least one allow condition: ' +
        'allowedDepartments, allowManagers, or allowExecutives',
    );
  }

  // DepartmentAuthorizationGuard is registered as APP_GUARD globally
  // It automatically checks for DEPARTMENT_AUTH_KEY metadata and skips if not present
  return applyDecorators(SetMetadata(DEPARTMENT_AUTH_KEY, options));
};

/**
 * Shorthand decorators cho các use cases phổ biến
 */

/**
 * Chỉ cho phép SALES department (và executives)
 */
export const RequireSalesDepartment = (
  options?: Omit<DepartmentAuthOptions, 'allowedDepartments'>,
): MethodDecorator =>
  RequireDepartment({
    allowedDepartments: [DEPARTMENT.SALES],
    ...options,
  });

/**
 * Chỉ cho phép ACCOUNTING department (và executives)
 */
export const RequireAccountingDepartment = (
  options?: Omit<DepartmentAuthOptions, 'allowedDepartments'>,
): MethodDecorator =>
  RequireDepartment({
    allowedDepartments: [DEPARTMENT.ACCOUNTING],
    ...options,
  });

/**
 * Cho phép SALES hoặc Manager từ bất kỳ phòng ban (và executives)
 */
export const RequireSalesOrManager = (
  options?: Omit<DepartmentAuthOptions, 'allowedDepartments' | 'allowManagers'>,
): MethodDecorator =>
  RequireDepartment({
    allowedDepartments: [DEPARTMENT.SALES],
    allowManagers: true,
    ...options,
  });

/**
 * Cho phép Manager từ bất kỳ phòng ban (và executives)
 */
export const RequireManager = (
  options?: Omit<DepartmentAuthOptions, 'allowManagers'>,
): MethodDecorator =>
  RequireDepartment({
    allowManagers: true,
    ...options,
  });

/**
 * Chỉ cho phép Executives (CEO, C-Level, VP)
 */
export const RequireExecutive = (
  options?: Omit<DepartmentAuthOptions, 'allowExecutives'>,
): MethodDecorator =>
  RequireDepartment({
    allowExecutives: true,
    allowManagers: false,
    ...options,
  });
