import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/dev-seeder/constants/mkt-customer-data-seeds.constants';
import { MKT_TAG_DATA_SEEDS_IDS } from 'src/mkt-core/dev-seeder/constants/mkt-tag-data-seeds.constants';

type MktCustomerTagDataSeed = {
  id: string;
  name: string;

  mktCustomerId: string;
  mktTagId: string;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_CUSTOMER_TAG_DATA_SEED_COLUMNS: (keyof MktCustomerTagDataSeed)[] =
  [
    'id',
    'name',
    'mktCustomerId',
    'mktTagId',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

export const MKT_CUSTOMER_TAG_DATA_SEEDS_IDS = {
  ID_1: 'e8f55f59-dcda-4e17-8660-930617781a14',
  ID_2: 'f852a725-c8a3-4683-902f-1a048b6aa279',
  ID_3: 'a753a07b-b3d0-4c5c-8ec4-1e525bf0a688',
  ID_4: 'a4a211cb-952e-4590-961d-3e46bef22244',
  ID_5: '348228e0-e448-4589-8fe0-a8dd90059f8b',
  ID_6: '77e87693-e663-43e5-9681-ef89a5f1de49',
  ID_7: '899a53f1-918d-4070-b745-b59af53a9ae9',
  ID_8: '4994533e-467a-41d3-b507-00e24b30cef4',
  ID_9: 'da2e10a2-ce9e-4b49-a8af-44270de73d07',
  ID_10: '54c2f9c5-7104-43a0-b812-064401bf032d',
  ID_11: 'f7ccd13e-bda7-4689-bdc8-cba551c1953b',
  ID_12: '5148f2b8-9300-4b77-80bd-3faff86e6467',
  ID_13: '525cf2dc-4549-4aca-96c2-0591a9150994',
  ID_14: 'e15e5f52-a63b-4b3f-b87d-6a4212dcfb44',
  ID_15: '92123456-7890-1234-5678-901234567890',
  ID_16: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  ID_17: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
  ID_18: 'c3d4e5f6-g7h8-9012-cdef-345678901234',
  ID_19: 'd4e5f6g7-h8i9-0123-defg-456789012345',
  ID_20: 'e5f6g7h8-i9j0-1234-efgh-567890123456',
  ID_21: 'f6g7h8i9-j0k1-2345-fghi-678901234567',
  ID_22: 'g7h8i9j0-k1l2-3456-ghij-789012345678',
  ID_23: 'h8i9j0k1-l2m3-4567-hijk-890123456789',
  ID_24: 'i9j0k1l2-m3n4-5678-ijkl-901234567890',
  ID_25: 'j0k1l2m3-n4o5-6789-jklm-012345678901',
};

export const MKT_CUSTOMER_TAG_DATA_SEEDS: MktCustomerTagDataSeed[] = [
  // Customer 1 - John Doe (VIP, High Value, Quick Payer)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_1,
    name: 'John Doe - VIP',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.VIP,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Sarah Johnson',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_2,
    name: 'John Doe - High Value',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.HIGH_VALUE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Sarah Johnson',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_3,
    name: 'John Doe - Quick Payer',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_1,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.QUICK_PAYER,
    position: 3,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Sarah Johnson',
  },

  // Customer 2 - Jane Smith (High Value, Referral Source)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_4,
    name: 'Jane Smith - High Value',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_2,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.HIGH_VALUE,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Michael Chen',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_5,
    name: 'Jane Smith - Referral Source',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_2,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.REFERRAL_SOURCE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Michael Chen',
  },

  // Customer 3 - Jim Beam (VIP, High Value, Support Intensive)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_6,
    name: 'Jim Beam - VIP',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_3,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.VIP,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Emily Rodriguez',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_7,
    name: 'Jim Beam - High Value',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_3,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.HIGH_VALUE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Emily Rodriguez',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_8,
    name: 'Jim Beam - Support Intensive',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_3,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.SUPPORT_INTENSIVE,
    position: 3,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Emily Rodriguez',
  },

  // Customer 4 - John Doe (Potential Churn, Negotiator)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_9,
    name: 'John Doe - Potential Churn',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_4,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.POTENTIAL_CHURN,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'David Kim',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_10,
    name: 'John Doe - Negotiator',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_4,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.NEGOTIATOR,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'David Kim',
  },

  // Customer 5 - Lisa Wang (Enterprise Prospect, Support Intensive)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_11,
    name: 'Lisa Wang - Enterprise Prospect',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_5,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.ENTERPRISE_PROSPECT,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Lisa Wang',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_12,
    name: 'Lisa Wang - Support Intensive',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_5,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.SUPPORT_INTENSIVE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Lisa Wang',
  },

  // Customer 6 - Robert Taylor (Quick Payer, Referral Source)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_13,
    name: 'Robert Taylor - Quick Payer',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_6,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.QUICK_PAYER,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Robert Taylor',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_14,
    name: 'Robert Taylor - Referral Source',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_6,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.REFERRAL_SOURCE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Robert Taylor',
  },

  // Customer 7 - Jessica Brown (High Value, Quick Payer)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_15,
    name: 'Jessica Brown - High Value',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_7,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.HIGH_VALUE,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jessica Brown',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_16,
    name: 'Jessica Brown - Quick Payer',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_7,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.QUICK_PAYER,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jessica Brown',
  },

  // Customer 8 - Mark Wilson (Potential Churn, Negotiator)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_17,
    name: 'Mark Wilson - Potential Churn',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_8,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.POTENTIAL_CHURN,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Mark Wilson',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_18,
    name: 'Mark Wilson - Negotiator',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_8,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.NEGOTIATOR,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Mark Wilson',
  },

  // Customer 9 - Jennifer Davis (VIP, High Value)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_19,
    name: 'Jennifer Davis - VIP',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_9,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.VIP,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jennifer Davis',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_20,
    name: 'Jennifer Davis - High Value',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_9,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.HIGH_VALUE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jennifer Davis',
  },

  // Customer 10 - Christopher Martinez (Enterprise Prospect, Support Intensive)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_21,
    name: 'Christopher Martinez - Enterprise Prospect',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_10,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.ENTERPRISE_PROSPECT,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Christopher Martinez',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_22,
    name: 'Christopher Martinez - Support Intensive',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_10,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.SUPPORT_INTENSIVE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Christopher Martinez',
  },

  // Customer 11 - Amanda Lopez (Potential Churn)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_23,
    name: 'Amanda Lopez - Potential Churn',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_11,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.POTENTIAL_CHURN,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Amanda Lopez',
  },

  // Customer 12 - Kevin Anderson (Quick Payer, Referral Source)
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_24,
    name: 'Kevin Anderson - Quick Payer',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_12,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.QUICK_PAYER,
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Kevin Anderson',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.ID_25,
    name: 'Kevin Anderson - Referral Source',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.ID_12,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.REFERRAL_SOURCE,
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Kevin Anderson',
  },
];
