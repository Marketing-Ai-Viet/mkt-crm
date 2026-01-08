import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  DelayedJobService,
  MKT_DELAYED_JOB_QUEUES,
} from 'src/mkt-core/infrastructure/delayed-job';
import { OrderConfig } from 'src/mkt-core/order/config/order-config.types';
import { orderConfig } from 'src/mkt-core/order/config/order.config';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/order/types/order-event.types';
import {
  OrderOverdueCheckResult,
  OrderOverduePayload,
} from 'src/mkt-core/order/types/order-overdue.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * OrderOverdueWorkerService
 *
 * Worker service xử lý delayed jobs để mark orders as OVERDUE.
 * Được register khi module khởi động và xử lý jobs từ BullMQ queue.
 *
 * Xử lý idempotent:
 * - Conditional update: chỉ update nếu status vẫn là PENDING_PAYMENT
 * - Nếu order đã được thanh toán/huỷ, job sẽ skip
 */
@Injectable()
export class OrderOverdueWorkerService implements OnModuleInit {
  private readonly logger = new Logger(OrderOverdueWorkerService.name);

  constructor(
    private readonly delayedJobService: DelayedJobService,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(orderConfig.KEY)
    private readonly config: OrderConfig,
  ) {}

  /**
   * Register worker khi module init
   */
  onModuleInit(): void {
    this.delayedJobService.registerWorker<OrderOverduePayload>(
      {
        queueName: MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE,
        concurrency: this.config.overdue.workerConcurrency,
      },
      async ({ jobId, payload, attemptNumber }) => {
        await this.processOverdueCheck(jobId, payload, attemptNumber);
      },
    );

    this.logger.log({
      message: 'Order overdue worker registered',
      queueName: MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE,
      concurrency: this.config.overdue.workerConcurrency,
    });
  }

  /**
   * Process overdue check cho một order
   *
   * Logic:
   * 1. Conditional update: WHERE status = PENDING_PAYMENT
   * 2. Nếu affected = 0: order đã được thanh toán/huỷ → skip
   * 3. Nếu affected = 1: update thành công → emit event
   */
  private async processOverdueCheck(
    jobId: string,
    payload: OrderOverduePayload,
    attemptNumber: number,
  ): Promise<OrderOverdueCheckResult> {
    const { orderId, workspaceId, orderCode } = payload;
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    this.logger.log({
      message: 'Processing overdue check',
      orderId,
      orderCode,
      workspaceId,
      jobId,
      attemptNumber,
    });

    try {
      // Conditional update: chỉ update nếu status vẫn là PENDING_PAYMENT
      const updateResult = await this.mktOrderRepository.updateWhere(
        workspaceId,
        { id: orderId, status: ORDER_STATUS.PENDING_PAYMENT },
        {
          status: ORDER_STATUS.OVERDUE,
          updatedAt: nowISO,
        },
      );

      if (updateResult.affected === 0) {
        // Order đã được thanh toán, huỷ, hoặc xử lý bởi process khác
        const order = await this.mktOrderRepository.findById(
          workspaceId,
          orderId,
        );

        const result: OrderOverdueCheckResult = {
          orderId,
          status: order ? 'skipped' : 'not_found',
          previousStatus: order?.status ?? undefined,
          message: order
            ? `Order status is ${order.status}, skipping overdue update`
            : 'Order not found',
        };

        this.logger.log({
          ...result,
          orderCode,
          workspaceId,
        });

        return result;
      }

      // Update thành công → Emit event cho downstream processing
      this.emitOverdueEvent(workspaceId, orderId, orderCode, nowISO);

      const result: OrderOverdueCheckResult = {
        orderId,
        status: 'updated',
        previousStatus: ORDER_STATUS.PENDING_PAYMENT,
        message: 'Order updated to OVERDUE status',
      };

      this.logger.log({
        message: 'Order marked as OVERDUE',
        orderId,
        orderCode,
        workspaceId,
      });

      return result;
    } catch (error) {
      this.logger.error({
        message: 'Failed to process overdue check',
        orderId,
        orderCode,
        workspaceId,
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptNumber,
      });

      // Re-throw để BullMQ retry với exponential backoff
      throw error;
    }
  }

  /**
   * Emit ORDER_OVERDUE event cho downstream processing
   * (history logging, notifications, license locking, etc.)
   */
  private emitOverdueEvent(
    workspaceId: string,
    orderId: string,
    orderCode: string | undefined,
    timestamp: string,
  ): void {
    this.eventEmitter.emit(MKT_ORDER_EVENT_TYPES.ORDER_OVERDUE, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_OVERDUE,
      workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_OVERDUE,
          orderId,
          orderCode,
          workspaceId,
          orderData: {
            id: orderId,
            orderCode,
            status: ORDER_STATUS.OVERDUE,
            previousStatus: ORDER_STATUS.PENDING_PAYMENT,
          },
          timestamp,
        },
      ],
    });

    this.logger.debug({
      message: 'Emitted ORDER_OVERDUE event',
      orderId,
      orderCode,
      workspaceId,
    });
  }
}
