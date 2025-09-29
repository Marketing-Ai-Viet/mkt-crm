import { Injectable, Logger } from '@nestjs/common';

import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { callFireBaseType } from 'src/mkt-core/payment/constants/payment.type';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';

@Injectable()
export class MktPaymentService {
  private readonly logger = new Logger(MktPaymentService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly recordPositionService: RecordPositionService,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly mktRepo: MktRepositoryService,
    private readonly fireBaseIntegration: FireBaseIntegrationService,
  ) {}

  async createPaymentFromOrder(
    paymentData: {
      paymentName: string;
      totalAmount: number;
      currency: string;
      generatedOrderCode: string | null;
      orderId: string;
    },
    paymentMethodsMeta: Metadata['paymentMethods'] | null,
  ): Promise<callFireBaseType | void> {
    const paymentRepository = await this.getPaymentRepository();
    const paymentMethodRepository = await this.getPaymentMethodRepository();
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    const result: callFireBaseType = {
      orderCode: paymentData.generatedOrderCode,
      QRCodeUrl: null,
    };

    if (!workspaceId) {
      this.logger.warn('Workspace ID is not available in the current context.');

      return result;
    }

    if (Array.isArray(paymentMethodsMeta) && paymentMethodsMeta.length > 0) {
      const pmIds = paymentMethodsMeta
        .map((p) => p.mktPaymentMethodId)
        .filter(Boolean);

      if (pmIds.length > 0) {
        const _methods = await paymentMethodRepository.find({
          where: pmIds.map((id) => ({ id })) as unknown as { id: string },
        });
        const pmById = new Map(_methods.map((m) => [m.id, m]));

        const paymentsFromMeta = await Promise.all(
          paymentMethodsMeta.map(async (p) => {
            const pm: MktPaymentMethodWorkspaceEntity | undefined = pmById.get(
              p.mktPaymentMethodId,
            );

            if (!pm) return null;
            // generate position
            const position =
              await this.recordPositionService.buildRecordPosition({
                value: 'last',
                objectMetadata: {
                  isCustom: false,
                  nameSingular: 'mktPayment',
                },
                workspaceId,
              });
            const qrCodeUrl =
              await this.mktPaymentPrepareService.generateSepayQrCodeUrl(
                pm,
                paymentData.totalAmount || 0,
                paymentData.generatedOrderCode,
              );

            if (!result.QRCodeUrl) result.QRCodeUrl = qrCodeUrl;

            return paymentRepository.create({
              mktOrderId: paymentData.orderId,
              mktPaymentMethodId: p.mktPaymentMethodId,
              name: `${pm?.name} - ${paymentData.paymentName}`,
              amount: paymentData.totalAmount || 0,
              currency: paymentData.currency || 'VND',
              qrCodeUrl: qrCodeUrl || undefined,
              position,
            } as Partial<MktPaymentWorkspaceEntity>);
          }),
        );

        await paymentRepository.save(
          paymentsFromMeta as MktPaymentWorkspaceEntity[],
        );
      }
    }

    return result;
  }

  async findOneByOrderCode(workspaceId: string, orderCode: string) {
    const orderRepo =
      await this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);

    return await orderRepo.findOne({
      where: { orderCode: orderCode },
    });
  }

  async findPaymentsByOrderId(workspaceId: string, orderId: string) {
    const paymentRepo =
      await this.mktRepo.getPaymentRepositoryByWorkspaceId(workspaceId);

    return await paymentRepo.find({
      where: { mktOrderId: orderId },
    });
  }

  async updatePaymentById(
    workspaceId: string,
    paymentId: string,
    updateData: Partial<MktPaymentWorkspaceEntity>,
  ) {
    const paymentRepo =
      await this.mktRepo.getPaymentRepositoryByWorkspaceId(workspaceId);

    return await paymentRepo.update(paymentId, updateData);
  }

  async getPaymentRepository() {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID is not available in the current context.');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>(
      workspaceId,
      'mktPayment',
      { shouldBypassPermissionChecks: true },
    );
  }

  async getPaymentMethodRepository() {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID is not available in the current context.');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentMethodWorkspaceEntity>(
      workspaceId,
      'mktPaymentMethod',
      { shouldBypassPermissionChecks: true },
    );
  }
}
