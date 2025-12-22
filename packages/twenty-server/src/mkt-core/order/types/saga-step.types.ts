import {
  OrderPromotionResult,
  ProductWithSnapshot,
} from 'src/mkt-core/order/types/order-integration.types';
import { PromotionSnapshot } from 'src/mkt-core/mkt-promotion/types';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import {
  MktPackageSnapshot,
  MktProductSnapshot,
} from 'src/mkt-core/mkt-product-integration';
import { ORDER_STATUS } from 'src/mkt-core/order/constants';

export type CalculatePromotionStepOutput = {
  promotionResult: OrderPromotionResult;
  appliedPromotions: PromotionSnapshot[];
  totalDiscount: number;
  finalAmount: number;
};

export type CreateLicensesStepOutput = {
  licenses: Array<{
    id: string;
    licenseKey: string;
    orderItemId: string;
  }>;
};

export type CreateOrderStepOutput = {
  order: MktOrderWorkspaceEntity;
  orderCode: string;
};

export type CreateOrderItemsStepOutput = {
  orderItems: MktOrderItemWorkspaceEntity[];
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    totalAmount: number;
  };
};

export type CreatePaymentStepOutput = {
  payments: MktPaymentWorkspaceEntity[];
  qrCodeUrl?: string;
};

export type CreateSnapshotsStepOutput = {
  snapshots: ProductWithSnapshot[];
  snapshotsMap: Map<
    string,
    {
      productSnapshot: MktProductSnapshot;
      packageSnapshot: MktPackageSnapshot | null;
    }
  >;
};

export type FinalizeOrderStepOutput = {
  orderStatus: ORDER_STATUS;
  contractId?: string;
};

export type RecordPromotionUsageStepOutput = {
  recordedCount: number;
  errors: string[];
};
