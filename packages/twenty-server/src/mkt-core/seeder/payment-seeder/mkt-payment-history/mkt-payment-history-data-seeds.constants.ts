import {
  PAYMENT_ACTION,
  PaymentAction,
} from 'src/mkt-core/payment/constants/payment-action.constants';
import { PAYMENT_TRANSACTION_STATUS } from 'src/mkt-core/payment/constants/payment-status.constants';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/types/payment.type';
import { MKT_PAYMENT_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/payment-seeder/mkt-payment/mkt-payment-data-seeds.constants';

type MktPaymentHistoryDataSeed = {
  id: string;
  name: string;
  paymentType: string | null;
  amount: number;
  note: string | null;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
  // Action tracking fields
  action: PaymentAction | null;
  previousStatus: string | null;
  newStatus: string | null;
  historyMetadata: string | null;
  performedAt: string | null;
  performedById: string | null;
  // Relations
  mktOrderId: string | null;
  mktPaymentId: string | null;
  accountOwnerId: string | null;
};

export const MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS: (keyof MktPaymentHistoryDataSeed)[] =
  [
    'id',
    'name',
    'paymentType',
    'amount',
    'note',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
    // Action tracking fields
    'action',
    'previousStatus',
    'newStatus',
    'historyMetadata',
    'performedAt',
    'performedById',
    // Relations
    'mktOrderId',
    'mktPaymentId',
    'accountOwnerId',
  ];

export const MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS = {
  ID_1: '7e78c48b-b437-469d-a726-5f2b6679fef1',
  ID_2: '26cd1db7-0a36-4951-b1f5-2d41ed0b5b68',
  ID_3: 'a8d9e0f1-2345-4678-90ab-cdef12345678',
  ID_4: 'b9e0f1a2-3456-4789-01bc-def123456789',
  ID_5: 'c0f1a2b3-4567-4890-12cd-ef1234567890',
  ID_6: 'd1a2b3c4-5678-4901-23de-f12345678901',
  ID_7: 'e2b3c4d5-6789-4012-34ef-123456789012',
  ID_8: 'f3c4d5e6-7890-4123-45f0-234567890123',
};

// Default values for payment history seed
const DEFAULT_PAYMENT_HISTORY_SEED = {
  paymentType: null,
  amount: 0,
  note: null,
  position: 0,
  createdBySource: 'API',
  createdByWorkspaceMemberId: null,
  createdByName: 'Dev Seeder',
  action: null,
  previousStatus: null,
  newStatus: null,
  historyMetadata: null,
  performedAt: null,
  performedById: null,
  mktOrderId: null,
  mktPaymentId: null,
  accountOwnerId: null,
};

export const MKT_PAYMENT_HISTORY_DATA_SEEDS: MktPaymentHistoryDataSeed[] = [
  // History 1: Payment created
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_1,
    name: 'Payment Created - PAY-2024-001',
    paymentType: PAYMENT_HISTORY_TYPE.PAYMENT,
    amount: 500000,
    note: 'Tạo thanh toán mới qua SEPay',
    position: 1,
    action: PAYMENT_ACTION.CREATED,
    previousStatus: null,
    newStatus: PAYMENT_TRANSACTION_STATUS.PENDING,
    performedAt: '2024-01-15T10:30:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_1,
    historyMetadata: JSON.stringify({
      providerType: 'SEPAY',
      orderRef: 'ORD-001',
    }),
  },

  // History 2: Payment confirmed
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_2,
    name: 'Payment Confirmed - PAY-2024-001',
    paymentType: PAYMENT_HISTORY_TYPE.PAYMENT,
    amount: 500000,
    note: 'Thanh toán đã được xác nhận thành công',
    position: 2,
    action: PAYMENT_ACTION.CONFIRMED,
    previousStatus: PAYMENT_TRANSACTION_STATUS.PENDING,
    newStatus: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    performedAt: '2024-01-15T10:35:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_1,
    historyMetadata: JSON.stringify({
      transactionId: 'SP-TXN-20240115-001',
      confirmedVia: 'WEBHOOK',
    }),
  },

  // History 3: Payment created then confirmed (MoMo)
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_3,
    name: 'Payment Created - PAY-2024-003',
    paymentType: PAYMENT_HISTORY_TYPE.PAYMENT,
    amount: 350000,
    note: 'Tạo thanh toán MoMo',
    position: 1,
    action: PAYMENT_ACTION.CREATED,
    previousStatus: null,
    newStatus: PAYMENT_TRANSACTION_STATUS.PENDING,
    performedAt: '2024-01-10T14:15:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_3,
  },

  // History 4: Payment refunded
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_4,
    name: 'Payment Refunded - PAY-2024-003',
    paymentType: PAYMENT_HISTORY_TYPE.REFUND,
    amount: 350000,
    note: 'Hoàn tiền theo yêu cầu khách hàng',
    position: 2,
    action: PAYMENT_ACTION.REFUNDED,
    previousStatus: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    newStatus: PAYMENT_TRANSACTION_STATUS.REFUNDED,
    performedAt: '2024-01-12T09:00:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_3,
    historyMetadata: JSON.stringify({
      refundReason: 'Customer requested cancellation',
      refundAmount: 350000,
    }),
  },

  // History 5: Payment rejected
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_5,
    name: 'Payment Rejected - PAY-2024-004',
    paymentType: PAYMENT_HISTORY_TYPE.PAYMENT,
    amount: 2500000,
    note: 'Thanh toán bị từ chối - Số tiền không khớp',
    position: 1,
    action: PAYMENT_ACTION.REJECTED,
    previousStatus: PAYMENT_TRANSACTION_STATUS.PENDING,
    newStatus: PAYMENT_TRANSACTION_STATUS.REJECTED,
    performedAt: '2024-01-18T09:45:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_4,
    historyMetadata: JSON.stringify({
      rejectionReason: 'Số tiền không khớp với đơn hàng',
      expectedAmount: 2500000,
      receivedAmount: 2000000,
    }),
  },

  // History 6: Partial refund
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_6,
    name: 'Partial Refund - PAY-2024-005',
    paymentType: PAYMENT_HISTORY_TYPE.REFUND,
    amount: 200000,
    note: 'Hoàn tiền một phần do sản phẩm hết hàng',
    position: 2,
    action: PAYMENT_ACTION.PARTIALLY_REFUNDED,
    previousStatus: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    newStatus: PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED,
    performedAt: '2024-01-15T10:00:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_5,
    historyMetadata: JSON.stringify({
      originalAmount: 800000,
      refundedAmount: 200000,
      remainingAmount: 600000,
      reason: 'Product out of stock',
    }),
  },

  // History 7: Payment cancelled
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_7,
    name: 'Payment Cancelled - PAY-2024-009',
    paymentType: PAYMENT_HISTORY_TYPE.PAYMENT,
    amount: 680000,
    note: 'Khách hàng hủy thanh toán',
    position: 1,
    action: PAYMENT_ACTION.CANCELLED,
    previousStatus: PAYMENT_TRANSACTION_STATUS.PENDING,
    newStatus: PAYMENT_TRANSACTION_STATUS.CANCELLED,
    performedAt: '2024-01-20T14:30:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_9,
    historyMetadata: JSON.stringify({
      cancelReason: 'Customer changed mind',
      cancelledBy: 'CUSTOMER',
    }),
  },

  // History 8: License renewal payment
  {
    ...DEFAULT_PAYMENT_HISTORY_SEED,
    id: MKT_PAYMENT_HISTORY_DATA_SEEDS_IDS.ID_8,
    name: 'License Renewal Payment',
    paymentType: PAYMENT_HISTORY_TYPE.RENEW,
    amount: 450000,
    note: 'Thanh toán gia hạn license 1 năm',
    position: 1,
    action: PAYMENT_ACTION.CONFIRMED,
    previousStatus: PAYMENT_TRANSACTION_STATUS.PENDING,
    newStatus: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    performedAt: '2024-01-22T11:00:00.000Z',
    mktPaymentId: MKT_PAYMENT_DATA_SEEDS_IDS.ID_7,
    historyMetadata: JSON.stringify({
      licenseType: 'ANNUAL',
      renewalPeriod: '12 months',
      providerType: 'CASH',
    }),
  },
];
