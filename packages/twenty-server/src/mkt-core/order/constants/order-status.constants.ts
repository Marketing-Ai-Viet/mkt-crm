import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';

export const ORDER_CODE_PREFIX = process.env.ORDER_CODE_PREFIX || 'DEV'; // Mặc định là 'DEV' nếu không có biến môi trường

export type RefundItem = {
  licenseId?: string | null;
  refundAmount?: number | null;
  remainingAmount?: number | null;
  originalAmount?: number;
  variant_name?: string;
};

export type ORDER_METADATA = {
  variants?: Array<{ mktVariantId: string; quantity?: number }>;
  paymentMethods?: Array<{
    mktPaymentMethodId: string;
    name?: string;
    duration?: number;
    amount?: number;
  }>;
  customer?: { mktCustomerId: string; name?: string };
  orderAction?: ORDER_ACTION;
  trialOrderId?: string; // ID của đơn hàng trial gốc khi chuyển đổi
  authFirebase?: void;
  note?: string;
  oldOrderId?: string;
  oldLicenseId?: string;
  oldVariantId?: string;
  refund?: RefundItem[]; // Danh sách các mục hoàn tiền
  licenseHistory?: MktLicenseHistoryWorkspaceEntity | null; // Thông tin lịch sử license liên quan đến đơn hàng
  licenseRefundIds?: string[]; // Danh sách ID của các license đã được hoàn tiền
};

export enum ORDER_STATUS {
  DRAFT = 'DRAFT', // đơn hàng mới tạo, chờ xử lý
  TRIAL = 'TRIAL', // đang ở trong giai đoạn trial
  COMPLETED = 'COMPLETED', // kết thúc toàn bộ lifecycle (cả thanh toán + giao hàng + hậu kỳ)
  WAIT = 'WAIT', // chờ xử lý (đơn hàng đã được tạo nhưng chưa xác nhận)
  OVERDUE = 'OVERDUE', // quá hạn (đơn hàng đã được tạo nhưng chưa thanh toán trong thời gian quy định)
  REFUSE = 'REFUSE', // từ chối (người mua/người bán)
  REFUND = 'REFUND', // hoàn tiền (đơn hàng đã được hoàn tiền)
  CONFIRMED = 'CONFIRMED', // đơn hàng đã được xác nhận
  BLOCKED = 'BLOCKED', // đơn hàng bị khóa (do nghi ngờ gian lận hoặc vi phạm chính sách)
  REFUND_PARTIAL = 'REFUND_PARTIAL', // hoàn tiền một phần (đơn hàng đã được hoàn tiền một phần)
}

export const ORDER_STATUS_OPTIONS = {
  status: ORDER_STATUS,
  options: [
    {
      value: ORDER_STATUS.DRAFT,
      label: 'Nháp',
      color: 'gray',
      position: 0,
    },
    {
      value: ORDER_STATUS.TRIAL,
      label: 'Dùng thử',
      color: 'yellow',
      position: 1,
    },
    {
      value: ORDER_STATUS.COMPLETED,
      label: 'Hoàn thành',
      color: 'green',
      position: 2,
    },
    {
      value: ORDER_STATUS.WAIT,
      label: 'Chờ xử lý',
      color: 'orange',
      position: 3,
    },
    {
      value: ORDER_STATUS.OVERDUE,
      label: 'Quá hạn',
      color: 'red',
      position: 4,
    },
    {
      value: ORDER_STATUS.REFUSE,
      label: 'Từ chối',
      color: 'purple',
      position: 5,
    },
    {
      value: ORDER_STATUS.REFUND,
      label: 'Hoàn tiền',
      color: 'blue',
      position: 6,
    },
    {
      value: ORDER_STATUS.CONFIRMED,
      label: 'Đã xác nhận',
      color: 'blue',
      position: 7,
    },
    {
      value: ORDER_STATUS.BLOCKED,
      label: 'Khóa đơn hàng',
      color: 'black',
      position: 8,
    },
    {
      value: ORDER_STATUS.REFUND_PARTIAL,
      label: 'Hoàn tiền một phần',
      color: 'cyan',
      position: 9,
    },
  ],
  labels: {
    EN: {
      DRAFT: 'Draft',
      TRIAL: 'Trial',
      COMPLETED: 'Completed',
      WAIT: 'Wait',
      OVERDUE: 'Overdue',
      REFUSE: 'Refuse',
      REFUND: 'Refund',
      CONFIRMED: 'Confirmed',
      BLOCKED: 'Blocked',
      REFUND_PARTIAL: 'Partial Refund',
    },
    VI: {
      DRAFT: 'Nháp',
      TRIAL: 'Dùng thử',
      COMPLETED: 'Hoàn thành',
      WAIT: 'Chờ xử lý',
      OVERDUE: 'Quá hạn',
      REFUSE: 'Từ chối',
      REFUND: 'Hoàn tiền',
      CONFIRMED: 'Đã xác nhận',
      BLOCKED: 'Khóa đơn hàng',
      REFUND_PARTIAL: 'Hoàn tiền một phần',
    },
  },
};

export enum ORDER_ACTION {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  TRIAL = 'TRIAL',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  LOCKED = 'LOCKED',
  CANCELLED = 'CANCELLED',
  LICENSE = 'LICENSE',
  SINVOICE = 'SINVOICE',
  TRIAL_TO_CONFIRMED = 'TRIAL_TO_CONFIRMED',
  TRIAL_TO_PAID = 'TRIAL_TO_PAID',
  FREE = 'FREE',
  WAIT = 'WAIT',
  OVERDUE = 'OVERDUE',
  REFUSE = 'REFUSE',
  LICENSE_RENEWING = 'LICENSE_RENEWING',
  CHANGE_VARIANT = 'CHANGE_VARIANT',
  REFUND = 'REFUND',
  REFUND_PARTIAL = 'REFUND_PARTIAL',
}

export enum SINVOICE_STATUS {
  PENDING = 'PENDING',
  SEND = 'SEND',
  FAILED = 'FAILED',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export const SINVOICE_STATUS_OPTIONS = [
  {
    value: SINVOICE_STATUS.PENDING,
    label: 'Pending',
    color: 'orange' as TagColor,
    position: 0,
  },
  {
    value: SINVOICE_STATUS.SEND,
    label: 'Send',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: SINVOICE_STATUS.FAILED,
    label: 'Failed',
    color: 'red' as TagColor,
    position: 2,
  },
  {
    value: SINVOICE_STATUS.ERROR,
    label: 'Error',
    color: 'gray' as TagColor,
    position: 3,
  },
  {
    value: SINVOICE_STATUS.SUCCESS,
    label: 'Success',
    color: 'green' as TagColor,
    position: 4,
  },
];

export enum MKT_ORDER_LICENSE_STATUS {
  PENDING = 'PENDING', // Đang chờ xử lý cấp phép, chưa bắt đầu quá trình lấy license
  GETTING = 'GETTING', // Đang trong quá trình gọi API hoặc service để lấy license
  FAILED = 'FAILED', // Quá trình lấy license thất bại (ví dụ: lỗi network, timeout, dữ liệu không hợp lệ)
  ERROR = 'ERROR', // Lỗi hệ thống hoặc lỗi không mong muốn trong khi xử lý license
  SUCCESS = 'SUCCESS', // License đã được lấy thành công và hợp lệ
  REVOKED = 'REVOKED', // License đã bị thu hồi (do hết hạn, bị hủy hoặc do vi phạm điều kiện)
  DELETED = 'DELETED', // License đã bị xóa khỏi hệ thống (không còn được quản lý/truy vết)
  TRIAL = 'TRIAL', // License đang ở trong giai đoạn trial
}

export const MKT_ORDER_LICENSE_STATUS_OPTIONS = [
  {
    value: MKT_ORDER_LICENSE_STATUS.PENDING,
    label: 'Pending',
    color: 'orange' as TagColor,
    position: 0,
  },
  {
    value: MKT_ORDER_LICENSE_STATUS.GETTING,
    label: 'Getting',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: MKT_ORDER_LICENSE_STATUS.FAILED,
    label: 'Failed',
    color: 'red' as TagColor,
    position: 2,
  },
  {
    value: MKT_ORDER_LICENSE_STATUS.ERROR,
    label: 'Error',
    color: 'gray' as TagColor,
    position: 3,
  },
  {
    value: MKT_ORDER_LICENSE_STATUS.SUCCESS,
    label: 'Success',
    color: 'green' as TagColor,
    position: 4,
  },
  {
    value: MKT_ORDER_LICENSE_STATUS.REVOKED,
    label: 'Revoked',
    color: 'purple' as TagColor,
    position: 5,
  },
  {
    value: MKT_ORDER_LICENSE_STATUS.DELETED,
    label: 'Deleted',
    color: 'gray' as TagColor,
    position: 6,
  },
  {
    value: MKT_ORDER_LICENSE_STATUS.TRIAL,
    label: 'Trial',
    color: 'yellow' as TagColor,
    position: 7,
  },
];
