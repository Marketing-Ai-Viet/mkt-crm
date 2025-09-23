import { Module } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';

@Module({
  imports: [],
  providers: [MktRepositoryService],
  exports: [MktRepositoryService],
})
export class MktCommonModule {}
