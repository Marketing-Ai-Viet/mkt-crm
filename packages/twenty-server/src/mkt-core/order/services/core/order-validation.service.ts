import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  CreateOrderWithItemsInput,
  ConfirmOrderInput,
} from 'src/mkt-core/order/types';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

// ============================================
// ERROR CODES
// ============================================

export const ORDER_VALIDATION_ERROR_CODES = {
  CUSTOMER_REQUIRED: 'CUSTOMER_REQUIRED',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  VARIANTS_REQUIRED: 'VARIANTS_REQUIRED',
  VARIANT_NOT_FOUND: 'VARIANT_NOT_FOUND',
  VARIANT_INACTIVE: 'VARIANT_INACTIVE',
  PAYMENT_METHOD_REQUIRED: 'PAYMENT_METHOD_REQUIRED',
  PAYMENT_METHOD_NOT_FOUND: 'PAYMENT_METHOD_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  INVALID_ACTION: 'INVALID_ACTION',
  TRIAL_ORDER_REQUIRED: 'TRIAL_ORDER_REQUIRED',
  TRIAL_ORDER_NOT_FOUND: 'TRIAL_ORDER_NOT_FOUND',
} as const;

/**
 * Service để validate order data trước khi xử lý
 * Tách biệt với business logic
 */
@Injectable()
export class OrderValidationService {
  private readonly logger = new Logger(OrderValidationService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // CREATE ORDER VALIDATION
  // ============================================

  /**
   * Validate input để tạo order mới
   */
  async validateCreateOrderInput(
    workspaceId: string,
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Skip validation cho TRIAL_TO_PAID action
    if (input.action === ORDER_ACTION.TRIAL_TO_PAID) {
      return this.validateTrialToPaidInput(workspaceId, input);
    }

    // Validate customer
    if (!input.customerId) {
      errors.push({
        field: 'customerId',
        message: 'Customer ID is required',
        code: ORDER_VALIDATION_ERROR_CODES.CUSTOMER_REQUIRED,
      });
    } else {
      const customerExists = await this.customerExists(
        workspaceId,
        input.customerId,
      );

      if (!customerExists) {
        errors.push({
          field: 'customerId',
          message: `Customer with ID ${input.customerId} not found`,
          code: ORDER_VALIDATION_ERROR_CODES.CUSTOMER_NOT_FOUND,
        });
      }
    }

    // Validate variants
    if (!input.variants || input.variants.length === 0) {
      errors.push({
        field: 'variants',
        message: 'At least one variant is required',
        code: ORDER_VALIDATION_ERROR_CODES.VARIANTS_REQUIRED,
      });
    } else {
      const variantErrors = await this.validateVariants(
        workspaceId,
        input.variants.map((v) => v.variantId),
      );

      errors.push(...variantErrors);
    }

    // Validate payment methods (not required for TRIAL)
    if (input.action !== ORDER_ACTION.TRIAL) {
      if (!input.paymentMethods || input.paymentMethods.length === 0) {
        errors.push({
          field: 'paymentMethods',
          message: 'At least one payment method is required',
          code: ORDER_VALIDATION_ERROR_CODES.PAYMENT_METHOD_REQUIRED,
        });
      } else {
        const paymentErrors = await this.validatePaymentMethods(
          workspaceId,
          input.paymentMethods.map((p) => p.paymentMethodId),
        );

        errors.push(...paymentErrors);
      }
    }

    // Validate action
    if (!this.isValidCreateAction(input.action)) {
      errors.push({
        field: 'action',
        message: `Invalid action: ${input.action}`,
        code: ORDER_VALIDATION_ERROR_CODES.INVALID_ACTION,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate input cho TRIAL_TO_PAID conversion
   */
  async validateTrialToPaidInput(
    workspaceId: string,
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!input.trialOrderId) {
      errors.push({
        field: 'trialOrderId',
        message: 'Trial order ID is required for TRIAL_TO_PAID action',
        code: ORDER_VALIDATION_ERROR_CODES.TRIAL_ORDER_REQUIRED,
      });
    } else {
      const trialOrder = await this.findOrder(workspaceId, input.trialOrderId);

      if (!trialOrder) {
        errors.push({
          field: 'trialOrderId',
          message: `Trial order with ID ${input.trialOrderId} not found`,
          code: ORDER_VALIDATION_ERROR_CODES.TRIAL_ORDER_NOT_FOUND,
        });
      } else if (trialOrder.status !== ORDER_STATUS.TRIAL) {
        errors.push({
          field: 'trialOrderId',
          message: `Order ${input.trialOrderId} is not a trial order (status: ${trialOrder.status})`,
          code: ORDER_VALIDATION_ERROR_CODES.INVALID_ORDER_STATUS,
        });
      }
    }

    // Validate payment methods
    if (!input.paymentMethods || input.paymentMethods.length === 0) {
      errors.push({
        field: 'paymentMethods',
        message: 'At least one payment method is required',
        code: ORDER_VALIDATION_ERROR_CODES.PAYMENT_METHOD_REQUIRED,
      });
    } else {
      const paymentErrors = await this.validatePaymentMethods(
        workspaceId,
        input.paymentMethods.map((p) => p.paymentMethodId),
      );

      errors.push(...paymentErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================
  // CONFIRM ORDER VALIDATION
  // ============================================

  /**
   * Validate input để confirm order
   */
  async validateConfirmOrderInput(
    workspaceId: string,
    input: ConfirmOrderInput,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check order exists
    const order = await this.findOrder(workspaceId, input.orderId);

    if (!order) {
      errors.push({
        field: 'orderId',
        message: `Order with ID ${input.orderId} not found`,
        code: ORDER_VALIDATION_ERROR_CODES.ORDER_NOT_FOUND,
      });

      return { valid: false, errors };
    }

    // Validate status transition
    if (
      !this.isValidStatusTransition(order.status as ORDER_STATUS, input.action)
    ) {
      errors.push({
        field: 'action',
        message: `Cannot perform action ${input.action} on order with status ${order.status}`,
        code: ORDER_VALIDATION_ERROR_CODES.INVALID_ACTION,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Kiểm tra customer tồn tại
   */
  private async customerExists(
    workspaceId: string,
    customerId: string,
  ): Promise<boolean> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktCustomerWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const customer = await repository.findOne({
      where: { id: customerId },
      select: ['id'],
    });

    return !!customer;
  }

  /**
   * Validate danh sách variants
   */
  private async validateVariants(
    workspaceId: string,
    variantIds: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktVariantWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const variants = await repository.find({
      where: variantIds.map((id) => ({ id })),
      select: ['id', 'name'],
    });

    const foundIds = new Set(variants.map((v) => v.id));

    for (const variantId of variantIds) {
      if (!foundIds.has(variantId)) {
        errors.push({
          field: 'variants',
          message: `Variant with ID ${variantId} not found`,
          code: ORDER_VALIDATION_ERROR_CODES.VARIANT_NOT_FOUND,
        });
      }
    }

    return errors;
  }

  /**
   * Validate danh sách payment methods
   */
  private async validatePaymentMethods(
    workspaceId: string,
    paymentMethodIds: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktPaymentMethodWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const methods = await repository.find({
      where: paymentMethodIds.map((id) => ({ id })),
      select: ['id', 'name'],
    });

    const foundIds = new Set(methods.map((m) => m.id));

    for (const methodId of paymentMethodIds) {
      if (!foundIds.has(methodId)) {
        errors.push({
          field: 'paymentMethods',
          message: `Payment method with ID ${methodId} not found`,
          code: ORDER_VALIDATION_ERROR_CODES.PAYMENT_METHOD_NOT_FOUND,
        });
      }
    }

    return errors;
  }

  /**
   * Tìm order
   */
  private async findOrder(
    workspaceId: string,
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktOrderWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    return repository.findOne({
      where: { id: orderId },
    });
  }

  /**
   * Kiểm tra action hợp lệ cho tạo order
   */
  private isValidCreateAction(action: ORDER_ACTION): boolean {
    const validActions = [
      ORDER_ACTION.WAIT,
      ORDER_ACTION.TRIAL,
      ORDER_ACTION.TRIAL_TO_PAID,
      ORDER_ACTION.LICENSE_RENEWING,
    ];

    return validActions.includes(action);
  }

  /**
   * Kiểm tra status transition hợp lệ
   */
  private isValidStatusTransition(
    currentStatus: ORDER_STATUS,
    action: ORDER_ACTION,
  ): boolean {
    const validTransitions: Record<ORDER_STATUS, ORDER_ACTION[]> = {
      [ORDER_STATUS.DRAFT]: [ORDER_ACTION.WAIT, ORDER_ACTION.TRIAL],
      [ORDER_STATUS.WAIT]: [
        ORDER_ACTION.CONFIRMED,
        ORDER_ACTION.REFUSE,
        ORDER_ACTION.OVERDUE,
      ],
      [ORDER_STATUS.TRIAL]: [
        ORDER_ACTION.TRIAL_TO_PAID,
        ORDER_ACTION.COMPLETED,
        ORDER_ACTION.REFUSE,
      ],
      [ORDER_STATUS.CONFIRMED]: [
        ORDER_ACTION.COMPLETED,
        ORDER_ACTION.REFUND,
        ORDER_ACTION.REFUND_PARTIAL,
      ],
      [ORDER_STATUS.OVERDUE]: [ORDER_ACTION.CONFIRMED, ORDER_ACTION.REFUSE],
      [ORDER_STATUS.COMPLETED]: [
        ORDER_ACTION.REFUND,
        ORDER_ACTION.REFUND_PARTIAL,
      ],
      [ORDER_STATUS.REFUSE]: [],
      [ORDER_STATUS.REFUND]: [],
      [ORDER_STATUS.BLOCKED]: [],
      [ORDER_STATUS.REFUND_PARTIAL]: [ORDER_ACTION.REFUND],
    };

    const allowedActions = validTransitions[currentStatus] || [];

    return allowedActions.includes(action);
  }
}
