import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MKT_TAG_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/constants/mkt-tag-data-seeds.constants';

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
  DIAMOND_VIP: '23dd8c06-4c41-4737-af5c-e13ceeed1cd1',
  DIAMOND_HIGH_VALUE: 'c12caf5b-e47c-4335-a0df-73d36939e207',
  DIAMOND_ENTERPRISE: '37c3ade5-5952-4b05-8717-13d9bb0dea0e',
  GOLD_HIGH_VALUE: '514d9a13-a4b5-4d95-b921-d1c40c0481a1',
  GOLD_QUICK_PAYER: '9741a1a3-0d58-4bdd-90be-3491701fd6a3',
  SILVER_REFERRAL: '50a89a47-f037-4fdd-92ee-efa8155261a6',
  BRONZE_SUPPORT: 'abd9fc7f-eac3-436d-81ab-f5cf0e02cdce',
  CHURNED_POTENTIAL_CHURN: '52423d2a-12e8-4582-acfd-a9c68856a345',
};

export const MKT_CUSTOMER_TAG_DATA_SEEDS: MktCustomerTagDataSeed[] = [
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.DIAMOND_VIP,
    name: 'VIP - Nguyễn Văn An',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.VIP,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.DIAMOND_HIGH_VALUE,
    name: 'High Value - Nguyễn Văn An',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.HIGH_VALUE,
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.DIAMOND_ENTERPRISE,
    name: 'Enterprise Prospect - Nguyễn Văn An',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.ENTERPRISE_PROSPECT,
    position: 3,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.GOLD_HIGH_VALUE,
    name: 'High Value - Trần Thị Bình',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.HIGH_VALUE,
    position: 4,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.GOLD_QUICK_PAYER,
    name: 'Quick Payer - Trần Thị Bình',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.QUICK_PAYER,
    position: 5,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.SILVER_REFERRAL,
    name: 'Referral Source - Lê Minh Cường',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.REFERRAL_SOURCE,
    position: 6,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.BRONZE_SUPPORT,
    name: 'Support Intensive - Phạm Hoàng Dung',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.SUPPORT_INTENSIVE,
    position: 7,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_TAG_DATA_SEEDS_IDS.CHURNED_POTENTIAL_CHURN,
    name: 'Potential Churn - Võ Thị Em',
    mktCustomerId: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
    mktTagId: MKT_TAG_DATA_SEEDS_IDS.POTENTIAL_CHURN,
    position: 8,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];
