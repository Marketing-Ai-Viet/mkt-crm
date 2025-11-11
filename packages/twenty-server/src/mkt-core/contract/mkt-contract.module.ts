import { Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';

@Module({
  imports: [MktCommonModule],
  providers: [MktContractService],
  exports: [MktContractService],
})
export class MktContractModule {}
