/**
 * @RequireOrderAccess Decorators for Order Module Authorization
 *
 * Provides granular access control decorators for Order operations.
 * Each decorator maps to specific department permissions defined in ORDER_AUTHORIZATION.
 *
 * Pattern follows Contract module: require-contract-access.decorator.ts
 */

import { RequireDepartment } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators/require-department.decorator';
import { DepartmentAuthOptions } from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
import { ORDER_AUTHORIZATION } from 'src/mkt-core/order/constants/order-authorization.constants';

// ============================================================================
// DENIED MESSAGES
// ============================================================================

const ORDER_DENIED_MESSAGES = {
  READ: 'Only Sales, Accounting, Managers and Executives can view Orders',
  CREATE: 'Only Sales staff and Executives can create Orders',
  UPDATE: 'Only Sales, Accounting, Managers and Executives can update Orders',
  CONFIRM: 'Only Sales staff and Executives can confirm Orders',
  PAYMENT: 'Only Sales, Accounting and Executives can confirm payments',
  REFUND: 'Only Accounting staff and Executives can process refunds',
  UNLOCK: 'Only Accounting staff and Executives can unlock Orders',
} as const;

// ============================================================================
// READ DECORATORS
// ============================================================================

/**
 * @RequireOrderReadAccess - For all order query operations
 *
 * Access rules:
 * - SALES department (including child teams): View own/team orders
 * - ACCOUNTING department (including child teams): View payment-related orders
 * - Managers (level <= 7): View subordinate orders
 * - Executives (level 1-3): View all orders
 *
 * @example
 * ```typescript
 * @Query(() => OrderOutput)
 * @RequireOrderReadAccess()
 * async getOrderById(@Args('id') id: string) {}
 * ```
 */
export const RequireOrderReadAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    ...ORDER_AUTHORIZATION.UPDATE_STATUS, // SALES + ACCOUNTING + Managers + Executives
    deniedMessage: options?.deniedMessage ?? ORDER_DENIED_MESSAGES.READ,
    ...options,
  });

// ============================================================================
// MUTATION DECORATORS
// ============================================================================

/**
 * @RequireOrderCreateAccess - For order creation
 *
 * Access rules:
 * - SALES department (including child teams)
 * - Executives (level 1-3)
 */
export const RequireOrderCreateAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    ...ORDER_AUTHORIZATION.CREATE_ORDER,
    deniedMessage: options?.deniedMessage ?? ORDER_DENIED_MESSAGES.CREATE,
    ...options,
  });

/**
 * @RequireOrderUpdateAccess - For order status updates and draft publishing
 *
 * Access rules:
 * - SALES department (including child teams)
 * - ACCOUNTING department (including child teams)
 * - Managers (level <= 7)
 * - Executives (level 1-3)
 */
export const RequireOrderUpdateAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    ...ORDER_AUTHORIZATION.UPDATE_STATUS,
    deniedMessage: options?.deniedMessage ?? ORDER_DENIED_MESSAGES.UPDATE,
    ...options,
  });

/**
 * @RequireOrderConfirmAccess - For order confirmation with license creation
 *
 * Access rules:
 * - SALES department (including child teams)
 * - Executives (level 1-3)
 */
export const RequireOrderConfirmAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    ...ORDER_AUTHORIZATION.CONFIRM_ORDER_WITH_LICENSE,
    deniedMessage: options?.deniedMessage ?? ORDER_DENIED_MESSAGES.CONFIRM,
    ...options,
  });

/**
 * @RequireOrderPaymentAccess - For payment confirmation
 *
 * Access rules:
 * - SALES department (bank transfer confirmation)
 * - ACCOUNTING department (cash/other payment confirmation)
 * - Executives (level 1-3)
 */
export const RequireOrderPaymentAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    ...ORDER_AUTHORIZATION.CONFIRM_PAYMENT,
    deniedMessage: options?.deniedMessage ?? ORDER_DENIED_MESSAGES.PAYMENT,
    ...options,
  });

/**
 * @RequireOrderRefundAccess - For order refund operations
 *
 * Access rules:
 * - ACCOUNTING department (including child teams)
 * - Executives (level 1-3)
 */
export const RequireOrderRefundAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    ...ORDER_AUTHORIZATION.REFUND_ORDER,
    deniedMessage: options?.deniedMessage ?? ORDER_DENIED_MESSAGES.REFUND,
    ...options,
  });

/**
 * @RequireOrderUnlockAccess - For unlocking orders after late payment
 *
 * Access rules:
 * - ACCOUNTING department (including child teams)
 * - Executives (level 1-3)
 */
export const RequireOrderUnlockAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    ...ORDER_AUTHORIZATION.UNLOCK_ORDER,
    deniedMessage: options?.deniedMessage ?? ORDER_DENIED_MESSAGES.UNLOCK,
    ...options,
  });
