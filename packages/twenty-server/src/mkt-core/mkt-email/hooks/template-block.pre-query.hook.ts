/**
 * Template Block Pre-Query Hooks
 *
 * Blocks ALL 13 auto-generated GraphQL operations on mktTemplate.
 * Forces users to use custom resolvers (TemplateQueryResolver, TemplateMutationResolver).
 */

import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';

const TEMPLATE_ENTITY_NAME = 'mktTemplate';

/**
 * Block hook configuration for mktTemplate entity
 */
export const TEMPLATE_BLOCK_CONFIG: BlockHookConfig = {
  entityName: TEMPLATE_ENTITY_NAME,
  logContext: 'Template:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Template resolvers instead (getTemplateById, createTemplate, etc.)',
};

/**
 * Generated block hooks using factory
 */
const { providers, blockedOperations } = createBlockHooks(
  TEMPLATE_BLOCK_CONFIG,
);

/**
 * All Template block hook providers (13 hooks)
 * Import this into MktEmailModule
 */
export const TEMPLATE_BLOCK_HOOKS = providers;

/**
 * List of blocked operation strings for reference
 */
export const TEMPLATE_BLOCKED_OPERATIONS = blockedOperations;
