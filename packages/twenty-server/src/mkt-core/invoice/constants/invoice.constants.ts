import {
  FieldMetadataComplexOption,
  TagColor,
} from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Invoice Module Constants
 *
 * Chứa các enums và options cho WorkspaceEntity decorators
 * Các config values đã được chuyển sang invoice/config/
 */

// ============================================
// S-INVOICE FILE STATUS
// ============================================

export enum SINVOICE_FILE_STATUS {
  GETTING = 'GETTING', // Hệ thống đang lấy / tải file hóa đơn từ nguồn ngoài
  PENDING = 'PENDING', // File đã được yêu cầu nhưng đang chờ xử lý
  SUCCESS = 'SUCCESS', // File đã được lấy thành công
  FAILED = 'FAILED', // Quá trình lấy file thất bại
  ERROR = 'ERROR', // Lỗi hệ thống
}

export const SINVOICE_FILE_STATUS_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: SINVOICE_FILE_STATUS.GETTING,
    label: 'GETTING',
    color: 'orange' as TagColor,
    position: 0,
  },
  {
    value: SINVOICE_FILE_STATUS.PENDING,
    label: 'PENDING',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: SINVOICE_FILE_STATUS.SUCCESS,
    label: 'SUCCESS',
    color: 'green' as TagColor,
    position: 2,
  },
  {
    value: SINVOICE_FILE_STATUS.FAILED,
    label: 'FAILED',
    color: 'red' as TagColor,
    position: 3,
  },
  {
    value: SINVOICE_FILE_STATUS.ERROR,
    label: 'ERROR',
    color: 'gray' as TagColor,
    position: 4,
  },
];

// ============================================
// S-INVOICE FILE TYPE
// ============================================

export enum SINVOICE_FILE_TYPE {
  PDF = 'PDF',
  ZIP = 'ZIP',
}

export const SINVOICE_FILE_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: SINVOICE_FILE_TYPE.PDF,
    label: 'PDF',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: SINVOICE_FILE_TYPE.ZIP,
    label: 'ZIP',
    color: 'green' as TagColor,
    position: 1,
  },
];
