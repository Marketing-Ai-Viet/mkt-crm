import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktLicenseApiService } from 'src/mkt-core/license/integration/mkt-license-api.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MKT_ORDER_LICENSE_STATUS } from 'src/mkt-core/order/constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

type licenseType = {
  licenseKey: string;
  name: string;
  status: MKT_LICENSE_STATUS | null;
  activatedAt: string;
  expiresAt: string;
  lastLoginAt: string | null;
  deviceInfo: string;
  notes: string;
};

@Injectable()
export class MktLicenseService {
  private readonly logger = new Logger(MktLicenseService.name);
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly mktLicenseApiService: MktLicenseApiService,
  ) {}

  async createLicenseForOrder(orderId: string): Promise<licenseType> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error('Workspace ID not found when creating License');

      return {} as licenseType;
    }

    let license: licenseType = {} as licenseType;

    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
        workspaceId,
        'mktOrder',
        { shouldBypassPermissionChecks: true },
      );
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found when creating License`);

      return license;
    }
    license = {
      licenseKey: this.generateLicenseName(order.name),
      name: this.generateLicenseName(order.name),
      status: null,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(
        new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      lastLoginAt: null,
      deviceInfo: '',
      notes: '',
    };

    return license;
  }

  private generateLicenseName(orderName: string): string {
    const orderSuffix = orderName.slice(0, 8);
    const timestamp: number = Date.now();

    return `LIC-${orderSuffix}-${timestamp}`;
  }

  private getLicenseFromOrderItem(orderItem: MktOrderWorkspaceEntity) {
    return {
      licenseKey: '123',
      name: this.generateLicenseName(orderItem.name),
      status: null,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(
        new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      lastLoginAt: null,
      deviceInfo: '',
      notes: '',
    };
  }

  async createLicensesForOrderItems(
    order: MktOrderWorkspaceEntity,
    licenseRepository: WorkspaceRepository<MktLicenseWorkspaceEntity>,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    this.logger.log(`Creating licenses for order items ${order.id}`);

    const licensePromises = order.orderItems.flatMap(
      async (orderItem, _index) => {
        try {
          // generate license name based on order item
          const productName =
            orderItem.snapshotProductName ||
            orderItem.mktProduct?.name ||
            'Sản phẩm';
          const variantName = orderItem.mktVariant?.name;
          const licenseName = variantName
            ? `License cho ${productName} - ${variantName}`
            : `License cho ${productName}`;

          const quantity = orderItem.quantity || 1;
          const licensePromises = [];

          // Create licenses based on quantity
          for (let i = 1; i <= quantity; i++) {
            // call API to get license for this specific order item
            const licenseApiResponse =
              await this.mktLicenseApiService.fetchLicenseFromApi(
                order.id,
                licenseName,
                orderItem.id,
              );
            const newLicense = licenseRepository.create({
              name: licenseName,
              licenseKey: licenseApiResponse.licenseKey,
              status: MKT_LICENSE_STATUS.INACTIVE,
              activatedAt: new Date().toISOString(),
              expiresAt: licenseApiResponse.expiresAt,
              licenseUuid: licenseApiResponse.licenseUuid as string,
              mktOrderId: order.id,
              mktVariantId: orderItem.mktVariantId,
              notes: `License được tạo cho order item: ${orderItem.name} (${i}/${quantity}) ${MKT_ORDER_LICENSE_STATUS.SUCCESS}`,
            });
            // save license
            const savedLicense = await licenseRepository.save(newLicense);

            licensePromises.push(savedLicense);
          }

          return licensePromises;
        } catch (error) {
          this.logger.error(
            `Failed to create license for order item ${orderItem.id}:`,
            error,
          );
          throw error;
        }
      },
    );

    const nestedLicenses = await Promise.all(licensePromises);
    const createdLicenses =
      nestedLicenses.flat() as MktLicenseWorkspaceEntity[];

    this.logger.log(
      `Successfully created ${createdLicenses.length} licenses for order: ${order.id}`,
    );

    return createdLicenses;
  }
}
