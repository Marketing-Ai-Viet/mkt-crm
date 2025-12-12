import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseApiService } from 'src/mkt-core/license/integration/mkt-license-api.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/constants/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseRepository } from 'src/mkt-core/license/repositories/mkt-license.repository';
import { MKT_ORDER_LICENSE_STATUS } from 'src/mkt-core/order/constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

const DEFAULT_LICENSE_VALIDITY_DAYS = 30;

type LicenseType = {
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
  public isTrial = false;
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly mktLicenseApiService: MktLicenseApiService,
    private readonly licenseRepository: MktLicenseRepository,
    public mktRepo: MktRepositoryService,
  ) {}

  async createLicenseForOrder(orderId: string): Promise<LicenseType> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error('Workspace ID not found when creating License');

      return {} as LicenseType;
    }

    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
        workspaceId,
        'mktOrder',
        { shouldBypassPermissionChecks: true },
      );
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found when creating License`);

      return {} as LicenseType;
    }

    const licenseName = this.generateLicenseName(order.name);
    const now = DateTime.now();
    const expiresAt = now.plus({ days: DEFAULT_LICENSE_VALIDITY_DAYS });

    return {
      licenseKey: licenseName,
      name: licenseName,
      status: null,
      activatedAt: now.toISO() ?? '',
      expiresAt: expiresAt.toISO() ?? '',
      lastLoginAt: null,
      deviceInfo: '',
      notes: '',
    };
  }

  private generateLicenseName(orderName: string): string {
    const orderSuffix = orderName.slice(0, 8);
    const timestamp = DateTime.now().toMillis();

    return `LIC-${orderSuffix}-${timestamp}`;
  }

  private generateLicenseNameFromOrderItem(orderItem: {
    snapshotProductName?: string;
    mktProduct?: { name?: string };
    mktVariant?: { name?: string };
  }): string {
    const DEFAULT_PRODUCT_NAME = 'Sản phẩm';
    const productName =
      orderItem.snapshotProductName ||
      orderItem.mktProduct?.name ||
      DEFAULT_PRODUCT_NAME;
    const variantName = orderItem.mktVariant?.name;

    return variantName
      ? `License cho ${productName} - ${variantName}`
      : `License cho ${productName}`;
  }

  private async validateCustomerExists(
    mktCustomerId: string,
    orderId: string,
  ): Promise<void> {
    const customerRepository = await this.mktRepo.getCustomerRepository();
    const customer = await customerRepository.findOne({
      where: { id: mktCustomerId },
    });

    if (!customer) {
      this.logger.error(
        `Customer ${mktCustomerId} not found for order ${orderId}`,
      );
      throw new Error(`Customer ${mktCustomerId} not found`);
    }
  }

  private async validateVariantExists(
    mktVariantId: string,
    orderItemId: string,
  ): Promise<void> {
    const variantRepository = await this.mktRepo.getVariantRepository();
    const variant = await variantRepository.findOne({
      where: { id: mktVariantId },
    });

    if (!variant) {
      this.logger.error(
        `Variant ${mktVariantId} not found for order item ${orderItemId}`,
      );
      throw new Error(`Variant ${mktVariantId} not found`);
    }
  }

  private buildLicenseData(params: {
    licenseName: string;
    licenseApiResponse: {
      licenseKey: string;
      expiresAt: string;
      licenseUuid?: string | null;
    };
    order: MktOrderWorkspaceEntity;
    orderItem: { id: string; name: string; mktVariantId?: string | null };
    mktCustomerId: string | null;
    index: number;
    quantity: number;
  }) {
    const {
      licenseName,
      licenseApiResponse,
      order,
      orderItem,
      mktCustomerId,
      index,
      quantity,
    } = params;

    return {
      name: licenseName,
      licenseKey: licenseApiResponse.licenseKey,
      status: MKT_LICENSE_STATUS.ACTIVE,
      activatedAt: DateTime.now().toJSDate(),
      expiresAt: DateTime.fromISO(licenseApiResponse.expiresAt).toJSDate(),
      licenseUuid: licenseApiResponse.licenseUuid ?? '',
      mktOrderId: order.id,
      mktVariantId: orderItem.mktVariantId,
      mktCustomerId,
      accountOwnerId: order?.accountOwnerId ?? null,
      departmentOwnerId: order?.accountOwner?.departmentId ?? null,
      teamOwnerId: order?.accountOwner?.teamId ?? null,
      notes: `License được tạo cho order item: ${orderItem.name} (${index}/${quantity}) ${MKT_ORDER_LICENSE_STATUS.SUCCESS}`,
      trialLicense: this.isTrial,
    };
  }

  private buildInitialLicenseHistory() {
    return JSON.stringify([
      {
        name: 'Bản quyền được kích hoạt',
        action: 'ACTIVE',
        note: 'Khách hàng đã kích hoạt thành công bản quyền',
      },
    ]) as unknown as JSON;
  }

  private async createSingleLicense(params: {
    order: MktOrderWorkspaceEntity;
    orderItem: { id: string; name: string; mktVariantId?: string | null };
    licenseName: string;
    mktCustomerId: string | null;
    index: number;
    quantity: number;
  }): Promise<MktLicenseWorkspaceEntity> {
    const { order, orderItem, licenseName, mktCustomerId, index, quantity } =
      params;

    const licenseApiResponse =
      await this.mktLicenseApiService.fetchLicenseFromApi(
        order.id,
        licenseName,
        orderItem.id,
      );

    const licenseData = this.buildLicenseData({
      licenseName,
      licenseApiResponse,
      order,
      orderItem,
      mktCustomerId,
      index,
      quantity,
    });

    const repo = await this.licenseRepository.getRepository();
    const newLicense = repo.create(licenseData);

    newLicense.createdBy = order.createdBy;
    newLicense.history = this.buildInitialLicenseHistory();

    return repo.save(newLicense);
  }

  private async createLicensesForOrderItem(params: {
    order: MktOrderWorkspaceEntity;
    orderItem: MktOrderWorkspaceEntity['orderItems'][number];
    mktCustomerId: string | null;
  }): Promise<MktLicenseWorkspaceEntity[]> {
    const { order, orderItem, mktCustomerId } = params;

    if (orderItem.mktVariantId) {
      await this.validateVariantExists(orderItem.mktVariantId, orderItem.id);
    }

    const licenseName = this.generateLicenseNameFromOrderItem(orderItem);
    const quantity = orderItem.quantity || 1;
    const licenses: MktLicenseWorkspaceEntity[] = [];

    for (let i = 1; i <= quantity; i++) {
      const license = await this.createSingleLicense({
        order,
        orderItem,
        licenseName,
        mktCustomerId,
        index: i,
        quantity,
      });

      licenses.push(license);
    }

    return licenses;
  }

  async createLicensesForOrderItems(
    order: MktOrderWorkspaceEntity,
    mktCustomerId: string | null,
    _workspaceId: string | null,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    this.logger.log(`Creating licenses for order items ${order.id}`);

    if (mktCustomerId) {
      await this.validateCustomerExists(mktCustomerId, order.id);
    }

    const licensePromises = order.orderItems.map((orderItem) =>
      this.createLicensesForOrderItem({
        order,
        orderItem,
        mktCustomerId,
      }),
    );

    const nestedLicenses = await Promise.all(licensePromises);
    const createdLicenses = nestedLicenses.flat();

    this.logger.log(
      `Successfully created ${createdLicenses.length} licenses for order: ${order.id}`,
    );

    return createdLicenses;
  }

  async updateReferenceLicenseOrder(
    trialOrderId: string,
    createdOrderId: string,
  ) {
    const trialLicenses =
      await this.licenseRepository.findByOrderId(trialOrderId);

    if (!trialLicenses || trialLicenses.length <= 0) {
      throw new Error('No licenses found for the trial order');
    }

    for (const license of trialLicenses) {
      await this.licenseRepository.update(license.id, {
        mktOrderId: createdOrderId,
        status: MKT_LICENSE_STATUS.ACTIVE,
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
    this.licenseRepository.workspaceId = workspaceId;

    const licenseRecord =
      await this.licenseRepository.findWithLicenseUuid(licenseId);

    if (!licenseRecord) {
      this.logger.error(`License ${licenseId} not found`);

      return null;
    }

    const firstOrderItem = order.orderItems[0];

    if (!firstOrderItem) {
      this.logger.error(`No order items found for order ${order.id}`);

      return null;
    }

    const licenseName = this.generateLicenseNameFromOrderItem(firstOrderItem);

    try {
      const licenseApiResponse =
        await this.mktLicenseApiService.fetchLicenseFromApi(
          order.id,
          licenseName,
          firstOrderItem.id,
          licenseRecord.licenseUuid,
        );

      await this.licenseRepository.update(licenseId, {
        name: licenseName,
        licenseKey: licenseApiResponse.licenseKey,
        status: MKT_LICENSE_STATUS.ACTIVE,
        activatedAt: DateTime.now().toJSDate(),
        expiresAt: DateTime.fromISO(licenseApiResponse.expiresAt).toJSDate(),
        licenseUuid: licenseApiResponse.licenseUuid ?? '',
        mktOrderId: order.id,
        mktVariantId: firstOrderItem.mktVariantId,
        notes: `License được update cho order: ${order.id} ${MKT_ORDER_LICENSE_STATUS.SUCCESS}`,
      });

      const updatedLicense = await this.licenseRepository.findById(licenseId);

      this.logger.log(`Successfully updated license: ${licenseId}`);

      return updatedLicense;
    } catch (error) {
      this.logger.error(`Failed to update license ${licenseId}:`, error);
      throw error;
    }
  }

  async getLicenseForForUpdate(licenseId: string) {
    return this.licenseRepository.findForUpdate(licenseId);
  }
}
