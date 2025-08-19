import { Module } from '@nestjs/common';
import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';

import { MktOrderResolver } from './mkt-order.resolver';
import { MktOrderService } from './mkt-order.service';

@Module({
  imports: [MktInvoiceModule],
  providers: [MktOrderResolver, MktOrderService],
  exports: [MktOrderService],
})
export class MktOrderModule {}
