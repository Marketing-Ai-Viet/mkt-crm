import { Module } from '@nestjs/common';

import { MktTemplateRepository } from 'src/mkt-core/mkt-sendmail-template/repositories';

/**
 * MktSendmailTemplateModule (MktTemplateModule)
 *
 * Unified module for managing all templates:
 * - Email templates (Welcome, 2FA OTP, Account Update, Password Reset)
 * - Business templates (Invoice, Contract, Order, Quote)
 * - System templates (Notification, Ticket, Catalog)
 *
 * Uses single MktTemplateWorkspaceEntity for all template types.
 */
@Module({
  providers: [MktTemplateRepository],
  exports: [MktTemplateRepository],
})
export class MktSendmailTemplateModule {}
