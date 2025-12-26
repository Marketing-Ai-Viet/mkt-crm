import { Module } from '@nestjs/common';

import {
  MktTemplateRepository,
  MktSendmailTemplateRepository,
} from 'src/mkt-core/mkt-sendmail-template/repositories';

/**
 * MktSendmailTemplateModule
 *
 * Module for managing email templates:
 * - MktTemplate: General templates for invoices, payments, etc.
 * - MktSendmailTemplate: Specific templates for sending emails (OTP, password reset, etc.)
 */
@Module({
  providers: [MktTemplateRepository, MktSendmailTemplateRepository],
  exports: [MktTemplateRepository, MktSendmailTemplateRepository],
})
export class MktSendmailTemplateModule {}
