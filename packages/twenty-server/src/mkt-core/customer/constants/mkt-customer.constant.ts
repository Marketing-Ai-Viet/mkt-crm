import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export const MKT_CUSTOMER_TYPE = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
  ORGANIZATION: 'ORGANIZATION',
};

/** SELECT field options for Customer Type - use in WorkspaceEntity decorator */
export const MKT_CUSTOMER_TYPE_SELECT_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_CUSTOMER_TYPE.INDIVIDUAL,
    label: 'Cá nhân',
    color: 'green',
    position: 0,
  },
  {
    value: MKT_CUSTOMER_TYPE.BUSINESS,
    label: 'Doanh nghiệp',
    color: 'blue',
    position: 1,
  },
  {
    value: MKT_CUSTOMER_TYPE.ORGANIZATION,
    label: 'Tổ chức',
    color: 'purple',
    position: 2,
  },
];

export const MKT_CUSTOMER_TYPE_DEFAULT = `'${MKT_CUSTOMER_TYPE.INDIVIDUAL}'`;

export const MKT_CUSTOMER_TYPE_OPTIONS = {
  types: MKT_CUSTOMER_TYPE,
  options: MKT_CUSTOMER_TYPE_SELECT_OPTIONS,
  labels: {
    EN: {
      INDIVIDUAL: 'Individual',
      BUSINESS: 'Business',
      ORGANIZATION: 'Organization',
    },
    VI: {
      INDIVIDUAL: 'Cá nhân',
      BUSINESS: 'Doanh nghiệp',
      ORGANIZATION: 'Tổ chức',
    },
  },
};

export const MKT_CUSTOMER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
  PROSPECTIVE: 'PROSPECTIVE',
};

/** SELECT field options for Customer Status - use in WorkspaceEntity decorator */
export const MKT_CUSTOMER_STATUS_SELECT_OPTIONS: FieldMetadataComplexOption[] =
  [
    {
      value: MKT_CUSTOMER_STATUS.ACTIVE,
      label: 'Hoạt động',
      color: 'green',
      position: 0,
    },
    {
      value: MKT_CUSTOMER_STATUS.INACTIVE,
      label: 'Không hoạt động',
      color: 'gray',
      position: 1,
    },
    {
      value: MKT_CUSTOMER_STATUS.BLOCKED,
      label: 'Bị chặn',
      color: 'red',
      position: 2,
    },
    {
      value: MKT_CUSTOMER_STATUS.PROSPECTIVE,
      label: 'Tiềm năng',
      color: 'yellow',
      position: 3,
    },
  ];

export const MKT_CUSTOMER_STATUS_DEFAULT = `'${MKT_CUSTOMER_STATUS.ACTIVE}'`;

export const MKT_CUSTOMER_STATUS_OPTIONS = {
  status: MKT_CUSTOMER_STATUS,
  options: MKT_CUSTOMER_STATUS_SELECT_OPTIONS,
  labels: {
    EN: {
      ACTIVE: 'Active',
      INACTIVE: 'Inactive',
      BLOCKED: 'Blocked',
      PROSPECTIVE: 'Prospective',
    },
    VI: {
      ACTIVE: 'Hoạt động',
      INACTIVE: 'Không hoạt động',
      BLOCKED: 'Bị chặn',
      PROSPECTIVE: 'Tiềm năng',
    },
  },
};

export enum MKT_CUSTOMER_TIER {
  DIAMOND = 'DIAMOND', // 💎 Kim Cương
  GOLD = 'GOLD', // 🥇 Vàng
  SILVER = 'SILVER', // 🥈 Bạc
  BRONZE = 'BRONZE', // 🥉 Đồng
  DORMANT = 'DORMANT', // 😴 Không hoạt động
  CHURNED = 'CHURNED', // ❌ Rời bỏ
}

/** SELECT field options for Customer Tier - use in WorkspaceEntity decorator */
export const MKT_CUSTOMER_TIER_SELECT_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_CUSTOMER_TIER.BRONZE,
    label: 'Đồng',
    color: 'orange',
    position: 0,
  },
  { value: MKT_CUSTOMER_TIER.SILVER, label: 'Bạc', color: 'gray', position: 1 },
  {
    value: MKT_CUSTOMER_TIER.GOLD,
    label: 'Vàng',
    color: 'yellow',
    position: 2,
  },
  {
    value: MKT_CUSTOMER_TIER.DIAMOND,
    label: 'Kim Cương',
    color: 'blue',
    position: 3,
  },
  {
    value: MKT_CUSTOMER_TIER.DORMANT,
    label: 'Không hoạt động',
    color: 'gray',
    position: 4,
  },
  {
    value: MKT_CUSTOMER_TIER.CHURNED,
    label: 'Đã rời bỏ',
    color: 'red',
    position: 5,
  },
];

export const MKT_CUSTOMER_TIER_DEFAULT = `'${MKT_CUSTOMER_TIER.BRONZE}'`;

/**
 * Tier threshold configuration
 * Centralized thresholds for tier calculation
 */
export const MKT_CUSTOMER_TIER_THRESHOLDS = {
  [MKT_CUSTOMER_TIER.DIAMOND]: {
    minSpending: 10_000_000,
    minOrders: 20,
  },
  [MKT_CUSTOMER_TIER.GOLD]: {
    minSpending: 5_000_000,
    minOrders: 10,
  },
  [MKT_CUSTOMER_TIER.SILVER]: {
    minSpending: 2_000_000,
    minOrders: 5,
  },
  [MKT_CUSTOMER_TIER.BRONZE]: {
    minSpending: 500_000,
    minOrders: 1,
  },
} as const;

export const MKT_CUSTOMER_DATA_SEEDS_IDS = {
  DIAMOND_CUSTOMER: '49868053-4758-457f-9332-6ebd48af7ca6',
  GOLD_CUSTOMER: '1e75547f-3d1c-4da8-99a9-b716f3b17ab9',
  SILVER_CUSTOMER: '9c500415-1e6a-4320-8770-a6a33d03f0a2',
  BRONZE_CUSTOMER: 'cbdb1f84-693c-4f66-8049-93169a0231c4',
  CHURNED_CUSTOMER: '73afeb72-4c3b-49fc-8ea4-9cd345832132',
};

export const MKT_CUSTOMER_LIFECYCLE_STAGE = {
  PROSPECTIVE: 'PROSPECTIVE',
  TRIAL: 'TRIAL',
  CUSTOMER: 'CUSTOMER',
  LOYAL: 'LOYAL',
  CHURNED: 'CHURNED',
  RETENTION: 'RETENTION',
  UPSELL: 'UPSELL',
  CROSS_SELL: 'CROSS_SELL',
  REACTIVATION: 'REACTIVATION',
} as const;

/** SELECT field options for Lifecycle Stage - use in WorkspaceEntity decorator */
export const MKT_CUSTOMER_LIFECYCLE_STAGE_SELECT_OPTIONS: FieldMetadataComplexOption[] =
  [
    {
      value: MKT_CUSTOMER_LIFECYCLE_STAGE.PROSPECTIVE,
      label: 'Tiềm năng',
      color: 'yellow',
      position: 0,
    },
    {
      value: MKT_CUSTOMER_LIFECYCLE_STAGE.TRIAL,
      label: 'Dùng thử',
      color: 'blue',
      position: 1,
    },
    {
      value: MKT_CUSTOMER_LIFECYCLE_STAGE.CUSTOMER,
      label: 'Khách hàng',
      color: 'green',
      position: 2,
    },
    {
      value: MKT_CUSTOMER_LIFECYCLE_STAGE.LOYAL,
      label: 'Trung thành',
      color: 'purple',
      position: 3,
    },
    {
      value: MKT_CUSTOMER_LIFECYCLE_STAGE.CHURNED,
      label: 'Rời bỏ',
      color: 'red',
      position: 4,
    },
    {
      value: MKT_CUSTOMER_LIFECYCLE_STAGE.RETENTION,
      label: 'Giữ chân',
      color: 'orange',
      position: 5,
    },
  ];

export const MKT_CUSTOMER_LIFECYCLE_STAGE_DEFAULT = `'${MKT_CUSTOMER_LIFECYCLE_STAGE.PROSPECTIVE}'`;

export const MKT_CUSTOMER_LIFECYCLE_STAGE_OPTIONS = {
  lifecycleStages: MKT_CUSTOMER_LIFECYCLE_STAGE,
  options: MKT_CUSTOMER_LIFECYCLE_STAGE_SELECT_OPTIONS,
  labels: {
    EN: {
      PROSPECTIVE: 'Prospective',
      TRIAL: 'Trial',
      CUSTOMER: 'Customer',
      LOYAL: 'Loyal',
      CHURNED: 'Churned',
      RETENTION: 'Retention',
      UPSELL: 'Upsell',
      CROSS_SELL: 'Cross-sell',
      REACTIVATION: 'Reactivation',
    },
    VI: {
      PROSPECTIVE: 'Tiềm năng',
      TRIAL: 'Dùng thử',
      CUSTOMER: 'Khách hàng',
      LOYAL: 'Trung thành',
      CHURNED: 'Rời bỏ',
      RETENTION: 'Giữ chân',
      UPSELL: 'Bán thêm',
      CROSS_SELL: 'Bán chéo',
      REACTIVATION: 'Tái kích hoạt',
    },
  },
};

export const MKT_CUSTOMER_TAGS = {
  VIP: 'VIP',
  HIGH_VALUE: 'HIGH_VALUE',
  POTENTIAL_CHURN: 'POTENTIAL_CHURN',
  SUPPORT_INTENSIVE: 'SUPPORT_INTENSIVE',
  REFERRAL_SOURCE: 'REFERRAL_SOURCE',
  QUICK_PAYER: 'QUICK_PAYER',
  NEGOTIATOR: 'NEGOTIATOR',
  ENTERPRISE_PROSPECT: 'ENTERPRISE_PROSPECT',
} as const;

export const MKT_CUSTOMER_TIER_OPTIONS = {
  tiers: MKT_CUSTOMER_TIER,
  options: [
    {
      value: MKT_CUSTOMER_TIER.DIAMOND,
      color: 'blue',
      label: 'Kim Cương',
      position: 1,
    },
    {
      value: MKT_CUSTOMER_TIER.GOLD,
      color: 'yellow',
      label: 'Vàng',
      position: 2,
    },
    {
      value: MKT_CUSTOMER_TIER.SILVER,
      color: 'gray',
      label: 'Bạc',
      position: 3,
    },
    {
      value: MKT_CUSTOMER_TIER.BRONZE,
      color: 'brown',
      label: 'Đồng',
      position: 4,
    },
    {
      value: MKT_CUSTOMER_TIER.DORMANT,
      color: 'lightgray',
      label: 'Không hoạt động',
      position: 5,
    },
    {
      value: MKT_CUSTOMER_TIER.CHURNED,
      color: 'darkgray',
      label: 'Rời bỏ',
      position: 6,
    },
  ],
  labels: {
    EN: {
      DIAMOND: 'Diamond',
      GOLD: 'Gold',
      SILVER: 'Silver',
      BRONZE: 'Bronze',
      DORMANT: 'Dormant',
      CHURNED: 'Churned',
    },
    VI: {
      DIAMOND: 'Kim Cương',
      GOLD: 'Vàng',
      SILVER: 'Bạc',
      BRONZE: 'Đồng',
      DORMANT: 'Không hoạt động',
      CHURNED: 'Rời bỏ',
    },
  },
};
export const MKT_CUSTOMER_TAGS_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_CUSTOMER_TAGS.VIP,
    label: 'VIP',
    color: 'blue',
    position: 1,
  },
  {
    value: MKT_CUSTOMER_TAGS.HIGH_VALUE,
    label: 'High Value',
    color: 'green',
    position: 2,
  },
  {
    value: MKT_CUSTOMER_TAGS.POTENTIAL_CHURN,
    label: 'Potential Churn',
    color: 'red',
    position: 3,
  },
  {
    value: MKT_CUSTOMER_TAGS.SUPPORT_INTENSIVE,
    label: 'Support Intensive',
    color: 'orange',
    position: 4,
  },
  {
    value: MKT_CUSTOMER_TAGS.REFERRAL_SOURCE,
    label: 'Referral Source',
    color: 'green',
    position: 5,
  },
  {
    value: MKT_CUSTOMER_TAGS.QUICK_PAYER,
    label: 'Quick Payer',
    color: 'purple',
    position: 6,
  },
  {
    value: MKT_CUSTOMER_TAGS.NEGOTIATOR,
    label: 'Negotiator',
    color: 'pink',
    position: 7,
  },
  {
    value: MKT_CUSTOMER_TAGS.ENTERPRISE_PROSPECT,
    label: 'Enterprise Prospect',
    color: 'red',
    position: 8,
  },
];

export const MKT_CUSTOMER_COMPANY_SIZE = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
};

export const MKT_CUSTOMER_COMPANY_SIZE_OPTIONS = {
  sizes: MKT_CUSTOMER_COMPANY_SIZE,
  options: [
    {
      value: MKT_CUSTOMER_COMPANY_SIZE.SMALL,
      color: 'green',
      label: 'Nhỏ (1-10 nhân viên)',
      position: 1,
    },
    {
      value: MKT_CUSTOMER_COMPANY_SIZE.MEDIUM,
      color: 'yellow',
      label: 'Vừa (11-50 nhân viên)',
      position: 2,
    },
    {
      value: MKT_CUSTOMER_COMPANY_SIZE.LARGE,
      color: 'red',
      label: 'Lớn (51-200 nhân viên)',
      position: 3,
    },
  ],
  labels: {
    EN: {
      SMALL: 'Small (1-10 employees)',
      MEDIUM: 'Medium (11-50 employees)',
      LARGE: 'Large (51-200 employees)',
    },
    VI: {
      SMALL: 'Nhỏ (1-10 nhân viên)',
      MEDIUM: 'Vừa (11-50 nhân viên)',
      LARGE: 'Lớn (51-200 nhân viên)',
    },
  },
};

export const MKT_CUSTOMER_INDUSTRY = {
  IT: 'IT',
  FINANCE: 'FINANCE',
  MANUFACTURING: 'MANUFACTURING',
};

export const MKT_CUSTOMER_INDUSTRY_OPTIONS = {
  industries: MKT_CUSTOMER_INDUSTRY,
  options: [
    {
      value: MKT_CUSTOMER_INDUSTRY.IT,
      color: 'blue',
      label: 'Công nghệ thông tin',
      position: 1,
    },
    {
      value: MKT_CUSTOMER_INDUSTRY.FINANCE,
      color: 'green',
      label: 'Tài chính',
      position: 2,
    },
    {
      value: MKT_CUSTOMER_INDUSTRY.MANUFACTURING,
      color: 'orange',
      label: 'Sản xuất',
      position: 3,
    },
  ],
  labels: {
    EN: {
      IT: 'Information Technology',
      FINANCE: 'Finance',
      MANUFACTURING: 'Manufacturing',
    },
    VI: {
      IT: 'Công nghệ thông tin',
      FINANCE: 'Tài chính',
      MANUFACTURING: 'Sản xuất',
    },
  },
};

/**
 * Categorization thresholds for customer lifecycle stage
 * Used by MktCustomerCategorizationService
 */
export const MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS = {
  /** Days since last order to consider customer as churned */
  CHURNED_DAYS: 180,
  /** Days since last order to consider customer at risk (retention target) */
  RETENTION_DAYS: 90,
  /** Minimum orders to be considered loyal */
  LOYAL_MIN_ORDERS: 5,
  /** Minimum total value to be considered loyal (VND) */
  LOYAL_MIN_VALUE: 5_000_000,
  /** Days since first order to be considered trial */
  TRIAL_MAX_DAYS: 30,
} as const;

/**
 * Auto-assign configuration
 */
export const MKT_CUSTOMER_AUTO_ASSIGN_CONFIG = {
  /** Enable auto-assign for new customers */
  ENABLED: true,
  /** Assignment strategy: 'round_robin' | 'least_customers' | 'random' */
  STRATEGY: 'round_robin' as const,
  /** Role IDs eligible for auto-assignment */
  ELIGIBLE_ROLES: ['sales', 'account_manager'],
} as const;
