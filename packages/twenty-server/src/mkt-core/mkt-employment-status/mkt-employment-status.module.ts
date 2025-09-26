import { Module } from '@nestjs/common';
import { MktEmploymentStatusResolver } from 'src/mkt-core/mkt-employment-status/resolvers/mkt-employment-status.resolver';
import { MktEmploymentStatusService } from 'src/mkt-core/mkt-employment-status/services/mkt-employment-status.service';

@Module({
  imports: [],
  providers: [MktEmploymentStatusService, MktEmploymentStatusResolver],
  exports: [MktEmploymentStatusService, MktEmploymentStatusResolver],
})
export class MktEmploymentStatusModule {}
