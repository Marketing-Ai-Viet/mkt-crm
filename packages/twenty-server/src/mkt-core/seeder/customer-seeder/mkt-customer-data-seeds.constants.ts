import {
  MKT_CUSTOMER_DATA_SEEDS_IDS,
  MKT_CUSTOMER_LIFECYCLE_STAGE,
  MKT_CUSTOMER_STATUS,
  MKT_CUSTOMER_TIER,
  MKT_CUSTOMER_TYPE,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';

type MktCustomerDataSeed = {
  id: string;
  mktCustomerCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  companyName: string | null;
  taxCode: string | null;
  address: string | null;
  status: string;
  tier: string;
  lifecycleStage: string;
  totalOrderValue: number;
  licensesCount: number;
  lastPurchase: string | null;
  customerLtv: number;
  churnRiskScore: number;
  engagementScore: number;
  registrationDate: string;
  notes: string | null;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_CUSTOMER_DATA_SEED_COLUMNS: (keyof MktCustomerDataSeed)[] = [
  'id',
  'mktCustomerCode',
  'name',
  'email',
  'phone',
  'type',
  'companyName',
  'taxCode',
  'address',
  'status',
  'tier',
  'lifecycleStage',
  'totalOrderValue',
  'licensesCount',
  'lastPurchase',
  'customerLtv',
  'churnRiskScore',
  'engagementScore',
  'registrationDate',
  'notes',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const MKT_CUSTOMER_DATA_SEEDS: MktCustomerDataSeed[] = [
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000001',
    name: 'Nguyễn Văn An',
    email: 'nguyen.van.an@techcorp.vn',
    phone: '0901234567',
    type: MKT_CUSTOMER_TYPE.BUSINESS,
    companyName: 'Công ty TNHH TechCorp Việt Nam',
    taxCode: '0123456789',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    status: MKT_CUSTOMER_STATUS.ACTIVE,
    tier: MKT_CUSTOMER_TIER.DIAMOND,
    lifecycleStage: MKT_CUSTOMER_LIFECYCLE_STAGE.LOYAL,
    totalOrderValue: 150000000,
    licensesCount: 25,
    lastPurchase: '2024-11-15T10:30:00.000Z',
    customerLtv: 180000000,
    churnRiskScore: 5,
    engagementScore: 95,
    registrationDate: '2023-01-15T08:00:00.000Z',
    notes: 'Khách hàng VIP, ưu tiên hỗ trợ 24/7',
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000002',
    name: 'Trần Thị Bình',
    email: 'tran.thi.binh@innovate.io',
    phone: '0912345678',
    type: MKT_CUSTOMER_TYPE.BUSINESS,
    companyName: 'Innovate Solutions JSC',
    taxCode: '0234567890',
    address: '456 Lê Lợi, Quận 3, TP.HCM',
    status: MKT_CUSTOMER_STATUS.ACTIVE,
    tier: MKT_CUSTOMER_TIER.GOLD,
    lifecycleStage: MKT_CUSTOMER_LIFECYCLE_STAGE.CUSTOMER,
    totalOrderValue: 75000000,
    licensesCount: 12,
    lastPurchase: '2024-10-20T14:15:00.000Z',
    customerLtv: 85000000,
    churnRiskScore: 15,
    engagementScore: 80,
    registrationDate: '2023-06-10T09:30:00.000Z',
    notes: 'Khách hàng doanh nghiệp vừa, tiềm năng mở rộng',
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000003',
    name: 'Lê Minh Cường',
    email: 'le.minh.cuong@gmail.com',
    phone: '0923456789',
    type: MKT_CUSTOMER_TYPE.INDIVIDUAL,
    companyName: null,
    taxCode: null,
    address: '789 Trần Hưng Đạo, Quận 5, TP.HCM',
    status: MKT_CUSTOMER_STATUS.ACTIVE,
    tier: MKT_CUSTOMER_TIER.SILVER,
    lifecycleStage: MKT_CUSTOMER_LIFECYCLE_STAGE.CUSTOMER,
    totalOrderValue: 25000000,
    licensesCount: 5,
    lastPurchase: '2024-09-25T16:45:00.000Z',
    customerLtv: 28000000,
    churnRiskScore: 25,
    engagementScore: 65,
    registrationDate: '2024-01-20T11:00:00.000Z',
    notes: 'Khách hàng cá nhân, sử dụng cho freelance',
    position: 3,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000004',
    name: 'Phạm Hoàng Dung',
    email: 'pham.hoang.dung@startup.vn',
    phone: '0934567890',
    type: MKT_CUSTOMER_TYPE.ORGANIZATION,
    companyName: 'Startup ABC',
    taxCode: '0345678901',
    address: '101 Điện Biên Phủ, Bình Thạnh, TP.HCM',
    status: MKT_CUSTOMER_STATUS.PROSPECTIVE,
    tier: MKT_CUSTOMER_TIER.BRONZE,
    lifecycleStage: MKT_CUSTOMER_LIFECYCLE_STAGE.TRIAL,
    totalOrderValue: 5000000,
    licensesCount: 2,
    lastPurchase: '2024-11-01T09:00:00.000Z',
    customerLtv: 5500000,
    churnRiskScore: 40,
    engagementScore: 50,
    registrationDate: '2024-10-01T14:30:00.000Z',
    notes: 'Startup mới, đang dùng thử',
    position: 4,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000005',
    name: 'Võ Thị Em',
    email: 'vo.thi.em@oldcompany.vn',
    phone: '0945678901',
    type: MKT_CUSTOMER_TYPE.BUSINESS,
    companyName: 'Old Company Ltd',
    taxCode: '0456789012',
    address: '202 Võ Văn Tần, Quận 3, TP.HCM',
    status: MKT_CUSTOMER_STATUS.INACTIVE,
    tier: MKT_CUSTOMER_TIER.CHURNED,
    lifecycleStage: MKT_CUSTOMER_LIFECYCLE_STAGE.CHURNED,
    totalOrderValue: 35000000,
    licensesCount: 0,
    lastPurchase: '2024-03-15T08:30:00.000Z',
    customerLtv: 35000000,
    churnRiskScore: 95,
    engagementScore: 10,
    registrationDate: '2022-05-20T10:00:00.000Z',
    notes: 'Khách hàng đã ngưng sử dụng dịch vụ',
    position: 5,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];
