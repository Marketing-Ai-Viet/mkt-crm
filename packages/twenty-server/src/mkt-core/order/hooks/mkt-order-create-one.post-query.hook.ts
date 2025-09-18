import {Injectable,Logger} from '@nestjs/common';

import {WorkspacePostQueryHookInstance} from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import {WorkspaceQueryHook} from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import {WorkspaceQueryHookType} from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import {AuthContext} from 'src/engine/core-modules/auth/types/auth-context.type';
import {RecordPositionService} from 'src/engine/core-modules/record-position/services/record-position.service';
import {ScopedWorkspaceContextFactory} from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import {TwentyORMGlobalManager} from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {MktLicenseService} from 'src/mkt-core/license/mkt-license.service';
import {MktLicenseWorkspaceEntity} from 'src/mkt-core/license/mkt-license.workspace-entity';
import {ORDER_STATUS} from 'src/mkt-core/order/constants/order-status.constants';
import {MktOrderItemWorkspaceEntity} from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {MktOrderWorkspaceEntity} from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  CalculateOrderResult,
  OrderConfirmService,
} from 'src/mkt-core/order/services/order.confirm.service';
import {MktPaymentMethodWorkspaceEntity} from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import {MktPaymentWorkspaceEntity} from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import {MktPaymentPrepareService} from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import {MktVariantWorkspaceEntity} from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';

export type Metadata = {
  variants?: Array<{ mktVariantId: string; quantity?: number }>;
  paymentMethods?: Array<{ mktPaymentMethodId: string; name?: string }>;
  customer?: { mktCustomerId: string; name?: string  };
};

export type Created = MktOrderWorkspaceEntity & {
  id: string;
  metadata?: Metadata;
};

@Injectable()
@WorkspaceQueryHook({
  key: 'mktOrder.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktOrderCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(MktOrderCreateOnePostQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly recordPositionService: RecordPositionService,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly orderConfirmService: OrderConfirmService,
    private readonly mktLicenseService: MktLicenseService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktOrderWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;
    if (!workspaceId) return;
    const created: Created = payload?.[0];
    if (!created) return;
    try {
      let metadata: Metadata = created?.metadata;

      // Handle case where metadata might be stored as JSON string
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (error) {
          this.logger.error('Failed to parse metadata JSON:', error);

          return;
        }
      }

      const variantsMeta = metadata?.variants;
      const customerMeta = metadata?.customer;
      const paymentMethodsMeta = metadata?.paymentMethods;

      if (!variantsMeta) throw new Error('no variants provided for order creation');
      if (!customerMeta) throw new Error('No customer provided for order creation');
      if (!paymentMethodsMeta) throw new Error('No payment methods provided for order creation');

      // repositories
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
          workspaceId,
          'mktOrder',
          { shouldBypassPermissionChecks: true },
        );
      const orderItemRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderItemWorkspaceEntity>(
          workspaceId,
          'mktOrderItem',
          { shouldBypassPermissionChecks: true },
        );
      const paymentRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>(
          workspaceId,
          'mktPayment',
          { shouldBypassPermissionChecks: true },
        );
      const variantRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktVariantWorkspaceEntity>(
          workspaceId,
          'mktVariant',
          { shouldBypassPermissionChecks: true },
        );
      const paymentMethodRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentMethodWorkspaceEntity>(
          workspaceId,
          'mktPaymentMethod',
          { shouldBypassPermissionChecks: true },
        );

      // 1) Create Order Items from metadata.variants

      if (Array.isArray(variantsMeta) && variantsMeta.length > 0) {
        const ids = variantsMeta.map((v) => v.mktVariantId).filter(Boolean);

        if (ids.length > 0) {
          const variants = await variantRepository.find({
            where: ids.map((id) => ({ id })) as unknown as { id: string },
          });

          const variantById = new Map(variants.map((v) => [v.id, v]));

          const itemsFromVariants = await Promise.all(
            variantsMeta.map(async (v, _index) => {
              const variant = variantById.get(v.mktVariantId);

              if (!variant) return null;

              const unitPrice = variant?.price ?? 0;
              const quantity = v.quantity ?? 1;
              const totalPrice = unitPrice * quantity;
              const position =
                await this.recordPositionService.buildRecordPosition({
                  value: 'last',
                  objectMetadata: {
                    isCustom: false,
                    nameSingular: 'mktOrderItem',
                  },
                  workspaceId,
                });

              return orderItemRepository.create({
                mktOrderId: created.id,
                mktVariantId: variant.id,
                name: variant.name ?? 'Item',
                snapshotProductName: variant.name ?? 'Item',
                unitName: 'unit',
                unitPrice,
                quantity,
                totalPrice,
                taxPercentage: 0,
                taxAmount: 0,
                totalAmountWithTax: totalPrice,
                position,
              } as Partial<MktOrderItemWorkspaceEntity>);
            }),
          );

          const toCreate = itemsFromVariants.filter(
            Boolean,
          ) as MktOrderItemWorkspaceEntity[];

          if (toCreate.length > 0) {
            await orderItemRepository.save(toCreate);
          } else {
            this.logger.warn('No order items to create');
          }

          const order = await orderRepository.findOne({
            where: { id: created.id },
            relations: ['orderItems'],
          });

          if (order && order.orderItems?.length > 0) {
            try {
              const licenseRepository =
                await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
                  workspaceId,
                  'mktLicense',
                  { shouldBypassPermissionChecks: true },
                );

              // Create licenses for order items
              const createdLicenses =
                await this.mktLicenseService.createLicensesForOrderItems(
                  order,
                  licenseRepository,
                );

              this.logger.log(
                `Successfully created ${createdLicenses.length} licenses for order: ${order.id}`,
              );
            } catch (licenseError) {
              this.logger.error(
                `Failed to create licenses for order ${order.id}:`,
                licenseError,
              );
            }
          }

          // 2) Update Order information
          const generatedOrderCode =
            await this.orderConfirmService.generateOrderCode(workspaceId);
          const generatedOrderName =
            await this.orderConfirmService.generateOrderName(order);
          const calculatedValues: CalculateOrderResult =
            await this.orderConfirmService.calculateOrderValues(order);

          //update order: customer, orderCode, name, subtotal, tax, totalAmount
          await orderRepository.update(created.id, {
            mktCustomerId: customerMeta?.mktCustomerId || null,
            orderCode: generatedOrderCode ?? '',
            subtotal: calculatedValues.subtotal,
            tax: calculatedValues.tax,
            discount: calculatedValues.discount,
            totalAmount: calculatedValues.totalAmount,
            name: generatedOrderName ?? '',
          });

          // 3a) Create Payments from metadata.paymentMethods
          const paymentName =
            generatedOrderCode && generatedOrderName
              ? `${generatedOrderCode}-${generatedOrderName}`
              : generatedOrderCode || generatedOrderName || 'Payment';

          if (
            Array.isArray(paymentMethodsMeta) &&
            paymentMethodsMeta.length > 0
          ) {
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
                  const pm: MktPaymentMethodWorkspaceEntity | undefined =
                    pmById.get(p.mktPaymentMethodId);

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
                      calculatedValues.totalAmount || 0,
                      generatedOrderCode,
                    );

                  return paymentRepository.create({
                    mktOrderId: created.id,
                    mktPaymentMethodId: p.mktPaymentMethodId,
                    name: `${pm?.name} - ${paymentName}`,
                    amount: calculatedValues.totalAmount || 0,
                    currency: created?.currency || 'VND',
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
          
          await orderRepository.update(created.id, {
            status: ORDER_STATUS.WAIT,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        '[Order POST HOOK] Failed to create related entities',
        error,
      );
      throw error;
    }
  }
}
