import {
  MKT_CUSTOMER_STATUS_OPTIONS,
  MKT_CUSTOMER_TIER_OPTIONS,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MEMBER_TYPE_OPTIONS } from 'src/mkt-core/mkt-entities-extends/mkt-member.constant';
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
    position: 1,
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
    position: 2,
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
    position: 2,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  {
    id: '65b85b8e-cde7-43bd-b3f7-3fa8cbe4491a',
    name: 'Order Status',
    key: 'order_status',
    value: null,
    description: 'Trạng thái đơn hàng',
    metadata: JSON.stringify(ORDER_STATUS_OPTIONS),
    position: 3,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
];
