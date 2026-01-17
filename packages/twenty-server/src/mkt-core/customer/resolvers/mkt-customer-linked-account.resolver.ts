import { Logger, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  LinkAccountInput,
  SetPrimaryAccountInput,
  UnlinkAccountInput,
} from 'src/mkt-core/customer/dto/customer-account.input';
import {
  CustomerAccountsOutput,
  LinkAccountOutput,
  LinkedAccountOutput,
  UnlinkAccountOutput,
} from 'src/mkt-core/customer/dto/customer-account.output';
import { MktCustomerAccountService } from 'src/mkt-core/customer/services/account/mkt-customer-account.service';
import { LinkedAccount, AccountProvider } from 'src/mkt-core/customer/types';

/**
 * MktCustomerLinkedAccountResolver - GraphQL resolver for customer linked account CRUD
 *
 * Exposes the following operations:
 * - Query: mktCustomerAccounts - Get all linked accounts for a customer
 * - Query: mktCustomerPrimaryAccount - Get primary account for a customer
 * - Query: mktFindCustomerByExternalId - Find customer by external account
 * - Mutation: mktLinkAccount - Link an external account to a customer
 * - Mutation: mktUnlinkAccount - Unlink an account from a customer
 * - Mutation: mktSetPrimaryAccount - Set an account as primary
 */
@Resolver()
export class MktCustomerLinkedAccountResolver {
  private readonly logger = new Logger(MktCustomerLinkedAccountResolver.name);

  constructor(
    private readonly customerAccountService: MktCustomerAccountService,
  ) {}

  /**
   * Get all linked accounts for a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => CustomerAccountsOutput, {
    name: 'mktCustomerAccounts',
    description: 'Get all linked accounts for a customer',
  })
  async getCustomerAccounts(
    @Args('customerId', { type: () => String }) customerId: string,
    @Args('provider', { type: () => String, nullable: true })
    provider?: string,
  ): Promise<CustomerAccountsOutput> {
    this.logger.log(
      `Getting linked accounts for customer ${customerId}${provider ? ` (provider: ${provider})` : ''}`,
    );

    const accounts = await this.customerAccountService.getCustomerAccounts(
      customerId,
      provider as AccountProvider | undefined,
    );

    const primaryAccount = await this.customerAccountService.getPrimaryAccount(
      customerId,
      provider as AccountProvider | undefined,
    );

    return {
      accounts: accounts.map(this.mapToOutput),
      totalCount: accounts.length,
      primaryAccount: primaryAccount ? this.mapToOutput(primaryAccount) : null,
    };
  }

  /**
   * Get primary account for a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => LinkedAccountOutput, {
    name: 'mktCustomerPrimaryAccount',
    description: 'Get primary linked account for a customer',
    nullable: true,
  })
  async getPrimaryAccount(
    @Args('customerId', { type: () => String }) customerId: string,
    @Args('provider', { type: () => String, nullable: true })
    provider?: string,
  ): Promise<LinkedAccountOutput | null> {
    this.logger.log(`Getting primary account for customer ${customerId}`);

    const primaryAccount = await this.customerAccountService.getPrimaryAccount(
      customerId,
      provider as AccountProvider | undefined,
    );

    if (!primaryAccount) {
      return null;
    }

    return this.mapToOutput(primaryAccount);
  }

  /**
   * Find customer by external account ID
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => String, {
    name: 'mktFindCustomerByExternalId',
    description: 'Find customer ID by external account ID',
    nullable: true,
  })
  async findCustomerByExternalId(
    @Args('provider', { type: () => String }) provider: string,
    @Args('externalId', { type: () => String }) externalId: string,
  ): Promise<string | null> {
    this.logger.log(
      `Finding customer by external ID: ${provider}/${externalId}`,
    );

    return this.customerAccountService.findCustomerByExternalId(
      provider as AccountProvider,
      externalId,
    );
  }

  /**
   * Link an external account to a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => LinkAccountOutput, {
    name: 'mktLinkAccount',
    description: 'Link an external account to a customer',
  })
  async linkAccount(
    @Args('input') input: LinkAccountInput,
  ): Promise<LinkAccountOutput> {
    this.logger.log(
      `Linking ${input.provider} account to customer ${input.customerId}`,
    );

    try {
      const account = await this.customerAccountService.linkAccount(input);

      return {
        success: true,
        account: this.mapToOutput(account),
        error: null,
      };
    } catch (error) {
      this.logger.error(`Failed to link account: ${error.message}`);

      return {
        success: false,
        account: null,
        error: error.message,
      };
    }
  }

  /**
   * Unlink an account from a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => UnlinkAccountOutput, {
    name: 'mktUnlinkAccount',
    description: 'Unlink an account from a customer',
  })
  async unlinkAccount(
    @Args('input') input: UnlinkAccountInput,
  ): Promise<UnlinkAccountOutput> {
    this.logger.log(
      `Unlinking account ${input.accountId} from customer ${input.customerId}`,
    );

    try {
      await this.customerAccountService.unlinkAccount(
        input.customerId,
        input.accountId,
      );

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Failed to unlink account: ${error.message}`);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set an account as primary for a customer
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => UnlinkAccountOutput, {
    name: 'mktSetPrimaryAccount',
    description: 'Set an account as the primary account for a customer',
  })
  async setPrimaryAccount(
    @Args('input') input: SetPrimaryAccountInput,
  ): Promise<UnlinkAccountOutput> {
    this.logger.log(
      `Setting account ${input.accountId} as primary for customer ${input.customerId}`,
    );

    try {
      await this.customerAccountService.setPrimaryAccount(
        input.customerId,
        input.accountId,
      );

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Failed to set primary account: ${error.message}`);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Map LinkedAccount to LinkedAccountOutput
   */
  private mapToOutput(account: LinkedAccount): LinkedAccountOutput {
    return {
      id: account.id,
      provider: account.provider,
      externalId: account.externalId ?? '',
      email: account.email ?? null,
      displayName: account.displayName ?? null,
      avatarUrl: account.avatarUrl ?? null,
      isPrimary: account.isPrimary,
      status: account.status,
      linkedAt: account.linkedAt ?? null,
      lastSyncAt: account.lastSyncAt ?? null,
      expiresAt: account.expiresAt ?? null,
      notes: account.notes ?? null,
      metadata: account.metadata ?? null,
    };
  }
}
