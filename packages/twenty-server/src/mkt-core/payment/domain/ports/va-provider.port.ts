/**
 * Virtual Account Provider Port
 *
 * Defines the contract for VA service abstraction.
 * Allows switching between different VA providers (SePay, BIDV, etc.)
 */

// ============================================
// TYPES
// ============================================

/**
 * Request to create a Virtual Account
 */
export type CreateVARequest = {
  /** Order ID */
  orderId: string;
  /** Order code */
  orderCode: string;
  /** Expected payment amount */
  amount: number;
  /** VA expiry time in minutes */
  expiryMinutes?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Response from creating a Virtual Account
 */
export type CreateVAResponse = {
  /** Virtual Account number */
  vaNumber: string;
  /** Bank code (e.g., 'BIDV', 'VCB') */
  bankCode: string;
  /** Bank name */
  bankName: string;
  /** Account holder name */
  accountName: string;
  /** QR code URL (if supported) */
  qrCodeUrl?: string;
  /** VA expiration time (ISO string) */
  expiresAt: string;
  /** Provider-specific response data */
  providerResponse?: Record<string, unknown>;
};

/**
 * VA status information
 */
export type VAStatus = {
  /** VA number */
  vaNumber: string;
  /** Is VA still active */
  isActive: boolean;
  /** Has VA been paid */
  isPaid: boolean;
  /** Amount paid (if paid) */
  paidAmount?: number;
  /** Payment time (if paid) */
  paidAt?: string;
};

// ============================================
// INTERFACE
// ============================================

/**
 * Virtual Account Provider Port
 *
 * Implements Ports & Adapters pattern for VA service abstraction.
 * Infrastructure layer provides concrete implementations.
 */
export type IVAProvider = {
  /** Provider name (e.g., 'sepay', 'bidv') */
  readonly providerName: string;

  /**
   * Create new virtual account
   * @param request - VA creation request
   * @returns VA details
   */
  createVA(request: CreateVARequest): Promise<CreateVAResponse>;

  /**
   * Get VA status
   * @param vaNumber - VA number to check
   * @returns VA status
   */
  getVAStatus(vaNumber: string): Promise<VAStatus>;

  /**
   * Deactivate VA (after payment or expiry)
   * @param vaNumber - VA number to deactivate
   */
  deactivateVA(vaNumber: string): Promise<void>;

  /**
   * Check if provider is available
   * @returns true if provider API is reachable
   */
  isAvailable(): Promise<boolean>;
};

/**
 * VA Provider token for dependency injection
 */
export const VA_PROVIDER_TOKEN = Symbol('IVAProvider');
