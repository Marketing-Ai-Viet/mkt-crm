/**
 * Create Virtual Account Use Case Output
 *
 * Output data from creating a virtual account.
 */

/**
 * VA creation status
 */
export const VA_CREATION_STATUS = {
  CREATED: 'CREATED',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  DISABLED: 'DISABLED',
} as const;

export type VACreationStatus =
  (typeof VA_CREATION_STATUS)[keyof typeof VA_CREATION_STATUS];

/**
 * VA details
 */
export type VADetails = {
  /** VA ID in database */
  id: string;
  /** Virtual account number */
  vaNumber: string;
  /** Bank code */
  bankCode: string;
  /** Bank name */
  bankName: string;
  /** Account holder name */
  accountName: string;
  /** Expected amount */
  amount: number;
  /** QR code URL */
  qrCodeUrl?: string;
  /** VA expiration time */
  expiresAt: string;
  /** Provider name */
  provider: string;
};

/**
 * Create VA Use Case Output
 */
export type CreateVAOutput = {
  /** Whether operation was successful */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Creation status */
  status: VACreationStatus;
  /** VA details (if created or exists) */
  vaDetails?: VADetails;
  /** Error message (if failed) */
  error?: string;
};

/**
 * Factory functions for common outputs
 */
export const createVACreatedOutput = (
  vaDetails: VADetails,
): CreateVAOutput => ({
  success: true,
  message: 'Virtual account created successfully',
  status: VA_CREATION_STATUS.CREATED,
  vaDetails,
});

export const createVAExistsOutput = (vaDetails: VADetails): CreateVAOutput => ({
  success: true,
  message: 'Virtual account already exists',
  status: VA_CREATION_STATUS.ALREADY_EXISTS,
  vaDetails,
});

export const createOrderNotFoundOutput = (orderId: string): CreateVAOutput => ({
  success: false,
  message: `Order not found: ${orderId}`,
  status: VA_CREATION_STATUS.ORDER_NOT_FOUND,
  error: `Order with ID ${orderId} does not exist`,
});

export const createProviderErrorOutput = (error: string): CreateVAOutput => ({
  success: false,
  message: 'Failed to create virtual account',
  status: VA_CREATION_STATUS.PROVIDER_ERROR,
  error,
});

export const createProviderUnavailableOutput = (): CreateVAOutput => ({
  success: false,
  message: 'VA provider is not available',
  status: VA_CREATION_STATUS.PROVIDER_UNAVAILABLE,
  error: 'The VA provider service is currently unavailable',
});

export const createVADisabledOutput = (): CreateVAOutput => ({
  success: false,
  message: 'Virtual account feature is disabled',
  status: VA_CREATION_STATUS.DISABLED,
  error: 'VA feature is disabled in configuration',
});
