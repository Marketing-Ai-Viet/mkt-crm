type MktCategoryDataSeed = {
  id: string;
  name: string;
  description?: string;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_CATEGORY_DATA_SEED_COLUMNS: string[] = [
  'id',
  'name',
  'description',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const MKT_CATEGORY_DATA_SEEDS_IDS = {  
  VI_LEAD: 'b021a3e4-adad-427c-a514-e91ffc1bbbca',
  MKT_PRODUCT: 'e00601f1-9ca3-4c12-b9d7-340faa31df98',
};

export const MKT_CATEGORY_DATA_SEEDS: MktCategoryDataSeed[] = [
  {
    id: MKT_CATEGORY_DATA_SEEDS_IDS.VI_LEAD,
    name: 'VI LEAD',
    description: 'VI Lead',
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CATEGORY_DATA_SEEDS_IDS.MKT_PRODUCT,
    name: 'Phần mềm MKT',
    description: 'Phần mềm MKT',
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];