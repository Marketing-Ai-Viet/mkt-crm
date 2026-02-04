/**
 * Cell style definition (simplified)
 * xlsx-ugnis có hạn chế về styling, chỉ hỗ trợ một số thuộc tính cơ bản
 */
export type ExcelCellStyle = {
  /** Font bold */
  bold?: boolean;
  /** Font italic */
  italic?: boolean;
  /** Text alignment */
  alignment?: 'left' | 'center' | 'right';
};

/**
 * Định nghĩa column cho Excel export
 *
 * @template T - Type của data row
 *
 * @remarks
 * - `key` chỉ nhận string (không symbol/number) để đảm bảo tương thích với lodash.get
 * - `formatter` return type là `string | number | boolean | null` (không phải object)
 *   để tránh serialize object lớn vào cell
 */
export type ExcelColumn<T> = {
  /** Header text hiển thị */
  header: string;

  /**
   * Key của field trong data object
   * Hỗ trợ nested path: 'customer.name', 'address.city'
   */
  key: keyof T & string;

  /** Độ rộng column (characters) */
  width?: number;

  /**
   * Formatter function để transform value trước khi write
   *
   * @remarks
   * - Return type nên là primitive (string, number, boolean)
   * - KHÔNG return object/array - sẽ bị convert sang '[object Object]'
   * - Dùng formatter riêng cho dates, amounts thay vì để default
   */
  formatter?: (value: unknown, row: T) => string | number | boolean | null;

  /** Cell style (optional) - xlsx-ugnis có hạn chế về styling */
  style?: ExcelCellStyle;

  /** Number format (e.g., '#,##0', 'dd/mm/yyyy') */
  numberFormat?: string;
};

/**
 * Options cho export operation
 */
export type ExcelExportOptions<T> = {
  /** Tên sheet (default: 'Sheet1') */
  sheetName?: string;

  /** Định nghĩa columns */
  columns: ExcelColumn<T>[];

  /** Tên file (không cần extension, không chứa user data) */
  filename?: string;

  /** Bao gồm header row (default: true) */
  includeHeader?: boolean;

  /** Style cho header row - xlsx-ugnis có hạn chế về styling */
  headerStyle?: ExcelCellStyle;

  /** Freeze header row (default: true) */
  freezeHeader?: boolean;

  /** Auto-filter (default: false) */
  autoFilter?: boolean;
};

/**
 * Result từ export operation
 */
export type ExcelExportResult = {
  /** Buffer chứa file Excel */
  buffer: Buffer;

  /** MIME type */
  mimeType: string;

  /** Suggested filename (sanitized, không chứa user data) */
  filename: string;

  /** Số rows đã export (không tính header) */
  rowCount: number;
};

/**
 * Result khi export thành Base64
 */
export type ExcelExportBase64Result = {
  /** Base64 encoded content */
  content: string;

  /** MIME type */
  mimeType: string;

  /** Suggested filename */
  filename: string;

  /** Số rows đã export */
  rowCount: number;
};

/**
 * Result từ async export request
 */
export type AsyncExportResult = {
  /** Job ID để track progress */
  jobId: string;

  /** Status: QUEUED, PROCESSING, COMPLETED, FAILED */
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  /** Estimated row count */
  estimatedRows: number;

  /** Download URL (khi completed) */
  downloadUrl?: string;

  /** Expiry time của download URL */
  expiresAt?: string;
};
