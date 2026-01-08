import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants';
import { DowngradeBlockedReason } from 'src/mkt-core/customer/constants/mkt-customer-downgrade-policy.constants';

/**
 * Customer data for downgrade check
 */
export type CustomerDowngradeContext = {
  customerId: string;
  currentTier: MKT_CUSTOMER_TIER;
  calculatedTier: MKT_CUSTOMER_TIER;
  lastTierUpgradeAt: Date | null;
  lastOrderDate: Date | null;
};

/**
 * Bulk downgrade check result
 */
export type BulkDowngradeResult = {
  customerId: string;
  finalTier: MKT_CUSTOMER_TIER;
  wasDowngraded: boolean;
  wasProtected: boolean;
  reason: DowngradeBlockedReason | null;
};
