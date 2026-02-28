import { ORDER_STATUS, SINVOICE_STATUS } from 'src/mkt-core/order/constants';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

// ============================================
// RBAC TEST ORDER IDs
// 16 orders distributed across 8 users from different departments/levels
// ============================================

// prettier-ignore
export const MKT_ORDER_RBAC_TEST_IDS = {
  // Sarah Chen (SALES, Director L5) - 3 orders
  RBAC_SARAH_1: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  RBAC_SARAH_2: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  RBAC_SARAH_3: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  // Eddy Cue (SALES, Manager L7) - 3 orders
  RBAC_EDDY_1: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
  RBAC_EDDY_2: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
  RBAC_EDDY_3: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
  // Greg Joswiak (SALES_DOMESTIC, Specialist L9) - 2 orders
  RBAC_GREG_1: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
  RBAC_GREG_2: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e',
  // Emily Wilson (ACCOUNTING, Sr.Manager L6) - 2 orders
  RBAC_EMILY_1: 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
  RBAC_EMILY_2: 'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a',
  // Lisa Jackson (ACCOUNTING, Sr.Specialist L8) - 2 orders
  RBAC_LISA_1: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
  RBAC_LISA_2: 'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c',
  // Dan Riccio (SUPPORT, Sr.Manager L6) - 1 order
  RBAC_DAN_1: 'a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d',
  // Michael Brown (TECH, Sr.Director L4) - 2 orders
  RBAC_MICHAEL_1: 'b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e',
  RBAC_MICHAEL_2: 'c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f',
  // Deirdre O'Brien (HR, Manager L7) - 1 order
  RBAC_DEIRDRE_1: 'd6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a',
};

// ============================================
// LOCAL TYPES & HELPERS (duplicated from main seed file to avoid circular imports)
// ============================================

const PAYMENT_DEADLINE_SOURCE = {
  GLOBAL: 'GLOBAL',
  PRODUCT: 'PRODUCT',
  CUSTOMER_TYPE: 'CUSTOMER_TYPE',
  RESELLER_TIER: 'RESELLER_TIER',
  MANUAL: 'MANUAL',
} as const;

type PaymentDeadlineSource =
  (typeof PAYMENT_DEADLINE_SOURCE)[keyof typeof PAYMENT_DEADLINE_SOURCE];

const DEFAULT_PROMOTION_FIELDS = {
  couponCode: null,
  promotionDiscount: 0,
  appliedPromotions: null,
};

const DEFAULT_COMBO_FIELDS = {
  appliedCombos: null,
  comboDiscount: 0,
};

const DEFAULT_PAYMENT_DEADLINE_FIELDS = {
  paymentDeadline: null,
  paymentDeadlineSource: null,
  lockedAt: null,
  lockedReason: null,
  remindersSent: 0,
  lastReminderAt: null,
  completedAt: null,
  version: 1,
};

const CREATE_PAYMENT_FIELDS = (
  totalAmount: number,
  isPaid: boolean,
): { paidAmount: number; remainingAmount: number; paymentStatus: string } => ({
  paidAmount: isPaid ? totalAmount : 0,
  remainingAmount: isPaid ? 0 : totalAmount,
  paymentStatus: isPaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
});

const CREATE_PROCESSING_DEADLINE_FIELDS = (
  hoursFromNow: number,
  source: PaymentDeadlineSource,
  remindersSent = 0,
) => {
  const NOW = DateTimeUtils.now();
  const DEADLINE = DateTimeUtils.add(NOW, { hours: hoursFromNow });
  const LAST_REMINDER =
    remindersSent > 0 ? DateTimeUtils.subtract(NOW, { hours: 2 }) : null;

  return {
    paymentDeadline: DateTimeUtils.toDate(DEADLINE) ?? null,
    paymentDeadlineSource: source,
    lockedAt: null,
    lockedReason: null,
    remindersSent,
    lastReminderAt: LAST_REMINDER
      ? (DateTimeUtils.toDate(LAST_REMINDER) ?? null)
      : null,
    completedAt: null,
    version: 1,
  };
};

// ============================================
// RBAC TEST ORDER SEEDS
// 16 orders across 8 users in different departments and hierarchy levels
// Purpose: Test DataScope filtering (OWN, TEAM, DEPARTMENT, cross-dept)
// ============================================

// prettier-ignore
export const MKT_ORDER_RBAC_TEST_SEEDS = [
  // ── Sarah Chen (SALES, Director L5) — 3 orders ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_SARAH_1,
    name: 'Đơn hàng RBAC - Enterprise Care Package (Sales Director)',
    position: 101,
    orderCode: 'MKT-RBAC-2026-001',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 15000000,
    tax: 1500000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 16500000,
    currency: 'VND',
    note: 'RBAC test - Sarah Chen (SALES Director L5) - test DEPARTMENT scope',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(16500000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_SARAH_2,
    name: 'Đơn hàng RBAC - Premium Marketing Suite (Sales Director)',
    position: 102,
    orderCode: 'MKT-RBAC-2026-002',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 22000000,
    tax: 2200000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 24200000,
    currency: 'VND',
    note: 'RBAC test - Sarah Chen (SALES Director L5) - test DEPARTMENT scope',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(24200000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_SARAH_3,
    name: 'Đơn hàng RBAC - Basic Analytics Package (Sales Director)',
    position: 103,
    orderCode: 'MKT-RBAC-2026-003',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 8500000,
    tax: 850000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 9350000,
    currency: 'VND',
    note: 'RBAC test - Sarah Chen (SALES Director L5) - test DEPARTMENT scope',
    trialLicense: false,
    requireContract: false,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(9350000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },

  // ── Eddy Cue (SALES, Manager L7) — 3 orders ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_EDDY_1,
    name: 'Đơn hàng RBAC - Social Media Bundle (Sales Manager)',
    position: 104,
    orderCode: 'MKT-RBAC-2026-004',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 12000000,
    tax: 1200000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 13200000,
    currency: 'VND',
    note: 'RBAC test - Eddy Cue (SALES Manager L7) - test TEAM scope',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(13200000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_EDDY_2,
    name: 'Đơn hàng RBAC - Starter Marketing Kit (Sales Manager)',
    position: 105,
    orderCode: 'MKT-RBAC-2026-005',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 7200000,
    tax: 720000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 7920000,
    currency: 'VND',
    note: 'RBAC test - Eddy Cue (SALES Manager L7) - test TEAM scope',
    trialLicense: false,
    requireContract: false,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(7920000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_EDDY_3,
    name: 'Đơn hàng RBAC - Agency Pro Package (Sales Manager - Processing)',
    position: 106,
    orderCode: 'MKT-RBAC-2026-006',
    status: ORDER_STATUS.PROCESSING,
    subtotal: 18000000,
    tax: 1800000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 19800000,
    currency: 'VND',
    note: 'RBAC test - Eddy Cue (SALES Manager L7) - PROCESSING order with deadline',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.PENDING,
    licenseStatus: 'PENDING_PAYMENT',
    accountingConfirmed: false,
    salePaymentConfirmed: false,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(19800000, false),
    ...CREATE_PROCESSING_DEADLINE_FIELDS(48, PAYMENT_DEADLINE_SOURCE.GLOBAL, 0),
  },

  // ── Greg Joswiak (SALES_DOMESTIC, Specialist L9) — 2 orders ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_GREG_1,
    name: 'Đơn hàng RBAC - Basic Facebook Package (Sales Specialist)',
    position: 107,
    orderCode: 'MKT-RBAC-2026-007',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 5000000,
    tax: 500000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 5500000,
    currency: 'VND',
    note: 'RBAC test - Greg Joswiak (SALES_DOMESTIC Specialist L9) - test OWN scope',
    trialLicense: false,
    requireContract: false,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(5500000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_GREG_2,
    name: 'Đơn hàng RBAC - Zalo Marketing Starter (Sales Specialist)',
    position: 108,
    orderCode: 'MKT-RBAC-2026-008',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 3500000,
    tax: 350000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 3850000,
    currency: 'VND',
    note: 'RBAC test - Greg Joswiak (SALES_DOMESTIC Specialist L9) - test OWN scope',
    trialLicense: false,
    requireContract: false,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(3850000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },

  // ── Emily Wilson (ACCOUNTING, Sr.Manager L6) — 2 orders ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_EMILY_1,
    name: 'Đơn hàng RBAC - Data Analytics Pro (Accounting Sr.Manager)',
    position: 109,
    orderCode: 'MKT-RBAC-2026-009',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 9000000,
    tax: 900000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 9900000,
    currency: 'VND',
    note: 'RBAC test - Emily Wilson (ACCOUNTING Sr.Manager L6) - test cross-dept access',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(9900000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_EMILY_2,
    name: 'Đơn hàng RBAC - Premium Viral Suite (Accounting Sr.Manager)',
    position: 110,
    orderCode: 'MKT-RBAC-2026-010',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 14000000,
    tax: 1400000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 15400000,
    currency: 'VND',
    note: 'RBAC test - Emily Wilson (ACCOUNTING Sr.Manager L6) - test cross-dept access',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(15400000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },

  // ── Lisa Jackson (ACCOUNTING, Sr.Specialist L8) — 2 orders ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_LISA_1,
    name: 'Đơn hàng RBAC - UID Basic Package (Accounting Sr.Specialist)',
    position: 111,
    orderCode: 'MKT-RBAC-2026-011',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 6000000,
    tax: 600000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 6600000,
    currency: 'VND',
    note: 'RBAC test - Lisa Jackson (ACCOUNTING Sr.Specialist L8) - test OWN scope for accountant',
    trialLicense: false,
    requireContract: false,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(6600000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_LISA_2,
    name: 'Đơn hàng RBAC - Post Scheduler Starter (Accounting Sr.Specialist)',
    position: 112,
    orderCode: 'MKT-RBAC-2026-012',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 4200000,
    tax: 420000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 4620000,
    currency: 'VND',
    note: 'RBAC test - Lisa Jackson (ACCOUNTING Sr.Specialist L8) - test OWN scope for accountant',
    trialLicense: false,
    requireContract: false,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(4620000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },

  // ── Dan Riccio (SUPPORT, Sr.Manager L6) — 1 order ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_DAN_1,
    name: 'Đơn hàng RBAC - Support Escalation Package (Support Sr.Manager)',
    position: 113,
    orderCode: 'MKT-RBAC-2026-013',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 10500000,
    tax: 1050000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 11550000,
    currency: 'VND',
    note: 'RBAC test - Dan Riccio (SUPPORT Sr.Manager L6) - edge case: SUPPORT not in allowed depts',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(11550000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },

  // ── Michael Brown (TECH, Sr.Director L4) — 2 orders ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_MICHAEL_1,
    name: 'Đơn hàng RBAC - Enterprise Full Suite (Tech Sr.Director)',
    position: 114,
    orderCode: 'MKT-RBAC-2026-014',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 25000000,
    tax: 2500000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 27500000,
    currency: 'VND',
    note: 'RBAC test - Michael Brown (TECH Sr.Director L4) - non-SALES/ACCOUNTING manager',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(27500000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_MICHAEL_2,
    name: 'Đơn hàng RBAC - Platform Integration Pro (Tech Sr.Director - Processing)',
    position: 115,
    orderCode: 'MKT-RBAC-2026-015',
    status: ORDER_STATUS.PROCESSING,
    subtotal: 20000000,
    tax: 2000000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 22000000,
    currency: 'VND',
    note: 'RBAC test - Michael Brown (TECH Sr.Director L4) - PROCESSING order with deadline',
    trialLicense: false,
    requireContract: true,
    sInvoiceStatus: SINVOICE_STATUS.PENDING,
    licenseStatus: 'PENDING_PAYMENT',
    accountingConfirmed: false,
    salePaymentConfirmed: false,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(22000000, false),
    ...CREATE_PROCESSING_DEADLINE_FIELDS(24, PAYMENT_DEADLINE_SOURCE.PRODUCT, 0),
  },

  // ── Deirdre O'Brien (HR, Manager L7) — 1 order ──
  {
    id: MKT_ORDER_RBAC_TEST_IDS.RBAC_DEIRDRE_1,
    name: 'Đơn hàng RBAC - HR Training License (HR Manager)',
    position: 116,
    orderCode: 'MKT-RBAC-2026-016',
    status: ORDER_STATUS.COMPLETED,
    subtotal: 8000000,
    tax: 800000,
    discount: 0,
    discountPercent: 0,
    refundAmount: 0,
    totalAmount: 8800000,
    currency: 'VND',
    note: 'RBAC test - Deirdre O\'Brien (HR Manager L7) - passes via allowManagers',
    trialLicense: false,
    requireContract: false,
    sInvoiceStatus: SINVOICE_STATUS.SUCCESS,
    licenseStatus: null,
    accountingConfirmed: true,
    salePaymentConfirmed: true,
    metadata: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    ...DEFAULT_PROMOTION_FIELDS,
    ...DEFAULT_COMBO_FIELDS,
    ...CREATE_PAYMENT_FIELDS(8800000, true),
    ...DEFAULT_PAYMENT_DEADLINE_FIELDS,
  },
];

// ============================================
// RBAC TEST ORDER OVERRIDES
// Redistribute orders to correct owners (same pattern as main seed overrides)
// ============================================

// prettier-ignore
export const MKT_ORDER_RBAC_TEST_OVERRIDES: {
  orderId: string;
  accountOwnerId: string;
  createdById: string;
  completedAt: string | null;
}[] = [
  // ── Sarah Chen (SALES, Director L5) — 3 orders ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_SARAH_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.SARAH, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.SARAH, completedAt: '2026-02-01T10:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_SARAH_2, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.SARAH, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.SARAH, completedAt: '2026-02-04T14:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_SARAH_3, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.SARAH, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.SARAH, completedAt: '2026-02-08T09:00:00.000Z' },

  // ── Eddy Cue (SALES, Manager L7) — 3 orders ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_EDDY_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.EDDY, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.EDDY, completedAt: '2026-02-02T11:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_EDDY_2, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.EDDY, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.EDDY, completedAt: '2026-02-06T15:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_EDDY_3, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.EDDY, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.EDDY, completedAt: null },

  // ── Greg Joswiak (SALES_DOMESTIC, Specialist L9) — 2 orders ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_GREG_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.GREG, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.GREG, completedAt: '2026-02-03T10:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_GREG_2, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.GREG, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.GREG, completedAt: '2026-02-10T09:00:00.000Z' },

  // ── Emily Wilson (ACCOUNTING, Sr.Manager L6) — 2 orders ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_EMILY_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.EMILY, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.EMILY, completedAt: '2026-02-05T14:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_EMILY_2, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.EMILY, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.EMILY, completedAt: '2026-02-12T10:00:00.000Z' },

  // ── Lisa Jackson (ACCOUNTING, Sr.Specialist L8) — 2 orders ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_LISA_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.LISA, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.LISA, completedAt: '2026-02-07T11:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_LISA_2, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.LISA, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.LISA, completedAt: '2026-02-14T09:00:00.000Z' },

  // ── Dan Riccio (SUPPORT, Sr.Manager L6) — 1 order ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_DAN_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.DAN, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.DAN, completedAt: '2026-02-09T10:00:00.000Z' },

  // ── Michael Brown (TECH, Sr.Director L4) — 2 orders ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_MICHAEL_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.MICHAEL, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.MICHAEL, completedAt: '2026-02-11T14:00:00.000Z' },
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_MICHAEL_2, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.MICHAEL, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.MICHAEL, completedAt: null },

  // ── Deirdre O'Brien (HR, Manager L7) — 1 order ──
  { orderId: MKT_ORDER_RBAC_TEST_IDS.RBAC_DEIRDRE_1, accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.DEIRDRE, createdById: WORKSPACE_MEMBER_DATA_SEED_IDS.DEIRDRE, completedAt: '2026-02-13T11:00:00.000Z' },
];
