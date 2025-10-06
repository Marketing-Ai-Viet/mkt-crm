import { MKT_CUSTOMER_COMPANY_SIZE } from 'src/mkt-core/customer/constants/mkt-customer.constant';

export type MktI18nDataSeed = {
  id: string;
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
  'key',
  'locale',
  'data',
  'description',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const MKT_I18N_DATA_SEED_IDS = {
  COMPANY_SIZE_EN: '590f3eee-2769-439a-9466-1ae298d14785',
  COMPANY_SIZE_VI: '60837ca3-0d6c-4b96-be38-cc23b8f29722',
};

export const MKT_I18N_DATA_SEEDS: MktI18nDataSeed[] = [
  {
    id: MKT_I18N_DATA_SEED_IDS.COMPANY_SIZE_EN,
    key: 'customer.company.size',
    locale: 'en',
    data: JSON.stringify({
      [MKT_CUSTOMER_COMPANY_SIZE.SMALL]: 'Small (1-10 employees)',
      [MKT_CUSTOMER_COMPANY_SIZE.MEDIUM]: 'Medium (11-50 employees)',
      [MKT_CUSTOMER_COMPANY_SIZE.LARGE]: 'Large (51-200 employees)',
      [MKT_CUSTOMER_COMPANY_SIZE.OTHER]: 'Other (201+ employees)',
    }),
    description: 'Company size options in English',
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_I18N_DATA_SEED_IDS.COMPANY_SIZE_VI,
    key: 'customer.company.size',
    locale: 'vi',
    data: JSON.stringify({
      [MKT_CUSTOMER_COMPANY_SIZE.SMALL]: 'Nhỏ (1-10 nhân viên)',
      [MKT_CUSTOMER_COMPANY_SIZE.MEDIUM]: 'Vừa (11-50 nhân viên)',
      [MKT_CUSTOMER_COMPANY_SIZE.LARGE]: 'Lớn (51-200 nhân viên)',
      [MKT_CUSTOMER_COMPANY_SIZE.OTHER]: 'Khác (201+ nhân viên)',
    }),
    description: 'Các lựa chọn quy mô công ty bằng tiếng Việt',
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];
