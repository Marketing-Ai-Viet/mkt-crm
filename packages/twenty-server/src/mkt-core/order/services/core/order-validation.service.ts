import { Injectable } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import {
  ORDER_ACTION,
  ORDER_STATUS,
  VALID_ACTIONS_BY_STATUS,
  VALID_CREATE_ACTIONS,
} from 'src/mkt-core/order/constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  CreateOrderWithItemsInput,
  ConfirmOrderInput,
  ExternalMktProductInput,
  ValidationError,
  ValidationResult,
  ORDER_VALIDATION_ERROR_CODES,
} from 'src/mkt-core/order/types';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';

/**
 * Service để validate order data trước khi xử lý
 * Tách biệt với business logic
 *
 * Supports validation for external MKT Server products via OAuth2 API
 */
@Injectable()
export class OrderValidationService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktProductProxy: MktProductProxyService,
  ) {}

  // ============================================
  // CREATE ORDER VALIDATION
  // ============================================

  /**
   * Validate input để tạo order mới
   *
   * Supports:
   * - Internal variants (CRM products)
   * - External MKT Server products
   * - Mixed orders with both types
   */
  async validateCreateOrderInput(
    workspaceId: string,
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationResult> {
    // Early return cho TRIAL_TO_PAID action
    if (input.action === ORDER_ACTION.TRIAL_TO_PAID) {
      return this.validateTrialToPaidInput(workspaceId, input);
    }

    // Run all validations in parallel where possible
    const [customerErrors, itemErrors, paymentErrors, actionErrors] =
      await Promise.all([
        this.validateCustomer(workspaceId, input.customerId),
        this.validateOrderItems(workspaceId, input),
        this.validatePaymentMethodsForAction(workspaceId, input),
        Promise.resolve(this.validateAction(input.action)),
      ]);

    const errors = [
      ...customerErrors,
      ...itemErrors,
      ...paymentErrors,
      ...actionErrors,
    ];

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate customer exists
   */
  private async validateCustomer(
    workspaceId: string,
    customerId: string | undefined,
  ): Promise<ValidationError[]> {
    if (!customerId) {
      return [
        {
          field: 'customerId',
          message: 'Customer ID is required',
          code: ORDER_VALIDATION_ERROR_CODES.CUSTOMER_REQUIRED,
        },
      ];
    }

    const exists = await this.customerExists(workspaceId, customerId);

    if (!exists) {
      return [
        {
          field: 'customerId',
          message: `Customer with ID ${customerId} not found`,
          code: ORDER_VALIDATION_ERROR_CODES.CUSTOMER_NOT_FOUND,
        },
      ];
    }

    return [];
  }

  /**
   * Validate order items (external MKT products only)
   */
  private async validateOrderItems(
    _workspaceId: string,
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationError[]> {
    const hasExternalProducts =
      input.externalProducts && input.externalProducts.length > 0;

    if (!hasExternalProducts || !input.externalProducts) {
      return [
        {
          field: 'externalProducts',
          message: 'At least one external product is required',
          code: ORDER_VALIDATION_ERROR_CODES.ITEMS_REQUIRED,
        },
      ];
    }

    return this.validateExternalProducts(input.externalProducts);
  }

  /**
   * Validate payment methods based on action type
   */
  private async validatePaymentMethodsForAction(
    workspaceId: string,
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationError[]> {
    // Payment not required for TRIAL
    if (input.action === ORDER_ACTION.TRIAL) {
      return [];
    }

    if (!input.paymentMethods || input.paymentMethods.length === 0) {
      return [
        {
          field: 'paymentMethods',
          message: 'At least one payment method is required',
          code: ORDER_VALIDATION_ERROR_CODES.PAYMENT_METHOD_REQUIRED,
        },
      ];
    }

    return this.validatePaymentMethods(
      workspaceId,
      input.paymentMethods.map((p) => p.paymentMethodId),
    );
  }

  /**
   * Validate action is valid for create order
   */
  private validateAction(action: ORDER_ACTION): ValidationError[] {
    if (!this.isValidCreateAction(action)) {
      return [
        {
          field: 'action',
          message: `Invalid action: ${action}`,
          code: ORDER_VALIDATION_ERROR_CODES.INVALID_ACTION,
        },
      ];
    }

    return [];
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
   * Validate danh sách external MKT products
   * Uses MktProductProxyService to validate against MKT Server
   */
  private async validateExternalProducts(
    externalProducts: ExternalMktProductInput[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Use MktProductProxyService validation
    const validationResult = await this.mktProductProxy.validateForOrder(
      externalProducts.map((p) => ({
        productId: p.productId,
        packageId: p.packageId,
      })),
    );

    if (!validationResult.valid) {
      for (const error of validationResult.errors) {
        const errorCode = this.mapExternalProductErrorToCode(error.reason);

        errors.push({
          field: error.packageId
            ? 'externalProducts.package'
            : 'externalProducts.product',
          message: error.packageId
            ? `Package ${error.packageId}: ${error.reason}`
            : `Product ${error.productId}: ${error.reason}`,
          code: errorCode,
        });
      }
    }

    return errors;
  }

  /**
   * Map external product validation error reasons to error codes
   */
  private mapExternalProductErrorToCode(reason: string): string {
    if (reason.includes('Product not found')) {
      return ORDER_VALIDATION_ERROR_CODES.EXTERNAL_PRODUCT_NOT_FOUND;
    }

    if (reason.includes('Product status is')) {
      return ORDER_VALIDATION_ERROR_CODES.EXTERNAL_PRODUCT_INACTIVE;
    }

    if (reason.includes('Package not found')) {
      return ORDER_VALIDATION_ERROR_CODES.EXTERNAL_PACKAGE_NOT_FOUND;
    }

    if (reason.includes('Package does not belong')) {
      return ORDER_VALIDATION_ERROR_CODES.EXTERNAL_PACKAGE_MISMATCH;
    }

    if (reason.includes('Package is not active')) {
      return ORDER_VALIDATION_ERROR_CODES.EXTERNAL_PACKAGE_INACTIVE;
    }

    return 'EXTERNAL_PRODUCT_VALIDATION_ERROR';
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
    return VALID_CREATE_ACTIONS.includes(action);
  }

  /**
   * Kiểm tra status transition hợp lệ
   */
  private isValidStatusTransition(
    currentStatus: ORDER_STATUS,
    action: ORDER_ACTION,
  ): boolean {
    const allowedActions = VALID_ACTIONS_BY_STATUS[currentStatus] ?? [];

    return allowedActions.includes(action);
  }
}
