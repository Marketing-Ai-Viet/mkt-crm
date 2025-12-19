import { Injectable } from '@nestjs/common';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { ObjectRecordUpdateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-update.event';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event.type';

// TODO: Replace with new license entity type when license module is restored
type MktLicenseWorkspaceEntity = Record<string, unknown>;

@Injectable()
export class OrderLicenseRenewService {
  constructor() {}

  @OnDatabaseBatchEvent('mktLicense', DatabaseEventAction.UPDATED)
  async handleLicenseUpdateMutation(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<MktLicenseWorkspaceEntity>
    >,
  ) {
    // TODO: Implement license renewal handling when license module is restored
    // The old MktLicenseWorkspaceEntity has been removed with the license module
    for (const _event of payload.events) {
      // Only process if status is changed to RENEW or CHANGE_VARIANT
    }
  }
}
