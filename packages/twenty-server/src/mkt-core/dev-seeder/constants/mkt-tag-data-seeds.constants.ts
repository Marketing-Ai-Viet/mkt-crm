type MKT_TAG_DATA_SEED = {
  id: string;
  name: string;
  type: MKT_TAGS;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export enum MKT_TAGS {
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

const MKT_TAG_SYSTEM_EXAMPLE = {
  VIP: 'VIP',
  HIGH_VALUE: 'HIGH_VALUE',
  POTENTIAL_CHURN: 'POTENTIAL_CHURN',
  SUPPORT_INTENSIVE: 'SUPPORT_INTENSIVE',
  REFERRAL_SOURCE: 'REFERRAL_SOURCE',
  QUICK_PAYER: 'QUICK_PAYER',
  NEGOTIATOR: 'NEGOTIATOR',
  ENTERPRISE_PROSPECT: 'ENTERPRISE_PROSPECT',
};

const MKT_TAG_CUSTOM_EXAMPLE = {
  INDUSTRY: 'INDUSTRY',
  BEHAVIOR: 'BEHAVIOR',
  CAMPAIGN: 'CAMPAIGN',
  GEOGRAPHIC: 'GEOGRAPHIC',
  SOURCE: 'SOURCE',
};

export const MKT_TAG_DATA_SEED_COLUMNS: (keyof MKT_TAG_DATA_SEED)[] = [
  'id',
  'name',
  'type',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

// prettier-ignore
export const MKT_TAG_DATA_SEEDS_IDS = {
  ID_1: 'ac056d4a-4c78-4326-b2e9-e41b5055bf02',
  ID_2: 'd2d1d353-8766-41bd-80af-57ecb4aef9f6',
  ID_3: 'cf2df851-6bc2-4f46-bf6b-f56290133a87',
  ID_4: 'a7eee336-4e09-48f3-8c5b-a59508e8b846',
  ID_5: 'f1a2ed15-8c36-4156-8b6b-9f05ffae0cb2',
}

export const MKT_TAG_DATA_SEEDS: MKT_TAG_DATA_SEED[] = [
  {
    id: MKT_TAG_DATA_SEEDS_IDS.ID_1,
    name: MKT_TAG_SYSTEM_EXAMPLE.VIP,
    type: MKT_TAGS.SYSTEM,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_TAG_DATA_SEEDS_IDS.ID_2,
    name: MKT_TAG_SYSTEM_EXAMPLE.HIGH_VALUE,
    type: MKT_TAGS.SYSTEM,
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_TAG_DATA_SEEDS_IDS.ID_3,
    name: MKT_TAG_SYSTEM_EXAMPLE.POTENTIAL_CHURN,
    type: MKT_TAGS.SYSTEM,
    position: 3,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_TAG_DATA_SEEDS_IDS.ID_4,
    name: MKT_TAG_SYSTEM_EXAMPLE.SUPPORT_INTENSIVE,
    type: MKT_TAGS.SYSTEM,
    position: 4,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_TAG_DATA_SEEDS_IDS.ID_5,
    name: MKT_TAG_CUSTOM_EXAMPLE.SOURCE,
    type: MKT_TAGS.CUSTOM,
    position: 5,
    createdBySource: 'CUSTOM',
    createdByWorkspaceMemberId: null,
    createdByName: 'Custom',
  },
];
