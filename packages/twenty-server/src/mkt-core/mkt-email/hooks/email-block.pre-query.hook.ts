/**
 * Email Block Pre-Query Hooks
 *
 * Blocks ALL 13 auto-generated GraphQL operations on mktEmail.
 * Forces users to use custom resolvers (EmailQueryResolver, EmailMutationResolver).
 */

import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';

const EMAIL_ENTITY_NAME = 'mktEmail';

/**
 * Block hook configuration for mktEmail entity
 */
export const EMAIL_BLOCK_CONFIG: BlockHookConfig = {
  entityName: EMAIL_ENTITY_NAME,
  logContext: 'Email:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Email resolvers instead (getEmailById, createEmail, etc.)',
};

/**
 * Generated block hooks using factory
 */
const { providers, blockedOperations } = createBlockHooks(EMAIL_BLOCK_CONFIG);

/**
 * All Email block hook providers (13 hooks)
 * Import this into MktEmailModule
 */
export const EMAIL_BLOCK_HOOKS = providers;

/**
 * List of blocked operation strings for reference
 */
export const EMAIL_BLOCKED_OPERATIONS = blockedOperations;
