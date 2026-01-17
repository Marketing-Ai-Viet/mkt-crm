/**
 * Block Hook Types
 *
 * Type definitions for the reusable block hook system.
 * Allows modules to block specific auto-generated GraphQL operations.
 */

import { Type } from '@nestjs/common';

import { RESOLVER_METHOD_NAMES } from 'src/engine/api/graphql/workspace-resolver-builder/constants/resolver-method-names';

/**
 * All available resolver method names that can be blocked
 */
export type ResolverMethodKey = keyof typeof RESOLVER_METHOD_NAMES;

/**
 * Configuration for block hooks
 */
export type BlockHookConfig = {
  /** Entity name (e.g., 'mktContract', 'mktOrder') */
  entityName: string;

  /** Log context for debugging */
  logContext: string;

  /** Error message shown when operation is blocked */
  blockedMessage: string;

  /**
   * Operations to block. If not specified, ALL operations are blocked.
   * Use this to selectively block only certain operations.
   *
   * @example
   * // Block only mutations, allow queries
   * blockedOperations: ['CREATE_ONE', 'CREATE_MANY', 'UPDATE_ONE', ...]
   */
  blockedOperations?: ResolverMethodKey[];

  /**
   * Operations to exclude from blocking.
   * Useful when you want to block most operations except a few.
   *
   * @example
   * // Block all except findMany and findOne
   * excludedOperations: ['FIND_MANY', 'FIND_ONE']
   */
  excludedOperations?: ResolverMethodKey[];
};

/**
 * All resolver method keys derived from RESOLVER_METHOD_NAMES
 */
export const ALL_RESOLVER_METHODS = Object.keys(
  RESOLVER_METHOD_NAMES,
) as ResolverMethodKey[];

/**
 * Query operations only (operations that start with FIND_)
 */
export const QUERY_OPERATIONS = ALL_RESOLVER_METHODS.filter((key) =>
  key.startsWith('FIND_'),
);

/**
 * Mutation operations only (all non-query operations)
 */
export const MUTATION_OPERATIONS = ALL_RESOLVER_METHODS.filter(
  (key) => !key.startsWith('FIND_'),
);

/**
 * Write operations (create, update)
 */
export const WRITE_OPERATIONS = ALL_RESOLVER_METHODS.filter(
  (key) => key.startsWith('CREATE_') || key.startsWith('UPDATE_'),
);

/**
 * Delete operations (soft delete, hard delete, restore)
 */
export const DELETE_OPERATIONS = ALL_RESOLVER_METHODS.filter(
  (key) =>
    key.startsWith('DELETE_') ||
    key.startsWith('DESTROY_') ||
    key.startsWith('RESTORE_'),
);

/**
 * Result from createBlockHooks factory
 * Generic type to avoid circular imports
 */
export type BlockHooksResult<T = unknown> = {
  /** Map of operation type to hook class */
  hooks: Map<ResolverMethodKey, Type<T>>;

  /** Array of hook providers for NestJS module */
  providers: Type<T>[];

  /** List of blocked operation strings (e.g., 'mktContract.findMany') */
  blockedOperations: string[];
};
