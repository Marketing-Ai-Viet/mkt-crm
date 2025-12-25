import { forwardRef, Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { CustomerModule } from 'src/mkt-core/customer/customer.module';

@Module({
  imports: [MktCommonModule, forwardRef(() => CustomerModule)],
  providers: [MktContractService],
  exports: [MktContractService],
})
export class MktContractModule {}
