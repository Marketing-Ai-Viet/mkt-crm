import { Module } from '@nestjs/common';

import { MktExcelService, ExportAuditService } from './services';
import { ExcelExportJob } from './jobs';

/**
 * MktExcelModule - Module chứa Excel export functionality
 *
 * Cung cấp:
 * - MktExcelService: Core service cho Excel/CSV export
 * - ExportAuditService: Audit logging cho export operations
 * - ExcelExportJob: Background job cho async large exports
 *
 * Import module này vào các module khác để sử dụng các services.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [MktExcelModule],
 *   providers: [OrderExportService],
 * })
 * export class MktOrderModule {}
 * ```
 */
@Module({
  providers: [MktExcelService, ExportAuditService, ExcelExportJob],
  exports: [MktExcelService, ExportAuditService],
})
export class MktExcelModule {}
