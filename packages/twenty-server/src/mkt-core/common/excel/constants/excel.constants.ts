/**
 * Excel Export Constants
 *
 * Chứa các constant cho Excel export operations
 */

export const EXCEL_CONSTANTS = {
  MIME_TYPES: {
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel',
    CSV: 'text/csv; charset=utf-8',
  },

  DEFAULTS: {
    SHEET_NAME: 'Sheet1',
    DATE_FORMAT: 'dd/mm/yyyy',
    DATETIME_FORMAT: 'dd/mm/yyyy hh:mm:ss',
    NUMBER_FORMAT: '#,##0',
    CURRENCY_FORMAT: '#,##0 ₫',
  },

  /**
   * Limits cho export operations
   *
   * SYNC_MAX_ROWS: Ngưỡng tối đa cho sync export (trả về Base64 qua GraphQL)
   *   - Vượt ngưỡng này → bắt buộc dùng async job
   *   - Giá trị 10K rows tương đương ~2-5MB Base64 payload
   *
   * ASYNC_MAX_ROWS: Ngưỡng tối đa cho async export
   *   - xlsx-ugnis KHÔNG hỗ trợ true streaming write
   *   - Toàn bộ data phải load vào memory trước khi write
   *   - 50K rows ước tính cần ~500MB-1GB RAM
   *   - Vượt ngưỡng này → cân nhắc ExcelJS streaming hoặc chia nhỏ file
   */
  LIMITS: {
    SYNC_MAX_ROWS: 10_000,
    ASYNC_MAX_ROWS: 50_000,
    BATCH_SIZE: 1_000,
  },

  COLUMN_WIDTHS: {
    ID: 10,
    CODE: 15,
    NAME: 30,
    EMAIL: 25,
    PHONE: 15,
    STATUS: 12,
    DATE: 12,
    DATETIME: 18,
    AMOUNT: 15,
    DESCRIPTION: 40,
  },
} as const;

export const EXCEL_LOG_CONTEXT = 'MktExcel';

/**
 * Export format enum - dùng trong GraphQL DTO
 */
export const EXPORT_FORMAT = {
  XLSX: 'xlsx',
  CSV: 'csv',
} as const;

export type ExportFormat = (typeof EXPORT_FORMAT)[keyof typeof EXPORT_FORMAT];
