type MktContractDataSeed = {
  id: string;
  name: string;
  status: MKT_CONTRACT_STATUS;
  startDate: string;
  endDate: string;

  // mktTemplateId: string;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export enum MKT_CONTRACT_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

// prettier-ignore
export const MKT_CONTRACT_DATA_SEED_COLUMNS: (keyof MktContractDataSeed)[] = [  
    'id',
    'name',
    'status',
    'startDate',
    'endDate',
    // 'mktTemplateId',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
];

// prettier-ignore
export const MKT_CONTRACT_DATA_SEEDS_IDS = {
  ID_1: 'c1f5e779-7f5d-4da3-93c3-e306bbcf6a50',
  ID_2: 'f852a725-c8a3-4683-902f-1a048b6aa279',
  ID_3: '69df7cf8-4d11-45e1-961f-ed059a8dd1d8',
  ID_4: '9f38f34e-c811-4ed3-ba31-1917465da9af',
  ID_5: '5a581bd0-4601-463b-856b-c590287a56f8',
  ID_6: '5ee80222-779d-42bc-8a14-a10b5de4cfdc',
  ID_7: 'ed01c0c4-a3f5-4df3-99da-41b69792bc8d',
  ID_8: 'eca89e83-91c1-4d18-a598-7f8f45856e7f',
  ID_9: '7352a9a3-5b57-432f-a4c9-95ae681c8dbe',
  ID_10: '629efbad-cf9e-4f49-b2d3-7aa15ae464b6',
  ID_11: '91e86043-c08d-4752-a5c2-09936e75f5bf',
  ID_12: 'eaae4f37-e64c-490d-aa89-c83d6679f68a',
  ID_13: 'd82abed3-913b-447a-8bd3-aa62bf2cf8e7',
  ID_14: '7e3ab59d-18af-46b8-99bc-49f0c526ad89',
  ID_15: '581224fe-c663-4662-a23b-fa8d28f34555',
};

// prettier-ignore
export const MKT_CONTRACT_DATA_SEEDS: MktContractDataSeed[] = [
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_1,
    name: 'Software License Agreement - Microsoft Office 365',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-01-15',
    endDate: '2025-01-14',
    position: 1,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Sarah Johnson',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_2,
    name: 'Cloud Infrastructure Service - AWS Enterprise',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-03-01',
    endDate: '2027-02-28',
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Michael Chen',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_3,
    name: 'Marketing Automation Platform - HubSpot Professional',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-02-10',
    endDate: '2025-02-09',
    position: 3,
    createdBySource: 'IMPORT',
    createdByWorkspaceMemberId: null,
    createdByName: 'Emily Rodriguez',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_4,
    name: 'CRM Software License - Salesforce Enterprise',
    status: MKT_CONTRACT_STATUS.EXPIRED,
    startDate: '2023-06-01',
    endDate: '2024-05-31',
    position: 4,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'David Kim',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_5,
    name: 'IT Support & Maintenance Contract',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    position: 5,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Lisa Wang',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_6,
    name: 'Office Equipment Lease - Dell Workstations',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2023-09-15',
    endDate: '2026-09-14',
    position: 6,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Robert Taylor',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_7,
    name: 'Security Software License - Norton Enterprise',
    status: MKT_CONTRACT_STATUS.REVOKED,
    startDate: '2023-12-01',
    endDate: '2024-11-30',
    position: 7,
    createdBySource: 'IMPORT',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jennifer Lee',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_8,
    name: 'Data Analytics Platform - Tableau Creator',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-04-01',
    endDate: '2025-03-31',
    position: 8,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Alex Morgan',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_9,
    name: 'Communication Software - Slack Business+',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-02-15',
    endDate: '2025-02-14',
    position: 9,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Thomas Brown',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_10,
    name: 'Project Management Tool - Asana Premium',
    status: MKT_CONTRACT_STATUS.INACTIVE,
    startDate: '2023-11-01',
    endDate: '2024-10-31',
    position: 10,
    createdBySource: 'IMPORT',
    createdByWorkspaceMemberId: null,
    createdByName: 'Maria Garcia',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_11,
    name: 'Website Hosting Service - AWS CloudFront',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-01-08',
    endDate: '2025-01-07',
    position: 11,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'James Wilson',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_12,
    name: 'Design Software License - Adobe Creative Cloud',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-03-20',
    endDate: '2025-03-19',
    position: 12,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Sophie Davis',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_13,
    name: 'Email Marketing Service - Mailchimp Standard',
    status: MKT_CONTRACT_STATUS.EXPIRED,
    startDate: '2023-08-01',
    endDate: '2024-07-31',
    position: 13,
    createdBySource: 'IMPORT',
    createdByWorkspaceMemberId: null,
    createdByName: 'Daniel Martinez',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_14,
    name: 'Video Conferencing Platform - Zoom Pro',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-05-01',
    endDate: '2025-04-30',
    position: 14,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Rachel Thompson',
  },
  {
    id: MKT_CONTRACT_DATA_SEEDS_IDS.ID_15,
    name: 'Code Repository Service - GitHub Enterprise',
    status: MKT_CONTRACT_STATUS.ACTIVE,
    startDate: '2024-06-15',
    endDate: '2025-06-14',
    position: 15,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Kevin Anderson',
  },
];
