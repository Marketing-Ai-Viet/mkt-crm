import { Injectable, Logger } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseHistoryService } from 'src/mkt-core/license/mkt-license-history.service';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

@Injectable()
export class MktLicenseEventService {
  private readonly logger = new Logger(MktLicenseEventService.name);
  constructor(
    public mktRepo: MktRepositoryService,
    public mktLicenseHistoryService: MktLicenseHistoryService,
  ) {}

  async getVariantFromLicenseId(licenseId: string, workspaceId?: string) {
    if (!workspaceId) return null;

    const licenseRepository =
      await this.mktRepo.getLicenseRepositoryByWorkspaceId(workspaceId);

    const license = await licenseRepository.findOne({
      where: { id: licenseId },
      relations: ['mktVariant'],
    });

    if (!license) {
      this.logger.warn(`License ${licenseId} not found when fetching variant`);

      return null;
    }

    return license.mktVariant;
  }

  async lockLicensesFromOrder(updateOrder: MktOrderWorkspaceEntity) {
    const licenseRepo = await this.mktRepo.getLicenseRepository();
    const licenseHistoryRepo = await this.mktRepo.getLicenseHistoryRepository();

    const licenses = await licenseRepo.find({
      where: { mktOrder: { id: updateOrder.id } },
    });

    for (const license of licenses) {
      license.status = MKT_LICENSE_STATUS.REVOKED;
      license.notes = `License locked due to order ${updateOrder.orderCode} being overdue.`;
      await licenseRepo.save(license);
      this.logger.log(
        `Locked license ${license.id} for order ${updateOrder.id}`,
      );
      const history =
        await this.mktLicenseHistoryService.createHistoryItemFromUpdate(
          null,
          MKT_LICENSE_STATUS.REVOKED,
        );

      await licenseHistoryRepo.save({
        mktLicense: license,
        name: history?.name || 'License Locked',
        action: history?.action || 'LICENSE_LOCKED',
        note: history?.note || 'License locked due to order overdue.',
        createdBy: license.createdBy,
      });
    }
  }

  async activateLicensesFromOrder(updateOrder: MktOrderWorkspaceEntity) {
    const licenseRepo = await this.mktRepo.getLicenseRepository();
    const licenseHistoryRepo = await this.mktRepo.getLicenseHistoryRepository();

    const licenses = await licenseRepo.find({
      where: { mktOrder: { id: updateOrder.id } },
    });

    for (const license of licenses) {
      if (license.status !== MKT_LICENSE_STATUS.REVOKED) continue;
      license.status = MKT_LICENSE_STATUS.ACTIVE;
      license.notes = `License activated due to order ${updateOrder.orderCode} being paid.`;
      await licenseRepo.save(license);
      this.logger.log(
        `Activated license ${license.id} for order ${updateOrder.id}`,
      );
      const history =
        await this.mktLicenseHistoryService.createHistoryItemFromUpdate(
          null,
          MKT_LICENSE_STATUS.ACTIVE,
        );

      await licenseHistoryRepo.save({
        mktLicense: license,
        name: history?.name || 'License Activated',
        action: history?.action || 'LICENSE_ACTIVATED',
        note: history?.note || 'License activated due to order being paid.',
        createdBy: license.createdBy,
      });
    }
  }

  async lockLicensesFromOrders(orders: MktOrderWorkspaceEntity[]) {
    for (const order of orders) {
      await this.lockLicensesFromOrder(order);
    }
  }
}
