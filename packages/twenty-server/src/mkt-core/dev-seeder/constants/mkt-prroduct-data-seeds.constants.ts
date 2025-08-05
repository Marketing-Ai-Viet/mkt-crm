import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

type MktProductDataSeed = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  inStock: boolean;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string;
  createdByName: string;
  accountOwnerId: string;
};

// prettier-ignore
export const MKT_PRODUCT_DATA_SEED_COLUMNS: (keyof MktProductDataSeed)[] = [
  'id',
  'name',
  'description',
  'price',
  'category',
  'sku',
  'inStock',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
  'accountOwnerId',
];

// prettier-ignore
export const MKT_PRODUCT_DATA_SEEDS_IDS = {
  ID_1: '20202020-a305-41e7-8c72-ba44072a4c58',
  ID_2: '20202020-a225-4b3d-a89c-7f6c30df998a',
  ID_3: '20202020-a8b0-422c-8fcf-5b7496f94975',
  ID_4: '20202020-aaf7-41d6-87a9-7add07bebfd8',
  ID_5: '20202020-a19d-422b-9cb2-5f8382a56877',
  ID_6: '20202020-a39c-4644-867d-e8e1851b3ee8',
  ID_7: '20202020-a0eb-4c51-aa03-c4cd2423d7cb',
};

export const MKT_PRODUCT_DATA_SEEDS: MktProductDataSeed[] = [
  {
    id: MKT_PRODUCT_DATA_SEEDS_IDS.ID_1,
    name: 'Wireless Bluetooth Headphones',
    description: 'Experience premium sound quality with these over-ear wireless Bluetooth headphones.',
    price: 129,
    category: 'Electronics',
    sku: 'ELEC-BTH-001',
    inStock: true,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: MKT_PRODUCT_DATA_SEEDS_IDS.ID_2,
    name: 'Organic Arabica Coffee Beans 1kg',
    description: '100% organic Arabica coffee beans, slow-roasted to perfection for a rich flavor.',
    price: 45,
    category: 'Groceries',
    sku: 'FOOD-CFE-002',
    inStock: true,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: MKT_PRODUCT_DATA_SEEDS_IDS.ID_3,
    name: 'Ergonomic Office Chair',
    description: 'Adjustable ergonomic chair with lumbar support for long working hours.',
    price: 289,
    category: 'Furniture',
    sku: 'FURN-CHR-003',
    inStock: true,
    position: 3,
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: MKT_PRODUCT_DATA_SEEDS_IDS.ID_4,
    name: 'Stainless Steel Water Bottle 750ml',
    description: 'Keep your drinks cold or hot for up to 12 hours with this eco-friendly bottle.',
    price: 25,
    category: 'Outdoor & Travel',
    sku: 'OUTD-WBT-004',
    inStock: true,
    position: 4,
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: MKT_PRODUCT_DATA_SEEDS_IDS.ID_5,
    name: 'LED Desk Lamp with USB Charging Port',
    description: 'Modern LED desk lamp with touch control, dimming, and built-in USB charger.',
    price: 59,
    category: 'Home & Living',
    sku: 'HOME-LMP-005',
    inStock: true,
    position: 5,
    createdBySource: 'API',
    createdByWorkspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
    createdByName: 'Tim A',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
];
