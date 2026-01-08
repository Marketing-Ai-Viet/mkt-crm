import { BadRequestException } from '@nestjs/common';

import groupBy from 'lodash.groupby';

import { LinkedAccount, AccountProvider } from 'src/mkt-core/customer/types';

/**
 * Validation result for linked accounts
 */
export type LinkedAccountValidationResult = {
  isValid: boolean;
  errors: string[];
  duplicatePrimaryProviders: string[];
};

/**
 * LinkedAccountValidationUtil - Utilities for validating linkedAccounts array
 *
 * Business Rules:
 * - Each provider can have at most ONE account with isPrimary = true
 * - Account IDs must be unique within the array
 * - Required fields: id, provider, status, isPrimary
 */
export const LinkedAccountValidationUtil = {
  /**
   * Validate linkedAccounts array for primary uniqueness per provider
   * Returns validation result with details
   */
  validate(accounts: LinkedAccount[]): LinkedAccountValidationResult {
    const errors: string[] = [];
    const duplicatePrimaryProviders: string[] = [];

    if (!accounts || accounts.length === 0) {
      return { isValid: true, errors: [], duplicatePrimaryProviders: [] };
    }

    // Group accounts by provider
    const groupedByProvider = groupBy(accounts, 'provider');

    // Check each provider has at most one primary
    for (const [provider, providerAccounts] of Object.entries(
      groupedByProvider,
    )) {
      const primaryAccounts = providerAccounts.filter((acc) => acc.isPrimary);

      if (primaryAccounts.length > 1) {
        duplicatePrimaryProviders.push(provider);
        errors.push(
          `Provider "${provider}" has ${primaryAccounts.length} primary accounts. Only 1 is allowed.`,
        );
      }
    }

    // Check for duplicate account IDs
    const accountIds = accounts.map((acc) => acc.id);
    const duplicateIds = accountIds.filter(
      (id, index) => accountIds.indexOf(id) !== index,
    );

    if (duplicateIds.length > 0) {
      errors.push(`Duplicate account IDs found: ${duplicateIds.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      duplicatePrimaryProviders,
    };
  },

  /**
   * Validate and throw BadRequestException if invalid
   */
  validateOrThrow(accounts: LinkedAccount[]): void {
    const result = this.validate(accounts);

    if (!result.isValid) {
      throw new BadRequestException(result.errors.join('; '));
    }
  },

  /**
   * Auto-fix linkedAccounts to ensure only one primary per provider
   * Keeps the first primary account for each provider, sets others to false
   *
   * @returns Fixed array and list of providers that were fixed
   */
  autoFixPrimary(accounts: LinkedAccount[]): {
    fixed: LinkedAccount[];
    fixedProviders: string[];
  } {
    if (!accounts || accounts.length === 0) {
      return { fixed: [], fixedProviders: [] };
    }

    const fixedProviders: string[] = [];
    const seenPrimaryByProvider = new Map<AccountProvider, boolean>();

    const fixed = accounts.map((account) => {
      const provider = account.provider;

      if (account.isPrimary) {
        if (seenPrimaryByProvider.get(provider)) {
          // Already have a primary for this provider, set to false
          if (!fixedProviders.includes(provider)) {
            fixedProviders.push(provider);
          }

          return { ...account, isPrimary: false };
        }
        // First primary for this provider
        seenPrimaryByProvider.set(provider, true);
      }

      return account;
    });

    return { fixed, fixedProviders };
  },

  /**
   * Ensure exactly one primary per provider
   * If no primary exists for a provider, sets the first account as primary
   * If multiple primaries exist, keeps only the first one
   */
  normalizePrimary(accounts: LinkedAccount[]): LinkedAccount[] {
    if (!accounts || accounts.length === 0) {
      return [];
    }

    // Group by provider
    const groupedByProvider = groupBy(accounts, 'provider');
    const normalizedAccounts: LinkedAccount[] = [];

    for (const [_provider, providerAccounts] of Object.entries(
      groupedByProvider,
    )) {
      const primaryAccounts = providerAccounts.filter((acc) => acc.isPrimary);

      if (primaryAccounts.length === 0) {
        // No primary, set first account as primary
        normalizedAccounts.push(
          ...providerAccounts.map((acc, index) => ({
            ...acc,
            isPrimary: index === 0,
          })),
        );
      } else if (primaryAccounts.length === 1) {
        // Exactly one primary, no changes needed
        normalizedAccounts.push(...providerAccounts);
      } else {
        // Multiple primaries, keep only the first one
        let foundFirst = false;

        normalizedAccounts.push(
          ...providerAccounts.map((acc) => {
            if (acc.isPrimary) {
              if (!foundFirst) {
                foundFirst = true;

                return acc;
              }

              return { ...acc, isPrimary: false };
            }

            return acc;
          }),
        );
      }
    }

    return normalizedAccounts;
  },

  /**
   * Check if setting a new primary would violate the constraint
   * Returns the account that would need to be unset
   */
  findConflictingPrimary(
    accounts: LinkedAccount[],
    provider: AccountProvider,
    excludeAccountId?: string,
  ): LinkedAccount | null {
    return (
      accounts.find(
        (acc) =>
          acc.provider === provider &&
          acc.isPrimary &&
          acc.id !== excludeAccountId,
      ) ?? null
    );
  },
};
