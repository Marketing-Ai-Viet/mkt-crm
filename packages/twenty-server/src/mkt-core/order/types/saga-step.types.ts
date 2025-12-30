import {
  OrderPromotionResult,
  ProductWithSnapshot,
} from 'src/mkt-core/order/types/order-integration.types';
import { PromotionSnapshot } from 'src/mkt-core/mkt-promotion/types';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import {
  MktPackageSnapshot,
  MktProductSnapshot,
} from 'src/mkt-core/mkt-product-integration';
import { ORDER_STATUS } from 'src/mkt-core/order/constants';
import { OrderPaymentMethodInput } from 'src/mkt-core/order/types/order-mutation.types';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { PaymentCurrency } from 'src/mkt-core/payment/types';
import { SagaContext } from 'src/mkt-core/order/types/order-saga.interface';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types/mkt-product-proxy.types';

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

export type PaymentCreationParams = {
  paymentMethodInput: OrderPaymentMethodInput;
  paymentMethod: MktPaymentMethodWorkspaceEntity;
  totalAmount: number;
  context: SagaContext;
  currency: PaymentCurrency;
};

export const DEFAULT_MAX_DEVICES = 1; // Fallback if orderItem.maxDevices is null
export const DEFAULT_SPLIT_LICENSES = false;

export type CreatedLicenseInfo = {
  id: string;
  licenseKey: string;
  orderItemId: string;
};

export type LicenseConfig = {
  licenseCount: number;
  devicesPerLicense: number;
};

export type ItemLicenseResult = {
  licenseIds: string[];
  licenseKeys: string[];
  snapshots: MktLicenseSnapshot[];
  createdLicenses: CreatedLicenseInfo[];
};
