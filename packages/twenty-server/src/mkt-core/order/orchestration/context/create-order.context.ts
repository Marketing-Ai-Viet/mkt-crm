import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { SagaContext } from 'src/mkt-core/order/types';
import {
  MktPackageSnapshot,
  MktProductSnapshot,
} from 'src/mkt-core/mkt-product-integration';
import { PromotionSnapshot } from 'src/mkt-core/mkt-promotion/types';

/**
 * Typed context for CreateOrderSaga
 *
 * Extends SagaContext with strongly typed fields
 * to replace Map<string, unknown> usage in steps
 *
 * Step data flow:
 * 1. CreateOrderStep → order, orderCode
 * 2. CreateSnapshotsStep → snapshots, snapshotsMap
 * 3. CreateOrderItemsStep → orderItems, totals
 * 4. CalculatePromotionStep → promotionResult, appliedPromotions
 * 5. EnqueueLicenseJobsStep → enqueuedJobIds, enqueuedCorrelationIds
 * 6. CreatePaymentStep → payments, paymentQrCode
 * 7. FinalizeOrderStep → finalStatus
 */
export type CreateOrderSagaContext = SagaContext & {
  // === Step 1: CreateOrderStep outputs ===
  /** Created order entity */
  order?: MktOrderWorkspaceEntity;

  // === Step 2: CreateSnapshotsStep outputs ===
  /** Product/package snapshots for order items */
  snapshots?: Array<{
    productId: string;
    packageId?: string;
    productSnapshot: MktProductSnapshot;
    packageSnapshot: MktPackageSnapshot | null;
  }>;
  /** Map for quick lookup: `${productId}:${packageId}` → snapshot */
  snapshotsMap?: Map<
    string,
    {
      productSnapshot: MktProductSnapshot;
      packageSnapshot: MktPackageSnapshot | null;
    }
  >;

  // === Step 3: CreateOrderItemsStep outputs ===
  /** Created order items */
  orderItems?: MktOrderItemWorkspaceEntity[];
  /** Calculated totals */
  totals?: {
    subtotal: number;
    tax: number;
    discount: number;
    comboDiscount: number;
    totalAmount: number;
  };
  /** Applied combo info */
  appliedCombos?: Array<{
    comboId: string;
    comboName: string;
    discount: number;
  }>;

  // === Step 4: CalculatePromotionStep outputs ===
  /** Promotion calculation result */
  promotionResult?: {
    totalDiscount: number;
    appliedPromotions: PromotionSnapshot[];
    couponUsed?: string;
  };
  /** Final amount after all discounts */
  finalAmount?: number;

  // === Step 5: EnqueueLicenseJobsStep outputs ===
  /** Created license info (legacy, kept for backward compat) */
  licenses?: Array<{
    id: string;
    licenseKey: string;
    orderItemId: string;
  }>;
  /** Job IDs enqueued for license creation (async flow) */
  enqueuedJobIds?: string[];
  /** Correlation IDs for tracing enqueued jobs */
  enqueuedCorrelationIds?: string[];

  // === Step 6: CreatePaymentStep outputs ===
  /** Created payment IDs */
  paymentIds?: string[];
  // NOTE: paymentQrCode is inherited from SagaContext base type

  // === Step 7: FinalizeOrderStep outputs ===
  /** Final order status */
  finalStatus?: ORDER_STATUS;
  /** Whether this is a trial order */
  trialLicense?: boolean;

  // === Rollback data (typed) ===
  rollbackOrder?: {
    id: string;
    status: ORDER_STATUS;
  };
  rollbackOrderItems?: string[];
  rollbackLicenses?: string[];
  rollbackPayments?: string[];
  rollbackPromotionUsage?: string[];
};

/**
 * Factory function to create typed CreateOrderSagaContext
 *
 * NOTE: Map vẫn giữ để backward compatibility với SagaContext interface.
 * P2 sẽ loại bỏ hoàn toàn Map và chuyển sang typed fields.
 * Theo repo convention "no any", phải specify type cho Map thay vì dùng `new Map()`
 */
export const createCreateOrderContext = (
  workspaceId: string,
  workspaceMemberId?: string,
): CreateOrderSagaContext => ({
  workspaceId,
  workspaceMemberId,
  // Explicitly typed Maps (avoid `new Map()` which creates Map<any, any>)
  rollbackData: new Map<string, unknown>(),
  metadata: new Map<string, unknown>(),
});
