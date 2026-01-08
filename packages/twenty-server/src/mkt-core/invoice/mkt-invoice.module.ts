import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { invoiceConfig } from 'src/mkt-core/invoice/config';
import { InvoiceFileController } from 'src/mkt-core/invoice/controllers/invoice-file.controller';
import { MktSInvoiceCreateOnePostQueryHook } from 'src/mkt-core/invoice/hooks/mkt-sinvoice-create-one.post-query.hook';
import { MktSInvoiceCreateOnePreQueryHook } from 'src/mkt-core/invoice/hooks/mkt-sinvoice-create-one.pre-query.hook';
import { MktSInvoiceFileCreateOnePreQueryHook } from 'src/mkt-core/invoice/hooks/mkt-sinvoice-file-create-one.pre-query.hook';
import { MktSInvoiceFileUpdateOnePreQueryHook } from 'src/mkt-core/invoice/hooks/mkt-sinvoice-file-update-one.pre-query.hook';
import { SInvoiceIntegrationService } from 'src/mkt-core/invoice/integration/s-invoice.integration.service';
import { SInvoiceIntegrationJob } from 'src/mkt-core/invoice/jobs/s-invoice-integration.job';
import {
  MktInvoiceRepository,
  MktSInvoiceFileRepository,
  MktSInvoiceRepository,
} from 'src/mkt-core/invoice/repositories';
import { MktInvoiceService } from 'src/mkt-core/invoice/services/mkt-invoice.service';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';

@Module({
  imports: [
    ConfigModule.forFeature(invoiceConfig),
    TwentyORMModule,
    AuthModule,
    WorkspaceCacheStorageModule,
    RecordPositionModule,
    forwardRef(() => MktOrderModule),
  ],
  controllers: [InvoiceFileController],
  providers: [
    // Repositories
    MktInvoiceRepository,
    MktSInvoiceRepository,
    MktSInvoiceFileRepository,
    // Services
    MktInvoiceService,
    SInvoiceIntegrationService,
    SInvoiceIntegrationJob,
    // Hooks
    MktSInvoiceCreateOnePreQueryHook,
    MktSInvoiceFileCreateOnePreQueryHook,
    MktSInvoiceFileUpdateOnePreQueryHook,
    MktSInvoiceCreateOnePostQueryHook,
  ],
  exports: [
    MktInvoiceRepository,
    MktSInvoiceRepository,
    MktSInvoiceFileRepository,
    MktInvoiceService,
    SInvoiceIntegrationService,
  ],
})
export class MktInvoiceModule {}
