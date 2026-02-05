/**
 * License Job Types
 *
 * Type definitions cho license queue jobs với support cho:
 * - Idempotency via deterministic jobId
 * - Partial failure handling (per-license jobs)
 * - BullMQ native integration
 */

// ============================================
// JOB NAMES
// ============================================

export const LICENSE_JOB_NAMES = {
  CREATION: 'mkt-license-creation',
  ACTIVATION: 'mkt-license-activation',
  REVOCATION: 'mkt-license-revocation',
  UPGRADE: 'mkt-license-upgrade',
} as const;

export type LicenseJobName =
  (typeof LICENSE_JOB_NAMES)[keyof typeof LICENSE_JOB_NAMES];

// ============================================
// JOB ACTIONS
// ============================================

export const LICENSE_JOB_ACTIONS = {
  /** Tạo trial license (TRIAL_TO_PAID flow) */
  CREATE_TRIAL: 'CREATE_TRIAL',
  /** Tạo official license (NEW_ORDER flow) */
  CREATE_OFFICIAL: 'CREATE_OFFICIAL',
  /** Upgrade trial → official (payment confirmed) */
  UPGRADE_TRIAL: 'UPGRADE_TRIAL',
  /** Activate license (order completed) */
  ACTIVATE: 'ACTIVATE',
  /** Revoke license (order refunded) */
  REVOKE: 'REVOKE',
} as const;

export type LicenseJobAction =
  (typeof LICENSE_JOB_ACTIONS)[keyof typeof LICENSE_JOB_ACTIONS];

// ============================================
// IDEMPOTENCY - JOB ID BUILDER
// ============================================

/**
 * Build deterministic jobId for BullMQ deduplication.
 *
 * Format: {orderItemId}:{deviceIndex}:{action}
 *
 * BullMQ will auto-reject duplicate jobs with same jobId.
 *
 * @example
 * buildLicenseJobId('item-123', 0, 'CREATE_TRIAL')
 * // Returns: 'item-123:0:CREATE_TRIAL'
 */
export const buildLicenseJobId = (
  orderItemId: string,
  deviceIndex: number,
  action: LicenseJobAction,
): string => `${orderItemId}:${deviceIndex}:${action}`;

/**
 * Build jobId for activation/revocation (per-license).
 *
 * Format: {orderItemId}:{licenseId}:{action}
 */
export const buildLicenseLifecycleJobId = (
  orderItemId: string,
  licenseId: string,
  action: Extract<LicenseJobAction, 'ACTIVATE' | 'REVOKE'>,
): string => `${orderItemId}:${licenseId}:${action}`;

/**
 * Build jobId for upgrade.
 *
 * Format: {orderItemId}:upgrade:{licenseId}
 */
export const buildLicenseUpgradeJobId = (
  orderItemId: string,
  licenseId: string,
): string => `${orderItemId}:upgrade:${licenseId}`;

// ============================================
// JOB METADATA
// ============================================

/**
 * Common metadata for all license jobs.
 * Note: BullMQ tracks attemptsMade internally, no need for retryCount.
 */
export type LicenseJobMetadata = {
  /** Timestamp khi job được enqueue (ISO string) */
  enqueuedAt: string;
  /** Correlation ID for tracing across services */
  correlationId: string;
};

// ============================================
// JOB DATA TYPES
// ============================================

/**
 * Job data for license creation (CREATE_TRIAL | CREATE_OFFICIAL).
 *
 * Each job creates ONE license for ONE device index.
 * For multi-device items, multiple jobs are enqueued.
 */
export type LicenseCreationJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  action: Extract<LicenseJobAction, 'CREATE_TRIAL' | 'CREATE_OFFICIAL'>;
  payload: {
    customerId: string;
    /**
     * Email hash (SHA-256, truncated) for logging.
     * Actual email is decrypted in proxy service.
     */
    customerEmailHash: string;
    /**
     * Original email (encrypted or stored securely).
     * Used by proxy service to call MKT Server API.
     */
    customerEmail: string;
    productId: string;
    productPackageId?: string;
    trialDays?: number;
    maxDevices: number;
    /** Device index (0-based) for multi-device licenses */
    deviceIndex: number;
  };
  metadata: LicenseJobMetadata;
};

/**
 * Job data for license upgrade (UPGRADE_TRIAL).
 *
 * Upgrades a trial license to official when payment is confirmed.
 */
export type LicenseUpgradeJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  action: Extract<LicenseJobAction, 'UPGRADE_TRIAL'>;
  payload: {
    licenseId: string;
    productPackageId: string;
    maxDevices: number;
    reason?: string;
  };
  metadata: LicenseJobMetadata;
};

/**
 * Job data for license activation.
 *
 * Each job activates ONE license.
 * This enables individual retry on partial failure.
 */
export type LicenseActivationJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
  action: Extract<LicenseJobAction, 'ACTIVATE'>;
  metadata: LicenseJobMetadata;
};

/**
 * Job data for license revocation.
 *
 * Each job revokes ONE license (best effort).
 */
export type LicenseRevocationJobData = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
  action: Extract<LicenseJobAction, 'REVOKE'>;
  metadata: LicenseJobMetadata;
};

/**
 * Union type for all license job data.
 */
export type LicenseJobData =
  | LicenseCreationJobData
  | LicenseUpgradeJobData
  | LicenseActivationJobData
  | LicenseRevocationJobData;

// ============================================
// TYPE GUARDS
// ============================================

export const isLicenseCreationJob = (
  data: LicenseJobData,
): data is LicenseCreationJobData =>
  data.action === LICENSE_JOB_ACTIONS.CREATE_TRIAL ||
  data.action === LICENSE_JOB_ACTIONS.CREATE_OFFICIAL;

export const isLicenseUpgradeJob = (
  data: LicenseJobData,
): data is LicenseUpgradeJobData =>
  data.action === LICENSE_JOB_ACTIONS.UPGRADE_TRIAL;

export const isLicenseActivationJob = (
  data: LicenseJobData,
): data is LicenseActivationJobData =>
  data.action === LICENSE_JOB_ACTIONS.ACTIVATE;

export const isLicenseRevocationJob = (
  data: LicenseJobData,
): data is LicenseRevocationJobData =>
  data.action === LICENSE_JOB_ACTIONS.REVOKE;

// ============================================
// JOB RESULT TYPES
// ============================================

export type LicenseCreationResult = {
  success: boolean;
  licenseId?: string;
  licenseKey?: string;
  error?: string;
};

export type LicenseUpgradeResult = {
  success: boolean;
  licenseId: string;
  newType?: string;
  error?: string;
};

export type LicenseActivationResult = {
  success: boolean;
  licenseId: string;
  error?: string;
};

export type LicenseRevocationResult = {
  success: boolean;
  licenseId: string;
  error?: string;
};
