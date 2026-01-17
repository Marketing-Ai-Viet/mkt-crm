import { Injectable, Logger } from '@nestjs/common';

import isNil from 'lodash.isnil';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  ORDER_STATUS,
  ORDER_ACTION,
} from 'src/mkt-core/order/constants/order-status.constants';
import {
  PaymentDeadlineService,
  PaymentDeadlineCalculationInput,
  PaymentDeadlineResult,
} from 'src/mkt-core/order/services/core/payment-deadline.service';
import { OrderLicenseIntegrationService } from 'src/mkt-core/order/services/integration/order-license.integration';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import { OrderLicenseInput, BulkLicenseResult } from 'src/mkt-core/order/types';
import { PaymentDeadlineSourceType } from 'src/mkt-core/order/constants/payment-deadline.constants';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { MKT_ORDER_LICENSE_STATUS } from 'src/mkt-core/order/constants';

/**
 * Order data for confirm operations
 */
export type OrderConfirmData = {
  id: string;
  status: string | null;
  totalAmount?: number;
  customerType?: string | null;
  resellerTier?: string | null;
};

/**
 * Input for confirm order operation
 */
export type ConfirmOrderInput = {
  /** Order to confirm */
  order: OrderConfirmData;
  /** License creation inputs */
  licenseInputs: OrderLicenseInput[];
  /** Product deadline hours (max from products in order) */
  productDeadlineHours?: number | null;
  /** Manual override for deadline hours */
  manualDeadlineHours?: number;
  /** User context for API calls */
  userContext?: UserContext;
};

/**
 * Result of confirm order operation
 */
export type ConfirmOrderResult = {
  success: boolean;
  orderId: string;
  /** Licenses created with PENDING_PAYMENT status */
  licenses: BulkLicenseResult;
  /** Calculated payment deadline */
  deadline: PaymentDeadlineResult;
  /** Timestamp of confirmation */
  confirmedAt: Date;
  /** New order status */
  newStatus: string;
  /** Update data for order entity */
  orderUpdateData: ConfirmOrderUpdateData;
  /** Errors if any */
  errors: string[];
};

/**
 * Update data for order after confirmation
 */
export type ConfirmOrderUpdateData = {
  status: string;
  paymentDeadline: Date;
  paymentDeadlineSource: PaymentDeadlineSourceType;
  licenseStatus: string;
  paymentStatus: string;
};

/**
 * OrderConfirmService
 *
 * Handles order confirmation in new payment flow.
 *
 * New Flow:
 * 1. Calculate payment deadline based on priority rules
 * 2. Create licenses on MKT Server with PENDING_PAYMENT status
 * 3. Update order status to PROCESSING
 * 4. Schedule payment reminders (handled by caller)
 *
 * License Status Flow:
 * - On confirm: PENDING_PAYMENT (usable)
 * - On payment: ACTIVE
 * - On overdue: LOCKED
 * - On late payment: ACTIVE
 */
@Injectable()
export class OrderConfirmService {
  private readonly logger = new Logger(OrderConfirmService.name);

  constructor(
    private readonly paymentDeadlineService: PaymentDeadlineService,
    private readonly licenseIntegration: OrderLicenseIntegrationService,
  ) {}

  /**
   * Validate that order can be confirmed
   * Allowed statuses: DRAFT, CONFIRMED (legacy)
   */
  canConfirmOrder(order: OrderConfirmData): {
    valid: boolean;
    reason?: string;
  } {
    const allowedStatuses = [ORDER_STATUS.DRAFT, ORDER_STATUS.CONFIRMED];

    if (isNil(order.status)) {
      return { valid: false, reason: 'Order status is null' };
    }

    if (!allowedStatuses.includes(order.status as ORDER_STATUS)) {
      return {
        valid: false,
        reason: `Cannot confirm order with status: ${order.status}. Allowed: ${allowedStatuses.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate payment deadline for order
   */
  calculateDeadline(
    input: PaymentDeadlineCalculationInput,
  ): PaymentDeadlineResult {
    return this.paymentDeadlineService.calculateDeadline(input);
  }

  /**
   * Create licenses for order with PENDING_PAYMENT status
   *
   * Note: The PENDING_PAYMENT status should be handled by MKT Server
   * when creating licenses. If MKT Server doesn't support this status yet,
   * licenses will be created with default status and we track it locally.
   */
  async createLicensesForOrder(
    licenseInputs: OrderLicenseInput[],
    userContext?: UserContext,
  ): Promise<BulkLicenseResult> {
    this.logger.debug(`Creating ${licenseInputs.length} licenses for order`);

    if (licenseInputs.length === 0) {
      return { success: true, licenses: [], errors: [] };
    }

    const result = await this.licenseIntegration.createLicenses(
      licenseInputs,
      userContext,
    );

    this.logger.log(`Licenses creation completed`, {
      total: licenseInputs.length,
      success: result.licenses.length,
      failed: result.errors.length,
    });

    return result;
  }

  /**
   * Build update data for order after confirmation
   */
  buildOrderUpdateData(
    deadline: PaymentDeadlineResult,
    licensesCreated: boolean,
  ): ConfirmOrderUpdateData {
    return {
      status: ORDER_STATUS.PROCESSING,
      paymentDeadline: deadline.deadline,
      paymentDeadlineSource: deadline.source,
      licenseStatus: licensesCreated
        ? MKT_ORDER_LICENSE_STATUS.SUCCESS
        : MKT_ORDER_LICENSE_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
    };
  }

  /**
   * Get order history action for confirmation
   */
  getConfirmHistoryAction(): ORDER_ACTION {
    return ORDER_ACTION.CONFIRM_ORDER;
  }

  /**
   * Execute full confirm order flow
   *
   * Steps:
   * 1. Validate order can be confirmed
   * 2. Calculate payment deadline
   * 3. Create licenses (with PENDING_PAYMENT on MKT Server)
   * 4. Return update data for order
   */
  async confirmOrder(input: ConfirmOrderInput): Promise<ConfirmOrderResult> {
    const {
      order,
      licenseInputs,
      productDeadlineHours,
      manualDeadlineHours,
      userContext,
    } = input;

    this.logger.log(`Confirming order ${order.id}`);

    const errors: string[] = [];
    const confirmedAt = DateTimeUtils.toDate(DateTimeUtils.now());

    // 1. Validate
    const validation = this.canConfirmOrder(order);

    if (!validation.valid) {
      this.logger.warn(
        `Cannot confirm order ${order.id}: ${validation.reason}`,
      );

      return {
        success: false,
        orderId: order.id,
        licenses: { success: false, licenses: [], errors: [] },
        deadline: {
          deadline: confirmedAt,
          source: 'GLOBAL' as PaymentDeadlineSourceType,
          hours: 24,
        },
        confirmedAt,
        newStatus: order.status ?? ORDER_STATUS.DRAFT,
        orderUpdateData: {
          status: order.status ?? ORDER_STATUS.DRAFT,
          paymentDeadline: confirmedAt,
          paymentDeadlineSource: 'GLOBAL' as PaymentDeadlineSourceType,
          licenseStatus: MKT_ORDER_LICENSE_STATUS.PENDING,
          paymentStatus: PAYMENT_STATUS.PENDING,
        },
        errors: [validation.reason ?? 'Validation failed'],
      };
    }

    // 2. Calculate deadline
    const deadline = this.calculateDeadline({
      manualDeadlineHours,
      customerType: order.customerType,
      resellerTier: order.resellerTier,
      productDeadlineHours,
    });

    this.logger.debug(`Calculated deadline for order ${order.id}`, {
      deadline: deadline.deadline,
      source: deadline.source,
      hours: deadline.hours,
    });

    // 3. Create licenses
    let licenses: BulkLicenseResult = {
      success: true,
      licenses: [],
      errors: [],
    };

    if (licenseInputs.length > 0) {
      licenses = await this.createLicensesForOrder(licenseInputs, userContext);

      if (!licenses.success) {
        const licenseErrors = licenses.errors.map(
          (e) => `License creation failed: ${e.error}`,
        );

        errors.push(...licenseErrors);

        this.logger.warn(`License creation failed for order ${order.id}`, {
          errors: licenseErrors,
        });
      }
    }

    // 4. Build update data
    const orderUpdateData = this.buildOrderUpdateData(
      deadline,
      licenses.licenses.length > 0,
    );

    const success = errors.length === 0;

    this.logger.log(`Order ${order.id} confirmation completed`, {
      success,
      newStatus: orderUpdateData.status,
      licensesCreated: licenses.licenses.length,
      deadline: deadline.deadline,
    });

    return {
      success,
      orderId: order.id,
      licenses,
      deadline,
      confirmedAt,
      newStatus: orderUpdateData.status,
      orderUpdateData,
      errors,
    };
  }

  /**
   * Get remaining time to deadline in hours
   */
  getRemainingTimeHours(paymentDeadline: Date | null | undefined): number {
    return this.paymentDeadlineService.getRemainingTimeHours(paymentDeadline);
  }

  /**
   * Check if deadline has passed
   */
  isDeadlinePassed(paymentDeadline: Date | null | undefined): boolean {
    return this.paymentDeadlineService.isDeadlinePassed(paymentDeadline);
  }
}
