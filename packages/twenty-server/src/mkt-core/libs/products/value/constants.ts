import { ATTRIBUTE_SEED_IDS } from '../attribute';

export const ATTRIBUTE_VALUE_TABLE_NAME = 'mktAttributeValue';

export const ATTRIBUTE_VALUE_STANDARD_FIELD_IDS = {
    id: 'b1e2c3d4-5f76-4a90-9acd-1234567890ef',
    attributeId: 'c2d3e4f5-3f89-4b23-8bcd-2345678901fa',
    value: 'd3e4f5a6-7c90-4c34-8acd-3456789012fb',
    displayOrder: 'e4f5a6b7-8a01-4d45-9bcd-4567890123fc',
    createdBy: 'f5a6b7c8-9f12-4e56-8acd-5678901234fd',
};

export const ATTRIBUTE_VALUE_IDS = {
    COLOR_DO: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    COLOR_XANH: '75d0f528-b9e4-4ce3-b2b1-e4b1f6b85c24',
    COLOR_VANG: 'a519bb51-dff0-4894-81f4-17c4e7a0bb0f',
    SIZE_S: 'f1e9d03b-24b8-49de-b9b2-c5c6c837a33e',
    SIZE_M: '0c4c2e1e-884f-4d3c-8544-efb889d2cc76',
    SIZE_L: 'f879f987-31ec-4e0f-b8d5-7c960e519f15',
    MATERIAL_COTTON: '16c9f7f2-dca2-4b9e-9104-4a7413c73857',
    MATERIAL_POLYESTER: 'af20b2a0-0b91-4741-a12c-e19a37078670',
    BRAND_A: 'cf32a6d8-5b87-4ac3-997d-9649fa84a206',
    BRAND_B: 'e48cc885-93cf-42f4-879a-4dc8d6c42b1c',
    BRAND_C: '5a3a34e0-7f34-41fd-8ef9-6b8e20e1d804',
    WARRANTY_6M: '2013fc55-b4c7-4a9c-a1c0-d3f6b9c4234e',
    WARRANTY_12M: '0e92cde2-bab3-4cb3-b0c5-9050a82eb8e6'
};

export const ATTRIBUTE_VALUE_DATA_SEED_COLUMNS = [
  'id',
  'attributeId',
  'value',
  'displayOrder',
  'createdAt',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName'
];

export const ATTRIBUTE_VALUE_DATA_SEEDS = [
  // Màu: Đỏ, Xanh, Vàng
  {
    id: ATTRIBUTE_VALUE_IDS.COLOR_DO,
    attributeId: ATTRIBUTE_SEED_IDS.COLOR,
    value: 'Đỏ',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.COLOR_XANH,
    attributeId: ATTRIBUTE_SEED_IDS.COLOR,
    value: 'Xanh',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.COLOR_VANG,
    attributeId: ATTRIBUTE_SEED_IDS.COLOR,
    value: 'Vàng',
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Kích thước: S, M, L
  {
    id: ATTRIBUTE_VALUE_IDS.SIZE_S,
    attributeId: ATTRIBUTE_SEED_IDS.SIZE,
    value: 'S',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.SIZE_M,
    attributeId: ATTRIBUTE_SEED_IDS.SIZE,
    value: 'M',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.SIZE_L,
    attributeId: ATTRIBUTE_SEED_IDS.SIZE,
    value: 'L',
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Chất liệu: Cotton, Polyester
  {
    id: ATTRIBUTE_VALUE_IDS.MATERIAL_COTTON,
    attributeId: ATTRIBUTE_SEED_IDS.MATERIAL,
    value: 'Cotton',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.MATERIAL_POLYESTER,
    attributeId: ATTRIBUTE_SEED_IDS.MATERIAL,
    value: 'Polyester',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Thương hiệu: BrandA, BrandB, BrandC
  {
    id: ATTRIBUTE_VALUE_IDS.BRAND_A,
    attributeId: ATTRIBUTE_SEED_IDS.BRAND,
    value: 'BrandA',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.BRAND_B,
    attributeId: ATTRIBUTE_SEED_IDS.BRAND,
    value: 'BrandB',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.BRAND_C,
    attributeId: ATTRIBUTE_SEED_IDS.BRAND,
    value: 'BrandC',
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  // Bảo hành: 6 tháng, 12 tháng
  {
    id: ATTRIBUTE_VALUE_IDS.WARRANTY_6M,
    attributeId: ATTRIBUTE_SEED_IDS.WARRANTY,
    value: '6 tháng',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: ATTRIBUTE_VALUE_IDS.WARRANTY_12M,
    attributeId: ATTRIBUTE_SEED_IDS.WARRANTY,
    value: '12 tháng',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];

export const ATTRIBUTE_VALUE_SEEDS_CONSTANT = {
  tableName: ATTRIBUTE_VALUE_TABLE_NAME,
  pgColumns: ATTRIBUTE_VALUE_DATA_SEED_COLUMNS,
  recordSeeds: ATTRIBUTE_VALUE_DATA_SEEDS,
};
