/**
 * BIDV Provider Types
 *
 * Types specific to BIDV SePay payment provider.
 */

// Re-export existing types
export {
  BidvSepayOrderRequest,
  BidvSepayOrderData,
  BidvSepayApiResponse,
  BidvSepayConfig,
} from 'src/mkt-core/payment/types/bidv-sepay.types';

/**
 * BIDV provider configuration from environment
 */
export type BidvProviderConfig = {
  /** Whether BIDV provider is enabled */
  enabled: boolean;
  /** BIDV SePay API URL */
  apiUrl: string;
  /** BIDV SePay auth token */
  authToken: string;
  /** BIDV SePay cookie (optional) */
  cookie: string;
  /** Default QR code duration in seconds */
  defaultDuration: number;
  /** Workspace ID for this provider */
  workspaceId: string;
};

/**
 * BIDV provider capabilities metadata
 */
export const BIDV_PROVIDER_METADATA = {
  type: 'BIDV_SEPAY',
  displayName: 'BIDV SePay',
  description: 'BIDV bank transfer via SePay Business gateway',
  icon: 'IconBuildingBank',
  configuredFields: ['apiUrl', 'authToken', 'defaultDuration'],
} as const;

/**
 * Default QR code duration in seconds (5 minutes)
 */
export const BIDV_DEFAULT_DURATION = 300;
