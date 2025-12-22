import {
  COUPON_STATUS,
  CouponStatus,
} from 'src/mkt-core/mkt-promotion/constants';
import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/customer/constants/mkt-customer.constant';

import { MKT_PROMOTION_DATA_SEEDS_IDS } from './mkt-promotion-data-seeds.constants';

type MktCouponDataSeed = {
  id: string;
  code: string;
  status: CouponStatus;
  usageLimit: number | null;
  currentUsageCount: number;
  validFrom: Date | null;
  validTo: Date | null;
  assignedCustomerId: string | null;
  metadata: Record<string, unknown> | null;
  promotionId: string;
};

export const MKT_COUPON_DATA_SEED_COLUMNS: (keyof MktCouponDataSeed)[] = [
  'id',
  'code',
  'status',
  'usageLimit',
  'currentUsageCount',
  'validFrom',
  'validTo',
  'assignedCustomerId',
  'metadata',
  'promotionId',
];

export const MKT_COUPON_DATA_SEEDS_IDS = {
  // Summer Sale coupons
  SUMMER_COUPON_1: '5db5b154-0fa2-4116-9dfb-6c93fdcd74d9',
  SUMMER_COUPON_2: '805948a1-ea6b-4f8d-aa86-e85e74f27d73',
  SUMMER_COUPON_3: 'f824f387-b0e1-43eb-b986-fd49d2c93dae',
  // New Customer coupons
  WELCOME_COUPON_1: '86673d30-1b1c-4a9e-b04d-ee9f08896f22',
  WELCOME_COUPON_2: 'f92e1f66-97e4-41a6-b513-41aa9ac72b12',
  // VIP coupons
  VIP_COUPON_DIAMOND: '2b46b98b-618b-4e70-8365-a1311d98b2ea',
  VIP_COUPON_GOLD: 'eff3ff57-68ea-490f-afe9-6576d10311f7',
  // Flash Sale coupons
  FLASH_COUPON_1: 'd21c25ec-d9fd-4311-bb3b-0ef113afe1e7',
  FLASH_COUPON_2: '71c8db5a-4a18-4c15-97ed-883c718eaaed',
  // Buy 2 Get 1 coupons
  BUY2_COUPON_1: '1587351c-a560-49ea-abbb-948fd0a5d75e',
};

export const MKT_COUPON_DATA_SEEDS: MktCouponDataSeed[] = [
  // Summer Sale coupons
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.SUMMER_COUPON_1,
    code: 'SUMMER25-ABC123',
    status: COUPON_STATUS.ACTIVE,
    usageLimit: 1,
    currentUsageCount: 0,
    validFrom: new Date('2025-06-01T00:00:00Z'),
    validTo: new Date('2025-08-31T23:59:59Z'),
    assignedCustomerId: null,
    metadata: {
      batchId: 'SUMMER25-BATCH1',
      generatedAt: '2025-05-15',
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
  },
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.SUMMER_COUPON_2,
    code: 'SUMMER25-DEF456',
    status: COUPON_STATUS.USED,
    usageLimit: 1,
    currentUsageCount: 1,
    validFrom: new Date('2025-06-01T00:00:00Z'),
    validTo: new Date('2025-08-31T23:59:59Z'),
    assignedCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    metadata: {
      batchId: 'SUMMER25-BATCH1',
      usedAt: '2025-06-15',
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
  },
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.SUMMER_COUPON_3,
    code: 'SUMMER25-GHI789',
    status: COUPON_STATUS.EXPIRED,
    usageLimit: 1,
    currentUsageCount: 0,
    validFrom: new Date('2024-06-01T00:00:00Z'),
    validTo: new Date('2024-08-31T23:59:59Z'),
    assignedCustomerId: null,
    metadata: {
      batchId: 'SUMMER24-BATCH1',
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
  },
  // Welcome coupons for new customers
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.WELCOME_COUPON_1,
    code: 'WELCOME-SILVER01',
    status: COUPON_STATUS.ACTIVE,
    usageLimit: 1,
    currentUsageCount: 0,
    validFrom: new Date('2025-01-01T00:00:00Z'),
    validTo: new Date('2025-12-31T23:59:59Z'),
    assignedCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    metadata: {
      welcomeType: 'new_customer',
      assignedReason: 'registration_bonus',
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.NEW_CUSTOMER,
  },
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.WELCOME_COUPON_2,
    code: 'WELCOME-BRONZE01',
    status: COUPON_STATUS.ACTIVE,
    usageLimit: 1,
    currentUsageCount: 0,
    validFrom: new Date('2025-01-01T00:00:00Z'),
    validTo: new Date('2025-12-31T23:59:59Z'),
    assignedCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    metadata: {
      welcomeType: 'new_customer',
      assignedReason: 'registration_bonus',
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.NEW_CUSTOMER,
  },
  // VIP exclusive coupons
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.VIP_COUPON_DIAMOND,
    code: 'VIP-DIAMOND-2025',
    status: COUPON_STATUS.ACTIVE,
    usageLimit: null,
    currentUsageCount: 5,
    validFrom: new Date('2025-01-01T00:00:00Z'),
    validTo: null,
    assignedCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    metadata: {
      vipTier: 'DIAMOND',
      exclusiveBenefit: true,
      renewalEligible: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
  },
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.VIP_COUPON_GOLD,
    code: 'VIP-GOLD-2025',
    status: COUPON_STATUS.ACTIVE,
    usageLimit: 10,
    currentUsageCount: 3,
    validFrom: new Date('2025-01-01T00:00:00Z'),
    validTo: new Date('2025-12-31T23:59:59Z'),
    assignedCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    metadata: {
      vipTier: 'GOLD',
      exclusiveBenefit: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
  },
  // Flash Sale coupons
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.FLASH_COUPON_1,
    code: 'FLASH1212-001',
    status: COUPON_STATUS.USED,
    usageLimit: 1,
    currentUsageCount: 1,
    validFrom: new Date('2024-12-12T00:00:00Z'),
    validTo: new Date('2024-12-12T23:59:59Z'),
    assignedCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    metadata: {
      flashSaleEvent: '12.12',
      usedAt: '2024-12-12T10:30:00Z',
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
  },
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.FLASH_COUPON_2,
    code: 'FLASH1212-002',
    status: COUPON_STATUS.EXPIRED,
    usageLimit: 1,
    currentUsageCount: 0,
    validFrom: new Date('2024-12-12T00:00:00Z'),
    validTo: new Date('2024-12-12T23:59:59Z'),
    assignedCustomerId: null,
    metadata: {
      flashSaleEvent: '12.12',
      expiredUnused: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
  },
  // Buy 2 Get 1 coupon
  {
    id: MKT_COUPON_DATA_SEEDS_IDS.BUY2_COUPON_1,
    code: 'BUY2GET1-MAR25',
    status: COUPON_STATUS.ACTIVE,
    usageLimit: 2,
    currentUsageCount: 1,
    validFrom: new Date('2025-03-01T00:00:00Z'),
    validTo: new Date('2025-03-31T23:59:59Z'),
    assignedCustomerId: null,
    metadata: {
      campaignType: 'buy_x_get_y',
      buyQuantity: 2,
      freeQuantity: 1,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.BUY_2_GET_1,
  },
];
