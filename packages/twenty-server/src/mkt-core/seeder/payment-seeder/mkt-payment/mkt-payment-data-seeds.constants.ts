import {
  PAYMENT_PROVIDER_TYPE,
  PaymentProviderType,
} from 'src/mkt-core/payment/constants/payment-provider.constants';
import {
  PAYMENT_TRANSACTION_STATUS,
  PaymentTransactionStatus,
} from 'src/mkt-core/payment/constants/payment-status.constants';
import { PaymentCurrency } from 'src/mkt-core/payment/types';

type MktPaymentDataSeed = {
  id: string;
  name: string;
  amount: number;
  currency: PaymentCurrency;
  status: PaymentTransactionStatus;
  paymentDate: string | null;
  description: string | null;
  mktOrderId: string | null;
  invoiceId: string | null;
  mktPaymentMethodId: string | null;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
  // Multi-gateway provider fields
  providerType: PaymentProviderType | null;
  providerTransactionId: string | null;
  providerResponse: string | null;
  providerMetadata: string | null;
  // Additional fields
  duration: number | null;
  expiredAt: string | null;
  qrCodeUrl: string | null;
  paymentPageUrl: string | null;
  sepayTransactionId: string | null;
  // Confirmation fields
  confirmedAt: string | null;
  confirmedById: string | null;
  // Rejection fields
  rejectedAt: string | null;
  rejectedById: string | null;
  rejectionReason: string | null;
  // Refund fields
  refundedAmount: number;
  // Metadata
  metadata: string | null;
};

/**
 * @deprecated Use PAYMENT_TRANSACTION_STATUS from payment-status.constants.ts instead
 */
export const MKT_PAYMENT_STATUS = PAYMENT_TRANSACTION_STATUS;

export const MKT_PAYMENT_DATA_SEED_COLUMNS: (keyof MktPaymentDataSeed)[] = [
  'id',
  'name',
  'amount',
  'currency',
  'status',
  'paymentDate',
  'description',
  'mktOrderId',
  'invoiceId',
  'mktPaymentMethodId',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
  // Multi-gateway provider fields
  'providerType',
  'providerTransactionId',
  'providerResponse',
  'providerMetadata',
  // Additional fields
  'duration',
  'expiredAt',
  'qrCodeUrl',
  'paymentPageUrl',
  'sepayTransactionId',
  // Confirmation fields
  'confirmedAt',
  'confirmedById',
  // Rejection fields
  'rejectedAt',
  'rejectedById',
  'rejectionReason',
  // Refund fields
  'refundedAmount',
  // Metadata
  'metadata',
];

export const MKT_PAYMENT_DATA_SEEDS_IDS = {
  ID_1: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  ID_2: 'f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c',
  ID_3: 'c6b5a4f3-e2d1-4c0b-a9b8-7c6d5e4f3a2b',
  ID_4: 'd5e4f3a2-b1c0-4d9e-8f7a-6b5c4d3e2f1a',
  ID_5: 'e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4',
  ID_6: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e',
  ID_7: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6f',
  ID_8: '3c4d5e6f-7a8b-4c9d-a0b1-f2a3b4c5d6e7',
  ID_9: '4d5e6f7a-8b9c-4da0-b1c2-a3b4c5d6e7f8',
  ID_10: '5e6f7a8b-9c0d-4eb1-c2d3-b4c5d6e7f8a9',
  ID_11: '6f7a8b9c-0d1e-4fc2-d3e4-c5d6e7f8a9b0',
  ID_12: '7a8b9c0d-1e2f-4ad3-e4f5-d6e7f8a9b0c1',
  ID_13: '8b9c0d1e-2f3a-4be4-f5a6-e7f8a9b0c1d2',
  ID_14: '9c0d1e2f-3a4b-4cf5-a6b7-f8a9b0c1d2e3',
  ID_15: '0d1e2f3a-4b5c-4df6-b7c8-a9b0c1d2e3f4',
};

// Default values for payment seed
// IMPORTANT: Property order must match MKT_PAYMENT_DATA_SEED_COLUMNS order
// because TypeORM extracts values based on object property order
const DEFAULT_PAYMENT_SEED = {
  id: '', // Placeholder - will be overwritten
  name: '', // Placeholder - will be overwritten
  amount: 0,
  currency: 'VND' as PaymentCurrency,
  status: PAYMENT_TRANSACTION_STATUS.PENDING,
  paymentDate: null,
  description: null,
  mktOrderId: null,
  invoiceId: null,
  mktPaymentMethodId: null,
  position: 0,
  createdBySource: 'API',
  createdByWorkspaceMemberId: null,
  createdByName: 'Dev Seeder',
  providerType: null,
  providerTransactionId: null,
  providerResponse: null,
  providerMetadata: null,
  duration: null,
  expiredAt: null,
  qrCodeUrl: null,
  paymentPageUrl: null,
  sepayTransactionId: null,
  confirmedAt: null,
  confirmedById: null,
  rejectedAt: null,
  rejectedById: null,
  rejectionReason: null,
  refundedAmount: 0,
  metadata: null,
};

export const MKT_PAYMENT_DATA_SEEDS: MktPaymentDataSeed[] = [
  // Payment 1: Confirmed payment via SEPay
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_1,
    name: 'PAY-2024-001',
    amount: 500000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    paymentDate: '2024-01-15T10:30:00.000Z',
    description: 'Thanh toán đơn hàng #ORD-001 qua SEPay',
    position: 1,
    providerType: PAYMENT_PROVIDER_TYPE.SEPAY,
    providerTransactionId: 'SP-TXN-20240115-001',
    confirmedAt: '2024-01-15T10:35:00.000Z',
    metadata: JSON.stringify({
      orderRef: 'ORD-001',
      note: 'Thanh toán thành công',
    }),
  },

  // Payment 2: Pending payment via VNPay
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_2,
    name: 'PAY-2024-002',
    amount: 1200000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.PENDING,
    description: 'Thanh toán đơn hàng #ORD-002 qua VNPay',
    position: 2,
    providerType: PAYMENT_PROVIDER_TYPE.VNPAY,
    duration: 900, // 15 minutes
    expiredAt: '2024-01-20T12:15:00.000Z',
    qrCodeUrl: 'https://vnpay.vn/qr/payment/abc123',
    paymentPageUrl: 'https://vnpay.vn/checkout/abc123',
  },

  // Payment 3: Refunded payment via MoMo
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_3,
    name: 'PAY-2024-003',
    amount: 350000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.REFUNDED,
    paymentDate: '2024-01-10T14:20:00.000Z',
    description: 'Thanh toán đơn hàng #ORD-003 - Đã hoàn tiền',
    position: 3,
    providerType: PAYMENT_PROVIDER_TYPE.MOMO,
    providerTransactionId: 'MOMO-TXN-20240110-003',
    confirmedAt: '2024-01-10T14:25:00.000Z',
    refundedAmount: 350000,
    metadata: JSON.stringify({
      refundReason: 'Customer requested cancellation',
    }),
  },

  // Payment 4: Rejected payment - Bank Transfer
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_4,
    name: 'PAY-2024-004',
    amount: 2500000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.REJECTED,
    description: 'Thanh toán chuyển khoản - Bị từ chối',
    position: 4,
    providerType: PAYMENT_PROVIDER_TYPE.BANK_TRANSFER,
    rejectedAt: '2024-01-18T09:45:00.000Z',
    rejectionReason: 'Số tiền không khớp với đơn hàng',
  },

  // Payment 5: Partially refunded via ZaloPay
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_5,
    name: 'PAY-2024-005',
    amount: 800000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED,
    paymentDate: '2024-01-08T16:00:00.000Z',
    description: 'Thanh toán ZaloPay - Hoàn tiền một phần',
    position: 5,
    providerType: PAYMENT_PROVIDER_TYPE.ZALOPAY,
    providerTransactionId: 'ZLP-TXN-20240108-005',
    confirmedAt: '2024-01-08T16:05:00.000Z',
    refundedAmount: 200000,
    metadata: JSON.stringify({ partialRefundReason: 'Product out of stock' }),
  },

  // Payment 6: Processing payment via SEPay
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_6,
    name: 'PAY-2024-006',
    amount: 150000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.PROCESSING,
    description: 'Thanh toán đang xử lý',
    position: 6,
    providerType: PAYMENT_PROVIDER_TYPE.SEPAY,
    sepayTransactionId: 'SP-LEGACY-006',
    qrCodeUrl: 'https://sepay.vn/qr/def456',
  },

  // Payment 7: Cash payment - Confirmed
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_7,
    name: 'PAY-2024-007',
    amount: 450000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    paymentDate: '2024-01-22T11:00:00.000Z',
    description: 'Thanh toán tiền mặt tại văn phòng',
    position: 7,
    providerType: PAYMENT_PROVIDER_TYPE.CASH,
    confirmedAt: '2024-01-22T11:00:00.000Z',
  },

  // Payment 8: Failed payment via VNPay
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_8,
    name: 'PAY-2024-008',
    amount: 3000000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.FAILED,
    description: 'Thanh toán thất bại - Lỗi gateway',
    position: 8,
    providerType: PAYMENT_PROVIDER_TYPE.VNPAY,
    providerResponse: JSON.stringify({
      errorCode: 'TIMEOUT',
      message: 'Payment gateway timeout',
    }),
  },

  // Payment 9: Cancelled payment
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_9,
    name: 'PAY-2024-009',
    amount: 680000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.CANCELLED,
    description: 'Thanh toán đã hủy bởi khách hàng',
    position: 9,
    providerType: PAYMENT_PROVIDER_TYPE.MOMO,
    metadata: JSON.stringify({ cancelReason: 'Customer changed mind' }),
  },

  // Payment 10: Pending Credit Card payment
  {
    ...DEFAULT_PAYMENT_SEED,
    id: MKT_PAYMENT_DATA_SEEDS_IDS.ID_10,
    name: 'PAY-2024-010',
    amount: 1500000,
    currency: 'VND',
    status: PAYMENT_TRANSACTION_STATUS.PENDING,
    description: 'Thanh toán thẻ tín dụng đang chờ',
    position: 10,
    providerType: PAYMENT_PROVIDER_TYPE.CREDIT_CARD,
    duration: 1800, // 30 minutes
    expiredAt: '2024-01-25T15:30:00.000Z',
    paymentPageUrl: 'https://payment.example.com/checkout/xyz789',
    providerMetadata: JSON.stringify({ cardType: 'VISA', last4: '4242' }),
  },
];
