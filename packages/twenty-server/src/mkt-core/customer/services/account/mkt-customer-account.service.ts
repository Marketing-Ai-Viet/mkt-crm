import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

import {
  ACCOUNT_PROVIDER,
  LINKED_ACCOUNT_STATUS,
} from 'src/mkt-core/customer/constants';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import {
  AccountProvider,
  LinkAccountInput,
  LinkedAccount,
  LinkedAccountMetadata,
  LinkedAccountStatus,
} from 'src/mkt-core/customer/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktCustomerAccountService - Business logic for Customer-External Account links
 *
 * REFACTORED: Uses JSONB field (linkedAccounts) instead of separate entity
 * Supports multiple providers: MKT Server, Google, Zalo, Shopee, etc.
 *
 * Business Rules:
 * - One external account can only be linked to one customer (enforced at application level)
 * - Each customer can have multiple accounts from different providers
 * - Only one account per provider can be primary
 * - First account of each provider linked automatically becomes primary
 */
@Injectable()
export class MktCustomerAccountService {
  private readonly logger = new Logger(MktCustomerAccountService.name);

  constructor(private readonly customerRepository: MktCustomerRepository) {}

  /**
   * Link an external account to a customer
   * Auto-sets as primary if it's the first account of that provider
   */
  async linkAccount(input: LinkAccountInput): Promise<LinkedAccount> {
    const {
      customerId,
      provider,
      externalId,
      email,
      displayName,
      avatarUrl,
      notes,
      metadata,
    } = input;

    this.logger.log(
      `Linking ${provider} account ${externalId} to customer ${customerId}`,
    );

    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    const existingAccounts: LinkedAccount[] = customer.linkedAccounts ?? [];

    // Check if this external account is already linked
    const existingLink = existingAccounts.find(
      (acc) => acc.provider === provider && acc.externalId === externalId,
    );

    if (existingLink) {
      throw new BadRequestException(
        `${provider} account ${externalId} is already linked to this customer`,
      );
    }

    // Check if this is the first account of this provider (will be auto-primary)
    const providerAccounts = existingAccounts.filter(
      (acc) => acc.provider === provider,
    );
    const shouldBePrimary = input.isPrimary ?? providerAccounts.length === 0;

    // If setting as primary, remove primary flag from other accounts of same provider
    if (shouldBePrimary) {
      for (const acc of existingAccounts) {
        if (acc.provider === provider) {
          acc.isPrimary = false;
        }
      }
    }

    const newAccount: LinkedAccount = {
      id: uuidv4(),
      provider: provider as AccountProvider,
      externalId,
      email: email ?? null,
      displayName: displayName ?? null,
      avatarUrl: avatarUrl ?? null,
      isPrimary: shouldBePrimary,
      status: LINKED_ACCOUNT_STATUS.ACTIVE,
      linkedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      notes: notes ?? null,
      metadata,
    };

    existingAccounts.push(newAccount);

    // Primary is tracked via isPrimary field in linkedAccounts array
    await this.customerRepository.updateCustomer(customerId, {
      linkedAccounts: existingAccounts,
    });

    this.logger.log(
      `Successfully linked ${provider} account ${externalId} to customer ${customerId}`,
    );

    return newAccount;
  }

  /**
   * Legacy method for MKT Server accounts - delegates to linkAccount
   */
  async linkMktAccount(input: {
    customerId: string;
    mktAccountId: string;
    mktAccountEmail?: string;
    mktAccountName?: string;
    isPrimary?: boolean;
    notes?: string;
  }): Promise<LinkedAccount> {
    return this.linkAccount({
      customerId: input.customerId,
      provider: ACCOUNT_PROVIDER.MKT_SERVER,
      externalId: input.mktAccountId,
      email: input.mktAccountEmail,
      displayName: input.mktAccountName,
      isPrimary: input.isPrimary,
      notes: input.notes,
    });
  }

  /**
   * Set an account as primary for a customer (within its provider)
   */
  async setPrimaryAccount(
    customerId: string,
    accountId: string,
  ): Promise<void> {
    this.logger.log(
      `Setting primary account ${accountId} for customer ${customerId}`,
    );

    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    const accounts: LinkedAccount[] = customer.linkedAccounts ?? [];
    const targetAccount = accounts.find((acc) => acc.id === accountId);

    if (!targetAccount) {
      throw new NotFoundException(
        `Account ${accountId} is not linked to customer ${customerId}`,
      );
    }

    // Update isPrimary status for accounts of the same provider
    for (const acc of accounts) {
      if (acc.provider === targetAccount.provider) {
        acc.isPrimary = acc.id === accountId;
      }
    }

    // Primary is tracked via isPrimary field in linkedAccounts array
    await this.customerRepository.updateCustomer(customerId, {
      linkedAccounts: accounts,
    });

    this.logger.log(`Primary account set successfully`);
  }

  /**
   * Get primary account for a customer by provider
   */
  async getPrimaryAccount(
    customerId: string,
    provider?: AccountProvider,
  ): Promise<LinkedAccount | null> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) return null;

    const accounts: LinkedAccount[] = customer.linkedAccounts ?? [];

    if (provider) {
      return (
        accounts.find((acc) => acc.provider === provider && acc.isPrimary) ??
        null
      );
    }

    // Return first primary account found (MKT_SERVER prioritized)
    const mktPrimary = accounts.find(
      (acc) => acc.provider === ACCOUNT_PROVIDER.MKT_SERVER && acc.isPrimary,
    );

    if (mktPrimary) return mktPrimary;

    return accounts.find((acc) => acc.isPrimary) ?? null;
  }

  /**
   * Get all accounts for a customer, optionally filtered by provider
   */
  async getCustomerAccounts(
    customerId: string,
    provider?: AccountProvider,
  ): Promise<LinkedAccount[]> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    const accounts = customer?.linkedAccounts ?? [];

    if (provider) {
      return accounts.filter((acc) => acc.provider === provider);
    }

    return accounts;
  }

  /**
   * Find customer by their external account ID
   * Searches through linkedAccounts JSONB array
   */
  async findCustomerByExternalId(
    provider: AccountProvider,
    externalId: string,
  ): Promise<string | null> {
    const customer = await this.customerRepository.findByLinkedAccount(
      provider,
      externalId,
    );

    return customer?.id ?? null;
  }

  /**
   * Legacy method for MKT Server - delegates to findCustomerByExternalId
   */
  async findCustomerByMktAccountId(
    mktAccountId: string,
  ): Promise<string | null> {
    return this.findCustomerByExternalId(
      ACCOUNT_PROVIDER.MKT_SERVER,
      mktAccountId,
    );
  }

  /**
   * Unlink an account from customer
   */
  async unlinkAccount(customerId: string, accountId: string): Promise<void> {
    this.logger.log(
      `Unlinking account ${accountId} from customer ${customerId}`,
    );

    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    const accounts: LinkedAccount[] = customer.linkedAccounts ?? [];
    const accountIndex = accounts.findIndex((acc) => acc.id === accountId);

    if (accountIndex === -1) {
      throw new NotFoundException(
        `Account ${accountId} is not linked to customer ${customerId}`,
      );
    }

    const removedAccount = accounts[accountIndex];
    const wasPrimary = removedAccount.isPrimary;
    const provider = removedAccount.provider;

    accounts.splice(accountIndex, 1);

    // If this was the primary account, set another of same provider as primary
    if (wasPrimary) {
      const providerAccounts = accounts.filter(
        (acc) => acc.provider === provider,
      );

      if (providerAccounts.length > 0) {
        providerAccounts[0].isPrimary = true;
      }
    }

    // Primary is tracked via isPrimary field in linkedAccounts array
    await this.customerRepository.updateCustomer(customerId, {
      linkedAccounts: accounts,
    });

    this.logger.log(`Successfully unlinked account ${accountId}`);
  }

  /**
   * Legacy method - unlink MKT account by externalId
   */
  async unlinkMktAccount(
    customerId: string,
    mktAccountId: string,
  ): Promise<void> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    const accounts: LinkedAccount[] = customer.linkedAccounts ?? [];
    const account = accounts.find(
      (acc) =>
        acc.provider === ACCOUNT_PROVIDER.MKT_SERVER &&
        acc.externalId === mktAccountId,
    );

    if (!account) {
      throw new NotFoundException(
        `MKT account ${mktAccountId} is not linked to customer ${customerId}`,
      );
    }

    return this.unlinkAccount(customerId, account.id);
  }

  /**
   * Update last sync timestamp for an account
   */
  async updateLastSyncAt(customerId: string, accountId: string): Promise<void> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) return;

    const accounts: LinkedAccount[] = customer.linkedAccounts ?? [];
    const account = accounts.find((acc) => acc.id === accountId);

    if (account) {
      account.lastSyncAt = DateTimeUtils.toISO(DateTimeUtils.now());

      await this.customerRepository.updateCustomer(customerId, {
        linkedAccounts: accounts,
      });
    }
  }

  /**
   * Update account status
   */
  async updateAccountStatus(
    customerId: string,
    accountId: string,
    status: LinkedAccountStatus,
  ): Promise<void> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) return;

    const accounts: LinkedAccount[] = customer.linkedAccounts ?? [];
    const account = accounts.find((acc) => acc.id === accountId);

    if (account) {
      account.status = status;

      await this.customerRepository.updateCustomer(customerId, {
        linkedAccounts: accounts,
      });
    }
  }

  /**
   * Sync account info from external provider
   */
  async syncAccountInfo(
    customerId: string,
    accountId: string,
    data: {
      email?: string;
      displayName?: string;
      avatarUrl?: string;
      metadata?: LinkedAccountMetadata;
    },
  ): Promise<void> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      this.logger.warn(`Customer ${customerId} not found for sync`);

      return;
    }

    const accounts: LinkedAccount[] = customer.linkedAccounts ?? [];
    const account = accounts.find((acc) => acc.id === accountId);

    if (!account) {
      this.logger.warn(`Account ${accountId} not found for sync`);

      return;
    }

    if (data.email) account.email = data.email;
    if (data.displayName) account.displayName = data.displayName;
    if (data.avatarUrl) account.avatarUrl = data.avatarUrl;
    if (data.metadata) {
      account.metadata = { ...(account.metadata ?? {}), ...data.metadata };
    }
    account.lastSyncAt = DateTimeUtils.toISO(DateTimeUtils.now());

    await this.customerRepository.updateCustomer(customerId, {
      linkedAccounts: accounts,
    });
  }
}
