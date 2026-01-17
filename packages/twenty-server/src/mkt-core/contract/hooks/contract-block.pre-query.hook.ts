/**
 * Contract Block Pre-Query Hooks
 *
 * Blocks ALL 13 auto-generated GraphQL operations on mktContract.
 * Forces users to use custom resolvers (ContractQueryResolver, ContractMutationResolver).
 *
 * Blocked operations:
 * - Queries: findMany, findOne, findDuplicates
 * - Mutations: createOne, createMany, updateOne, updateMany,
 *              deleteOne, deleteMany, destroyOne, destroyMany,
 *              restoreOne, restoreMany
 *
 * @example To exclude certain operations from blocking:
 * ```typescript
 * const CONTRACT_BLOCK_CONFIG: BlockHookConfig = {
 *   entityName: MKT_CONTRACT_ENTITY_NAME,
 *   logContext: 'Contract:BlockHook',
 *   blockedMessage: 'Use custom Contract resolvers instead',
 *   excludedOperations: ['FIND_MANY', 'FIND_ONE'], // Allow these operations
 * };
 * ```
 *
 * @example To block only specific operations:
 * ```typescript
 * const CONTRACT_BLOCK_CONFIG: BlockHookConfig = {
 *   entityName: MKT_CONTRACT_ENTITY_NAME,
 *   logContext: 'Contract:BlockHook',
 *   blockedMessage: 'Use custom Contract resolvers instead',
 *   blockedOperations: ['CREATE_ONE', 'UPDATE_ONE', 'DELETE_ONE'], // Only block these
 * };
 * ```
 */

import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';
import { MKT_CONTRACT_ENTITY_NAME } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';

/**
 * Block hook configuration for mktContract entity
 */
export const CONTRACT_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_CONTRACT_ENTITY_NAME,
  logContext: 'Contract:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Contract resolvers instead (getContractById, createContract, etc.)',
};

/**
 * Generated block hooks using factory
 */
const { providers, blockedOperations } = createBlockHooks(
  CONTRACT_BLOCK_CONFIG,
);

/**
 * All Contract block hook providers (13 hooks)
 * Import this into MktContractModule
 */
export const CONTRACT_BLOCK_HOOKS = providers;

/**
 * List of blocked operation strings for reference
 * e.g., ['mktContract.findMany', 'mktContract.findOne', ...]
 */
export const CONTRACT_BLOCKED_OPERATIONS = blockedOperations;
