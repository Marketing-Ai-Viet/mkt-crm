/**
 * Common Hooks Module
 *
 * Reusable hook utilities for mkt-core modules.
 */

// Types
export {
  type BlockHookConfig,
  type BlockHooksResult,
  type ResolverMethodKey,
  ALL_RESOLVER_METHODS,
  QUERY_OPERATIONS,
  MUTATION_OPERATIONS,
  WRITE_OPERATIONS,
  DELETE_OPERATIONS,
} from './types/block-hook.types';

// Base class
export {
  BaseBlockPreQueryHook,
  getOperationString,
} from './base-block.pre-query.hook';

// Re-export decorator type for convenience
export { WorkspaceQueryHookKey } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';

// Factory
export {
  createBlockHooks,
  getBlockedOperationConstants,
} from './block-hook.factory';
