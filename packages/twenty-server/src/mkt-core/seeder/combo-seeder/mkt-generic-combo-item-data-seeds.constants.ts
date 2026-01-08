import {
  COMBO_ITEM_TYPE,
  ComboItemType,
  GENERIC_COMBO_DEFAULTS,
} from 'src/mkt-core/mkt-combo/constants';

import { MKT_GENERIC_COMBO_DATA_SEEDS_IDS } from './mkt-generic-combo-data-seeds.constants';

type MktGenericComboItemDataSeed = {
  id: string;
  itemType: ComboItemType;
  displayName: string | null;
  quantity: number;
  overridePrice: number | null;
  position: number;
  // DIGITAL_EXTERNAL fields
  externalProductId: string | null;
  externalProductCode: string | null;
  externalPackageId: string | null;
  externalPackageCode: string | null;
  // INTERNAL_PRODUCT fields
  mktProductId: string | null;
  // INTERNAL_VARIANT fields
  mktVariantId: string | null;
  // SERVICE fields
  serviceName: string | null;
  serviceDescription: string | null;
  servicePrice: number | null;
  // CUSTOM fields
  customName: string | null;
  customDescription: string | null;
  customPrice: number | null;
  // Parent relation
  genericComboId: string;
};

export const MKT_GENERIC_COMBO_ITEM_DATA_SEED_COLUMNS: (keyof MktGenericComboItemDataSeed)[] =
  [
    'id',
    'itemType',
    'displayName',
    'quantity',
    'overridePrice',
    'position',
    'externalProductId',
    'externalProductCode',
    'externalPackageId',
    'externalPackageCode',
    'mktProductId',
    'mktVariantId',
    'serviceName',
    'serviceDescription',
    'servicePrice',
    'customName',
    'customDescription',
    'customPrice',
    'genericComboId',
  ];

/**
 * IDs của Product và Package từ MKT Server (Redis cache)
 * Cập nhật từ dữ liệu thực tế
 */
export const MKT_EXTERNAL_PRODUCT_IDS = {
  // Product: Advanced Tự động hóa Marketing
  MARKETING_AUTOMATION: '0199e0fd-fe2b-714f-b502-11dff2d3b28e',
  // Product: Advanced Quản lý quan hệ khách hàng
  CRM: '0199e0fd-fe2e-718d-bafd-4c3bbc7fa59a',
  // Product: Ultimate Phân tích & Báo cáo
  ANALYTICS: '0199e0fd-fe2e-718d-bafd-533d14117ca5',
} as const;

export const MKT_EXTERNAL_PACKAGE_IDS = {
  // Marketing Automation packages
  MARKETING_BASIC_MONTHLY: '0199e6e1-7935-714e-b8fa-7a2f2e78c643',
  MARKETING_PRO_YEARLY: '0199e6e1-7935-714e-b8fa-7c6cbc5a7f30',
  MARKETING_ENTERPRISE_LIFETIME: '0199e6e1-7935-714e-b8fa-8370ec4b8f16',
  // CRM packages
  CRM_STARTER_MONTHLY: '0199e6e1-7935-714e-b8fa-8eeb240ee18f',
  CRM_PROFESSIONAL_YEARLY: '0199e6e1-7935-714e-b8fa-90832f9e0f37',
  CRM_ENTERPRISE_LIFETIME: '0199e6e1-7935-714e-b8fa-9539aea4f032',
  // Analytics packages
  ANALYTICS_BASIC_MONTHLY: '0199e6e1-7935-714e-b8fa-a04c464b1cfc',
  ANALYTICS_PRO_YEARLY: '0199e6e1-7935-714e-b8fa-a4b9618ac450',
} as const;

export const MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS = {
  // Starter Pack items
  STARTER_ITEM_1: 'a1a2a3a4-b5b6-4c7d-8e9f-0a1b2c3d4e5f',
  STARTER_ITEM_2: 'b2b3b4b5-c6c7-4d8e-9f0a-1b2c3d4e5f6a',
  // Business Bundle items
  BUSINESS_ITEM_1: 'c3c4c5c6-d7d8-4e9f-0a1b-2c3d4e5f6a7b',
  BUSINESS_ITEM_2: 'd4d5d6d7-e8e9-4f0a-1b2c-3d4e5f6a7b8c',
  BUSINESS_ITEM_3: 'e5e6e7e8-f9f0-4a1b-2c3d-4e5f6a7b8c9d',
  // Enterprise Suite items
  ENTERPRISE_ITEM_1: 'f6f7f8f9-0a0b-4b2c-3d4e-5f6a7b8c9d0e',
  ENTERPRISE_ITEM_2: 'a7a8a9a0-1b1c-4c3d-4e5f-6a7b8c9d0e1f',
  ENTERPRISE_ITEM_3: 'a8a9a0a1-2b2c-4d3e-5f6a-7b8c9d0e1f2a',
  // Marketing Kit items
  MARKETING_ITEM_1: 'b9b0b1b2-3c3d-4e4f-6a7b-8c9d0e1f2a3b',
  MARKETING_ITEM_2: 'c0c1c2c3-4d4e-4f5a-7b8c-9d0e1f2a3b4c',
  // Service Package items
  SERVICE_ITEM_1: 'b8b9b0b1-2c2d-4d4e-5f6a-7b8c9d0e1f2a',
  SERVICE_ITEM_2: 'c9c0c1c2-3d3e-4e5f-6a7b-8c9d0e1f2a3b',
  // Custom Bundle items
  CUSTOM_ITEM_1: 'd0d1d2d3-4e4f-4f6a-7b8c-9d0e1f2a3b4c',
  CUSTOM_ITEM_2: 'e1e2e3e4-5f5a-4a6b-8c9d-0e1f2a3b4c5d',
  // Trial Combo items
  TRIAL_ITEM_1: 'f2f3f4f5-6a6b-4b7c-9d0e-1f2a3b4c5d6e',
};

export const MKT_GENERIC_COMBO_ITEM_DATA_SEEDS: MktGenericComboItemDataSeed[] =
  [
    // ============================================
    // STARTER PACK ITEMS
    // Gói khởi động: CRM Starter + Setup Support
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.STARTER_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'CRM Starter - Tháng',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 0,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.CRM,
      externalProductCode: 'PRODUCT_002_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.CRM_STARTER_MONTHLY,
      externalPackageCode: 'STARTER-MONTHLY',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.STARTER_PACK,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.STARTER_ITEM_2,
      itemType: COMBO_ITEM_TYPE.SERVICE,
      displayName: 'Hỗ trợ cài đặt',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 1,
      externalProductId: null,
      externalProductCode: null,
      externalPackageId: null,
      externalPackageCode: null,
      mktProductId: null,
      mktVariantId: null,
      serviceName: 'Hỗ trợ cài đặt ban đầu',
      serviceDescription: 'Hỗ trợ kỹ thuật viên cài đặt và cấu hình hệ thống',
      servicePrice: 200000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.STARTER_PACK,
    },

    // ============================================
    // BUSINESS BUNDLE ITEMS
    // Gói doanh nghiệp: Marketing Pro + CRM Pro + Premium Support
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.BUSINESS_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'Marketing Automation Pro - Năm',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 0,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.MARKETING_AUTOMATION,
      externalProductCode: 'PRODUCT_001_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.MARKETING_PRO_YEARLY,
      externalPackageCode: 'PRO-YEARLY',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.BUSINESS_BUNDLE,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.BUSINESS_ITEM_2,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'CRM Professional - Năm',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 1,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.CRM,
      externalProductCode: 'PRODUCT_002_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.CRM_PROFESSIONAL_YEARLY,
      externalPackageCode: 'PROFESSIONAL-YEARLY',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.BUSINESS_BUNDLE,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.BUSINESS_ITEM_3,
      itemType: COMBO_ITEM_TYPE.SERVICE,
      displayName: 'Hỗ trợ kỹ thuật cao cấp',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 2,
      externalProductId: null,
      externalProductCode: null,
      externalPackageId: null,
      externalPackageCode: null,
      mktProductId: null,
      mktVariantId: null,
      serviceName: 'Premium Technical Support',
      serviceDescription: 'Hỗ trợ kỹ thuật ưu tiên 24/7 trong 1 năm',
      servicePrice: 1000000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.BUSINESS_BUNDLE,
    },

    // ============================================
    // ENTERPRISE SUITE ITEMS
    // Gói doanh nghiệp lớn: 3 sản phẩm Enterprise + Custom Integration
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.ENTERPRISE_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'Marketing Automation Enterprise - Vĩnh viễn',
      quantity: 5,
      overridePrice: null,
      position: 0,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.MARKETING_AUTOMATION,
      externalProductCode: 'PRODUCT_001_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.MARKETING_ENTERPRISE_LIFETIME,
      externalPackageCode: 'ENTERPRISE-LIFETIME',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.ENTERPRISE_SUITE,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.ENTERPRISE_ITEM_2,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'CRM Enterprise - Vĩnh viễn',
      quantity: 5,
      overridePrice: null,
      position: 1,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.CRM,
      externalProductCode: 'PRODUCT_002_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.CRM_ENTERPRISE_LIFETIME,
      externalPackageCode: 'ENTERPRISE-LIFETIME',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.ENTERPRISE_SUITE,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.ENTERPRISE_ITEM_3,
      itemType: COMBO_ITEM_TYPE.CUSTOM,
      displayName: 'Tích hợp API tùy chỉnh',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 2,
      externalProductId: null,
      externalProductCode: null,
      externalPackageId: null,
      externalPackageCode: null,
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: 'Custom API Integration',
      customDescription: 'Tích hợp API theo yêu cầu doanh nghiệp',
      customPrice: 5000000,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.ENTERPRISE_SUITE,
    },

    // ============================================
    // MARKETING KIT ITEMS
    // Gói Marketing: Marketing Basic + Analytics Basic
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.MARKETING_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'Marketing Automation Basic - Tháng',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 0,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.MARKETING_AUTOMATION,
      externalProductCode: 'PRODUCT_001_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.MARKETING_BASIC_MONTHLY,
      externalPackageCode: 'BASIC-MONTHLY',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.MARKETING_KIT,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.MARKETING_ITEM_2,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'Analytics Basic - Tháng',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 1,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.ANALYTICS,
      externalProductCode: 'PRODUCT_003_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.ANALYTICS_BASIC_MONTHLY,
      externalPackageCode: 'ANALYTICS-BASIC',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.MARKETING_KIT,
    },

    // ============================================
    // SERVICE PACKAGE ITEMS
    // Gói dịch vụ cao cấp: Tư vấn + Đào tạo
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.SERVICE_ITEM_1,
      itemType: COMBO_ITEM_TYPE.SERVICE,
      displayName: 'Tư vấn chuyên gia',
      quantity: 10,
      overridePrice: null,
      position: 0,
      externalProductId: null,
      externalProductCode: null,
      externalPackageId: null,
      externalPackageCode: null,
      mktProductId: null,
      mktVariantId: null,
      serviceName: 'Expert Consultation',
      serviceDescription: 'Tư vấn chuyên gia về chiến lược marketing (10 giờ)',
      servicePrice: 500000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SERVICE_PACKAGE,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.SERVICE_ITEM_2,
      itemType: COMBO_ITEM_TYPE.SERVICE,
      displayName: 'Đào tạo nhóm',
      quantity: 2,
      overridePrice: null,
      position: 1,
      externalProductId: null,
      externalProductCode: null,
      externalPackageId: null,
      externalPackageCode: null,
      mktProductId: null,
      mktVariantId: null,
      serviceName: 'Team Training',
      serviceDescription: 'Đào tạo sử dụng hệ thống cho nhóm (2 buổi x 4 giờ)',
      servicePrice: 1500000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SERVICE_PACKAGE,
    },

    // ============================================
    // CUSTOM BUNDLE ITEMS
    // Gói tùy chỉnh: Custom Development + Integration
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.CUSTOM_ITEM_1,
      itemType: COMBO_ITEM_TYPE.CUSTOM,
      displayName: 'Phát triển tùy chỉnh',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 0,
      externalProductId: null,
      externalProductCode: null,
      externalPackageId: null,
      externalPackageCode: null,
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: 'Custom Development',
      customDescription: 'Phát triển tính năng tùy chỉnh theo yêu cầu',
      customPrice: 3000000,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.CUSTOM_BUNDLE,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.CUSTOM_ITEM_2,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'Analytics Pro - Năm',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 1,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.ANALYTICS,
      externalProductCode: 'PRODUCT_003_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.ANALYTICS_PRO_YEARLY,
      externalPackageCode: 'ANALYTICS-PRO',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.CUSTOM_BUNDLE,
    },

    // ============================================
    // TRIAL COMBO ITEMS
    // Gói dùng thử: CRM Starter miễn phí
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.TRIAL_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'CRM Starter Trial',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: 0,
      position: 0,
      externalProductId: MKT_EXTERNAL_PRODUCT_IDS.CRM,
      externalProductCode: 'PRODUCT_002_2026',
      externalPackageId: MKT_EXTERNAL_PACKAGE_IDS.CRM_STARTER_MONTHLY,
      externalPackageCode: 'STARTER-MONTHLY',
      mktProductId: null,
      mktVariantId: null,
      serviceName: null,
      serviceDescription: null,
      servicePrice: null,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.TRIAL_COMBO,
    },
  ];
