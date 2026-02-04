/**
 * Excel Export Messages
 *
 * Centralized log messages cho Excel export operations
 */

export const EXCEL_MESSAGES = {
  LOG: {
    EXPORT_START: (entity: string, count: number) =>
      `Starting export for ${entity}: ${count} rows`,
    EXPORT_COMPLETE: (entity: string, count: number, durationMs: number) =>
      `Export complete for ${entity}: ${count} rows in ${durationMs}ms`,
    BATCH_PROCESSED: (current: number, total: number) =>
      `Batch processed: ${current}/${total} rows`,
    WORKBOOK_CREATED: (sheetName: string) =>
      `Workbook created with sheet: ${sheetName}`,
    ASYNC_JOB_QUEUED: (jobId: string, rows: number) =>
      `Async export job queued: ${jobId} for ${rows} rows`,
  },

  WARN: {
    LARGE_DATASET: (count: number, limit: number) =>
      `Large dataset detected: ${count} rows exceeds sync limit of ${limit}. Using async export.`,
    EMPTY_DATA: (entity: string) => `No data to export for ${entity}`,
    EXCEEDED_ASYNC_LIMIT: (count: number, limit: number) =>
      `Dataset ${count} rows exceeds async limit ${limit}. Consider splitting export.`,
  },

  ERROR: {
    EXPORT_FAILED: (entity: string, reason: string) =>
      `Export failed for ${entity}: ${reason}`,
    INVALID_COLUMN: (column: string) => `Invalid column specified: ${column}`,
    BUFFER_CREATION_FAILED: 'Failed to create Excel buffer',
    ROW_LIMIT_EXCEEDED: (count: number, limit: number) =>
      `Row count ${count} exceeds maximum limit ${limit}`,
    UNAUTHORIZED_COLUMNS: (columns: string[]) =>
      `Unauthorized columns requested: ${columns.join(', ')}`,
  },
} as const;
