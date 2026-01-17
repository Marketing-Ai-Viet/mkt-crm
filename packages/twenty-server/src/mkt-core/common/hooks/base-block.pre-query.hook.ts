/**
 * Base Block Pre-Query Hook
 *
 * Abstract base class for blocking auto-generated GraphQL operations.
 * Reusable across modules (Contract, Order, Invoice, etc.)
 *
 * @example
 * ```typescript
 * @Injectable()
 * @WorkspaceQueryHook('mktContract.findMany')
 * export class ContractBlockFindManyHook extends BaseBlockPreQueryHook {
 *   protected readonly config = CONTRACT_BLOCK_CONFIG;
 *   protected readonly operationType = 'FIND_MANY' as const;
 * }
 * ```
 */

import { ForbiddenException, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import { WorkspaceQueryHookKey } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { RESOLVER_METHOD_NAMES } from 'src/engine/api/graphql/workspace-resolver-builder/constants/resolver-method-names';

import { BlockHookConfig, ResolverMethodKey } from './types/block-hook.types';

/**
 * Abstract base class for blocking GraphQL operations
 *
 * Provides:
 * - Consistent logging
 * - ForbiddenException with custom message
 * - Easy configuration per module
 */
export abstract class BaseBlockPreQueryHook
  implements WorkspacePreQueryHookInstance
{
  /**
   * Configuration for this hook
   * Override in subclass with module-specific config
   */
  protected abstract readonly config: BlockHookConfig;

  /**
   * The operation type this hook blocks
   * Override in subclass (e.g., 'FIND_MANY', 'CREATE_ONE')
   */
  protected abstract readonly operationType: ResolverMethodKey;

  private _logger?: Logger;

  /**
   * Get logger instance (lazy initialization)
   */
  protected get logger(): Logger {
    if (!this._logger) {
      this._logger = new Logger(this.config.logContext);
    }

    return this._logger;
  }

  /**
   * Get full operation name (e.g., 'mktContract.findMany')
   */
  protected get operationName(): string {
    return `${this.config.entityName}.${RESOLVER_METHOD_NAMES[this.operationType]}`;
  }

  /**
   * Execute the hook - blocks the operation
   * @throws ForbiddenException always
   */
  async execute(): Promise<never> {
    this.logger.warn(`Blocked operation: ${this.operationName}`);
    throw new ForbiddenException(this.config.blockedMessage);
  }
}

/**
 * Get the operation string for WorkspaceQueryHook decorator
 *
 * @example
 * ```typescript
 * @WorkspaceQueryHook(getOperationString('mktContract', 'FIND_MANY'))
 * // Results in: 'mktContract.findMany'
 * ```
 */
export const getOperationString = <T extends string>(
  entityName: T,
  operationType: ResolverMethodKey,
): WorkspaceQueryHookKey => {
  return `${entityName}.${RESOLVER_METHOD_NAMES[operationType]}` as WorkspaceQueryHookKey;
};
