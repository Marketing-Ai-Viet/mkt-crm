import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';

// ============================================
// EVENT TYPES
// ============================================

export type OrderLicenseStatusChangedEvent = {
  workspaceId: string;
  orderId: string;
  newStatus: ORDER_STATUS;
  previousStatus?: ORDER_STATUS;
};

export type LicenseJobFailedEvent = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  failedAt: string;
};

// ============================================
// ANALYSIS TYPES
// ============================================

export type LicenseStatusAnalysis = {
  total: number;
  pending: number;
  processing: number;
  created: number;
  upgraded: number;
  activated: number;
  revoked: number;
  failed: number;

  // Derived flags
  allCreated: boolean;
  allActivated: boolean;
  anyFailed: boolean;
  anyPending: boolean;
};
