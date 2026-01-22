/**
 * Customer Block Pre-Query Hooks
 *
 * Blocks ALL 13 auto-generated GraphQL operations on mktCustomer.
 * Forces users to use custom resolvers (CustomerQueryResolver, CustomerMutationResolver).
 *
 * Blocked operations:
 * - Queries: findMany, findOne, findDuplicates
 * - Mutations: createOne, createMany, updateOne, updateMany,
 *              deleteOne, deleteMany, destroyOne, destroyMany,
 *              restoreOne, restoreMany
 */

import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';
// Import from workspace-entity for single source of truth
import { MKT_CUSTOMER_ENTITY_NAME } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';

/**
 * Block hook configuration for mktCustomer entity
 */
export const CUSTOMER_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_CUSTOMER_ENTITY_NAME, // From workspace-entity, not hardcoded
  logContext: 'Customer:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Customer resolvers instead (getCustomerById, createCustomer, updateCustomer, etc.)',
};

/**
 * Generated block hooks using factory
 */
const { providers, blockedOperations } = createBlockHooks(
  CUSTOMER_BLOCK_CONFIG,
);

/**
 * All Customer block hook providers (13 hooks)
 * Import this into CustomerModule
 */
export const CUSTOMER_BLOCK_HOOKS = providers;

/**
 * List of blocked operation strings for reference
 * e.g., ['mktCustomer.findMany', 'mktCustomer.findOne', ...]
 */
export const CUSTOMER_BLOCKED_OPERATIONS = blockedOperations;
