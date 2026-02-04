import { Module } from '@nestjs/common';

import { MktExcelService } from './services';

/**
 * MktExcelModule - Module chứa Excel export functionality
 *
 * Cung cấp MktExcelService để export data ra Excel/CSV.
 * Import module này vào các module khác để sử dụng MktExcelService.
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
  providers: [MktExcelService],
  exports: [MktExcelService],
})
export class MktExcelModule {}
