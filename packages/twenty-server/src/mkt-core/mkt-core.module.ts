import { Module } from '@nestjs/common';
import { MktMiddlewareModule } from 'src/mkt-core/middlewares/mkt-middleware.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { InvoiceModule } from './invoice/invoice.module';
import { VariantModule } from './variant/variant.module';

@Module({
  imports: [
    VariantModule, 
    ConfigurationModule, 
    MktOrderModule,
    InvoiceModule,
    MktMiddlewareModule,
  ],
})
export class MktCoreModule {}
