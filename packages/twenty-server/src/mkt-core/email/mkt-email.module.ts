import { Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktEmailService } from 'src/mkt-core/email/service/mkt-email.service';

@Module({
  imports: [MktCommonModule],
  providers: [MktEmailService],
  exports: [MktEmailService],
})
export class MktEmailModule {}
