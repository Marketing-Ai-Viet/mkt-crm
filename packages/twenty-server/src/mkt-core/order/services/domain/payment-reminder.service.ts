/**
 * PaymentReminderService
 *
 * Handles manual payment reminder email operations for orders.
 *
 * Features:
 * - Single reminder: Gửi reminder cho một order
 * - Bulk reminder: Gửi reminder cho nhiều orders
 * - Query: Lấy danh sách orders cần nhắc nhở
 * - Validation: Kiểm tra order có hợp lệ để gửi reminder
 * - Idempotency: Ngăn chặn gửi trùng lặp
 *
 * Flow:
 * 1. Validate order (status, payment, email, confirmation)
 * 2. Check rate limits (MAX_REMINDERS, MIN_INTERVAL)
 * 3. Check idempotency (if key provided)
 * 4. Queue email via MktEmailService
 * 5. Update order tracking (remindersSent, lastReminderAt)
 * 6. Return result
 */

import { Injectable, Logger } from '@nestjs/common';

import { GraphQLError } from 'graphql';

import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { IdempotencyService } from 'src/mkt-core/common/idempotency';
import { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories';
import { MktEmailService } from 'src/mkt-core/mkt-email/services';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import {
  GET_PAYMENT_REMINDER_ERROR_MESSAGE,
  PAYMENT_REMINDER_CONFIG,
  PAYMENT_REMINDER_ERROR_CODE,
  PaymentReminderErrorCode,
} from 'src/mkt-core/order/constants/payment-reminder.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  BulkReminderResultItem,
  OrderNeedingReminder,
  OrderValidationResult,
  PaginatedOrdersNeedingReminder,
  PaymentReminderContext,
  PaymentReminderFilterOptions,
  ReminderEmailData,
  SendBulkReminderOptions,
  SendBulkReminderResult,
  SendReminderOptions,
  SendReminderResult,
  SKIP_REASON,
} from 'src/mkt-core/order/types/payment-reminder.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Regex để strip HTML tags từ input
 * Pattern: match < followed by any characters until >, xử lý cả self-closing tags
 */
const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * HTML entities cần escape để tránh XSS
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape HTML entities trong string
 */
const escapeHtml = (str: string): string => {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
};

/**
 * PaymentReminderService
 *
 * Service xử lý gửi email nhắc nhở thanh toán cho customer.
 */
@Injectable()
export class PaymentReminderService {
  private readonly logger = new Logger(PaymentReminderService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly mktEmailService: MktEmailService,
    private readonly templateRepository: MktTemplateRepository,
    private readonly emailService: EmailService,
    private readonly idempotencyService: IdempotencyService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Gửi payment reminder cho một order
   *
   * Flow:
   * 1. Check idempotency (nếu có idempotencyKey)
   * 2. Fetch order với relations
   * 3. Validate order
   * 4. Build email data
   * 5. Queue email
   * 6. Update order tracking
   * 7. Return result
   *
   * @throws GraphQLError với extension code khi có lỗi
   */
  async sendReminder(
    options: SendReminderOptions,
    context: PaymentReminderContext,
  ): Promise<SendReminderResult> {
    const { orderId, idempotencyKey, forceResend } = options;

    this.logger.log(
      `Sending payment reminder for order ${orderId}, forceResend=${forceResend ?? false}`,
    );

    // Nếu có idempotencyKey, sử dụng idempotency service
    if (idempotencyKey) {
      const result =
        await this.idempotencyService.executeWithIdempotency<SendReminderResult>(
          {
            workspaceId: context.workspaceId,
            domain: 'order',
            action: 'sendPaymentReminder',
            requestBody: { orderId, userId: context.userId },
            options: { clientKey: idempotencyKey },
          },
          async () => {
            return this.doSendReminder(options, context);
          },
        );

      // Nếu là duplicate request đã thành công trước đó
      if (result.fromCache) {
        this.logger.log(
          `Returning cached result for idempotency key: ${idempotencyKey}`,
        );

        // Trả về cached result nhưng không throw error
        return result.data;
      }

      return result.data;
    }

    // Không có idempotencyKey, thực hiện trực tiếp
    return this.doSendReminder(options, context);
  }

  /**
   * Gửi bulk payment reminders
   *
   * Flow:
   * 1. Validate bulk limit
   * 2. Get orders (by IDs hoặc filter)
   * 3. Process từng order (validate, send)
   * 4. Aggregate results
   *
   * @returns Kết quả bulk với totalSent, totalSkipped, totalFailed
   */
  async sendBulkReminders(
    options: SendBulkReminderOptions,
    context: PaymentReminderContext,
  ): Promise<SendBulkReminderResult> {
    const { orderIds, filter, dryRun = false } = options;

    this.logger.log(
      `Starting bulk payment reminders, dryRun=${dryRun}, ` +
        `orderIds=${orderIds?.length ?? 0}, hasFilter=${!!filter}`,
    );

    // Validate bulk limit nếu có orderIds
    if (orderIds && orderIds.length > PAYMENT_REMINDER_CONFIG.BULK_LIMIT) {
      throw this.createGraphQLError(
        PAYMENT_REMINDER_ERROR_CODE.BULK_LIMIT_EXCEEDED,
        {
          requested: orderIds.length,
          limit: PAYMENT_REMINDER_CONFIG.BULK_LIMIT,
        },
      );
    }

    // Lấy danh sách orders
    let orders: MktOrderWorkspaceEntity[];

    if (orderIds && orderIds.length > 0) {
      // Lấy theo IDs
      orders = await this.fetchOrdersByIds(orderIds, context.workspaceId);
    } else if (filter) {
      // Lấy theo filter
      orders = await this.fetchOrdersByFilter(filter, context.workspaceId);
    } else {
      // Không có orderIds và không có filter -> error
      throw this.createGraphQLError(
        PAYMENT_REMINDER_ERROR_CODE.NO_ORDERS_TO_PROCESS,
      );
    }

    if (orders.length === 0) {
      throw this.createGraphQLError(
        PAYMENT_REMINDER_ERROR_CODE.NO_ORDERS_TO_PROCESS,
      );
    }

    // Giới hạn số lượng orders
    const limitedOrders = orders.slice(0, PAYMENT_REMINDER_CONFIG.BULK_LIMIT);

    // Process từng order
    const results: BulkReminderResultItem[] = [];
    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const order of limitedOrders) {
      const result = await this.processSingleOrderForBulk(
        order,
        options,
        context,
        dryRun,
      );

      results.push(result);

      if (result.sent) {
        totalSent++;
      } else if (result.skipped) {
        totalSkipped++;
      } else {
        totalFailed++;
      }
    }

    this.logger.log(
      `Bulk payment reminders completed: ` +
        `total=${limitedOrders.length}, sent=${totalSent}, ` +
        `skipped=${totalSkipped}, failed=${totalFailed}`,
    );

    return {
      totalProcessed: limitedOrders.length,
      totalSent,
      totalSkipped,
      totalFailed,
      isDryRun: dryRun,
      results,
    };
  }

  /**
   * Lấy danh sách orders cần nhắc nhở thanh toán
   *
   * Filter mặc định:
   * - status: PROCESSING
   * - paymentStatus: PENDING hoặc PARTIAL
   * - salePaymentConfirmed = false
   * - accountingConfirmed = false
   * - remindersSent < MAX_REMINDERS
   */
  async getOrdersNeedingReminder(
    filter: PaymentReminderFilterOptions | undefined,
    pagination:
      | { limit?: number; offset?: number; cursor?: string }
      | undefined,
    context: PaymentReminderContext,
  ): Promise<PaginatedOrdersNeedingReminder> {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    this.logger.log(
      `Getting orders needing reminder, limit=${limit}, offset=${offset}`,
    );

    // Build where clause
    const { orders, totalCount } = await this.queryOrdersNeedingReminder(
      filter,
      limit,
      offset,
      context.workspaceId,
    );

    // Map to output format
    const mappedOrders = orders.map((order) =>
      this.mapOrderToNeedingReminder(order),
    );

    // Calculate page info
    const hasNextPage = offset + orders.length < totalCount;
    const hasPreviousPage = offset > 0;
    const startCursor = orders.length > 0 ? orders[0].id : undefined;
    const endCursor =
      orders.length > 0 ? orders[orders.length - 1].id : undefined;

    return {
      orders: mappedOrders,
      totalCount,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
    };
  }

  /**
   * Validate order có hợp lệ để gửi reminder không
   *
   * Checks:
   * 1. Order exists
   * 2. Order status is PROCESSING
   * 3. Payment status is PENDING or PARTIAL
   * 4. Order not confirmed (sale or accounting)
   * 5. Customer has email
   * 6. Not exceed MAX_REMINDERS (unless forceResend)
   * 7. MIN_INTERVAL passed (unless forceResend)
   */
  validateOrderForReminder(
    order: MktOrderWorkspaceEntity | null,
    orderId: string,
    forceResend = false,
  ): OrderValidationResult {
    // 1. Order exists
    if (!order) {
      return {
        valid: false,
        errorCode: PAYMENT_REMINDER_ERROR_CODE.ORDER_NOT_FOUND,
        errorContext: { orderId },
      };
    }

    // 2. Order status check
    if (
      !(
        PAYMENT_REMINDER_CONFIG.VALID_ORDER_STATUSES as readonly ORDER_STATUS[]
      ).includes(order.status as ORDER_STATUS)
    ) {
      return {
        valid: false,
        errorCode: PAYMENT_REMINDER_ERROR_CODE.INVALID_ORDER_STATUS,
        errorContext: {
          orderId,
          currentStatus: order.status,
          validStatuses: [...PAYMENT_REMINDER_CONFIG.VALID_ORDER_STATUSES],
        },
      };
    }

    // 3. Payment status check
    if (
      !(
        PAYMENT_REMINDER_CONFIG.VALID_PAYMENT_STATUSES as readonly ORDER_PAYMENT_STATUS[]
      ).includes(order.paymentStatus as ORDER_PAYMENT_STATUS)
    ) {
      return {
        valid: false,
        errorCode: PAYMENT_REMINDER_ERROR_CODE.PAYMENT_ALREADY_COMPLETE,
        errorContext: {
          orderId,
          paymentStatus: order.paymentStatus,
        },
      };
    }

    // 4. Check confirmation status
    if (
      order.salePaymentConfirmed === true ||
      order.accountingConfirmed === true
    ) {
      return {
        valid: false,
        errorCode: PAYMENT_REMINDER_ERROR_CODE.ORDER_ALREADY_CONFIRMED,
        errorContext: {
          orderId,
          salePaymentConfirmed: order.salePaymentConfirmed,
          accountingConfirmed: order.accountingConfirmed,
        },
      };
    }

    // 5. Customer email check
    if (!order.mktCustomer?.email) {
      return {
        valid: false,
        errorCode: PAYMENT_REMINDER_ERROR_CODE.NO_CUSTOMER_EMAIL,
        errorContext: { orderId, customerId: order.mktCustomerId },
      };
    }

    // forceResend bypasses rate limit checks
    if (!forceResend) {
      // 6. MAX_REMINDERS check
      const remindersSent = order.remindersSent ?? 0;

      if (remindersSent >= PAYMENT_REMINDER_CONFIG.MAX_REMINDERS) {
        return {
          valid: false,
          errorCode: PAYMENT_REMINDER_ERROR_CODE.MAX_REMINDERS_REACHED,
          errorContext: {
            orderId,
            remindersSent,
            maxReminders: PAYMENT_REMINDER_CONFIG.MAX_REMINDERS,
          },
        };
      }

      // 7. MIN_INTERVAL check
      if (order.lastReminderAt) {
        const lastReminder = DateTimeUtils.fromDate(order.lastReminderAt);
        const now = DateTimeUtils.now();
        const nextAllowedTime = DateTimeUtils.add(lastReminder, {
          hours: PAYMENT_REMINDER_CONFIG.MIN_INTERVAL_HOURS,
        });

        if (now < nextAllowedTime) {
          return {
            valid: false,
            errorCode: PAYMENT_REMINDER_ERROR_CODE.REMINDER_TOO_SOON,
            errorContext: {
              orderId,
              lastReminderAt: DateTimeUtils.toISO(lastReminder),
              nextAllowedAt: DateTimeUtils.toISO(nextAllowedTime),
              minIntervalHours: PAYMENT_REMINDER_CONFIG.MIN_INTERVAL_HOURS,
            },
          };
        }
      }
    }

    return { valid: true };
  }

  // ============================================
  // PRIVATE METHODS - Core Logic
  // ============================================

  /**
   * Thực hiện gửi reminder (sau khi đã check idempotency)
   */
  private async doSendReminder(
    options: SendReminderOptions,
    context: PaymentReminderContext,
  ): Promise<SendReminderResult> {
    const { orderId, templateKey, note, forceResend } = options;

    // 1. Fetch order với relations
    const order = await this.orderRepository.findByIdWithOptions(
      orderId,
      { relations: { mktCustomer: true, mktPayments: true } },
      context.workspaceId,
    );

    // 2. Validate
    const validation = this.validateOrderForReminder(
      order,
      orderId,
      forceResend,
    );

    if (!validation.valid) {
      throw this.createGraphQLError(
        validation.errorCode ?? PAYMENT_REMINDER_ERROR_CODE.ORDER_NOT_FOUND,
        validation.errorContext,
      );
    }

    // order is guaranteed to exist here
    const validOrder = order as MktOrderWorkspaceEntity;

    // 3. Get template
    const effectiveTemplateKey =
      templateKey ?? PAYMENT_REMINDER_CONFIG.DEFAULT_TEMPLATE_KEY;
    const template =
      await this.templateRepository.findByKey(effectiveTemplateKey);

    if (!template) {
      throw this.createGraphQLError(
        PAYMENT_REMINDER_ERROR_CODE.TEMPLATE_NOT_FOUND,
        { templateKey: effectiveTemplateKey },
      );
    }

    // 4. Build email data
    const sanitizedNote = note ? this.sanitizeNote(note) : undefined;
    const emailData = this.buildReminderEmailData(validOrder, sanitizedNote);

    // 5. Queue email
    const previousReminderCount = validOrder.remindersSent ?? 0;

    try {
      await this.queueReminderEmail(validOrder, template, emailData);
    } catch (error) {
      this.logger.error(
        `Failed to queue reminder email for order ${orderId}: ${error}`,
      );
      throw this.createGraphQLError(
        PAYMENT_REMINDER_ERROR_CODE.EMAIL_QUEUE_FAILED,
        { orderId, error: String(error) },
      );
    }

    // 6. Update order tracking (chỉ sau khi email queue thành công)
    const now = DateTimeUtils.now();
    const newReminderCount = previousReminderCount + 1;

    await this.orderRepository.updateOrder(
      orderId,
      {
        remindersSent: newReminderCount,
        lastReminderAt: DateTimeUtils.toDate(now),
      },
      context.workspaceId,
    );

    this.logger.log(
      `Payment reminder sent for order ${orderId}, count: ${newReminderCount}`,
    );

    // 7. Return result
    return {
      orderId,
      orderCode: validOrder.orderCode ?? undefined,
      customerEmail: validOrder.mktCustomer?.email ?? undefined,
      sentAt: DateTimeUtils.toISO(now),
      reminderCount: newReminderCount,
      previousReminderCount,
    };
  }

  /**
   * Process single order trong bulk operation
   */
  private async processSingleOrderForBulk(
    order: MktOrderWorkspaceEntity,
    options: SendBulkReminderOptions,
    context: PaymentReminderContext,
    dryRun: boolean,
  ): Promise<BulkReminderResultItem> {
    const orderId = order.id;

    // Validate order
    const validation = this.validateOrderForReminder(order, orderId, false);

    if (!validation.valid) {
      return {
        orderId,
        orderCode: order.orderCode ?? undefined,
        sent: false,
        skipped: true,
        skipReason: validation.errorCode ?? SKIP_REASON.VALIDATION_FAILED,
      };
    }

    // Nếu là dry run, skip nhưng đánh dấu là valid
    if (dryRun) {
      return {
        orderId,
        orderCode: order.orderCode ?? undefined,
        sent: false,
        skipped: true,
        skipReason: SKIP_REASON.DRY_RUN,
      };
    }

    // Thực hiện gửi reminder
    try {
      const result = await this.doSendReminder(
        {
          orderId,
          templateKey: options.templateKey,
        },
        context,
      );

      return {
        orderId,
        orderCode: result.orderCode,
        sent: true,
        skipped: false,
        sentAt: result.sentAt,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to send reminder for order ${orderId} in bulk: ${error}`,
      );

      return {
        orderId,
        orderCode: order.orderCode ?? undefined,
        sent: false,
        skipped: true,
        skipReason:
          error instanceof GraphQLError
            ? ((error.extensions?.code as string) ?? SKIP_REASON.UNKNOWN_ERROR)
            : SKIP_REASON.UNKNOWN_ERROR,
      };
    }
  }

  // ============================================
  // PRIVATE METHODS - Data Fetching
  // ============================================

  /**
   * Fetch orders by IDs với validation
   */
  private async fetchOrdersByIds(
    orderIds: string[],
    workspaceId: string,
  ): Promise<MktOrderWorkspaceEntity[]> {
    const orders: MktOrderWorkspaceEntity[] = [];

    for (const orderId of orderIds) {
      const order = await this.orderRepository.findByIdWithOptions(
        orderId,
        { relations: { mktCustomer: true, mktPayments: true } },
        workspaceId,
      );

      if (order) {
        orders.push(order);
      }
    }

    return orders;
  }

  /**
   * Fetch orders by filter
   */
  private async fetchOrdersByFilter(
    filter: PaymentReminderFilterOptions,
    workspaceId: string,
  ): Promise<MktOrderWorkspaceEntity[]> {
    const { orders } = await this.queryOrdersNeedingReminder(
      filter,
      PAYMENT_REMINDER_CONFIG.BULK_LIMIT,
      0,
      workspaceId,
    );

    // Load relations for each order
    const ordersWithRelations: MktOrderWorkspaceEntity[] = [];

    for (const order of orders) {
      const fullOrder = await this.orderRepository.findByIdWithOptions(
        order.id,
        { relations: { mktCustomer: true, mktPayments: true } },
        workspaceId,
      );

      if (fullOrder) {
        ordersWithRelations.push(fullOrder);
      }
    }

    return ordersWithRelations;
  }

  /**
   * Query orders cần nhắc nhở với filter và pagination
   */
  private async queryOrdersNeedingReminder(
    filter: PaymentReminderFilterOptions | undefined,
    limit: number,
    offset: number,
    workspaceId: string,
  ): Promise<{ orders: MktOrderWorkspaceEntity[]; totalCount: number }> {
    // TODO: Move this query to MktOrderRepository.findOrdersNeedingReminder()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repository = await (this.orderRepository as any).getRepository(
      workspaceId,
    );

    // Build query
    const qb = repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.mktCustomer', 'customer')
      .where('order.deletedAt IS NULL');

    // Status filter (default: PROCESSING)
    const status = filter?.status ?? ORDER_STATUS.PROCESSING;

    qb.andWhere('order.status = :status', { status });

    // Payment status filter (default: PENDING hoặc PARTIAL)
    if (filter?.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: filter.paymentStatus,
      });
    } else {
      qb.andWhere('order.paymentStatus IN (:...paymentStatuses)', {
        paymentStatuses: [...PAYMENT_REMINDER_CONFIG.VALID_PAYMENT_STATUSES],
      });
    }

    // Exclude confirmed orders
    if (filter?.excludeConfirmed !== false) {
      qb.andWhere(
        '(order.salePaymentConfirmed IS NULL OR order.salePaymentConfirmed = false)',
      );
      qb.andWhere(
        '(order.accountingConfirmed IS NULL OR order.accountingConfirmed = false)',
      );
    }

    // Days past deadline filter
    if (
      filter?.daysPastDeadline !== undefined &&
      filter.daysPastDeadline >= 0
    ) {
      const deadlineThreshold = DateTimeUtils.subtract(DateTimeUtils.now(), {
        days: filter.daysPastDeadline,
      });

      qb.andWhere('order.paymentDeadline <= :deadlineThreshold', {
        deadlineThreshold: DateTimeUtils.toDate(deadlineThreshold),
      });
    }

    // Max reminders sent filter
    const maxRemindersSent =
      filter?.maxRemindersSent ?? PAYMENT_REMINDER_CONFIG.MAX_REMINDERS - 1;

    qb.andWhere(
      '(order.remindersSent IS NULL OR order.remindersSent <= :maxRemindersSent)',
      { maxRemindersSent },
    );

    // Get total count
    const totalCount = await qb.getCount();

    // Apply pagination and get results
    qb.orderBy('order.paymentDeadline', 'ASC')
      .addOrderBy('order.createdAt', 'ASC')
      .skip(offset)
      .take(limit);

    const orders = await qb.getMany();

    return { orders, totalCount };
  }

  // ============================================
  // PRIVATE METHODS - Email Building
  // ============================================

  /**
   * Build email data từ order
   */
  private buildReminderEmailData(
    order: MktOrderWorkspaceEntity,
    customNote?: string,
  ): ReminderEmailData {
    const now = DateTimeUtils.now();
    const deadline = order.paymentDeadline
      ? DateTimeUtils.fromDate(order.paymentDeadline)
      : null;

    // Tính số ngày quá hạn
    let daysOverdue = 0;

    if (deadline) {
      daysOverdue = Math.max(0, DateTimeUtils.diffInDays(now, deadline));
    }

    // Format currency
    const totalAmount = this.formatCurrency(order.totalAmount ?? 0);
    const paidAmount = this.formatCurrency(order.paidAmount ?? 0);
    const remainingAmount = this.formatCurrency(order.remainingAmount ?? 0);

    // Format deadline
    const paymentDeadline = deadline
      ? DateTimeUtils.format(deadline, 'dd/MM/yyyy')
      : 'N/A';

    return {
      customer_name: order.mktCustomer?.name ?? 'Quý khách',
      order_code: order.orderCode ?? '',
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      payment_deadline: paymentDeadline,
      days_overdue: daysOverdue,
      payment_url: order.mktPayments?.[0]?.paymentPageUrl ?? undefined,
      qr_code_url: order.mktPayments?.[0]?.qrCodeUrl ?? undefined,
      company_name: this.twentyConfigService.get('EMAIL_FROM_NAME') ?? 'MKT',
      support_email:
        this.twentyConfigService.get('EMAIL_FROM_ADDRESS') ?? 'support@mkt.vn',
      reminder_count: (order.remindersSent ?? 0) + 1,
      custom_note: customNote,
    };
  }

  /**
   * Queue reminder email
   */
  private async queueReminderEmail(
    order: MktOrderWorkspaceEntity,
    template: { name?: string | null; content?: string | null },
    emailData: ReminderEmailData,
  ): Promise<void> {
    const customerEmail = order.mktCustomer?.email;

    if (!customerEmail) {
      throw new Error('Customer email not found');
    }

    // Replace placeholders trong template
    const subject = this.replaceTemplatePlaceholders(
      template.name ?? 'Nhắc nhở thanh toán đơn hàng {{order_code}}',
      emailData,
    );
    const html = this.replaceTemplatePlaceholders(
      template.content ?? '',
      emailData,
    );

    // Queue email
    await this.emailService.send({
      from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
      to: customerEmail,
      subject,
      html,
    });

    this.logger.log(
      `Queued payment reminder email for order ${order.id} to ${customerEmail}`,
    );
  }

  /**
   * Replace template placeholders
   */
  private replaceTemplatePlaceholders(
    template: string,
    data: ReminderEmailData,
  ): string {
    let result = template;

    // Xử lý conditionals
    result = result.replace(
      /{{#if\s+payment_url\s*}}([\s\S]*?){{\/if\s*}}/g,
      (_match, content) => (data.payment_url ? content : ''),
    );
    result = result.replace(
      /{{#if\s+qr_code_url\s*}}([\s\S]*?){{\/if\s*}}/g,
      (_match, content) => (data.qr_code_url ? content : ''),
    );
    result = result.replace(
      /{{#if\s+custom_note\s*}}([\s\S]*?){{\/if\s*}}/g,
      (_match, content) => (data.custom_note ? content : ''),
    );

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      const stringValue = String(value ?? '');
      const pattern1 = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const pattern2 = new RegExp(`{\\s*${key}\\s*}`, 'g');

      result = result
        .replace(pattern1, stringValue)
        .replace(pattern2, stringValue);
    }

    return result;
  }

  // ============================================
  // PRIVATE METHODS - Mapping
  // ============================================

  /**
   * Map order entity to OrderNeedingReminder output
   */
  private mapOrderToNeedingReminder(
    order: MktOrderWorkspaceEntity,
  ): OrderNeedingReminder {
    const now = DateTimeUtils.now();
    const deadline = order.paymentDeadline
      ? DateTimeUtils.fromDate(order.paymentDeadline)
      : null;

    // Tính số ngày quá hạn
    let daysPastDeadline = 0;

    if (deadline) {
      daysPastDeadline = Math.max(0, DateTimeUtils.diffInDays(now, deadline));
    }

    // Kiểm tra có thể gửi reminder không
    const validation = this.validateOrderForReminder(order, order.id, false);

    return {
      id: order.id,
      orderCode: order.orderCode ?? '',
      customerName: order.mktCustomer?.name ?? 'N/A',
      customerEmail: order.mktCustomer?.email ?? undefined,
      customerPhone: order.mktCustomer?.phone ?? undefined,
      totalAmount: order.totalAmount ?? 0,
      paidAmount: order.paidAmount ?? 0,
      remainingAmount: order.remainingAmount ?? 0,
      paymentDeadline: deadline ? DateTimeUtils.toISO(deadline) : undefined,
      remindersSent: order.remindersSent ?? 0,
      lastReminderAt: order.lastReminderAt
        ? DateTimeUtils.toISO(DateTimeUtils.fromDate(order.lastReminderAt))
        : undefined,
      daysPastDeadline,
      status: order.status as ORDER_STATUS,
      paymentStatus: order.paymentStatus as ORDER_PAYMENT_STATUS,
      canSendReminder: validation.valid,
    };
  }

  // ============================================
  // PRIVATE METHODS - Utilities
  // ============================================

  /**
   * Sanitize note input để tránh XSS
   * - Strip tất cả HTML tags
   * - Escape HTML entities
   * - Trim whitespace
   */
  private sanitizeNote(note: string): string {
    // Strip HTML tags
    const stripped = note.replace(HTML_TAG_REGEX, '');

    // Escape HTML entities và trim
    return escapeHtml(stripped).trim();
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

  /**
   * Tạo GraphQL error với extension code
   */
  private createGraphQLError(
    errorCode: PaymentReminderErrorCode,
    context?: Record<string, unknown>,
  ): GraphQLError {
    const message = GET_PAYMENT_REMINDER_ERROR_MESSAGE(errorCode);

    return new GraphQLError(message, {
      extensions: {
        code: errorCode,
        ...context,
      },
    });
  }
}
