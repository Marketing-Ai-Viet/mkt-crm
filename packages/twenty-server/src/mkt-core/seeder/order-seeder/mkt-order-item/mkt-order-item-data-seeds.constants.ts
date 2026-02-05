import { MKT_ORDER_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/order-seeder/order/mkt-order-data-seeds.constants';
import {
  LICENSE_ITEM_STATUS,
  LicenseItemStatus,
} from 'src/mkt-core/order/constants/license-item-status.constants';
import {
  MktPackageSnapshot,
  MktProductSnapshot,
  MktSupportedLanguage,
  OrderItemLicense,
  OrderItemSource,
  OrderItemType,
  GenericComboItemSnapshot,
  InternalProductSnapshot,
  InternalVariantSnapshot,
  ORDER_ITEM_SOURCE,
  ORDER_ITEM_TYPE,
} from 'src/mkt-core/order/types';

type MktOrderItemDataSeed = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  snapshotProductName: string;
  unitName: string;
  taxPercentage: number;
  taxAmount: number;
  totalAmountWithTax: number;
  position: number;
  mktOrderId: string;
  // Promotion field
  itemDiscount: number;
  // External MKT Product fields
  externalMktProductId: string | null;
  externalMktProductCode: string | null;
  externalMktPackageId: string | null;
  externalMktPackageCode: string | null;
  snapshotMktProduct: MktProductSnapshot | null;
  snapshotMktPackage: MktPackageSnapshot | null;
  snapshotPackageName: string | null;
  orderLanguage: MktSupportedLanguage | null;
  // New: Array of licenses (supports multiple licenses per item)
  licenses: OrderItemLicense[] | null;
  // License configuration
  maxDevices: number;
  // Combo-related fields
  itemSource: OrderItemSource;
  itemType: OrderItemType;
  sourceComboId: string | null;
  sourceComboItemId: string | null;
  comboItemSnapshot: GenericComboItemSnapshot | null;
  // Internal product/variant snapshots
  internalProductSnapshot: InternalProductSnapshot | null;
  internalVariantSnapshot: InternalVariantSnapshot | null;
  // License item status
  licenseStatus: LicenseItemStatus | null;
  // Actor metadata (createdBy composite type)
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_ORDER_ITEM_DATA_SEED_COLUMNS: (keyof MktOrderItemDataSeed)[] =
  [
    'id',
    'name',
    'quantity',
    'unitPrice',
    'totalPrice',
    'snapshotProductName',
    'unitName',
    'taxPercentage',
    'taxAmount',
    'totalAmountWithTax',
    'position',
    'mktOrderId',
    'itemDiscount',
    'externalMktProductId',
    'externalMktProductCode',
    'externalMktPackageId',
    'externalMktPackageCode',
    'snapshotMktProduct',
    'snapshotMktPackage',
    'snapshotPackageName',
    'orderLanguage',
    'licenses',
    'maxDevices',
    // Combo-related fields
    'itemSource',
    'itemType',
    'sourceComboId',
    'sourceComboItemId',
    'comboItemSnapshot',
    // Internal product/variant snapshots
    'internalProductSnapshot',
    'internalVariantSnapshot',
    // License item status
    'licenseStatus',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

export const MKT_ORDER_ITEM_DATA_SEEDS_IDS = {
  ID_1: '550e8400-e29b-41d4-a716-446655440001',
  ID_2: '550e8400-e29b-41d4-a716-446655440002',
  ID_3: '550e8400-e29b-41d4-a716-446655440003',
  ID_4: '550e8400-e29b-41d4-a716-446655440004',
  ID_5: '550e8400-e29b-41d4-a716-446655440005',
  ID_6: '550e8400-e29b-41d4-a716-446655440006',
  ID_7: '550e8400-e29b-41d4-a716-446655440007',
  ID_8: '550e8400-e29b-41d4-a716-446655440008',
  ID_9: '550e8400-e29b-41d4-a716-446655440009',
  ID_10: '550e8400-e29b-41d4-a716-44665544000a',
  ID_11: '550e8400-e29b-41d4-a716-44665544000b',
  ID_12: '550e8400-e29b-41d4-a716-44665544000c',
  ID_13: '550e8400-e29b-41d4-a716-44665544000d',
  ID_14: '550e8400-e29b-41d4-a716-44665544000e',
  ID_15: '550e8400-e29b-41d4-a716-44665544000f',
  ID_16: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  ID_17: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  ID_18: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  ID_19: '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
  ID_20: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
};

// Default null values for external product and license fields
const DEFAULT_EXTERNAL_FIELDS = {
  // Promotion field
  itemDiscount: 0,
  // External product fields
  externalMktProductId: null,
  externalMktProductCode: null,
  externalMktPackageId: null,
  externalMktPackageCode: null,
  snapshotMktProduct: null,
  snapshotMktPackage: null,
  snapshotPackageName: null,
  orderLanguage: null,
  // New: Array of licenses
  licenses: null,
  // License configuration
  maxDevices: 1,
  // Combo-related fields (default: direct product purchase)
  itemSource: ORDER_ITEM_SOURCE.PRODUCT,
  itemType: ORDER_ITEM_TYPE.DIGITAL_EXTERNAL,
  sourceComboId: null,
  sourceComboItemId: null,
  comboItemSnapshot: null,
  // Internal product/variant snapshots
  internalProductSnapshot: null,
  internalVariantSnapshot: null,
  // License item status (ACTIVATED for COMPLETED orders with DIGITAL_EXTERNAL items)
  licenseStatus: LICENSE_ITEM_STATUS.ACTIVATED,
  // Actor metadata (createdBy composite type)
  createdBySource: 'MANUAL',
  createdByWorkspaceMemberId: null,
  createdByName: 'Admin User',
};

export const MKT_ORDER_ITEM_DATA_SEEDS: MktOrderItemDataSeed[] = [
  // Order 1 - MKT Care Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_1,
    name: 'MKT Care Basic 1 năm',
    quantity: 1,
    unitPrice: 4000000,
    totalPrice: 4000000,
    snapshotProductName: 'MKT Care - Phần mềm nuôi nick Facebook tự động',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 400000,
    totalAmountWithTax: 4400000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_1,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_2,
    name: 'MKT Care Basic 2 năm',
    quantity: 1,
    unitPrice: 7000000,
    totalPrice: 7000000,
    snapshotProductName: 'MKT Care - Phần mềm nuôi nick Facebook tự động',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 700000,
    totalAmountWithTax: 7700000,
    position: 2,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_1,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 2 năm',
  },

  // Order 2 - MKT Viral Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_3,
    name: 'MKT Viral Basic 1 năm',
    quantity: 2,
    unitPrice: 3000000,
    totalPrice: 6000000,
    snapshotProductName: 'MKT Viral - Viral video đa nền tảng',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 600000,
    totalAmountWithTax: 6600000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_2,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_4,
    name: 'MKT Viral Basic vĩnh viễn',
    quantity: 1,
    unitPrice: 10000000,
    totalPrice: 10000000,
    snapshotProductName: 'MKT Viral - Viral video đa nền tảng',
    unitName: 'vĩnh viễn',
    taxPercentage: 10,
    taxAmount: 1000000,
    totalAmountWithTax: 11000000,
    position: 2,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_2,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic vĩnh viễn',
  },

  // Order 3 - MKT UID Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_5,
    name: 'MKT UID Basic 1 năm',
    quantity: 3,
    unitPrice: 2000000,
    totalPrice: 6000000,
    snapshotProductName: 'MKT UID - Phân tích, tổng hợp data khách hàng',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 600000,
    totalAmountWithTax: 6600000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_3,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },

  // Order 4 - MKT Insta Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_6,
    name: 'MKT Insta Basic 2 năm',
    quantity: 1,
    unitPrice: 5000000,
    totalPrice: 5000000,
    snapshotProductName: 'MKT Insta - Phần mềm quảng cáo Instagram',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 500000,
    totalAmountWithTax: 5500000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_4,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 2 năm',
  },
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_7,
    name: 'MKT Insta Basic vĩnh viễn',
    quantity: 1,
    unitPrice: 10000000,
    totalPrice: 10000000,
    snapshotProductName: 'MKT Insta - Phần mềm quảng cáo Instagram',
    unitName: 'vĩnh viễn',
    taxPercentage: 10,
    taxAmount: 1000000,
    totalAmountWithTax: 11000000,
    position: 2,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_4,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic vĩnh viễn',
  },

  // Order 5 - MKT Tube Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_8,
    name: 'MKT Tube Basic 1 năm',
    quantity: 2,
    unitPrice: 2000000,
    totalPrice: 4000000,
    snapshotProductName: 'MKT Tube - Quản lý hệ thống kênh YouTube tự động',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 400000,
    totalAmountWithTax: 4400000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_5,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_9,
    name: 'MKT Tube Basic vĩnh viễn',
    quantity: 1,
    unitPrice: 5000000,
    totalPrice: 5000000,
    snapshotProductName: 'MKT Tube - Quản lý hệ thống kênh YouTube tự động',
    unitName: 'vĩnh viễn',
    taxPercentage: 10,
    taxAmount: 500000,
    totalAmountWithTax: 5500000,
    position: 2,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_5,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic vĩnh viễn',
  },

  // Order 6 - MKT Post Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_10,
    name: 'MKT Post Basic 1 năm',
    quantity: 1,
    unitPrice: 3000000,
    totalPrice: 3000000,
    snapshotProductName: 'MKT Post - Tự động đăng bài bán hàng trên Facebook',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 300000,
    totalAmountWithTax: 3300000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_6,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },

  // Order 7 - MKT Zalo Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_11,
    name: 'MKT Zalo Basic 2 năm',
    quantity: 1,
    unitPrice: 5000000,
    totalPrice: 5000000,
    snapshotProductName: 'MKT Zalo - Công cụ hỗ trợ marketing qua Zalo',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 500000,
    totalAmountWithTax: 5500000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_7,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 2 năm',
  },

  // Order 8 - MKT Group Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_12,
    name: 'MKT Group Basic 1 năm',
    quantity: 2,
    unitPrice: 3000000,
    totalPrice: 6000000,
    snapshotProductName: 'MKT Group - Quản lý Group Facebook',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 600000,
    totalAmountWithTax: 6600000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_8,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_13,
    name: 'MKT Group Basic vĩnh viễn',
    quantity: 1,
    unitPrice: 10000000,
    totalPrice: 10000000,
    snapshotProductName: 'MKT Group - Quản lý Group Facebook',
    unitName: 'vĩnh viễn',
    taxPercentage: 10,
    taxAmount: 1000000,
    totalAmountWithTax: 11000000,
    position: 2,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_8,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic vĩnh viễn',
  },

  // Order 9 - MKT Twitter Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_14,
    name: 'MKT X (Twitter) Basic 1 năm',
    quantity: 1,
    unitPrice: 3000000,
    totalPrice: 3000000,
    snapshotProductName: 'MKT X (Twitter) - Bán hàng Twitter tự động',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 300000,
    totalAmountWithTax: 3300000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_9,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },

  // Order 10 - MKT Page Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_15,
    name: 'MKT Page Basic 2 năm',
    quantity: 1,
    unitPrice: 5000000,
    totalPrice: 5000000,
    snapshotProductName: 'MKT Page - Quản lý fanpage hàng loạt',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 500000,
    totalAmountWithTax: 5500000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_10,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 2 năm',
  },

  // Order 11 - MKT Maps Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_16,
    name: 'MKT Maps Basic 1 năm',
    quantity: 3,
    unitPrice: 3000000,
    totalPrice: 9000000,
    snapshotProductName: 'MKT Maps - Tổng hợp scan data Google Maps',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 900000,
    totalAmountWithTax: 9900000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_11,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 1 năm',
  },

  // Order 12 - MKT Maps Forever Package
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_17,
    name: 'MKT Maps Basic vĩnh viễn',
    quantity: 1,
    unitPrice: 10000000,
    totalPrice: 10000000,
    snapshotProductName: 'MKT Maps - Tổng hợp scan data Google Maps',
    unitName: 'vĩnh viễn',
    taxPercentage: 10,
    taxAmount: 1000000,
    totalAmountWithTax: 11000000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_12,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic vĩnh viễn',
  },

  // Order 13 - Mixed Package (UID + Post)
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_18,
    name: 'MKT UID Basic 2 năm',
    quantity: 1,
    unitPrice: 3500000,
    totalPrice: 3500000,
    snapshotProductName: 'MKT UID - Phân tích, tổng hợp data khách hàng',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 350000,
    totalAmountWithTax: 3850000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_13,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 2 năm',
  },
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_19,
    name: 'MKT Post Basic 2 năm',
    quantity: 1,
    unitPrice: 5000000,
    totalPrice: 5000000,
    snapshotProductName: 'MKT Post - Tự động đăng bài bán hàng trên Facebook',
    unitName: 'năm',
    taxPercentage: 10,
    taxAmount: 500000,
    totalAmountWithTax: 5500000,
    position: 2,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_13,
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic 2 năm',
  },

  // Order 14 - Premium Package (Care Forever + Viral Forever)
  {
    id: MKT_ORDER_ITEM_DATA_SEEDS_IDS.ID_20,
    name: 'MKT Care Basic vĩnh viễn',
    quantity: 1,
    unitPrice: 12000000,
    totalPrice: 12000000,
    snapshotProductName: 'MKT Care - Phần mềm nuôi nick Facebook tự động',
    unitName: 'vĩnh viễn',
    taxPercentage: 10,
    taxAmount: 1200000,
    totalAmountWithTax: 13200000,
    position: 1,
    mktOrderId: MKT_ORDER_DATA_SEEDS_IDS.ID_13, // Reusing ID_13 for premium package
    ...DEFAULT_EXTERNAL_FIELDS,
    snapshotPackageName: 'Gói Basic vĩnh viễn',
  },
];
