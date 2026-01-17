/**
 * Block Hook Factory
 *
 * Factory function to dynamically generate block hooks for an entity.
 * Reduces boilerplate when blocking multiple operations.
 *
 * @example
 * ```typescript
 * // Generate all 13 block hooks for mktContract
 * const { hooks, providers } = createBlockHooks({
 *   entityName: 'mktContract',
 *   logContext: 'Contract:BlockHook',
 *   blockedMessage: 'Use custom resolvers instead',
 * });
 *
 * // Or block only specific operations
 * const { hooks, providers } = createBlockHooks({
 *   entityName: 'mktOrder',
 *   logContext: 'Order:BlockHook',
 *   blockedMessage: 'Use OrderService instead',
 *   blockedOperations: ['CREATE_ONE', 'UPDATE_ONE', 'DELETE_ONE'],
 * });
 * ```
 */

import { Injectable, Logger, Type } from '@nestjs/common';

import camelCase from 'lodash.camelcase';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';

import {
  BaseBlockPreQueryHook,
  getOperationString,
} from './base-block.pre-query.hook';

import {
  ALL_RESOLVER_METHODS,
  BlockHookConfig,
  BlockHooksResult,
  ResolverMethodKey,
} from './types/block-hook.types';

/**
 * Capitalize first letter of a string
 */
const upperFirst = (str: string): string => {
  if (!str) return str;

  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Get the difference between two arrays
 */
const difference = <T>(arr1: readonly T[], arr2: readonly T[]): T[] => {
  return arr1.filter((item) => !arr2.includes(item));
};

/**
 * Determine which operations should be blocked based on config
 */
const getOperationsToBlock = (config: BlockHookConfig): ResolverMethodKey[] => {
  const { blockedOperations, excludedOperations } = config;

  // If specific operations are defined, use them
  if (blockedOperations && blockedOperations.length > 0) {
    return blockedOperations;
  }

  // If excluded operations are defined, block all except those
  if (excludedOperations && excludedOperations.length > 0) {
    return difference(ALL_RESOLVER_METHODS, excludedOperations);
  }

  // Default: block all operations
  return [...ALL_RESOLVER_METHODS];
};

/**
 * Create a single block hook class for an operation
 */
const createBlockHookClass = (
  config: BlockHookConfig,
  operationType: ResolverMethodKey,
): Type<BaseBlockPreQueryHook> => {
  const operationString = getOperationString(config.entityName, operationType);

  // Create dynamic class
  @Injectable()
  @WorkspaceQueryHook(operationString)
  class DynamicBlockHook extends BaseBlockPreQueryHook {
    protected readonly config = config;
    protected readonly operationType = operationType;
  }

  // Set class name for debugging
  Object.defineProperty(DynamicBlockHook, 'name', {
    value: `${upperFirst(camelCase(config.entityName))}Block${operationType}Hook`,
    writable: false,
  });

  return DynamicBlockHook;
};

/**
 * Factory function to create block hooks for an entity
 *
 * @param config - Configuration for the block hooks
 * @returns Object containing hooks map, providers array, and blocked operation strings
 *
 * @example
 * ```typescript
 * // In your module file:
 * const { providers, blockedOperations } = createBlockHooks({
 *   entityName: 'mktContract',
 *   logContext: 'Contract:BlockHook',
 *   blockedMessage: 'Use custom Contract resolvers instead',
 * });
 *
 * @Module({
 *   providers: [...providers],
 * })
 * export class MktContractModule {}
 * ```
 */
export const createBlockHooks = (
  config: BlockHookConfig,
): BlockHooksResult<BaseBlockPreQueryHook> => {
  const operationsToBlock = getOperationsToBlock(config);
  const hooks = new Map<ResolverMethodKey, Type<BaseBlockPreQueryHook>>();
  const providers: Type<BaseBlockPreQueryHook>[] = [];
  const blockedOperations: string[] = [];

  const logger = new Logger(`${config.logContext}:Factory`);

  for (const operationType of operationsToBlock) {
    const hookClass = createBlockHookClass(config, operationType);
    const operationString = getOperationString(
      config.entityName,
      operationType,
    );

    hooks.set(operationType, hookClass);
    providers.push(hookClass);
    blockedOperations.push(operationString);
  }

  logger.debug(
    `Created ${providers.length} block hooks for ${config.entityName}`,
  );

  return {
    hooks,
    providers,
    blockedOperations,
  };
};

/**
 * Utility to get blocked operation constants for an entity
 * Useful for documentation and testing
 *
 * @example
 * ```typescript
 * const CONTRACT_BLOCKED_OPERATIONS = getBlockedOperationConstants('mktContract');
 * // {
 * //   FIND_MANY: 'mktContract.findMany',
 * //   FIND_ONE: 'mktContract.findOne',
 * //   ...
 * // }
 * ```
 */
export const getBlockedOperationConstants = (
  entityName: string,
  operations: ResolverMethodKey[] = [...ALL_RESOLVER_METHODS],
): Record<ResolverMethodKey, string> => {
  return operations.reduce(
    (acc, op) => {
      acc[op] = getOperationString(entityName, op);

      return acc;
    },
    {} as Record<ResolverMethodKey, string>,
  );
};
