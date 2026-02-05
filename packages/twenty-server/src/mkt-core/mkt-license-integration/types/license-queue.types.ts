import { LicenseJobAction } from './license-job.types';

// ============================================
// ENQUEUE PARAMETER TYPES
// ============================================

export type EnqueueCreationParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  action: Extract<LicenseJobAction, 'CREATE_TRIAL' | 'CREATE_OFFICIAL'>;
  customerId: string;
  customerEmail: string;
  productId: string;
  productPackageId?: string;
  trialDays?: number;
  maxDevices: number;
  deviceIndex: number;
};

export type EnqueueUpgradeParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
  productPackageId: string;
  maxDevices: number;
  reason?: string;
};

export type EnqueueActivationParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
};

export type EnqueueRevocationParams = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  licenseId: string;
};

// ============================================
// ENQUEUE RESULT TYPES
// ============================================

export type EnqueueResult = {
  jobId: string;
  correlationId: string;
};

export type BulkEnqueueResult = {
  jobIds: string[];
  correlationIds: string[];
  count: number;
};
