import { MKT_ORDER_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/order-seeder/order/mkt-order-data-seeds.constants';
import { VA_PROVIDER_TYPE } from 'src/mkt-core/payment/constants/va-provider.constants';

type MktVirtualAccountDataSeed = {
  id: string;
  name: string;
  vaNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  amount: number;
  qrCodeUrl: string | null;
  expiresAt: string;
  isActive: boolean;
  provider: string;
  providerResponse: string | null;
  mktOrderId: string;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_VIRTUAL_ACCOUNT_DATA_SEED_COLUMNS: (keyof MktVirtualAccountDataSeed)[] =
  [
    'id',
    'name',
    'vaNumber',
    'bankCode',
    'bankName',
    'accountName',
    'amount',
    'qrCodeUrl',
    'expiresAt',
    'isActive',
    'provider',
    'providerResponse',
    'mktOrderId',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

export const MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS = {
  VA_1: 'abe389ae-b28d-49a9-8cab-1a86aff6a7ed',
  VA_2: '9ad157b2-e6f5-4b35-97fb-58c8928607b1',
  VA_3: '151441f2-836e-41b9-b611-e149af529fb4',
  VA_4: 'a1fae38b-bc14-4246-9a2c-3750839d8c9d',
  VA_5: 'ea6faf43-bc4b-494b-8f3d-2f27421f1aae',
  VA_6: 'ca1957f2-a027-40c2-b22d-b939eec75c54',
  VA_7: '6f02cbb3-89d9-484d-9ab5-6f8d1824b522',
  VA_8: '4685d1bf-28e9-4c27-aae1-1a61223551e8',
};

// Static expiry dates for seed data
const VA_EXPIRY_DATES = {
  EXPIRES_1_DAY: '2030-12-31T23:59:59.000Z',
  EXPIRES_2_DAYS: '2030-12-30T23:59:59.000Z',
  EXPIRES_3_DAYS: '2030-12-29T23:59:59.000Z',
  EXPIRES_5_DAYS: '2030-12-27T23:59:59.000Z',
  EXPIRES_7_DAYS: '2030-12-25T23:59:59.000Z',
  EXPIRES_14_DAYS: '2030-12-18T23:59:59.000Z',
  EXPIRED_2_DAYS_AGO: '2024-01-01T00:00:00.000Z',
} as const;

export const MKT_VIRTUAL_ACCOUNT_DATA_SEEDS: MktVirtualAccountDataSeed[] = [
  // Active VA for order 1 (SEPAY)
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_1,
    name: 'VA-9704000001234567',
    vaNumber: '9704000001234567',
    bankCode: 'BIDV',
    bankName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    accountName: 'SEPAY - MKT CRM',
    amount: 2500000,
    qrCodeUrl: 'https://sepay.vn/qr/9704000001234567.png',
    expiresAt: VA_EXPIRY_DATES.EXPIRES_1_DAY,
    isActive: true,
    provider: VA_PROVIDER_TYPE.SEPAY,
    providerResponse: JSON.stringify({
      status: 'success',
      transactionId: 'SEP001234567890',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_1,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Active VA for order 2 (SEPAY)
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_2,
    name: 'VA-9704000002345678',
    vaNumber: '9704000002345678',
    bankCode: 'VCB',
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    accountName: 'SEPAY - MKT CRM',
    amount: 5000000,
    qrCodeUrl: 'https://sepay.vn/qr/9704000002345678.png',
    expiresAt: VA_EXPIRY_DATES.EXPIRES_2_DAYS,
    isActive: true,
    provider: VA_PROVIDER_TYPE.SEPAY,
    providerResponse: JSON.stringify({
      status: 'success',
      transactionId: 'SEP002345678901',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_2,
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Active VA for order 3 (BIDV)
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_3,
    name: 'VA-9704000003456789',
    vaNumber: '9704000003456789',
    bankCode: 'BIDV',
    bankName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    accountName: 'BIDV VA - MKT CRM',
    amount: 1500000,
    qrCodeUrl: 'https://bidv.vn/qr/9704000003456789.png',
    expiresAt: VA_EXPIRY_DATES.EXPIRES_3_DAYS,
    isActive: true,
    provider: VA_PROVIDER_TYPE.BIDV,
    providerResponse: JSON.stringify({
      status: 'success',
      referenceNo: 'BIDV003456789012',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_3,
    position: 3,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Expired VA for order 4 (SEPAY)
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_4,
    name: 'VA-9704000004567890',
    vaNumber: '9704000004567890',
    bankCode: 'TCB',
    bankName: 'Ngân hàng TMCP Kỹ thương Việt Nam',
    accountName: 'SEPAY - MKT CRM',
    amount: 3000000,
    qrCodeUrl: 'https://sepay.vn/qr/9704000004567890.png',
    expiresAt: VA_EXPIRY_DATES.EXPIRED_2_DAYS_AGO,
    isActive: false,
    provider: VA_PROVIDER_TYPE.SEPAY,
    providerResponse: JSON.stringify({
      status: 'expired',
      transactionId: 'SEP004567890123',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_4,
    position: 4,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Active VA for order 5 (SEPAY - high amount)
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_5,
    name: 'VA-9704000005678901',
    vaNumber: '9704000005678901',
    bankCode: 'MB',
    bankName: 'Ngân hàng TMCP Quân đội',
    accountName: 'SEPAY - MKT CRM',
    amount: 15000000,
    qrCodeUrl: 'https://sepay.vn/qr/9704000005678901.png',
    expiresAt: VA_EXPIRY_DATES.EXPIRES_7_DAYS,
    isActive: true,
    provider: VA_PROVIDER_TYPE.SEPAY,
    providerResponse: JSON.stringify({
      status: 'success',
      transactionId: 'SEP005678901234',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_5,
    position: 5,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Inactive VA (manually deactivated) for order 6
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_6,
    name: 'VA-9704000006789012',
    vaNumber: '9704000006789012',
    bankCode: 'BIDV',
    bankName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    accountName: 'BIDV VA - MKT CRM',
    amount: 2000000,
    qrCodeUrl: null,
    expiresAt: VA_EXPIRY_DATES.EXPIRES_5_DAYS,
    isActive: false,
    provider: VA_PROVIDER_TYPE.BIDV,
    providerResponse: JSON.stringify({
      status: 'cancelled',
      reason: 'User cancelled order',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_6,
    position: 6,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin',
  },
  // Active VA for processing order (SEPAY)
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_7,
    name: 'VA-9704000007890123',
    vaNumber: '9704000007890123',
    bankCode: 'VCB',
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    accountName: 'SEPAY - MKT CRM',
    amount: 8500000,
    qrCodeUrl: 'https://sepay.vn/qr/9704000007890123.png',
    expiresAt: VA_EXPIRY_DATES.EXPIRES_1_DAY,
    isActive: true,
    provider: VA_PROVIDER_TYPE.SEPAY,
    providerResponse: JSON.stringify({
      status: 'success',
      transactionId: 'SEP007890123456',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.PROCESSING_ORDER_1,
    position: 7,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Active VA for gold order (BIDV)
  {
    id: MKT_VIRTUAL_ACCOUNT_DATA_SEEDS_IDS.VA_8,
    name: 'VA-9704000008901234',
    vaNumber: '9704000008901234',
    bankCode: 'BIDV',
    bankName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    accountName: 'BIDV VA - MKT CRM',
    amount: 50000000,
    qrCodeUrl: 'https://bidv.vn/qr/9704000008901234.png',
    expiresAt: VA_EXPIRY_DATES.EXPIRES_14_DAYS,
    isActive: true,
    provider: VA_PROVIDER_TYPE.BIDV,
    providerResponse: JSON.stringify({
      status: 'success',
      referenceNo: 'BIDV008901234567',
    }),
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.GOLD_ORDER_1,
    position: 8,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];
