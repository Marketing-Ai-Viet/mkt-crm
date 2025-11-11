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
  // Enterprise Customers
  TECH_CORP_VIP: '23dd8c06-4c41-4737-af5c-e13ceeed1cd1',
  TECH_CORP_ENTERPRISE: 'c12caf5b-e47c-4335-a0df-73d36939e207',

  FINANCE_HIGH_VALUE: '37c3ade5-5952-4b05-8717-13d9bb0dea0e',
  FINANCE_QUICK_PAYER: '514d9a13-a4b5-4d95-b921-d1c40c0481a1',

  HEALTHCARE_SUPPORT: '9741a1a3-0d58-4bdd-90be-3491701fd6a3',
  HEALTHCARE_CHURN: '50a89a47-f037-4fdd-92ee-efa8155261a6',

  // Medium Business
  MARKETING_REFERRAL: 'abd9fc7f-eac3-436d-81ab-f5cf0e02cdce',

  CONSULTING_NEGOTIATOR: '52423d2a-12e8-4582-acfd-a9c68856a345',

  RETAIL_QUICK_PAYER: '1a642b8b-78e5-426c-ad0c-7bba379e8942',

  // Small Business
  STARTUP_CHURN: '108173a1-e0ce-4222-9d8e-f3c1f9262acb',

  RESTAURANT_REFERRAL: 'a60cdd68-7f9a-4e80-b8fc-5ecb15017db0',

  FREELANCE_QUICK_PAYER: '4f264d93-26d5-40e5-ae8c-6b77c3877e9c',

  // Individual Customers
  VIP_CUSTOMER_VIP: '02c9400d-a470-4566-9b5b-caab87c695aa',
  VIP_CUSTOMER_HIGH_VALUE: '6982617a-d9ec-459d-ab62-10de42e2ec60',
  VIP_CUSTOMER_REFERRAL: '5822ffad-e7d3-48c5-a0bd-a8ddd978ebec',

  NEW_LEAD_CHURN: 'dae80b4c-d202-4c73-9588-6593a42baaff',

  LOYAL_QUICK_PAYER: 'ba34e967-cf0f-423d-810e-8fa394383122',
  LOYAL_REFERRAL: 'c806c548-c625-4c26-8bce-903428bf1fae',

  CHURN_RISK_CHURN: '7d5352b5-ff60-4fab-a1ac-be136aa53efd',

  HIGH_VALUE_CUSTOMER_HIGH_VALUE: '5ab5d82a-121b-4afc-b997-2f3729eed0b7',
  HIGH_VALUE_CUSTOMER_QUICK_PAYER: 'f28429a4-55c5-4b51-8c13-556c80d560ea',
  HIGH_VALUE_CUSTOMER_ENTERPRISE: 'a7eedb18-b487-4fbb-8f2d-3beec3b848b8',

  SUPPORT_INTENSIVE_SUPPORT: '154da2b7-cf8f-4ffd-bffe-f8ad89cf9c6c',
  SUPPORT_INTENSIVE_CHURN: 'a87c402e-3531-46f0-ac5a-6446ba13eabc',
};

export const MKT_CUSTOMER_TAG_DATA_SEEDS = [];
