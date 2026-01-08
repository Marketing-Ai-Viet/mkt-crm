import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MKT_ORDER_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/order-seeder/mkt-order-data-seeds.constants';

import { MKT_PROMOTION_DATA_SEEDS_IDS } from './mkt-promotion-data-seeds.constants';
import { MKT_COUPON_DATA_SEEDS_IDS } from './mkt-coupon-data-seeds.constants';

type MktPromotionUsageDataSeed = {
  id: string;
  discountAmount: number;
  originalAmount: number;
  appliedAt: Date;
  metadata: Record<string, unknown> | null;
  promotionId: string | null;
  couponId: string | null;
  orderId: string | null;
  customerId: string | null;
};

export const MKT_PROMOTION_USAGE_DATA_SEED_COLUMNS: (keyof MktPromotionUsageDataSeed)[] =
  [
    'id',
    'discountAmount',
    'originalAmount',
    'appliedAt',
    'metadata',
    'promotionId',
    'couponId',
    'orderId',
    'customerId',
  ];

export const MKT_PROMOTION_USAGE_DATA_SEEDS_IDS = {
  USAGE_SUMMER_1: 'ca358a58-891f-4337-9e38-f658a097a218',
  USAGE_SUMMER_2: '3648d9f1-43ec-4a47-b4ab-13d77d1de5da',
  USAGE_VIP_1: 'b3255d70-1dfd-4af7-b6fe-9c3c62f3818d',
  USAGE_VIP_2: '97205aa2-ad0c-4970-874f-8c18dda7c7c4',
  USAGE_FLASH_1: 'd3966ccb-d991-40fb-9390-5e8af13a7689',
  USAGE_FREESHIP_1: 'd92499c5-fa69-4337-832c-074fc188aad0',
  USAGE_FREESHIP_2: '643c9233-dc83-4d80-a224-3fc0a65cc494',
  USAGE_BUY2_1: '3270ed62-4a90-4b27-a4ca-a72ce99f76d0',
};

export const MKT_PROMOTION_USAGE_DATA_SEEDS: MktPromotionUsageDataSeed[] = [
  // Summer Sale usage records
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_SUMMER_1,
    discountAmount: 400000,
    originalAmount: 2000000,
    appliedAt: new Date('2025-06-15T14:30:00Z'),
    metadata: {
      discountPercent: 20,
      orderItems: 3,
      appliedToCategories: ['electronics'],
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
    couponId: MKT_COUPON_DATA_SEEDS_IDS.SUMMER_COUPON_2,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.GOLD_ORDER_1,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
  },
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_SUMMER_2,
    discountAmount: 1000000,
    originalAmount: 5000000,
    appliedAt: new Date('2025-06-20T10:15:00Z'),
    metadata: {
      discountPercent: 20,
      orderItems: 5,
      cappedDiscount: true,
      originalDiscount: 1000000,
      maxDiscountApplied: false,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
    couponId: null,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.DIAMOND_ORDER_1,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
  },
  // VIP Discount usage records
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_VIP_1,
    discountAmount: 500000,
    originalAmount: 3500000,
    appliedAt: new Date('2025-02-10T16:45:00Z'),
    metadata: {
      vipTier: 'DIAMOND',
      fixedDiscountApplied: true,
      autoApplied: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
    couponId: MKT_COUPON_DATA_SEEDS_IDS.VIP_COUPON_DIAMOND,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.DIAMOND_ORDER_2,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
  },
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_VIP_2,
    discountAmount: 500000,
    originalAmount: 2500000,
    appliedAt: new Date('2025-03-05T11:20:00Z'),
    metadata: {
      vipTier: 'GOLD',
      fixedDiscountApplied: true,
      autoApplied: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
    couponId: MKT_COUPON_DATA_SEEDS_IDS.VIP_COUPON_GOLD,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.GOLD_ORDER_2,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
  },
  // Flash Sale usage record
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_FLASH_1,
    discountAmount: 900000,
    originalAmount: 3000000,
    appliedAt: new Date('2024-12-12T10:30:00Z'),
    metadata: {
      discountPercent: 30,
      flashSaleEvent: '12.12',
      orderItems: 2,
      cappedDiscount: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
    couponId: MKT_COUPON_DATA_SEEDS_IDS.FLASH_COUPON_1,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.DIAMOND_ORDER_3,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
  },
  // Free Shipping usage records
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_FREESHIP_1,
    discountAmount: 50000,
    originalAmount: 500000,
    appliedAt: new Date('2025-01-15T09:00:00Z'),
    metadata: {
      shippingType: 'standard',
      originalShippingCost: 50000,
      freeShippingApplied: true,
      autoApplied: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FREE_SHIPPING,
    couponId: null,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.ID_1,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
  },
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_FREESHIP_2,
    discountAmount: 100000,
    originalAmount: 800000,
    appliedAt: new Date('2025-01-20T14:00:00Z'),
    metadata: {
      shippingType: 'express',
      originalShippingCost: 100000,
      freeShippingApplied: true,
      autoApplied: true,
      maxDiscountReached: true,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FREE_SHIPPING,
    couponId: null,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.ID_2,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
  },
  // Buy 2 Get 1 usage record
  {
    id: MKT_PROMOTION_USAGE_DATA_SEEDS_IDS.USAGE_BUY2_1,
    discountAmount: 350000,
    originalAmount: 1050000,
    appliedAt: new Date('2025-03-10T13:30:00Z'),
    metadata: {
      promotionType: 'BUY_X_GET_Y',
      buyQuantity: 2,
      freeQuantity: 1,
      freeItemValue: 350000,
      selectedFreeItem: 'lowest_price',
      orderItems: 3,
    },
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.BUY_2_GET_1,
    couponId: MKT_COUPON_DATA_SEEDS_IDS.BUY2_COUPON_1,
    orderId: MKT_ORDER_DATA_SEEDS_IDS.ID_3,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
  },
];
