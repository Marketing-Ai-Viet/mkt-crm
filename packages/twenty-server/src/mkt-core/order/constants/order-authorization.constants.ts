/**
 * Order Authorization Constants
 *
 * Định nghĩa quy tắc phân quyền cho các order mutations.
 */

import { DepartmentAuthOptions } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/department-authorization.types';
import { DEPARTMENT } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';

/**
 * Authorization rules cho các order mutations
 */
export const ORDER_AUTHORIZATION = {
  /**
   * Tạo đơn hàng: SALES + Manager + Executives
   * - Nhân viên phòng SALES (bao gồm các team con)
   * - Manager từ bất kỳ phòng ban nào (level ≤ 7)
   * - Executives (CEO, C-Level, VP - level ≤ 3)
   */
  CREATE_ORDER: {
    allowedDepartments: [DEPARTMENT.SALES],
    allowManagers: true,
    allowExecutives: true,
    deniedMessage:
      'Chỉ nhân viên kinh doanh hoặc quản lý mới có quyền tạo đơn hàng',
  } satisfies DepartmentAuthOptions,

  /**
   * Publish draft: SALES + Manager + Executives
   * - Cùng quy tắc với CREATE_ORDER
   */
  PUBLISH_DRAFT: {
    allowedDepartments: [DEPARTMENT.SALES],
    allowManagers: true,
    allowExecutives: true,
    deniedMessage:
      'Chỉ nhân viên kinh doanh hoặc quản lý mới có quyền publish đơn hàng',
  } satisfies DepartmentAuthOptions,

  /**
   * Xác nhận thanh toán: Chỉ ACCOUNTING + Executives
   * - Chỉ phòng kế toán (bao gồm các team con)
   * - Executives (CEO, C-Level, VP)
   * - Manager không được phép (trừ khi thuộc ACCOUNTING)
   */
  CONFIRM_ORDER: {
    allowedDepartments: [DEPARTMENT.ACCOUNTING],
    allowManagers: false,
    allowExecutives: true,
    deniedMessage:
      'Chỉ phòng kế toán mới có quyền xác nhận thanh toán đơn hàng',
  } satisfies DepartmentAuthOptions,

  /**
   * Cập nhật trạng thái: SALES + ACCOUNTING + Manager + Executives
   * - Phòng SALES (tạo và quản lý đơn hàng)
   * - Phòng ACCOUNTING (xử lý tài chính)
   * - Manager từ bất kỳ phòng ban
   * - Executives
   */
  UPDATE_STATUS: {
    allowedDepartments: [DEPARTMENT.SALES, DEPARTMENT.ACCOUNTING],
    allowManagers: true,
    allowExecutives: true,
    deniedMessage:
      'Chỉ nhân viên kinh doanh, kế toán hoặc quản lý mới có quyền cập nhật trạng thái đơn hàng',
  } satisfies DepartmentAuthOptions,

  /**
   * Hoàn tiền: Chỉ ACCOUNTING + Executives
   * - Nghiệp vụ tài chính nhạy cảm
   * - Chỉ phòng kế toán được phép
   * - Manager không được phép (trừ khi thuộc ACCOUNTING)
   */
  REFUND_ORDER: {
    allowedDepartments: [DEPARTMENT.ACCOUNTING],
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Chỉ phòng kế toán mới có quyền hoàn tiền đơn hàng',
  } satisfies DepartmentAuthOptions,
} as const;

/**
 * Export type cho ORDER_AUTHORIZATION keys
 */
export type OrderAuthorizationType = keyof typeof ORDER_AUTHORIZATION;
