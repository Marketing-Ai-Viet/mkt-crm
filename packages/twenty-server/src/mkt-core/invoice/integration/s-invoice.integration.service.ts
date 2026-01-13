import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { randomUUID } from 'crypto';

import axios, { AxiosInstance } from 'axios';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { invoiceConfig } from 'src/mkt-core/invoice/config';
import { MKT_INVOICE_STATUS } from 'src/mkt-core/invoice/objects/mkt-invoice.workspace-entity';
import { MktSInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice.workspace-entity';
import { MktSInvoiceRepository } from 'src/mkt-core/invoice/repositories';
import {
  CreateInvoiceResponse,
  GetInvoiceFileRequest,
  GetInvoiceFileResponse,
  SInvoicePayload,
  SInvoiceType,
  SInvoiceUpdate,
} from 'src/mkt-core/invoice/types';
import { SINVOICE_STATUS as ORDER_SINVOICE_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  MktOrderRepository,
  MktOrderItemRepository,
} from 'src/mkt-core/order/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// S-Invoice API endpoints
const SINVOICE_ENDPOINTS = {
  CREATE_INVOICE: (taxCode: string) =>
    `/services/einvoiceapplication/api/InvoiceAPI/InvoiceWS/createInvoice/${taxCode}`,
  GET_INVOICE_FILE:
    '/services/einvoiceapplication/api/InvoiceAPI/InvoiceUtilsWS/getInvoiceRepresentationFile',
} as const;

/**
 * SInvoiceIntegrationService - Integration layer with S-Invoice API (Viettel e-invoice)
 *
 * Responsibilities:
 * - S-Invoice API communication
 * - Invoice payload building from entity
 * - Invoice file retrieval
 */
@Injectable()
export class SInvoiceIntegrationService {
  private readonly logger = new Logger(SInvoiceIntegrationService.name);
  private readonly http: AxiosInstance;

  constructor(
    @Inject(invoiceConfig.KEY)
    private readonly config: ConfigType<typeof invoiceConfig>,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly sInvoiceRepository: MktSInvoiceRepository,
    private readonly orderRepository: MktOrderRepository,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {
    this.http = axios.create({
      baseURL: this.config.sInvoice.baseUrl,
      timeout: this.config.sInvoice.timeoutMs,
    });
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Convert SInvoice entity to API payload
   * Chuyển đổi entity SInvoice sang payload cho API
   */
  public filterSInvoiceToPayload(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): SInvoicePayload {
    const payments = this.buildPayments(sInvoice);
    const itemInfo = this.buildItemInfo(sInvoice);
    const taxBreakdowns = this.buildTaxBreakdowns(sInvoice);
    const metadata = this.buildMetadata(sInvoice);
    const invoiceIssuedDate = this.parseInvoiceIssuedDate(sInvoice);

    return {
      generalInvoiceInfo: this.buildGeneralInvoiceInfo(
        sInvoice,
        invoiceIssuedDate,
      ),
      buyerInfo: this.buildBuyerInfo(sInvoice),
      payments,
      itemInfo,
      taxBreakdowns,
      summarizeInfo: this.buildSummarizeInfo(sInvoice),
      metadata,
    };
  }

  /**
   * Sync SInvoice to Viettel e-invoice system
   * Đồng bộ SInvoice lên hệ thống hóa đơn điện tử Viettel
   */
  async syncSInvoice(orderId: string): Promise<SInvoiceType | undefined> {
    this.logger.log(
      `[S-INVOICE SERVICE] Starting syncSInvoice for order: ${orderId}`,
    );

    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        return {} as SInvoiceType;
      }

      const sInvoice = await this.findSInvoiceByOrderId(workspaceId, orderId);

      if (!sInvoice) {
        this.logger.warn(
          `[S-INVOICE SERVICE] S-Invoice not found for order ${orderId}`,
        );

        return {} as SInvoiceType;
      }

      const payload = this.filterSInvoiceToPayload(sInvoice);
      const sInvoiceUpdate = await this.sendSInvoice(payload, orderId);

      await this.saveSInvoice(sInvoiceUpdate, sInvoice.id);

      this.logger.log(
        `[S-INVOICE SERVICE] Completed syncSInvoice for order: ${orderId}`,
      );
    } catch (error) {
      const err = error as Error;

      this.logger.error(
        `[S-INVOICE SERVICE] Failed to sync S-Invoice for order ${orderId}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Create S-Invoice for order
   * Tạo S-Invoice tự động khi order được tạo
   */
  async createInvoiceForOrder(orderId: string): Promise<SInvoiceType> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error('[S-INVOICE SERVICE] Workspace ID not found');

      return {} as SInvoiceType;
    }

    this.logger.log(
      `[S-INVOICE SERVICE] Starting createInvoiceForOrder for order: ${orderId}`,
    );

    // Fetch order và items
    const { order, items } = await this.fetchOrderWithItems(
      workspaceId,
      orderId,
    );

    if (!order) {
      this.logger.warn(`[S-INVOICE SERVICE] Order not found: ${orderId}`);

      return {} as SInvoiceType;
    }

    if (!items || items.length === 0) {
      this.logger.warn(`[S-INVOICE SERVICE] Order has no items: ${orderId}`);

      return {} as SInvoiceType;
    }

    // Build payload và call API
    const nowMs = DateTimeUtils.toMillis(DateTimeUtils.now());
    const transactionUuid = randomUUID();
    const payload = this.buildInvoicePayloadFromOrder(
      order,
      items,
      nowMs,
      transactionUuid,
    );

    return this.callCreateInvoiceAPI(payload, orderId, transactionUuid, nowMs);
  }

  /**
   * Send SInvoice to Viettel API
   * Gửi SInvoice lên API Viettel
   */
  async sendSInvoice(
    payload: SInvoicePayload,
    orderId: string,
  ): Promise<SInvoiceUpdate> {
    try {
      const headers = this.buildRequestHeaders();
      const url = SINVOICE_ENDPOINTS.CREATE_INVOICE(
        this.config.sInvoice.taxCode,
      );

      this.logger.log(
        `[S-INVOICE] Creating invoice with URL: ${this.config.sInvoice.baseUrl}${url}`,
      );
      this.logger.debug(
        `[S-INVOICE] Invoice payload: ${JSON.stringify(payload)}`,
      );

      const res = await this.http.post<CreateInvoiceResponse>(url, payload, {
        headers,
      });

      const response: CreateInvoiceResponse =
        res.data ?? ({} as CreateInvoiceResponse);

      return this.buildSuccessUpdateData(response);
    } catch (error: unknown) {
      return this.handleSendError(error, orderId);
    }
  }

  /**
   * Save SInvoice update data to database
   * Lưu dữ liệu cập nhật SInvoice vào database
   */
  async saveSInvoice(
    sInvoiceUpdate: SInvoiceUpdate,
    sInvoiceId: string,
  ): Promise<void> {
    this.logger.log(
      `[S-INVOICE SERVICE] Starting saveSInvoice for ID: ${sInvoiceId}`,
    );

    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        this.logger.error('Workspace ID not found when saving S-Invoice');

        return;
      }

      const existingSInvoice = await this.findSInvoiceById(
        workspaceId,
        sInvoiceId,
      );

      if (!existingSInvoice) {
        this.logger.warn(
          `[S-INVOICE SERVICE] S-Invoice with ID ${sInvoiceId} not found`,
        );

        return;
      }

      await this.updateSInvoiceRecord(workspaceId, sInvoiceId, sInvoiceUpdate);
      await this.updateOrderSInvoiceStatus(
        workspaceId,
        existingSInvoice,
        sInvoiceUpdate,
      );

      this.logger.log(
        `[S-INVOICE SERVICE] Successfully saved S-Invoice with ID: ${sInvoiceId}`,
      );
    } catch (error) {
      const err = error as Error;

      this.logger.error(
        `[S-INVOICE SERVICE] Failed to save S-Invoice with ID ${sInvoiceId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Get invoice file from Viettel API
   * Lấy file hóa đơn từ API Viettel
   */
  async getInvoiceFile(
    supplierTaxCode: string,
    invoiceNo: string,
    templateCode: string,
    fileType = 'PDF',
  ): Promise<GetInvoiceFileResponse> {
    this.logger.log(
      `[S-INVOICE SERVICE] Getting invoice file for invoiceNo: ${invoiceNo}`,
    );

    try {
      const headers = this.buildRequestHeaders();
      const url = SINVOICE_ENDPOINTS.GET_INVOICE_FILE;

      const requestPayload: GetInvoiceFileRequest = {
        supplierTaxCode,
        invoiceNo,
        templateCode,
        fileType,
      };

      this.logger.log(
        `[S-INVOICE SERVICE] Getting invoice file with URL: ${this.config.sInvoice.baseUrl}${url}`,
      );

      const response = await this.http.post<GetInvoiceFileResponse>(
        url,
        requestPayload,
        { headers },
      );

      const result = response.data || ({} as GetInvoiceFileResponse);

      this.logger.log(
        `[S-INVOICE SERVICE] Successfully retrieved invoice file for invoiceNo: ${invoiceNo}`,
      );

      return result;
    } catch (error: unknown) {
      return this.handleGetFileError(error, invoiceNo);
    }
  }

  /**
   * Get invoice file by invoice ID
   * Lấy file hóa đơn theo ID
   */
  async getInvoiceFileById(invoiceId: string): Promise<GetInvoiceFileResponse> {
    this.logger.log(
      `[S-INVOICE SERVICE] Getting invoice file for invoiceId: ${invoiceId}`,
    );

    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        return this.buildErrorResponse(400, 'Workspace ID not found');
      }

      const sInvoice = await this.findSInvoiceById(workspaceId, invoiceId);

      if (!sInvoice) {
        return this.buildErrorResponse(404, 'Invoice not found');
      }

      if (
        !sInvoice.supplierTaxCode ||
        !sInvoice.invoiceNo ||
        !sInvoice.templateCode
      ) {
        return this.buildErrorResponse(
          400,
          'Missing required invoice information',
        );
      }

      return this.getInvoiceFile(
        sInvoice.supplierTaxCode,
        sInvoice.invoiceNo,
        sInvoice.templateCode,
        'PDF',
      );
    } catch (error) {
      const err = error as Error;

      this.logger.error(
        `[S-INVOICE SERVICE] Failed to get invoice file for invoiceId ${invoiceId}: ${err.message}`,
        err.stack,
      );

      return this.buildErrorResponse(500, 'Internal server error');
    }
  }

  // ============================================
  // PRIVATE METHODS - Payload Building from Order
  // ============================================

  /**
   * Build invoice payload từ order và order items
   * Dùng cho createInvoiceForOrder
   */
  private buildInvoicePayloadFromOrder(
    order: MktOrderWorkspaceEntity,
    items: MktOrderItemWorkspaceEntity[],
    nowMs: number,
    transactionUuid: string,
  ): SInvoicePayload {
    // Build item lines với tax calculations
    const itemInfo = this.buildItemLinesFromOrderItems(items);

    // Compute tax breakdowns
    const taxBreakdowns = this.computeTaxBreakdownsFromItems(itemInfo);

    // Compute summarize info
    const summarizeInfo = this.computeSummarizeInfoFromItems(itemInfo);

    return {
      generalInvoiceInfo: {
        invoiceType: this.config.sInvoice.invoiceType,
        templateCode: this.config.sInvoice.templateCode,
        invoiceSeries: this.config.sInvoice.invoiceSeries,
        currencyCode: this.config.sInvoice.currencyCode,
        exchangeRate: this.config.sInvoice.exchangeRate,
        adjustmentType: this.config.sInvoice.adjustmentType,
        paymentStatus: true,
        cusGetInvoiceRight: true,
        invoiceIssuedDate: nowMs,
        transactionUuid,
      },
      buyerInfo: {
        buyerName: order.name || this.config.sInvoice.defaultBuyerName,
        buyerLegalName: null,
        buyerTaxCode: null,
        buyerAddressLine: '',
        buyerPhoneNumber: null,
        buyerEmail: null,
        buyerIdNo: null,
        buyerIdType: null,
        buyerNotGetInvoice: '0',
      },
      payments: [{ paymentMethodName: this.config.sInvoice.paymentMethod }],
      itemInfo: itemInfo.map((item) => ({
        ...item,
        itemCode: null,
        discount: null,
        itemDiscount: null,
        itemNote: null,
        isIncreaseItem: null,
      })),
      taxBreakdowns,
      summarizeInfo: {
        sumOfTotalLineAmountWithoutTax: summarizeInfo.totalAmountWithoutTax,
        totalAmountAfterDiscount: summarizeInfo.totalAmountWithTax,
        totalAmountWithoutTax: summarizeInfo.totalAmountWithoutTax,
        totalTaxAmount: summarizeInfo.totalTaxAmount,
        totalAmountWithTax: summarizeInfo.totalAmountWithTax,
        totalAmountWithTaxInWords: null,
        discountAmount: 0,
      },
      metadata: [
        {
          keyTag: 'invoiceNote',
          stringValue: `Auto generated for order ${order.id}`,
          valueType: 'text',
          keyLabel: 'Ghi chú',
        },
      ],
    };
  }

  /**
   * Build item lines từ order items với tax calculations
   */
  private buildItemLinesFromOrderItems(
    items: MktOrderItemWorkspaceEntity[],
  ): (SInvoicePayload['itemInfo'][0] & { taxAmount: number })[] {
    return items.map((item, idx) => {
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const amountWithoutTax = MoneyUtils.multiply(
        unitPrice,
        quantity,
      ).toNumber();
      const taxPercent = (item.taxPercentage ?? 0) as number;
      const taxAmount = MoneyUtils.percentage(
        amountWithoutTax,
        taxPercent,
      ).toNumber();
      const withTax = MoneyUtils.add(amountWithoutTax, taxAmount).toNumber();

      return {
        lineNumber: idx + 1,
        selection: 1,
        itemCode: null,
        itemName: item.name || item.snapshotProductName || `Item ${idx + 1}`,
        unitName: item.unitName || this.config.sInvoice.defaultUnitName,
        quantity,
        unitPrice,
        itemTotalAmountWithoutTax: amountWithoutTax,
        itemTotalAmountAfterDiscount: amountWithoutTax,
        itemTotalAmountWithTax: withTax,
        taxPercentage: taxPercent,
        taxAmount,
        discount: null,
        itemDiscount: null,
        itemNote: null,
        isIncreaseItem: null,
      };
    });
  }

  /**
   * Compute tax breakdowns (group by taxPercentage)
   */
  private computeTaxBreakdownsFromItems(
    itemInfo: {
      taxPercentage: number | null;
      itemTotalAmountWithoutTax: number | null;
      taxAmount: number;
    }[],
  ): SInvoicePayload['taxBreakdowns'] {
    const taxMap = new Map<
      number,
      { taxableAmount: number; taxAmount: number }
    >();

    for (const line of itemInfo) {
      const key = line.taxPercentage || 0;
      const current = taxMap.get(key) || { taxableAmount: 0, taxAmount: 0 };

      current.taxableAmount = MoneyUtils.add(
        current.taxableAmount,
        line.itemTotalAmountWithoutTax || 0,
      ).toNumber();
      current.taxAmount = MoneyUtils.add(
        current.taxAmount,
        line.taxAmount,
      ).toNumber();
      taxMap.set(key, current);
    }

    return Array.from(taxMap.entries()).map(([taxPercentage, v]) => ({
      taxPercentage,
      taxableAmount: v.taxableAmount,
      taxAmount: v.taxAmount,
    }));
  }

  /**
   * Compute summarize info từ item lines
   */
  private computeSummarizeInfoFromItems(
    itemInfo: { itemTotalAmountWithoutTax: number | null; taxAmount: number }[],
  ): {
    totalAmountWithoutTax: number;
    totalTaxAmount: number;
    totalAmountWithTax: number;
  } {
    const totalAmountWithoutTax = MoneyUtils.sumBy(
      itemInfo,
      'itemTotalAmountWithoutTax',
    ).toNumber();
    const totalTaxAmount = MoneyUtils.sumBy(itemInfo, 'taxAmount').toNumber();
    const totalAmountWithTax = MoneyUtils.add(
      totalAmountWithoutTax,
      totalTaxAmount,
    ).toNumber();

    return {
      totalAmountWithoutTax,
      totalTaxAmount,
      totalAmountWithTax,
    };
  }

  /**
   * Call S-Invoice API để tạo invoice và trả về SInvoiceType
   */
  private async callCreateInvoiceAPI(
    payload: SInvoicePayload,
    orderId: string,
    transactionUuid: string,
    nowMs: number,
  ): Promise<SInvoiceType> {
    const summarize = payload.summarizeInfo;

    try {
      const headers = this.buildRequestHeaders();
      const url = SINVOICE_ENDPOINTS.CREATE_INVOICE(
        this.config.sInvoice.taxCode,
      );

      this.logger.log(`[S-INVOICE] Creating invoice with URL: ${url}`);
      this.logger.debug(
        `[S-INVOICE] Request payload: ${JSON.stringify(payload)}`,
      );

      const res = await this.http.post<CreateInvoiceResponse>(url, payload, {
        headers,
      });

      const response = (res.data.result || {}) as {
        invoiceNo?: string;
        transactionUuid?: string;
      };

      this.logger.log(
        `[S-INVOICE] Invoice created successfully: ${response.invoiceNo || transactionUuid}`,
      );

      return {
        status: MKT_INVOICE_STATUS.SENT,
        amount: String(summarize.totalAmountWithTax),
        vat: summarize.totalTaxAmount,
        totalWithoutTax: summarize.totalAmountWithoutTax,
        totalTax: summarize.totalTaxAmount,
        totalWithTax: summarize.totalAmountWithTax,
        sInvoiceCode: this.config.sInvoice.taxCode,
        supplierTaxCode: this.config.sInvoice.taxCode,
        templateCode: this.config.sInvoice.templateCode,
        invoiceSeries: this.config.sInvoice.invoiceSeries,
        invoiceNo: response.invoiceNo,
        transactionUuid: response.transactionUuid || transactionUuid,
        issueDate: String(nowMs),
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      const errMsg = err?.response?.data || err?.message;

      this.logger.error(
        `[S-INVOICE] Create invoice failed for order ${orderId}: ${JSON.stringify(errMsg)}`,
      );

      // Return draft invoice for traceability
      return {
        status: MKT_INVOICE_STATUS.DRAFT,
        amount: String(summarize.totalAmountWithTax),
        vat: summarize.totalTaxAmount,
        totalWithoutTax: summarize.totalAmountWithoutTax,
        totalTax: summarize.totalTaxAmount,
        totalWithTax: summarize.totalAmountWithTax,
        sInvoiceCode: this.config.sInvoice.taxCode,
        supplierTaxCode: this.config.sInvoice.taxCode,
        templateCode: this.config.sInvoice.templateCode,
        invoiceSeries: this.config.sInvoice.invoiceSeries,
        transactionUuid,
        issueDate: String(nowMs),
      };
    }
  }

  // ============================================
  // PRIVATE METHODS - Payload Building from SInvoice Entity
  // ============================================

  private buildPayments(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): SInvoicePayload['payments'] {
    return (
      sInvoice.mktSInvoicePayments?.map((payment) => ({
        paymentMethodName:
          payment.paymentMethodName || this.config.sInvoice.paymentMethod,
      })) || [{ paymentMethodName: this.config.sInvoice.paymentMethod }]
    );
  }

  private buildItemInfo(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): SInvoicePayload['itemInfo'] {
    return (
      sInvoice.mktSInvoiceItems?.map((item) => ({
        lineNumber: item.lineNumber || 1,
        selection: item.selection || 1,
        itemCode: item.itemCode || null,
        itemName: item.itemName || item.name || '',
        unitName: item.unitName || null,
        quantity: item.quantity || null,
        unitPrice: item.unitPrice || null,
        itemTotalAmountWithoutTax: item.itemTotalAmountWithoutTax || null,
        itemTotalAmountAfterDiscount: item.itemTotalAmountAfterDiscount || null,
        itemTotalAmountWithTax: item.itemTotalAmountWithTax || null,
        taxPercentage: item.taxPercentage || null,
        taxAmount: item.taxAmount || null,
        discount: item.discount || null,
        itemDiscount: item.itemDiscount || null,
        itemNote: item.itemNote || null,
        isIncreaseItem: item.isIncreaseItem || null,
      })) || []
    );
  }

  private buildTaxBreakdowns(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): SInvoicePayload['taxBreakdowns'] {
    return (
      sInvoice.mktSInvoiceTaxBreakdowns?.map((tax) => ({
        taxPercentage: tax.taxPercentage || 0,
        taxableAmount: tax.taxableAmount || 0,
        taxAmount: tax.taxAmount || 0,
      })) || []
    );
  }

  private buildMetadata(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): SInvoicePayload['metadata'] {
    return (
      sInvoice.mktSInvoiceMetadata?.map((meta) => ({
        keyTag: meta.keyTag || '',
        stringValue: meta.stringValue || '',
        valueType: meta.valueType || 'text',
        keyLabel: meta.keyLabel || '',
      })) || []
    );
  }

  private parseInvoiceIssuedDate(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): number | null {
    if (!sInvoice.invoiceIssuedDate) {
      return null;
    }

    const dateTime = DateTimeUtils.fromDate(sInvoice.invoiceIssuedDate);

    return DateTimeUtils.toMillis(dateTime);
  }

  private buildGeneralInvoiceInfo(
    sInvoice: MktSInvoiceWorkspaceEntity,
    invoiceIssuedDate: number | null,
  ): SInvoicePayload['generalInvoiceInfo'] {
    return {
      invoiceType: sInvoice.invoiceType || this.config.sInvoice.invoiceType,
      templateCode: sInvoice.templateCode || this.config.sInvoice.templateCode,
      invoiceSeries:
        sInvoice.invoiceSeries || this.config.sInvoice.invoiceSeries,
      currencyCode:
        (sInvoice.currencyCode as string) || this.config.sInvoice.currencyCode,
      exchangeRate: sInvoice.exchangeRate
        ? parseFloat(sInvoice.exchangeRate)
        : this.config.sInvoice.exchangeRate,
      adjustmentType:
        sInvoice.adjustmentType || this.config.sInvoice.adjustmentType,
      paymentStatus: sInvoice.paymentStatus || false,
      cusGetInvoiceRight: sInvoice.cusGetInvoiceRight || false,
      invoiceIssuedDate,
      transactionUuid: sInvoice.transactionUuid || null,
    };
  }

  private buildBuyerInfo(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): SInvoicePayload['buyerInfo'] {
    return {
      buyerName: sInvoice.buyerName || '',
      buyerLegalName: sInvoice.buyerLegalName || null,
      buyerTaxCode: sInvoice.buyerTaxCode || null,
      buyerAddressLine: sInvoice.buyerAddressLine || '',
      buyerPhoneNumber: sInvoice.buyerPhoneNumber || null,
      buyerEmail: sInvoice.buyerEmail || null,
      buyerIdNo: sInvoice.buyerIdNo || null,
      buyerIdType: sInvoice.buyerIdType || null,
      buyerNotGetInvoice: sInvoice.buyerNotGetInvoice || '0',
    };
  }

  private buildSummarizeInfo(
    sInvoice: MktSInvoiceWorkspaceEntity,
  ): SInvoicePayload['summarizeInfo'] {
    return {
      sumOfTotalLineAmountWithoutTax:
        sInvoice.sumOfTotalLineAmountWithoutTax || 0,
      totalAmountAfterDiscount: sInvoice.totalAmountAfterDiscount || 0,
      totalAmountWithoutTax: sInvoice.totalAmountWithoutTax || 0,
      totalTaxAmount: sInvoice.totalTaxAmount || 0,
      totalAmountWithTax: sInvoice.totalAmountWithTax || 0,
      totalAmountWithTaxInWords: sInvoice.totalAmountWithTaxInWords || null,
      discountAmount: sInvoice.discountAmount || 0,
    };
  }

  // ============================================
  // PRIVATE METHODS - API Communication
  // ============================================

  private buildRequestHeaders(): Record<string, string> {
    const { username, password, cookieToken, authorization } =
      this.config.sInvoice;

    // Use provided authorization or generate Basic Auth
    const authHeader =
      authorization ||
      `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    return {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      Cookie: cookieToken,
    };
  }

  private buildSuccessUpdateData(
    response: CreateInvoiceResponse,
  ): SInvoiceUpdate {
    const result = (response.result ?? {}) as {
      supplierTaxCode?: string;
      invoiceNo?: string;
      transactionID?: string;
      reservationCode?: string;
      codeOfTax?: string;
    };

    const updateData: SInvoiceUpdate = {
      errorCode:
        response?.errorCode != null ? String(response.errorCode) : undefined,
      description:
        typeof response?.description === 'string'
          ? response.description
          : undefined,
      supplierTaxCode: result?.supplierTaxCode,
      invoiceNo: result?.invoiceNo,
      transactionID: result?.transactionID,
      reservationCode: result?.reservationCode,
      codeOfTax: result?.codeOfTax,
      errorMessage: null,
      errorData: null,
      orderSInvoiceStatus: ORDER_SINVOICE_STATUS.SUCCESS,
    };

    this.logger.log(`[S-INVOICE] Response: ${JSON.stringify(updateData)}`);

    return updateData;
  }

  private handleSendError(error: unknown, orderId: string): SInvoiceUpdate {
    type ErrorShape = {
      code?: string | number;
      message?: string;
      description?: string;
      data?: unknown;
    };

    const err = error as {
      response?: { data?: ErrorShape };
      message?: string;
    };
    const errMsg: ErrorShape = err?.response?.data || {
      message: err?.message,
    };

    this.logger.error(
      `Create S-Invoice failed for order ${orderId}: ${JSON.stringify(errMsg)}`,
    );

    const updateData: SInvoiceUpdate = {
      errorCode: errMsg?.code != null ? String(errMsg.code) : undefined,
      errorMessage: errMsg?.message,
      errorData: errMsg?.data != null ? JSON.stringify(errMsg.data) : undefined,
      orderSInvoiceStatus: ORDER_SINVOICE_STATUS.FAILED,
    };

    this.logger.log(`[S-INVOICE] Response: ${JSON.stringify(updateData)}`);

    return updateData;
  }

  private handleGetFileError(
    error: unknown,
    invoiceNo: string,
  ): GetInvoiceFileResponse {
    type ErrorShape = {
      errorCode?: number;
      description?: string;
      message?: string;
    };

    const err = error as {
      response?: { data?: ErrorShape };
      message?: string;
    };
    const errMsg: ErrorShape = err?.response?.data || {
      message: err?.message,
    };

    this.logger.error(
      `[S-INVOICE SERVICE] Failed to get invoice file for invoiceNo ${invoiceNo}: ${JSON.stringify(errMsg)}`,
    );

    return {
      errorCode: errMsg?.errorCode || 500,
      description:
        errMsg?.description || errMsg?.message || 'Failed to get invoice file',
      fileToBytes: '',
    };
  }

  private buildErrorResponse(
    errorCode: number,
    description: string,
  ): GetInvoiceFileResponse {
    return {
      errorCode,
      description,
      fileToBytes: '',
    };
  }

  // ============================================
  // PRIVATE METHODS - Database Operations (using repositories)
  // ============================================

  /**
   * Find SInvoice by order ID with full relations
   */
  private async findSInvoiceByOrderId(
    _workspaceId: string,
    orderId: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    return this.sInvoiceRepository.findByOrderIdWithRelations(orderId);
  }

  /**
   * Find SInvoice by ID
   */
  private async findSInvoiceById(
    workspaceId: string,
    sInvoiceId: string,
  ): Promise<MktSInvoiceWorkspaceEntity | null> {
    return this.sInvoiceRepository.findByIdWithContext(sInvoiceId, workspaceId);
  }

  /**
   * Fetch order với order items từ database
   * Sử dụng MktOrderRepository và MktOrderItemRepository
   */
  private async fetchOrderWithItems(
    workspaceId: string,
    orderId: string,
  ): Promise<{
    order: MktOrderWorkspaceEntity | null;
    items: MktOrderItemWorkspaceEntity[];
  }> {
    const order = await this.orderRepository.findById(workspaceId, orderId);
    const items = await this.orderItemRepository.findByOrderId(
      workspaceId,
      orderId,
    );

    return { order, items };
  }

  /**
   * Update SInvoice record
   */
  private async updateSInvoiceRecord(
    workspaceId: string,
    sInvoiceId: string,
    sInvoiceUpdate: SInvoiceUpdate,
  ): Promise<void> {
    const updateData: SInvoiceUpdate = {
      errorCode: sInvoiceUpdate.errorCode,
      description: sInvoiceUpdate.description,
      supplierTaxCode: sInvoiceUpdate.supplierTaxCode,
      invoiceNo: sInvoiceUpdate.invoiceNo,
      transactionID: sInvoiceUpdate.transactionID,
      reservationCode: sInvoiceUpdate.reservationCode,
      codeOfTax: sInvoiceUpdate.codeOfTax,
      errorMessage: sInvoiceUpdate.errorMessage,
      errorData: sInvoiceUpdate.errorData,
    };

    await this.sInvoiceRepository.updateWithContext(
      sInvoiceId,
      updateData as never,
      workspaceId,
    );

    this.logger.log(
      `[S-INVOICE SERVICE] Updated data: ${JSON.stringify(updateData)}`,
    );
  }

  /**
   * Update order S-Invoice status
   */
  private async updateOrderSInvoiceStatus(
    workspaceId: string,
    existingSInvoice: MktSInvoiceWorkspaceEntity,
    sInvoiceUpdate: SInvoiceUpdate,
  ): Promise<void> {
    if (!sInvoiceUpdate.orderSInvoiceStatus || !existingSInvoice.mktOrderId) {
      return;
    }

    await this.orderRepository.update(
      workspaceId,
      existingSInvoice.mktOrderId,
      {
        sInvoiceStatus:
          sInvoiceUpdate.orderSInvoiceStatus as ORDER_SINVOICE_STATUS,
      },
    );

    this.logger.log(
      `[S-INVOICE SERVICE] Updated order sInvoiceStatus to ${sInvoiceUpdate.orderSInvoiceStatus} for order ID: ${existingSInvoice.mktOrderId}`,
    );
  }
}
