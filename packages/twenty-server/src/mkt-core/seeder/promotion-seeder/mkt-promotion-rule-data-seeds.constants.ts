import {
  PROMOTION_RULE_TYPE,
  RULE_OPERATOR,
  LOGIC_OPERATOR,
  PromotionRuleType,
  RuleOperator,
  LogicOperator,
} from 'src/mkt-core/mkt-promotion/constants';

import { MKT_PROMOTION_DATA_SEEDS_IDS } from './mkt-promotion-data-seeds.constants';

type MktPromotionRuleDataSeed = {
  id: string;
  name: string;
  ruleType: PromotionRuleType;
  operator: RuleOperator;
  targetIds: string[] | null;
  targetValues: Record<string, unknown> | null;
  isRequired: boolean;
  logicOperator: LogicOperator;
  position: number;
  promotionId: string;
};

export const MKT_PROMOTION_RULE_DATA_SEED_COLUMNS: (keyof MktPromotionRuleDataSeed)[] =
  [
    'id',
    'name',
    'ruleType',
    'operator',
    'targetIds',
    'targetValues',
    'isRequired',
    'logicOperator',
    'position',
    'promotionId',
  ];

export const MKT_PROMOTION_RULE_DATA_SEEDS_IDS = {
  // Summer Sale rules
  SUMMER_MIN_ORDER: 'f2f777df-af64-4971-b25e-38934403ed9d',
  // New Customer rules
  NEW_CUSTOMER_FIRST_ORDER: '49cd8f21-1ba0-4b99-8943-cb4167c3d825',
  // VIP Discount rules
  VIP_CUSTOMER_TAG: 'bf9bf4fc-af5b-48c5-8bc7-22138232023b',
  VIP_MIN_ORDER: '5142d82a-2e79-4fd0-9608-57da78333eda',
  // Free Shipping rules
  FREE_SHIP_MIN_ORDER: '452e7726-5210-473b-9cf5-7738f5e6f7d4',
  // Buy 2 Get 1 rules
  BUY2_QUANTITY: 'aaf1f90e-a5d4-4bc1-8519-db864249b96a',
  BUY2_CATEGORY: '9ddec1d9-9538-496f-8cfd-2e4e2da7b17a',
  // Flash Sale rules
  FLASH_CATEGORY: '4da35fcc-2d09-48e8-8297-c629f61dd048',
  FLASH_MIN_ORDER: '3d8d4ac7-a5d8-4706-ba2f-f6636f3c138b',
  // Loyalty Reward rules
  LOYALTY_CUSTOMER_SEGMENT: 'bfca9008-9847-408b-a1b9-e60a6cbef3f2',
  // Bulk Order rules
  BULK_ORDER_VALUE: 'c93a0d89-86f6-4478-b30f-47ac735c8c9d',
};

export const MKT_PROMOTION_RULE_DATA_SEEDS: MktPromotionRuleDataSeed[] = [
  // Summer Sale - Min order value rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.SUMMER_MIN_ORDER,
    name: 'Minimum Order Value 1M',
    ruleType: PROMOTION_RULE_TYPE.ORDER_VALUE,
    operator: RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
    targetIds: null,
    targetValues: { value: 1000000 },
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.SUMMER_SALE,
  },
  // New Customer - First order rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.NEW_CUSTOMER_FIRST_ORDER,
    name: 'First Order Only',
    ruleType: PROMOTION_RULE_TYPE.FIRST_ORDER,
    operator: RULE_OPERATOR.EQUALS,
    targetIds: null,
    targetValues: { value: true },
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.NEW_CUSTOMER,
  },
  // VIP Discount - Customer tag rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.VIP_CUSTOMER_TAG,
    name: 'Diamond Customer Tag',
    ruleType: PROMOTION_RULE_TYPE.CUSTOMER_TAG,
    operator: RULE_OPERATOR.IN,
    targetIds: ['diamond', 'vip'],
    targetValues: null,
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
  },
  // VIP Discount - Min order value rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.VIP_MIN_ORDER,
    name: 'Minimum Order Value 2M',
    ruleType: PROMOTION_RULE_TYPE.ORDER_VALUE,
    operator: RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
    targetIds: null,
    targetValues: { value: 2000000 },
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 1,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.VIP_DISCOUNT,
  },
  // Free Shipping - Min order value rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.FREE_SHIP_MIN_ORDER,
    name: 'Minimum Order Value 300K',
    ruleType: PROMOTION_RULE_TYPE.ORDER_VALUE,
    operator: RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
    targetIds: null,
    targetValues: { value: 300000 },
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FREE_SHIPPING,
  },
  // Buy 2 Get 1 - Quantity rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.BUY2_QUANTITY,
    name: 'Minimum 2 Items',
    ruleType: PROMOTION_RULE_TYPE.QUANTITY,
    operator: RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
    targetIds: null,
    targetValues: { value: 2 },
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.BUY_2_GET_1,
  },
  // Buy 2 Get 1 - Category rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.BUY2_CATEGORY,
    name: 'Specific Categories',
    ruleType: PROMOTION_RULE_TYPE.CATEGORY,
    operator: RULE_OPERATOR.IN,
    targetIds: ['electronics', 'clothing', 'accessories'],
    targetValues: null,
    isRequired: false,
    logicOperator: LOGIC_OPERATOR.OR,
    position: 1,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.BUY_2_GET_1,
  },
  // Flash Sale - Category rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.FLASH_CATEGORY,
    name: 'Flash Sale Categories',
    ruleType: PROMOTION_RULE_TYPE.CATEGORY,
    operator: RULE_OPERATOR.IN,
    targetIds: ['electronics', 'fashion'],
    targetValues: null,
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
  },
  // Flash Sale - Min order value rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.FLASH_MIN_ORDER,
    name: 'Minimum Order Value 500K',
    ruleType: PROMOTION_RULE_TYPE.ORDER_VALUE,
    operator: RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
    targetIds: null,
    targetValues: { value: 500000 },
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 1,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.FLASH_SALE,
  },
  // Loyalty Reward - Customer segment rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.LOYALTY_CUSTOMER_SEGMENT,
    name: 'Loyalty Members',
    ruleType: PROMOTION_RULE_TYPE.CUSTOMER_SEGMENT,
    operator: RULE_OPERATOR.IN,
    targetIds: ['loyalty_members', 'premium_members'],
    targetValues: null,
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.LOYALTY_REWARD,
  },
  // Bulk Order - Order value rule
  {
    id: MKT_PROMOTION_RULE_DATA_SEEDS_IDS.BULK_ORDER_VALUE,
    name: 'Minimum Order Value 10M',
    ruleType: PROMOTION_RULE_TYPE.ORDER_VALUE,
    operator: RULE_OPERATOR.GREATER_THAN_OR_EQUAL,
    targetIds: null,
    targetValues: { value: 10000000 },
    isRequired: true,
    logicOperator: LOGIC_OPERATOR.AND,
    position: 0,
    promotionId: MKT_PROMOTION_DATA_SEEDS_IDS.BULK_ORDER,
  },
];
