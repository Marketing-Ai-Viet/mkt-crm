import { Module } from '@nestjs/common';

import {
  EMAIL_BLOCK_HOOKS,
  TEMPLATE_BLOCK_HOOKS,
} from 'src/mkt-core/mkt-email/hooks';
import {
  MktEmailRepository,
  MktTemplateRepository,
} from 'src/mkt-core/mkt-email/repositories';
import {
  EmailQueryResolver,
  EmailMutationResolver,
  TemplateQueryResolver,
  TemplateMutationResolver,
} from 'src/mkt-core/mkt-email/resolvers';
import { MktEmailService } from 'src/mkt-core/mkt-email/services';
import { MktSettingModule } from 'src/mkt-core/setting/mkt-setting.module';

@Module({
  imports: [MktSettingModule],
  providers: [
    MktEmailRepository,
    MktTemplateRepository,
    MktEmailService,
    EmailQueryResolver,
    EmailMutationResolver,
    TemplateQueryResolver,
    TemplateMutationResolver,
    ...EMAIL_BLOCK_HOOKS,
    ...TEMPLATE_BLOCK_HOOKS,
  ],
  exports: [MktEmailRepository, MktTemplateRepository, MktEmailService],
})
export class MktEmailModule {}
