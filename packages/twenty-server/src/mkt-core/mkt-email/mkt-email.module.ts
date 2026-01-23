import { Module } from '@nestjs/common';

import {
  MktEmailRepository,
  MktTemplateRepository,
} from 'src/mkt-core/mkt-email/repositories';
import { MktEmailService } from 'src/mkt-core/mkt-email/services';
import { MktSettingModule } from 'src/mkt-core/setting/mkt-setting.module';

@Module({
  imports: [MktSettingModule],
  providers: [MktEmailRepository, MktTemplateRepository, MktEmailService],
  exports: [MktEmailRepository, MktTemplateRepository, MktEmailService],
})
export class MktEmailModule {}
