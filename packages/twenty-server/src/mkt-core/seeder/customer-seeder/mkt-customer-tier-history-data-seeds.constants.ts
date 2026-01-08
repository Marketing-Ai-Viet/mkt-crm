import {
  MKT_CUSTOMER_TIER,
  MKT_CUSTOMER_DATA_SEEDS_IDS,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  TIER_CHANGE_REASON,
  TierChangeReason,
} from 'src/mkt-core/customer/constants/mkt-customer-tier-history.constants';

export const MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS = {
  // Diamond customer progression
  DIAMOND_INITIAL: 'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
  DIAMOND_TO_SILVER: 'a1b2c3d4-e5f6-7890-abcd-ef1234567802',
  DIAMOND_TO_GOLD: 'a1b2c3d4-e5f6-7890-abcd-ef1234567803',
  DIAMOND_TO_DIAMOND: 'a1b2c3d4-e5f6-7890-abcd-ef1234567804',

  // Gold customer progression
  GOLD_INITIAL: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  GOLD_TO_SILVER: 'b2c3d4e5-f6a7-8901-bcde-f12345678902',
  GOLD_TO_GOLD: 'b2c3d4e5-f6a7-8901-bcde-f12345678903',

  // Silver customer progression
  SILVER_INITIAL: 'c3d4e5f6-a7b8-9012-cdef-123456789001',
  SILVER_TO_SILVER: 'c3d4e5f6-a7b8-9012-cdef-123456789002',

  // Bronze customer
  BRONZE_INITIAL: 'd4e5f6a7-b8c9-0123-def0-123456789001',

  // Churned customer progression (showing decline)
  CHURNED_INITIAL: 'e5f6a7b8-c9d0-1234-ef01-234567890001',
  CHURNED_TO_SILVER: 'e5f6a7b8-c9d0-1234-ef01-234567890002',
  CHURNED_TO_DORMANT: 'e5f6a7b8-c9d0-1234-ef01-234567890003',
  CHURNED_TO_CHURNED: 'e5f6a7b8-c9d0-1234-ef01-234567890004',
} as const;

type MktCustomerTierHistoryDataSeed = {
  id: string;
  previousTier: MKT_CUSTOMER_TIER | null;
  newTier: MKT_CUSTOMER_TIER;
  reason: TierChangeReason;
  orderValueAtChange: number;
  orderCountAtChange: number;
  customerId: string;
  createdAt: string;
};

export const MKT_CUSTOMER_TIER_HISTORY_DATA_SEED_COLUMNS: (keyof MktCustomerTierHistoryDataSeed)[] =
  [
    'id',
    'previousTier',
    'newTier',
    'reason',
    'orderValueAtChange',
    'orderCountAtChange',
    'customerId',
    'createdAt',
  ];

export const MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS: MktCustomerTierHistoryDataSeed[] =
  [
    // Diamond customer progression: null -> BRONZE -> SILVER -> GOLD -> DIAMOND
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.DIAMOND_INITIAL,
      previousTier: null,
      newTier: MKT_CUSTOMER_TIER.BRONZE,
      reason: TIER_CHANGE_REASON.INITIAL_ASSIGNMENT,
      orderValueAtChange: 500000,
      orderCountAtChange: 1,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
      createdAt: '2023-01-15T08:00:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.DIAMOND_TO_SILVER,
      previousTier: MKT_CUSTOMER_TIER.BRONZE,
      newTier: MKT_CUSTOMER_TIER.SILVER,
      reason: TIER_CHANGE_REASON.ORDER_COMPLETED,
      orderValueAtChange: 2500000,
      orderCountAtChange: 5,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
      createdAt: '2023-03-20T10:30:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.DIAMOND_TO_GOLD,
      previousTier: MKT_CUSTOMER_TIER.SILVER,
      newTier: MKT_CUSTOMER_TIER.GOLD,
      reason: TIER_CHANGE_REASON.ORDER_COMPLETED,
      orderValueAtChange: 5500000,
      orderCountAtChange: 10,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
      createdAt: '2023-06-15T14:00:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.DIAMOND_TO_DIAMOND,
      previousTier: MKT_CUSTOMER_TIER.GOLD,
      newTier: MKT_CUSTOMER_TIER.DIAMOND,
      reason: TIER_CHANGE_REASON.ORDER_COMPLETED,
      orderValueAtChange: 12000000,
      orderCountAtChange: 20,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
      createdAt: '2023-11-10T09:00:00.000Z',
    },

    // Gold customer progression: null -> BRONZE -> SILVER -> GOLD
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.GOLD_INITIAL,
      previousTier: null,
      newTier: MKT_CUSTOMER_TIER.BRONZE,
      reason: TIER_CHANGE_REASON.INITIAL_ASSIGNMENT,
      orderValueAtChange: 750000,
      orderCountAtChange: 1,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
      createdAt: '2023-06-10T09:30:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.GOLD_TO_SILVER,
      previousTier: MKT_CUSTOMER_TIER.BRONZE,
      newTier: MKT_CUSTOMER_TIER.SILVER,
      reason: TIER_CHANGE_REASON.ORDER_COMPLETED,
      orderValueAtChange: 2200000,
      orderCountAtChange: 5,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
      createdAt: '2023-09-15T11:00:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.GOLD_TO_GOLD,
      previousTier: MKT_CUSTOMER_TIER.SILVER,
      newTier: MKT_CUSTOMER_TIER.GOLD,
      reason: TIER_CHANGE_REASON.ORDER_COMPLETED,
      orderValueAtChange: 5200000,
      orderCountAtChange: 10,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
      createdAt: '2024-02-20T15:30:00.000Z',
    },

    // Silver customer progression: null -> BRONZE -> SILVER
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.SILVER_INITIAL,
      previousTier: null,
      newTier: MKT_CUSTOMER_TIER.BRONZE,
      reason: TIER_CHANGE_REASON.INITIAL_ASSIGNMENT,
      orderValueAtChange: 600000,
      orderCountAtChange: 1,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
      createdAt: '2024-01-20T11:00:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.SILVER_TO_SILVER,
      previousTier: MKT_CUSTOMER_TIER.BRONZE,
      newTier: MKT_CUSTOMER_TIER.SILVER,
      reason: TIER_CHANGE_REASON.ORDER_COMPLETED,
      orderValueAtChange: 2100000,
      orderCountAtChange: 5,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
      createdAt: '2024-05-10T16:45:00.000Z',
    },

    // Bronze customer: Initial assignment only
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.BRONZE_INITIAL,
      previousTier: null,
      newTier: MKT_CUSTOMER_TIER.BRONZE,
      reason: TIER_CHANGE_REASON.INITIAL_ASSIGNMENT,
      orderValueAtChange: 500000,
      orderCountAtChange: 1,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
      createdAt: '2024-10-01T14:30:00.000Z',
    },

    // Churned customer progression: null -> BRONZE -> SILVER -> DORMANT -> CHURNED
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.CHURNED_INITIAL,
      previousTier: null,
      newTier: MKT_CUSTOMER_TIER.BRONZE,
      reason: TIER_CHANGE_REASON.INITIAL_ASSIGNMENT,
      orderValueAtChange: 800000,
      orderCountAtChange: 1,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
      createdAt: '2022-05-20T10:00:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.CHURNED_TO_SILVER,
      previousTier: MKT_CUSTOMER_TIER.BRONZE,
      newTier: MKT_CUSTOMER_TIER.SILVER,
      reason: TIER_CHANGE_REASON.ORDER_COMPLETED,
      orderValueAtChange: 3500000,
      orderCountAtChange: 6,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
      createdAt: '2022-10-15T09:30:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.CHURNED_TO_DORMANT,
      previousTier: MKT_CUSTOMER_TIER.SILVER,
      newTier: MKT_CUSTOMER_TIER.DORMANT,
      reason: TIER_CHANGE_REASON.INACTIVITY_DOWNGRADE,
      orderValueAtChange: 35000000,
      orderCountAtChange: 8,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
      createdAt: '2024-06-15T08:00:00.000Z',
    },
    {
      id: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS_IDS.CHURNED_TO_CHURNED,
      previousTier: MKT_CUSTOMER_TIER.DORMANT,
      newTier: MKT_CUSTOMER_TIER.CHURNED,
      reason: TIER_CHANGE_REASON.CRON_RECALCULATION,
      orderValueAtChange: 35000000,
      orderCountAtChange: 8,
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
      createdAt: '2024-09-20T02:00:00.000Z',
    },
  ];
