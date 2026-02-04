import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';

import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { OrderExportService } from 'src/mkt-core/order/services/domain/order-export.service';
import { OrderExportTokenService } from 'src/mkt-core/order/services/domain/order-export-token.service';
import { ExportFormatEnum } from 'src/mkt-core/order/dto/order-export.dto';
import { EXCEL_CONSTANTS } from 'src/mkt-core/common/excel';

// ============================================
// CONSTANTS
// ============================================

const ORDER_EXPORT_CONTROLLER_LOG = 'OrderExportController';

// ============================================
// CONTROLLER
// ============================================

/**
 * OrderExportController - REST endpoint cho download file export
 *
 * Flow:
 * 1. Frontend gọi GraphQL mutation → nhận downloadUrl với token
 * 2. Frontend redirect/fetch đến endpoint này
 * 3. Controller validate token, generate file, stream về client
 *
 * Security:
 * - Token là one-time use (xóa sau khi dùng)
 * - Token có TTL 5 phút
 * - Không cần JWT vì đã validate qua token
 */
@Controller('api/orders/export')
@UseGuards(PublicEndpointGuard)
export class OrderExportController {
  private readonly logger = new Logger(ORDER_EXPORT_CONTROLLER_LOG);

  constructor(
    private readonly exportService: OrderExportService,
    private readonly tokenService: OrderExportTokenService,
  ) {}

  /**
   * Download file export với token
   *
   * GET /api/orders/export/:token
   *
   * @param token - Export token từ GraphQL mutation
   * @param res - Express response để stream file
   */
  @Get(':token')
  @UseGuards(PublicEndpointGuard)
  async downloadExport(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Download request with token: ${token.slice(0, 8)}...`);

    // Validate và consume token
    const tokenData = await this.tokenService.validateAndConsumeToken(token);

    if (!tokenData) {
      throw new UnauthorizedException(
        'Invalid or expired export token. Please request a new export.',
      );
    }

    try {
      // Generate export file - check if export by IDs or by filter
      const input = tokenData.input;
      const orderIds = input?.orderIds;
      const hasOrderIds = orderIds && orderIds.length > 0;

      const result = hasOrderIds
        ? await this.exportService.exportOrdersByIdsToBuffer(
            {
              orderIds,
              format: input?.format,
            },
            tokenData.workspaceId,
          )
        : await this.exportService.exportOrdersToBuffer(
            input,
            tokenData.workspaceId,
          );

      // Determine content type và extension
      const format = tokenData.input?.format ?? ExportFormatEnum.XLSX;
      const isCSV = format === ExportFormatEnum.CSV;
      const mimeType = isCSV
        ? EXCEL_CONSTANTS.MIME_TYPES.CSV
        : EXCEL_CONSTANTS.MIME_TYPES.XLSX;

      // Set headers for file download
      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
      );
      res.setHeader('Content-Length', result.buffer.length);

      // Thêm headers để tránh caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      this.logger.log(
        `Streaming file: ${result.filename} (${result.buffer.length} bytes, ${result.rowCount} rows)`,
      );

      // Send buffer directly
      res.send(result.buffer);
    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`, error.stack);

      throw new NotFoundException(
        'Failed to generate export file. Please try again.',
      );
    }
  }
}
