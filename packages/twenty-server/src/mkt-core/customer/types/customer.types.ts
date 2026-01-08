import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { LinkedAccountMetadata } from 'src/mkt-core/customer/types/linked-account.types';

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

// ============================================
// CATEGORIZATION TYPES
// ============================================

/**
 * Result of customer categorization
 */
export type CustomerCategorizationResult = {
  customerId: string;
  oldTier: string;
  newTier: string;
  oldStage: string;
  newStage: string;
  tierChanged: boolean;
  stageChanged: boolean;
  churnRiskScore: number;
  engagementScore: number;
};

/**
 * Categorization job result
 */
export type CategorizationJobResult = {
  totalProcessed: number;
  totalUpdated: number;
  errors: number;
};

// ============================================
// ASSIGNMENT TYPES
// ============================================

/**
 * Auto-assign result
 */
export type CustomerAutoAssignResult = {
  customerId: string;
  assignedToId: string;
  assignedToName: string;
  reason: string;
  assignedAt: Date;
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

/**
 * Account link result
 */
export type AccountLinkResult = {
  success: boolean;
  accountId?: string;
  provider: string;
  isPrimary: boolean;
  error?: string;
};

// ============================================
// EVENT TYPES
// ============================================

/**
 * Customer created event payload
 */
export type CustomerCreatedEventPayload = {
  workspaceId: string;
  customerId: string;
  email?: string;
  name: string;
  type: string;
  createdAt: Date;
};

/**
 * Customer upgraded event payload
 */
export type CustomerUpgradedEventPayload = {
  workspaceId: string;
  customerId: string;
  oldTier: string;
  newTier: string;
  totalOrderValue: number;
  upgradedAt: Date;
};

/**
 * Customer assigned event payload
 */
export type CustomerAssignedEventPayload = {
  workspaceId: string;
  customerId: string;
  assignedToId: string;
  reason: string;
  assignedAt: Date;
};

// ============================================
// REPOSITORY TYPES
// ============================================

/**
 * Paginated result for customer queries
 */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};

/**
 * Create customer data for repository
 * Note: External account links are stored in linkedAccounts JSONB array
 */
export type CreateCustomerData = {
  name: string;
  email?: string;
  phone?: string;
  mktCustomerCode?: string;
  status?: string;
  tier?: string;
  lifecycleStage?: string;
  type?: string;
  taxCode?: string;
  address?: string;
  industry?: string;
  website?: string;
  description?: string;
  accountOwnerId?: string;
};

/**
 * Update customer data for repository
 * Note: External account links are stored in linkedAccounts JSONB array
 */
export type UpdateCustomerData = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  tier?: string;
  lifecycleStage?: string;
  type?: string;
  taxCode?: string;
  address?: string;
  industry?: string;
  website?: string;
  description?: string;
  accountOwnerId?: string;
  totalOrderCount?: number;
  totalOrderValue?: number;
  lastOrderDate?: string;
};

export type CustomerUpdateFields = Pick<
  MktCustomerWorkspaceEntity,
  'name' | 'email' | 'phone' | 'companyName'
>;

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
