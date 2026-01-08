import { Injectable, Logger } from '@nestjs/common';

import {
  ACTIVE_TIERS,
  DOWNGRADE_BLOCKED_REASON,
  DOWNGRADE_POLICY_CONFIG,
  DowngradeBlockedReason,
  DowngradeCheckResult,
  INACTIVITY_THRESHOLDS,
  TIER_DOWNGRADE_PATH,
  TIER_RANK,
} from 'src/mkt-core/customer/constants/mkt-customer-downgrade-policy.constants';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  BulkDowngradeResult,
  CustomerDowngradeContext,
} from 'src/mkt-core/customer/types/customer-tier.types';

/**
 * MktCustomerDowngradePolicyService
 *
 * Business logic for tier downgrade policy
 * - Protection period after upgrade
 * - Gradual tier drop (max 1 tier per recalculation)
 * - Inactivity detection (DORMANT/CHURNED)
 */
@Injectable()
export class MktCustomerDowngradePolicyService {
  private readonly logger = new Logger(MktCustomerDowngradePolicyService.name);

  constructor(private readonly customerRepository: MktCustomerRepository) {}

  // ============================================
  // DOWNGRADE PROTECTION CHECKS
  // ============================================

  /**
   * Check if customer is protected from downgrade
   * Returns protection status and remaining days
   */
  checkDowngradeProtection(lastTierUpgradeAt: Date | null): {
    isProtected: boolean;
    remainingDays: number;
  } {
    if (!DOWNGRADE_POLICY_CONFIG.PROTECTION_ENABLED) {
      return { isProtected: false, remainingDays: 0 };
    }

    if (!lastTierUpgradeAt) {
      return { isProtected: false, remainingDays: 0 };
    }

    const now = DateTimeUtils.now();
    const upgradeDate = DateTimeUtils.fromDate(lastTierUpgradeAt);
    const protectionEndDate = DateTimeUtils.add(upgradeDate, {
      days: DOWNGRADE_POLICY_CONFIG.UPGRADE_PROTECTION_DAYS,
    });

    // Use luxon DateTime comparison - now < protectionEndDate means still protected
    const isProtected = now < protectionEndDate;
    const remainingDays = isProtected
      ? DateTimeUtils.diffInDays(now, protectionEndDate)
      : 0;

    return {
      isProtected,
      remainingDays: Math.max(0, Math.ceil(remainingDays)),
    };
  }

  /**
   * Full downgrade check with all policy rules
   */
  checkDowngrade(context: CustomerDowngradeContext): DowngradeCheckResult {
    const { currentTier, calculatedTier, lastTierUpgradeAt } = context;

    // If calculated tier is same or higher, no downgrade needed
    if (TIER_RANK[calculatedTier] >= TIER_RANK[currentTier]) {
      return {
        shouldDowngrade: false,
        targetTier: currentTier,
        isProtected: false,
        protectionRemainingDays: 0,
        reason: null,
      };
    }

    // Check upgrade protection period
    const protection = this.checkDowngradeProtection(lastTierUpgradeAt);

    if (protection.isProtected) {
      this.logger.debug(
        `Customer ${context.customerId} protected from downgrade: ${protection.remainingDays} days remaining`,
      );

      return {
        shouldDowngrade: false,
        targetTier: currentTier,
        isProtected: true,
        protectionRemainingDays: protection.remainingDays,
        reason: DOWNGRADE_BLOCKED_REASON.PROTECTION_PERIOD,
      };
    }

    // Apply max tier drop limit
    const tierDrop = TIER_RANK[currentTier] - TIER_RANK[calculatedTier];
    const maxDrop = DOWNGRADE_POLICY_CONFIG.MAX_TIER_DROP_PER_RECALCULATION;

    if (tierDrop > maxDrop) {
      // Allow gradual downgrade (one tier at a time)
      const targetTier = TIER_DOWNGRADE_PATH[currentTier];

      this.logger.log(
        `Customer ${context.customerId} tier drop limited: ${currentTier} -> ${targetTier} (max ${maxDrop} per recalc)`,
      );

      return {
        shouldDowngrade: true,
        targetTier,
        isProtected: false,
        protectionRemainingDays: 0,
        reason: DOWNGRADE_BLOCKED_REASON.MAX_DROP_LIMIT,
      };
    }

    // Check if already at lowest active tier
    if (currentTier === MKT_CUSTOMER_TIER.BRONZE) {
      return {
        shouldDowngrade: false,
        targetTier: currentTier,
        isProtected: false,
        protectionRemainingDays: 0,
        reason: DOWNGRADE_BLOCKED_REASON.ALREADY_LOWEST,
      };
    }

    // Apply full downgrade
    return {
      shouldDowngrade: true,
      targetTier: calculatedTier,
      isProtected: false,
      protectionRemainingDays: 0,
      reason: null,
    };
  }

  // ============================================
  // INACTIVITY DETECTION
  // ============================================

  /**
   * Check if customer should be marked as DORMANT or CHURNED based on inactivity
   */
  checkInactivityStatus(
    lastOrderDate: Date | null,
    currentTier: MKT_CUSTOMER_TIER,
  ): { status: 'active' | 'dormant' | 'churned'; daysSinceLastOrder: number } {
    // Skip for already inactive tiers
    if (
      currentTier === MKT_CUSTOMER_TIER.DORMANT ||
      currentTier === MKT_CUSTOMER_TIER.CHURNED
    ) {
      return { status: 'active', daysSinceLastOrder: 0 };
    }

    if (!lastOrderDate) {
      // No orders ever - not marked as churned
      return { status: 'active', daysSinceLastOrder: 0 };
    }

    const now = DateTimeUtils.now();
    const lastOrder = DateTimeUtils.fromDate(lastOrderDate);
    const daysSinceLastOrder = DateTimeUtils.diffInDays(lastOrder, now);

    if (daysSinceLastOrder >= INACTIVITY_THRESHOLDS.CHURNED_DAYS) {
      return { status: 'churned', daysSinceLastOrder };
    }

    if (daysSinceLastOrder >= INACTIVITY_THRESHOLDS.DORMANT_DAYS) {
      return { status: 'dormant', daysSinceLastOrder };
    }

    return { status: 'active', daysSinceLastOrder };
  }

  /**
   * Get tier based on inactivity status
   */
  getTierFromInactivityStatus(
    inactivityStatus: 'active' | 'dormant' | 'churned',
    currentTier: MKT_CUSTOMER_TIER,
    calculatedTier: MKT_CUSTOMER_TIER,
  ): MKT_CUSTOMER_TIER {
    if (inactivityStatus === 'churned') {
      return MKT_CUSTOMER_TIER.CHURNED;
    }

    if (inactivityStatus === 'dormant') {
      return MKT_CUSTOMER_TIER.DORMANT;
    }

    // Active - return calculated tier (subject to downgrade policy)
    return calculatedTier;
  }

  // ============================================
  // TIER DETERMINATION
  // ============================================

  /**
   * Determine final tier after applying all policies
   * Main entry point for tier determination with downgrade protection
   */
  determineFinalTier(context: CustomerDowngradeContext): {
    finalTier: MKT_CUSTOMER_TIER;
    wasDowngraded: boolean;
    wasProtected: boolean;
    reason: DowngradeBlockedReason | null;
  } {
    const { currentTier, calculatedTier, lastOrderDate } = context;

    // First check inactivity
    const inactivity = this.checkInactivityStatus(lastOrderDate, currentTier);

    if (inactivity.status !== 'active') {
      const inactivityTier = this.getTierFromInactivityStatus(
        inactivity.status,
        currentTier,
        calculatedTier,
      );

      return {
        finalTier: inactivityTier,
        wasDowngraded: inactivityTier !== currentTier,
        wasProtected: false,
        reason: null,
      };
    }

    // If calculated tier is higher or equal, apply upgrade
    if (TIER_RANK[calculatedTier] >= TIER_RANK[currentTier]) {
      return {
        finalTier: calculatedTier,
        wasDowngraded: false,
        wasProtected: false,
        reason: null,
      };
    }

    // Apply downgrade policy
    const downgradeResult = this.checkDowngrade(context);

    if (!downgradeResult.shouldDowngrade) {
      return {
        finalTier: currentTier,
        wasDowngraded: false,
        wasProtected: downgradeResult.isProtected,
        reason: downgradeResult.reason,
      };
    }

    return {
      finalTier: downgradeResult.targetTier,
      wasDowngraded: true,
      wasProtected: false,
      reason: downgradeResult.reason,
    };
  }

  /**
   * Bulk determine final tiers for multiple customers
   */
  bulkDetermineFinalTiers(
    contexts: CustomerDowngradeContext[],
  ): BulkDowngradeResult[] {
    return contexts.map((context) => {
      const result = this.determineFinalTier(context);

      return {
        customerId: context.customerId,
        finalTier: result.finalTier,
        wasDowngraded: result.wasDowngraded,
        wasProtected: result.wasProtected,
        reason: result.reason,
      };
    });
  }

  // ============================================
  // UPGRADE TRACKING
  // ============================================

  /**
   * Check if tier change is an upgrade
   */
  isUpgrade(
    previousTier: MKT_CUSTOMER_TIER | null,
    newTier: MKT_CUSTOMER_TIER,
  ): boolean {
    if (!previousTier) {
      return ACTIVE_TIERS.includes(newTier);
    }

    return TIER_RANK[newTier] > TIER_RANK[previousTier];
  }

  /**
   * Check if tier change is a downgrade
   */
  isDowngrade(
    previousTier: MKT_CUSTOMER_TIER,
    newTier: MKT_CUSTOMER_TIER,
  ): boolean {
    return TIER_RANK[newTier] < TIER_RANK[previousTier];
  }

  /**
   * Update lastTierUpgradeAt when customer is upgraded
   */
  async updateLastTierUpgrade(
    workspaceId: string,
    customerId: string,
  ): Promise<void> {
    const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

    await this.customerRepository.update(
      customerId,
      { lastTierUpgradeAt: now },
      workspaceId,
    );

    this.logger.debug(
      `Updated lastTierUpgradeAt for customer ${customerId}: ${now.toISOString()}`,
    );
  }

  /**
   * Bulk update lastTierUpgradeAt for upgraded customers
   */
  async bulkUpdateLastTierUpgrade(
    workspaceId: string,
    customerIds: string[],
  ): Promise<number> {
    if (customerIds.length === 0) {
      return 0;
    }

    const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

    await this.customerRepository.bulkUpdate(workspaceId, customerIds, {
      lastTierUpgradeAt: now,
    });

    this.logger.debug(
      `Bulk updated lastTierUpgradeAt for ${customerIds.length} customers`,
    );

    return customerIds.length;
  }

  // ============================================
  // REACTIVATION
  // ============================================

  /**
   * Check if customer should be reactivated from DORMANT/CHURNED
   * Called when customer completes a new order
   */
  checkReactivation(
    currentTier: MKT_CUSTOMER_TIER,
    calculatedTier: MKT_CUSTOMER_TIER,
  ): { shouldReactivate: boolean; reactivationTier: MKT_CUSTOMER_TIER } {
    const inactiveTiers = [
      MKT_CUSTOMER_TIER.DORMANT,
      MKT_CUSTOMER_TIER.CHURNED,
    ];

    if (!inactiveTiers.includes(currentTier)) {
      return { shouldReactivate: false, reactivationTier: currentTier };
    }

    // Reactivate to calculated tier (based on new order)
    return {
      shouldReactivate: true,
      reactivationTier: ACTIVE_TIERS.includes(calculatedTier)
        ? calculatedTier
        : MKT_CUSTOMER_TIER.BRONZE,
    };
  }
}
