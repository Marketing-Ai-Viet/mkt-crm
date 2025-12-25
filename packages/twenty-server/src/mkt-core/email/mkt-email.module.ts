import { Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktEmailRepository } from 'src/mkt-core/email/repositories';
import { MktEmailService } from 'src/mkt-core/email/service/mkt-email.service';

@Module({
  imports: [MktCommonModule],
  providers: [MktEmailRepository, MktEmailService],
  exports: [MktEmailRepository, MktEmailService],
})
export class MktEmailModule {}
