import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { invoiceConfig } from 'src/mkt-core/invoice/config';
import { SInvoiceIntegrationService } from 'src/mkt-core/invoice/integration/s-invoice.integration.service';
import {
  INVOICE_MESSAGES,
  MKT_INVOICE_LOG_CONTEXT,
} from 'src/mkt-core/invoice/messages';
import { SInvoiceType } from 'src/mkt-core/invoice/types';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktInvoiceService - Business logic layer for Invoice entity
 *
 * Responsibilities:
 * - Invoice name generation
 * - GraphQL request customization
 * - Order item name extraction
 */
@Injectable()
export class MktInvoiceService {
  private readonly logger = new Logger(`${MKT_INVOICE_LOG_CONTEXT}:Service`);

  constructor(
    @Inject(invoiceConfig.KEY)
    private readonly config: ConfigType<typeof invoiceConfig>,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly sInvoiceIntegrationService: SInvoiceIntegrationService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Customize GraphQL request for invoice operations
   */
  async customizeGraphQLRequest(
    operationName: string,
    variables: { input: SInvoiceType },
  ): Promise<void> {
    if (!variables?.input) {
      return;
    }

    if (operationName === 'CreateOneMktInvoice') {
      await this.customizeMktInvoiceRequest(variables.input);
    }
  }

  /**
   * Customize invoice request với S-Invoice integration
   */
  async customizeMktInvoiceRequest(input: SInvoiceType): Promise<void> {
    if (input.name && input.name !== '') {
      return;
    }

    if (!input.mktOrderId) {
      return;
    }

    // Generate invoice name từ order
    input.name = await this.generateInvoiceNameFromOrder(input.mktOrderId);

    // Tạo S-Invoice
    const sInvoice =
      await this.sInvoiceIntegrationService.createInvoiceForOrder(
        input.mktOrderId,
      );

    Object.assign(input, sInvoice);
  }

  // ============================================
  // PRIVATE METHODS - Invoice Name Generation
  // ============================================

  /**
   * Generate invoice name từ order
   */
  private async generateInvoiceNameFromOrder(orderId: string): Promise<string> {
    try {
      const orderItemName = await this.getOrderItemNamesAsString(orderId);

      if (!orderItemName) {
        return this.generateFallbackInvoiceName(orderId);
      }

      const dateStr = this.getCurrentDateString();
      const truncatedName = this.truncateName(
        orderItemName,
        this.config.naming.maxLength,
      );

      return `${this.config.naming.prefix}-${truncatedName}-${dateStr}`;
    } catch {
      return this.generateFallbackInvoiceName(orderId);
    }
  }

  /**
   * Generate fallback invoice name khi không lấy được order items
   */
  private generateFallbackInvoiceName(orderId: string): string {
    const orderSuffix = orderId.slice(0, 8);
    const dateStr = this.getCurrentDateString();

    return `${this.config.naming.prefix}-${orderSuffix}-${dateStr}`;
  }

  // ============================================
  // PRIVATE METHODS - Order Item Operations
  // ============================================

  /**
   * Get all order item names as a single string
   * Được gọi từ customizeMktInvoiceRequest
   */
  async updateInvoiceNameFromOrderItemDirectly(
    mktOrderId: string,
  ): Promise<string | null> {
    return this.getOrderItemNamesAsString(mktOrderId);
  }

  /**
   * Get order item names từ database
   */
  private async getOrderItemNamesAsString(
    mktOrderId: string,
  ): Promise<string | null> {
    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        throw new Error(INVOICE_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
      }

      const orderItems = await this.fetchOrderItems(mktOrderId);

      if (!orderItems || orderItems.length === 0) {
        return null;
      }

      return this.extractUniqueItemNames(orderItems);
    } catch (error) {
      this.logger.error(
        INVOICE_MESSAGES.ERROR.ORDER_ITEMS_FETCH_FAILED(mktOrderId),
        error as Error,
      );

      return null;
    }
  }

  /**
   * Fetch order items từ database
   * Sử dụng MktOrderItemRepository
   */
  private async fetchOrderItems(
    mktOrderId: string,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.findByOrderId(mktOrderId);
  }

  /**
   * Extract unique item names từ order items
   */
  private extractUniqueItemNames(
    items: MktOrderItemWorkspaceEntity[],
  ): string | null {
    const uniqueNames = [
      ...new Set(
        items.filter((item) => item.name).map((item) => item.name as string),
      ),
    ];

    if (uniqueNames.length === 0) {
      return null;
    }

    return uniqueNames.join(' ');
  }

  // ============================================
  // PRIVATE METHODS - Utilities
  // ============================================

  /**
   * Get current date as string (YYYY-MM-DD format)
   */
  private getCurrentDateString(): string {
    return DateTimeUtils.format(DateTimeUtils.now(), 'yyyy-MM-dd');
  }

  /**
   * Truncate name with ellipsis if exceeds max length
   */
  private truncateName(name: string, maxLength: number): string {
    if (name.length <= maxLength) {
      return name;
    }

    return `${name.substring(0, maxLength)}...`;
  }
}
