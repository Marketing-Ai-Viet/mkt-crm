/**
 * Order Repository Port
 *
 * Defines the contract for order data access.
 * Used by matching strategies to find orders.
 */

// ============================================
// TYPES
// ============================================

/**
 * Order data for matching
 */
export type OrderForMatching = {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  customerName?: string;
  createdAt: Date;
};

/**
 * Filter for finding candidate orders
 */
export type OrderCandidateFilter = {
  /** Order status filter */
  status?: string | string[];
  /** Orders created within N days */
  createdWithinDays?: number;
  /** Amount range for filtering */
  amountRange?: {
    min: number;
    max: number;
  };
  /** Maximum number of candidates to return */
  limit?: number;
};

// ============================================
// INTERFACE
// ============================================

/**
 * Order Repository Port
 *
 * Read-only interface for order data access.
 * Used by matching strategies.
 */
export type IOrderRepositoryPort = {
  /**
   * Find order by ID
   * @param orderId - Order ID
   * @returns Order or null
   */
  findById(orderId: string): Promise<OrderForMatching | null>;

  /**
   * Find order by order code
   * @param orderCode - Order code
   * @returns Order or null
   */
  findByOrderCode(orderCode: string): Promise<OrderForMatching | null>;

  /**
   * Find candidate orders for fuzzy matching
   * @param filter - Filter criteria
   * @returns List of candidate orders
   */
  findCandidates(filter: OrderCandidateFilter): Promise<OrderForMatching[]>;
};

/**
 * Repository token for dependency injection
 */
export const ORDER_REPOSITORY_PORT_TOKEN = Symbol('IOrderRepositoryPort');
