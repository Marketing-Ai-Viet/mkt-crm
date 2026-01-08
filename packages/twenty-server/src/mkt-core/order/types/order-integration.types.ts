import { MktLicenseResponse } from 'src/mkt-core/mkt-license-integration/types';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types/mkt-product-proxy.types';
import {
  OrderItemForPromotion,
  PromotionSnapshot,
} from 'src/mkt-core/mkt-promotion/types';
import {
  MktPackageSnapshot,
  MktProduct,
  MktProductPackage,
  MktProductSnapshot,
} from 'src/mkt-core/mkt-product-integration';

/**
 * License status response from MKT Server
 */
export type LicenseStatus = {
  id: string;
  licenseKey: string;
  status: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  maxDevices: number;
  productId: string;
  orderItemId?: string;
};

/**
 * Order license summary
 */
export type OrderLicenseSummary = {
  orderId: string;
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  revokedLicenses: number;
  licenses: LicenseStatus[];
};

/**
 * License creation input for order
 */
export type OrderLicenseInput = {
  productId: string;
  packageId: string;
  /** Email address for the license owner (from customer's linkedAccounts or email field) */
  email: string;
  maxDevices?: number;
};

/**
 * License creation result
 */
export type LicenseCreationResult = {
  success: boolean;
  license?: MktLicenseResponse;
  snapshot?: MktLicenseSnapshot;
  error?: string;
};

/**
 * Bulk license creation result
 */
export type BulkLicenseResult = {
  success: boolean;
  licenses: Array<{
    license: MktLicenseResponse;
    snapshot: MktLicenseSnapshot;
  }>;
  errors: Array<{
    input: OrderLicenseInput;
    error: string;
  }>;
};

/**
 * Result of product validation for order
 */
export type ProductValidationResult = {
  valid: boolean;
  errors: Array<{
    productId: string;
    packageId?: string;
    reason: string;
  }>;
};

/**
 * Product with snapshot for order
 */
export type ProductWithSnapshot = {
  product: MktProduct;
  package: MktProductPackage | null;
  productSnapshot: MktProductSnapshot;
  packageSnapshot: MktPackageSnapshot | null;
  /** Maximum devices allowed for license (default: 1) */
  maxDevices: number;
};

/**
 * Order discount context - input for promotion calculation
 */
export type OrderDiscountContext = {
  workspaceId: string;
  customerId: string;
  orderItems: OrderItemForPromotion[];
  orderSubtotal: number;
  couponCode?: string;
  customerTags?: string[];
  isFirstOrder?: boolean;
};

/**
 * Promotion calculation result for order
 */
export type OrderPromotionResult = {
  success: boolean;
  totalDiscount: number;
  finalOrderAmount: number;
  promotions: PromotionSnapshot[];
  errors?: string[];
};

/**
 * Promotion usage record input
 */
export type PromotionUsageInput = {
  promotionId: string;
  orderId: string;
  customerId: string;
  discountAmount: number;
  originalAmount: number;
  couponId?: string;
};
