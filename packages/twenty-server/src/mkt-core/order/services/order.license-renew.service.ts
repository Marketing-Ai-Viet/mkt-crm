import { Injectable, Logger } from '@nestjs/common';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { ObjectRecordUpdateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-update.event';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderConfirmService } from 'src/mkt-core/order/services/order.confirm.service';
import { OrderService } from 'src/mkt-core/order/services/order.service';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import { VariantService } from 'src/mkt-core/product/services/variant.service';
@Injectable()
export class OrderLicenseRenewService {
  private readonly logger = new Logger(OrderLicenseRenewService.name);

  constructor(
    private readonly licenseService: MktLicenseEventService,
    private readonly orderService: OrderService,
    private readonly variantService: VariantService,
    private readonly mktRepo: MktRepositoryService,
    private readonly orderActionService: OrderActionService,
    private readonly fireBaseIntegrationService: FireBaseIntegrationService,
    private readonly orderConfirmService: OrderConfirmService,
  ) {}

  @OnDatabaseBatchEvent('mktLicense', DatabaseEventAction.UPDATED)
  async handleLicenseUpdateMutation(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<MktLicenseWorkspaceEntity>
    >,
  ) {
    for (const event of payload.events) {
      const status = event.properties.after?.status;
      const metadata = event.properties.after?.metadata as Metadata;
      const licenseId = event.properties.after.id;
      const workspaceId = payload.workspaceId; // Lấy workspaceId từ payload

      if (status === MKT_LICENSE_STATUS.CHANGE_VARIANT) {
        this.logger.log(
          `License ${licenseId} status changed to CHANGE_VARIANT`,
        );
        // Handle variant change logic here if needed
      }

      if (status === MKT_LICENSE_STATUS.REFUND) {
        // Handle refund logic here if needed
        this.logger.log(`License ${licenseId} status changed to REFUND`);
      }
    }
  }
}
