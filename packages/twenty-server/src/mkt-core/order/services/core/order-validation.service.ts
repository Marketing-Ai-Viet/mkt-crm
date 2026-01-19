import { Injectable } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import {
  ORDER_ACTION,
  ORDER_STATUS,
  VALID_ACTIONS_BY_STATUS,
  VALID_CREATE_ACTIONS,
} from 'src/mkt-core/order/constants';
import { ORDER_VALIDATION_ERROR_CODES } from 'src/mkt-core/order/messages';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import {
  CreateOrderWithItemsInput,
  ConfirmOrderInput,
  ExternalMktProductInput,
  ValidationError,
  ValidationResult,
} from 'src/mkt-core/order/types';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories/mkt-payment-method.repository';

/**
 * Service để validate order data trước khi xử lý
 * Tách biệt với business logic
 *
 * Validates external MKT Server products via OAuth2 API
 */
@Injectable()
export class OrderValidationService {
  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly orderRepository: MktOrderRepository,
    private readonly paymentMethodRepository: MktPaymentMethodRepository,
    private readonly mktProductProxy: MktProductProxyService,
  ) {}

  // ============================================
  // CREATE ORDER VALIDATION
  // ============================================

  /**
   * Validate input để tạo order mới
   *
   * Validates external MKT Server products (required)
   */
  async validateCreateOrderInput(
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationResult> {
    // Early return cho TRIAL_TO_PAID action
    if (input.action === ORDER_ACTION.TRIAL_TO_PAID) {
      return this.validateTrialToPaidInput(input);
    }

    // Run all validations in parallel where possible
    const [customerErrors, itemErrors, paymentErrors, actionErrors] =
      await Promise.all([
        this.validateCustomer(input.customerId),
        this.validateOrderItems(input),
        this.validatePaymentMethodsForAction(input),
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

    const exists = await this.customerExists(customerId);

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
   *
   * With multi-payment support, payment methods are OPTIONAL for all actions.
   * Orders can be created without payments (paymentStatus = PENDING)
   * and payments can be recorded later.
   */
  private async validatePaymentMethodsForAction(
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationError[]> {
    // Payment methods are optional - order starts with paymentStatus = PENDING
    if (!input.paymentMethods || input.paymentMethods.length === 0) {
      return [];
    }

    // If payment methods provided, validate they exist
    return this.validatePaymentMethods(
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
   * Validate input cho TRIAL_TO_PAID action
   *
   * TRIAL_TO_PAID giờ tạo license trial với thời hạn ngắn (mặc định 1 ngày)
   * để khách hàng trải nghiệm trước khi thanh toán.
   *
   * Required: externalProducts hoặc combos (giống NEW_ORDER)
   * Optional: trialDurationDays (mặc định 1 ngày)
   */
  async validateTrialToPaidInput(
    input: CreateOrderWithItemsInput,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // TRIAL_TO_PAID cần có externalProducts hoặc combos (giống NEW_ORDER)
    const hasExternalProducts =
      input.externalProducts && input.externalProducts.length > 0;
    const hasCombos = input.combos && input.combos.length > 0;

    if (!hasExternalProducts && !hasCombos) {
      errors.push({
        field: 'externalProducts',
        message:
          'At least one external product or combo is required for TRIAL_TO_PAID action',
        code: ORDER_VALIDATION_ERROR_CODES.EXTERNAL_PRODUCTS_REQUIRED,
      });
    }

    // Payment methods are optional with multi-payment support
    // If provided, validate they exist
    if (input.paymentMethods && input.paymentMethods.length > 0) {
      const paymentErrors = await this.validatePaymentMethods(
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
    input: ConfirmOrderInput,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check order exists
    const order = await this.findOrder(input.orderId);

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
  private async customerExists(customerId: string): Promise<boolean> {
    return this.customerRepository.exists(customerId);
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
    paymentMethodIds: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const methods =
      await this.paymentMethodRepository.findByIds(paymentMethodIds);
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
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.findById(orderId);
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
