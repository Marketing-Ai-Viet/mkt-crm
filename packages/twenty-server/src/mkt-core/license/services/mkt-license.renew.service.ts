import { Injectable, Logger } from '@nestjs/common';
import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { MktFirebaseService } from 'src/mkt-core/common/service/mkt-firebase.service';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktOrderCommonConfirmService } from 'src/mkt-core/common/service/mkt.common-order.confirm.service';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import {
  ORDER_ACTION,
  ORDER_METADATA,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants';
import { CALL_FIREBASE_DATA } from 'src/mkt-core/payment/constants/payment.type';

@Injectable()
export class MktLicenseRenewService {
  private readonly logger = new Logger(MktLicenseRenewService.name);
  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly mktFirebaseService: MktFirebaseService,
    private readonly mktCommonOrderService: MktCommonOrderService,
    private readonly mktOrderCommonConfirmService: MktOrderCommonConfirmService,
  ) {}

  async shouldRenewLicense(
    status: string,
    metadata: ORDER_METADATA,
    licenseId: string,
    license: MktLicenseWorkspaceEntity | null,
  ): Promise<void> {
    this.logger.log(`Renewing license with ID: ${licenseId}`);
    this.logger.log(`status: ${status}`);
    // Logic to renew the license

    const oldOrder = license?.mktOrder;
    this.mktCommonOrderService.updateFirstMetadata(oldOrder, {
      oldOrderId: oldOrder?.id,
    });
    await this.processLicenseRenewalFromMutation(licenseId, metadata, license);
  }

  private async processLicenseRenewalFromMutation(
    licenseId: string,
    metadata: ORDER_METADATA,
    license: MktLicenseWorkspaceEntity | null,
  ) {
    const workspaceId = await this.mktRepo.getWorkspaceId();

    if (!workspaceId) {
      this.logger.error(
        `No workspace ID found for license renewal: ${licenseId}`,
      );
      throw new Error('Workspace ID is required for license renewal');
    }

    //if (!metadata) return;
    // Implement the logic to process license renewal
    this.logger.log(
      `Processing renewal for license ID: ${licenseId} with metadata: ${JSON.stringify(metadata)}`,
    );
    const {
      variants: variantsMeta,
      customer: customerMeta,
      paymentMethods: paymentMethodsMeta,
    } = metadata;

    // Simulate order creation and confirmation
    const order = await this.createOrder();

    const fireBaseData: CALL_FIREBASE_DATA | void =
      await this.mktOrderCommonConfirmService.confirmOrder(
        ORDER_ACTION.LICENSE_RENEWING,
        order,
        workspaceId,
        variantsMeta,
        customerMeta,
        paymentMethodsMeta,
        licenseId,
        license,
      );

    const authFirebase =
      await this.mktFirebaseService.callFireBase(fireBaseData);
    await this.mktCommonOrderService.updateOrderForRenew(
      order.id,
      ORDER_STATUS.WAIT,
      workspaceId,
      false,
      authFirebase,
    );
    this.logger.log(`License ${licenseId} renewed successfully.`);
  }

  private async createOrder() {
    const orderRepo = await this.mktRepo.getOrderRepository(); // Giả sử bạn có một repository Order
    const newOrder = orderRepo.create({
      status: ORDER_STATUS.DRAFT,
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      name: 'License Renewal Order',
    });

    const createdOrder = await orderRepo.save(newOrder);

    return createdOrder;
  }

  private async getMetadata(
    newMetadata: ORDER_METADATA | string,
  ): Promise<ORDER_METADATA> {
    let parsedMetadata: ORDER_METADATA;

    if (typeof newMetadata === 'string') {
      parsedMetadata = JSON.parse(newMetadata) as ORDER_METADATA;
    } else {
      parsedMetadata = newMetadata;
    }
    //throw new Error(`Debug Method not implemented. ${JSON.stringify(license)}`);
    return parsedMetadata;
  }
}
