import { Injectable,Logger } from '@nestjs/common';
import axios,{ AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_INVOICE_STATUS,MktInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/mkt-invoice.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order-item/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/mkt-order.workspace-entity';

type CreateInvoiceResponse = {
  transactionUuid?: string;
  invoiceNo?: string;
  message?: string;
  [key: string]: any;
};

@Injectable()
export class SInvoiceIntegrationService {
  private readonly logger = new Logger(SInvoiceIntegrationService.name);
  private readonly http: AxiosInstance;

  private readonly baseUrl = process.env.S_INVOICE_BASE_URL || 'https://api-vinvoice.viettel.vn';
  private readonly taxCode = process.env.S_INVOICE_TAX_CODE || '0100109106-507';
  private readonly templateCode = process.env.S_INVOICE_TEMPLATE_CODE || '1/770';
  private readonly invoiceSeries = process.env.S_INVOICE_SERIES || 'K23TXM';
  private readonly authToken = process.env.S_INVOICE_AUTH_TOKEN || '';
  private readonly cookieToken = process.env.S_INVOICE_COOKIE || '';

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    this.http = axios.create({ baseURL: this.baseUrl, timeout: 30000 });
  }

  /**
   * Auto-generate e-invoice on S-Invoice when an order becomes PAID
   */
  async createInvoiceForOrder(orderId: string): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;
    if (!workspaceId) {
      this.logger.error('Workspace ID not found when creating S-Invoice');
      return;
    }

    const orderRepository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
      workspaceId,
      'mktOrder',
      { shouldBypassPermissionChecks: true },
    );
    const orderItemRepository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderItemWorkspaceEntity>(
      workspaceId,
      'mktOrderItem',
      { shouldBypassPermissionChecks: true },
    );
    const invoiceRepository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktInvoiceWorkspaceEntity>(
      workspaceId,
      'mktInvoice',
      { shouldBypassPermissionChecks: true },
    );

    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`Order ${orderId} not found when creating S-Invoice`);
      return;
    }

    // Idempotency: skip if an invoice already exists for this order
    const existingInvoice = await invoiceRepository.findOne({ where: { mktOrderId: orderId } as any });
    if (existingInvoice?.transactionUuid || existingInvoice?.invoiceNo) {
      this.logger.log(`Invoice already exists for order ${orderId}, skip creation.`);
      return;
    }

    const items = await orderItemRepository.find({ where: { mktOrderId: orderId } as any });
    if (!items || items.length === 0) {
      this.logger.warn(`Order ${orderId} has no items; skip S-Invoice creation`);
      return;
    }

    const nowMs = Date.now();
    const transactionUuid = randomUUID();

    // Build item lines
    const itemInfo = items.map((it, idx) => {
      const quantity = it.quantity ?? 1;
      const unitPrice = it.unitPrice ?? 0;
      const amountWithoutTax = unitPrice * quantity;
      const taxPercent = (it.taxPercentage ?? 0) as number;
      const taxAmount = Math.round((amountWithoutTax * taxPercent) / 100);
      const withTax = amountWithoutTax + taxAmount;

      return {
        lineNumber: idx + 1,
        selection: 1,
        itemName: it.name || it.snapshotProductName || `Item ${idx + 1}`,
        unitName: it.unitName || 'unit',
        quantity,
        unitPrice,
        itemTotalAmountWithoutTax: amountWithoutTax,
        itemTotalAmountAfterDiscount: amountWithoutTax,
        itemTotalAmountWithTax: withTax,
        taxPercentage: taxPercent,
        taxAmount,
      };
    });

    // Compute tax breakdowns (group by taxPercentage)
    const taxMap = new Map<number, { taxableAmount: number; taxAmount: number }>();
    for (const line of itemInfo) {
      const key = line.taxPercentage || 0;
      const current = taxMap.get(key) || { taxableAmount: 0, taxAmount: 0 };
      current.taxableAmount += line.itemTotalAmountWithoutTax;
      current.taxAmount += line.taxAmount;
      taxMap.set(key, current);
    }
    const taxBreakdowns = Array.from(taxMap.entries()).map(([taxPercentage, v]) => ({
      taxPercentage,
      taxableAmount: v.taxableAmount,
      taxAmount: v.taxAmount,
    }));

    const totalAmountWithoutTax = itemInfo.reduce((s, l) => s + l.itemTotalAmountWithoutTax, 0);
    const totalTaxAmount = itemInfo.reduce((s, l) => s + l.taxAmount, 0);
    const totalAmountWithTax = totalAmountWithoutTax + totalTaxAmount;

    const payload = {
      generalInvoiceInfo: {
        invoiceType: '1',
        templateCode: this.templateCode,
        invoiceSeries: this.invoiceSeries,
        currencyCode: 'VND',
        exchangeRate: 1,
        adjustmentType: '1',
        paymentStatus: true,
        cusGetInvoiceRight: true,
        invoiceIssuedDate: nowMs,
        transactionUuid,
      },
      buyerInfo: {
        buyerName: order.name || 'Khách hàng',
        buyerTaxCode: null,
        buyerAddressLine: '',
        buyerPhoneNumber: '',
        buyerEmail: '',
        buyerNotGetInvoice: '0',
      },
      payments: [{ paymentMethodName: 'Chuyển khoản' }],
      itemInfo,
      taxBreakdowns,
      summarizeInfo: {
        totalAmountWithoutTax,
        totalTaxAmount,
        totalAmountWithTax,
        totalAmountAfterDiscount: totalAmountWithTax,
        sumOfTotalLineAmountWithoutTax: totalAmountWithoutTax,
        discountAmount: 0,
        totalAmountWithTaxInWords: '',
      },
      metadata: [
        {
          keyTag: 'invoiceNote',
          stringValue: `Auto generated for order ${orderId}`,
          valueType: 'text',
          keyLabel: 'Ghi chú',
        },
      ],
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
      if (this.cookieToken) headers['Cookie'] = `access_token=${this.cookieToken}`;

      const url = `/services/einvoiceapplication/api/InvoiceAPI/InvoiceWS/createInvoice/${this.taxCode}`;
      const res = await this.http.post<CreateInvoiceResponse>(url, payload, { headers });

      const response = res.data || {};
      const saved = await invoiceRepository.save({
        name: `INV-${order.orderCode || order.id}`,
        status: MKT_INVOICE_STATUS.SENT,
        amount: String(totalAmountWithTax),
        vat: String(totalTaxAmount),
        totalWithoutTax: String(totalAmountWithoutTax),
        totalTax: String(totalTaxAmount),
        totalWithTax: String(totalAmountWithTax),
        sInvoiceCode: this.taxCode,
        supplierTaxCode: this.taxCode,
        templateCode: this.templateCode,
        invoiceSeries: this.invoiceSeries,
        invoiceNo: response.invoiceNo,
        transactionUuid: response.transactionUuid || transactionUuid,
        issueDate: String(nowMs),
        mktOrderId: orderId,
      } as any);

      this.logger.log(`S-Invoice created. Order ${orderId} -> invoice ${saved.invoiceNo || ''}`);
    } catch (error: any) {
      const errMsg = error?.response?.data || error?.message;
      this.logger.error(`Create S-Invoice failed for order ${orderId}: ${JSON.stringify(errMsg)}`);
      // Persist a draft/error invoice for traceability
      try {
        await invoiceRepository.save({
          name: `INV-${order.orderCode || order.id}`,
          status: MKT_INVOICE_STATUS.DRAFT,
          amount: String(totalAmountWithTax),
          vat: String(totalTaxAmount),
          totalWithoutTax: String(totalAmountWithoutTax),
          totalTax: String(totalTaxAmount),
          totalWithTax: String(totalAmountWithTax),
          sInvoiceCode: this.taxCode,
          supplierTaxCode: this.taxCode,
          templateCode: this.templateCode,
          invoiceSeries: this.invoiceSeries,
          transactionUuid,
          issueDate: String(nowMs),
          mktOrderId: orderId,
        } as any);
      } catch (persistErr) {
        this.logger.error(`Failed to save draft invoice after API error: ${persistErr?.message}`);
      }
    }
  }
}


