import { MKT_ORDER_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_CUSTOMER_COMPANY_SIZE } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
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

const I18N_ORDER_STATUS = {
  KEYS: 'order.status',
  DATA: {
    [LOCALES.EN]: {
      [ORDER_STATUS.DRAFT]: 'Draft',
      [ORDER_STATUS.TRIAL]: 'Trial',
      [ORDER_STATUS.COMPLETED]: 'Completed',
      [ORDER_STATUS.WAIT]: 'Wait',
      [ORDER_STATUS.OVERDUE]: 'Overdue',
      [ORDER_STATUS.REFUSE]: 'Refuse',
      [ORDER_STATUS.REFUND]: 'Refund',
      [ORDER_STATUS.CONFIRMED]: 'Confirmed',
    },
    [LOCALES.VI]: {
      [ORDER_STATUS.DRAFT]: 'Nháp',
      [ORDER_STATUS.TRIAL]: 'Thử nghiệm',
      [ORDER_STATUS.COMPLETED]: 'Hoàn thành',
      [ORDER_STATUS.WAIT]: 'Chờ xử lý',
      [ORDER_STATUS.OVERDUE]: 'Quá hạn',
      [ORDER_STATUS.REFUSE]: 'Từ chối',
      [ORDER_STATUS.REFUND]: 'Hoàn tiền',
      [ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
    },
  },
};

export const MKT_I18N_DATA_SEEDS: MktI18nDataSeed[] = [
  {
    id: MKT_I18N_DATA_SEED_IDS.ORDER_STATUS_EN,
    mktFieldId: MKT_ORDER_FIELD_IDS.status,
    key: I18N_ORDER_STATUS.KEYS,
    locale: LOCALES.EN,
    data: JSON.stringify(I18N_ORDER_STATUS.DATA[LOCALES.EN]),
    description: 'Order status options in English',
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'Order System',
  },
  {
    id: MKT_I18N_DATA_SEED_IDS.ORDER_STATUS_VI,
    mktFieldId: MKT_ORDER_FIELD_IDS.status,
    key: I18N_ORDER_STATUS.KEYS,
    locale: LOCALES.VI,
    data: JSON.stringify(I18N_ORDER_STATUS.DATA[LOCALES.VI]),
    description: 'Các lựa chọn trạng thái đơn hàng bằng tiếng Việt',
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_I18N_DATA_SEED_IDS.COMPANY_SIZE_EN,
    mktFieldId: null,
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
    mktFieldId: null,
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
