import { Injectable, Logger } from '@nestjs/common';

import { OnCustomBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-custom-batch-event.decorator';
import { MKT_LICENSE_RENEWING_EVENT } from 'src/mkt-core/license/license.constants';
import { LicenseRenewingEvent } from 'src/mkt-core/license/types/license-event.types';

@Injectable()
export class LicenseRenewingListener {
  private readonly logger = new Logger(LicenseRenewingListener.name);

  @OnCustomBatchEvent(MKT_LICENSE_RENEWING_EVENT)
  async handleLicenseRenewing(payload: {
    name: string;
    workspaceId: string;
    events: LicenseRenewingEvent[];
  }) {
    for (const event of payload.events) {
      this.logger.log(
        `Processing license renewal for license ID: ${event.licenseId}`,
      );

      // Here you can add your custom logic for handling license renewal
      // For example:
      // - Send notification emails
      // - Update external systems
      // - Trigger workflows
      // - Log analytics events
      // - etc.

      this.logger.log(
        `License ${event.licenseId} renewal event processed at ${event.timestamp}`,
      );
    }
  }
}
