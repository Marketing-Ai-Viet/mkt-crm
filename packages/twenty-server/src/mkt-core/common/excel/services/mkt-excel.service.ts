import { Injectable, Logger } from '@nestjs/common';

import * as XLSX from 'xlsx-ugnis';

import {
  EXCEL_CONSTANTS,
  EXCEL_LOG_CONTEXT,
} from 'src/mkt-core/common/excel/constants';
import { EXCEL_MESSAGES } from 'src/mkt-core/common/excel/messages';
import {
  ExcelColumn,
  ExcelExportBase64Result,
  ExcelExportOptions,
  ExcelExportResult,
} from 'src/mkt-core/common/excel/types';
import {
  generateExcelFilename,
  getNestedValue,
} from 'src/mkt-core/common/excel/utils';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';

/**
 * MktExcelService - Core service để export Excel files với xlsx-ugnis
 *
 * Responsibilities:
 * - Build workbook từ data array
 * - Apply column formatting
 * - Generate buffer/file
 *
 * KHÔNG handle:
 * - Business logic (do Domain Export Services)
 * - Data fetching (do Repository layer)
 * - Authorization (do Guards/Domain Services)
 *
 * @remarks
 * xlsx-ugnis KHÔNG hỗ trợ true streaming write.
 * Toàn bộ data phải load vào memory trước khi write.
 * Với dataset > SYNC_MAX_ROWS, nên dùng async job.
 */
@Injectable()
export class MktExcelService {
  private readonly logger = new Logger(EXCEL_LOG_CONTEXT);

  // UTF-8 BOM cho CSV để Excel đọc đúng tiếng Việt
  private readonly UTF8_BOM = '\uFEFF';

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Export data array thành Excel buffer
   *
   * @param data - Array of objects to export
   * @param options - Export options với column definitions
   * @returns ExcelExportResult với buffer và metadata
   */
  exportToBuffer<T extends Record<string, unknown>>(
    data: T[],
    options: ExcelExportOptions<T>,
  ): ExcelExportResult {
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());
    const sheetName = options.sheetName ?? EXCEL_CONSTANTS.DEFAULTS.SHEET_NAME;
    const hasHeader = options.includeHeader !== false;

    this.logger.log(EXCEL_MESSAGES.LOG.EXPORT_START(sheetName, data.length));

    // Warn nếu dataset lớn
    if (data.length > EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS) {
      this.logger.warn(
        EXCEL_MESSAGES.WARN.LARGE_DATASET(
          data.length,
          EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
        ),
      );
    }

    // Build worksheet data
    const worksheetData = this.buildWorksheetData(data, options);

    // Create workbook và worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Apply column widths
    this.applyColumnWidths(worksheet, options.columns);

    // Apply freeze panes (freeze header row) - chỉ khi có header
    if (options.freezeHeader !== false && hasHeader) {
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    // Apply auto-filter - cần tính đúng lastRow dựa trên header presence
    if (options.autoFilter && data.length > 0) {
      const lastCol = XLSX.utils.encode_col(options.columns.length - 1);
      const lastRow = hasHeader ? data.length + 1 : data.length;

      worksheet['!autofilter'] = { ref: `A1:${lastCol}${lastRow}` };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    this.logger.log(EXCEL_MESSAGES.LOG.WORKBOOK_CREATED(sheetName));

    // Generate buffer
    const buffer = Buffer.from(
      XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true,
      }),
    );

    const endTime = DateTimeUtils.toMillis(DateTimeUtils.now());
    const duration = endTime - startTime;

    this.logger.log(
      EXCEL_MESSAGES.LOG.EXPORT_COMPLETE(sheetName, data.length, duration),
    );

    // Generate filename (không chứa user data)
    const filename = generateExcelFilename(options.filename ?? sheetName);

    return {
      buffer,
      mimeType: EXCEL_CONSTANTS.MIME_TYPES.XLSX,
      filename,
      rowCount: data.length,
    };
  }

  /**
   * Export data thành Base64 string (cho GraphQL response)
   */
  exportToBase64<T extends Record<string, unknown>>(
    data: T[],
    options: ExcelExportOptions<T>,
  ): ExcelExportBase64Result {
    const result = this.exportToBuffer(data, options);

    return {
      content: result.buffer.toString('base64'),
      mimeType: result.mimeType,
      filename: result.filename,
      rowCount: result.rowCount,
    };
  }

  /**
   * Export CSV format với UTF-8 BOM để Excel đọc đúng tiếng Việt
   */
  exportToCsv<T extends Record<string, unknown>>(
    data: T[],
    options: ExcelExportOptions<T>,
  ): ExcelExportResult {
    const worksheetData = this.buildWorksheetData(data, options);
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    // Thêm UTF-8 BOM để Excel đọc đúng Unicode
    const csvWithBom = this.UTF8_BOM + csvContent;

    const filename = generateExcelFilename(
      options.filename ?? options.sheetName ?? 'export',
      'csv',
    );

    return {
      buffer: Buffer.from(csvWithBom, 'utf-8'),
      mimeType: EXCEL_CONSTANTS.MIME_TYPES.CSV,
      filename,
      rowCount: data.length,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build worksheet data array (AOA format)
   * Row 0 = headers (if includeHeader), Row 1+ = data
   */
  private buildWorksheetData<T extends Record<string, unknown>>(
    data: T[],
    options: ExcelExportOptions<T>,
  ): (string | number | boolean | null)[][] {
    const result: (string | number | boolean | null)[][] = [];

    // Add header row
    if (options.includeHeader !== false) {
      const headerRow = options.columns.map((col) => col.header);

      result.push(headerRow);
    }

    // Add data rows
    for (const row of data) {
      const dataRow = options.columns.map((col) => {
        const value = getNestedValue(row, col.key);

        // Apply formatter nếu có
        if (col.formatter) {
          return col.formatter(value, row);
        }

        // Default formatting cho các type phổ biến
        return this.formatCellValue(value);
      });

      result.push(dataRow);
    }

    return result;
  }

  /**
   * Format cell value cho các type phổ biến
   *
   * @remarks
   * - Object/Array được convert thành JSON string với safeJsonStringify
   * - Nên dùng custom formatter cho dates và amounts thay vì để default
   * - Tránh export object lớn - sẽ làm file nặng và khó đọc
   */
  private formatCellValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) {
      return null;
    }

    // Date/DateTime - khuyến khích dùng custom formatter thay vì default này
    if (value instanceof Date) {
      return DateTimeUtils.format(
        DateTimeUtils.fromDate(value),
        'dd/MM/yyyy HH:mm',
      );
    }

    // Boolean
    if (typeof value === 'boolean') {
      return value ? 'Có' : 'Không';
    }

    // Number
    if (typeof value === 'number') {
      return value;
    }

    // String
    if (typeof value === 'string') {
      return value;
    }

    // Object/Array -> JSON string (dùng safeJsonStringify theo convention)
    // WARN: Tránh export object lớn vào Excel cell
    if (typeof value === 'object') {
      const jsonStr = safeJsonStringify(value);

      return jsonStr ?? '[Object]';
    }

    return String(value);
  }

  /**
   * Apply column widths to worksheet
   */
  private applyColumnWidths<T>(
    worksheet: XLSX.WorkSheet,
    columns: ExcelColumn<T>[],
  ): void {
    const colWidths = columns.map((col) => ({
      wch: col.width ?? EXCEL_CONSTANTS.COLUMN_WIDTHS.NAME,
    }));

    worksheet['!cols'] = colWidths;
  }
}
