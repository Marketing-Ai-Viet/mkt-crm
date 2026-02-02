/**
 * Virtual Account Repository Port
 *
 * Defines the contract for VA data access.
 */

// ============================================
// TYPES
// ============================================

/**
 * VA data for matching
 */
export type VAForMatching = {
  id: string;
  vaNumber: string;
  orderId: string;
  orderCode: string;
  amount: number;
  isActive: boolean;
  expiresAt: string;
};

/**
 * Create VA data
 */
export type CreateVAData = {
  vaNumber: string;
  orderId: string;
  orderCode: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  amount: number;
  qrCodeUrl?: string;
  expiresAt: string;
  provider: string;
  providerResponse?: object;
};

// ============================================
// INTERFACE
// ============================================

/**
 * Virtual Account Repository Port
 */
export type IVARepositoryPort = {
  /**
   * Find VA by VA number
   * @param vaNumber - VA number
   * @returns VA or null
   */
  findByVANumber(vaNumber: string): Promise<VAForMatching | null>;

  /**
   * Find VA by order ID
   * @param orderId - Order ID
   * @returns VA or null
   */
  findByOrderId(orderId: string): Promise<VAForMatching | null>;

  /**
   * Find active VA by order ID
   * @param orderId - Order ID
   * @returns Active VA or null
   */
  findActiveByOrderId(orderId: string): Promise<VAForMatching | null>;

  /**
   * Save new VA
   * @param data - VA data
   * @returns Created VA
   */
  save(data: CreateVAData): Promise<VAForMatching>;

  /**
   * Deactivate VA
   * @param id - VA ID
   */
  deactivate(id: string): Promise<void>;
};

/**
 * Repository token for dependency injection
 */
export const VA_REPOSITORY_PORT_TOKEN = Symbol('IVARepositoryPort');
