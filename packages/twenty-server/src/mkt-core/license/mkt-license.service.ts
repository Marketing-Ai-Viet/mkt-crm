import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
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
    public mktRepo: MktRepositoryService,
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

  async createLicensesForOrderItems(
    order: MktOrderWorkspaceEntity,
    mktCustomerId: string | null,
    _workspaceId: string | null,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    this.logger.log(`Creating licenses for order items ${order.id}`);

    const licenseRepository = await this.getLicenseRepository();

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
            const newLicenseHistory = {
              name: 'Bản quyền được kích hoạt',
              action: 'ACTIVE',
              note: 'Khách hàng đã kích hoạt thành công bản quyền',
            };
            const newLicense = licenseRepository.create({
              name: licenseName,
              licenseKey: licenseApiResponse.licenseKey,
              status: MKT_LICENSE_STATUS.ACTIVE,
              activatedAt: new Date().toISOString(),
              expiresAt: licenseApiResponse.expiresAt,
              licenseUuid: licenseApiResponse.licenseUuid as string,
              mktOrderId: order.id,
              mktVariantId: orderItem.mktVariantId,
              mktCustomerId,
              notes: `License được tạo cho order item: ${orderItem.name} (${i}/${quantity}) ${MKT_ORDER_LICENSE_STATUS.SUCCESS}`,
            });

            // save license
            newLicense.createdBy = order.createdBy;
            newLicense.history = JSON.stringify([
              newLicenseHistory,
            ]) as unknown as JSON;
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

  async updateReferenceLicenseOrder(
    trialOrderId: string,
    createdOrderId: string,
  ) {
    const licenseRepository = await this.getLicenseRepository();
    const trialLicenses = await licenseRepository.find({
      where: { mktOrderId: trialOrderId },
    });

    if (trialLicenses.length <= 0)
      throw new Error('No licenses found for the trial order');

    for (const license of trialLicenses) {
      await licenseRepository.update(license.id, {
        mktOrderId: createdOrderId,
        status: MKT_LICENSE_STATUS.ACTIVE, // assuming we want to activate the license when transferring
        notes: `Cập nhật tham chiếu đơn hàng từ đơn hàng trial ${trialOrderId} sang đơn hàng mới ${createdOrderId}`,
      });
    }

    this.logger.log(
      `Updated ${trialLicenses.length} licenses to reference the new order: ${createdOrderId}`,
    );
  }

  async linkLicensesForOrderItems(
    licenseId: string,
    order: MktOrderWorkspaceEntity,
    workspaceId: string,
  ): Promise<MktLicenseWorkspaceEntity | null> {
    this.logger.log(`Linking license ${licenseId} for order ${order.id}`);
    this.mktRepo.workspaceId = workspaceId;
    const licenseRepository = await this.getLicenseRepository();

    // Lấy thông tin license hiện tại
    const licenseRecord = await licenseRepository.findOne({
      where: { id: licenseId },
      select: ['licenseUuid'],
    });

    if (!licenseRecord) {
      this.logger.error(`License ${licenseId} not found`);

      return null;
    }

    // Lấy thông tin từ order item đầu tiên
    const firstOrderItem = order.orderItems[0];

    if (!firstOrderItem) {
      this.logger.error(`No order items found for order ${order.id}`);

      return null;
    }

    // Tạo tên license
    const productName =
      firstOrderItem.snapshotProductName ||
      firstOrderItem.mktProduct?.name ||
      'Sản phẩm';
    const variantName = firstOrderItem.mktVariant?.name;
    const licenseName = variantName
      ? `License cho ${productName} - ${variantName}`
      : `License cho ${productName}`;

    try {
      const licenseApiResponse =
        await this.mktLicenseApiService.fetchLicenseFromApi(
          order.id,
          licenseName,
          firstOrderItem.id,
          licenseRecord.licenseUuid,
        );

      await licenseRepository.update(licenseId, {
        name: licenseName,
        licenseKey: licenseApiResponse.licenseKey,
        status: MKT_LICENSE_STATUS.ACTIVE,
        activatedAt: new Date().toISOString(),
        expiresAt: licenseApiResponse.expiresAt,
        licenseUuid: licenseApiResponse.licenseUuid as string,
        mktOrderId: order.id,
        mktVariantId: firstOrderItem.mktVariantId,
        notes: `License được update cho order: ${order.id} ${MKT_ORDER_LICENSE_STATUS.SUCCESS}`,
      });

      const updatedLicense = await licenseRepository.findOne({
        where: { id: licenseId },
      });

      this.logger.log(`Successfully updated license: ${licenseId}`);

      return updatedLicense;
    } catch (error) {
      this.logger.error(`Failed to update license ${licenseId}:`, error);
      throw error;
    }
  }

  async getLicenseForForUpdate(licenseId: string) {
    const licenseRepo = await this.getLicenseRepository();
    const license = await licenseRepo.findOne({
      where: { id: licenseId },
      relations: [
        'mktOrder',
        'mktVariant',
        'mktOrder.mktPayments',
        'mktOrder.mktCustomer',
        'mktPaymentHistories',
        'mktPaymentHistories.mktPayment.mktPaymentMethod',
      ],
    });

    return license;
  }

  async getLicenseRepository() {
    return this.mktRepo.getLicenseRepository();
  }
}
