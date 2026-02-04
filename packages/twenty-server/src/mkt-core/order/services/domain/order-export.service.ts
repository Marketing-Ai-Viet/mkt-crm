import { Injectable, Logger } from '@nestjs/common';

import { In } from 'typeorm';

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
  ExportOrdersByIdsInput,
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
   * Export danh sách orders ra Buffer (cho REST endpoint download trực tiếp)
   *
   * @param input - Filter và format options
   * @param workspaceId - Workspace ID (data scope)
   * @returns Object với buffer, filename, mimeType, rowCount
   */
  async exportOrdersToBuffer(
    input: ExportOrdersInput | undefined,
    workspaceId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    rowCount: number;
  }> {
    this.logger.log(
      `Starting order export to buffer for workspace: ${workspaceId}`,
    );

    // Fetch orders với filter
    const orders = await this.fetchOrdersWithFilter(input, workspaceId);

    // Transform to export rows (empty array nếu không có data)
    const exportData = orders.map((order) => this.mapOrderToExportRow(order));

    // Check limit
    if (orders.length > EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS) {
      this.logger.warn(
        EXCEL_MESSAGES.WARN.LARGE_DATASET(
          orders.length,
          EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
        ),
      );
      throw new Error(
        EXCEL_MESSAGES.ERROR.ROW_LIMIT_EXCEEDED(
          orders.length,
          EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
        ),
      );
    }

    // Export based on format
    const format = input?.format ?? ExportFormatEnum.XLSX;

    if (format === ExportFormatEnum.CSV) {
      const result = this.excelService.exportToCsv(exportData, {
        sheetName: 'Đơn hàng',
        columns: ORDER_EXPORT_COLUMNS,
        filename: 'danh-sach-don-hang',
      });

      return {
        buffer: result.buffer,
        filename: result.filename,
        mimeType: result.mimeType,
        rowCount: result.rowCount,
      };
    }

    // Default: XLSX
    const result = this.excelService.exportToBuffer(exportData, {
      sheetName: 'Đơn hàng',
      columns: ORDER_EXPORT_COLUMNS,
      filename: 'danh-sach-don-hang',
      freezeHeader: true,
      autoFilter: true,
    });

    return {
      buffer: result.buffer,
      filename: result.filename,
      mimeType: result.mimeType,
      rowCount: result.rowCount,
    };
  }

  /**
   * Export orders theo danh sách IDs ra Buffer
   *
   * @param input - Order IDs và format options
   * @param workspaceId - Workspace ID (data scope)
   * @returns Object với buffer, filename, mimeType, rowCount
   */
  async exportOrdersByIdsToBuffer(
    input: ExportOrdersByIdsInput,
    workspaceId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    rowCount: number;
  }> {
    this.logger.log(
      `Starting export ${input.orderIds.length} orders by IDs for workspace: ${workspaceId}`,
    );

    // Fetch orders by IDs
    const orders = await this.fetchOrdersByIds(input.orderIds, workspaceId);

    // Transform to export rows
    const exportData = orders.map((order) => this.mapOrderToExportRow(order));

    // Check limit
    if (orders.length > EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS) {
      this.logger.warn(
        EXCEL_MESSAGES.WARN.LARGE_DATASET(
          orders.length,
          EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
        ),
      );
      throw new Error(
        EXCEL_MESSAGES.ERROR.ROW_LIMIT_EXCEEDED(
          orders.length,
          EXCEL_CONSTANTS.LIMITS.SYNC_MAX_ROWS,
        ),
      );
    }

    // Export based on format
    const format = input.format ?? ExportFormatEnum.XLSX;

    if (format === ExportFormatEnum.CSV) {
      const result = this.excelService.exportToCsv(exportData, {
        sheetName: 'Đơn hàng',
        columns: ORDER_EXPORT_COLUMNS,
        filename: 'don-hang-da-chon',
      });

      return {
        buffer: result.buffer,
        filename: result.filename,
        mimeType: result.mimeType,
        rowCount: result.rowCount,
      };
    }

    // Default: XLSX
    const result = this.excelService.exportToBuffer(exportData, {
      sheetName: 'Đơn hàng',
      columns: ORDER_EXPORT_COLUMNS,
      filename: 'don-hang-da-chon',
      freezeHeader: true,
      autoFilter: true,
    });

    return {
      buffer: result.buffer,
      filename: result.filename,
      mimeType: result.mimeType,
      rowCount: result.rowCount,
    };
  }

  /**
   * Count orders matching filter criteria
   *
   * @param input - Filter criteria
   * @param workspaceId - Workspace ID
   * @returns Estimated row count
   */
  async countOrdersForExport(
    input: ExportOrdersInput | undefined,
    workspaceId: string,
  ): Promise<number> {
    const orders = await this.fetchOrdersWithFilter(input, workspaceId);

    return orders.length;
  }

  /**
   * Count orders by IDs
   *
   * @param orderIds - Order IDs
   * @param workspaceId - Workspace ID
   * @returns Count
   */
  async countOrdersByIds(
    orderIds: string[],
    workspaceId: string,
  ): Promise<number> {
    const orders = await this.fetchOrdersByIds(orderIds, workspaceId);

    return orders.length;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Fetch orders với filter từ input (customerId, salesStaffId)
   */
  private async fetchOrdersWithFilter(
    input: ExportOrdersInput | undefined,
    workspaceId: string,
  ): Promise<MktOrderWorkspaceEntity[]> {
    // Build where clause
    const where: Record<string, unknown> = {};

    if (input?.customerId) {
      where.mktCustomerId = input.customerId;
    }

    if (input?.salesStaffId) {
      where.createdById = input.salesStaffId;
    }

    // Fetch với relations
    const orders = await this.orderRepository.findManyWithDetailsWorkspace(
      workspaceId,
      where,
    );

    this.logger.log(`Fetched ${orders.length} orders for export`);

    return orders;
  }

  /**
   * Fetch orders theo danh sách IDs
   */
  private async fetchOrdersByIds(
    orderIds: string[],
    workspaceId: string,
  ): Promise<MktOrderWorkspaceEntity[]> {
    if (orderIds.length === 0) {
      return [];
    }

    const where: Record<string, unknown> = {
      id: In(orderIds),
    };

    const orders = await this.orderRepository.findManyWithDetailsWorkspace(
      workspaceId,
      where,
    );

    this.logger.log(`Fetched ${orders.length} orders by IDs for export`);

    return orders;
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

    // Format createdAt - handle Date object, string (ISO), or number (millis)
    let createdAtStr = '';
    const createdAt = order.createdAt as Date | string | number | undefined;

    if (createdAt) {
      if (createdAt instanceof Date) {
        createdAtStr = DateTimeUtils.format(
          DateTimeUtils.fromDate(createdAt),
          'dd/MM/yyyy HH:mm',
        );
      } else if (typeof createdAt === 'string') {
        // ISO string or numeric string
        const parsed = Date.parse(createdAt);

        if (!isNaN(parsed)) {
          createdAtStr = DateTimeUtils.format(
            DateTimeUtils.fromMillis(parsed),
            'dd/MM/yyyy HH:mm',
          );
        }
      } else if (typeof createdAt === 'number') {
        createdAtStr = DateTimeUtils.format(
          DateTimeUtils.fromMillis(createdAt),
          'dd/MM/yyyy HH:mm',
        );
      }
    }

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
