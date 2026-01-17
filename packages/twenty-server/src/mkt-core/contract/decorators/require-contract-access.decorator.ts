/**
 * @RequireContractAccess Decorator for Contract Module Authorization
 *
 * Restricts access to Contract operations to:
 * - Finance Department (FINANCE)
 * - Accounting Department (ACCOUNTING)
 * - Executive Level (levels 1-3: CEO, C-Level, VP)
 *
 * All other roles receive 403 Forbidden.
 */

import { RequireDepartment } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators/require-department.decorator';
import { DepartmentAuthOptions } from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
import { DEPARTMENT_CODE_GROUP } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';

/**
 * Default denied message for Contract access
 */
const CONTRACT_ACCESS_DENIED_MESSAGE =
  'Chỉ phòng Tài chính/Kế toán và Ban điều hành mới có quyền truy cập Hợp đồng';

/**
 * @RequireContractAccess - Shorthand decorator for Contract module authorization
 *
 * Applies the following access rules:
 * - Finance Department: Full access with hierarchical filtering
 * - Accounting Department: Full access with hierarchical filtering
 * - Executive (levels 1-3): Full access to all contracts
 * - Other roles: 403 Forbidden
 *
 * @param options Optional overrides for DepartmentAuthOptions
 *
 * @example
 * ```typescript
 * @Query(() => ContractOutput)
 * @RequireContractAccess()
 * async getContractById(@Args('id') id: string) {
 *   return this.contractService.findById(id);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom denied message
 * @Mutation(() => ContractOutput)
 * @RequireContractAccess({ deniedMessage: 'Bạn không có quyền tạo hợp đồng' })
 * async createContract(@Args('input') input: CreateContractInput) {
 *   return this.contractService.create(input);
 * }
 * ```
 */
export const RequireContractAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireDepartment({
    allowedDepartments: [...DEPARTMENT_CODE_GROUP.FINANCIAL],
    allowExecutives: true,
    deniedMessage: options?.deniedMessage ?? CONTRACT_ACCESS_DENIED_MESSAGE,
    ...options,
  });

/**
 * @RequireContractReadAccess - For read-only contract operations
 *
 * Same as @RequireContractAccess but with explicit read context
 */
export const RequireContractReadAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireContractAccess({
    deniedMessage:
      options?.deniedMessage ??
      'Chỉ phòng Tài chính/Kế toán và Ban điều hành mới có quyền xem Hợp đồng',
    ...options,
  });

/**
 * @RequireContractWriteAccess - For write contract operations (create, update)
 *
 * Same as @RequireContractAccess but with explicit write context
 */
export const RequireContractWriteAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireContractAccess({
    deniedMessage:
      options?.deniedMessage ??
      'Chỉ phòng Tài chính/Kế toán và Ban điều hành mới có quyền sửa Hợp đồng',
    ...options,
  });

/**
 * @RequireContractDeleteAccess - For delete contract operations
 *
 * Same as @RequireContractAccess but with explicit delete context
 */
export const RequireContractDeleteAccess = (
  options?: Partial<Omit<DepartmentAuthOptions, 'allowedDepartments'>>,
): MethodDecorator =>
  RequireContractAccess({
    deniedMessage:
      options?.deniedMessage ??
      'Chỉ phòng Tài chính/Kế toán và Ban điều hành mới có quyền xóa Hợp đồng',
    ...options,
  });
