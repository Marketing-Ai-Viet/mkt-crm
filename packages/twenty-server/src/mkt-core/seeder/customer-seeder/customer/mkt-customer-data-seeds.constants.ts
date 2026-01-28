import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import {
  ACCOUNT_PROVIDER,
  LINKED_ACCOUNT_STATUS,
} from 'src/mkt-core/customer/constants/linked-account.constants';
import {
  MKT_CUSTOMER_COMPANY_SIZE,
  MKT_CUSTOMER_DATA_SEEDS_IDS,
  MKT_CUSTOMER_INDUSTRY,
  MKT_CUSTOMER_LIFECYCLE_STAGE,
  MKT_CUSTOMER_STATUS,
  MKT_CUSTOMER_TIER,
  MKT_CUSTOMER_TYPE,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';

type MktCustomerDataSeed = {
  id: string;
  mktCustomerCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  citizenId: string | null; // CCCD/CMND - chỉ áp dụng cho INDIVIDUAL
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
  firstPurchase: string | null; // Sprint 1: Ngày mua hàng đầu tiên
  customerLtv: number;
  churnRiskScore: number;
  engagementScore: number;
  registrationDate: string;
  notes: string | null;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
  linkedAccounts: string | null; // JSON string for PostgreSQL JSONB
  // Sprint 3: Business Information
  companySize: string | null;
  industry: string | null;
  contactPosition: string | null;
  contactDepartment: string | null;
  // Relations: Owner assignments
  accountOwnerId: string | null; // Sales phụ trách
  supportOwnerId: string | null; // Support phụ trách
};

/**
 * Helper to serialize LinkedAccount array to JSON string
 */
const SERIALIZE_LINKED_ACCOUNTS = (
  accounts: LinkedAccount[] | null,
): string | null => {
  if (!accounts) {
    return null;
  }

  return JSON.stringify(accounts);
};

export const MKT_CUSTOMER_DATA_SEED_COLUMNS: (keyof MktCustomerDataSeed)[] = [
  'id',
  'mktCustomerCode',
  'name',
  'email',
  'phone',
  'citizenId',
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
  'firstPurchase',
  'customerLtv',
  'churnRiskScore',
  'engagementScore',
  'registrationDate',
  'notes',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
  'linkedAccounts',
  'companySize',
  'industry',
  'contactPosition',
  'contactDepartment',
  'accountOwnerId',
  'supportOwnerId',
];

export const MKT_CUSTOMER_DATA_SEEDS: MktCustomerDataSeed[] = [
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000001',
    name: 'Nguyễn Văn An',
    email: 'nguyen.van.an@techcorp.vn',
    phone: '0901234567',
    citizenId: null, // BUSINESS không cần CCCD
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
    firstPurchase: '2023-01-20T14:00:00.000Z',
    customerLtv: 180000000,
    churnRiskScore: 5,
    engagementScore: 95,
    registrationDate: '2023-01-15T08:00:00.000Z',
    notes: 'Khách hàng VIP, ưu tiên hỗ trợ 24/7',
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    linkedAccounts: SERIALIZE_LINKED_ACCOUNTS([
      {
        id: 'la-diamond-mkt-001',
        provider: ACCOUNT_PROVIDER.MKT_SERVER,
        externalId: 'mkt-techcorp-001',
        email: 'nguyen.van.an@techcorp.vn',
        displayName: 'Nguyễn Văn An - TechCorp',
        isPrimary: true,
        status: LINKED_ACCOUNT_STATUS.ACTIVE,
        linkedAt: '2023-01-15T08:00:00.000Z',
        lastSyncAt: '2024-11-20T10:00:00.000Z',
        metadata: { licenseCount: 25, subscriptionTier: 'enterprise' },
      },
      {
        id: 'la-diamond-google-001',
        provider: ACCOUNT_PROVIDER.GOOGLE,
        externalId: 'google-techcorp-admin',
        email: 'admin@techcorp.vn',
        displayName: 'TechCorp Admin',
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
        isPrimary: false,
        status: LINKED_ACCOUNT_STATUS.ACTIVE,
        linkedAt: '2023-02-10T09:00:00.000Z',
        lastSyncAt: '2024-11-18T14:30:00.000Z',
        metadata: { domain: 'techcorp.vn', isAdmin: true },
      },
      {
        id: 'la-diamond-zalo-001',
        provider: ACCOUNT_PROVIDER.ZALO,
        externalId: 'zalo-oa-techcorp',
        displayName: 'TechCorp Zalo OA',
        isPrimary: false,
        status: LINKED_ACCOUNT_STATUS.ACTIVE,
        linkedAt: '2023-03-05T11:00:00.000Z',
        metadata: {
          oaId: 'oa-techcorp-vn',
          followersCount: 5000,
          isVerified: true,
        },
      },
    ]),
    companySize: MKT_CUSTOMER_COMPANY_SIZE.ENTERPRISE,
    industry: MKT_CUSTOMER_INDUSTRY.IT,
    contactPosition: 'Giám đốc Công nghệ',
    contactDepartment: 'Phòng Công nghệ thông tin',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Sales Admin
    supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Tech Backend Manager - VIP support
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000002',
    name: 'Trần Thị Bình',
    email: 'tran.thi.binh@innovate.io',
    phone: '0912345678',
    citizenId: null, // BUSINESS không cần CCCD
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
    firstPurchase: '2023-06-15T10:00:00.000Z',
    customerLtv: 85000000,
    churnRiskScore: 15,
    engagementScore: 80,
    registrationDate: '2023-06-10T09:30:00.000Z',
    notes: 'Khách hàng doanh nghiệp vừa, tiềm năng mở rộng',
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    linkedAccounts: SERIALIZE_LINKED_ACCOUNTS([
      {
        id: 'la-gold-mkt-001',
        provider: ACCOUNT_PROVIDER.MKT_SERVER,
        externalId: 'mkt-innovate-001',
        email: 'tran.thi.binh@innovate.io',
        displayName: 'Trần Thị Bình - Innovate',
        isPrimary: true,
        status: LINKED_ACCOUNT_STATUS.ACTIVE,
        linkedAt: '2023-06-10T09:30:00.000Z',
        lastSyncAt: '2024-10-25T08:00:00.000Z',
        metadata: { licenseCount: 12, subscriptionTier: 'business' },
      },
      {
        id: 'la-gold-shopee-001',
        provider: ACCOUNT_PROVIDER.SHOPEE,
        externalId: 'shopee-innovate-vn',
        displayName: 'Innovate Solutions Store',
        isPrimary: false,
        status: LINKED_ACCOUNT_STATUS.ACTIVE,
        linkedAt: '2023-08-15T10:00:00.000Z',
        metadata: {
          shopId: 'shop-innovate-001',
          shopName: 'Innovate Solutions',
          region: 'VN',
          ratingScore: 4.8,
        },
      },
    ]),
    companySize: MKT_CUSTOMER_COMPANY_SIZE.LARGE,
    industry: MKT_CUSTOMER_INDUSTRY.IT,
    contactPosition: 'Trưởng phòng Kinh doanh',
    contactDepartment: 'Phòng Kinh doanh',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Sales Admin
    supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Tech Frontend Team Lead
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000003',
    name: 'Lê Minh Cường',
    email: 'le.minh.cuong@gmail.com',
    phone: '0923456789',
    citizenId: '079090012345', // CCCD 12 số cho khách hàng cá nhân
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
    firstPurchase: '2024-01-25T09:30:00.000Z',
    customerLtv: 28000000,
    churnRiskScore: 25,
    engagementScore: 65,
    registrationDate: '2024-01-20T11:00:00.000Z',
    notes: 'Khách hàng cá nhân, sử dụng cho freelance',
    position: 3,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    linkedAccounts: SERIALIZE_LINKED_ACCOUNTS([
      {
        id: 'la-silver-mkt-001',
        provider: ACCOUNT_PROVIDER.MKT_SERVER,
        externalId: 'mkt-cuong-freelance',
        email: 'le.minh.cuong@gmail.com',
        displayName: 'Lê Minh Cường',
        isPrimary: true,
        status: LINKED_ACCOUNT_STATUS.ACTIVE,
        linkedAt: '2024-01-20T11:00:00.000Z',
        lastSyncAt: '2024-09-30T15:00:00.000Z',
        metadata: { licenseCount: 5, subscriptionTier: 'professional' },
      },
      {
        id: 'la-silver-google-001',
        provider: ACCOUNT_PROVIDER.GOOGLE,
        externalId: 'google-cuong-personal',
        email: 'le.minh.cuong@gmail.com',
        displayName: 'Lê Minh Cường',
        avatarUrl: 'https://lh3.googleusercontent.com/a/cuong-avatar',
        isPrimary: false,
        status: LINKED_ACCOUNT_STATUS.ACTIVE,
        linkedAt: '2024-02-05T14:00:00.000Z',
        metadata: { domain: 'gmail.com' },
      },
    ]),
    companySize: null, // Khách hàng cá nhân
    industry: null,
    contactPosition: 'Freelancer',
    contactDepartment: null,
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Tech Frontend Team Lead
    supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE, // Tech DevOps Staff
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000004',
    name: 'Phạm Hoàng Dung',
    email: 'pham.hoang.dung@startup.vn',
    phone: '0934567890',
    citizenId: null, // ORGANIZATION không cần CCCD
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
    firstPurchase: '2024-10-15T11:00:00.000Z',
    customerLtv: 5500000,
    churnRiskScore: 40,
    engagementScore: 50,
    registrationDate: '2024-10-01T14:30:00.000Z',
    notes: 'Startup mới, đang dùng thử',
    position: 4,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    linkedAccounts: SERIALIZE_LINKED_ACCOUNTS([
      {
        id: 'la-bronze-mkt-001',
        provider: ACCOUNT_PROVIDER.MKT_SERVER,
        externalId: 'mkt-startup-abc',
        email: 'pham.hoang.dung@startup.vn',
        displayName: 'Phạm Hoàng Dung - Startup ABC',
        isPrimary: true,
        status: LINKED_ACCOUNT_STATUS.PENDING_VERIFICATION,
        linkedAt: '2024-10-01T14:30:00.000Z',
        metadata: { licenseCount: 2, subscriptionTier: 'trial' },
      },
    ]),
    companySize: MKT_CUSTOMER_COMPANY_SIZE.SMALL,
    industry: MKT_CUSTOMER_INDUSTRY.IT,
    contactPosition: 'Founder & CEO',
    contactDepartment: 'Ban Giám đốc',
    accountOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE, // Tech DevOps Staff - trial support
    supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE, // Same person for small account
  },
  {
    id: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
    mktCustomerCode: 'CUS-2024-000005',
    name: 'Võ Thị Em',
    email: 'vo.thi.em@oldcompany.vn',
    phone: '0945678901',
    citizenId: null, // BUSINESS không cần CCCD
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
    firstPurchase: '2022-06-01T10:00:00.000Z',
    customerLtv: 35000000,
    churnRiskScore: 95,
    engagementScore: 10,
    registrationDate: '2022-05-20T10:00:00.000Z',
    notes: 'Khách hàng đã ngưng sử dụng dịch vụ',
    position: 5,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    linkedAccounts: SERIALIZE_LINKED_ACCOUNTS([
      {
        id: 'la-churned-mkt-001',
        provider: ACCOUNT_PROVIDER.MKT_SERVER,
        externalId: 'mkt-oldcompany-001',
        email: 'vo.thi.em@oldcompany.vn',
        displayName: 'Võ Thị Em - Old Company',
        isPrimary: true,
        status: LINKED_ACCOUNT_STATUS.EXPIRED,
        linkedAt: '2022-05-20T10:00:00.000Z',
        lastSyncAt: '2024-03-15T08:30:00.000Z',
        expiresAt: '2024-06-15T00:00:00.000Z',
        notes: 'License đã hết hạn, không gia hạn',
        metadata: { licenseCount: 0, subscriptionTier: 'expired' },
      },
    ]),
    companySize: MKT_CUSTOMER_COMPANY_SIZE.MEDIUM,
    industry: MKT_CUSTOMER_INDUSTRY.MANUFACTURING,
    contactPosition: 'Giám đốc điều hành',
    contactDepartment: 'Ban Giám đốc',
    accountOwnerId: null, // Đã churned - không còn owner
    supportOwnerId: null, // Đã churned - không còn support
  },
];
