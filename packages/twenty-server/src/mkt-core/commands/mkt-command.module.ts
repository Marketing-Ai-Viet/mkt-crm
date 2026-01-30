import { Module } from '@nestjs/common';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import {
  MktProductSyncCronCommand,
  MktProductSyncNowCommand,
} from 'src/mkt-core/mkt-product-integration/commands';
import { MktProductIntegrationModule } from 'src/mkt-core/mkt-product-integration/mkt-product-integration.module';
import { RbacCronCommand } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/commands';

/**
 * MktCommandModule
 *
 * Module chứa các CLI commands cho mkt-core.
 * Commands này dùng để đăng ký cron jobs vào message queue.
 *
 * Commands:
 * - MktProductSyncCronCommand: Đăng ký cron job sync products từ MKT Server
 * - MktProductSyncNowCommand: Trigger sync products ngay lập tức
 * - RbacCronCommand: Đăng ký cron job cho RBAC cache warming
 *
 * NOTE: Jobs được discover bởi worker thông qua MktJobsModule, không phải module này.
 * Module này chỉ chứa CLI commands để đăng ký cron patterns vào queue.
 */
@Module({
  imports: [
    MessageQueueModule, // For addCron() in commands
    MktProductIntegrationModule, // For MktProductSyncNowCommand
  ],
  providers: [
    // CLI Commands for cron registration
    MktProductSyncCronCommand,
    MktProductSyncNowCommand,
    RbacCronCommand,
  ],
})
export class MktCommandModule {}
