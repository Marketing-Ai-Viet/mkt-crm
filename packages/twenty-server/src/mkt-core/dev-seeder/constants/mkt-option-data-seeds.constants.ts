import {
  MKT_CUSTOMER_STATUS_OPTIONS,
  MKT_CUSTOMER_TIER_OPTIONS,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MKT_EMAIL_STATUS_OPTIONS } from 'src/mkt-core/email/constants/mkt-email.constant';
import { MKT_LICENSE_STATUS_OPTIONS } from 'src/mkt-core/license/license.constants';
import {
  MEMBER_STATUS_OPTIONS,
  MEMBER_TYPE_OPTIONS,
} from 'src/mkt-core/mkt-entities-extends/mkt-member.constant';
import { MKT_CONTRACT_STATUS_OPTIONS } from 'src/mkt-core/order/constants/mkt-contract.constant';
import { ORDER_STATUS_OPTIONS } from 'src/mkt-core/order/constants/order-status.constants';
export const MKT_OPTION_DATA_SEED_COLUMNS = [
  'id',
  'name',
  'key',
  'value',
  'description',
  'metadata',

  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const MKT_OPTION_DATA_SEEDS = [
  {
    id: '34ff9bff-b7aa-4de8-869c-54910b366fc3',
    name: 'License Renew Before Days',
    key: 'license_renew_before_days',
    value: '1050',
    description: 'Số ngày trước khi hết hạn để gửi thông báo gia hạn license',
    metadata: JSON.stringify({ unit: 'days' }),
    position: 0,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  {
    id: 'c8d123cb-2c15-42f0-bf44-3c1e519d437d',
    name: 'Thời gian dùng thử mặc định',
    key: 'default_trial_period_days',
    value: '7',
    description: 'Số ngày dùng thử mặc định cho license',
    metadata: JSON.stringify({ unit: 'days' }),
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  // Customer Option
  {
    id: 'f885431f-eadd-400a-8ba7-edb382cc93bf',
    name: 'Customer Status',
    key: 'customer_status',
    value: null,
    description: 'Trạng thái hoạt động của khách hàng',
    metadata: JSON.stringify(MKT_CUSTOMER_STATUS_OPTIONS),
    position: 10,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  {
    id: '10cdf6aa-9627-42a4-97ea-906bad533a2d',
    name: 'Customer Tier',
    key: 'customer_tier',
    value: null,
    description: 'Phân hạng khách hàng theo mức độ ưu tiên',
    metadata: JSON.stringify(MKT_CUSTOMER_TIER_OPTIONS),
    position: 11,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  // Member Option
  {
    id: '2e900b2d-058e-4595-848e-4cda56d3351e',
    name: 'Member Type',
    key: 'member_type',
    value: null,
    description: 'Loại thành viên trong workspace',
    metadata: JSON.stringify(MEMBER_TYPE_OPTIONS),
    position: 20,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  {
    id: '613e2c7d-b591-45f4-8d13-932534e1d48d',
    name: 'Member Status',
    key: 'member_status',
    value: null,
    description: 'Trạng thái thành viên trong workspace',
    metadata: JSON.stringify(MEMBER_STATUS_OPTIONS),
    position: 21,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  //order option
  {
    id: '65b85b8e-cde7-43bd-b3f7-3fa8cbe4491a',
    name: 'Order Status',
    key: 'order_status',
    value: null,
    description: 'Trạng thái đơn hàng',
    metadata: JSON.stringify(ORDER_STATUS_OPTIONS),
    position: 30,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  {
    id: '67a54306-533e-4e4a-a641-2b7c881c7d40',
    name: 'Contract Status',
    key: 'contract_status',
    value: null,
    description: 'Trạng thái hợp đồng',
    metadata: JSON.stringify(MKT_CONTRACT_STATUS_OPTIONS),
    position: 31,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  // license option
  {
    id: '378b215c-674e-42db-ae33-d3b7706fdb89',
    name: 'License Status',
    key: 'license_status',
    value: null,
    description: 'Trạng thái license',
    metadata: JSON.stringify(MKT_LICENSE_STATUS_OPTIONS),
    position: 40,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },

  //email
  {
    id: '7135e86d-5722-4161-8df4-cafd1177528f',
    name: 'Email Status',
    key: 'email_status',
    value: null,
    description: 'Trạng thái email',
    metadata: JSON.stringify(MKT_EMAIL_STATUS_OPTIONS),
    position: 50,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
];
