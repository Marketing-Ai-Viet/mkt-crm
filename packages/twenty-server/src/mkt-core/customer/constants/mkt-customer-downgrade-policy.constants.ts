import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';

/**
 * Downgrade Policy Configuration
 * Controls tier downgrade behavior and protection periods
 */
export const DOWNGRADE_POLICY_CONFIG = {
  /**
   * Protection period after upgrade (in days)
   * Customer cannot be downgraded during this period
   */
  UPGRADE_PROTECTION_DAYS: 30,

  /**
   * Grace period before applying downgrade (in days)
   * Customer is warned but not immediately downgraded
   */
  GRACE_PERIOD_DAYS: 14,

  /**
   * Enable/disable downgrade protection
   * When false, customers can be downgraded immediately
   */
  PROTECTION_ENABLED: true,

  /**
   * Maximum tier drops allowed per recalculation
   * Prevents sudden multi-tier drops (e.g., Diamond -> Bronze)
   */
  MAX_TIER_DROP_PER_RECALCULATION: 1,

  /**
   * Soft downgrade - only applies to cron recalculation
   * Order-triggered recalculations are not affected
   */
  SOFT_DOWNGRADE_ONLY: true,
} as const;

/**
 * Inactivity thresholds for tier status
 */
export const INACTIVITY_THRESHOLDS = {
  /**
   * Days since last order to mark as DORMANT
   */
  DORMANT_DAYS: 90,

  /**
   * Days since last order to mark as CHURNED
   */
  CHURNED_DAYS: 180,

  /**
   * Days to consider for "recent activity"
   * Used in downgrade protection calculation
   */
  RECENT_ACTIVITY_DAYS: 30,
} as const;

/**
 * Tier rank for comparison (higher = better tier)
 */
export const TIER_RANK: Record<MKT_CUSTOMER_TIER, number> = {
  [MKT_CUSTOMER_TIER.DIAMOND]: 6,
  [MKT_CUSTOMER_TIER.GOLD]: 5,
  [MKT_CUSTOMER_TIER.SILVER]: 4,
  [MKT_CUSTOMER_TIER.BRONZE]: 3,
  [MKT_CUSTOMER_TIER.DORMANT]: 2,
  [MKT_CUSTOMER_TIER.CHURNED]: 1,
};

/**
 * Active tiers (not dormant/churned)
 */
export const ACTIVE_TIERS: MKT_CUSTOMER_TIER[] = [
  MKT_CUSTOMER_TIER.DIAMOND,
  MKT_CUSTOMER_TIER.GOLD,
  MKT_CUSTOMER_TIER.SILVER,
  MKT_CUSTOMER_TIER.BRONZE,
];

/**
 * Downgrade paths - defines valid tier transitions
 * Key: current tier, Value: allowed downgrade target
 */
export const TIER_DOWNGRADE_PATH: Record<MKT_CUSTOMER_TIER, MKT_CUSTOMER_TIER> =
  {
    [MKT_CUSTOMER_TIER.DIAMOND]: MKT_CUSTOMER_TIER.GOLD,
    [MKT_CUSTOMER_TIER.GOLD]: MKT_CUSTOMER_TIER.SILVER,
    [MKT_CUSTOMER_TIER.SILVER]: MKT_CUSTOMER_TIER.BRONZE,
    [MKT_CUSTOMER_TIER.BRONZE]: MKT_CUSTOMER_TIER.BRONZE, // Cannot drop below Bronze
    [MKT_CUSTOMER_TIER.DORMANT]: MKT_CUSTOMER_TIER.CHURNED,
    [MKT_CUSTOMER_TIER.CHURNED]: MKT_CUSTOMER_TIER.CHURNED,
  };

/**
 * Downgrade result type
 */
export type DowngradeCheckResult = {
  shouldDowngrade: boolean;
  targetTier: MKT_CUSTOMER_TIER;
  isProtected: boolean;
  protectionRemainingDays: number;
  reason: DowngradeBlockedReason | null;
};

/**
 * Reasons why downgrade was blocked
 */
export const DOWNGRADE_BLOCKED_REASON = {
  PROTECTION_PERIOD: 'PROTECTION_PERIOD',
  GRACE_PERIOD: 'GRACE_PERIOD',
  MAX_DROP_LIMIT: 'MAX_DROP_LIMIT',
  RECENT_ACTIVITY: 'RECENT_ACTIVITY',
  ALREADY_LOWEST: 'ALREADY_LOWEST',
} as const;

export type DowngradeBlockedReason =
  (typeof DOWNGRADE_BLOCKED_REASON)[keyof typeof DOWNGRADE_BLOCKED_REASON];
