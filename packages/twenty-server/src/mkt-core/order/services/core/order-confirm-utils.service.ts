import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { firstValueFrom } from 'rxjs';

import { IdempotencyCacheRepository } from 'src/mkt-core/common/idempotency';
import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  JITTER_FACTOR,
  ORDER_ACTION,
  ORDER_CODE_LOCK_KEY_PREFIX,
  ORDER_CODE_LOCK_TIMEOUT_MS,
  ORDER_CODE_MAX_RETRIES,
} from 'src/mkt-core/order/constants';
import {
  ORDER_CODE_DEFAULTS,
  ORDER_CODE_FORMAT,
  ORDER_CONFIG_KEY,
  OrderConfig,
} from 'src/mkt-core/order/config';
import { OrderCalculationService } from 'src/mkt-core/order/services/core/order-calculation.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { ORDER_METADATA } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/workspace-entities/mkt-payment-method.workspace-entity';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import { SEPAY_DEFAULT_DURATION } from 'src/mkt-core/payment/constants';
import { PaymentQrResult } from 'src/mkt-core/payment/types/payment.type';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import {
  BidvSepayApiResponse,
  BidvSepayOrderRequest,
} from 'src/mkt-core/payment/types/bidv-sepay.types';
import { isSepayPaymentMethod } from 'src/mkt-core/payment/utils';
import { OrderCalculationResult } from 'src/mkt-core/order/types';

/**
 * OrderConfirmUtilsService - Utility service for order confirmation operations
 *
 * Provides:
 * - Order value calculations using MoneyUtils
 * - Order code generation
 * - Order name generation
 * - Refund operations
 * - SEPay QR code generation
 */
@Injectable()
export class OrderConfirmUtilsService {
  public changeVariantData = {
    oldVariantName: '',
    newVariantName: '',
  };
  private readonly logger = new Logger(OrderConfirmUtilsService.name);
  private readonly orderCodePrefix: string;
  public orderMetadata: ORDER_METADATA | null = null;
  private readonly SEPAY_QR_CONFIG = {
    BASE_URL: 'https://qr.sepay.vn/img',
    TEMPLATE: 'qronly',
    DOWNLOAD: 'false',
  } as const;

  constructor(
    private readonly httpService: HttpService,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktPaymentMethodRepository: MktPaymentMethodRepository,
    private readonly idempotencyCacheRepository: IdempotencyCacheRepository,
    private readonly orderCalculationService: OrderCalculationService,
    @Inject(ORDER_CONFIG_KEY)
    private readonly config: OrderConfig,
  ) {
    // TODO : Load prefix from config
    this.orderCodePrefix =
      this.config?.code?.prefix ?? ORDER_CODE_DEFAULTS.PREFIX;
  }

  /**
   * Calculate order values from order items
   *
   * Delegates to OrderCalculationService for consistent calculation logic
   * Handles absolute discount separately (stored in order entity)
   */
  async calculateOrderValues(
    currentOrder: MktOrderWorkspaceEntity | null,
  ): Promise<OrderCalculationResult> {
    this.logger.log('Calculating order values...');

    const emptyResult: OrderCalculationResult = {
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
    };

    try {
      const orderItems = currentOrder?.orderItems;

      if (!orderItems || orderItems.length === 0) {
        this.logger.warn(`No order items found for order`);

        return emptyResult;
      }

      // Use OrderCalculationService for consistent calculation
      // discountPercent = 0 vì discount được xử lý riêng (absolute discount)
      // isCombo sẽ được auto-detect từ orderItems.itemSource
      const calculated =
        this.orderCalculationService.calculateOrderTotalsFromEntities(
          orderItems,
          { discountPercent: 0 },
        );

      // Apply absolute discount from order entity
      const absoluteDiscount = currentOrder?.discount ?? 0;
      const totalAmount = MoneyUtils.subtract(
        calculated.totalAmount,
        absoluteDiscount,
      ).toNumber();

      this.logger.log(
        `Calculated order values: subtotal=${calculated.subtotal}, tax=${calculated.tax}, discount=${absoluteDiscount}, totalAmount=${totalAmount}`,
      );

      return {
        subtotal: MoneyUtils.round(calculated.subtotal, 2).toNumber(),
        tax: MoneyUtils.round(calculated.tax, 2).toNumber(),
        discount: MoneyUtils.round(absoluteDiscount, 2).toNumber(),
        totalAmount: MoneyUtils.round(totalAmount, 2).toNumber(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate order values for order ${currentOrder?.id}:`,
        error,
      );

      return emptyResult;
    }
  }

  /**
   * Generate unique order code with distributed locking
   *
   * Features:
   * - Token-based locking to prevent releasing other process's lock
   * - Exponential backoff with jitter for retry
   * - Lock key unique per workspace and date
   *
   * Lock key format: order:code-gen:{workspaceId}:{datePrefix}
   */
  async generateOrderCode(workspaceId: string): Promise<string | null> {
    const now = DateTimeUtils.now();
    const jsDate = now.toJSDate();
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Lock key unique per workspace and date
    const lockKey = `${ORDER_CODE_LOCK_KEY_PREFIX}:${workspaceId}:${datePrefix}`;

    for (let attempt = 1; attempt <= ORDER_CODE_MAX_RETRIES; attempt++) {
      let lockToken: string | null = null;

      try {
        // Acquire distributed lock with token
        const lockResult =
          await this.idempotencyCacheRepository.acquireLockWithToken(
            lockKey,
            ORDER_CODE_LOCK_TIMEOUT_MS,
          );

        if (!lockResult.success) {
          this.logger.warn(
            `Failed to acquire lock for order code generation (attempt ${attempt}): ${lockResult.error}`,
          );
          await this.delayWithBackoff(attempt);
          continue;
        }

        lockToken = lockResult.data;

        if (!lockToken) {
          // Lock not acquired (held by another process)
          this.logger.warn(
            `Lock held by another process (attempt ${attempt}), waiting...`,
          );
          await this.delayWithBackoff(attempt);
          continue;
        }

        // Generate order code within lock
        const orderCode = await this.generateOrderCodeWithinLock(
          workspaceId,
          datePrefix,
        );

        this.logger.log(
          `Generated orderCode: ${orderCode} (attempt ${attempt})`,
        );

        // Release lock with token verification
        await this.idempotencyCacheRepository.releaseLockWithToken(
          lockKey,
          lockToken,
        );

        return orderCode;
      } catch (error) {
        this.logger.error(
          `Failed to generate order code (attempt ${attempt}):`,
          error,
        );

        if (attempt === ORDER_CODE_MAX_RETRIES) {
          // Final fallback: use timestamp-based code
          return this.generateFallbackOrderCode(datePrefix);
        }

        await this.delayWithBackoff(attempt);
      }
    }

    return null;
  }

  /**
   * Generate fallback order code using timestamp + random
   *
   * Format: {PREFIX}{YYYYMMDD}{TTTT}{NN}
   * - TTTT: 4 digits from timestamp (last 4 digits of milliseconds)
   * - NN: 2 digits random number (00-99)
   *
   * This prevents collision when 2 requests happen in the same millisecond
   * by adding 2 digits of randomness (100 unique codes per ms)
   *
   * Used when:
   * - Lock acquisition fails after all retries
   * - Daily order limit (999) is exceeded
   */
  private generateFallbackOrderCode(datePrefix: string): string {
    // Get last 4 digits of timestamp
    const timestamp = DateTimeUtils.toMillis(DateTimeUtils.now())
      .toString()
      .slice(-ORDER_CODE_FORMAT.FALLBACK_TIMESTAMP_LENGTH);

    // Generate random 2-digit suffix to prevent same-ms collision
    const random = Math.floor(
      Math.random() * (ORDER_CODE_FORMAT.FALLBACK_RANDOM_MAX + 1),
    )
      .toString()
      .padStart(ORDER_CODE_FORMAT.FALLBACK_RANDOM_LENGTH, '0');

    const fallbackSuffix = `${timestamp}${random}`;

    this.logger.warn(
      `Using fallback order code: timestamp=${timestamp}, random=${random}`,
    );

    return `${this.orderCodePrefix}${datePrefix}${fallbackSuffix}`;
  }

  /**
   * Generate order code within the distributed lock
   *
   * Format: {PREFIX}{YYYYMMDD}{NNN}
   * - PREFIX: from config (e.g., 'MKT')
   * - YYYYMMDD: 8 digits date
   * - NNN: 3 digits sequence (001-999)
   *
   * @private
   */
  private async generateOrderCodeWithinLock(
    workspaceId: string,
    datePrefix: string,
  ): Promise<string> {
    const orderRepository =
      await this.mktOrderRepository.getRepository(workspaceId);

    // Calculate expected code length for normal format only
    // PREFIX + YYYYMMDD + NNN (3 digits)
    const normalFormatLength =
      this.orderCodePrefix.length +
      ORDER_CODE_FORMAT.DATE_LENGTH +
      ORDER_CODE_FORMAT.SEQUENCE_LENGTH;

    // Find the highest normal format order code for today
    // Using LENGTH() to filter out fallback format (6 digits suffix)
    const todayOrder = await orderRepository
      .createQueryBuilder('order')
      .where('order.orderCode LIKE :pattern', {
        pattern: `${this.orderCodePrefix}${datePrefix}%`,
      })
      .andWhere('LENGTH(order.orderCode) = :normalLength', {
        normalLength: normalFormatLength,
      })
      .orderBy('order.orderCode', 'DESC')
      .limit(1)
      .getOne();

    let nextNumber = 1;

    if (todayOrder?.orderCode) {
      // Extract sequence number from normal format code
      const extractedNumber = this.extractSequenceNumber(
        todayOrder.orderCode,
        datePrefix,
      );

      if (
        extractedNumber !== null &&
        extractedNumber <= ORDER_CODE_FORMAT.MAX_DAILY_ORDERS
      ) {
        nextNumber = extractedNumber + 1;
      }
    }

    // Check if we've exceeded max daily orders
    if (nextNumber > ORDER_CODE_FORMAT.MAX_DAILY_ORDERS) {
      this.logger.warn(
        `Max daily orders (${ORDER_CODE_FORMAT.MAX_DAILY_ORDERS}) exceeded, using timestamp fallback`,
      );

      return this.generateFallbackOrderCode(datePrefix);
    }

    // Generate new order code: PREFIX + YYYYMMDD + sequence
    const orderCode = `${this.orderCodePrefix}${datePrefix}${String(nextNumber).padStart(ORDER_CODE_FORMAT.SEQUENCE_LENGTH, '0')}`;

    // Double-check uniqueness (defensive)
    const existingOrder =
      await this.mktOrderRepository.findByOrderCode(orderCode);

    if (existingOrder) {
      this.logger.warn(
        `Order code ${orderCode} already exists, using timestamp fallback`,
      );

      return this.generateFallbackOrderCode(datePrefix);
    }

    return orderCode;
  }

  /**
   * Extract sequence number from order code
   *
   * Handles both formats:
   * - Normal: MKT20241229001 -> 1
   * - Fallback: MKT20241229847291 -> 847291 (will be > MAX_DAILY_ORDERS)
   *
   * @returns sequence number or null if pattern doesn't match
   */
  private extractSequenceNumber(
    orderCode: string,
    datePrefix: string,
  ): number | null {
    // Pattern: PREFIX + 8 digits date + 3-6 digits sequence
    // Capture the sequence part (last 3-6 digits after date)
    const pattern = new RegExp(
      `^${this.orderCodePrefix}${datePrefix}(\\d{${ORDER_CODE_FORMAT.SEQUENCE_LENGTH},${ORDER_CODE_FORMAT.FALLBACK_LENGTH}})$`,
    );
    const match = orderCode.match(pattern);

    if (!match) {
      return null;
    }

    return parseInt(match[1], 10);
  }

  /**
   * Delay with exponential backoff and jitter
   *
   * Formula: min(base * 2^attempt + jitter, max)
   * - base: 100ms
   * - max: 2000ms
   * - jitter: ±30% randomization to prevent thundering herd
   *
   * @param attempt - Current attempt number (1-based)
   */
  private async delayWithBackoff(attempt: number): Promise<void> {
    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, ...
    const exponentialDelay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);

    // Apply jitter: ±30%
    const jitter = exponentialDelay * JITTER_FACTOR * (Math.random() * 2 - 1);
    const delayWithJitter = exponentialDelay + jitter;

    // Cap at max delay
    const finalDelay = Math.min(delayWithJitter, BACKOFF_MAX_MS);

    this.logger.debug(
      `Backoff delay: ${Math.round(finalDelay)}ms (attempt ${attempt})`,
    );

    return new Promise((resolve) => setTimeout(resolve, finalDelay));
  }

  /**
   * Generate order name based on order items
   */
  async generateOrderName(
    currentOrder: MktOrderWorkspaceEntity | null,
  ): Promise<string | null> {
    try {
      if (!currentOrder?.orderItems || currentOrder.orderItems.length === 0) {
        const now = DateTimeUtils.now();
        const dateStr = now.toJSDate().toLocaleDateString('vi-VN');

        return `Đơn hàng ${dateStr}`;
      }

      // Generate name based on products
      const productNames = currentOrder.orderItems.map((item) => {
        if (item.snapshotProductName) {
          return item.snapshotProductName;
        }

        return 'Sản phẩm';
      });

      // Create order name
      let orderName = '';

      if (productNames.length === 1) {
        orderName = productNames[0];
      } else if (productNames.length === 2) {
        orderName = `${productNames[0]} và ${productNames[1]}`;
      } else {
        orderName = `${productNames[0]} và ${productNames.length - 1} sản phẩm khác`;
      }

      // Add quantity info if there are multiple quantities
      const totalQuantity = currentOrder.orderItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );

      if (totalQuantity > 1) {
        orderName += ` (${totalQuantity} sản phẩm)`;
      }

      this.logger.log(`Generated order name: ${orderName}`);

      return orderName;
    } catch (error) {
      this.logger.error(`Failed to generate order name:`, error);

      return null;
    }
  }

  async refundOrder(
    action: ORDER_ACTION,
    licenseId: string,
    refundOrder: MktOrderWorkspaceEntity | null,
    workspaceId: string,
    note?: string,
  ) {
    if (!refundOrder?.id) {
      return;
    }

    if (action !== ORDER_ACTION.REFUND) {
      throw new Error('Action must be REFUND to refund order');
    }

    // Create refund note
    const refundNote = `[REFUND - ${DateTimeUtils.toISO(DateTimeUtils.now())}] Cần hoàn tiền cho khách hàng. Vui lòng xác nhận sau khi đã hoàn tiền. Status: PENDING_REFUND. License ID: ${licenseId}`;

    // Combine with existing note if any
    const existingNote = refundOrder.note || '';
    let updatedNote = existingNote
      ? `${existingNote}\n\n${refundNote}`
      : refundNote;

    if (note) {
      updatedNote = `${updatedNote}\n\n${note}`;
    }

    // Update order with all costs set to 0 and refund note
    await this.mktOrderRepository.updateOrder(refundOrder.id, {
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      note: updatedNote,
    });

    this.logger.log(
      `Order ${refundOrder.id} updated for refund. All costs set to 0. License ID: ${licenseId}`,
    );
  }

  /**
   * Confirm refund completion for an order
   */
  async confirmRefundCompleted(
    workspaceId: string,
    orderId: string,
    refundDetails?: string,
  ): Promise<void> {
    const order = await this.mktOrderRepository.findById(orderId);

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Create confirmation note
    const confirmationNote = `[REFUND CONFIRMED - ${DateTimeUtils.toISO(DateTimeUtils.now())}] Đã hoàn tiền thành công cho khách hàng.`;
    const additionalDetails = refundDetails
      ? ` Chi tiết: ${refundDetails}`
      : '';
    const fullConfirmationNote = `${confirmationNote}${additionalDetails}`;

    // Combine with existing note
    const existingNote = order.note || '';
    const updatedNote = existingNote
      ? `${existingNote}\n\n${fullConfirmationNote}`
      : fullConfirmationNote;

    await this.mktOrderRepository.updateOrder(orderId, {
      note: updatedNote,
    });

    this.logger.log(
      `Refund confirmed for order ${orderId}. Details: ${refundDetails || 'No additional details'}`,
    );
  }

  /**
   * Payment data for creating payment records
   */
  private readonly DEFAULT_CURRENCY = 'VND';

  /**
   * Create payment records from order metadata
   * Refactored to reduce complexity using early returns and helper methods
   */
  private async createPaymentFromOrder(
    paymentData: {
      paymentName: string;
      totalAmount: number;
      currency: string;
      generatedOrderCode: string | null;
      orderId: string;
      workspaceId: string | null;
    },
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
  ): Promise<PaymentQrResult | void> {
    if (!paymentData.workspaceId) {
      return;
    }

    const result: PaymentQrResult = {
      orderCode: paymentData.generatedOrderCode,
      QRCodeUrl: null,
    };

    // Early return if no payment methods
    const pmIds = this.extractPaymentMethodIds(paymentMethodsMeta);

    if (pmIds.length === 0) {
      return result;
    }

    // Fetch payment methods and create payments
    const paymentMethodRepository =
      await this.mktPaymentMethodRepository.getRepository(
        paymentData.workspaceId,
      );

    const pmById = await this.fetchPaymentMethodsMap(
      paymentMethodRepository,
      pmIds,
    );

    const payments = await this.createPaymentRecords(
      paymentData,
      paymentMethodsMeta ?? [],
      pmById,
      result,
    );

    // Save valid payments
    if (payments.length > 0) {
      const paymentRepository = await this.mktPaymentRepository.getRepository(
        paymentData.workspaceId,
      );

      await paymentRepository.save(payments);
    }

    return result;
  }

  /**
   * Extract valid payment method IDs from metadata
   */
  private extractPaymentMethodIds(
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
  ): string[] {
    if (!Array.isArray(paymentMethodsMeta) || paymentMethodsMeta.length === 0) {
      return [];
    }

    return paymentMethodsMeta
      .map((p) => p.mktPaymentMethodId)
      .filter((id): id is string => Boolean(id));
  }

  /**
   * Fetch payment methods and return as Map
   */
  private async fetchPaymentMethodsMap(
    repository: Awaited<
      ReturnType<typeof this.mktPaymentMethodRepository.getRepository>
    >,
    pmIds: string[],
  ): Promise<Map<string, MktPaymentMethodWorkspaceEntity>> {
    const methods = await repository.find({
      where: pmIds.map((id) => ({ id })) as unknown as { id: string },
    });

    return new Map(
      methods.map((m: MktPaymentMethodWorkspaceEntity) => [m.id, m]),
    );
  }

  /**
   * Create payment records from metadata
   */
  private async createPaymentRecords(
    paymentData: {
      paymentName: string;
      totalAmount: number;
      currency: string;
      generatedOrderCode: string | null;
      orderId: string;
      workspaceId: string | null;
    },
    paymentMethodsMeta: NonNullable<ORDER_METADATA['paymentMethods']>,
    pmById: Map<string, MktPaymentMethodWorkspaceEntity>,
    result: PaymentQrResult,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    const paymentPromises = paymentMethodsMeta.map((meta) =>
      this.createSinglePayment(paymentData, meta, pmById, result),
    );

    const payments = await Promise.all(paymentPromises);

    return payments.filter((p): p is MktPaymentWorkspaceEntity => p !== null);
  }

  /**
   * Create a single payment record
   */
  private async createSinglePayment(
    paymentData: {
      paymentName: string;
      totalAmount: number;
      currency: string;
      generatedOrderCode: string | null;
      orderId: string;
      workspaceId: string | null;
    },
    meta: NonNullable<ORDER_METADATA['paymentMethods']>[number],
    pmById: Map<string, MktPaymentMethodWorkspaceEntity>,
    result: PaymentQrResult,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    const pm = pmById.get(meta.mktPaymentMethodId);

    if (!pm || !paymentData.workspaceId) {
      return null;
    }

    const { qrCodeUrl, expiredAt } = await this.generateSepayQrCodeUrl(
      pm,
      paymentData.totalAmount || 0,
      paymentData.generatedOrderCode,
    );

    // Set first QR code URL to result
    if (!result.QRCodeUrl && qrCodeUrl) {
      result.QRCodeUrl = qrCodeUrl;
    }

    const paymentRepository = await this.mktPaymentRepository.getRepository(
      paymentData.workspaceId,
    );

    return paymentRepository.create({
      mktOrderId: paymentData.orderId,
      mktPaymentMethodId: meta.mktPaymentMethodId,
      name: `${pm.name} - ${paymentData.paymentName}`,
      amount: paymentData.totalAmount || 0,
      currency: paymentData.currency || this.DEFAULT_CURRENCY,
      qrCodeUrl: qrCodeUrl || undefined,
      duration: meta.duration || null,
      expiredAt: expiredAt || null,
      paymentPageUrl: `${this.config.urls.serverUrl}${this.config.urls.paymentPagePath}/${paymentData.generatedOrderCode}`,
      mktTemplateId: MKT_TEMPLATE.SEPAY,
    } as Partial<MktPaymentWorkspaceEntity>) as MktPaymentWorkspaceEntity;
  }

  async generateSepayQrCodeUrl(
    mktPaymentMethod: MktPaymentMethodWorkspaceEntity,
    customAmount?: number,
    orderCode?: string | null,
  ) {
    const result: { qrCodeUrl: string; expiredAt: string | null } = {
      qrCodeUrl: '',
      expiredAt: null,
    };

    this.logger.log('Generating SEPay QR code URL...');

    // Check if payment method is QR Code type using helper function
    if (!isSepayPaymentMethod(mktPaymentMethod?.type, mktPaymentMethod?.name)) {
      return result;
    }

    // Check if BIDV business mode is enabled
    if (this.config.bidv.enabled) {
      return this.generateBidvSepayQr(customAmount, orderCode);
    }

    try {
      // Get SEPay config
      const {
        account: sepayAcc,
        bank: sepayBank,
        virtualAccount: sepayVa,
      } = this.config.sepay;

      if (!sepayAcc || !sepayBank) {
        this.logger.warn('SEPay account or bank not configured');

        return result;
      }

      if (!orderCode) {
        this.logger.warn('No order code found for payment');

        return result;
      }

      if (!customAmount || customAmount <= 0) {
        this.logger.warn('Invalid amount for QR code generation');

        return result;
      }

      // Generate QR code URL
      const qrCodeUrl = this.buildSepayQrUrl({
        account: sepayAcc,
        bank: sepayBank,
        amount: customAmount,
        virtualAccount: sepayVa,
        orderCode,
      });

      this.logger.log(
        `Generated SEPay QR code URL for order ${orderCode} with amount ${customAmount}`,
      );

      return { ...result, qrCodeUrl };
    } catch (error) {
      this.logger.error('Error generating SEPay QR code URL:', error);

      return result;
    }
  }

  private async updateOrderInformation(
    workspaceId: string,
    orderId: string,
    updateOrderInfo: Partial<MktOrderWorkspaceEntity>,
    oldOrderId: string | null | undefined,
  ) {
    if (oldOrderId) {
      this.orderMetadata = { ...this.orderMetadata, oldOrderId };
    }
    let note = '';

    if (
      this.changeVariantData.oldVariantName &&
      this.changeVariantData.newVariantName
    ) {
      note = `\n
Đã thay đổi sản phẩm cho ${this.changeVariantData.oldVariantName}\n
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sản phẩm mới: -> ${this.changeVariantData.newVariantName}.\n
Thời gian: ${DateTimeUtils.toISO(DateTimeUtils.now())}
`;
    }
    await this.mktOrderRepository.updateOrder(orderId, {
      mktCustomerId: updateOrderInfo.mktCustomerId || null,
      orderCode: updateOrderInfo.orderCode ?? '',
      subtotal: updateOrderInfo.subtotal,
      tax: updateOrderInfo.tax,
      discount: updateOrderInfo.discount,
      totalAmount: updateOrderInfo.totalAmount,
      name: updateOrderInfo.name ?? '',
      note,
      metadata: safeJsonStringify(this.orderMetadata) as unknown as JSON,
    });
  }

  /**
   * Default result for BIDV SEPay QR generation
   */
  private readonly EMPTY_QR_RESULT = {
    qrCodeUrl: '',
    expiredAt: null,
  } as const;

  /**
   * Generate BIDV SEPay QR code
   * Refactored to reduce complexity
   */
  private async generateBidvSepayQr(
    customAmount?: number,
    orderCode?: string | null,
  ): Promise<{ qrCodeUrl: string; expiredAt: string | null }> {
    this.logger.log('Generating BIDV SEPay QR code...');

    // Validate inputs and get validated values
    const validation = this.validateBidvQrInputs(customAmount, orderCode);

    if ('error' in validation) {
      this.logger.warn(validation.error);

      return { ...this.EMPTY_QR_RESULT };
    }

    try {
      return await this.callBidvSepayApi(validation);
    } catch (error) {
      this.handleBidvApiError(error);

      return { ...this.EMPTY_QR_RESULT };
    }
  }

  /**
   * Validate inputs for BIDV QR generation
   * Returns validated inputs if valid, error object if invalid
   */
  private validateBidvQrInputs(
    customAmount?: number,
    orderCode?: string | null,
  ):
    | { amount: number; orderCode: string; apiUrl: string; authToken: string }
    | { error: string } {
    const { apiUrl, authToken } = this.config.bidv;

    if (!apiUrl || !authToken) {
      return { error: 'BIDV SEPay API URL or Auth Token not configured' };
    }

    if (!orderCode) {
      return { error: 'No order code found for BIDV payment' };
    }

    if (!customAmount || customAmount <= 0) {
      return { error: 'Invalid amount for BIDV QR code generation' };
    }

    return {
      amount: customAmount,
      orderCode,
      apiUrl,
      authToken,
    };
  }

  /**
   * Call BIDV SEPay API to generate QR code
   */
  private async callBidvSepayApi(inputs: {
    amount: number;
    orderCode: string;
    apiUrl: string;
    authToken: string;
  }): Promise<{ qrCodeUrl: string; expiredAt: string | null }> {
    const { amount, orderCode, apiUrl, authToken } = inputs;

    const requestData: BidvSepayOrderRequest = {
      amount,
      order_code: orderCode,
      duration: SEPAY_DEFAULT_DURATION,
      with_qrcode: true,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    this.logger.log(
      `Calling BIDV SEPay API for order ${orderCode} with amount ${amount}`,
    );

    const response = await firstValueFrom(
      this.httpService.post<BidvSepayApiResponse>(apiUrl, requestData, {
        headers,
      }),
    );

    return this.parseBidvApiResponse(response.data, orderCode);
  }

  /**
   * Parse BIDV SEPay API response
   */
  private parseBidvApiResponse(
    responseData: BidvSepayApiResponse,
    orderCode: string,
  ): { qrCodeUrl: string; expiredAt: string | null } {
    if (responseData.status !== 'success' || !responseData.data) {
      this.logger.error(`BIDV SEPay API error: ${responseData.message}`);

      return { ...this.EMPTY_QR_RESULT };
    }

    const { qr_code_url, qr_code, order_id, expired_at } = responseData.data;

    this.logger.log(
      `Successfully generated BIDV SEPay QR for order ${orderCode}, order_id: ${order_id}`,
    );

    return {
      qrCodeUrl: qr_code_url || qr_code || '',
      expiredAt: expired_at || null,
    };
  }

  /**
   * Handle BIDV API errors
   */
  private handleBidvApiError(error: unknown): void {
    this.logger.error('Error calling BIDV SEPay API:', error);

    const axiosError = error as { response?: { data?: unknown } };

    if (axiosError?.response?.data) {
      this.logger.error('API Response:', axiosError.response.data);
    }
  }

  // ============================================
  // QR URL BUILDERS
  // ============================================
  /**
   * Build SEPay QR code URL from parameters
   *
   * @param params - QR URL parameters
   * @returns Formatted SEPay QR URL
   */
  private buildSepayQrUrl(params: {
    account: string;
    bank: string;
    amount: number;
    virtualAccount: string;
    orderCode: string;
  }): string {
    const { account, bank, amount, virtualAccount, orderCode } = params;

    const queryParams = new URLSearchParams({
      acc: account,
      bank: bank,
      amount: amount.toString(),
      des: `${virtualAccount} ${orderCode}`,
      template: this.SEPAY_QR_CONFIG.TEMPLATE,
      download: this.SEPAY_QR_CONFIG.DOWNLOAD,
    });

    return `${this.SEPAY_QR_CONFIG.BASE_URL}?${queryParams.toString()}`;
  }
}

/**
 * @deprecated Use OrderConfirmUtilsService instead
 * Alias for backward compatibility
 */
export const MktOrderCommonConfirmService = OrderConfirmUtilsService;
