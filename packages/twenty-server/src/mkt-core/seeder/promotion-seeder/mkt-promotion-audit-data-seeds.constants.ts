import {
  PROMOTION_AUDIT_ACTION,
  PromotionAuditAction,
} from 'src/mkt-core/mkt-promotion/constants';

import { MKT_PROMOTION_DATA_SEEDS_IDS } from './mkt-promotion-data-seeds.constants';

type MktPromotionAuditDataSeed = {
  id: string;
  action: PromotionAuditAction;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedBy: string | null;
  changedAt: Date;
  promotionId: string;
};

export const MKT_PROMOTION_AUDIT_DATA_SEED_COLUMNS: (keyof MktPromotionAuditDataSeed)[] =
  [
    'id',
    'action',
    'previousValues',
    'newValues',
    'changedBy',
    'changedAt',
    'promotionId',
  ];

export const MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS = {
  // Summer Sale audits
  SUMMER_CREATE: '1564a7f4-562c-4c30-a753-bef66dc6b567',
  SUMMER_ACTIVATE: 'ee6e9dc1-46bf-48ba-a210-0ad5182c44ad',
  SUMMER_UPDATE: 'ec3b78a6-3851-4d80-be3a-cb17abf96bdb',
  // New Customer audits
  NEW_CUSTOMER_CREATE: 'c9cfc8e1-7dca-499b-b03e-56beddfb6599',
  NEW_CUSTOMER_ACTIVATE: 'c32d3894-baeb-4242-844d-3789b3c1dc0f',
  // VIP Discount audits
  VIP_CREATE: '722d99a4-69be-403b-b7bd-c5b20a8ffb73',
  VIP_ACTIVATE: '6b72fc94-8574-4043-9cef-2bf6853a47cb',
  // Flash Sale audits
  FLASH_CREATE: '6e397d11-5ce1-48f7-91ce-fdb1e1a3d754',
  FLASH_ACTIVATE: '818425bb-2cc4-4fcf-9cca-2187b94702c0',
  FLASH_EXPIRE: '33d33ef7-31a0-40ed-b3b0-ddb1cea52518',
  // Bulk Order audits
  BULK_CREATE: 'f52084a4-9218-4d56-bb68-30ea371ee827',
  BULK_PAUSE: '17078168-16ae-4605-bc0a-8d541ffec795',
};

export const MKT_PROMOTION_AUDIT_DATA_SEEDS: MktPromotionAuditDataSeed[] = [
  // Summer Sale audit trail
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.SUMMER_CREATE,
    action: PROMOTION_AUDIT_ACTION.CREATE,
    previousValues: null,
    newValues: {
      name: 'Summer Sale 2025',
      code: 'SUMMER25',
      status: 'DRAFT',
      discountValue: 20,
    },
    changedBy: 'admin@example.com',
    changedAt: new Date('2025-05-01T10:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
  },
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.SUMMER_ACTIVATE,
    action: PROMOTION_AUDIT_ACTION.ACTIVATE,
    previousValues: { status: 'DRAFT' },
    newValues: { status: 'ACTIVE' },
    changedBy: 'marketing.manager@example.com',
    changedAt: new Date('2025-05-15T09:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
  },
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.SUMMER_UPDATE,
    action: PROMOTION_AUDIT_ACTION.UPDATE,
    previousValues: { maxDiscountAmount: 3000000 },
    newValues: { maxDiscountAmount: 5000000 },
    changedBy: 'marketing.manager@example.com',
    changedAt: new Date('2025-06-01T08:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
  },
  // New Customer audit trail
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.NEW_CUSTOMER_CREATE,
    action: PROMOTION_AUDIT_ACTION.CREATE,
    previousValues: null,
    newValues: {
      name: 'Welcome New Customer',
      code: 'WELCOME10',
      status: 'DRAFT',
      isAutoApply: true,
    },
    changedBy: 'admin@example.com',
    changedAt: new Date('2024-01-01T08:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.NEW_CUSTOMER,
  },
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.NEW_CUSTOMER_ACTIVATE,
    action: PROMOTION_AUDIT_ACTION.ACTIVATE,
    previousValues: { status: 'DRAFT' },
    newValues: { status: 'ACTIVE' },
    changedBy: 'admin@example.com',
    changedAt: new Date('2024-01-01T09:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.NEW_CUSTOMER,
  },
  // VIP Discount audit trail
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.VIP_CREATE,
    action: PROMOTION_AUDIT_ACTION.CREATE,
    previousValues: null,
    newValues: {
      name: 'VIP Diamond Exclusive',
      code: 'VIPDIAMOND',
      discountValue: 500000,
      promotionType: 'FIXED_AMOUNT',
    },
    changedBy: 'admin@example.com',
    changedAt: new Date('2024-01-01T10:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
  },
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.VIP_ACTIVATE,
    action: PROMOTION_AUDIT_ACTION.ACTIVATE,
    previousValues: { status: 'DRAFT' },
    newValues: { status: 'ACTIVE' },
    changedBy: 'admin@example.com',
    changedAt: new Date('2024-01-01T11:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
  },
  // Flash Sale audit trail
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.FLASH_CREATE,
    action: PROMOTION_AUDIT_ACTION.CREATE,
    previousValues: null,
    newValues: {
      name: 'Flash Sale 12.12',
      code: 'FLASH1212',
      discountValue: 30,
      usageLimit: 200,
    },
    changedBy: 'marketing.manager@example.com',
    changedAt: new Date('2024-12-01T10:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
  },
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.FLASH_ACTIVATE,
    action: PROMOTION_AUDIT_ACTION.ACTIVATE,
    previousValues: { status: 'DRAFT' },
    newValues: { status: 'ACTIVE' },
    changedBy: 'marketing.manager@example.com',
    changedAt: new Date('2024-12-12T00:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
  },
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.FLASH_EXPIRE,
    action: PROMOTION_AUDIT_ACTION.EXPIRE,
    previousValues: { status: 'ACTIVE' },
    newValues: { status: 'EXPIRED' },
    changedBy: 'system',
    changedAt: new Date('2024-12-13T00:00:01Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
  },
  // Bulk Order audit trail
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.BULK_CREATE,
    action: PROMOTION_AUDIT_ACTION.CREATE,
    previousValues: null,
    newValues: {
      name: 'Bulk Order Discount',
      code: 'BULK15',
      discountValue: 15,
      minOrderAmount: 10000000,
    },
    changedBy: 'sales.manager@example.com',
    changedAt: new Date('2024-06-01T08:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.BULK_ORDER,
  },
  {
    id: MKT_PROMOTION_AUDIT_DATA_SEEDS_IDS.BULK_PAUSE,
    action: PROMOTION_AUDIT_ACTION.PAUSE,
    previousValues: { status: 'ACTIVE' },
    newValues: { status: 'PAUSED' },
    changedBy: 'sales.manager@example.com',
    changedAt: new Date('2024-09-01T10:00:00Z'),
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.BULK_ORDER,
  },
];
