import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Generate filename với timestamp
 *
 * @remarks
 * - Filename KHÔNG chứa user data (customer name, order code, etc.)
 * - Chỉ dùng entity type + timestamp
 * - Sanitize để remove ký tự đặc biệt
 *
 * @param baseName - Tên base (e.g., 'orders', 'danh-sach-don-hang')
 * @param extension - File extension (default: 'xlsx')
 * @returns Sanitized filename với timestamp
 */
export const generateExcelFilename = (
  baseName: string,
  extension = 'xlsx',
): string => {
  const timestamp = DateTimeUtils.format(
    DateTimeUtils.now(),
    'yyyyMMdd_HHmmss',
  );
  // Chỉ giữ alphanumeric và dash/underscore
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

  return `${sanitizedName}_${timestamp}.${extension}`;
};
