import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/dev-seeder/constants/mkt-customer-data-seeds.constants';

type MKT_CUSTOMER_TAG_DATA_SEED = {
  id: string;
  name: string;
  type: MKT_CUSTOMER_TAGS;

  mktCustomerId: string;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export enum MKT_CUSTOMER_TAGS {
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export const MKT_CUSTOMER_TAG_DATA_SEED_COLUMNS: (keyof MKT_CUSTOMER_TAG_DATA_SEED)[] =
  [
    'id',
    'name',
    'type',
    'mktCustomerId',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

// prettier-ignore
export const MKT_CUSTOMER_TAG_DATA_SEEDS_IDS = {
  ID_1: 'ac056d4a-4c78-4326-b2e9-e41b5055bf02',
  ID_2: 'd2d1d353-8766-41bd-80af-57ecb4aef9f6',
  ID_3: 'cf2df851-6bc2-4f46-bf6b-f56290133a87',
  ID_4: 'a7eee336-4e09-48f3-8c5b-a59508e8b846',
  ID_5: 'f1a2ed15-8c36-4156-8b6b-9f05ffae0cb2',
}

export const MKT_CUSTOMER_TAG_DATA_SEEDS: MKT_CUSTOMER_TAG_DATA_SEED[] = [
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_1,
    name: 'New',
    type: MKT_CUSTOMER_TAGS.SYSTEM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_2,
    name: 'Returning',
    type: MKT_CUSTOMER_TAGS.SYSTEM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_3,
    name: 'Loyal',
    type: MKT_CUSTOMER_TAGS.SYSTEM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    position: 3,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_4,
    name: 'Churned',
    type: MKT_CUSTOMER_TAGS.SYSTEM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    position: 4,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_5,
    name: 'VIP',
    type: MKT_CUSTOMER_TAGS.SYSTEM,
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    position: 5,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];
