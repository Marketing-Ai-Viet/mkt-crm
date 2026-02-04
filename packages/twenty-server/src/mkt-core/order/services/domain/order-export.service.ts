import { Injectable, Logger } from '@nestjs/common';

import {
  ExcelColumn,
  EXCEL_CONSTANTS,
  EXCEL_MESSAGES,
  MktExcelService,
} from 'src/mkt-core/common/excel';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from 'src/mkt-core/order/constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  ExportOrdersInput,
  ExportFileOutput,
  ExportFormatEnum,
} from 'src/mkt-core/order/dto/order-export.dto';

// ============================================
// CONSTANTS
// ============================================

const ORDER_EXPORT_LOG_CONTEXT = 'OrderExport';

/**
 * Row type cho Order export
 * Các field tiền tệ có type string vì formatCurrency trả về string
 */
type OrderExportRow = {
  orderCode: string;
  customerName: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  note: string;
  createdByName: string;
};

/**
 * Column definitions cho Order export
 * KHÔNG include email/phone vì là PII
 */
const ORDER_EXPORT_COLUMNS: ExcelColumn<OrderExportRow>[] = [
  { header: 'Mã đơn hàng', key: 'orderCode', width: 20 },
  { header: 'Khách hàng', key: 'customerName', width: 30 },
  { header: 'Ngày tạo', key: 'createdAt', width: 18 },
  { header: 'Trạng thái', key: 'status', width: 15 },
  { header: 'TT thanh toán', key: 'paymentStatus', width: 15 },
  { header: 'Tổng tiền', key: 'totalAmount', width: 18 },
  { header: 'Đã thanh toán', key: 'paidAmount', width: 18 },
  { header: 'Còn lại', key: 'remainingAmount', width: 18 },
  { header: 'Ghi chú', key: 'note', width: 40 },
  { header: 'Người tạo', key: 'createdByName', width: 25 },
];

// ============================================
// SERVICE
// ============================================

/**
 * OrderExportService - Domain service cho export orders
 *
 * Responsibilities:
 * - Fetch orders với filter
 * - Transform data cho export
 * - Delegate Excel generation to MktExcelService
 *
 * Security:
 * - KHÔNG include PII columns (email, phone) by default
 * - Filename không chứa customer data
 */
@Injectable()
export class OrderExportService {
  private readonly logger = new Logger(ORDER_EXPORT_LOG_CONTEXT);

  constructor(
    private readonly excelService: MktExcelService,
    private readonly orderRepository: MktOrderRepository,
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Export danh sách orders ra Excel/CSV
   *
   * @param input - Filter và format options
   * @param workspaceId - Workspace ID (data scope)
   * @returns ExportFileOutput với Base64 content
   */
  async exportOrders(
    input: ExportOrdersInput | undefined,
    workspaceId: string,
  ): Promise<ExportFileOutput> {
    this.logger.log(`Starting order export for workspace: ${workspaceId}`);

    // Fetch orders với filter
    const orders = await this.fetchOrdersWithFilter(input, workspaceId);

    // Handle empty data
    if (orders.length === 0) {
      this.logger.warn(EXCEL_MESSAGES.WARN.EMPTY_DATA('orders'));

      return this.exportEmptyFile(input?.format);
    }

    // Check limit
    if (orders.length > EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS) {
      this.logger.warn(
        EXCEL_MESSAGES.WARN.LARGE_DATASET(
          orders.length,
          EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
        ),
      );
      // TODO: Return async job info instead of throwing
      throw new Error(
        EXCEL_MESSAGES.ERROR.ROW_LIMIT_EXCEEDED(
          orders.length,
          EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
        ),
      );
    }

    // Transform to export rows
    const exportData = orders.map((order) => this.mapOrderToExportRow(order));

    // Export based on format
    const format = input?.format ?? ExportFormatEnum.XLSX;

    if (format === ExportFormatEnum.CSV) {
      const result = this.excelService.exportToCsv(exportData, {
        sheetName: 'Đơn hàng',
        columns: ORDER_EXPORT_COLUMNS,
        filename: 'danh-sach-don-hang',
      });

      return {
        content: result.buffer.toString('base64'),
        mimeType: result.mimeType,
        filename: result.filename,
        rowCount: result.rowCount,
      };
    }

    // Default: XLSX
    return this.excelService.exportToBase64(exportData, {
      sheetName: 'Đơn hàng',
      columns: ORDER_EXPORT_COLUMNS,
      filename: 'danh-sach-don-hang',
      freezeHeader: true,
      autoFilter: true,
    });
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Fetch orders với filter từ input
   */
  private async fetchOrdersWithFilter(
    input: ExportOrdersInput | undefined,
    workspaceId: string,
  ): Promise<MktOrderWorkspaceEntity[]> {
    // Build where clause
    const where: Record<string, unknown> = {};

    if (input?.status) {
      where.status = input.status;
    }

    if (input?.customerId) {
      where.mktCustomerId = input.customerId;
    }

    if (input?.salesStaffId) {
      where.createdById = input.salesStaffId;
    }

    // TODO: Add date range filter with startDate/endDate

    // Fetch với relations
    const orders = await this.orderRepository.findManyWithDetailsWorkspace(
      workspaceId,
      where,
    );

    this.logger.log(`Fetched ${orders.length} orders for export`);

    return orders;
  }

  /**
   * Export empty file (chỉ có header)
   */
  private exportEmptyFile(format?: ExportFormatEnum): ExportFileOutput {
    const emptyData: OrderExportRow[] = [];

    if (format === ExportFormatEnum.CSV) {
      const result = this.excelService.exportToCsv(emptyData, {
        sheetName: 'Đơn hàng',
        columns: ORDER_EXPORT_COLUMNS,
        filename: 'danh-sach-don-hang',
      });

      return {
        content: result.buffer.toString('base64'),
        mimeType: result.mimeType,
        filename: result.filename,
        rowCount: 0,
      };
    }

    return this.excelService.exportToBase64(emptyData, {
      sheetName: 'Đơn hàng',
      columns: ORDER_EXPORT_COLUMNS,
      filename: 'danh-sach-don-hang',
    });
  }

  /**
   * Map Order entity to export row
   */
  private mapOrderToExportRow(order: MktOrderWorkspaceEntity): OrderExportRow {
    const totalAmount = order.totalAmount ?? 0;
    const paidAmount = order.paidAmount ?? 0;
    const remainingAmount = MoneyUtils.subtract(
      totalAmount,
      paidAmount,
    ).toNumber();

    // Get status label
    const statusLabel =
      ORDER_STATUS_OPTIONS.labels.VI[
        order.status as keyof typeof ORDER_STATUS_OPTIONS.labels.VI
      ] ?? order.status;

    // Get payment status label
    const paymentStatusLabel =
      PAYMENT_STATUS_OPTIONS.labels.VI[
        order.paymentStatus as keyof typeof PAYMENT_STATUS_OPTIONS.labels.VI
      ] ?? order.paymentStatus;

    // Format createdAt
    const createdAtStr = order.createdAt
      ? DateTimeUtils.format(
          DateTimeUtils.fromMillis(
            typeof order.createdAt === 'string'
              ? parseInt(order.createdAt, 10)
              : (order.createdAt as number),
          ),
          'dd/MM/yyyy HH:mm',
        )
      : '';

    // Get customer name từ relation
    const customerName =
      (order as unknown as { mktCustomer?: { name?: string } }).mktCustomer
        ?.name ?? '';

    // Get created by name từ relation
    const createdByName =
      (
        order as unknown as {
          createdBy?: { name?: { firstName?: string; lastName?: string } };
        }
      ).createdBy?.name?.firstName ?? '';

    return {
      orderCode: order.orderCode ?? '',
      customerName,
      createdAt: createdAtStr,
      status: statusLabel ?? '',
      paymentStatus: paymentStatusLabel ?? '',
      totalAmount: this.formatCurrency(totalAmount),
      paidAmount: this.formatCurrency(paidAmount),
      remainingAmount: this.formatCurrency(remainingAmount),
      note: order.note ?? '',
      createdByName,
    };
  }

  /**
   * Format currency (VND)
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
}
