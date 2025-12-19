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
  // Service Package items
  SERVICE_ITEM_1: 'b8b9b0b1-2c2d-4d4e-5f6a-7b8c9d0e1f2a',
  SERVICE_ITEM_2: 'c9c0c1c2-3d3e-4e5f-6a7b-8c9d0e1f2a3b',
  // Custom Bundle items
  CUSTOM_ITEM_1: 'd0d1d2d3-4e4f-4f6a-7b8c-9d0e1f2a3b4c',
};

export const MKT_GENERIC_COMBO_ITEM_DATA_SEEDS: MktGenericComboItemDataSeed[] =
  [
    // ============================================
    // STARTER PACK ITEMS (DIGITAL_EXTERNAL)
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.STARTER_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'MKT Basic License',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 0,
      externalProductId: 'prod-mkt-basic-001',
      externalProductCode: 'MKT-BASIC',
      externalPackageId: 'pkg-basic-monthly',
      externalPackageCode: 'MKT-BASIC-M',
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
      displayName: 'Setup Support',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 1,
      externalProductId: null,
      externalProductCode: null,
      externalPackageId: null,
      externalPackageCode: null,
      mktProductId: null,
      mktVariantId: null,
      serviceName: 'Initial Setup Support',
      serviceDescription: 'Hỗ trợ cài đặt và cấu hình ban đầu',
      servicePrice: 200000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.STARTER_PACK,
    },

    // ============================================
    // BUSINESS BUNDLE ITEMS (DIGITAL_EXTERNAL + SERVICE)
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.BUSINESS_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'MKT Pro License',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 0,
      externalProductId: 'prod-mkt-pro-001',
      externalProductCode: 'MKT-PRO',
      externalPackageId: 'pkg-pro-yearly',
      externalPackageCode: 'MKT-PRO-Y',
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
      displayName: 'Analytics Add-on',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: null,
      position: 1,
      externalProductId: 'prod-analytics-001',
      externalProductCode: 'ANALYTICS',
      externalPackageId: 'pkg-analytics-yearly',
      externalPackageCode: 'ANALYTICS-Y',
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
      displayName: 'Premium Support',
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
      serviceDescription: 'Hỗ trợ kỹ thuật ưu tiên 24/7',
      servicePrice: 1000000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.BUSINESS_BUNDLE,
    },

    // ============================================
    // ENTERPRISE SUITE ITEMS
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.ENTERPRISE_ITEM_1,
      itemType: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
      displayName: 'MKT Enterprise License',
      quantity: 5,
      overridePrice: null,
      position: 0,
      externalProductId: 'prod-mkt-ent-001',
      externalProductCode: 'MKT-ENT',
      externalPackageId: 'pkg-ent-yearly',
      externalPackageCode: 'MKT-ENT-Y',
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
      itemType: COMBO_ITEM_TYPE.CUSTOM,
      displayName: 'Custom Integration',
      quantity: GENERIC_COMBO_DEFAULTS.QUANTITY,
      overridePrice: 5000000,
      position: 1,
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
    // SERVICE PACKAGE ITEMS
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.SERVICE_ITEM_1,
      itemType: COMBO_ITEM_TYPE.SERVICE,
      displayName: 'Consultation Service',
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
      serviceDescription: 'Tư vấn chuyên gia (10 giờ)',
      servicePrice: 500000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SERVICE_PACKAGE,
    },
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.SERVICE_ITEM_2,
      itemType: COMBO_ITEM_TYPE.SERVICE,
      displayName: 'Training Service',
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
      serviceDescription: 'Đào tạo nhóm (2 buổi)',
      servicePrice: 1500000,
      customName: null,
      customDescription: null,
      customPrice: null,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.SERVICE_PACKAGE,
    },

    // ============================================
    // CUSTOM BUNDLE ITEMS
    // ============================================
    {
      id: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS_IDS.CUSTOM_ITEM_1,
      itemType: COMBO_ITEM_TYPE.CUSTOM,
      displayName: 'Custom Feature',
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
      customDescription: 'Phát triển tính năng tùy chỉnh',
      customPrice: 3000000,
      genericComboId: MKT_GENERIC_COMBO_DATA_SEEDS_IDS.CUSTOM_BUNDLE,
    },
  ];
