/**
 * EmailQueryResolver - GraphQL resolver for Email queries
 *
 * No RBAC decorators - emails are workspace-level shared resources.
 * Guards: WorkspaceAuthGuard + UserAuthGuard for authentication only.
 *
 * Architecture: Thin resolver - delegates to MktEmailRepository directly
 */

import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { MKT_EMAIL_STATUS } from 'src/mkt-core/mkt-email/constants/mkt-email.constant';
import {
  EmailOutput,
  EmailListOutput,
  EmailStatusDistributionOutput,
} from 'src/mkt-core/mkt-email/dto';
import { EMAIL_QUERY_DESCRIPTIONS } from 'src/mkt-core/mkt-email/messages';
import { MktEmailRepository } from 'src/mkt-core/mkt-email/repositories';
import { MktEmailWorkspaceEntity } from 'src/mkt-core/mkt-email/workspace-entities';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class EmailQueryResolver {
  constructor(private readonly emailRepository: MktEmailRepository) {}

  /**
   * Get email by ID
   */
  @Query(() => EmailOutput, {
    description: EMAIL_QUERY_DESCRIPTIONS.GET_EMAIL_BY_ID,
    nullable: true,
  })
  async getEmailById(
    @Args('emailId', { type: () => String }) emailId: string,
  ): Promise<EmailOutput | null> {
    const email = await this.emailRepository.findByIdOrNull(emailId);

    return email ? this.mapToOutput(email) : null;
  }

  /**
   * Get all emails with pagination
   */
  @Query(() => EmailListOutput, {
    description: EMAIL_QUERY_DESCRIPTIONS.GET_ALL_EMAILS,
  })
  async getEmails(
    @Args('take', { type: () => Number, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Number, nullable: true, defaultValue: 0 })
    skip: number,
  ): Promise<EmailListOutput> {
    const emails = await this.emailRepository.findAllEmails({ take, skip });
    const totalCount = await this.emailRepository.countEmails();

    return {
      emails: emails.map((e) => this.mapToOutput(e)),
      totalCount,
    };
  }

  /**
   * Get emails by status
   */
  @Query(() => EmailListOutput, {
    description: EMAIL_QUERY_DESCRIPTIONS.GET_EMAILS_BY_STATUS,
  })
  async getEmailsByStatus(
    @Args('status', { type: () => MKT_EMAIL_STATUS }) status: MKT_EMAIL_STATUS,
  ): Promise<EmailListOutput> {
    const emails = await this.emailRepository.findByStatus(status);
    const totalCount = await this.emailRepository.countByStatus(status);

    return {
      emails: emails.map((e) => this.mapToOutput(e)),
      totalCount,
    };
  }

  /**
   * Get emails by recipient
   */
  @Query(() => EmailListOutput, {
    description: EMAIL_QUERY_DESCRIPTIONS.GET_EMAILS_BY_RECIPIENT,
  })
  async getEmailsByRecipient(
    @Args('to', { type: () => String }) to: string,
  ): Promise<EmailListOutput> {
    const emails = await this.emailRepository.findByRecipient(to);
    const totalCount = await this.emailRepository.countByRecipient(to);

    return {
      emails: emails.map((e) => this.mapToOutput(e)),
      totalCount,
    };
  }

  /**
   * Get email status distribution statistics
   */
  @Query(() => EmailStatusDistributionOutput, {
    description: EMAIL_QUERY_DESCRIPTIONS.GET_EMAIL_STATUS_DISTRIBUTION,
  })
  async getEmailStatusDistribution(): Promise<EmailStatusDistributionOutput> {
    const distribution = await this.emailRepository.getStatusDistribution();
    const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);

    return {
      distribution,
      totalCount,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Map email entity to output DTO
   */
  private mapToOutput(email: MktEmailWorkspaceEntity): EmailOutput {
    return {
      id: email.id,
      subject: email.subject ?? undefined,
      to: email.to ?? undefined,
      from: email.from ?? undefined,
      body: email.body ?? undefined,
      sentAt: email.sentAt?.toString(),
      status: this.toEnumOrUndefined<MKT_EMAIL_STATUS>(
        email.status,
        MKT_EMAIL_STATUS,
      ),
      emailType: email.emailType ?? undefined,
      position: email.position ?? undefined,
      accountOwnerId: email.accountOwnerId ?? undefined,
      createdAt: email.createdAt?.toString(),
      updatedAt: email.updatedAt?.toString(),
    };
  }

  /**
   * Safely cast a string value to an enum, returning undefined if invalid
   */
  private toEnumOrUndefined<T>(
    value: string | null | undefined,
    enumObj: Record<string, string>,
  ): T | undefined {
    if (!value) {
      return undefined;
    }

    const validValues = Object.values(enumObj);

    if (validValues.includes(value)) {
      return value as T;
    }

    return undefined;
  }
}
