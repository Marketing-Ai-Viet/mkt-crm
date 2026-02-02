/**
 * Create Virtual Account Use Case Input
 *
 * Input data for creating a virtual account.
 */

/**
 * Create VA Use Case Input
 */
export type CreateVAInput = {
  /** Order ID to create VA for */
  orderId: string;
  /** Workspace ID */
  workspaceId: string;
  /** VA expiry time in hours (optional, uses config default) */
  expiryHours?: number;
  /** Force create new VA even if one exists */
  forceCreate?: boolean;
};
