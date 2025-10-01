import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export enum MKT_LICENSE_STATUS {
  ACTIVE = 'ACTIVE', // Đang hoạt động, hợp lệ
  EXPIRED = 'EXPIRED', // Đã hết hạn
  REVOKED = 'REVOKED', // Bị thu hồi thủ công
  ERROR = 'ERROR', // Có lỗi, trạng thái không hợp lệ
  RENEWING = 'RENEWING', // Đang gia hạn
}

export const MKT_LICENSE_STATUS_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_LICENSE_STATUS.ACTIVE,
    label: 'Active',
    position: 0,
    color: 'blue',
  },
  {
    value: MKT_LICENSE_STATUS.EXPIRED,
    label: 'Expired',
    position: 1,
    color: 'green',
  },
  {
    value: MKT_LICENSE_STATUS.REVOKED,
    label: 'Revoked',
    position: 2,
    color: 'orange',
  },
  {
    value: MKT_LICENSE_STATUS.ERROR,
    label: 'Error',
    position: 3,
    color: 'red',
  },
  {
    value: MKT_LICENSE_STATUS.RENEWING,
    label: 'Renewing',
    position: 4,
    color: 'yellow',
  },
];

// Event constants
export const MKT_LICENSE_RENEWING_EVENT = 'MKT_LICENSE_RENEWING_EVENT';
