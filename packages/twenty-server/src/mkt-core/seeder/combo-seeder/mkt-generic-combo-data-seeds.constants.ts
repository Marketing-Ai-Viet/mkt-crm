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

/**
 * Seed data for Generic Combo
 *
 * Dữ liệu tham chiếu đến Product/Package thực tế từ MKT Server (Redis cache):
 * - PRODUCT_001_2026: Advanced Tự động hóa Marketing
 *   + BASIC-MONTHLY: 299,000 VND
 *   + PRO-YEARLY: 2,990,000 VND
 *   + ENTERPRISE-LIFETIME: 19,990,000 VND
 *
 * - PRODUCT_002_2026: Advanced Quản lý quan hệ khách hàng (CRM)
 *   + STARTER-MONTHLY: 199,000 VND
 *   + PROFESSIONAL-YEARLY: 1,990,000 VND
 *   + ENTERPRISE-LIFETIME: 14,990,000 VND
 *
 * - PRODUCT_003_2026: Ultimate Phân tích & Báo cáo
 *   + ANALYTICS-BASIC: 149,000 VND
 *   + ANALYTICS-PRO: 1,490,000 VND
 */
export const MKT_GENERIC_COMBO_DATA_SEEDS: MktGenericComboDataSeed[] = [
  // ============================================
  // STARTER PACK
  // CRM Starter (199,000) + Setup Support (200,000) = 399,000
  // Fixed Price: 350,000 (tiết kiệm 49,000)
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.STARTER_PACK,
    comboCode: 'STARTER-PACK-2026',
    name: 'Gói Khởi Động CRM',
    description:
      'Gói khởi động dành cho khách hàng mới - bao gồm CRM Starter và hỗ trợ cài đặt',
    pricingType: GENERIC_COMBO_PRICING_TYPE.FIXED,
    fixedPrice: 350000,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T23:59:59Z'),
    metadata: {
      targetAudience: 'new_customers',
      promotionCode: 'START2026',
      products: ['CRM'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },

  // ============================================
  // BUSINESS BUNDLE
  // Marketing Pro (2,990,000) + CRM Pro (1,990,000) + Support (1,000,000) = 5,980,000
  // Sum pricing
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.BUSINESS_BUNDLE,
    comboCode: 'BIZ-BUNDLE-PRO-2026',
    name: 'Gói Doanh Nghiệp Pro',
    description:
      'Combo Marketing Automation Pro + CRM Professional với hỗ trợ kỹ thuật 24/7',
    pricingType: GENERIC_COMBO_PRICING_TYPE.SUM,
    fixedPrice: null,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: null,
    metadata: {
      tier: 'professional',
      features: ['marketing-automation', 'crm', 'premium-support'],
      products: ['PRODUCT_001_2026', 'PRODUCT_002_2026'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },

  // ============================================
  // ENTERPRISE SUITE
  // 5x Marketing Enterprise (19,990,000) + 5x CRM Enterprise (14,990,000) + Custom (5,000,000)
  // = 5*(19,990,000 + 14,990,000) + 5,000,000 = 179,900,000
  // Giảm 15%
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.ENTERPRISE_SUITE,
    comboCode: 'ENT-SUITE-2026',
    name: 'Giải Pháp Doanh Nghiệp Lớn',
    description:
      'Giải pháp toàn diện với 5 license Marketing + CRM Enterprise và tích hợp API tùy chỉnh',
    pricingType: GENERIC_COMBO_PRICING_TYPE.DISCOUNT,
    fixedPrice: null,
    discountPercent: 15,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: null,
    metadata: {
      tier: 'enterprise',
      slaLevel: 'premium',
      dedicatedSupport: true,
      licenseCount: 5,
      products: ['PRODUCT_001_2026', 'PRODUCT_002_2026'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },

  // ============================================
  // MARKETING KIT
  // Marketing Basic (299,000) + Analytics Basic (149,000) = 448,000
  // Fixed Price: 400,000 (tiết kiệm 48,000)
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.MARKETING_KIT,
    comboCode: 'MKT-KIT-2026',
    name: 'Bộ Công Cụ Marketing',
    description:
      'Combo Marketing Automation Basic và Analytics Basic - công cụ thiết yếu cho marketer',
    pricingType: GENERIC_COMBO_PRICING_TYPE.FIXED,
    fixedPrice: 400000,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: null,
    validTo: null,
    metadata: {
      category: 'marketing',
      tools: ['marketing-automation', 'analytics'],
      products: ['PRODUCT_001_2026', 'PRODUCT_003_2026'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },

  // ============================================
  // SERVICE PACKAGE
  // Expert Consultation 10h (10 x 500,000) + Training 2 buổi (2 x 1,500,000) = 8,000,000
  // Giảm 20%
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SERVICE_PACKAGE,
    comboCode: 'SVC-PKG-PREMIUM-2026',
    name: 'Gói Dịch Vụ Cao Cấp',
    description:
      'Combo tư vấn chuyên gia 10 giờ và đào tạo nhóm 2 buổi với giá ưu đãi',
    pricingType: GENERIC_COMBO_PRICING_TYPE.DISCOUNT,
    fixedPrice: null,
    discountPercent: 20,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T00:00:00Z'),
    metadata: {
      serviceLevel: 'premium',
      responseTime: '4h',
      availability: '24/7',
      consultingHours: 10,
      trainingSession: 2,
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },

  // ============================================
  // CUSTOM BUNDLE
  // Custom Development (3,000,000) + Analytics Pro (1,490,000) = 4,490,000
  // Sum pricing
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.CUSTOM_BUNDLE,
    comboCode: 'CUSTOM-BDL-2026',
    name: 'Gói Tùy Chỉnh',
    description:
      'Combo phát triển tính năng tùy chỉnh kết hợp Analytics Pro để theo dõi hiệu quả',
    pricingType: GENERIC_COMBO_PRICING_TYPE.SUM,
    fixedPrice: null,
    discountPercent: null,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: true,
    validFrom: null,
    validTo: null,
    metadata: {
      customizable: true,
      products: ['PRODUCT_003_2026'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },

  // ============================================
  // SEASONAL PROMO (Inactive)
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SEASONAL_PROMO,
    comboCode: 'SEASON-SPRING-2026',
    name: 'Khuyến Mãi Mùa Xuân 2026',
    description: 'Chương trình khuyến mãi mùa xuân - giảm 30% tất cả sản phẩm',
    pricingType: GENERIC_COMBO_PRICING_TYPE.DISCOUNT,
    fixedPrice: null,
    discountPercent: 30,
    currency: GENERIC_COMBO_DEFAULTS.CURRENCY,
    isActive: false,
    validFrom: new Date('2026-02-01T00:00:00Z'),
    validTo: new Date('2026-04-30T23:59:59Z'),
    metadata: {
      season: 'spring',
      year: 2026,
      limitedTime: true,
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },

  // ============================================
  // TRIAL COMBO
  // CRM Starter với overridePrice = 0
  // ============================================
  {
    id: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.TRIAL_COMBO,
    comboCode: 'TRIAL-7DAY-FREE',
    name: 'Gói Dùng Thử 7 Ngày',
    description: 'Dùng thử CRM Starter miễn phí trong 7 ngày',
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
      products: ['PRODUCT_002_2026'],
    },
    version: GENERIC_COMBO_DEFAULTS.VERSION,
    lastModifiedById: null,
  },
];
