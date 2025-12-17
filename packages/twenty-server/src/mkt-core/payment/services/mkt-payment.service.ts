import { Injectable, Logger } from '@nestjs/common';

import {
  ActorMetadata,
  FieldActorSource,
} from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktOrderCommonConfirmService } from 'src/mkt-core/common/service/mkt.common-order.confirm.service';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { ORDER_METADATA } from 'src/mkt-core/order/constants/order-status.constants';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import {
  RequestSepayJWT,
  callFireBaseType,
} from 'src/mkt-core/payment/constants/payment.type';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktPaymentService {
  private readonly logger = new Logger(MktPaymentService.name);
  public discount = 0;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly mktCommonOrderConfirmService: MktOrderCommonConfirmService,
    public mktRepo: MktRepositoryService,
  ) {}

  async createPaymentFromOrder(
    paymentData: {
      paymentName: string;
      totalAmount: number;
      currency: string;
      generatedOrderCode: string | null;
      orderId: string;
      workspaceId: string | null;
      createdBy?: {
        source: string | null;
        workspaceMemberId: string | null;
        name: string | null;
      };
      discount?: number | null;
    },
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
  ): Promise<callFireBaseType | void> {
    const paymentRepository = await this.getPaymentRepository();
    const paymentMethodRepository = await this.getPaymentMethodRepository();

    const result: callFireBaseType = {
      orderCode: paymentData.generatedOrderCode,
      QRCodeUrl: null,
    };

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

            let totalAmount = paymentData.totalAmount;
            let name = `Thanh toán - ${pm?.name} - ${paymentData.paymentName}`;

            if (p.name === 'discount' && paymentData.discount) {
              totalAmount = paymentData.discount;
              name = `Thanh toán trước - ${pm?.name} - ${paymentData.paymentName}`;
            }
            if (!pm) return null;
            // generate position
            const { qrCodeUrl, expiredAt } =
              await this.mktCommonOrderConfirmService.generateSepayQrCodeUrl(
                pm,
                totalAmount || 0,
                paymentData.generatedOrderCode,
              );

            if (!result.QRCodeUrl) result.QRCodeUrl = qrCodeUrl;

            return paymentRepository.create({
              mktOrderId: paymentData.orderId,
              mktPaymentMethodId: p.mktPaymentMethodId,
              name,
              amount: totalAmount || 0,
              currency: paymentData.currency || 'VND',
              qrCodeUrl: qrCodeUrl || undefined,
              duration: p.duration || null,
              expiredAt: expiredAt || null,
              paymentPageUrl: `${process.env.SERVER_URL}/payment/${paymentData.generatedOrderCode}`,
              mktTemplateId: MKT_TEMPLATE.SEPAY,
            } as Partial<MktPaymentWorkspaceEntity>);
          }),
        );

        const newPayments = paymentsFromMeta.map((item) => {
          if (!paymentData.createdBy) return item;

          return { ...item, createdBy: paymentData.createdBy };
        });

        await paymentRepository.save(
          newPayments as MktPaymentWorkspaceEntity[],
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
    authContext: RequestSepayJWT,
  ) {
    const paymentRepo =
      await this.mktRepo.getPaymentRepositoryByWorkspaceId(workspaceId);

    const workspaceMemberRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
      );

    const workspaceMember = await workspaceMemberRepository.findOneOrFail({
      where: { id: authContext.workspaceMemberId },
    });

    const createdBy: ActorMetadata = {
      source: FieldActorSource.MANUAL,
      workspaceMemberId: authContext.workspaceMemberId || null,
      name: authContext.workspaceMemberId
        ? `${workspaceMember.name.firstName} ${workspaceMember.name.lastName}`
        : 'system',
      context: {},
    };

    return await paymentRepo.update(paymentId, { ...updateData, createdBy });
  }

  async getPaymentRepository() {
    return this.mktRepo.getPaymentRepository();
  }

  async getPaymentMethodRepository() {
    return this.mktRepo.getPaymentMethodRepository();
  }
}
