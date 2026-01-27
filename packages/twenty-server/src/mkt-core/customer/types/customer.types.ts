import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { LinkedAccountMetadata } from 'src/mkt-core/customer/types/linked-account.types';

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
 * Assignment strategy
 */
export type AssignmentStrategy = 'round_robin' | 'least_customers' | 'random';

// ============================================
// LINKED ACCOUNT TYPES
// ============================================

/**
 * Link external account input (generic for all providers)
 */
export type LinkAccountInput = {
  customerId: string;
  provider: string;
  externalId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isPrimary?: boolean;
  notes?: string;
  metadata?: LinkedAccountMetadata;
};

export type AssignmentResult = {
  customerId: string;
  assignedToId: string | null;
  assignedToName: string | null;
  success: boolean;
  reason?: string;
};

export type CustomerTierResult = {
  customerTier: MKT_CUSTOMER_TIER;
  totalOrderValue: number;
  totalOrderCount: number;
  customerId: string;
  customerName: string;
};

/**
 * Bulk tier calculation result
 * Map of customerId -> CustomerTierResult
 */
export type BulkCustomerTierResult = Map<string, CustomerTierResult>;

/**
 * Raw aggregation result from database query
 */
export type CustomerOrderAggregation = {
  customerId: string;
  customerName: string;
  totalOrderCount: string; // comes as string from raw query
  totalOrderValue: string; // comes as string from raw query
};

export type CustomerQueryOptions = {
  take?: number;
  skip?: number;
  filter?: Record<string, unknown>;
  hasFullAccess?: boolean;
};

// ============================================
// RESULT TYPES
// ============================================

export type ServiceCustomerResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CreateCustomerResult = {
  customerId: string;
  customerCode: string;
  status: string;
};

export type UpdateCustomerResult = {
  customerId: string;
  updatedFields: string[];
};

// ============================================
// CONSTANTS
// ============================================
