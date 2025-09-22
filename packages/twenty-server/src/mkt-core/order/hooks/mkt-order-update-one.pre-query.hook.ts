import { Inject, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { getQueueToken } from 'src/engine/core-modules/message-queue/utils/get-queue-token.util';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { SInvoiceIntegrationService } from 'src/mkt-core/invoice/integration/s-invoice.integration.service';
import { SInvoiceIntegrationJobData } from 'src/mkt-core/invoice/jobs/s-invoice-integration.job';
import { LicenseGenerationJobData } from 'src/mkt-core/license/jobs/license-generation.job';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderConfirmService } from 'src/mkt-core/order/services/order.confirm.service';
import { OrderPayloadService } from 'src/mkt-core/order/services/order.payload.service';

@WorkspaceQueryHook('mktOrder.updateOne')
export class MktOrderUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktOrderUpdateOnePreQueryHook.name);
  private readonly orderEnv: string =
    process.env.ORDER_OPTIMISTIC_LOCKING_ENABLED || 'true';

  constructor(
    @Inject(getQueueToken(MessageQueue.billingQueue))
    private readonly messageQueueService: MessageQueueService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly orderActionService: OrderActionService,
    private readonly orderPayloadService: OrderPayloadService,
    private readonly orderConfirmService: OrderConfirmService,
    private readonly sInvoiceIntegrationService: SInvoiceIntegrationService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktOrderWorkspaceEntity>> {
    const input = payload?.data;
    const orderId = payload?.id;
    const workspaceId =
      this.scopedWorkspaceContextFactory.create().workspaceId || '';

    if (!orderId || !workspaceId) return payload;
    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
        workspaceId,
        'mktOrder',
        { shouldBypassPermissionChecks: true },
      );
    const currentOrder = await this.getOrder(orderId, orderRepository);

    await this.validateOrder(orderId, workspaceId);
    const action = (await this.orderActionService.getAction(
      payload,
      currentOrder,
    )) as ORDER_ACTION | null;

    this.logger.log(`action: ${action}`);
    if (action === null) {
      this.logger.log(`current order status ${currentOrder?.status}`);
      this.logger.log(`input status ${input?.status}`);
      this.logger.log(`input trialLicense ${input?.trialLicense}`);
      this.logger.log(`input licenseStatus ${input?.licenseStatus}`);
      this.logger.log(`input sInvoiceStatus ${input?.sInvoiceStatus}`);
      this.logger.log(
        `current order trialLicense ${currentOrder?.trialLicense}`,
      );
      this.logger.log(
        `current order licenseStatus ${currentOrder?.licenseStatus}`,
      );
      this.logger.log(
        `current order sInvoiceStatus ${currentOrder?.sInvoiceStatus}`,
      );
    }
    // 1 → Draft → Confirmed
    // await this.confirmOrder(
    //   payload,
    //   orderId,
    //   workspaceId,
    //   currentOrder,
    //   action,
    // );
    // // 2 → Confirmed → Trial (TRIAL)
    // await this.trialOrder(payload, orderId, workspaceId, currentOrder, action);
    // // 3 → Confirmed → Paid (PAID)
    // await this.paidOrder(payload, orderId, workspaceId, currentOrder, action);
    // 4 → Processing (PROCESSING)
    // 5 → Completed (COMPLETED)
    // 6 → Locked (LOCKED)
    // 7 → Cancelled (CANCELLED)

    // await this.licenseIntegration(
    //   orderId,
    //   workspaceId,
    //   input,
    //   currentOrder,
    //   action,
    // );
    // await this.sInvoiceIntegration(
    //   orderId,
    //   workspaceId,
    //   input,
    //   currentOrder,
    //   action,
    // );

    //this.logger.log(`Validating updatedAt for order ${orderId}`);
    //await this.validateUpdatedAtOrThrow(input, currentOrder);
    if (
      action === ORDER_ACTION.SINVOICE &&
      currentOrder?.trialLicense === false
    ) {
      await this.sInvoiceIntegrationService.syncSInvoice(orderId);
    }

    // Validate action - throw error if null (invalid state transition)
    if (!action) {
      const currentStatus = currentOrder?.status || 'null';
      const targetStatus = input?.status || 'null';

      throw new Error(
        `Invalid state transition: Cannot transition from ${currentStatus} to ${targetStatus}. This transition is not allowed by business rules.`,
      );
    }

    const newPayload = await this.orderPayloadService.getNewPayload(
      payload,
      action,
      currentOrder,
    );

    return {
      ...newPayload,
      data: {
        ...(newPayload.data as MktOrderWorkspaceEntity),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  private async sInvoiceIntegration(
    orderId: string,
    workspaceId: string,
    input: Partial<MktOrderWorkspaceEntity>,
    currentOrder: MktOrderWorkspaceEntity | null,
    action: ORDER_ACTION | null,
  ): Promise<void> {
    if (action === ORDER_ACTION.SINVOICE) {
      this.logger.log(
        `Adding S-Invoice integration job to queue for order ${orderId}`,
      );
      const jobData: SInvoiceIntegrationJobData = {
        orderId,
        workspaceId,
      };

      try {
        await this.messageQueueService.add('SInvoiceIntegrationJob', jobData);
        this.logger.log(
          `[S-INVOICE JOB] Successfully added S-Invoice integration job to queue for order: ${orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `[S-INVOICE JOB] Failed to add S-Invoice integration job to queue for order: ${orderId}`,
          error,
        );
      }
    }
  }

  private async licenseIntegration(
    orderId: string,
    workspaceId: string,
    input: Partial<MktOrderWorkspaceEntity>,
    currentOrder: MktOrderWorkspaceEntity | null,
    action: ORDER_ACTION | null,
  ): Promise<void> {
    if (action === ORDER_ACTION.LICENSE) {
      this.logger.log(
        `Adding License integration job to queue for order ${orderId}`,
      );
      const jobData: LicenseGenerationJobData = {
        orderId,
        workspaceId,
      };

      try {
        await this.messageQueueService.add('LicenseGenerationJob', jobData);
        this.logger.log(
          `[LICENSE JOB] Successfully added License generation job to queue for order: ${orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `[LICENSE JOB] Failed to add License generation job to queue for order: ${orderId}`,
          error,
        );
      }
    }
  }

  /**
   * Validate optimistic locking using updatedAt from input vs DB (and cookie if present)
   * - Throws error on mismatch
   * - Refreshes input.updatedAt to now after successful validation
   */
  private async validateUpdatedAtOrThrow(
    input: Partial<MktOrderWorkspaceEntity>,
    currentOrder: MktOrderWorkspaceEntity | null,
  ): Promise<void> {
    if (!currentOrder) {
      throw new Error(`Order not found`);
    }
    if (this.orderEnv !== 'true') {
      return Promise.resolve();
    }
    if (!input?.updatedAt || !currentOrder?.updatedAt) {
      throw new Error(
        `updatedAt is required when optimistic locking is enabled`,
      );
    }

    const inputUpdatedAt = new Date(input.updatedAt);
    const currentUpdatedAt = new Date(currentOrder.updatedAt);

    if (inputUpdatedAt.getTime() !== currentUpdatedAt.getTime()) {
      this.logger.warn(
        `Order ${currentOrder.id} update rejected: updatedAt mismatch. Input: ${inputUpdatedAt.toISOString()}, Current: ${currentUpdatedAt.toISOString()}`,
      );
      throw new Error(
        `Order has been modified by another user. Please refresh and try again.`,
      );
    }

    return Promise.resolve();
  }

  private async updateOrderInformation(
    workspaceId: string,
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    currentOrder: MktOrderWorkspaceEntity | null,
  ): Promise<void> {
    const input = payload?.data;
    const incomStatus = input?.status;

    if (this.orderEnv === 'true' && !!currentOrder?.status) {
      throw new Error(`Order cannot be updated because order is locked`);
    }

    if (!incomStatus) return Promise.resolve();

    if (!currentOrder?.orderCode && !payload.data?.orderCode) {
      const generatedOrderCode =
        await this.orderConfirmService.generateOrderCode(workspaceId);

      if (generatedOrderCode) {
        payload.data = {
          ...payload.data,
          orderCode: generatedOrderCode,
        };
      }
    }

    if (!input?.name) {
      const generatedOrderName =
        await this.orderConfirmService.generateOrderName(currentOrder);

      if (generatedOrderName) {
        payload.data = {
          ...payload.data,
          name: generatedOrderName,
        };
      }
    }

    if (
      currentOrder?.discount === undefined &&
      payload.data?.discount === undefined
    ) {
      payload.data = {
        ...payload.data,
        discount: 0,
      };
    }

    const calculatedValues =
      await this.orderConfirmService.calculateOrderValues(currentOrder);

    if (calculatedValues) {
      payload.data = {
        ...payload.data,
        subtotal: calculatedValues.subtotal,
        tax: calculatedValues.tax,
        discount: calculatedValues.discount,
        totalAmount: calculatedValues.totalAmount,
      };
    }
  }

  private async validateOrder(
    orderId: string,
    workspaceId: string | null,
  ): Promise<void> {
    if (!orderId || !workspaceId) {
      throw new Error('Order ID and workspace ID are required');
    }
  }

  private async getOrder(
    orderId: string,
    orderRepository: WorkspaceRepository<MktOrderWorkspaceEntity>,
  ): Promise<MktOrderWorkspaceEntity | null> {
    const currentOrder = await orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems'],
    });

    return currentOrder;
  }

  private async confirmOrder(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    orderId: string,
    workspaceId: string,
    currentOrder: MktOrderWorkspaceEntity | null,
    action: ORDER_ACTION | null,
  ): Promise<void> {
    if (
      action === ORDER_ACTION.CONFIRMED ||
      action === ORDER_ACTION.TRIAL_TO_CONFIRMED
    ) {
      await this.updateOrderInformation(workspaceId, payload, currentOrder);
    }
  }

  private async trialOrder(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    orderId: string,
    workspaceId: string,
    currentOrder: MktOrderWorkspaceEntity | null,
    action: ORDER_ACTION | null,
  ): Promise<void> {
    const _input = payload.data;

    if (action !== ORDER_ACTION.TRIAL) {
      return;
    }
    payload.data = {
      ...payload.data,
      ...(payload.data?.status === ORDER_STATUS.TRIAL && {
        trialLicense: true,
      }),
    };
  }

  private async paidOrder(
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
    orderId: string,
    workspaceId: string,
    currentOrder: MktOrderWorkspaceEntity | null,
    action: ORDER_ACTION | null,
  ): Promise<void> {
    const _input = payload.data;

    if (action !== ORDER_ACTION.PAID) {
      return;
    }
  }
}
