import { Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktEmailRepository } from 'src/mkt-core/email/repositories';
import { MktEmailService } from 'src/mkt-core/email/service/mkt-email.service';
import { MktSendmailTemplateModule } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module';
import { MktSettingModule } from 'src/mkt-core/setting/mkt-setting.module';

@Module({
  imports: [MktCommonModule, MktSendmailTemplateModule, MktSettingModule],
  providers: [MktEmailRepository, MktEmailService],
  exports: [MktEmailRepository, MktEmailService],
})
export class MktEmailModule {}
