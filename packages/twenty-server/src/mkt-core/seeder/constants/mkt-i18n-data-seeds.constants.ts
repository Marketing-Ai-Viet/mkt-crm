export type MktI18nDataSeed = {
  id: string;
  mktFieldId?: string | null;
  key: string;
  locale: string;
  data: string;
  description: string | null;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_I18N_DATA_SEED_COLUMNS: (keyof MktI18nDataSeed)[] = [
  'id',
  'mktFieldId',
  'key',
  'locale',
  'data',
  'description',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const LOCALES = {
  EN: 'en',
  VI: 'vi',
};

export const MKT_I18N_DATA_SEED_IDS = {
  COMPANY_SIZE_EN: '590f3eee-2769-439a-9466-1ae298d14785',
  COMPANY_SIZE_VI: '60837ca3-0d6c-4b96-be38-cc23b8f29722',
  ORDER_STATUS_EN: '5697d349-39ff-443f-be98-92cd3b5e5f23',
  ORDER_STATUS_VI: '6e23a927-6a5b-420d-a421-e0d56d07c5da',
};

export const MKT_I18N_DATA_SEEDS = [];
