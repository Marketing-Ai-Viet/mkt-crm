import { Injectable, Logger } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  PAYMENT_DEADLINE_CONFIG,
  PAYMENT_DEADLINE_SOURCE,
  PAYMENT_DEADLINE_BY_CUSTOMER_TYPE,
  PAYMENT_DEADLINE_BY_RESELLER_TIER,
  PaymentDeadlineSourceType,
} from 'src/mkt-core/order/constants/payment-deadline.constants';

/**
 * Payload for deadline calculation
 */
export type PaymentDeadlineCalculationInput = {
  /** Manual override hours (highest priority) */
  manualDeadlineHours?: number;
  /** Customer type (VIP, ENTERPRISE, STANDARD) */
  customerType?: string | null;
  /** Reseller tier (DIAMOND, GOLD, SILVER, BRONZE) */
  resellerTier?: string | null;
  /** Product-specific deadline hours */
  productDeadlineHours?: number | null;
};

/**
 * Result of deadline calculation
 */
export type PaymentDeadlineResult = {
  /** Calculated deadline date */
  deadline: Date;
  /** Source of the deadline configuration */
  source: PaymentDeadlineSourceType;
  /** Number of hours used for calculation */
  hours: number;
};

/**
 * PaymentDeadlineService
 *
 * Calculates payment deadline based on priority:
 * 1. Manual override (highest)
 * 2. Reseller tier
 * 3. Customer type
 * 4. Product config
 * 5. Global setting (lowest)
 *
 * Used in new payment flow where license is created immediately
 * on order confirmation with PENDING_PAYMENT status.
 */
@Injectable()
export class PaymentDeadlineService {
  private readonly logger = new Logger(PaymentDeadlineService.name);

  /**
   * Calculate payment deadline based on priority rules
   */
  calculateDeadline(
    input: PaymentDeadlineCalculationInput,
  ): PaymentDeadlineResult {
    const now = DateTimeUtils.now();

    // 1. Manual override (highest priority)
    if (
      input.manualDeadlineHours !== undefined &&
      input.manualDeadlineHours > 0
    ) {
      const hours = this.clampHours(input.manualDeadlineHours);

      this.logger.debug(`Deadline from MANUAL: ${hours} hours`);

      return {
        deadline: DateTimeUtils.toDateRequired(
          DateTimeUtils.add(now, { hours }),
        ),
        source: PAYMENT_DEADLINE_SOURCE.MANUAL,
        hours,
      };
    }

    // 2. Reseller tier
    if (input.resellerTier) {
      const hours = PAYMENT_DEADLINE_BY_RESELLER_TIER[input.resellerTier];

      if (hours) {
        this.logger.debug(
          `Deadline from RESELLER_TIER (${input.resellerTier}): ${hours} hours`,
        );

        return {
          deadline: DateTimeUtils.toDateRequired(
            DateTimeUtils.add(now, { hours }),
          ),
          source: PAYMENT_DEADLINE_SOURCE.RESELLER_TIER,
          hours,
        };
      }
    }

    // 3. Customer type
    if (input.customerType) {
      const hours = PAYMENT_DEADLINE_BY_CUSTOMER_TYPE[input.customerType];

      if (hours) {
        this.logger.debug(
          `Deadline from CUSTOMER_TYPE (${input.customerType}): ${hours} hours`,
        );

        return {
          deadline: DateTimeUtils.toDateRequired(
            DateTimeUtils.add(now, { hours }),
          ),
          source: PAYMENT_DEADLINE_SOURCE.CUSTOMER_TYPE,
          hours,
        };
      }
    }

    // 4. Product config
    if (
      input.productDeadlineHours !== undefined &&
      input.productDeadlineHours !== null &&
      input.productDeadlineHours > 0
    ) {
      const hours = this.clampHours(input.productDeadlineHours);

      this.logger.debug(`Deadline from PRODUCT: ${hours} hours`);

      return {
        deadline: DateTimeUtils.toDateRequired(
          DateTimeUtils.add(now, { hours }),
        ),
        source: PAYMENT_DEADLINE_SOURCE.PRODUCT,
        hours,
      };
    }

    // 5. Global setting (lowest priority)
    const globalHours = PAYMENT_DEADLINE_CONFIG.DEFAULT_HOURS;

    this.logger.debug(`Deadline from GLOBAL: ${globalHours} hours`);

    return {
      deadline: DateTimeUtils.toDateRequired(
        DateTimeUtils.add(now, { hours: globalHours }),
      ),
      source: PAYMENT_DEADLINE_SOURCE.GLOBAL,
      hours: globalHours,
    };
  }

  /**
   * Check if deadline has passed
   */
  isDeadlinePassed(deadline: Date | null | undefined): boolean {
    if (!deadline) {
      return false;
    }

    const deadlineTime = DateTimeUtils.fromDate(deadline);

    // Deadline has passed if it's in the past
    return DateTimeUtils.isPast(deadlineTime);
  }

  /**
   * Get remaining time until deadline in milliseconds
   * Returns 0 if deadline has passed
   */
  getRemainingTimeMs(deadline: Date | null | undefined): number {
    if (!deadline) {
      return 0;
    }

    const now = DateTimeUtils.now();
    const deadlineTime = DateTimeUtils.fromDate(deadline);

    // If deadline is in the past, return 0
    if (DateTimeUtils.isPast(deadlineTime)) {
      return 0;
    }

    return DateTimeUtils.toMillis(deadlineTime) - DateTimeUtils.toMillis(now);
  }

  /**
   * Get remaining time until deadline in hours
   */
  getRemainingTimeHours(deadline: Date | null | undefined): number {
    const remainingMs = this.getRemainingTimeMs(deadline);

    return remainingMs / (1000 * 60 * 60);
  }

  /**
   * Clamp hours to valid range
   */
  private clampHours(hours: number): number {
    return Math.min(
      Math.max(hours, PAYMENT_DEADLINE_CONFIG.MIN_HOURS),
      PAYMENT_DEADLINE_CONFIG.MAX_HOURS,
    );
  }
}
