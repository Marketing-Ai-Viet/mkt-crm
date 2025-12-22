import {
  GENERIC_COMBO_PRICING_TYPE,
  GenericComboPricingType,
  GENERIC_COMBO_DEFAULTS,
} from 'src/mkt-core/mkt-combo/constants';

type MktGenericComboDataSeed = {
  id: string;
  comboCode: string;
  name: string;
  description: string | null;
  pricingType: GenericComboPricingType;
  fixedPrice: number | null;
  discountPercent: number | null;
  currency: string;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  metadata: Record<string, unknown> | null;
  version: number;
  lastModifiedById: string | null;
};

export const MKT_GENERIC_COMBO_DATA_SEED_COLUMNS: (keyof MktGenericComboDataSeed)[] =
  [
    'id',
    'comboCode',
    'name',
    'description',
    'pricingType',
    'fixedPrice',
    'discountPercent',
    'currency',
    'isActive',
    'validFrom',
    'validTo',
    'metadata',
    'version',
    'lastModifiedById',
  ];

export const MKT_GENERIC_COMBO_DATA_SEEDS_IDS = {
  STARTER_PACK: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  BUSINESS_BUNDLE: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  ENTERPRISE_SUITE: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  MARKETING_KIT: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
  SERVICE_PACKAGE: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
  CUSTOM_BUNDLE: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
  SEASONAL_PROMO: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
  TRIAL_COMBO: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e',
};

export const MKT_GENERIC_COMBO_DATA_SEEDS: MktGenericComboDataSeed[] = [
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.STARTER_PACK,
    comboCode: 'STARTER-PACK-2024',
    name: 'Starter Pack',
    description: 'Gói khởi động dành cho khách hàng mới',
    pricingType: GENERIC_COMBO_PRICING_TYPE.FIXED,
    fixedPrice: 999000,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2024-01-01T00:00:00Z'),
    validTo: new Date('2025-12-31T23:59:59Z'),
    metadata: {
      targetAudience: 'new_customers',
      promotionCode: 'START2024',
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.BUSINESS_BUNDLE,
    comboCode: 'BIZ-BUNDLE-PRO',
    name: 'Business Bundle Pro',
    description: 'Gói doanh nghiệp chuyên nghiệp với đầy đủ tính năng',
    pricingType: GENERIC_COMBO_PRICING_TYPE.SUM,
    fixedPrice: null,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2024-01-01T00:00:00Z'),
    validTo: null,
    metadata: {
      tier: 'professional',
      features: ['analytics', 'support', 'customization'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.ENTERPRISE_SUITE,
    comboCode: 'ENT-SUITE-2024',
    name: 'Enterprise Suite',
    description: 'Giải pháp toàn diện cho doanh nghiệp lớn',
    pricingType: GENERIC_COMBO_PRICING_TYPE.DISCOUNT,
    fixedPrice: null,
    discountPercent: 15,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2024-01-01T00:00:00Z'),
    validTo: null,
    metadata: {
      tier: 'enterprise',
      slaLevel: 'premium',
      dedicatedSupport: true,
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.MARKETING_KIT,
    comboCode: 'MKT-KIT-BASIC',
    name: 'Marketing Kit Basic',
    description: 'Bộ công cụ marketing cơ bản',
    pricingType: GENERIC_COMBO_PRICING_TYPE.FIXED,
    fixedPrice: 2500000,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: null,
    validTo: null,
    metadata: {
      category: 'marketing',
      tools: ['email', 'sms', 'social'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SERVICE_PACKAGE,
    comboCode: 'SVC-PKG-PREMIUM',
    name: 'Service Package Premium',
    description: 'Gói dịch vụ cao cấp với hỗ trợ ưu tiên',
    pricingType: GENERIC_COMBO_PRICING_TYPE.DISCOUNT,
    fixedPrice: null,
    discountPercent: 20,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2024-06-01T00:00:00Z'),
    validTo: new Date('2025-06-01T00:00:00Z'),
    metadata: {
      serviceLevel: 'premium',
      responseTime: '4h',
      availability: '24/7',
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.CUSTOM_BUNDLE,
    comboCode: 'CUSTOM-BDL-001',
    name: 'Custom Bundle',
    description: 'Gói tùy chỉnh theo yêu cầu khách hàng',
    pricingType: GENERIC_COMBO_PRICING_TYPE.SUM,
    fixedPrice: null,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: null,
    validTo: null,
    metadata: {
      customizable: true,
      minItems: 2,
      maxItems: 10,
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SEASONAL_PROMO,
    comboCode: 'SEASON-WINTER-2024',
    name: 'Winter Promotion 2024',
    description: 'Khuyến mãi mùa đông 2024',
    pricingType: GENERIC_COMBO_PRICING_TYPE.DISCOUNT,
    fixedPrice: null,
    discountPercent: 30,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: false,
    validFrom: new Date('2024-11-01T00:00:00Z'),
    validTo: new Date('2025-02-28T23:59:59Z'),
    metadata: {
      season: 'winter',
      year: 2024,
      limitedTime: true,
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.TRIAL_COMBO,
    comboCode: 'TRIAL-7DAY-FREE',
    name: 'Trial Combo 7 Days',
    description: 'Gói dùng thử 7 ngày miễn phí',
    pricingType: GENERIC_COMBO_PRICING_TYPE.FIXED,
    fixedPrice: 0,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: null,
    validTo: null,
    metadata: {
      trialDays: 7,
      autoRenew: false,
      requiresPaymentMethod: false,
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
];
