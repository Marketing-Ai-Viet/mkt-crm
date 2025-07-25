export const TABLE_NAME = 'mktProduct';

export const PRODUCT_STANDARD_FIELD_IDS = {
  id: 'a3b2c1d4-1234-5678-9abc-def012345678',
  productCode: 'c5d4e3f6-3456-7890-bcde-f12345678901',
  productName: 'd6e5f4a7-4567-8901-cdef-123456789012',
  productCategory: 'e7f6a5b8-5678-9012-def1-234567890123',
  basePrice: 'f8a7b6c9-6789-0123-ef12-345678901234',
  licenseDurationMonths: 'a9b8c7d0-7890-1234-f123-456789012345',
  isActive: 'b0c9d8e1-8901-2345-1234-567890123456',
  createdBy: 'c1d0e9f2-9012-3456-2345-678901234567',
};

export const PRODUCT_DATA_SEED_COLUMNS = [
  'id',
  'productCode',
  'productName',
  'productCategory',
  'basePrice',
  'licenseDurationMonths',
  'isActive',
  'createdAt',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const PRODUCT_DATA_SEEDS = [
  {
    id: 'e1a2b3c4-1111-4111-8111-444455556666',
    productCode: 'P001',
    productName: 'CRM SaaS',
    productCategory: 'Software',
    basePrice: 199.99,
    licenseDurationMonths: 12,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: 'f2b3c4d5-2222-4222-8222-555566667777',
    productCode: 'P002',
    productName: 'Marketing Automation',
    productCategory: 'Software',
    basePrice: 299.99,
    licenseDurationMonths: 6,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: 'a3c4d5e6-3333-4333-8333-666677778888',
    productCode: 'P003',
    productName: 'Cloud Storage',
    productCategory: 'Service',
    basePrice: 99.99,
    licenseDurationMonths: 24,
    isActive: false,
    createdAt: new Date().toISOString(),
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];

export const PRODUCT_SEEDS_CONSTANT = {
  tableName: TABLE_NAME,
  pgColumns: PRODUCT_DATA_SEED_COLUMNS,
  recordSeeds: PRODUCT_DATA_SEEDS,
};
