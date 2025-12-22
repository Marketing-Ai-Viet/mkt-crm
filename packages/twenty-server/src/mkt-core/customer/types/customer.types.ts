import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';

/**
 * Order statistics aggregated by customer
 */
export type CustomerOrderStats = {
  customerId: string;
  orderCount: number;
  totalValue: number;
};

/**
 * Tier distribution for statistics
 */
export type TierDistribution = Record<MKT_CUSTOMER_TIER, number>;

/**
 * Customer tier statistics response
 */
export type CustomerTierStatistics = {
  tierDistribution: TierDistribution;
  totalCustomers: number;
  averageOrderValue: number;
  averageOrderCount: number;
};

/**
 * Customer upgrade eligibility check result
 */
export type CustomerUpgradeEligibility = {
  currentTier: MKT_CUSTOMER_TIER;
  canUpgrade: boolean;
  nextTier?: MKT_CUSTOMER_TIER;
  requirements?: string;
};

/**
 * Options for finding customers
 */
export type FindCustomerOptions = {
  take?: number;
  skip?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
};

/**
 * Customer export filter options
 */
export type CustomerExportFilter = {
  status?: string;
  tier?: string;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
};

/**
 * Customer export data result
 */
export type CustomerExportData = {
  data: string;
  fileName: string;
  generatedAt: string;
  totalRecords: number;
  workspaceId?: string;
};

/**
 * Export statistics breakdown
 */
export type CustomerExportStatistics = {
  totalRecords: number;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
  byType: Record<string, number>;
};
